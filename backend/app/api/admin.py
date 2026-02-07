"""
Admin API endpoints for managing swimmers.
"""
from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Swimmer, User

router = APIRouter(tags=["admin"], prefix="/admin")


class SwimmerAdminOut(BaseModel):
    id: int
    name: str
    surname: str
    birth_year: int
    group: Optional[str]
    sex: str
    membership_start: Optional[date]
    membership_end: Optional[date]
    is_active: bool

    class Config:
        from_attributes = True

    @classmethod
    def from_swimmer(cls, swimmer: Swimmer):
        """Create SwimmerAdminOut with is_active calculated."""
        is_active = swimmer.membership_end is None or swimmer.membership_end >= date.today()
        return cls(
            id=swimmer.id,
            name=swimmer.name,
            surname=swimmer.surname,
            birth_year=swimmer.birth_year,
            group=swimmer.group,
            sex=swimmer.sex,
            membership_start=swimmer.membership_start,
            membership_end=swimmer.membership_end,
            is_active=is_active,
        )


class PaginatedSwimmersResponse(BaseModel):
    swimmers: list[SwimmerAdminOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class UpdateSwimmerGroupRequest(BaseModel):
    group: Optional[str]


@router.get("/swimmers", response_model=PaginatedSwimmersResponse)
async def get_all_swimmers_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    group_filter: Optional[str] = Query(None, alias="group"),
    active_only: bool = Query(False),
    sort_by: str = Query("surname", regex="^(surname|name|birth_year|group)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Session = Depends(get_db),
):
    """
    Get paginated list of all swimmers for admin management.
    Requires authentication.
    """
    query = db.query(Swimmer)

    # Apply filters
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(Swimmer.name).like(search_term))
            | (func.lower(Swimmer.surname).like(search_term))
        )

    if group_filter:
        query = query.filter(Swimmer.group == group_filter)

    if active_only:
        today = date.today()
        query = query.filter(
            (Swimmer.membership_end.is_(None)) | (Swimmer.membership_end >= today)
        )

    # Get total count before pagination
    total = query.count()

    # Apply sorting
    sort_column = getattr(Swimmer, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Apply pagination
    offset = (page - 1) * page_size
    swimmers = query.offset(offset).limit(page_size).all()

    # Convert to response models
    swimmers_out = [SwimmerAdminOut.from_swimmer(s) for s in swimmers]

    total_pages = (total + page_size - 1) // page_size

    return PaginatedSwimmersResponse(
        swimmers=swimmers_out,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.patch("/swimmers/{swimmer_id}/group")
async def update_swimmer_group(
    swimmer_id: int,
    update_data: UpdateSwimmerGroupRequest,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Session = Depends(get_db),
):
    """
    Update a swimmer's group.
    Requires authentication.
    """
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    swimmer.group = update_data.group
    db.commit()
    db.refresh(swimmer)

    return SwimmerAdminOut.from_swimmer(swimmer)

