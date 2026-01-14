import argparse
from collections import defaultdict
from datetime import date, datetime
from typing import Literal

import requests
from sqlalchemy.orm import Session

from app.constants import DEFAULT_AFTER_DATE, GENDERS
from app.links import RESULTS_API_URL
from app.db import Base, SessionLocal, engine
from app.models import Course, Discipline, Result, Swimmer
from scripts.config import HEADERS
from scripts.parse.utils import parse_swimmer_data, get_swimmer_profile
from scripts.utils import wait_random


def save_fetched_results(
    db: Session,
    results: list[dict],
    disciplines: list[Discipline],
    courses: list[Course],
) -> None:
    swimmers = db.query(Swimmer).all()
    for entry in results:
        swimmer_csps_id = entry.get("userId")
        discipline_code = entry.get("disciplineName")
        pool_length = entry.get("poolLength")

        swimmer = next((s for s in swimmers if s.csps_id == swimmer_csps_id), None)

        discipline = next((d for d in disciplines if d.code == discipline_code), None)

        course = next((c for c in courses if c.length == pool_length), None)

        if not swimmer:
            swimmer_profile = get_swimmer_profile(swimmer_csps_id)
            swimmer_data = parse_swimmer_data(None, swimmer_profile, "unknown")
            print(f"Adding new swimmer: {swimmer_data.name} {swimmer_data.surname}")
            new_swimmer = Swimmer(
                csps_id=swimmer_data.csps_id,
                name=swimmer_data.name,
                surname=swimmer_data.surname,
                birth_year=swimmer_data.birth_year,
                group=swimmer_data.group,
                sex=swimmer_data.sex,
                membership_start=datetime.fromisoformat(
                    swimmer_data.membership_start
                ).date()
                if swimmer_data.membership_start
                else None,
                membership_end=datetime.fromisoformat(
                    swimmer_data.membership_end
                ).date()
                if swimmer_data.membership_end
                else None,
            )
            db.add(new_swimmer)
            db.commit()
            swimmers.append(new_swimmer)
            swimmer = new_swimmer

        exists = (
            db.query(Result)
            .filter_by(
                swimmer_id=swimmer.id if swimmer else -1,
                time=entry.get("time"),
                discipline_id=discipline.id,
                course_id=course.id,
                competition_location=entry.get("location"),
                csps_result_id=entry.get("outputId", None),
                split_time=entry.get("splitTime"),
                relay_part=entry.get("relayPart"),
                date=datetime.fromisoformat(entry.get("date")).date(),
                points=entry.get("points"),
            )
            .first()
        )

        if not exists:
            db.add(
                Result(
                    swimmer_id=swimmer.id if swimmer else -1,
                    discipline_id=discipline.id,
                    course_id=course.id,
                    time=entry.get("time"),
                    competition_location=entry.get("location"),
                    csps_result_id=entry.get("outputId", None),
                    improvement=entry.get("improvement"),
                    comparison_to_best=entry.get("comparisonToBest"),
                    split_time=entry.get("splitTime"),
                    relay_part=entry.get("relayPart"),
                    date=datetime.fromisoformat(entry.get("date")).date(),
                    points=entry.get("points"),
                )
            )
        else:
            print("Result already exists, skipping...")

    db.commit()


def fetch_results_by_discipline(
    discipline_code: str,
    after_date: str,
    before_date: str,
    gender: Literal["MALE", "FEMALE"],
) -> list[dict]:
    page = 1
    page_limit = 100
    fetched_results = []
    headers = HEADERS.copy()
    while True:
        url = RESULTS_API_URL.format(
            discipline_code.replace(" ", "+"),
            before_date,
            gender,
            str(page),
            str(page_limit),
            after_date,
        )
        try:
            headers["Referer"] = url
            response = requests.get(url, timeout=5, headers=headers)
            response.raise_for_status()
            data = response.json()

            results = data.get("publicStatisticDtos", [])
            total = data.get("numberOfResults", 0)

            if results:
                fetched_results.extend(results)

            if page * page_limit >= total:
                wait_random(0.3, 0.6)
                return fetched_results

            page += 1
            wait_random(0.4, 0.6)
        except Exception as e:
            print(f"Failed to fetch for {discipline_code}: {e}")
            return []


def fetch_results_by_disciplines(
    db: Session,
    disciplines: list[str],
    after_date: str,
    before_date: str,
) -> None:
    fetched_results = []

    disciplines_db = db.query(Discipline).all()
    courses_db = db.query(Course).all()

    for discipline in disciplines:
        for gender in GENDERS:
            fetched_results_by_discipline = fetch_results_by_discipline(
                discipline, after_date, before_date, gender
            )
            fetched_results.extend(fetched_results_by_discipline)

        save_fetched_results(db, fetched_results, disciplines_db, courses_db)
        fetched_results.clear()


def sync_results(
    create_tables: bool,
    after_date: str = DEFAULT_AFTER_DATE,
    before_date: str = str(date.today()),
) -> None:
    """
    Entrypoint for syncing swimmer results from the statistics API.

    Args:
        after_date (str): Sync results after this date (YYYY-MM-DD).
        before_date (str): Sync results before this date (YYYY-MM-DD).
    """
    if create_tables:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created\n")

    db: Session = SessionLocal()

    disciplines = db.query(Discipline.code).all()

    grouped_disciplines = defaultdict(list)

    for discipline in disciplines:
        stroke = discipline.code.split(" ")[1]
        grouped_disciplines[stroke].append(discipline.code)

    for disciplines in grouped_disciplines.values():
        print(f"Fetching results for disciplines: {', '.join(disciplines)}")
        fetch_results_by_disciplines(db, disciplines, after_date, before_date)
        wait_random(1.2, 2.2)

    db.commit()
    db.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Sync swimmer results from API")

    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Create database tables before syncing",
        default=False,
    )
    parser.add_argument(
        "--after",
        type=str,
        help="Sync results after this date (YYYY-MM-DD)",
        default=DEFAULT_AFTER_DATE,
    )
    parser.add_argument(
        "--before",
        type=str,
        help="Sync results before this date (YYYY-MM-DD)",
        default=str(date.today()),
    )

    return parser.parse_args()


def check_date_format(date_str: str) -> bool:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


if __name__ == "__main__":
    args = parse_args()

    if not check_date_format(args.after) or not check_date_format(args.before):
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")

    sync_results(args.create_tables, args.after, args.before)
