import argparse
from datetime import datetime, timezone
from typing import NamedTuple

import requests
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Swimmer, PersonalBest, Discipline, Course, ApiSync
from scripts.config import HEADERS
from scripts.utils import wait_random


# Hardcoded list of allowed groups
VALID_GROUPS = ["Z1", "Z2", "P1", "veteran"]

API_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/{}/outputs?mastersOnly=false"
REFERER_URL = "https://vysledky.czechswimming.cz/lide/{}"


class PBEntry(NamedTuple):
    time: str
    discipline_code: str
    pool_length: int
    points: int
    competition_location: str
    date_str: str
    split_time: bool
    relay_part: bool


def fetch_personal_bests(user_id: int):
    url = API_URL.format(user_id)
    header = HEADERS.copy()
    try:
        header["Referer"] = REFERER_URL.format(user_id)
        response = requests.get(url, timeout=5, headers=header)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to fetch for {user_id}: {e}")
        return []


def update_swimmer(swimmer_row: Swimmer, pb: PBEntry):
    swimmer_row.time = pb.time
    swimmer_row.points = pb.points
    swimmer_row.competition_location = pb.competition_location
    swimmer_row.date = datetime.fromisoformat(pb.date_str)
    swimmer_row.split_time = pb.split_time
    swimmer_row.relay_part = pb.relay_part


def sync_pbs(groups_to_update: list[str], csps_ids: list[int] | None = None):
    db: Session = SessionLocal()

    last_sync = db.query(ApiSync).first()

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

    disciplines = {d.code: d for d in db.query(Discipline).all()}

    courses = {c.length: c for c in db.query(Course).all()}

    swimmers = db.query(Swimmer).filter(combined_filter).distinct().all()

    for swimmer in swimmers:
        pb_data = fetch_personal_bests(swimmer.csps_id)

        for entry in pb_data:
            pb = PBEntry(
                time=entry.get("time"),
                discipline_code=entry.get("disciplineCode"),
                pool_length=entry.get("poolLength"),
                points=entry.get("points"),
                competition_location=entry.get("competitionLocation"),
                date_str=entry.get("date"),
                split_time=entry.get("splitTime"),
                relay_part=entry.get("relayPart"),
            )

            discipline = disciplines.get(pb.discipline_code)
            if not discipline:
                continue

            course = courses.get(pb.pool_length)
            if not course:
                continue

            swimmer_row = (
                db.query(PersonalBest)
                .filter_by(
                    swimmer_id=swimmer.id,
                    discipline_id=discipline.id,
                    course_id=course.id,
                )
                .first()
            )

            if swimmer_row:
                update_swimmer(swimmer_row, pb)
            else:
                db.add(
                    PersonalBest(
                        swimmer_id=swimmer.id,
                        time=pb.time,
                        discipline_id=discipline.id,
                        course_id=course.id,
                        points=pb.points,
                        competition_location=pb.competition_location,
                        date=datetime.fromisoformat(pb.date_str),
                        split_time=pb.split_time,
                        relay_part=pb.relay_part,
                    )
                )

        print(f"Synced PBs for {swimmer.name} {swimmer.surname}")
        wait_random()

    if last_sync:
        last_sync.personal_bests_last_fetch = datetime.now(timezone.utc)

    db.commit()
    db.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Sync personal bests from CSPS.")

    parser.add_argument(
        "--groups",
        type=str,
        help="List of swimmer groups, comma separated",
    )

    parser.add_argument(
        "--csps_ids",
        type=str,
        help="List of swimmer CSPS IDs, comma separated",
        default=None,
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.groups:
        args.groups = args.groups.split(",")
    else:
        args.groups = VALID_GROUPS

    if args.csps_ids:
        args.csps_ids = [int(sid) for sid in args.csps_ids.split(",")]
    sync_pbs(args.groups, args.csps_ids)
