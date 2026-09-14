"""Build a flat, searchable village index from the per-state dataset files.

Reads data/villages/*.json (State -> Districts -> Sub-districts -> Villages)
and writes data/villages_index.json: a list of
"Village|District|SubDistrict|State" strings sorted by lowercase village
name, so the API can prefix-search it with a binary search.

Run once after (re)downloading data/villages/:
    python data/build_index.py
"""
import json
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(HERE, 'villages')
OUT_FILE = os.path.join(HERE, 'villages_index.json')


def main():
    rows = set()
    for path in sorted(glob.glob(os.path.join(SOURCE_DIR, '*.json'))):
        with open(path, encoding='utf-8') as f:
            state_data = json.load(f)
        state = state_data.get('state') or os.path.basename(path)[:-5]
        for district in state_data.get('districts', []):
            dname = district.get('district', '')
            for sub in district.get('subDistricts', []):
                sname = sub.get('subDistrict', '')
                for village in sub.get('villages', []):
                    if not isinstance(village, str):
                        continue
                    v = village.strip()
                    if v:
                        rows.add(f"{v}|{dname}|{sname}|{state}")

    index = sorted(rows, key=lambda r: r.split('|', 1)[0].lower())
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False)

    print(f"{len(rows):,} unique village rows -> {OUT_FILE} "
          f"({os.path.getsize(OUT_FILE) / 1e6:.1f} MB)")


if __name__ == '__main__':
    main()
