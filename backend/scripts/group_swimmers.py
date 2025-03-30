import sys
import json

from .config import DATA_DIR

PKBOH_SWIMMERS = DATA_DIR / "pkboh_automatically_categorized.json"
RESULT_FILE = DATA_DIR / "pkboh_grouped.json"


def group_swimmers():
    with open(PKBOH_SWIMMERS, "r", encoding="utf-8") as file:
        swimmers = json.load(file)

    grouped = {}

    for swimmer in swimmers:
        group = swimmer.get("group")
        grouped.setdefault(group, []).append(swimmer)

    with open(RESULT_FILE, "w", encoding="utf-8") as file:
        json.dump(grouped, file, ensure_ascii=False, indent=4)
    print(f"✅ Grouped swimmers into {RESULT_FILE}.")


if __name__ == "__main__":
    if not PKBOH_SWIMMERS.exists():
        print(f"⚠️  Input file not found: {PKBOH_SWIMMERS}")
        sys.exit(0)
    group_swimmers()
