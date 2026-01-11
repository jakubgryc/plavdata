from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud.stats import PeriodType, get_dashboard_stats
from app.db import get_db

router = APIRouter(
    prefix="/stats",
    tags=["dashboard"],
)


@router.get("/dashboard", response_model=dict)
async def dashboard_stats(
    period_type: PeriodType = Query(
        PeriodType.YEAR,
        description="Filter by 'year' (calendar year) or 'season' (Sep 1 - Aug 31)",
    ),
    db: Session = Depends(get_db),
):
    """Get dashboard statistics for the home page."""
    return get_dashboard_stats(db, period_type)
