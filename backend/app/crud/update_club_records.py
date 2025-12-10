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

    ages = list(range(9, 15)) + [18, 99]

    for stroke_code, distances in disciplines:
        for distance in distances:
            discipline_code = f"{distance} {stroke_code}"
            for sex in ["male", "female"]:
                for age in ages:
                    print(f"Processing {discipline_code}, age {age}, sex {sex}...")
                    found_record = get_best_times_for_age(
                        db=db,
                        discipline_code=discipline_code,
                        course_length=25,
                        sex=sex,
                        max_age=age,
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
                                AgeCategory.max_age == age,
                                Swimmer.sex == sex,
                            )
                            .first()
                        )
                        if curr_record:
                            if curr_record.result.time > found_record[0].time:
                                curr_record.result_id = found_record[0].id
                                print(
                                    f"Updated record for {discipline_code}, age {age}, sex {sex}."
                                )
                            else:
                                print(
                                    f"No update needed for {discipline_code}, age {age}, sex {sex}."
                                )
                        else:
                            age_category = (
                                db.query(AgeCategory)
                                .filter(AgeCategory.max_age == age)
                                .first()
                            )

                            new_record = ClubRecord(
                                result_id=found_record[0].id,
                                age_category_id=age_category.id,
                            )
                            db.add(new_record)
                            print(
                                f"Added new record for {discipline_code}, age {age}, sex {sex}."
                            )
                    else:
                        print(
                            f"No record found for {discipline_code}, age {age}, sex {sex}."
                        )

    db.commit()
    db.close()


if __name__ == "__main__":
    update_club_records()
