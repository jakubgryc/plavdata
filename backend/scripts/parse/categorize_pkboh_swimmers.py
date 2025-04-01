import json
import sys
import requests
from bs4 import BeautifulSoup

from typing import Any

from scripts.config import DATA_DIR, HEADERS

URL = "https://www.plavanibohumin.cz/cz/treninky/rozdeleni-plavcu/"
PKBOH_SWIMMERS = DATA_DIR / "pkboh_swimmers.json"
RESULT_FILE = DATA_DIR / "pkboh_automatically_categorized.json"


class Swimmer:
    """


    Attributes:
        name: [TODO:description]
        surname: [TODO:description]
        id: [TODO:description]
        group: [TODO:description]
        birth_year: [TODO:description]
        gender: [TODO:description]
    """

    name: str
    surname: str
    id: int
    group: str
    birth_year: int
    gender: str

    def __init__(self, name, surname, group):
        self.name = name
        self.surname = surname
        self.group = group

    def add_data(self, id, birth_year):
        self.id = id
        self.birth_year = birth_year


def fetch_pkboh_table():
    """[TODO:summary]

    [TODO:description]
    """
    html = requests.get(URL, headers=HEADERS).content.decode("utf-8")
    soup = BeautifulSoup(html, "lxml")

    return soup.find("tbody")


def check_swimmer_group(
    swimmer_data: dict[str, Any], swimmers_current: list[dict[str, Any]]
) -> str | None:
    """

    Checks if the swimmer is in the current list of swimmers and returns their group.

    Args:
        swimmer_data: Dictionary containing swimmer data
        swimmers_current: List of objects of current swimmers

    Returns:
        Group of the swimmer if found, otherwise None
    """
    for s in swimmers_current:
        if (
            s.name.lower() == swimmer_data["firstName"].lower()
            and s.surname.lower() == swimmer_data["lastName"].lower()
        ):
            return s.group
    return None


def categorize(swimmers: list[str]):
    """[TODO:summary]

    [TODO:description]

    Args:
        swimmers: [TODO:description]
    """
    with open(PKBOH_SWIMMERS, "r") as file:
        swimmers_open_data = json.load(file)

    for current_swimmer in swimmers_open_data:
        group = check_swimmer_group(current_swimmer, swimmers)
        current_swimmer["group"] = group

        gender = "Z" if current_swimmer["lastName"][-1] == "Á" else "M"
        current_swimmer["gender"] = gender

    return swimmers_open_data


def fetch_and_categorize():
    table = fetch_pkboh_table()
    all_swimmers = table.find_all("tr")

    all_swimmers_list = []

    for row in all_swimmers[1:]:
        swimmer = row.find_all("td")
        swimmer_surname = swimmer[0].text.strip()
        swimmer_name = swimmer[1].text.strip()
        swimmer_group = swimmer[2].text.strip()
        new_swimmer = Swimmer(swimmer_name, swimmer_surname, swimmer_group)

        all_swimmers_list.append(new_swimmer)

    res = categorize(all_swimmers_list)

    with open(RESULT_FILE, "w", encoding="utf-8") as file:
        json.dump(res, file, ensure_ascii=False, indent=4)

    print(f"✅ Saved {len(res)} swimmers.")


if __name__ == "__main__":
    if not PKBOH_SWIMMERS.exists():
        print(f"⚠️  Input file not found: {PKBOH_SWIMMERS}")
        sys.exit(0)
    fetch_and_categorize()
