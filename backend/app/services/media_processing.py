import logging
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4
from sqlalchemy.orm import Session
from PIL import Image, ImageDraw, ImageFont

from app.core.config import settings
from app.models.clip import Clip
from app.models.media_video import MediaVideo
from app.models.processing import AuditLog, ProcessingJob
from app.services.media_storage import clip_storage, temp_storage, video_storage

logger = logging.getLogger(__name__)


def load_font(font_name: str | None, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    from PIL import ImageFont
    import os
    font_names = []
    if font_name:
        font_names.append(font_name)
    font_names.extend(["arial", "Roboto-Regular", "LiberationSans-Regular", "DejaVuSans", "Arial"])
    
    for name in font_names:
        for suffix in [".ttf", ".TTF"]:
            try:
                return ImageFont.truetype(name + suffix, size)
            except IOError:
                pass
            try:
                return ImageFont.truetype(name, size)
            except IOError:
                pass
            try:
                win_path = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", name + suffix)
                return ImageFont.truetype(win_path, size)
            except (IOError, KeyError):
                pass
            try:
                linux_path = f"/usr/share/fonts/truetype/dejavu/{name}{suffix}"
                return ImageFont.truetype(linux_path, size)
            except IOError:
                pass
            try:
                linux_path_std = f"/usr/share/fonts/truetype/liberation/{name}{suffix}"
                return ImageFont.truetype(linux_path_std, size)
            except IOError:
                pass
            
    try:
        return ImageFont.load_default()
    except Exception:
        raise RuntimeError("No suitable font could be loaded")


def create_text_watermark_image(
    text: str,
    font_name: str | None = None,
    font_size: int = 24,
    font_color: str = "#FFFFFF",
    outline_color: str | None = None,
    outline_width: int = 0,
    shadow_color: str | None = None,
    shadow_offset: tuple[int, int] = (2, 2),
    padding: int = 0,
) -> Image.Image:
    font = load_font(font_name, font_size)
    dummy_img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    dummy_draw = ImageDraw.Draw(dummy_img)
    
    bbox = dummy_draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    extra_w = padding * 2 + (shadow_offset[0] if shadow_color else 0) + outline_width * 2 + 10
    extra_h = padding * 2 + (shadow_offset[1] if shadow_color else 0) + outline_width * 2 + 10
    
    canvas_w = int(text_w + extra_w)
    canvas_h = int(text_h + extra_h)
    
    img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    start_x = padding + outline_width - bbox[0] + 5
    start_y = padding + outline_width - bbox[1] + 5
    
    if shadow_color:
        draw.text(
            (start_x + shadow_offset[0], start_y + shadow_offset[1]),
            text,
            font=font,
            fill=shadow_color,
            stroke_width=outline_width,
            stroke_fill=outline_color if outline_color else shadow_color,
        )
        
    draw.text(
        (start_x, start_y),
        text,
        font=font,
        fill=font_color,
        stroke_width=outline_width,
        stroke_fill=outline_color if outline_color else (0, 0, 0, 0),
    )
    
    return img


def process_watermark_image(
    base_img: Image.Image,
    video_width: int,
    video_height: int,
    opacity: float = 1.0,
    scale: float | None = None,
    rotation: float = 0.0,
) -> Image.Image:
    img = base_img.copy()
    
    if scale:
        target_w = int(video_width * scale)
        if target_w < 5:
            target_w = 5
        target_h = int(img.height * (target_w / img.width))
        if target_h < 5:
            target_h = 5
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
    if opacity < 1.0:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        alpha = img.split()[3]
        alpha = alpha.point(lambda p: int(p * opacity))
        img.putalpha(alpha)
        
    if rotation != 0.0:
        img = img.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
        
    return img


def calculate_overlay_position(
    position: str,
    video_w: int,
    video_h: int,
    overlay_w: int,
    overlay_h: int,
    margin: int = 10,
    custom_x: int | None = None,
    custom_y: int | None = None,
) -> tuple[int, int]:
    if position == "top_left":
        return margin, margin
    elif position == "top_center":
        return (video_w - overlay_w) // 2, margin
    elif position == "top_right":
        return video_w - overlay_w - margin, margin
    elif position == "center_left":
        return margin, (video_h - overlay_h) // 2
    elif position == "center":
        return (video_w - overlay_w) // 2, (video_h - overlay_h) // 2
    elif position == "center_right":
        return video_w - overlay_w - margin, (video_h - overlay_h) // 2
    elif position == "bottom_left":
        return margin, video_h - overlay_h - margin
    elif position == "bottom_center":
        return (video_w - overlay_w) // 2, video_h - overlay_h - margin
    elif position == "bottom_right":
        return video_w - overlay_w - margin, video_h - overlay_h - margin
    else:
        return custom_x if custom_x is not None else 0, custom_y if custom_y is not None else 0


def resolve_placeholders(text: str, context: dict | None = None) -> str:
    if not context:
        context = {}
    
    import datetime
    now = datetime.datetime.now()
    
    defaults = {
        "username": context.get("username", "Guest"),
        "email": context.get("email", "guest@example.com"),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "download_date": context.get("download_date", now.strftime("%Y-%m-%d")),
        "generated_date": now.strftime("%Y-%m-%d"),
        "file_name": context.get("file_name", "media.mp4"),
        "video_duration": context.get("video_duration", "00:00:00"),
        "image_name": context.get("file_name", "image.png"),
    }
    
    resolved = text
    for key, val in defaults.items():
        placeholder = "{" + key + "}"
        resolved = resolved.replace(placeholder, str(val))
    return resolved


class FFmpegService:
    def extract_audio(
        self,
        video_path: Path,
        output_path: Path,
        format: str = "mp3",
        bitrate: str | None = None,
        preserve_metadata: bool = True,
    ) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = ["ffmpeg", "-y", "-i", str(video_path)]
        if preserve_metadata:
            cmd += ["-map_metadata", "0"]
        else:
            cmd += ["-map_metadata", "-1"]
        cmd += ["-vn"]
        
        if format == "mp3":
            cmd += ["-c:a", "libmp3lame"]
            if bitrate:
                cmd += ["-b:a", bitrate]
            else:
                cmd += ["-q:a", "2"]
        elif format == "aac":
            cmd += ["-c:a", "aac"]
            if bitrate:
                cmd += ["-b:a", bitrate]
            else:
                cmd += ["-b:a", "192k"]
        elif format == "wav":
            cmd += ["-c:a", "pcm_s16le"]
        elif format == "flac":
            cmd += ["-c:a", "flac"]
        elif format == "ogg":
            cmd += ["-c:a", "libvorbis"]
            if bitrate:
                cmd += ["-b:a", bitrate]
            else:
                cmd += ["-q:a", "4"]
        else:
            cmd += ["-c:a", "copy"]

        cmd += [str(output_path)]
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        return output_path

    def generate_clip(
        self,
        video_path: Path,
        output_path: Path,
        start_time: float,
        end_time: float,
        format: str = "mp4",
        audio_only: bool = False,
    ) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        duration = max(end_time - start_time, 0.1)
        
        cmd = [
            "ffmpeg", "-y",
            "-ss", f"{start_time:.3f}",
            "-i", str(video_path),
            "-t", f"{duration:.3f}"
        ]
        
        if audio_only:
            cmd += ["-vn"]
            if format == "mp3":
                cmd += ["-c:a", "libmp3lame", "-q:a", "2"]
            elif format == "aac":
                cmd += ["-c:a", "aac", "-b:a", "192k"]
            elif format == "wav":
                cmd += ["-c:a", "pcm_s16le"]
            elif format == "flac":
                cmd += ["-c:a", "flac"]
            elif format == "ogg":
                cmd += ["-c:a", "libvorbis", "-q:a", "4"]
            else:
                cmd += ["-c:a", "copy"]
        else:
            if format == "webm":
                cmd += ["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", "-c:a", "libopus"]
            elif format == "mov":
                cmd += ["-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac", "-b:a", "192k"]
            elif format == "mkv":
                cmd += ["-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac", "-b:a", "192k"]
            elif format == "avi":
                cmd += ["-c:v", "mpeg4", "-crf", "18", "-preset", "fast", "-c:a", "mp3"]
            else:
                cmd += ["-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac", "-b:a", "192k"]
                cmd += ["-movflags", "+faststart"]
                
        cmd += [str(output_path)]
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        return output_path

    def convert_video(
        self,
        input_path: Path,
        output_path: Path,
        format: str,
        quality: str = "medium",
        resolution: str | None = None,
        fps: int | None = None,
        bitrate: str | None = None,
        codec: str | None = None,
    ) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = ["ffmpeg", "-y", "-i", str(input_path)]
        
        if codec:
            cmd += ["-c:v", codec]
        else:
            if format == "webm":
                cmd += ["-c:v", "libvpx-vp9", "-c:a", "libopus"]
            elif format in ("mp4", "mov", "mkv"):
                cmd += ["-c:v", "libx264", "-c:a", "aac"]
            elif format == "avi":
                cmd += ["-c:v", "mpeg4", "-c:a", "mp3"]
            elif format == "flv":
                cmd += ["-c:v", "flv", "-c:a", "aac"]
            elif format == "wmv":
                cmd += ["-c:v", "wmv2", "-c:a", "wmav2"]
            else:
                cmd += ["-c:v", "libx264", "-c:a", "aac"]

        if not bitrate:
            crf_map = {"low": "28", "medium": "23", "high": "18", "original": "21"}
            crf = crf_map.get(quality, "23")
            if format == "webm" or codec == "libvpx-vp9":
                crf_map_vp9 = {"low": "36", "medium": "30", "high": "20", "original": "25"}
                cmd += ["-crf", crf_map_vp9.get(quality, "30"), "-b:v", "0"]
            else:
                cmd += ["-crf", crf]
        else:
            cmd += ["-b:v", bitrate]

        if resolution:
            w, h = resolution.split("x")
            cmd += ["-vf", f"scale={w}:{h}"]

        if fps:
            cmd += ["-r", str(fps)]

        cmd += ["-movflags", "+faststart", str(output_path)]
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        return output_path

    def watermark_video(
        self,
        input_path: Path,
        output_path: Path,
        watermarks_config: list[dict],
        video_width: int,
        video_height: int,
        video_duration: float,
        context: dict | None = None,
    ) -> list[Path]:
        temp_files = []
        inputs = []
        filter_chains = []
        
        current_stream = "[0:v]"
        
        for idx, config in enumerate(watermarks_config):
            if config.get("type") == "text":
                text = resolve_placeholders(config.get("text", ""), context)
                w_img = create_text_watermark_image(
                    text=text,
                    font_name=config.get("font_name"),
                    font_size=config.get("font_size", 24),
                    font_color=config.get("font_color", "#FFFFFF"),
                    outline_color=config.get("outline_color"),
                    outline_width=config.get("outline_width", 0),
                    shadow_color=config.get("shadow_color"),
                    shadow_offset=(config.get("shadow_offset_x", 2), config.get("shadow_offset_y", 2)),
                    padding=config.get("padding", 0),
                )
            else:
                logo_path = config.get("logo_path")
                if not logo_path or not Path(logo_path).is_file():
                    continue
                w_img = Image.open(logo_path)
                
            w_img = process_watermark_image(
                base_img=w_img,
                video_width=video_width,
                video_height=video_height,
                opacity=config.get("opacity", 1.0),
                scale=config.get("scale"),
                rotation=config.get("rotation", 0.0),
            )
            
            temp_dir = Path(settings.local_storage_path) / settings.temp_storage_path
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_png = temp_dir / f"w_{uuid4()}.png"
            w_img.save(temp_png, "PNG")
            temp_files.append(temp_png)
            
            x, y = calculate_overlay_position(
                position=config.get("position", "center"),
                video_w=video_width,
                video_h=video_height,
                overlay_w=w_img.width,
                overlay_h=w_img.height,
                margin=config.get("margin", 10),
                custom_x=config.get("x"),
                custom_y=config.get("y"),
            )
            
            inputs.append(str(temp_png))
            
            start_t = config.get("start_time", 0.0)
            if start_t is None:
                start_t = 0.0
            end_t = config.get("end_time", video_duration)
            if end_t is None:
                end_t = video_duration
                
            enable_str = f":enable='between(t,{start_t:.3f},{end_t:.3f})'"
            next_stream = f"[v{idx}]"
            filter_chains.append(f"{current_stream}[{idx+1}:v]overlay=x={x}:y={y}{enable_str}{next_stream}")
            current_stream = next_stream

        if not inputs:
            cmd = ["ffmpeg", "-y", "-i", str(input_path), "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", str(output_path)]
            subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
            return []

        cmd = ["ffmpeg", "-y", "-i", str(input_path)]
        for inp in inputs:
            cmd += ["-i", inp]
            
        filter_complex_str = ";".join(filter_chains)
        last_v = f"v{len(inputs)-1}"
        
        cmd += [
            "-filter_complex", filter_complex_str,
            "-map", f"[{last_v}]",
            "-map", "0:a?",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path)
        ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        return temp_files

    def watermark_image(
        self,
        input_path: Path,
        output_path: Path,
        watermarks_config: list[dict],
        context: dict | None = None,
    ) -> None:
        with Image.open(input_path) as base_img:
            if base_img.mode != "RGBA":
                base_img = base_img.convert("RGBA")
                
            video_w, video_h = base_img.size
            
            for config in watermarks_config:
                if config.get("type") == "text":
                    text = resolve_placeholders(config.get("text", ""), context)
                    w_img = create_text_watermark_image(
                        text=text,
                        font_name=config.get("font_name"),
                        font_size=config.get("font_size", 24),
                        font_color=config.get("font_color", "#FFFFFF"),
                        outline_color=config.get("outline_color"),
                        outline_width=config.get("outline_width", 0),
                        shadow_color=config.get("shadow_color"),
                        shadow_offset=(config.get("shadow_offset_x", 2), config.get("shadow_offset_y", 2)),
                        padding=config.get("padding", 0),
                    )
                else:
                    logo_path = config.get("logo_path")
                    if not logo_path or not Path(logo_path).is_file():
                        continue
                    w_img = Image.open(logo_path)
                    
                w_img = process_watermark_image(
                    base_img=w_img,
                    video_width=video_w,
                    video_height=video_h,
                    opacity=config.get("opacity", 1.0),
                    scale=config.get("scale"),
                    rotation=config.get("rotation", 0.0),
                )
                
                x, y = calculate_overlay_position(
                    position=config.get("position", "center"),
                    video_w=video_w,
                    video_h=video_h,
                    overlay_w=w_img.width,
                    overlay_h=w_img.height,
                    margin=config.get("margin", 10),
                    custom_x=config.get("x"),
                    custom_y=config.get("y"),
                )
                
                base_img.alpha_composite(w_img, (x, y))
                
            suffix = output_path.suffix.lower()
            if suffix in (".jpg", ".jpeg"):
                base_img = base_img.convert("RGB")
                base_img.save(output_path, "JPEG", quality=95)
            else:
                base_img.save(output_path, "PNG")


ffmpeg_service = FFmpegService()


class AuditService:
    def log(
        self,
        db: Session,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        user_id: str | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()


class ProcessingJobService:
    def create(
        self,
        db: Session,
        job_type: str,
        video_id: str | None = None,
        user_id: str | None = None,
        clip_id: str | None = None,
        message: str = "Queued",
        metadata: dict | None = None,
    ) -> ProcessingJob:
        job = ProcessingJob(
            video_id=video_id,
            user_id=user_id,
            clip_id=clip_id,
            job_type=job_type,
            status="pending",
            message=message,
            metadata_json=metadata,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def update_progress(
        self,
        db: Session,
        job_id: str,
        progress: int,
        message: str,
        status: str | None = None,
    ) -> None:
        job = db.get(ProcessingJob, job_id)
        if not job:
            return
        job.progress = progress
        job.message = message
        if status:
            job.status = status
        if status == "processing" and not job.started_at:
            job.started_at = datetime.now(UTC)
        if status in ("completed", "failed"):
            job.completed_at = datetime.now(UTC)
        job.updated_at = datetime.now(UTC)
        db.commit()

    def fail(self, db: Session, job_id: str, error: str) -> None:
        job = db.get(ProcessingJob, job_id)
        if not job:
            return
        job.status = "failed"
        job.error_detail = error[:1000]
        job.message = "Failed"
        job.completed_at = datetime.now(UTC)
        db.commit()


class ClipService:
    def create_clip_record(
        self,
        db: Session,
        video_id: str,
        title: str,
        start_time: float,
        end_time: float,
        user_id: str | None = None,
        source: str = "manual",
        search_query: str | None = None,
    ) -> Clip:
        if end_time <= start_time:
            raise ValueError("End time must be after start time")
        clip = Clip(
            video_id=video_id,
            user_id=user_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=round(end_time - start_time, 3),
            source=source,
            search_query=search_query,
            status="pending",
        )
        db.add(clip)
        db.commit()
        db.refresh(clip)
        return clip

    def get_video_path(self, video: MediaVideo) -> Path:
        if video.storage_key:
            return video_storage.get_local_path(video.storage_key)
        if video.file_path:
            return Path(video.file_path)
        raise FileNotFoundError("Video file not found")


audit_service = AuditService()
processing_job_service = ProcessingJobService()
clip_service = ClipService()
