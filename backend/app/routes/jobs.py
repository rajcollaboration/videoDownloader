import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.processing import ProcessingJob
from app.models.user import User
from app.schemas.media import ProcessingJobResponse

router = APIRouter()


@router.get("/", response_model=list[ProcessingJobResponse])
def list_jobs(
    db: Annotated[Session, Depends(get_db)],
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    video_id: str | None = None,
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    query = db.query(ProcessingJob)
    if user:
        query = query.filter(ProcessingJob.user_id == user.id)
    if status_filter:
        query = query.filter(ProcessingJob.status == status_filter)
    if video_id:
        query = query.filter(ProcessingJob.video_id == video_id)
    jobs = (
        query.order_by(ProcessingJob.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [ProcessingJobResponse.model_validate(j) for j in jobs]


@router.get("/{job_id}", response_model=ProcessingJobResponse)
def get_job(job_id: str, db: Annotated[Session, Depends(get_db)]):
    job = db.get(ProcessingJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return ProcessingJobResponse.model_validate(job)
