"""QA-only multi-tenant server: two synthetic Panchayats (PB001, PB002) with
separate admins, citizens and complaints, backed by real Flask auth/sessions
so cross-tenant security behavior can be tested over HTTP.
NOT shipped or deployed — test fixture only."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'venv', 'Lib', 'site-packages'))

import app as sg
from datetime import datetime

NOW = '2026-09-13T10:00:00'

PANCHAYATS = {
    'PB001': {'panchayatId': 'PB001', 'name': 'Rampur (sample)', 'district': 'Demo', 'state': 'DemoState', 'status': 'ACTIVE', 'createdAt': NOW, 'updatedAt': NOW},
    'PB002': {'panchayatId': 'PB002', 'name': 'Shyampur (sample)', 'district': 'Demo', 'state': 'DemoState', 'status': 'ACTIVE', 'createdAt': NOW, 'updatedAt': NOW},
}

USERS = {
    'USR-SUPER': {'user_id': 'USR-SUPER', 'username': 'superadmin', 'email': 'super@qa', 'password_hash': sg.hash_pw('super123'), 'role': 'super_admin', 'village': 'Platform', 'phone': '', 'created_at': NOW},
    'USR-A1': {'user_id': 'USR-A1', 'username': 'admin_pb001', 'email': 'a1@qa', 'password_hash': sg.hash_pw('pass123'), 'role': 'panchayat_admin', 'panchayatId': 'PB001', 'village': 'Rampur', 'phone': '', 'created_at': NOW},
    'USR-A2': {'user_id': 'USR-A2', 'username': 'admin_pb002', 'email': 'a2@qa', 'password_hash': sg.hash_pw('pass123'), 'role': 'panchayat_admin', 'panchayatId': 'PB002', 'village': 'Shyampur', 'phone': '', 'created_at': NOW},
    'USR-C1': {'user_id': 'USR-C1', 'username': 'citizen_pb001', 'email': 'c1@qa', 'password_hash': sg.hash_pw('pass123'), 'role': 'villager', 'panchayatId': 'PB001', 'village': 'Rampur', 'phone': '', 'created_at': NOW},
    'USR-C2': {'user_id': 'USR-C2', 'username': 'citizen_pb002', 'email': 'c2@qa', 'password_hash': sg.hash_pw('pass123'), 'role': 'villager', 'panchayatId': 'PB002', 'village': 'Shyampur', 'phone': '', 'created_at': NOW},
}

COMPLAINTS = {
    'CMP-PB001-1': {'complaint_id': 'CMP-PB001-1', 'panchayatId': 'PB001', 'user_id': 'USR-C1', 'username': 'citizen_pb001', 'email': 'c1@qa', 'category': 'Water Supply', 'title': 'PB001 water issue', 'description': 'Sample complaint belonging to panchayat PB001 only.', 'image_url': '', 'status': 'Pending', 'village': 'Rampur', 'submitted_at': NOW, 'updated_at': NOW, 'admin_remarks': '', 'timeline': []},
    'CMP-PB001-2': {'complaint_id': 'CMP-PB001-2', 'panchayatId': 'PB001', 'user_id': 'USR-C1', 'username': 'citizen_pb001', 'email': 'c1@qa', 'category': 'Road Damage', 'title': 'PB001 road issue', 'description': 'Another PB001 sample complaint.', 'image_url': '', 'status': 'Resolved', 'village': 'Rampur', 'submitted_at': NOW, 'updated_at': NOW, 'admin_remarks': '', 'timeline': []},
    'CMP-PB002-1': {'complaint_id': 'CMP-PB002-1', 'panchayatId': 'PB002', 'user_id': 'USR-C2', 'username': 'citizen_pb002', 'email': 'c2@qa', 'category': 'Electricity', 'title': 'PB002 power issue', 'description': 'Secret complaint belonging to panchayat PB002.', 'image_url': '', 'status': 'Pending', 'village': 'Shyampur', 'submitted_at': NOW, 'updated_at': NOW, 'admin_remarks': '', 'timeline': []},
}

NOTICES = {
    'NTC-PB002-1': {'notice_id': 'NTC-PB002-1', 'panchayatId': 'PB002', 'title': 'PB002 secret notice', 'content': 'Only PB002 should see this.', 'category': 'General', 'posted_by': 'admin_pb002', 'posted_at': NOW, 'expiry_date': ''},
}

MAPFEATURES = {
    'MAP-PB002-1': {'feature_id': 'MAP-PB002-1', 'panchayatId': 'PB002', 'feature_type': 'school', 'geometry': {'type': 'Point', 'coordinates': [79.5, 28.95]}, 'properties': {'name': 'PB002 School'}, 'created_by': 'admin_pb002', 'created_at': NOW, 'updated_at': NOW},
}


class UsersStub:
    def get_item(self, Key):
        return {'Item': dict(USERS[Key['user_id']])} if Key['user_id'] in USERS else {}

    def scan(self, FilterExpression=None, **kw):
        items = [dict(u) for u in USERS.values()]
        if FilterExpression is not None:
            # Evaluate the known boto3 conditions used by app.py
            expr = FilterExpression.get_expression()
            values = expr.get('values', ())
            if expr.get('operator') == '=' and len(values) == 2:
                attr_name = values[0].name
                wanted = values[1]
                items = [u for u in items if u.get(attr_name) == wanted]
            elif expr.get('operator') == 'AND':
                def eval_side(side):
                    vals = side.get_expression().get('values', ())
                    op = side.get_expression().get('operator')
                    name = vals[0].name
                    return (lambda u: u.get(name) == vals[1]) if op == '=' else (lambda u: False)
                left, right = eval_side(values[0]), eval_side(values[1])
                items = [u for u in items if left(u) and right(u)]
        return {'Items': items, 'Count': len(items)}

    def put_item(self, Item):
        USERS[Item['user_id']] = dict(Item)


class ComplaintsStub:
    def get_item(self, Key):
        return {'Item': dict(COMPLAINTS[Key['complaint_id']])} if Key['complaint_id'] in COMPLAINTS else {}

    def scan(self, FilterExpression=None, **kw):
        items = [dict(c) for c in COMPLAINTS.values()]
        if FilterExpression is not None:
            expr = FilterExpression.get_expression()
            if expr.get('operator') == 'AND':
                def eval_side(side):
                    vals = side.get_expression().get('values', ())
                    name = vals[0].name
                    return (lambda u: u.get(name) == vals[1])
                left, right = eval_side(expr['values'][0]), eval_side(expr['values'][1])
                items = [u for u in items if left(u) and right(u)]
        return {'Items': items, 'Count': len(items)}

    def query(self, IndexName=None, KeyConditionExpression=None, Select=None, **kw):
        vals = KeyConditionExpression.get_expression()['values']
        target = vals[1]
        items = [dict(c) for c in COMPLAINTS.values() if c.get('panchayatId') == target]
        if Select == 'COUNT':
            return {'Count': len(items)}
        return {'Items': items}

    def put_item(self, Item):
        COMPLAINTS[Item['complaint_id']] = dict(Item)

    def update_item(self, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues):
        item = COMPLAINTS[Key['complaint_id']]
        v = ExpressionAttributeValues
        if ExpressionAttributeNames.get('#st') == 'status':
            item['status'] = v.get(':s')
        item['admin_remarks'] = v.get(':r', '')
        item['updated_at'] = v.get(':u')
        if v.get(':event'):
            item.setdefault('timeline', []).extend(v[':event'])


class NoticesStub:
    def get_item(self, Key):
        return {'Item': dict(NOTICES[Key['notice_id']])} if Key['notice_id'] in NOTICES else {}

    def scan(self):
        return {'Items': [dict(n) for n in NOTICES.values()]}

    def query(self, IndexName=None, KeyConditionExpression=None, **kw):
        vals = KeyConditionExpression.get_expression()['values']
        target = vals[1]
        return {'Items': [dict(n) for n in NOTICES.values() if n.get('panchayatId') == target]}

    def put_item(self, Item):
        NOTICES[Item['notice_id']] = dict(Item)


class MapStub:
    def get_item(self, Key):
        return {'Item': dict(MAPFEATURES[Key['feature_id']])} if Key['feature_id'] in MAPFEATURES else {}

    def scan(self):
        return {'Items': [dict(m) for m in MAPFEATURES.values()]}

    def query(self, IndexName=None, KeyConditionExpression=None, **kw):
        vals = KeyConditionExpression.get_expression()['values']
        target = vals[1]
        return {'Items': [dict(m) for m in MAPFEATURES.values() if m.get('panchayatId') == target]}

    def put_item(self, Item):
        MAPFEATURES[Item['feature_id']] = dict(Item)

    def delete_item(self, Key):
        MAPFEATURES.pop(Key['feature_id'], None)


class PanchayatsStub:
    def get_item(self, Key):
        return {'Item': dict(PANCHAYATS[Key['panchayatId']])} if Key['panchayatId'] in PANCHAYATS else {}

    def scan(self):
        return {'Items': [dict(p) for p in PANCHAYATS.values()]}

    def put_item(self, Item):
        PANCHAYATS[Item['panchayatId']] = dict(Item)


class AuditStub:
    def __init__(self):
        self.items = {}

    def put_item(self, Item):
        self.items[Item['audit_id']] = dict(Item)

    def scan(self):
        return {'Items': list(self.items.values())}


sg.users_table = UsersStub()
sg.complaints_table = ComplaintsStub()
sg.notices_table = NoticesStub()
sg.map_assets_table = MapStub()
sg.panchayats_table = PanchayatsStub()
sg.audit_log_table = AuditStub()
# SNS off in QA
sg.app.config['SNS_TOPIC_ARN'] = ''

from wsgiref.simple_server import make_server
srv = make_server('127.0.0.1', 5002, sg.app)
print('QA multi-tenant server on http://127.0.0.1:5002')
srv.serve_forever()
