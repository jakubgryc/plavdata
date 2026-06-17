from collections import defaultdict

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Result

FIRST_TIME_SENTINEL_MS = 4_500_000


def calculate_improvements():
    db: Session = SessionLocal()
    try:
        results = (
            db.query(Result)
            .order_by(
                Result.swimmer_id, Result.discipline_id, Result.course_id, Result.date
            )
            .all()
        )

        grouped_results = defaultdict(list)
        for result in results:
            key = (result.swimmer_id, result.discipline_id, result.course_id)
            grouped_results[key].append(result)

        for key, res_list in grouped_results.items():
            current_best = None
            for result in res_list:
                if current_best is None:
                    result.improvement = False
                    result.comparison_to_best = FIRST_TIME_SENTINEL_MS
                    current_best = result.time
                else:
                    result.comparison_to_best = current_best - result.time
                    if result.time < current_best:
                        result.improvement = True
                        current_best = result.time
                    else:
                        result.improvement = False

        db.commit()
        print("Improvements calculated and updated successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error calculating improvements: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    calculate_improvements()
