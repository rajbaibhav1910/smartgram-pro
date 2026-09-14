# config.py — SmartGram Pro Production Configuration
import os
import json

def get_secret_config():
    """Optionally load config from AWS Secrets Manager if configured."""
    secret_id = os.environ.get('SECRET_NAME') or os.environ.get('SECRETS_MANAGER_SECRET_ID')
    if not secret_id:
        return {}
    try:
        import boto3
        region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')
        client = boto3.client('secretsmanager', region_name=region)
        resp = client.get_secret_value(SecretId=secret_id)
        if 'SecretString' in resp:
            return json.loads(resp['SecretString'])
    except Exception as e:
        print(f"[WARN] Could not retrieve secrets from Secrets Manager: {e}")
    return {}

_secrets = get_secret_config()

class Config:
    AWS_REGION       = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')
    SECRET_KEY       = _secrets.get('SECRET_KEY') or os.environ.get('SECRET_KEY', 'smartgram-secret-key-production-change-me')

    # S3 Bucket for complaint images & CDN domain
    S3_BUCKET        = os.environ.get('S3_BUCKET', 'smartgram-media-bucket')
    CDN_DOMAIN       = os.environ.get('CDN_DOMAIN', '')  # e.g., d123456.cloudfront.net

    # DynamoDB Table Names
    USERS_TABLE      = os.environ.get('USERS_TABLE', 'SmartGramUsers')
    COMPLAINTS_TABLE = os.environ.get('COMPLAINTS_TABLE', 'SmartGramComplaints')
    NOTICES_TABLE    = os.environ.get('NOTICES_TABLE', 'SmartGramNotices')
    MAP_ASSETS_TABLE = os.environ.get('MAP_ASSETS_TABLE', 'SmartGramMapAssets')
    PANCHAYATS_TABLE = os.environ.get('PANCHAYATS_TABLE', 'SmartGramPanchayats')
    AUDIT_LOG_TABLE  = os.environ.get('AUDIT_LOG_TABLE', 'SmartGramAuditLog')

    # Multi-tenancy: panchayat records without an explicit panchayatId are
    # assigned to this default tenant by scripts/migrate_to_multitenant.py.
    DEFAULT_PANCHAYAT_ID = os.environ.get('DEFAULT_PANCHAYAT_ID', 'PB001')

    # SNS Topic ARN for email alerts
    SNS_TOPIC_ARN    = os.environ.get('SNS_TOPIC_ARN', '')

    MAX_CONTENT_LENGTH = 5 * 1024 * 1024   # 5 MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    # Session & Cookie Security (for ALB/CloudFront HTTPS)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
    SESSION_COOKIE_SECURE   = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() in ('true', '1', 'yes')
