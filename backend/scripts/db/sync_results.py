import argparse
from datetime import datetime, date
from typing import NamedTuple

import requests
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Swimmer, Result, Discipline, Course, PersonalBest
from scripts.config import HEADERS
from scripts.utils import wait_random

API_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/{}/improvements?disciplineAbbrev={}&improvementsOnly=false&limit={}&page={}&poolLength={}"
REFERER_URL = "https://vysledky.czechswimming.cz/lide/{}"


# Hardcoded list of allowed groups
VALID_GROUPS = ["Z1", "Z2", "P1"]


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


def filter_results(results: list[dict], membership_end: date):
    filtered = []
    for entry in results:
        date_str = entry.get("date")
        if date_str:
            result_date = datetime.fromisoformat(date_str).date()
            if result_date < membership_end:
                filtered.append(entry)
    return filtered


def fetch_results(
    user_id: int, discipline_code: str, pool_length: int, membership_end: date | None
):
    page = 1
    page_limit = 100
    all_results = []
    headers = HEADERS.copy()
    while True:
        url = API_URL.format(
            user_id,
            discipline_code.replace(" ", "+"),
            str(page_limit),
            str(page),
            pool_length,
        )
        try:
            headers["Referer"] = REFERER_URL.format(user_id)
            response = requests.get(url, timeout=5, headers=headers)
            response.raise_for_status()
            data = response.json()

            results = data.get("rows", [])
            total = data.get("rowCount", 0)

            if membership_end:
                results = filter_results(results, membership_end)

            if results:
                all_results.extend(results)

            if page * page_limit >= total:
                wait_random(0.4, 0.6)
                break

            page += 1
            wait_random(0.2, 0.35)
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


def sync_results(
    groups_to_update: list[str],
    csps_ids: list[int] | None = None,
    course_type: int | None = None,
):
    db: Session = SessionLocal()

    filters = []

    if groups_to_update:
        filters.append(Swimmer.group.in_(groups_to_update))

    if csps_ids:
        filters.append(Swimmer.csps_id.in_(csps_ids))

    if not filters:
        print("No groups or swimmer IDs specified for update.")
        db.close()
        return

    combined_filter = or_(*filters)

    swimmers = db.query(Swimmer).filter(combined_filter).all()
    if course_type:
        courses = db.query(Course).filter_by(length=course_type).all()
    else:
        courses = db.query(Course).all()
    disciplines = db.query(Discipline).all()

    num_of_swimmers = len(swimmers)
    for i, swimmer in enumerate(swimmers):
        print(f"{i + 1}/{num_of_swimmers} Swimmer:  {swimmer.name} {swimmer.surname}")

        membership_end = swimmer.membership_end if swimmer.group == "runaway" else None
        current_group = swimmer.group
        for discipline in disciplines:
            for course in courses:
                # Check if swimmer has a personal best for this discipline and course
                # to avoid unnecessary API calls

                if course.length == 50 and discipline.code == "100 O":
                    continue
                if not current_group == "runaway":
                    pb_exists = (
                        db.query(PersonalBest)
                        .filter_by(
                            swimmer_id=swimmer.id,
                            discipline_id=discipline.id,
                            course_id=course.id,
                        )
                        .first()
                    )

                if not current_group == "runaway" and not pb_exists:
                    print(
                        f"  Skipping {discipline.code} {course.length}m - no personal best"
                    )
                    continue

                results_data = fetch_results(
                    swimmer.csps_id, discipline.code, course.length, membership_end
                )

                if len(results_data) == 0:
                    continue

                save_data(db, swimmer, discipline, course, results_data)

        print(f"Synced results for {swimmer.name} {swimmer.surname}\n")

        if (i + 1) % 5 == 0:
            db.commit()

    db.commit()
    db.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Sync swimmer results from API")
    parser.add_argument(
        "--groups",
        type=str,
        help="List of groups to update, comma separated",
    )
    parser.add_argument(
        "--csps-ids",
        type=str,
        help="List of CSPS IDs to update, comma separated",
        required=False,
    )
    parser.add_argument(
        "--course",
        type=int,
        help="Course type to update (25 or 50)",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.groups:
        args.groups = args.groups.split(",")
    else:
        args.groups = VALID_GROUPS

    if args.csps_ids:
        args.csps_ids = [int(csps_id) for csps_id in args.csps_ids.split(",")]

    if args.course:
        if args.course not in ["25", "50"]:
            raise ValueError("Course must be either 25 or 50")
    sync_results(args.groups, args.csps_ids, args.course)
