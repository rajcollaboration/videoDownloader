from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.admin import OverviewResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()
service = AnalyticsService()


@router.get("/overview", response_model=OverviewResponse)
def get_overview(db: Session = Depends(get_db)) -> OverviewResponse:
    return service.build_overview(db)
