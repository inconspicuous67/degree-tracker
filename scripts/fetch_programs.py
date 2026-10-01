"""
fetch_programs.py — downloads the requirements for every Stanford undergraduate
major and minor from the Stanford Bulletin (bulletin.stanford.edu), and turns
them into a checklist the app understands.

Run it AFTER fetch_catalog.py (it needs data/courses.json to turn the
Bulletin's course ids into course codes like "ME 80"):

    python3 scripts/fetch_programs.py 2026

It writes data/programs.json.

HOW THE BULLETIN DESCRIBES REQUIREMENTS
Each program has blocks ("School Requirements", "Core Program Requirements"…).
Each block has rules, and a rule is one of:
    completedAllOf      take ALL of these courses
    completedAnyOf      take ANY ONE of these courses
    completedAtLeastXOf take at least X of these courses
    minimumCredits      earn at least N units from these courses
    completeVariable…   take at least X courses AND N units from these
    allOf / anyOf       a group of smaller rules (all of them / any one)
    freeformText etc.   written rules the app can't check automatically
A course list entry like ["2023541", "2023542"] with logic "or" means
"either of these cross-listed numbers" (e.g. CME 100 or ENGR 154).
"""

import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

YEAR = sys.argv[1] if len(sys.argv) > 1 else '2026'
EFFECTIVE = f'{YEAR}-08-01'  # Bulletin versions start each August
API = 'https://app.coursedog.com/api/v1/cm/stanford'
CATALOG_ID = 's1KuGHRiFO9tNyicMDbi'
HEADERS = {'Origin': 'https://bulletin.stanford.edu',
           'Referer': 'https://bulletin.stanford.edu/',
           'Content-Type': 'application/json'}
DATA = Path(__file__).resolve().parent.parent / 'data'

# Undergraduate degrees we include, and how the app labels them
KINDS = {'BS': 'major', 'BA': 'major', 'BAS': 'major', 'MIN': 'minor'}


def request(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method='POST' if data else 'GET')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                return json.load(response)
        except Exception as error:
            print(f'   retrying after error: {error}')
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'Could not download {url}')


def all_program_codes():
    """Every program code in the Bulletin, e.g. 'ME-BS', 'CS-MIN'."""
    codes = set()
    for skip in range(0, 5000, 500):
        url = (f'{API}/programs/search/%24filters?catalogId={CATALOG_ID}&sortBy=code'
               f'&effectiveDatesRange={EFFECTIVE}%2C{EFFECTIVE}&limit=500&skip={skip}&columns=code')
        page = request(url, {'condition': 'AND', 'filters': []})
        codes.update(p['code'] for p in page['data'])
        if skip + 500 >= page['listLength']:
            break
        time.sleep(1)
    return sorted(codes)


def fetch_programs(codes):
    """Full details (including requirements) for the version in effect this year."""
    programs = {}
    for i in range(0, len(codes), 20):
        batch = ','.join(codes[i:i + 20])
        result = request(f'{API}/programs?programGroupIds={batch}'
                         f'&effectiveDatesRange={EFFECTIVE},{EFFECTIVE}')
        programs.update({p['programGroupId']: p for p in result.values()})
        print(f'   programs {i + 1}-{min(i + 20, len(codes))} of {len(codes)}')
        time.sleep(1)
    return programs


# ---------- Converting Bulletin rules into the app's simpler format ----------

def load_course_ids():
    catalog = json.load(open(DATA / 'courses.json'))['courses']
    return {c['id']: f"{c['subject']} {c['code']}" for c in catalog if c.get('id')}


class Converter:
    def __init__(self, id_to_code):
        self.id_to_code = id_to_code
        self.unknown = set()

    def code(self, course_id):
        if course_id in self.id_to_code:
            return self.id_to_code[course_id]
        self.unknown.add(course_id)
        return None

    def clean(self, text):
        """HTML notes → plain text. Course links become their course codes."""
        if not text:
            return ''
        text = re.sub(r'<a[^>]*data-course-id="(\d+)"[^>]*>.*?</a>',
                      lambda m: self.code(m.group(1)) or 'a course', text)
        text = re.sub(r'</p>|<br\s*/?>|</li>', '\n', text)
        text = re.sub(r'<li[^>]*>', '• ', text)
        text = html.unescape(re.sub(r'<[^>]+>', '', text))
        return re.sub(r'\n\s*\n+', '\n', text).strip()

    def options(self, value):
        """Course list → [ { codes: [...], all: bool } ].
        all=False: any one of the codes (cross-listed numbers).
        all=True:  every code is needed (e.g. a two-quarter sequence)."""
        out = []
        for entry in (value or {}).get('values', []) if isinstance(value, dict) else []:
            ids = entry.get('value') if isinstance(entry.get('value'), list) else []
            codes = [c for c in (self.code(i) for i in ids) if c]
            if codes:
                out.append({'codes': codes, 'all': entry.get('logic') == 'and' and len(codes) > 1})
        return out

    def rule(self, r):
        c = r.get('condition')
        base = {'name': (r.get('name') or '').strip(),
                'notes': self.clean(r.get('notes') or r.get('description'))}
        value = r.get('value') if isinstance(r.get('value'), dict) else {}
        has_courses = value.get('condition') == 'courses'

        if c in ('allOf', 'anyOf'):
            children = [self.rule(s) for s in r.get('subRules') or []]
            return {**base, 'type': 'group', 'mode': 'all' if c == 'allOf' else 'any', 'rules': children}
        if has_courses and c in ('completedAllOf', 'minimumGrade'):
            return {**base, 'type': 'courses', 'mode': 'all', 'options': self.options(value),
                    **({'minGrade': r.get('grade')} if c == 'minimumGrade' else {})}
        if has_courses and c in ('completedAnyOf', 'enrolledIn'):
            return {**base, 'type': 'courses', 'mode': 'count', 'count': 1, 'options': self.options(value)}
        if has_courses and c == 'completedAtLeastXOf':
            return {**base, 'type': 'courses', 'mode': 'count', 'count': int(r.get('restriction') or 1),
                    'options': self.options(value)}
        if has_courses and c == 'minimumCredits':
            return {**base, 'type': 'courses', 'mode': 'units', 'units': float(r.get('credits') or 0),
                    'options': self.options(value)}
        if has_courses and c == 'completeVariableCoursesAndVariableCredits':
            return {**base, 'type': 'courses', 'mode': 'count', 'count': int(r.get('minCourses') or 1),
                    'units': float(r.get('minCredits') or 0), 'options': self.options(value)}
        # Anything else is a written rule the app can't check automatically
        return {**base, 'type': 'manual'}


def convert(program, conv):
    code = program['programGroupId']
    degree = code.rsplit('-', 1)[1]
    blocks = []
    for block in (program.get('requisites') or {}).get('requisitesSimple') or []:
        if not block.get('rules'):
            continue  # empty heading
        name = block.get('name') or ''
        blocks.append({
            'name': name,
            # Honors blocks are optional — shown, but not counted in your progress
            'optional': 'honor' in name.lower(),
            # Some blocks (e.g. ME's "Depth in Discipline") are in the official
            # data but hidden on the Bulletin website. We keep them and flag them.
            'hiddenInBulletin': block.get('showInCatalog') is False,
            'rules': [conv.rule(r) for r in block.get('rules') or []],
        })
    long_name = (program.get('diplomaDescription') or program.get('transcriptDescription')
                 or program.get('longName') or code)
    return {
        'code': code,
        'name': re.sub(r'\s*\((BS|BA|BAS|Min|Minor)\)\s*$', '', long_name).strip(),
        'degree': 'Minor' if degree == 'MIN' else degree,
        'kind': KINDS[degree],
        'unitsMin': program.get('unitsProgramMin'),
        'url': f'https://bulletin.stanford.edu/programs/{code}',
        'blocks': blocks,
    }


def main():
    id_to_code = load_course_ids()
    if not id_to_code:
        sys.exit('data/courses.json has no course ids — run fetch_catalog.py first.')

    codes = [c for c in all_program_codes() if c.rsplit('-', 1)[-1] in KINDS]
    print(f'{len(codes)} undergraduate program codes')
    raw = fetch_programs(codes)

    conv = Converter(id_to_code)
    programs = [convert(p, conv) for p in raw.values()
                if p.get('status') == 'Active' and (p.get('requisites') or {}).get('requisitesSimple')]
    programs.sort(key=lambda p: (p['name'].lower(), p['kind']))

    with open(DATA / 'programs.json', 'w') as f:
        json.dump({'meta': {'year': YEAR, 'source': 'Stanford Bulletin', 'fetched': time.strftime('%Y-%m-%d'),
                            'count': len(programs)}, 'programs': programs}, f, separators=(',', ':'))
    print(f'Done: {len(programs)} programs saved. '
          f'{len(conv.unknown)} referenced courses are not in this year\'s catalog (skipped).')


if __name__ == '__main__':
    main()
