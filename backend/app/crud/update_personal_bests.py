from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import PersonalBest, Result


def update_personal_bests(db: Session):
    results = (
        db.query(
            Result.swimmer_id,
            Result.discipline_id,
            Result.course_id,
            func.min(Result.time).label("best_time"),
        )
        .group_by(Result.swimmer_id, Result.discipline_id, Result.course_id)
        .all()
    )

    updated = 0
    created = 0

    for r in results:
        best_result = (
            db.query(Result)
            .filter(Result.swimmer_id == r.swimmer_id)
            .filter(Result.discipline_id == r.discipline_id)
            .filter(Result.course_id == r.course_id)
            .filter(Result.time == r.best_time)
            .order_by(Result.date.desc())
            .first()
        )

        if not best_result:
            continue

        pb = (
            db.query(PersonalBest)
            .filter(PersonalBest.swimmer_id == r.swimmer_id)
            .filter(PersonalBest.discipline_id == r.discipline_id)
            .filter(PersonalBest.course_id == r.course_id)
            .first()
        )

        if pb:
            if pb.time > r.best_time:
                pb.time = best_result.time
                pb.points = best_result.points
                pb.date = best_result.date
                pb.competition_location = best_result.competition_location
                pb.split_time = best_result.split_time
                pb.relay_part = best_result.relay_part
                updated += 1
                print(
                    f"Updated PB for Swimmer ID {r.swimmer_id}, Discipline ID {r.discipline_id}, Course ID {r.course_id}"
                )
        else:
            new_pb = PersonalBest(
                swimmer_id=r.swimmer_id,
                discipline_id=r.discipline_id,
                course_id=r.course_id,
                time=best_result.time,
                points=best_result.points,
                date=best_result.date,
                competition_location=best_result.competition_location,
                split_time=best_result.split_time,
                relay_part=best_result.relay_part,
            )
            db.add(new_pb)
            created += 1

    db.commit()
    print(f"Updated: {updated}, Created: {created}")


if __name__ == "__main__":
    db = SessionLocal()
    update_personal_bests(db)
    db.close()
