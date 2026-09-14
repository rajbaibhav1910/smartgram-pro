"""QA-only local server: runs the real Flask app with an in-memory notices stub
so the notice board UI can be exercised without AWS credentials.
NOT shipped or deployed — test fixture only."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'venv', 'Lib', 'site-packages'))

import app as sg


class StubTable:
    """Mimics the DynamoDB table interface used by the notice endpoints."""

    def __init__(self, items):
        self.items = {i['notice_id']: i for i in items}

    def scan(self):
        return {'Items': list(self.items.values())}

    def get_item(self, Key):
        return {'Item': self.items.get(Key['notice_id'])}

    def put_item(self, Item):
        self.items[Item['notice_id']] = Item


SAMPLE = [
    {
        'notice_id': 'NTC-QA-ALERT-001',
        'title': 'Water supply interruption on Friday (sample notice)',
        'content': 'Water supply will be interrupted on Friday from 9 AM to 2 PM in the eastern ward for pipeline maintenance. Please store water in advance.\n\nContact the panchayat office for questions.',
        'category': 'Alert',
        'posted_by': 'admin',
        'posted_at': '2026-09-10T09:15:00',
        'expiry_date': '2026-09-20',
    },
    {
        'notice_id': 'NTC-QA-MEET-002',
        'title': 'Gram sabha meeting — village development plan (sample notice)',
        'content': 'A gram sabha meeting will be held to discuss the annual village development plan and budget allocation. All village members are requested to attend.',
        'category': 'Meeting',
        'posted_by': 'admin',
        'posted_at': '2026-09-08T17:40:00',
        'expiry_date': '2026-09-30',
    },
    {
        'notice_id': 'NTC-QA-GEN-003',
        'title': 'New street lights installed on the main road (sample notice)',
        'content': 'Twelve new LED street lights have been installed along the main road from the panchayat office to the school.',
        'category': 'General',
        'posted_by': 'admin',
        'posted_at': '2026-09-02T11:00:00',
        'expiry_date': '',
    },
    {
        'notice_id': 'NTC-QA-EXP-004',
        'title': 'Applications invited for village library volunteer (sample notice)',
        'content': 'Interested volunteers may register their names at the panchayat office before the due date.',
        'category': 'General',
        'posted_by': 'admin',
        'posted_at': '2026-07-15T10:00:00',
        'expiry_date': '2026-08-01',
    },
]

sg.notices_table = StubTable(SAMPLE)

from wsgiref.simple_server import make_server
srv = make_server('127.0.0.1', 5001, sg.app)
print('QA stub server on http://127.0.0.1:5001')
srv.serve_forever()
