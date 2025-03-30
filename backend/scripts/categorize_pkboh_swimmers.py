import sys
import json
import requests
from bs4 import BeautifulSoup

from typing import Any

from .config import DATA_DIR, HEADERS

URL = "https://www.plavanibohumin.cz/cz/treninky/rozdeleni-plavcu/"
PKBOH_SWIMMERS = DATA_DIR / "pkboh_swimmers.json"
RESULT_FILE = DATA_DIR / "pkboh_automatically_categorized.json"


class Swimmer:
    name: str
    surname: str
    id: int
    group: str
    birth_year: int

    def __init__(self, name, surname, group):
        self.name = name
        self.surname = surname
        self.group = group

    def __str__(self):
        return f"{self.name} {self.surname} ({self.group})"

    def __eq__(self, other):
        return (
            True
            if self.name.lower() == other.name.lower()
            and self.surname.lower() == other.surname.lower()
            else False
        )

    def add_data(self, id, birth_year):
        self.id = id
        self.birth_year = birth_year


def fetch_pkboh_table():
    html = requests.get(URL, headers=HEADERS).content.decode("utf-8")
    soup = BeautifulSoup(html, "lxml")

    return soup.find("tbody")


def check_swimmer_group(swimmer_data: list[Any], swimmers_current: list[Any]) -> bool:
    for s in swimmers_current:
        if (
            s.name.lower() == swimmer_data["firstName"].lower()
            and s.surname.lower() == swimmer_data["lastName"].lower()
        ):
            return s.group
    # s["group"] = swimmer.group if found else "unassigned"
    return "unassigned"


def categorize(swimmers: list[str]):
    with open(PKBOH_SWIMMERS, "r") as file:
        swimmers_open_data = json.load(file)

    for current_swimmer in swimmers_open_data:
        group = check_swimmer_group(current_swimmer, swimmers)
        current_swimmer["group"] = group

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
