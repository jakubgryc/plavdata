import asyncio
import argparse
from datetime import date, datetime

import requests
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.links import COMPETITIONS_API_URL, COMPETITIONS_REFERER_URL
from app.models import Competition, CompetitionTag
from scripts.config import HEADERS
from scripts.utils import wait_random

# Earliest year to fetch competitions from
EARLIEST_COMPETITION_YEAR = 2002


def fetch_competitions(year: int) -> list[dict]:
    """
    Fetch competitions from CSPS API for a given year.

    Args:
        year: Year to fetch competitions for (e.g., 2025)

    Returns:
        List of competition dictionaries from the API
    """
    url = COMPETITIONS_API_URL.format(year)
    header = HEADERS.copy()
    header["Referer"] = COMPETITIONS_REFERER_URL

    try:
        print(f"Fetching competitions for year {year}...")
        response = requests.get(url, timeout=10, headers=header)
        response.raise_for_status()
        competitions = response.json()
        print(f"Found {len(competitions)} competitions for {year}")
        return competitions
    except Exception as e:
        print(f"Failed to fetch competitions for {year}: {e}")
        return []


def filter_competitions_from_month(
    competitions: list[dict], year: int, month_from: int
) -> list[dict]:
    """
    Filter competitions to only those ending on or after the first day of the
    given month. Uses endDate so that multi-day competitions spanning the
    cutoff (e.g., Aug 31 - Sep 1) are included.

    Args:
        competitions: List of competition dictionaries from the API
        year: Year the competitions belong to
        month_from: First month to include (1-12)

    Returns:
        Filtered list of competition dictionaries
    """
    cutoff = date(year, month_from, 1)
    return [
        c for c in competitions if datetime.fromisoformat(c["endDate"]).date() >= cutoff
    ]


def get_tag(db: Session, tag_data: dict) -> type[CompetitionTag]:
    """
    Get existing tag from database.

    Args:
        db: Database session
        tag_data: Tag data from API (competitionTagId, title, key)

    Returns:
        CompetitionTag instance

    Raises:
        ValueError: If tag doesn't exist in database
    """
    tag = (
        db.query(CompetitionTag)
        .filter(CompetitionTag.csps_competition_tag_id == tag_data["competitionTagId"])
        .first()
    )

    if not tag:
        raise ValueError(
            f"Tag '{tag_data['title']}' (ID: {tag_data['competitionTagId']}) not found in database. "
            f"Please run 'python scripts/db/sync_competition_tags.py' first."
        )

    return tag


def store_competition(db: Session, comp_data: dict):
    """
    Store or update a competition in the database.

    Args:
        db: Database session
        comp_data: Competition data from API

    Returns:
        Competition instance
    """
    # Check if competition already exists
    competition = (
        db.query(Competition)
        .filter(Competition.csps_competition_id == comp_data["competitionId"])
        .first()
    )

    is_new = competition is None
    if is_new:
        competition = Competition(csps_competition_id=comp_data["competitionId"])
        db.add(competition)

    # Update competition fields
    competition.title = comp_data["title"]
    competition.description = comp_data.get("description")
    competition.sport = comp_data.get("sport")
    competition.start_date = datetime.fromisoformat(comp_data["startDate"]).date()
    competition.end_date = datetime.fromisoformat(comp_data["endDate"]).date()
    competition.location = comp_data.get("location")
    competition.location_region = comp_data.get("locationRegion")
    competition.club_id = comp_data.get("clubId")
    competition.competition_state = comp_data.get("competitionState")
    competition.pool_length = comp_data.get("poolLength")
    competition.has_plan = comp_data.get("hasPlan", False)
    competition.has_results = comp_data.get("hasResults", False)
    competition.plan_file_name = comp_data.get("planFileName")
    competition.results_file_name = comp_data.get("resultsFileName")
    competition.stopwatch_type = comp_data.get("stopwatchType")
    competition.elapsed = comp_data.get("elapsed", False)
    competition.irregular_pool = comp_data.get("irregularPool", False)
    competition.masters = comp_data.get("masters", False)

    # Handle tags (many-to-many relationship)
    tags = []
    for tag_data in comp_data.get("competitionTags", []):
        tag = get_tag(db, tag_data)
        tags.append(tag)

    competition.tags = tags  # Will be empty list if no tags

    action = "Added" if is_new else "Updated"
    print(
        f"{action}: {competition.title} ({competition.location}) - {competition.start_date}"
    )


def sync_competitions(
    year: int = None, month_from: int = None, create_tables: bool = False
):
    """
    Sync competitions from CSPS API to database.

    Args:
        year: Year to sync. If None, syncs all years from EARLIEST_COMPETITION_YEAR to current year.
        month_from: If set (together with year), only store competitions ending
            on or after the first day of this month (1-12). Ignored when year is None.
        create_tables: If True, creates tables before syncing
    """
    # Create tables if requested
    if create_tables:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created\n")

    if month_from is not None and year is None:
        print("Note: --month is ignored when no specific year is given.")
        month_from = None

    db: Session = SessionLocal()

    try:
        if year is None:
            current_year = datetime.now().year
            years_to_sync = list(range(EARLIEST_COMPETITION_YEAR, current_year + 1))
            print(
                f"=== Syncing Competitions ===\nNo year specified - syncing all years from {EARLIEST_COMPETITION_YEAR} to {current_year}\n"
            )
        else:
            years_to_sync = [year]
            suffix = f" (from month {month_from})" if month_from else ""
            print(f"=== Syncing Competitions ===\nSyncing year {year}{suffix}\n")

        total_competitions = 0

        for year_to_sync in years_to_sync:
            competitions_data = fetch_competitions(year_to_sync)

            if not competitions_data:
                print(f"No competitions found for {year_to_sync}")
                continue

            if month_from is not None:
                fetched_count = len(competitions_data)
                competitions_data = filter_competitions_from_month(
                    competitions_data, year_to_sync, month_from
                )
                print(
                    f"Filtering: {len(competitions_data)}/{fetched_count} competitions "
                    f"end on or after {year_to_sync}-{month_from:02d}-01"
                )

            for comp_data in competitions_data:
                store_competition(db, comp_data)

            total_competitions += len(competitions_data)
            db.commit()
            print(
                f"✓ Synced {len(competitions_data)} competitions for {year_to_sync}\n"
            )
            wait_random(0.4, 0.8)

        print(f"\n✓ Successfully synced {total_competitions} total competitions")

        return total_competitions

    except Exception as e:
        print(f"Error during sync: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def sync_competitions_generator(
    year: int | None = None, month_from: int | None = None
):
    """
    Async generator that wraps the sync logic to yield live updates for SSE.
    """
    yield {
        "status": "syncing",
        "synced_count": 0,
        "message": "Příprava synchronizace závodů...",
    }

    if year is None:
        current_year = datetime.now().year
        years_to_sync = list(range(EARLIEST_COMPETITION_YEAR, current_year + 1))
        month_from = None  # month filter only applies to a single year
    else:
        years_to_sync = [year]

    total_added = 0

    for y in years_to_sync:
        month_suffix = f" (od {month_from}. měsíce)" if month_from else ""
        yield {
            "status": "syncing",
            "synced_count": total_added,
            "message": f"Stahuji závody pro rok {y}{month_suffix}...",
        }

        try:
            added = await asyncio.to_thread(sync_competitions, y, month_from, False)
            total_added += added
            await asyncio.sleep(0.5)
        except Exception as e:
            yield {
                "status": "error",
                "synced_count": total_added,
                "message": f"Chyba u roku {y}: {str(e)}",
            }
            return

    yield {
        "status": "success",
        "synced_count": total_added,
        "message": f"Dokončeno. Celkem uloženo/aktualizováno {total_added} závodů.",
    }


def parse_args():
    parser = argparse.ArgumentParser(
        description="Sync competitions from CSPS API to database"
    )

    parser.add_argument(
        "--year",
        type=int,
        help=f"Year of the competitions to sync (default: all years from {EARLIEST_COMPETITION_YEAR} to current)",
        default=None,
    )

    parser.add_argument(
        "--month",
        type=int,
        choices=range(1, 13),
        metavar="{1..12}",
        help="Only sync competitions ending on or after the first day of this month (requires --year)",
        default=None,
    )

    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Create database tables before syncing",
        default=False,
    )

    args = parser.parse_args()
    if args.month is not None and args.year is None:
        parser.error("--month requires --year")
    return args


if __name__ == "__main__":
    args = parse_args()
    sync_competitions(args.year, args.month, args.create_tables)
