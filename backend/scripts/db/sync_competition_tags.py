import argparse

import requests
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.links import COMPETITION_TAGS_API_URL, COMPETITIONS_REFERER_URL
from app.models import CompetitionTag
from scripts.config import HEADERS


def fetch_competition_tags() -> list[dict]:
    """
    Fetch all competition tags from CSPS API.

    Returns:
        List of competition tag dictionaries from the API
    """
    header = HEADERS.copy()
    header["Referer"] = COMPETITIONS_REFERER_URL

    try:
        print("Fetching competition tags from API...")
        response = requests.get(COMPETITION_TAGS_API_URL, timeout=10, headers=header)
        response.raise_for_status()
        tags = response.json()
        print(f"Found {len(tags)} competition tags")
        return tags
    except Exception as e:
        print(f"Failed to fetch competition tags: {e}")
        return []


def sync_competition_tags(create_tables: bool = False):
    """
    Sync competition tags from CSPS API to database.

    Args:
        create_tables: If True, creates tables before syncing
    """
    # Create tables if requested
    if create_tables:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created\n")

    db: Session = SessionLocal()

    try:
        tags_data = fetch_competition_tags()

        if not tags_data:
            print("No competition tags found to sync.")
            return

        synced_count = 0
        updated_count = 0

        for tag_data in tags_data:
            # Check if tag already exists
            tag = (
                db.query(CompetitionTag)
                .filter(
                    CompetitionTag.csps_competition_tag_id
                    == tag_data["competitionTagId"]
                )
                .first()
            )

            if not tag:
                # Create new tag
                tag = CompetitionTag(
                    csps_competition_tag_id=tag_data["competitionTagId"],
                    title=tag_data["title"],
                    key=tag_data["key"],
                )
                db.add(tag)
                print(f"  Added: {tag_data['title']} ({tag_data['key']})")
                synced_count += 1
            else:
                # Update existing tag (in case title or key changed)
                tag.title = tag_data["title"]
                tag.key = tag_data["key"]
                print(f"  Updated: {tag_data['title']} ({tag_data['key']})")
                updated_count += 1

        db.commit()
        print(
            f"\n✓ Successfully synced competition tags:"
            f"\n  - New: {synced_count}"
            f"\n  - Updated: {updated_count}"
            f"\n  - Total in database: {len(tags_data)}"
        )

    except Exception as e:
        print(f"Error during sync: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Sync competition tags from CSPS API to database"
    )

    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Create database tables before syncing",
        default=False,
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sync_competition_tags(args.create_tables)
