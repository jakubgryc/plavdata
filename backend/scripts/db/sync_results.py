from datetime import datetime
from typing import NamedTuple

import requests
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Swimmer, Result, Discipline, Course
from scripts.config import HEADERS

API_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/{}/improvements?disciplineAbbrev={}&improvementsOnly=false&limit=100&page={}&poolLength={}"


# Hardcoded list of allowed groups
VALID_GROUPS = ["Z1", "Z2", "P1", "veteran"]


class ResultEntry(NamedTuple):
    time: str
    discipline_code: str
    pool_length: int
    improvement: bool
    comparison_to_best: bool
    split_time: bool
    relay_part: bool
    competition_location: str
    date_str: str


def fetch_results(
    user_id: int, discipline_code: str, pool_length: int, limit: int = 100
):
    page = 1
    all_results = []
    headers = HEADERS.copy()
    while True:
        url = API_URL.format(
            user_id, discipline_code.replace(" ", "+"), str(page), pool_length
        )
        try:
            headers["Referer"] = f"https://vysledky.czechswimming.cz/lide/{user_id}"
            response = requests.get(url, timeout=5, headers=headers)
            response.raise_for_status()
            data = response.json()

            results = data.get("rows", [])
            total = data.get("rowCount", 0)

            all_results.extend(results)

            if len(all_results) >= total:
                break

            page += 1
        except Exception as e:
            print(f"Failed to fetch for {user_id}: {e}")
            return []
    return all_results


def save_data(
    db: Session,
    swimmer: Swimmer,
    discipline: Discipline,
    course: Course,
    results: list[dict],
):
    for entry in results:
        # Adjust these fields based on actual API response keys
        time = entry.get("time")
        competition_location = entry.get("location")
        improvement = entry.get("improvement")
        comparison_to_best = entry.get("comparisonToBest")
        split_time = entry.get("splitTime")
        relay_part = entry.get("relayPart")
        date_str = entry.get("date")

        exists = (
            db.query(Result)
            .filter_by(
                swimmer_id=swimmer.id,
                discipline_id=discipline.id,
                course_id=course.id,
                date=datetime.fromisoformat(date_str),
                time=time,
                split_time=split_time,
                relay_part=relay_part,
            )
            .first()
        )

        if not exists:
            db.add(
                Result(
                    swimmer_id=swimmer.id,
                    time=time,
                    discipline_id=discipline.id,
                    course_id=course.id,
                    competition_location=competition_location,
                    improvement=improvement,
                    comparison_to_best=comparison_to_best,
                    split_time=split_time,
                    relay_part=relay_part,
                    date=datetime.fromisoformat(date_str),
                )
            )


def sync():
    db: Session = SessionLocal()

    swimmers = db.query(Swimmer).filter(Swimmer.group.in_(VALID_GROUPS)).all()
    courses = db.query(Course).all()
    disciplines = db.query(Discipline).all()

    for swimmer in swimmers:
        print(f"Swimmer: {swimmer.name} {swimmer.surname}")

        for discipline in disciplines:
            for course in courses:
                if discipline.code == "100 O" and course.length == "50":
                    continue

                results_data = fetch_results(
                    swimmer.swimmer_id, discipline.code, course.length
                )

                if len(results_data) == 0:
                    continue

                save_data(db, swimmer, discipline, course, results_data)

        print(f"Synced results for {swimmer.name} {swimmer.surname}\n\n")

    db.commit()
    db.close()


if __name__ == "__main__":
    sync()
