import requests

from scripts.config import HEADERS
from scripts.utils import SwimmerData

CSPS_USER_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/"
REFERER_URL = "https://vysledky.czechswimming.cz/lide/{}"
TARGET_CLUB = "PKBoh"

def get_swimmer_profile(csps_id: int) -> dict | None:
    """

    Get the detailed swimmer profile from CSPS by CSPS ID.

    Args:
        csps_id: CSPS swimmer ID.

    Returns:
        Swimmer profile data dictionary, or None if not found.
    """
    headers = HEADERS.copy()
    headers["Referer"] = REFERER_URL.format(csps_id)
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
    runaway = False
    if len(club_history) > 1:
        runaway = True
    for membership in club_history:
        if membership.get("clubAbbrev") == TARGET_CLUB:
            membership_start_str = membership.get("membershipStart")
            membership_end_str = membership.get("membershipEnd", None)
            return membership_start_str, membership_end_str, runaway

    return None, None, runaway

def parse_swimmer_data(
    swimmer: dict,
    swimmer_profile_data: dict,
    group: str,
) -> SwimmerData:
    """

    Get the swimmer data from CSPS profile and parse it into SwimmerData dataclass.

    Args:
        swimmer: Swimmer basic data dictionary.
        swimmer_profile_data: Parsed swimmer profile data from CSPS.
        group : Swimmer group.

    Returns:
        SwimmerData dataclass instance with parsed data.
    """
    membership_start, membership_end, runaway = get_membership_dates(swimmer_profile_data)
    group = "runaway" if runaway else group
    return SwimmerData(
        csps_id=swimmer_profile_data.get("userId"),
        name=swimmer["name"],
        surname=swimmer["surname"],
        group=group,
        sex=swimmer_profile_data.get("sex").lower(),
        birth_year=swimmer_profile_data.get("birthYear"),
        membership_start=membership_start,
        membership_end=membership_end,
    )
