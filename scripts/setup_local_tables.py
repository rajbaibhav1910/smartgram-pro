"""
setup_local_tables.py
Creates missing DynamoDB tables and seeds sample panchayat data for local dev.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath('.')))

import boto3
from datetime import datetime

region = os.environ.get('AWS_REGION', 'ap-south-1')
client   = boto3.client('dynamodb', region_name=region)
dynamodb = boto3.resource('dynamodb', region_name=region)
NOW = datetime.now().isoformat()

existing = set(client.list_tables()['TableNames'])
print(f"Existing tables: {sorted(existing)}")

def create_table_if_missing(name, kwargs):
    if name in existing:
        print(f"  [=] {name} already exists")
        return
    print(f"  [+] Creating {name} ...")
    client.create_table(**kwargs)
    client.get_waiter('table_exists').wait(TableName=name)
    print(f"  [OK] {name} created")

create_table_if_missing('SmartGramPanchayats', {
    'TableName': 'SmartGramPanchayats',
    'BillingMode': 'PAY_PER_REQUEST',
    'AttributeDefinitions': [{'AttributeName': 'panchayatId', 'AttributeType': 'S'}],
    'KeySchema': [{'AttributeName': 'panchayatId', 'KeyType': 'HASH'}],
})

create_table_if_missing('SmartGramAuditLog', {
    'TableName': 'SmartGramAuditLog',
    'BillingMode': 'PAY_PER_REQUEST',
    'AttributeDefinitions': [
        {'AttributeName': 'audit_id',    'AttributeType': 'S'},
        {'AttributeName': 'panchayatId', 'AttributeType': 'S'},
        {'AttributeName': 'timestamp',   'AttributeType': 'S'},
    ],
    'KeySchema': [{'AttributeName': 'audit_id', 'KeyType': 'HASH'}],
    'GlobalSecondaryIndexes': [{'IndexName': 'PanchayatIndex', 'KeySchema': [
        {'AttributeName': 'panchayatId', 'KeyType': 'HASH'},
        {'AttributeName': 'timestamp',   'KeyType': 'RANGE'},
    ], 'Projection': {'ProjectionType': 'ALL'}}],
})

create_table_if_missing('SmartGramMapAssets', {
    'TableName': 'SmartGramMapAssets',
    'BillingMode': 'PAY_PER_REQUEST',
    'AttributeDefinitions': [
        {'AttributeName': 'feature_id',  'AttributeType': 'S'},
        {'AttributeName': 'panchayatId', 'AttributeType': 'S'},
    ],
    'KeySchema': [{'AttributeName': 'feature_id', 'KeyType': 'HASH'}],
    'GlobalSecondaryIndexes': [{'IndexName': 'PanchayatIndex', 'KeySchema': [
        {'AttributeName': 'panchayatId', 'KeyType': 'HASH'},
    ], 'Projection': {'ProjectionType': 'ALL'}}],
})

print("\nSeeding panchayats ...")
t = dynamodb.Table('SmartGramPanchayats')
PANCHAYATS = [
    {'panchayatId': 'PB001', 'name': 'Rampur Gram Panchayat',    'district': 'Lucknow',   'state': 'Uttar Pradesh',  'status': 'ACTIVE', 'email': 'rampur@smartgram.gov.in',    'phone': '9876543210', 'createdAt': NOW, 'updatedAt': NOW},
    {'panchayatId': 'PB002', 'name': 'Shyampur Gram Panchayat',  'district': 'Patna',     'state': 'Bihar',           'status': 'ACTIVE', 'email': 'shyampur@smartgram.gov.in',  'phone': '9876543211', 'createdAt': NOW, 'updatedAt': NOW},
    {'panchayatId': 'PB003', 'name': 'Kishanganj Gram Panchayat','district': 'Kishanganj','state': 'Bihar',           'status': 'ACTIVE', 'email': 'kishanganj@smartgram.gov.in','phone': '9876543212', 'createdAt': NOW, 'updatedAt': NOW},
    {'panchayatId': 'PB004', 'name': 'Sundarpur Gram Panchayat', 'district': 'Bhopal',    'state': 'Madhya Pradesh',  'status': 'ACTIVE', 'email': 'sundarpur@smartgram.gov.in', 'phone': '9876543213', 'createdAt': NOW, 'updatedAt': NOW},
    {'panchayatId': 'PB005', 'name': 'Nayagaon Gram Panchayat',  'district': 'Jaipur',    'state': 'Rajasthan',       'status': 'ACTIVE', 'email': 'nayagaon@smartgram.gov.in',  'phone': '9876543214', 'createdAt': NOW, 'updatedAt': NOW},
]
for p in PANCHAYATS:
    if t.get_item(Key={'panchayatId': p['panchayatId']}).get('Item'):
        print(f"  [=] {p['panchayatId']} exists")
    else:
        t.put_item(Item=p)
        print(f"  [+] {p['panchayatId']} — {p['name']}")

print("\nFixing users missing panchayatId ...")
ut = dynamodb.Table('SmartGramUsers')
for u in ut.scan()['Items']:
    if u.get('role') == 'super_admin': continue
    if not u.get('panchayatId'):
        ut.update_item(Key={'user_id': u['user_id']}, UpdateExpression='SET panchayatId = :p', ExpressionAttributeValues={':p': 'PB001'})
        print(f"  [+] Assigned PB001 to '{u['username']}'")

print("\nDone! Restart Flask app (python app.py) to apply changes.")
