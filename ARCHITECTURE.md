# ClipFetch AI Video Search & Clipping — System Architecture

## Overview

ClipFetch extends the existing video downloader with an enterprise-grade **AI Video Search and Video Clipping** platform. The system supports video upload, downloaded video import, URL import, asynchronous processing, transcription, semantic search, topic detection, manual and AI-assisted clip generation.

**Stack:**
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend API:** Python 3.12, FastAPI, SQLAlchemy, Celery
- **AI Worker:** Python 3.12, FastAPI, Faster Whisper, Sentence Transformers
- **Database:** PostgreSQL 16 + pgvector
- **Queue:** Redis + Celery (queues: `video-download`, `transcription`, `clip-generation`, `cleanup`)
- **Storage:** Local filesystem, AWS S3, Cloudflare R2, MinIO (abstracted)

---

## High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Next.js    │────▶│  FastAPI     │────▶│  PostgreSQL     │
│  Frontend   │     │  Backend     │     │  + pgvector     │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │  Redis   │ │  Celery  │ │  AI Worker   │
        │  Broker  │ │  Workers │ │  (Whisper,   │
        └──────────┘ └──────────┘ │  Embeddings) │
                                  └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Storage    │
                    │ Local/S3/R2  │
                    └──────────────┘
```

---

## Processing Pipeline

```
Video Source (upload | download | URL)
        ↓
   Store Video (videos/)
        ↓
   Create Processing Job
        ↓
   Extract Audio (FFmpeg → Celery)
        ↓
   Transcription (Faster Whisper → AI Worker)
        ↓
   Chunk Transcript (Backend)
        ↓
   Generate Embeddings (Sentence Transformers → AI Worker)
        ↓
   Store in pgvector (PostgreSQL)
        ↓
   Topic Detection (AI Worker)
        ↓
   AI Semantic Search (pgvector + embeddings)
        ↓
   Timestamp Detection (merged segment boundaries)
        ↓
   Clip Generation (FFmpeg → Celery)
        ↓
   Store Clips (clips/)
        ↓
   Signed/Public Download URL
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | JWT auth, RBAC (user/admin) |
| `media_videos` | Video assets (upload/download/url) |
| `transcripts` | Full transcript metadata |
| `transcript_segments` | Word/segment-level timestamps |
| `transcript_chunks` | Logical chunks for search |
| `embeddings` | pgvector embedding vectors |
| `topics` | Auto-detected discussion topics |
| `clips` | Generated clips (manual + AI) |
| `processing_jobs` | Async job tracking |
| `audit_logs` | Security audit trail |

**Existing tables preserved:** `video_requests`, `download_jobs`, `playlist_items`, `blog_posts`

---

## API Design

### Auth (`/v1/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create account |
| POST | `/login` | JWT login |
| GET | `/me` | Current user |

### Media (`/v1/media`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload video file |
| POST | `/from-download` | Import from download job |
| POST | `/from-url` | Import from URL |
| GET | `/` | List videos (paginated) |
| GET | `/{id}` | Video detail + transcript + topics + clips |
| POST | `/{id}/process` | Start AI pipeline |
| POST | `/{id}/search` | Semantic search |
| GET | `/{id}/transcript` | Get transcript |
| GET | `/{id}/topics` | Get topics |
| POST | `/{id}/clips` | Generate single clip |
| POST | `/{id}/clips/batch` | Generate multiple clips |
| GET | `/{id}/clips` | List clips |
| GET | `/files/{filename}` | Stream video |
| GET | `/clips/files/{filename}` | Download clip |

### Jobs (`/v1/jobs`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List processing jobs |
| GET | `/{id}` | Job status |

---

## Queue Architecture

| Queue | Tasks | Worker |
|-------|-------|--------|
| `video-download` | URL video download | Celery |
| `transcription` | Full AI pipeline | Celery |
| `clip-generation` | FFmpeg clip creation | Celery |
| `cleanup` | Temp file cleanup | Celery |
| `celery` | Legacy download jobs | Celery |

**Retry:** Tasks use `max_retries` with exponential backoff.
**Monitoring:** Prometheus metrics at `/metrics`, job status in `processing_jobs` table.

---

## AI Worker Internal APIs

Protected by `X-Internal-Key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/v1/transcribe` | Faster Whisper transcription |
| POST | `/internal/v1/embeddings` | Sentence-transformer embeddings |
| POST | `/internal/v1/topics` | Topic boundary detection |
| POST | `/internal/v1/search` | Local semantic search |
| POST | `/internal/v1/summarize` | Segment summarization |

---

## Storage Strategy

```
/app/storage/
├── videos/          # Permanent video files
├── clips/           # Generated clips
├── temp/            # Audio extraction, URL downloads
└── blog-images/     # Existing blog CMS
```

**Provider abstraction:** `StorageProvider` interface with `LocalStorageProvider` and `S3StorageProvider` (supports R2/MinIO via `S3_ENDPOINT_URL`).

---

## Security

- **JWT authentication** with optional anonymous access for uploads
- **RBAC:** `user` and `admin` roles
- **Rate limiting:** Existing per-IP middleware
- **File validation:** Extension + MIME + size limits
- **Internal API key** for AI worker communication
- **Signed URLs** for S3 clip delivery
- **Audit logging** for uploads, processing, clips
- **Soft deletes** on videos and clips

---

## Frontend Pages

| Route | Feature |
|-------|---------|
| `/studio` | My Videos list |
| `/studio/upload` | Upload / URL import |
| `/studio/videos/[id]` | Video player, transcript, AI search, manual clip editor |
| `/studio/jobs` | Processing job monitor |

### Video Details UX
- Professional video player (play, pause, seek, speed, volume, fullscreen)
- Transcript sync (highlight + click-to-seek)
- AI search with suggested queries
- Manual clip editor (timeline drag, mark start/end, time input)
- AI + Manual hybrid (Refine Selection from search results)
- Topic cards and clip download list

---

## Folder Structure

```
backend/
├── app/
│   ├── core/           # Config, auth deps, logging, security
│   ├── db/             # SQLAlchemy session, pgvector init
│   ├── models/         # ORM models
│   ├── schemas/        # Pydantic request/response
│   ├── routes/         # FastAPI routers
│   ├── services/       # Business logic
│   └── workers/        # Celery tasks
│       ├── celery_app.py
│       ├── tasks.py          # Legacy downloads
│       └── media_tasks.py    # AI pipeline

ai-worker/
├── app/
│   ├── core/           # Config
│   ├── services/
│   │   ├── transcription.py  # Faster Whisper
│   │   ├── embeddings.py     # Sentence Transformers
│   │   └── topics.py         # Topic detection + search
│   └── main.py         # Internal FastAPI

frontend/
├── app/studio/         # AI video studio pages
├── components/media/   # Player, timeline, transcript, search
└── services/media-api.ts
```

---

## Scalability

- **Horizontal worker scaling:** Add Celery worker containers
- **AI worker scaling:** Separate GPU-enabled containers for Whisper
- **Large videos:** Chunked transcription with VAD filter
- **Long meetings:** Transcript chunking with configurable window sizes

### Future Extensions (architecture-ready)
- Speaker diarization → `transcript_segments.speaker`
- Video translation / dubbing → new AI worker endpoints
- Object detection / OCR → frame analysis pipeline
- Multi-track editing → `clips` metadata extensions
- Clip merging, watermarks, subtitles → FFmpeg service extensions

---

## Development Roadmap

### Phase 1 — Foundation ✅
- Database models + pgvector
- Storage abstraction
- Upload / import APIs
- Celery pipeline skeleton

### Phase 2 — AI Processing ✅
- AI worker microservice
- Faster Whisper transcription
- Embedding generation + pgvector search
- Topic detection

### Phase 3 — Clipping ✅
- Manual clip editor (timeline, mark, input)
- FFmpeg clip generation
- Batch clip creation
- AI search → clip workflow

### Phase 4 — Production Hardening
- [ ] Alembic migrations (replace `create_all`)
- [ ] Redis-backed rate limiting
- [ ] ClamAV malware scanning
- [ ] GPU support for Whisper (CUDA)
- [ ] S3 signed URL delivery for all assets
- [ ] WebSocket job progress (replace polling)
- [ ] Comprehensive test suite

### Phase 5 — Enterprise
- [ ] Multi-tenant isolation
- [ ] Team workspaces
- [ ] Usage billing / quotas
- [ ] SSO (OAuth2/SAML)

---

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

- **Frontend:** http://localhost:3002
- **Studio:** http://localhost:3002/studio
- **API Docs:** http://localhost:8000/docs (via nginx: http://localhost/api/docs)

---

## Environment Variables

See `.env.example` for full list. Key AI variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_WORKER_URL` | `http://ai-worker:8001` | AI worker base URL |
| `AI_WORKER_INTERNAL_KEY` | — | Internal API authentication |
| `WHISPER_MODEL_SIZE` | `base` | Whisper model (tiny/base/small/medium/large) |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence transformer model |
| `EMBEDDING_DIMENSIONS` | `384` | Vector dimensions for pgvector |
| `MAX_UPLOAD_SIZE_MB` | `2048` | Max upload size |
