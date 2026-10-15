from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Competition, Course, Result


def is_match(loc1: str, loc2: str) -> bool:
    """
    Check if the result location matches the competition location using fuzzy matching.

    Args:
        loc1: Location from the result
        loc2: Location from the competition

    Returns:
        True if the locations match, False otherwise
    """

    if not loc1 or not loc2:
        return False

    # Normalization
    l1 = loc1.lower().strip()
    l2 = loc2.lower().strip()

    if l1 in l2 or l2 in l1:
        return True

    return False


def link_results_to_competitions():
    db: Session = SessionLocal()
    try:
        courses = {c.id: c for c in db.query(Course).all()}

        # Fetch only results needing a link
        results = db.query(Result).filter(Result.competition_id.is_(None)).all()
        if not results:
            print("No unlinked results found.")
            return 0, 0

        # Load all eligible competitions once into memory
        competitions = (
            db.query(Competition).filter(Competition.masters.is_(False)).all()
        )

        matched_count = 0
        unmatched_count = 0

        for result in results:
            course = courses.get(result.course_id)
            if not course:
                unmatched_count += 1
                continue

            # In-memory candidate filtering
            matching_competitions = [
                comp
                for comp in competitions
                if comp.start_date <= result.date <= comp.end_date
                and comp.pool_length == course.length
                and is_match(result.competition_location, comp.location)
            ]

            if len(matching_competitions) == 1:
                comp = matching_competitions[0]
                result.competition_id = comp.id
                matched_count += 1
            elif len(matching_competitions) > 1:
                unmatched_count += 1
                print(
                    f"Warning: Multiple competitions found for result {result.id} "
                    f"at {result.competition_location} on {result.date}."
                )
            else:
                unmatched_count += 1

        db.commit()
        print(f"Done. Matched: {matched_count}, Unmatched: {unmatched_count}")
        return matched_count, unmatched_count

    except Exception as e:
        db.rollback()
        print(f"Error linking results to competitions: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    link_results_to_competitions()
