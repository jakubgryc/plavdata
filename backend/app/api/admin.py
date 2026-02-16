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
from app.models import Group, Swimmer, User

router = APIRouter(tags=["admin"], prefix="/admin")


class SwimmerAdminOut(BaseModel):
    id: int
    name: str
    surname: str
    birth_year: int
    group_id: Optional[int]
    group_display_name: Optional[str]
    sex: str
    membership_start: Optional[date]
    membership_end: Optional[date]
    is_active: bool
    show_in_comparison: bool
    show_in_personal_bests: bool
    show_in_relay_builder: bool

    class Config:
        from_attributes = True

    @classmethod
    def from_swimmer(cls, swimmer: Swimmer, group_display_name: Optional[str] = None):
        """Create SwimmerAdminOut with is_active calculated."""
        is_active = (
            swimmer.membership_end is None or swimmer.membership_end >= date.today()
        )
        return cls(
            id=swimmer.id,
            name=swimmer.name,
            surname=swimmer.surname,
            birth_year=swimmer.birth_year,
            group_id=swimmer.group_id,
            group_display_name=group_display_name,
            sex=swimmer.sex,
            membership_start=swimmer.membership_start,
            membership_end=swimmer.membership_end,
            is_active=is_active,
            show_in_comparison=swimmer.show_in_comparison,
            show_in_personal_bests=swimmer.show_in_personal_bests,
            show_in_relay_builder=swimmer.show_in_relay_builder,
        )


class PaginatedSwimmersResponse(BaseModel):
    swimmers: list[SwimmerAdminOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class UpdateSwimmerRequest(BaseModel):
    group_id: Optional[int] = None
    show_in_comparison: Optional[bool] = None
    show_in_personal_bests: Optional[bool] = None
    show_in_relay_builder: Optional[bool] = None


class SwimmerUpdateItem(BaseModel):
    swimmer_id: int
    updates: UpdateSwimmerRequest


class BulkUpdateSwimmersRequest(BaseModel):
    updates: list[SwimmerUpdateItem]


class BulkUpdateSwimmersResponse(BaseModel):
    success_count: int
    error_count: int
    updated_swimmers: list[SwimmerAdminOut]
    errors: list[dict]


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
    from sqlalchemy.orm import joinedload

    query = db.query(Swimmer).options(joinedload(Swimmer.group_rel))

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
    swimmers_out = []
    for swimmer in swimmers:
        # Get group display name if swimmer has a group_id
        group_display_name = None
        if swimmer.group_id:
            group = db.query(Group).filter(Group.id == swimmer.group_id).first()
            if group:
                group_display_name = group.display_name_cs

        swimmers_out.append(SwimmerAdminOut.from_swimmer(swimmer, group_display_name))

    total_pages = (total + page_size - 1) // page_size

    return PaginatedSwimmersResponse(
        swimmers=swimmers_out,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _update_single_swimmer(
    swimmer_id: int,
    updates: UpdateSwimmerRequest,
    db: Session,
    groups_dict: dict[int, Group],
) -> SwimmerAdminOut:
    """
    Update a single swimmer with the provided updates.
    Raises exceptions if swimmer or group not found.
    """
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise ValueError("Swimmer not found")

    group_display_name = None

    # Update group if provided
    if updates.group_id is not None:
        if updates.group_id not in groups_dict:
            raise ValueError("Group not found")
        group_display_name = groups_dict[updates.group_id].display_name_cs
        swimmer.group_id = updates.group_id

    # Update visibility flags if provided
    if updates.show_in_comparison is not None:
        swimmer.show_in_comparison = updates.show_in_comparison
    if updates.show_in_personal_bests is not None:
        swimmer.show_in_personal_bests = updates.show_in_personal_bests
    if updates.show_in_relay_builder is not None:
        swimmer.show_in_relay_builder = updates.show_in_relay_builder

    db.flush()

    # Get group display name if swimmer has a group_id and we didn't just set it
    if swimmer.group_id and not group_display_name:
        if swimmer.group_id in groups_dict:
            group_display_name = groups_dict[swimmer.group_id].display_name_cs

    return SwimmerAdminOut.from_swimmer(swimmer, group_display_name)


@router.patch("/swimmers/bulk")
async def bulk_update_swimmers(
    bulk_request: BulkUpdateSwimmersRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Bulk update multiple swimmers in a single request.
    Requires authentication.
    """
    success_count = 0
    error_count = 0
    updated_swimmers = []
    errors = []

    # Preload all groups for efficiency
    groups_dict = {g.id: g for g in db.query(Group).all()}

    for item in bulk_request.updates:
        try:
            updated_swimmer = _update_single_swimmer(
                item.swimmer_id, item.updates, db, groups_dict
            )
            updated_swimmers.append(updated_swimmer)
            success_count += 1
        except ValueError as e:
            errors.append({"swimmer_id": item.swimmer_id, "error": str(e)})
            error_count += 1
        except Exception as e:
            errors.append({"swimmer_id": item.swimmer_id, "error": str(e)})
            error_count += 1

    # Commit all changes at once
    if success_count > 0:
        db.commit()

    return BulkUpdateSwimmersResponse(
        success_count=success_count,
        error_count=error_count,
        updated_swimmers=updated_swimmers,
        errors=errors,
    )


@router.patch("/swimmers/{swimmer_id}")
async def update_swimmer(
    swimmer_id: int,
    update_data: UpdateSwimmerRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Update a swimmer's group and visibility flags.
    Requires authentication.
    """

    # Currently not used, perhaps will use it in the future for single updates on swimmers' profile
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    # Verify group exists if provided
    group_display_name = None
    if update_data.group_id is not None:
        group = db.query(Group).filter(Group.id == update_data.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        group_display_name = group.display_name_cs
        swimmer.group_id = update_data.group_id

    # Update visibility flags if provided
    if update_data.show_in_comparison is not None:
        swimmer.show_in_comparison = update_data.show_in_comparison
    if update_data.show_in_personal_bests is not None:
        swimmer.show_in_personal_bests = update_data.show_in_personal_bests
    if update_data.show_in_relay_builder is not None:
        swimmer.show_in_relay_builder = update_data.show_in_relay_builder

    db.commit()
    db.refresh(swimmer)

    # Get group display name if swimmer has a group_id and we didn't just set it
    if swimmer.group_id and not group_display_name:
        group = db.query(Group).filter(Group.id == swimmer.group_id).first()
        if group:
            group_display_name = group.display_name_cs

    return SwimmerAdminOut.from_swimmer(swimmer, group_display_name)
