from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy.orm import Session

from app.api.limiter import limiter
from app.api.schemas import BestRelayResponse, EqualRelaysResponse
from app.crud.tools.best_relay import (
    calculate_best_freestyle_relay,
    calculate_best_medley_relay,
    calculate_equal_relays,
)
from app.db import get_db

router = APIRouter(
    prefix="/utils",
    tags=["utils"],
)


class BestRelayRequest(BaseModel):
    swimmer_ids: List[int]
    relay_type: str = "freestyle"

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class EqualRelaysRequest(BaseModel):
    swimmer_ids: List[int]
    num_relays: int = 2

    class Config:
        alias_generator = to_camel
        populate_by_name = True


@router.post("/best-relay", response_model=BestRelayResponse)
@limiter.limit("20/minute")
async def calculate_best_relay(
    data: BestRelayRequest, request: Request, db: Session = Depends(get_db)
):
    if len(data.swimmer_ids) < 4:
        raise HTTPException(status_code=400, detail="At least 4 swimmers required")

    if len(data.swimmer_ids) > 30:
        raise HTTPException(
            status_code=400,
            detail="Too many swimmers (max 30) to calculate best relay",
        )

    if data.relay_type == "freestyle":
        relays = calculate_best_freestyle_relay(data.swimmer_ids, db)
        if not relays:
            raise HTTPException(status_code=400, detail="No valid combinations found")

    elif data.relay_type == "medley":
        relays = calculate_best_medley_relay(data.swimmer_ids, db)
        if not relays:
            raise HTTPException(status_code=400, detail="No valid combinations found")

    else:
        raise HTTPException(status_code=400, detail="Invalid relay type")

    # Best time is the first relay's total_time (they're sorted fastest first)
    best_time = relays[0].total_time if relays else None

    return BestRelayResponse(relays=relays, best_time=best_time)


@router.post("/equal-relays", response_model=EqualRelaysResponse)
@limiter.limit("20/minute")
async def calculate_equal_relays_endpoint(
    data: EqualRelaysRequest, request: Request, db: Session = Depends(get_db)
):
    """
    Split swimmers into balanced teams for equal relays.

    Request body:
        - swimmerIds: list of swimmer IDs
        - numRelays: number of relay teams to create
    """
    if len(data.swimmer_ids) < data.num_relays:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {data.num_relays} swimmers for {data.num_relays} relays",
        )

    if len(data.swimmer_ids) > 50:
        raise HTTPException(
            status_code=400,
            detail="Too many swimmers (max 50) to calculate equal relays",
        )

    result = calculate_equal_relays(data.swimmer_ids, data.num_relays, db)
    return result
