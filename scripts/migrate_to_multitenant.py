"""
migrate_to_multitenant.py
One-time, idempotent migration to multi-tenancy:
  1. Ensures the default Panchayat exists (DEFAULT_PANCHAYAT_ID, default PB001).
  2. Stamps every user/complaint/notice/map feature that lacks a panchayatId
     with the default Panchayat.
  3. Converts legacy role 'admin' -> 'panchayat_admin' (with default tenant).
     role 'super_admin' is left untouched.

NEVER deletes data. Safe to run more than once.

Usage:
    python scripts/migrate_to_multitenant.py
Requires AWS credentials (or run against DynamoDB local via endpoint env).
"""
import os, sys, hashlib
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'venv', 'Lib', 'site-packages'))

import boto3
from boto3.dynamodb.conditions import Attr

region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')
DEFAULT_PANCHAYAT_ID = os.environ.get('DEFAULT_PANCHAYAT_ID', 'PB001')
DEFAULT_NAME = os.environ.get('DEFAULT_PANCHAYAT_NAME', 'Default Gram Panchayat')

dynamodb = boto3.resource('dynamodb', region_name=region)


def table(name):
    return dynamodb.Table(name)


def ensure_default_panchayat():
    t = table(os.environ.get('PANCHAYATS_TABLE', 'SmartGramPanchayats'))
    if not t.get_item(Key={'panchayatId': DEFAULT_PANCHAYAT_ID}).get('Item'):
        now = datetime.now().isoformat()
        t.put_item(Item={
            'panchayatId':  DEFAULT_PANCHAYAT_ID,
            'name':         DEFAULT_NAME,
            'district':     '',
            'state':        '',
            'status':       'ACTIVE',
            'createdAt':    now,
            'updatedAt':    now,
        })
        print(f"[+] Created default panchayat {DEFAULT_PANCHAYAT_ID} ({DEFAULT_NAME})")
    else:
        print(f"[=] Default panchayat {DEFAULT_PANCHAYAT_ID} already exists")


def stamp(table_name, pk, extra_stamp=None):
    """Add panchayatId to every item missing it. Returns number updated."""
    t = table(table_name)
    updated = 0
    for item in t.scan()['Items']:
        if item.get('panchayatId'):
            continue
        expr = 'SET panchayatId = :p'
        values = {':p': DEFAULT_PANCHAYAT_ID}
        if extra_stamp:
            expr += ', #r = :r'
            names = {'#r': extra_stamp}
            values[':r'] = 'panchayat_admin' if item.get('role') == 'admin' else item.get('role', 'villager')
            t.update_item(Key={pk: item[pk]},
                          UpdateExpression=expr,
                          ExpressionAttributeNames=names,
                          ExpressionAttributeValues=values)
        else:
            t.update_item(Key={pk: item[pk]},
                          UpdateExpression=expr,
                          ExpressionAttributeValues=values)
        updated += 1
    return updated


def main():
    ensure_default_panchayat()

    users = stamp(os.environ.get('USERS_TABLE', 'SmartGramUsers'), 'user_id',
                  extra_stamp='role')
    print(f"[+] Users stamped/migrated: {users}")

    complaints = stamp(os.environ.get('COMPLAINTS_TABLE', 'SmartGramComplaints'), 'complaint_id')
    print(f"[+] Complaints stamped: {complaints}")

    notices = stamp(os.environ.get('NOTICES_TABLE', 'SmartGramNotices'), 'notice_id')
    print(f"[+] Notices stamped: {notices}")

    maps = stamp(os.environ.get('MAP_ASSETS_TABLE', 'SmartGramMapAssets'), 'feature_id')
    print(f"[+] Map features stamped: {maps}")

    print("\nDone. New registrations must reference an ACTIVE panchayat code.")
    print("Legacy 'admin' users are now 'panchayat_admin' scoped to "
          f"{DEFAULT_PANCHAYAT_ID}. Create a SUPER_ADMIN with create_admin.py.")


if __name__ == '__main__':
    main()
