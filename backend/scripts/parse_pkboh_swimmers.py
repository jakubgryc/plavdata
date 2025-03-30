import json

from .config import DATA_DIR

ALL_SWIMMERS_FILE = DATA_DIR / "all_swimmers.json"
RESULT_FILE = DATA_DIR / "pkboh_swimmers.json"
TARGET_CLUB = "PKBoh"


def parse_pkboh_swimmers():
    if not ALL_SWIMMERS_FILE.exists():
        print(f"⚠️  Input file not found: {ALL_SWIMMERS_FILE}")
        return

    with open(ALL_SWIMMERS_FILE, "r") as file:
        all_swimmers = json.load(file)

    pkboh_swimmers = [
        swimmer for swimmer in all_swimmers if swimmer["clubAbbrev"] == TARGET_CLUB
    ]

    with open(RESULT_FILE, "w", encoding="utf-8") as file:
        json.dump(pkboh_swimmers, file, ensure_ascii=False, indent=4)

    print(f"✅ Saved {len(pkboh_swimmers)} swimmers from club {TARGET_CLUB}.")


if __name__ == "__main__":
    parse_pkboh_swimmers()
