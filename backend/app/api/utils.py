import itertools

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Course, Discipline, PersonalBest, Swimmer

router = APIRouter(
    prefix="/utils",
    tags=["utils"],
)


@router.post("/best-relay")
async def calculate_best_relay(data: dict, db: Session = Depends(get_db)):
    swimmer_ids = data.get("swimmerIds", [])
    relay_type = data.get("relayType", "freestyle")

    if len(swimmer_ids) < 4:
        raise HTTPException(status_code=400, detail="At least 4 swimmers required")

    if relay_type == "freestyle":
        # Get best 50 free times for each selected swimmer
        swimmer_times = {}
        for swimmer_id in swimmer_ids:
            pb = (
                db.query(PersonalBest)
                .join(Discipline)
                .join(Course)
                .filter(
                    PersonalBest.swimmer_id == swimmer_id,
                    Discipline.code == "50 K",
                    Course.length == "25",
                )
                .order_by(PersonalBest.time)
                .first()
            )
            if pb:
                swimmer_times[swimmer_id] = pb.time

        if len(swimmer_times) < 4:
            raise HTTPException(status_code=400, detail="Not enough 50 free times")

        # Generate all combinations of 4 swimmers
        print(swimmer_times)
        relays = []
        for combo in itertools.combinations(swimmer_times.keys(), 4):
            total = sum(swimmer_times[swimmer_id] for swimmer_id in combo)
            swimmers_list = [
                {
                    "id": swimmer_id,
                    "name": db.query(Swimmer)
                    .filter(Swimmer.id == swimmer_id)
                    .first()
                    .name,
                    "surname": db.query(Swimmer)
                    .filter(Swimmer.id == swimmer_id)
                    .first()
                    .surname,
                    "stroke": "VZ",
                    "time": swimmer_times[swimmer_id],
                }
                for swimmer_id in combo
            ]
            relays.append({"totalTime": total, "swimmers": swimmers_list})

        # Sort by total time and take top 10
        relays.sort(key=lambda x: x["totalTime"])
        relays = relays[:10]

    elif relay_type == "medley":
        # Strokes: Z (back), P (breast), M (fly), K (free)
        strokes = ["50 Z", "50 P", "50 M", "50 K"]
        stroke_assignments = ["Z", "P", "M", "VZ"]

        # Get available strokes for each swimmer
        swimmer_strokes = {}
        for swimmer_id in swimmer_ids:
            available_strokes = []
            for stroke in strokes:
                pb = (
                    db.query(PersonalBest)
                    .join(Discipline)
                    .join(Course)
                    .filter(
                        PersonalBest.swimmer_id == swimmer_id,
                        Discipline.code == stroke,
                        Course.length == 25,
                    )
                    .order_by(PersonalBest.time)
                    .first()
                )
                if pb:
                    available_strokes.append(stroke)
            if available_strokes:  # At least one stroke
                swimmer_strokes[swimmer_id] = available_strokes

        if len(swimmer_strokes) < 4:
            raise HTTPException(
                status_code=400, detail="Not enough swimmers with any stroke times"
            )

        # Find top 10 best combinations
        top_relays = []

        for combo in itertools.permutations(swimmer_strokes.keys(), 4):
            total = 0
            team = []
            valid = True
            for i, swimmer_id in enumerate(combo):
                stroke_code = strokes[i]
                stroke_name = stroke_assignments[i]
                if stroke_code in swimmer_strokes[swimmer_id]:
                    # Get the time for this stroke
                    pb = (
                        db.query(PersonalBest)
                        .join(Discipline)
                        .join(Course)
                        .filter(
                            PersonalBest.swimmer_id == swimmer_id,
                            Discipline.code == stroke_code,
                            Course.length == 25,
                        )
                        .order_by(PersonalBest.time)
                        .first()
                    )
                    time = pb.time
                    total += time
                    team.append({"id": swimmer_id, "stroke": stroke_name, "time": time})
                else:
                    valid = False
                    break
            if valid:
                # Add swimmer names
                for member in team:
                    swimmer = (
                        db.query(Swimmer).filter(Swimmer.id == member["id"]).first()
                    )
                    member["name"] = swimmer.name
                    member["surname"] = swimmer.surname
                top_relays.append({"totalTime": total, "swimmers": team})

        # Sort by total time and take top 10
        top_relays.sort(key=lambda x: x["totalTime"])
        relays = top_relays[:10]

        if not relays:
            raise HTTPException(status_code=400, detail="No valid combinations found")

    else:
        raise HTTPException(status_code=400, detail="Invalid relay type")

    return {"relays": relays}
