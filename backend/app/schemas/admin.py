from pydantic import BaseModel, ConfigDict, Field


class OverviewMetric(BaseModel):
    label: str
    value: str


class JobHistoryItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId")
    title: str
    platform: str
    status: str
    progress: int
    created_at: str = Field(alias="createdAt")
    is_playlist: bool = Field(alias="isPlaylist")


class OverviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    metrics: list[OverviewMetric]
    recent_jobs: list[JobHistoryItem] = Field(alias="recentJobs")
