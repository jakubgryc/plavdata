"""
This script parses all PKBoh swimmers IDs and names that have ever swam for PKBoh
It parses all results swam in 50 freestyle on short course, because almost everybody
that has ever swam has swam this event at least once.

The script ignores already existing swimmers in the database

The parsed swimmers are stored in a list of dataclass SwimmerEntry. This data is further used
to fetch detailed swimmer profiles which are stored in output JSON file for further processing into the database.

"""

import json
from pathlib import Path
import requests

from sqlalchemy.orm import Session

from dataclasses import dataclass, asdict


from app.db import SessionLocal
from app.models import Swimmer
from scripts.config import DATA_DIR, HEADERS
from scripts.utils import wait_random
from scripts.parse.utils import get_swimmer_profile, parse_swimmer_data


SWIMMERS_FILE = DATA_DIR / "all_pkboh_swimmers.yaml"

QUERY_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/statistics?clubAbbrevs=PKBoh&disciplineAbbrev=50+K&endDate=2025-12-31&gender={}&masters=false&mastersAgeGroupId=25-29&onlyBestResults=true&page={}&perPage={}&poolLength=25&startDate=1999-01-01&statisticAgeGroupId=1"
REFERER_URL = "https://vysledky.czechswimming.cz/statistiky?page=1&onlyBestResults&statisticAgeGroupId=1&mastersAgeGroupId=25-29&clubs=PKBoh&gender={}&disciplines=50%20K&poolLength=25&splitTimes=all&relayParts=all&startDate=1999-01-01&endDate=2025-12-31"


@dataclass
class SwimmerEntry:
    csps_id: int
    name: str
    surname: str


def get_existing_swimmers(db: Session) -> set[int]:
    return {swimmer.csps_id for swimmer in db.query(Swimmer).all()}


def parse_page_resutlts(
    results: list[dict], existing_csps_ids: set[int], all_swimmers: list[SwimmerEntry]
) -> None:
    for entry in results:
        csps_id = entry.get("userId")
        if csps_id in existing_csps_ids:
            continue

        name = entry.get("firstName", "").strip()
        surname = entry.get("lastName", "").strip().capitalize()

        swimmer_entry = SwimmerEntry(
            csps_id=csps_id,
            name=name,
            surname=surname,
        )
        all_swimmers.append(swimmer_entry)


def parse_all_swimmers() -> list[SwimmerEntry]:
    db: Session = SessionLocal()

    page_size = 50

    existing_csps_ids = get_existing_swimmers(db)

    headers = HEADERS.copy()
    all_swimmers: list[SwimmerEntry] = []

    for sex in ["MALE", "FEMALE"]:
        page = 1
        while True:
            url = QUERY_URL.format(sex, page, page_size)
            try:
                headers["Referer"] = REFERER_URL.format(sex)
                response = requests.get(url, timeout=5, headers=headers)
                response.raise_for_status()
                data = response.json()

                results = data.get("publicStatisticDtos", [])
                total = data.get("numberOfResults", 0)

                parse_page_resutlts(results, existing_csps_ids, all_swimmers)
                if (page * page_size) >= total:
                    wait_random(1, 2)
                    break

                page += 1
                wait_random(1, 2)
            except Exception as e:
                print(f"Failed to fetch page {page} for {sex}: {e}")

    print(
        f"Finished parsing all swimmers. Total new swimmers found: {len(all_swimmers)}"
    )
    return all_swimmers


def process_all_swimmers(all_swimmers: list[SwimmerEntry]) -> list[dict]:
    """

    This function processes all swimmers, fetches their profiles, and saves them to the output file.
    It utilizes existing functions from the utils module to fetch and parse swimmer profiles.

    Args:
        all_swimmers: List of SwimmerEntry dataclass instances.
        output_file: Path to the output JSON file.
    """
    swimmer_profiles = []
    for swimmer in all_swimmers:
        print(
            f"Processing swimmer {swimmer.csps_id} - {swimmer.name} {swimmer.surname}"
        )
        swimmer_profile_data = get_swimmer_profile(swimmer.csps_id)
        if swimmer_profile_data is None:
            print(f"Skipping swimmer {swimmer.csps_id} due to missing profile data.")
            continue

        parsed_swimmer = parse_swimmer_data(
            swimmer=asdict(swimmer),
            swimmer_profile_data=swimmer_profile_data,
            group="former",
        )
        swimmer_profiles.append(asdict(parsed_swimmer))
        wait_random(0.5, 1.5)

    return swimmer_profiles


def main(output_file: Path | None = None):
    all_former_swimmers = parse_all_swimmers()

    all_swimmer_profiles = process_all_swimmers(all_former_swimmers)
    output_file = DATA_DIR / "all_pkboh_swimmer_profiles.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_swimmer_profiles, f, ensure_ascii=False, indent=4)


if __name__ == "__main__":
    main()
