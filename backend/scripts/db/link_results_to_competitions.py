from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Competition, Course, Result


def link_results_to_competitions():
    db: Session = SessionLocal()
    try:
        courses = {course.id: course for course in db.query(Course).all()}

        results = db.query(Result).filter(Result.competition_id.is_(None)).all()

        matched_count = 0
        unmatched_count = 0

        for result in results:
            course = courses.get(result.course_id)
            if not course:
                unmatched_count += 1
                continue

            matching_competitions = (
                db.query(Competition)
                .filter(
                    Competition.location == result.competition_location,
                    Competition.start_date <= result.date,
                    Competition.end_date >= result.date,
                    Competition.pool_length == course.length,
                    Competition.masters.is_(False),
                )
                .all()
            )

            if len(matching_competitions) == 1:
                result.competition_id = matching_competitions[0].id
                matched_count += 1
            elif len(matching_competitions) > 1:
                unmatched_count += 1
                print(
                    f"Warning: Multiple competitions found for result {result.id} "
                    f"at {result.competition_location} on {result.date}. "
                    f"Skipping linking."
                )
            else:
                unmatched_count += 1

        db.commit()
        print("Results linked to competitions successfully.")
        print(f"Matched: {matched_count}")
        print(f"Unmatched: {unmatched_count}")
    except Exception as e:
        db.rollback()
        print(f"Error linking results to competitions: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    link_results_to_competitions()
