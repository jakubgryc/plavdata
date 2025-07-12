from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.models import Swimmer
from app.api.schemas import BaseSwimmerOut
from app.db import get_db
from app.constants import GROUPS_TO_LOOKUP

router = APIRouter(
    prefix="/swimmers",
    tags=["swimmers"],
)


@router.get("", response_model=list[BaseSwimmerOut])
async def get_swimmers(db: Session = Depends(get_db)):
    """Get all swimmers."""
    swimmers = (
        db.query(Swimmer)
        .filter(Swimmer.group.in_(GROUPS_TO_LOOKUP))
        .options(joinedload(Swimmer.personal_bests))
        .all()
    )
    return swimmers
