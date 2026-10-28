"""
Admin API endpoints for managing groups.
"""

from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user
from app.db import get_db
from app.models import (
    CoachGroup,
    Group,
    SeasonGroupMember,
    Swimmer,
    Training,
    TrainingSchedule,
    User,
)

router = APIRouter(tags=["admin"], prefix="/admin/groups")


class GroupOut(BaseModel):
    id: int
    name: str
    display_name_cs: str
    display_order: int
    swimmer_count: int

    class Config:
        from_attributes = True


class GroupDetail(BaseModel):
    id: int
    name: str
    display_name_cs: str
    display_order: int
    swimmer_count: int
    active_swimmer_count: int

    class Config:
        from_attributes = True


class CreateGroupRequest(BaseModel):
    name: str
    display_name_cs: str


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    display_name_cs: Optional[str] = None


class ReorderGroupsRequest(BaseModel):
    # Group ids in the desired display order (first = position 0)
    ordered_ids: List[int]


class SwimmerInGroup(BaseModel):
    id: int
    name: str
    surname: str
    birth_year: int
    sex: str
    membership_end: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=list[GroupOut])
async def get_all_groups(
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get all groups with swimmer counts.
    Requires authentication.
    """
    groups = db.query(Group).order_by(Group.display_order, Group.name).all()

    result = []
    for group in groups:
        # Count swimmers in this group using group_id foreign key
        swimmer_count = db.query(Swimmer).filter(Swimmer.group_id == group.id).count()

        result.append(
            GroupOut(
                id=group.id,
                name=group.name,
                display_name_cs=group.display_name_cs,
                display_order=group.display_order,
                swimmer_count=swimmer_count,
            )
        )

    return result


@router.patch("/reorder")
async def reorder_groups(
    reorder_data: ReorderGroupsRequest,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Set the display order of all groups at once.
    Body contains the group ids in the desired order.
    Requires authentication.
    """
    ordered_ids = reorder_data.ordered_ids

    if len(set(ordered_ids)) != len(ordered_ids):
        raise HTTPException(
            status_code=400, detail="Duplicate group ids in ordered_ids"
        )

    groups = db.query(Group).all()
    groups_by_id = {group.id: group for group in groups}

    # Require the full set of group ids so the ordering is always complete
    if set(ordered_ids) != set(groups_by_id.keys()):
        raise HTTPException(
            status_code=400,
            detail="ordered_ids must contain exactly all existing group ids",
        )

    for position, group_id in enumerate(ordered_ids):
        groups_by_id[group_id].display_order = position

    db.commit()

    return {"message": "Group order updated successfully"}


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group_detail(
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a group.
    Requires authentication.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Count all swimmers using group_id foreign key
    swimmer_count = db.query(Swimmer).filter(Swimmer.group_id == group.id).count()

    # Count active swimmers
    from datetime import date

    today = date.today()
    active_swimmer_count = (
        db.query(Swimmer)
        .filter(Swimmer.group_id == group.id)
        .filter((Swimmer.membership_end.is_(None)) | (Swimmer.membership_end >= today))
        .count()
    )

    return GroupDetail(
        id=group.id,
        name=group.name,
        display_name_cs=group.display_name_cs,
        display_order=group.display_order,
        swimmer_count=swimmer_count,
        active_swimmer_count=active_swimmer_count,
    )


@router.get("/{group_id}/swimmers", response_model=list[SwimmerInGroup])
async def get_group_swimmers(
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get all swimmers in a group.
    Requires authentication.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    swimmers = (
        db.query(Swimmer)
        .filter(Swimmer.group_id == group.id)
        .order_by(Swimmer.surname, Swimmer.name)
        .all()
    )

    return [
        SwimmerInGroup(
            id=swimmer.id,
            name=swimmer.name,
            surname=swimmer.surname,
            birth_year=swimmer.birth_year,
            sex=swimmer.sex,
            membership_end=swimmer.membership_end.isoformat()
            if swimmer.membership_end
            else None,
        )
        for swimmer in swimmers
    ]


@router.post("", response_model=GroupOut)
async def create_group(
    create_data: CreateGroupRequest,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Create a new group.
    Requires authentication.
    """
    # Check if group with this name already exists
    existing_group = db.query(Group).filter(Group.name == create_data.name).first()
    if existing_group:
        raise HTTPException(
            status_code=400, detail="Group with this name already exists"
        )

    # Place the new group at the end of the current ordering
    max_order = db.query(func.max(Group.display_order)).scalar()
    next_order = 0 if max_order is None else max_order + 1

    new_group = Group(
        name=create_data.name,
        display_name_cs=create_data.display_name_cs,
        display_order=next_order,
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    return GroupOut(
        id=new_group.id,
        name=new_group.name,
        display_name_cs=new_group.display_name_cs,
        display_order=new_group.display_order,
        swimmer_count=0,
    )


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: int,
    update_data: UpdateGroupRequest,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Update a group's information.
    Requires authentication.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if new name conflicts with existing group
    if update_data.name and update_data.name != group.name:
        existing_group = db.query(Group).filter(Group.name == update_data.name).first()
        if existing_group:
            raise HTTPException(
                status_code=400, detail="Group with this name already exists"
            )
        group.name = update_data.name

    if update_data.display_name_cs:
        group.display_name_cs = update_data.display_name_cs

    db.commit()
    db.refresh(group)

    swimmer_count = db.query(Swimmer).filter(Swimmer.group_id == group.id).count()

    return GroupOut(
        id=group.id,
        name=group.name,
        display_name_cs=group.display_name_cs,
        display_order=group.display_order,
        swimmer_count=swimmer_count,
    )


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Delete a group.
    Requires authentication.
    Cannot delete groups that have swimmers assigned.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if group has swimmers using group_id foreign key
    swimmer_count = db.query(Swimmer).filter(Swimmer.group_id == group.id).count()
    if swimmer_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete group with {swimmer_count} swimmers assigned. Reassign swimmers first.",
        )

    # Check if group has any saved training sessions
    has_trainings = db.query(Training).filter(Training.group_id == group_id).first()
    if has_trainings:
        raise HTTPException(
            status_code=409,
            detail="Skupinu s uloženými tréninky nelze smazat.",
        )

    # Check if group has attendance configuration (seasons, schedules, coaches)
    has_season_member = (
        db.query(SeasonGroupMember)
        .filter(SeasonGroupMember.group_id == group_id)
        .first()
    )
    has_schedule = (
        db.query(TrainingSchedule).filter(TrainingSchedule.group_id == group_id).first()
    )
    has_coach = db.query(CoachGroup).filter(CoachGroup.group_id == group_id).first()

    if has_season_member or has_schedule or has_coach:
        raise HTTPException(
            status_code=409,
            detail="Skupina má nastavení docházky (sezóny) — nejprve ho odstraňte.",
        )

    db.delete(group)
    db.commit()

    return {"message": "Group deleted successfully"}


@router.delete("/{group_id}/swimmers/{swimmer_id}")
async def remove_swimmer_from_group(
    group_id: int,
    swimmer_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Remove a swimmer from a group.
    Sets group_id to NULL and visibility flags to False.
    Requires authentication.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    if swimmer.group_id != group_id:
        raise HTTPException(status_code=400, detail="Swimmer is not in this group")

    # Remove from group and set visibility flags to False
    swimmer.group_id = None
    swimmer.show_in_personal_bests = False
    swimmer.show_in_relay_builder = False
    swimmer.show_in_comparison = False

    db.commit()

    return {"message": "Swimmer removed from group successfully"}
