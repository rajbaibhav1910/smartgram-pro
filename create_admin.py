"""
create_admin.py
Creates the platform SUPER_ADMIN account (multi-tenant platform administrator).
Run once; change the password after first login.

Usage:
    python create_admin.py
Environment variables:
    SUPERADMIN_USERNAME / SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
"""
import os
import boto3
import hashlib
from datetime import datetime

region     = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')
table_name = os.environ.get('USERS_TABLE', 'SmartGramUsers')
username   = os.environ.get('SUPERADMIN_USERNAME', 'superadmin')
email      = os.environ.get('SUPERADMIN_EMAIL', 'superadmin@smartgram.gov.in')
password   = os.environ.get('SUPERADMIN_PASSWORD', 'change-me-now')

dynamodb = boto3.resource('dynamodb', region_name=region)
table    = dynamodb.Table(table_name)

existing = table.scan(FilterExpression=boto3.dynamodb.conditions.Attr('username').eq(username))
if existing['Count'] > 0:
    print(f"[!] User '{username}' already exists — nothing done.")
    raise SystemExit(1)

table.put_item(Item={
    'user_id':       'USR-SUPERADMIN',
    'username':      username,
    'email':         email,
    'password_hash': hashlib.sha256(password.encode()).hexdigest(),
    'role':          'super_admin',   # platform-wide; no panchayatId
    'village':       'Platform',
    'phone':         '',
    'created_at':    datetime.now().isoformat()
})
print(f"[SUCCESS] SUPER_ADMIN '{username}' created in table '{table_name}' ({region})!")
print("   Change the password after first login!")
print("   Panchayat admins are created from the Super Admin panel (or the migration script).")
