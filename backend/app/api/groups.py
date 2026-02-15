"""
Admin API endpoints for managing groups.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Group, Swimmer, User

router = APIRouter(tags=["admin"], prefix="/admin/groups")


class GroupOut(BaseModel):
    id: int
    name: str
    display_name_cs: str
    swimmer_count: int

    class Config:
        from_attributes = True


class GroupDetail(BaseModel):
    id: int
    name: str
    display_name_cs: str
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


@router.get("", response_model=list[GroupOut])
async def get_all_groups(
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get all groups with swimmer counts.
    Requires authentication.
    """
    groups = db.query(Group).order_by(Group.name).all()

    result = []
    for group in groups:
        # Count swimmers in this group using the old group column
        swimmer_count = db.query(Swimmer).filter(Swimmer.group == group.name).count()

        result.append(
            GroupOut(
                id=group.id,
                name=group.name,
                display_name_cs=group.display_name_cs,
                swimmer_count=swimmer_count,
            )
        )

    return result


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

    # Count all swimmers
    swimmer_count = db.query(Swimmer).filter(Swimmer.group == group.name).count()

    # Count active swimmers
    from datetime import date

    today = date.today()
    active_swimmer_count = (
        db.query(Swimmer)
        .filter(Swimmer.group == group.name)
        .filter((Swimmer.membership_end.is_(None)) | (Swimmer.membership_end >= today))
        .count()
    )

    return GroupDetail(
        id=group.id,
        name=group.name,
        display_name_cs=group.display_name_cs,
        swimmer_count=swimmer_count,
        active_swimmer_count=active_swimmer_count,
    )


@router.post("", response_model=GroupOut)
async def create_group(
    create_data: CreateGroupRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
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

    new_group = Group(
        name=create_data.name,
        display_name_cs=create_data.display_name_cs,
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    return GroupOut(
        id=new_group.id,
        name=new_group.name,
        display_name_cs=new_group.display_name_cs,
        swimmer_count=0,
    )


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: int,
    update_data: UpdateGroupRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
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

        # Update all swimmers with old group name to new group name
        old_name = group.name
        group.name = update_data.name

        db.query(Swimmer).filter(Swimmer.group == old_name).update(
            {Swimmer.group: update_data.name}
        )

    if update_data.display_name_cs:
        group.display_name_cs = update_data.display_name_cs

    db.commit()
    db.refresh(group)

    swimmer_count = db.query(Swimmer).filter(Swimmer.group == group.name).count()

    return GroupOut(
        id=group.id,
        name=group.name,
        display_name_cs=group.display_name_cs,
        swimmer_count=swimmer_count,
    )


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_user)],
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

    # Check if group has swimmers
    swimmer_count = db.query(Swimmer).filter(Swimmer.group == group.name).count()
    if swimmer_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete group with {swimmer_count} swimmers assigned. Reassign swimmers first.",
        )

    db.delete(group)
    db.commit()

    return {"message": "Group deleted successfully"}
