from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.crud.stats import get_dashboard_stats

router = APIRouter(
    prefix="/stats",
    tags=["dashboard"],
)


@router.get("/dashboard", response_model=dict)
async def dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics for the home page."""
    return get_dashboard_stats(db)
