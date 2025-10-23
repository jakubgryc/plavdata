import argparse
import json
import random
import time
from dataclasses import dataclass, asdict
from pathlib import Path

import requests
import yaml
from bs4 import BeautifulSoup

from scripts.config import DATA_DIR, HEADERS

CSPS_QUERY = (
    "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/search?query="
)
CSPS_USER_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/"
PKBOH_URL = "https://www.plavanibohumin.cz/cz/treninky/rozdeleni-plavcu/"

RESULT_FILE = DATA_DIR / "swimmers.yml"
TARGET_CLUB = "PKBoh"


@dataclass
class Swimmer:
    csps_id: int
    name: str
    surname: str
    group: str
    birth_year: int
    sex: str
    membership_start: str | None
    membership_end: str | None


def fetch_swimmers_from_pkboh_site() -> list[dict]:
    response = requests.get(PKBOH_URL, headers=HEADERS)
    response.raise_for_status()

    soup = BeautifulSoup(response.content.decode("utf-8"), "html.parser")
    table = soup.find("tbody")
    all_swimmers = table.find_all("tr")
    swimmers = []

    for row in all_swimmers[1:]:
        swimmer_data = row.find_all("td")
        group = swimmer_data[2].text.strip()

        if group not in ["Z1", "Z2", "P1"]:
            continue

        surname = swimmer_data[0].text.strip()
        name = swimmer_data[1].text.strip()

        # manual correction of unusual name
        if surname == "Le Ngoc Nhi":
            name = "Khim Anna"

        swimmers.append(
            {
                "name": name,
                "surname": surname,
                "group": group,
            }
        )

    return swimmers


def wait_random():
    wait_time = random.uniform(0.2, 1)
    print(f"Waiting for {wait_time:.2f} seconds to avoid rate limiting...")
    time.sleep(wait_time)


def get_valid_pkboh_swimmer(result_query: list[dict]) -> dict | None:
    """

    Find the valid PKBoh swimmer from the CSPS search results if there are
    multiple swimmers with the same name.

    Args:
        result_query: List of swimmer data dictionaries from CSPS search results.

    Returns:
        The valid PKBoh swimmer data dictionary, or None if not found.
    """
    for swimmer_data in result_query:
        if swimmer_data.get("clubAbbrev") == TARGET_CLUB:
            return swimmer_data
    return None


def get_swimmer_profile(csps_id: int) -> dict | None:
    """

    Get the detailed swimmer profile from CSPS by CSPS ID.

    Args:
        csps_id: CSPS swimmer ID.

    Returns:
        Swimmer profile data dictionary, or None if not found.
    """
    response = requests.get(CSPS_USER_URL + str(csps_id), headers=HEADERS)
    if response.status_code != 200:
        print(
            f"Failed to fetch swimmer profile for CSPS ID {csps_id}: {response.status_code}"
        )
        return None
    return response.json()


def get_membership_dates(
    swimmer_profile_data: dict,
) -> tuple[str | None, str | None]:
    """

    Get the membership start and end dates (if any) for the duration of the swimmer's
    membership in PKBoh.

    Args:
        swimmer_profile_data: Parsed swimmer profile data from CSPS.

    Returns:
        Tuple of membership start and end dates or None if not found.
    """
    club_history = swimmer_profile_data.get("membershipHistory")
    for membership in club_history:
        if membership.get("clubAbbrev") == TARGET_CLUB:
            membership_start_str = membership.get("membershipStart")
            membership_end_str = membership.get("membershipEnd", None)
            return membership_start_str, membership_end_str

    return None, None


def parse_swimmer_data(
    swimmer: dict,
    swimmer_profile_data: dict,
    group: str,
) -> Swimmer:
    """

    Get the swimmer data from CSPS profile and parse it into Swimmer dataclass.

    Args:
        swimmer: Swimmer basic data dictionary.
        swimmer_profile_data: Parsed swimmer profile data from CSPS.
        group : Swimmer group.

    Returns:
        Swimmer dataclass instance with parsed data.
    """
    membership_start, membership_end = get_membership_dates(swimmer_profile_data)
    return Swimmer(
        csps_id=swimmer_profile_data.get("userId"),
        name=swimmer["name"],
        surname=swimmer["surname"],
        group=group,
        sex=swimmer_profile_data.get("sex").lower(),
        birth_year=swimmer_profile_data.get("birthYear"),
        membership_start=membership_start,
        membership_end=membership_end,
    )


def fetch_valid_swimmer_id_from_csps(swimmer: dict) -> int | None:
    """

    Look up the swimmer in CSPS by name and surname, and return the valid CSPS ID.

    Args:
        swimmer: Swimmer basic data dictionary.

    Returns:
        CSPS swimmer ID, or None if not found.
    """
    query = (
        f"{swimmer['surname'].replace(' ', '+')}+{swimmer['name'].replace(' ', '+')}"
    )
    response = requests.get(CSPS_QUERY + query, headers=HEADERS)
    if response.status_code != 200:
        print(
            f"Failed to fetch CSPS data for swimmer {swimmer['name']} {swimmer['surname']}: {response.status_code}"
        )
        return None

    results = response.json()

    valid_swimmer_data = get_valid_pkboh_swimmer(results)
    if not valid_swimmer_data:
        print(
            f"Swimmer {swimmer['name']} {swimmer['surname']} not found in CSPS results."
        )
        wait_random()
        return None

    csps_id = valid_swimmer_data.get("userId")
    return csps_id


def fetch_and_save_swimmers_data(
    swimmers: list[dict] | None,
    parsed_swimmers: list[Swimmer],
    inactive: bool,
) -> None:
    if not swimmers:
        return

    group = "former" if inactive else "veteran"
    for swimmer in swimmers:
        if inactive:
            csps_id = swimmer.get("csps_id")
        else:
            csps_id = fetch_valid_swimmer_id_from_csps(swimmer)
        swimmer_profile_data = get_swimmer_profile(csps_id)

        if not swimmer_profile_data:
            wait_random()
            continue

        swimmer_group = swimmer.get("group", group)
        swimmer_data = parse_swimmer_data(swimmer, swimmer_profile_data, swimmer_group)
        parsed_swimmers.append(swimmer_data)
        print(
            f"Parsed {'inactive' if inactive else 'active'} swimmer: {swimmer_data.name} {swimmer_data.surname}, CSPS ID: {swimmer_data.csps_id}"
        )
        wait_random()


def parse_data_from_csps(
    active_swimmers: list[dict],
    former_swimmers: dict | None = None,
) -> list[Swimmer]:
    """

    Main function to parse swimmer data from CSPS.

    Args:
        active_swimmers: Active swimmers list of dictionaries from PKBoh site.
        former_swimmers: Former swimmers data dictionary from YAML file, either
            active in the CSPS system or inactive

    Returns:
        List of Swimmer dataclass instances with parsed data.
    """
    parsed_swimmers: list[Swimmer] = []

    if former_swimmers:
        active_swimmers.extend(former_swimmers.get("active", []))

    fetch_and_save_swimmers_data(active_swimmers, parsed_swimmers, inactive=False)

    inactive_swimmers = former_swimmers.get("inactive", []) if former_swimmers else []

    # update manually the group for former (but still active in the CSPS system) swimmers to 'veteran'
    if inactive_swimmers:
        for swimmer in inactive_swimmers:
            swimmer["group"] = "veteran"

    runaway_swimmers = former_swimmers.get("runaway", []) if former_swimmers else []

    runaway_inactive_swimmers: list[dict] = []
    runaway_active_swimmers: list[dict] = []

    if runaway_swimmers:
        runaway_inactive_swimmers = runaway_swimmers.get("inactive", [])
        runaway_active_swimmers = runaway_swimmers.get("active", [])

    all_inactive_swimmers = (
        inactive_swimmers + runaway_inactive_swimmers + runaway_active_swimmers
    )

    fetch_and_save_swimmers_data(all_inactive_swimmers, parsed_swimmers, inactive=True)

    return parsed_swimmers


def load_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_json(data: dict, path: Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def parse_pkboh_swimmers(
    former_swimmers_path: Path | None = None, output_path: Path = RESULT_FILE
):
    """

    Main function to parse PKBoh swimmers from the club website and save to output file.

    Args:
        former_swimmers_path: Path to the YAML file containing former swimmers.
        output_path: Path to the output JSON file to save parsed swimmer data.
    """
    active_swimmers = fetch_swimmers_from_pkboh_site()

    former_swimmers = None
    if former_swimmers_path and former_swimmers_path.exists():
        former_swimmers = load_yaml(former_swimmers_path)

    parsed_data_from_csps = parse_data_from_csps(active_swimmers, former_swimmers)

    save_json(
        [asdict(swimmer) for swimmer in parsed_data_from_csps],
        output_path,
    )


def parse_args():
    parser = argparse.ArgumentParser(
        description="Parse PKBoh swimmers from the club website."
    )

    parser.add_argument(
        "--former",
        type=Path,
        help="Path to the YAML file containing former swimmers.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=RESULT_FILE,
        help="Path to the output JSON file.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    parse_pkboh_swimmers(args.former, args.output)
