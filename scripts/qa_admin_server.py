"""QA-only local server for the ADMIN console: runs the real Flask app with
in-memory users/complaints/notices stubs and bypassed auth so the admin
dashboard, drawer, and status updates can be exercised without AWS.
NOT shipped or deployed — test fixture only."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'venv', 'Lib', 'site-packages'))

import app as sg
from datetime import datetime

ADMIN_USER = {
    'user_id': 'USR-QA-ADMIN',
    'username': 'admin',
    'email': 'admin@qa.local',
    'role': 'admin',
    'village': 'All Villages',
    'phone': '0000000000',
    'created_at': '2026-01-01T00:00:00',
}

CATS = ['Road Damage', 'Water Supply', 'Electricity', 'Sanitation', 'Health']
STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected']
VILLAGES = ['Rampur', 'Shyampur', 'Kishanganj']

COMPLAINTS = []
for i in range(18):
    status = STATUSES[i % 4]
    submitted = f'2026-09-{(i % 12) + 1:02d}T10:{i % 60:02d}:00'
    COMPLAINTS.append({
        'complaint_id': f'CMP-QA-{i:04d}',
        'user_id': f'USR-{i:04d}',
        'username': f'citizen_{i+1:02d}',
        'email': f'citizen{i+1:02d}@qa.local',
        'category': CATS[i % len(CATS)],
        'title': f'{CATS[i % len(CATS)]} issue in ward {(i % 5) + 1} (sample)',
        'description': f'Sample complaint #{i+1} describing a {CATS[i % len(CATS)].lower()} problem reported by the citizen.',
        'image_url': '',
        'status': status,
        'village': VILLAGES[i % len(VILLAGES)],
        'submitted_at': submitted,
        'updated_at': submitted,
        'admin_remarks': '',
        'timeline': [{'status': status, 'remarks': '', 'at': submitted}],
    })

NOTICES = [
    {
        'notice_id': 'NTC-QA-001',
        'title': 'Gram sabha on Sunday (sample notice)',
        'content': 'All villagers are invited to the monthly gram sabha.',
        'category': 'Meeting',
        'posted_by': 'admin',
        'posted_at': '2026-09-10T09:00:00',
        'expiry_date': '2026-09-30',
    },
]


class UsersStub:
    def get_item(self, Key):
        if Key['user_id'] == ADMIN_USER['user_id']:
            return {'Item': dict(ADMIN_USER)}
        return {}

    def scan(self, **kwargs):
        # login path: find by username
        return {'Items': [dict(ADMIN_USER)], 'Count': 1}


class ComplaintsStub:
    def __init__(self):
        self.items = {c['complaint_id']: dict(c) for c in COMPLAINTS}

    def scan(self, **kwargs):
        items = list(self.items.values())
        if 'FilterExpression' in kwargs:
            # citizen dashboard filter on user_id — return none for admin QA
            items = []
        return {'Items': items}

    def get_item(self, Key):
        return {'Item': self.items.get(Key['complaint_id'])}

    def update_item(self, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues):
        """Handles exactly the UpdateExpression shape app.py builds."""
        item = self.items[Key['complaint_id']]
        v = ExpressionAttributeValues
        status = v.get(':s')
        remarks = v.get(':r', '')
        updated = v.get(':u', datetime.now().isoformat())
        event = v.get(':event')
        if ExpressionAttributeNames.get('#st') == 'status':
            item['status'] = status
        item['admin_remarks'] = remarks
        item['updated_at'] = updated
        if event:
            item.setdefault('timeline', []).extend(event)


class NoticesStub:
    def __init__(self):
        self.items = {n['notice_id']: dict(n) for n in NOTICES}

    def scan(self):
        return {'Items': list(self.items.values())}

    def get_item(self, Key):
        return {'Item': self.items.get(Key['notice_id'])}

    def put_item(self, Item):
        self.items[Item['notice_id']] = Item


class MapAssetsStub:
    """In-memory stand-in for the SmartGramMapAssets table."""

    def __init__(self):
        self.items = {}

    def scan(self):
        return {'Items': list(self.items.values())}

    def get_item(self, Key):
        return {'Item': self.items.get(Key['feature_id'])}

    def put_item(self, Item):
        self.items[Item['feature_id']] = Item

    def delete_item(self, Key):
        self.items.pop(Key['feature_id'], None)


sg.users_table = UsersStub()
sg.complaints_table = ComplaintsStub()
sg.notices_table = NoticesStub()
sg.map_assets_table = MapAssetsStub()

# Bypass auth for QA: /api/auth/me seeds the admin session and returns the user
def fake_auth_me():
    sg.session.update({
        'user_id': ADMIN_USER['user_id'],
        'username': ADMIN_USER['username'],
        'role': ADMIN_USER['role'],
        'village': ADMIN_USER['village'],
        'email': ADMIN_USER['email'],
    })
    return sg.jsonify({'user': dict(ADMIN_USER)})

sg.app.view_functions['api_auth_me'] = fake_auth_me

from wsgiref.simple_server import make_server
srv = make_server('127.0.0.1', 5002, sg.app)
print('QA admin server on http://127.0.0.1:5002')
srv.serve_forever()
