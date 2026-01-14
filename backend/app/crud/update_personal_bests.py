import argparse

from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import PersonalBest, Result
from app.constants import DNF_THRESHOLD


def update_personal_bests(create_tables: bool = False):
    # Thanks Copilot for more efficient lookup

    if create_tables:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created\n")

    db: Session = SessionLocal()
    try:
        # 1. Pre-fetch existing PBs for O(1) lookup
        existing_pbs = db.query(PersonalBest).all()

        # Key: (swimmer_id, discipline_id, course_id)
        pb_lookup = {
            (pb.swimmer_id, pb.discipline_id, pb.course_id): pb for pb in existing_pbs
        }

        # 2. Get the absolute BEST result for every swimmer/discipline/course
        # This query drives the whole function using swimmer_id from the result itself
        all_best_results = (
            db.query(Result)
            .filter(Result.time < DNF_THRESHOLD)
            .order_by(
                Result.swimmer_id,
                Result.discipline_id,
                Result.course_id,
                Result.time.asc(),
                Result.date.desc(),
            )
            .all()
        )

        processed_combos = set()

        for res in all_best_results:
            combo = (res.swimmer_id, res.discipline_id, res.course_id)

            # Since we ordered by time ASC, the first time we see a combo is the best
            if combo in processed_combos:
                continue
            processed_combos.add(combo)

            existing_pb = pb_lookup.get(combo)

            if existing_pb:
                # Update existing PB if needed
                if existing_pb.time != res.time:
                    existing_pb.time = res.time
                    existing_pb.split_time = res.split_time
                    existing_pb.relay_part = res.relay_part
                    existing_pb.points = res.points
                    existing_pb.competition_location = res.competition_location
                    existing_pb.date = res.date
            else:
                # Create new PB
                new_pb = PersonalBest(
                    swimmer_id=res.swimmer_id,
                    discipline_id=res.discipline_id,
                    course_id=res.course_id,
                    time=res.time,
                    split_time=res.split_time,
                    relay_part=res.relay_part,
                    points=res.points,
                    competition_location=res.competition_location,
                    date=res.date,
                )
                db.add(new_pb)

        db.commit()
        print("Personal bests updated successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error updating personal bests: {e}")
        raise
    finally:
        db.close()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Sync personal bests from results to database"
    )

    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Create database tables before syncing",
        default=False,
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    update_personal_bests(args.create_tables)
