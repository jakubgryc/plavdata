from app.models import ClubRecord, Result, Swimmer, Discipline, AgeCategory
from app.crud.results import get_best_times_for_age
from app.db import SessionLocal


def update_club_records():
    db = SessionLocal()

    disciplines = [
        ("M", [50, 100, 200]),
        ("Z", [50, 100, 200]),
        ("P", [50, 100, 200]),
        ("K", [50, 100, 200, 400, 800, 1500]),
        ("O", [100, 200, 400]),
    ]

    try:
        ages = [ac for ac in db.query(AgeCategory).order_by(AgeCategory.max_age).all()]

        for stroke_code, distances in disciplines:
            for distance in distances:
                discipline_code = f"{distance} {stroke_code}"
                for sex in ["male", "female"]:
                    for age in ages:
                        print(
                            f"Processing {discipline_code}, age {age.code}, sex {sex}..."
                        )
                        found_record = get_best_times_for_age(
                            db=db,
                            discipline_code=discipline_code,
                            course_length=25,
                            sex=sex,
                            max_age=age.max_age,
                            limit=1,
                        )
                        if found_record:
                            curr_record = (
                                db.query(ClubRecord)
                                .join(ClubRecord.result)
                                .join(ClubRecord.age_category)
                                .join(Result.discipline)
                                .join(Result.swimmer)
                                .filter(
                                    Discipline.code == discipline_code,
                                    AgeCategory.id == age.id,
                                    Swimmer.sex == sex,
                                )
                                .first()
                            )
                            if curr_record:
                                if curr_record.result.time > found_record[0].time:
                                    curr_record.result_id = found_record[0].id
                                    print(
                                        f"Updated record for {discipline_code}, age {age.code}, sex {sex}."
                                    )
                                else:
                                    print(
                                        f"No update needed for {discipline_code}, age {age.code}, sex {sex}."
                                    )
                            else:
                                new_record = ClubRecord(
                                    result_id=found_record[0].id,
                                    age_category_id=age.id,
                                )
                                db.add(new_record)
                                print(
                                    f"Added new record for {discipline_code}, age {age.code}, sex {sex}."
                                )
                        else:
                            print(
                                f"No record found for {discipline_code}, age {age.code}, sex {sex}."
                            )

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    update_club_records()
