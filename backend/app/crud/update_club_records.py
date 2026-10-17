from sqlalchemy import select, func

from app.models import ClubRecord, Result, Swimmer, Discipline, AgeCategory, Course
from app.constants import DNF_THRESHOLD, EXCLUDED_COMPETITION_LOCATIONS
from app.db import SessionLocal

# Disciplines that have club records, per stroke code
RECORD_DISCIPLINES = [
    ("M", [50, 100, 200]),
    ("Z", [50, 100, 200]),
    ("P", [50, 100, 200]),
    ("K", [50, 100, 200, 400, 800, 1500]),
    ("O", [100, 200, 400]),
]

# (discipline_code, course_length) combinations that are skipped
EXCLUDED_DISCIPLINE_COURSES = {("100 O", 50)}


def _find_best_results_for_course(db, course_length: int):
    """
    Single set-based query returning the best result for every
    (discipline, sex, age category) combination on the given course.

    A result qualifies for every age category whose max_age is >= the
    swimmer's age_at_result (so a 10-year-old can hold the record in the
    11 or 12 category if nobody better exists). Ties are broken by the
    earlier date first, then the younger swimmer.
    """
    discipline_codes = [
        f"{distance} {stroke_code}"
        for stroke_code, distances in RECORD_DISCIPLINES
        for distance in distances
        if (f"{distance} {stroke_code}", course_length)
        not in EXCLUDED_DISCIPLINE_COURSES
    ]

    ranked = (
        select(
            Result.id.label("result_id"),
            Discipline.code.label("discipline_code"),
            Swimmer.sex.label("sex"),
            AgeCategory.id.label("age_category_id"),
            AgeCategory.code.label("age_category_code"),
            func.row_number()
            .over(
                partition_by=(Discipline.id, Swimmer.sex, AgeCategory.id),
                order_by=(
                    Result.time,
                    Result.date,
                    Result.age_at_result,
                    Result.id,
                ),
            )
            .label("rn"),
        )
        .select_from(Result)
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .join(Course, Result.course_id == Course.id)
        .join(AgeCategory, Result.age_at_result <= AgeCategory.max_age)
        .where(
            Course.length == course_length,
            Discipline.code.in_(discipline_codes),
            Result.time < DNF_THRESHOLD,
            Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS),
        )
    ).subquery()

    return db.execute(select(ranked).where(ranked.c.rn == 1)).all()


def _load_existing_records(db, course_length: int):
    """
    Load all existing club records for the given course, keyed by
    (discipline_code, sex, age_category_id). Values are lists because
    duplicate rows for one combination may exist and need cleanup.
    """
    rows = (
        db.query(ClubRecord, Discipline.code, Swimmer.sex)
        .join(ClubRecord.result)
        .join(Result.discipline)
        .join(Result.swimmer)
        .join(Result.course)
        .join(ClubRecord.age_category)
        .filter(Course.length == course_length)
        .all()
    )

    existing = {}
    for club_record, discipline_code, sex in rows:
        key = (discipline_code, sex, club_record.age_category_id)
        existing.setdefault(key, []).append(club_record)
    return existing


def update_club_records():
    db = SessionLocal()

    try:
        for course_length in [25, 50]:
            print(f"Processing {course_length}m course...")

            best_results = _find_best_results_for_course(db, course_length)
            existing = _load_existing_records(db, course_length)

            added = updated = deleted = unchanged = 0

            for row in best_results:
                key = (row.discipline_code, row.sex, row.age_category_id)
                records = existing.pop(key, [])

                if not records:
                    db.add(
                        ClubRecord(
                            result_id=row.result_id,
                            age_category_id=row.age_category_id,
                        )
                    )
                    added += 1
                    continue

                # If one of the duplicates already points at the winning
                # result, keep that one; otherwise repoint the first row.
                winner = next(
                    (r for r in records if r.result_id == row.result_id), None
                )
                if winner is None:
                    winner = records[0]
                    winner.result_id = row.result_id
                    updated += 1
                else:
                    unchanged += 1

                for duplicate in records:
                    if duplicate is not winner:
                        db.delete(duplicate)
                        deleted += 1

            # Records whose combination had no qualifying result are left
            # untouched, same as before.
            untouched = sum(len(v) for v in existing.values())

            print(
                f"{course_length}m done: {added} added, {updated} updated, "
                f"{deleted} duplicates deleted, {unchanged} unchanged, "
                f"{untouched} left untouched (no qualifying result)."
            )

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    update_club_records()
