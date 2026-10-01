"""
fetch_catalog.py — downloads Stanford's course catalog for one school year
from ExploreCourses (explorecourses.stanford.edu) and saves it into the app.

Run it from the degree-tracker folder (takes ~15-30 minutes, one department
at a time so we don't hammer Stanford's site):

    python3 scripts/fetch_catalog.py 20262027

It writes:
    data/courses.json       every course, WITHOUT descriptions (small, loads fast)
    data/desc/<SUBJ>.json   descriptions, one file per subject (loaded on demand)

Only uses Python's built-in libraries — nothing to install.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

YEAR = sys.argv[1] if len(sys.argv) > 1 else '20262027'
BASE = 'https://explorecourses.stanford.edu'
VIEW = 'xml-20140630'
OUT = Path(__file__).resolve().parent.parent / 'data'
PAUSE_SECONDS = 1.0  # be polite: wait between requests


def fetch(url):
    """Open a URL and return the response (retrying a few times on errors)."""
    for attempt in range(4):
        try:
            return urllib.request.urlopen(url, timeout=180)
        except Exception as error:
            print(f'   retrying after error: {error}')
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'Could not download {url}')


def list_departments():
    """Returns [(code, long name), ...] for every department."""
    root = ET.parse(fetch(f'{BASE}/?view={VIEW}')).getroot()
    return [(d.get('name'), d.get('longname')) for d in root.iter('department')]


def courses_for(dept):
    """Yields one dict per course in a department, reading the (large) XML
    piece by piece so we never hold all of it in memory."""
    query = urllib.parse.urlencode({
        'view': VIEW, 'academicYear': YEAR, 'page': 0, 'q': dept,
        f'filter-departmentcode-{dept}': 'on',
        'filter-coursestatus-Active': 'on',
    })
    for event, el in ET.iterparse(fetch(f'{BASE}/search?{query}'), events=('end',)):
        if el.tag != 'course':
            continue
        # Quarters it's actually scheduled this year, from its sections
        terms = sorted({
            s.findtext('term', '').replace(f'{YEAR[:4]}-{YEAR[4:]} ', '')
            for s in el.iterfind('sections/section')
        } - {''})
        # Quarters it's "typically offered" (catalog attribute NQTR)
        typical = [a.findtext('description') for a in el.iterfind('attributes/attribute')
                   if a.findtext('name') == 'NQTR']
        gers = [g.strip() for g in (el.findtext('gers') or '').split(',') if g.strip()]
        yield {
            'subject': el.findtext('subject', '').strip(),
            'code': el.findtext('code', '').strip(),
            'title': el.findtext('title', '').strip(),
            'unitsMin': int(el.findtext('unitsMin') or 0),
            'unitsMax': int(el.findtext('unitsMax') or 0),
            'gers': gers,
            'terms': terms or typical,
            'grading': el.findtext('grading', '').strip(),
            'career': el.findtext('administrativeInformation/academicCareer', '').strip(),
            'description': ' '.join((el.findtext('description') or '').split()),
        }
        el.clear()  # free memory


def main():
    departments = list_departments()
    print(f'{len(departments)} departments')
    courses, descriptions, seen = [], {}, set()

    for i, (dept, name) in enumerate(departments, 1):
        count = 0
        for c in courses_for(dept):
            key = f"{c['subject']} {c['code']}"
            if key in seen:  # cross-listed courses show up in several departments
                continue
            seen.add(key)
            descriptions.setdefault(c['subject'], {})[key] = c.pop('description')
            courses.append(c)
            count += 1
        print(f'[{i}/{len(departments)}] {dept}: {count} courses')
        time.sleep(PAUSE_SECONDS)

    courses.sort(key=lambda c: (c['subject'], c['code']))
    OUT.mkdir(exist_ok=True)
    (OUT / 'desc').mkdir(exist_ok=True)
    meta = {'academicYear': YEAR, 'source': 'Stanford ExploreCourses',
            'fetched': time.strftime('%Y-%m-%d'), 'count': len(courses)}
    with open(OUT / 'courses.json', 'w') as f:
        json.dump({'meta': meta, 'courses': courses}, f, separators=(',', ':'))
    for subject, items in descriptions.items():
        with open(OUT / 'desc' / f'{subject}.json', 'w') as f:
            json.dump(items, f, separators=(',', ':'))
    print(f'Done: {len(courses)} courses saved to {OUT}')


if __name__ == '__main__':
    main()
