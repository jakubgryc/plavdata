import json
import requests

from .config import DATA_DIR, HEADERS

URL = (
    "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/search?query="
)

RESULT_FILE = DATA_DIR / "all_swimmers.json"


def get_all_swimmers():
    print("Downloading all swimmers data")
    response = requests.get(URL, headers=HEADERS)

    if response.status_code != 200:
        print("Could not download all swimmer data")
        return

    with open(f"{DATA_DIR}/all_swimmers.json", "w") as file:
        json.dump(response.json(), file, ensure_ascii=False, indent=4)

    print("✅ Swimmers data downloaded and saved.")


if __name__ == "__main__":
    get_all_swimmers()
