from collections import defaultdict

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Result


def calculate_improvements():
    db: Session = SessionLocal()
    try:
        # Query all results ordered by swimmer_id, discipline_id, course_id, date
        results = (
            db.query(Result)
            .order_by(
                Result.swimmer_id, Result.discipline_id, Result.course_id, Result.date
            )
            .all()
        )

        # Group results by (swimmer_id, discipline_id, course_id)
        grouped_results = defaultdict(list)
        for result in results:
            key = (result.swimmer_id, result.discipline_id, result.course_id)
            grouped_results[key].append(result)

        # Process each group
        for key, res_list in grouped_results.items():
            current_best = None
            for result in res_list:
                if current_best is None:
                    # First result for this discipline/course
                    result.improvement = False
                    result.comparison_to_best = 0
                    current_best = result.time
                else:
                    if result.time < current_best:
                        # Improvement
                        result.improvement = True
                        result.comparison_to_best = current_best - result.time
                        current_best = result.time
                    else:
                        # No improvement
                        result.improvement = False
                        result.comparison_to_best = (
                            result.time - current_best
                        )  # Negative value

        # Commit the changes
        db.commit()
        print("Improvements calculated and updated successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error calculating improvements: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    calculate_improvements()
