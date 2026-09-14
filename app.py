from flask import (Flask, request,
                   session, jsonify, send_from_directory)
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
import boto3
from boto3.dynamodb.conditions import Attr, Key
import uuid, hashlib, os, json
from bisect import bisect_left
from datetime import datetime
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
CORS(app, supports_credentials=True)

# Built React application (npm run build in frontend/)
FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')

# AWS clients — uses IAM Task Role attached to ECS Fargate (no hardcoded keys)
dynamodb = boto3.resource('dynamodb', region_name=app.config['AWS_REGION'])
s3       = boto3.client('s3',         region_name=app.config['AWS_REGION'])
sns      = boto3.client('sns',        region_name=app.config['AWS_REGION'])

users_table      = dynamodb.Table(app.config['USERS_TABLE'])
complaints_table = dynamodb.Table(app.config['COMPLAINTS_TABLE'])
notices_table    = dynamodb.Table(app.config['NOTICES_TABLE'])
map_assets_table = dynamodb.Table(app.config['MAP_ASSETS_TABLE'])
panchayats_table = dynamodb.Table(app.config['PANCHAYATS_TABLE'])
audit_log_table  = dynamodb.Table(app.config['AUDIT_LOG_TABLE'])

# ── Panchayat GIS (map features) ──────────────────────────────────────────────
# Everything on the map is a GeoJSON Feature stored in SmartGramMapAssets.
# The production map starts EMPTY — panchayat staff add real assets through
# the admin UI. No coordinates are ever fabricated server-side.

MAP_FEATURE_TYPES = {
    'boundary', 'ward', 'school', 'hospital', 'anganwadi', 'water_tank',
    'hand_pump', 'street_light', 'government_office', 'community_center',
    'road', 'project',
}
MAP_GEOMETRY_TYPES = {'Point', 'LineString', 'Polygon'}
MAP_FEATURE_STATUSES = {'', 'operational', 'needs_attention', 'under_maintenance', 'inactive'}
MAP_PROJECT_STATUSES = {'', 'planned', 'approved', 'in_progress', 'completed', 'verified'}


def _valid_coords(coords, depth=0):
    """Recursively validate GeoJSON coordinate arrays."""
    if not isinstance(coords, (list, tuple)) or len(coords) == 0:
        return False
    if depth == 0:
        return (isinstance(coords[0], (int, float)) and len(coords) >= 2
                and -180 <= coords[0] <= 180 and -90 <= coords[1] <= 90
                and all(isinstance(c, (int, float)) for c in coords[:2]))
    return all(_valid_coords(c, depth - 1) for c in coords[:200])


def _clean_feature_payload(data):
    """Validate and normalise a map feature payload. Returns (feature, error)."""
    ftype = data.get('type')
    if ftype not in MAP_FEATURE_TYPES:
        return None, 'Unknown feature type'
    geometry = data.get('geometry') or {}
    gtype = geometry.get('type')
    if gtype not in MAP_GEOMETRY_TYPES:
        return None, 'Geometry must be Point, LineString or Polygon'
    coords = geometry.get('coordinates')
    depth = {'Point': 0, 'LineString': 1, 'Polygon': 2}[gtype]
    if not _valid_coords(coords, depth):
        return None, 'Invalid or out-of-range coordinates'
    if gtype == 'Polygon' and len(coords) and len(coords[0]) < 4:
        return None, 'A polygon needs at least 4 positions (closed ring)'
    if gtype == 'LineString' and len(coords) < 2:
        return None, 'A line needs at least 2 positions'

    props = data.get('properties') or {}
    name = str(props.get('name', '')).strip()
    if not name:
        return None, 'A name is required'
    ward = str(props.get('ward', '')).strip()[:40]
    status = str(props.get('status', '')).strip().lower()
    description = str(props.get('description', '')).strip()[:2000]
    progress = props.get('progress')
    progress = int(progress) if isinstance(progress, (int, float)) and 0 <= progress <= 100 else None

    properties = {'name': name[:120]}
    if ward:
        properties['ward'] = ward
    if ftype == 'project':
        if status not in MAP_PROJECT_STATUSES:
            status = 'planned'
        properties['status'] = status
        if progress is not None:
            properties['progress'] = progress
    else:
        if status not in MAP_FEATURE_STATUSES:
            status = ''
        if status:
            properties['status'] = status
    if description:
        properties['description'] = description

    feature = {
        'type': 'Feature',
        'geometry': {'type': gtype, 'coordinates': coords},
        'properties': properties,
        'feature_type': ftype,
    }
    return feature, None


def _feature_from_item(item):
    """Convert a stored map item into a GeoJSON Feature for the client."""
    return {
        'type': 'Feature',
        'id': item.get('feature_id'),
        'geometry': item.get('geometry'),
        'properties': item.get('properties', {}),
        'feature_type': item.get('feature_type'),
        'created_by': item.get('created_by', ''),
        'created_at': item.get('created_at', ''),
        'updated_at': item.get('updated_at', ''),
    }


@app.route('/api/map/features', methods=['GET'])
def api_map_features():
    """GIS features are tenant-owned; scope is implicit for logged-in users."""
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401
    scope, err = tenant_scope_or_error()
    if err:
        return err
    if not scope:
        return jsonify({'type': 'FeatureCollection', 'features': []})
    try:
        result = map_assets_table.query(
            IndexName='PanchayatIndex',
            KeyConditionExpression=Key('panchayatId').eq(scope),
        )
        features = [_feature_from_item(i) for i in result['Items']]
        return jsonify({'type': 'FeatureCollection', 'features': features})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load map features'}), 500


@app.route('/api/map/features/<feature_id>', methods=['GET'])
def api_map_feature(feature_id):
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401
    item = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not item:
        return jsonify({'error': 'Feature not found'}), 404
    role = session_role()
    if role in ('villager', 'panchayat_admin'):
        if item.get('panchayatId') != session.get('panchayatId'):
            return tenant_forbidden_response(item.get('panchayatId'))
    return jsonify({'feature': _feature_from_item(item)})


@app.route('/api/map/features', methods=['POST'])
def api_map_create_feature():
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    feature, error = _clean_feature_payload(request.json or {})
    if error:
        return jsonify({'error': error}), 400

    panchayat_id = session.get('panchayatId')
    if not panchayat_id:
        return jsonify({'error': 'Your account has no Panchayat assigned'}), 403

    now = datetime.now().isoformat()
    feature_id = gen_id('MAP')
    item = {
        'feature_id': feature_id,
        'panchayatId': panchayat_id,
        'feature_type': feature['feature_type'],
        'geometry': feature['geometry'],
        'properties': feature['properties'],
        'created_by': session['username'],
        'created_at': now,
        'updated_at': now,
    }
    map_assets_table.put_item(Item=item)
    audit(panchayat_id, 'MAP_FEATURE_CREATED', feature_id, 'SUCCESS',
          details=feature['properties'].get('name', ''))
    return jsonify({'feature': _feature_from_item(item)}), 201


@app.route('/api/map/features/<feature_id>', methods=['PUT'])
def api_map_update_feature(feature_id):
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    existing = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not existing:
        return jsonify({'error': 'Feature not found'}), 404
    if session_role() == 'panchayat_admin' and existing.get('panchayatId') != session.get('panchayatId'):
        return tenant_forbidden_response(existing.get('panchayatId'))
    feature, error = _clean_feature_payload(request.json or {})
    if error:
        return jsonify({'error': error}), 400

    existing['feature_type'] = feature['feature_type']
    existing['geometry'] = feature['geometry']
    existing['properties'] = feature['properties']
    existing['updated_at'] = datetime.now().isoformat()
    map_assets_table.put_item(Item=existing)
    return jsonify({'feature': _feature_from_item(existing)})


@app.route('/api/map/features/<feature_id>', methods=['DELETE'])
def api_map_delete_feature(feature_id):
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    existing = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not existing:
        return jsonify({'error': 'Feature not found'}), 404
    if session_role() == 'panchayat_admin' and existing.get('panchayatId') != session.get('panchayatId'):
        return tenant_forbidden_response(existing.get('panchayatId'))
    map_assets_table.delete_item(Key={'feature_id': feature_id})
    audit(existing.get('panchayatId'), 'MAP_FEATURE_DELETED', feature_id, 'SUCCESS')
    return jsonify({'success': True})



# ── Health Check (for ALB & ECS Container Health Checks) ───────────────────────

@app.route('/api/health')
def api_health():
    return jsonify({
        'status': 'healthy',
        'service': 'smartgram-api',
        'region': app.config['AWS_REGION'],
        'timestamp': datetime.now().isoformat()
    }), 200

# ── Helpers ────────────────────────────────────────────────────────────────────

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def gen_id(prefix):
    ts  = datetime.now().strftime('%Y%m%d%H%M%S')
    uid = str(uuid.uuid4())[:6].upper()
    return f"{prefix}-{ts}-{uid}"

def notify(subject, message):
    if not app.config.get('SNS_TOPIC_ARN'):
        return
    try:
        sns.publish(TopicArn=app.config['SNS_TOPIC_ARN'],
                    Subject=subject, Message=message)
    except Exception as e:
        app.logger.warning(f"SNS failed: {e}")

def upload_s3(file, filename):
    try:
        s3.upload_fileobj(file, app.config['S3_BUCKET'],
                          f"complaint-images/{filename}",
                          ExtraArgs={'ContentType': file.content_type})
        if app.config.get('CDN_DOMAIN'):
            return f"https://{app.config['CDN_DOMAIN']}/complaint-images/{filename}"
        return (f"https://{app.config['S3_BUCKET']}.s3.{app.config['AWS_REGION']}.amazonaws.com"
                f"/complaint-images/{filename}")
    except Exception as e:
        app.logger.error(f"S3 error: {e}")
        return None

def logged_in():  return 'user_id' in session
def is_admin():   return session_role() in ('panchayat_admin', 'super_admin')

# ── Multi-tenant authorization helpers ────────────────────────────────────────
# Tenant scope is ALWAYS derived from the authenticated session, never from
# client-supplied parameters (except explicit super-admin overrides, which are
# validated against the Panchayats table and audited).

def normalize_role(role):
    """Legacy 'admin' accounts are panchayat admins."""
    if role in ('admin', 'panchayat_admin'):
        return 'panchayat_admin'
    if role == 'super_admin':
        return 'super_admin'
    return 'villager'


def session_role():
    return normalize_role(session.get('role'))


def is_super_admin():
    return session_role() == 'super_admin'


def audit(panchayat_id, action, resource_id, result, details=''):
    """Append an audit event. Never raises — audit failures must not break requests."""
    try:
        audit_log_table.put_item(Item={
            'audit_id':   gen_id('AUD'),
            'panchayatId': panchayat_id or 'PLATFORM',
            'timestamp':  datetime.now().isoformat(),
            'actorId':    session.get('user_id', 'anonymous'),
            'actorName':  session.get('username', ''),
            'action':     action,
            'resourceId': str(resource_id)[:120],
            'result':     result,
            'details':    str(details)[:500],
        })
    except Exception as e:
        app.logger.warning(f"audit log failed: {e}")


def get_panchayat(panchayat_id):
    if not panchayat_id:
        return None
    return panchayats_table.get_item(Key={'panchayatId': panchayat_id}).get('Item')


def tenant_scope_or_error():
    """Resolve the tenant scope for this request.

    Returns (panchayat_id, error_response):
    - panchayat_admin / villager: implicit scope from their session
    - super_admin: optional explicit ?panchayatId= (must exist and be active),
      otherwise (None, None) meaning platform-wide
    """
    role = session_role()
    if role == 'super_admin':
        requested = request.args.get('panchayatId', '').strip()
        if requested:
            p = get_panchayat(requested)
            if not p:
                return None, (jsonify({'error': 'Panchayat not found'}), 404)
            return requested, None
        return None, None
    panchayat_id = session.get('panchayatId')
    if not panchayat_id:
        return None, (jsonify({'error': 'Your account has no Panchayat assigned. Contact the administrator.'}), 403)
    return panchayat_id, None


def tenant_forbidden_response(panchayat_id):
    audit(panchayat_id, 'CROSS_TENANT_ACCESS_DENIED', request.path, 'DENIED',
          details=f"actor tenant={session.get('panchayatId')} requested={panchayat_id}")
    return jsonify({'error': 'Access denied'}), 403

# ── Village directory ──────────────────────────────────────────────────────────

DATA_DIR    = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
VILLAGE_INDEX_FILE = os.path.join(DATA_DIR, 'villages_index.json')

_village_index = None   # rows: "Village|District|SubDistrict|State"
_village_keys  = None   # lowercase village names, same order (for bisect)

def _load_villages():
    global _village_index, _village_keys
    if _village_index is None:
        with open(VILLAGE_INDEX_FILE, encoding='utf-8') as f:
            _village_index = json.load(f)
        _village_keys = [r.split('|', 1)[0].lower() for r in _village_index]
    return _village_index, _village_keys

@app.route('/api/villages')
def api_villages():
    q = request.args.get('search', '').strip().lower()
    limit = min(int(request.args.get('limit', 50)), 100)
    if len(q) < 2:
        return jsonify({'villages': []})

    rows, keys = _load_villages()

    # Prefix matches first (index is sorted by lowercase name)
    hits = []
    start = bisect_left(keys, q)
    for i in range(start, len(rows)):
        if not keys[i].startswith(q):
            break
        hits.append(i)

    # Not enough prefix hits: fall back to substring contains
    if len(hits) < limit:
        found = set(hits)
        for i, k in enumerate(keys):
            if len(hits) >= limit * 2:
                break
            if q in k and i not in found:
                hits.append(i)
                found.add(i)

    villages = []
    for i in hits[:limit]:
        parts = rows[i].split('|')
        name = parts[0] if len(parts) > 0 else ""
        district = parts[1] if len(parts) > 1 else ""
        sub_district = parts[2] if len(parts) > 2 else ""
        state = parts[3] if len(parts) > 3 else ""
        
        # In case some records only have 3 parts (Village|District|State)
        if len(parts) == 3:
            sub_district = ""
            state = parts[2]
            
        villages.append({
            'name': name, 'district': district,
            'sub_district': sub_district, 'state': state,
        })
    return jsonify({'villages': villages})

# ── React SPA serving ──────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def spa(path):
    # API misses return JSON, not the SPA shell
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, 'index.html')

# ── Error handlers ─────────────────────────────────────────────────────────────

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large! Maximum size is 1 MB.'}), 413

# ── REST API ───────────────────────────────────────────────────────────────────

@app.route('/api/stats')
def api_stats():
    """Platform-wide aggregate counters (public, no tenant detail)."""
    c = complaints_table.scan()['Items']
    return jsonify({
        'total':       len(c),
        'pending':     sum(1 for x in c if x['status'] == 'Pending'),
        'in_progress': sum(1 for x in c if x['status'] == 'In Progress'),
        'resolved':    sum(1 for x in c if x['status'] == 'Resolved'),
    })


# ── Super admin: platform administration ─────────────────────────────────────

def require_super_admin():
    if not logged_in() or session_role() != 'super_admin':
        return jsonify({'error': 'Unauthorized'}), 403
    return None


@app.route('/api/super/panchayats', methods=['GET'])
def api_super_panchayats():
    err = require_super_admin()
    if err:
        return err
    try:
        panchayats = sorted(panchayats_table.scan()['Items'],
                            key=lambda p: p.get('panchayatId', ''))

        # Build complaint counts per panchayat with a single scan
        # (avoids needing PanchayatIndex GSI which may not exist locally)
        all_complaints = complaints_table.scan(
            ProjectionExpression='panchayatId'
        )['Items']
        complaint_counts = {}
        for c in all_complaints:
            pid = c.get('panchayatId', '')
            complaint_counts[pid] = complaint_counts.get(pid, 0) + 1

        out = []
        for p in panchayats:
            pid = p['panchayatId']
            out.append({
                'panchayatId': pid,
                'name': p.get('name', ''),
                'district': p.get('district', ''),
                'state': p.get('state', ''),
                'contactEmail': p.get('contactEmail', ''),
                'contactPhone': p.get('contactPhone', ''),
                'status': p.get('status', 'ACTIVE'),
                'createdAt': p.get('createdAt', ''),
                'complaintCount': count,
            })
        return jsonify({'panchayats': out})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load panchayats'}), 500


@app.route('/api/super/panchayats', methods=['POST'])
def api_super_create_panchayat():
    err = require_super_admin()
    if err:
        return err

    data = request.json or {}
    name        = str(data.get('name', '')).strip()
    district    = str(data.get('district', '')).strip()
    state       = str(data.get('state', '')).strip()
    contact_email = str(data.get('contactEmail', '')).strip()
    contact_phone = str(data.get('contactPhone', '')).strip()

    if not name:
        return jsonify({'error': 'Panchayat name is required'}), 400

    panchayat_id = data.get('panchayatId', '').strip().upper() or gen_id('PB')
    if get_panchayat(panchayat_id):
        return jsonify({'error': 'A panchayat with this ID already exists'}), 409

    now = datetime.now().isoformat()
    panchayats_table.put_item(Item={
        'panchayatId':   panchayat_id,
        'name':          name,
        'district':      district,
        'state':         state,
        'contactEmail':  contact_email,
        'contactPhone':  contact_phone,
        'status':        'ACTIVE',
        'createdAt':     now,
        'updatedAt':     now,
    })

    # Optionally create the panchayat admin in the same step
    admin_username = str(data.get('adminUsername', '')).strip()
    admin_email    = str(data.get('adminEmail', '')).strip()
    admin_password = str(data.get('adminPassword', ''))
    admin_created = False
    if admin_username and admin_email and admin_password:
        if len(admin_password) < 6:
            return jsonify({'error': 'Admin password must be at least 6 characters'}), 400
        existing = users_table.scan(FilterExpression=Attr('username').eq(admin_username))
        if existing['Count'] > 0:
            return jsonify({'error': 'Admin username already taken'}), 409
        users_table.put_item(Item={
            'user_id':       gen_id('USR'),
            'username':      admin_username,
            'email':         admin_email,
            'password_hash': hash_pw(admin_password),
            'role':          'panchayat_admin',
            'panchayatId':   panchayat_id,
            'village':       name,
            'phone':         str(data.get('adminPhone', '')),
            'created_at':    now,
        })
        admin_created = True

    audit('PLATFORM', 'PANCHAYAT_CREATED', panchayat_id, 'SUCCESS',
          details=f"{name}; admin={'created' if admin_created else 'none'}")
    return jsonify({'panchayat': get_panchayat(panchayat_id), 'adminCreated': admin_created}), 201


@app.route('/api/super/panchayats/<panchayat_id>', methods=['PUT'])
def api_super_update_panchayat(panchayat_id):
    err = require_super_admin()
    if err:
        return err

    panchayat = get_panchayat(panchayat_id)
    if not panchayat:
        return jsonify({'error': 'Panchayat not found'}), 404

    data = request.json or {}
    status = data.get('status')
    if status not in ('ACTIVE', 'SUSPENDED'):
        return jsonify({'error': 'Status must be ACTIVE or SUSPENDED'}), 400

    panchayat['status'] = status
    panchayat['updatedAt'] = datetime.now().isoformat()
    for field in ('name', 'district', 'state', 'contactEmail', 'contactPhone'):
        if data.get(field):
            panchayat[field] = str(data[field]).strip()
    panchayats_table.put_item(Item=panchayat)

    audit('PLATFORM', f'PANCHAYAT_{status}', panchayat_id, 'SUCCESS')
    return jsonify({'panchayat': panchayat})


@app.route('/api/super/overview', methods=['GET'])
def api_super_overview():
    err = require_super_admin()
    if err:
        return err
    try:
        panchayats = panchayats_table.scan()['Items']
        users = users_table.scan()['Items']
        complaints = complaints_table.scan()['Items']
        resolved = sum(1 for c in complaints if c.get('status') == 'Resolved')
        return jsonify({
            'totalPanchayats': len(panchayats),
            'activePanchayats': sum(1 for p in panchayats if p.get('status') == 'ACTIVE'),
            'suspendedPanchayats': sum(1 for p in panchayats if p.get('status') == 'SUSPENDED'),
            'totalUsers': len(users),
            'totalComplaints': len(complaints),
            'resolvedComplaints': resolved,
            'resolutionRate': round(resolved / len(complaints) * 100) if complaints else None,
        })
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load platform overview'}), 500


@app.route('/api/super/audit', methods=['GET'])
def api_super_audit():
    err = require_super_admin()
    if err:
        return err
    try:
        items = audit_log_table.scan()['Items']
        items = sorted(items, key=lambda x: x.get('timestamp', ''), reverse=True)[:100]
        return jsonify({'events': items})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load audit log'}), 500


@app.route('/api/auth/me')
def api_auth_me():
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401
    user = users_table.get_item(Key={'user_id': session['user_id']}).get('Item')
    if not user:
        return jsonify({'error': 'User not found'}), 404
    # Remove sensitive data
    user.pop('password_hash', None)
    user['role'] = normalize_role(user.get('role'))
    panchayat = get_panchayat(user.get('panchayatId'))
    return jsonify({
        'user': user,
        'panchayat': {'panchayatId': panchayat['panchayatId'], 'name': panchayat['name']} if panchayat else None,
    })


@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    username = request.json.get('username', '').strip()
    password = request.json.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    result = users_table.scan(FilterExpression=Attr('username').eq(username))
    if result['Count'] == 0:
        return jsonify({'error': 'User not found'}), 401

    user = result['Items'][0]
    if user['password_hash'] != hash_pw(password):
        return jsonify({'error': 'Incorrect password'}), 401

    role = normalize_role(user.get('role'))
    panchayat_id = user.get('panchayatId')

    # Panchayat-scoped accounts require an active panchayat
    if role != 'super_admin':
        if not panchayat_id:
            return jsonify({'error': 'Your account has no Panchayat assigned. Contact the platform administrator.'}), 403
        panchayat = get_panchayat(panchayat_id)
        if not panchayat:
            return jsonify({'error': 'Your Panchayat is not configured. Contact the platform administrator.'}), 403
        if panchayat.get('status') == 'SUSPENDED':
            return jsonify({'error': 'This Panchayat is currently suspended. Contact the platform administrator.'}), 403

    session.update({
        'user_id':     user['user_id'],
        'username':    user['username'],
        'role':        role,
        'village':     user.get('village', ''),
        'email':       user['email'],
        'panchayatId': panchayat_id,
    })

    user.pop('password_hash', None)
    user['role'] = role
    return jsonify({'user': user})


@app.route('/api/auth/logout', methods=['POST'])
def api_auth_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/auth/register', methods=['POST'])
def api_auth_register():
    data = request.json
    username    = data.get('username', '').strip()
    email       = data.get('email', '').strip()
    password    = data.get('password', '')
    village     = data.get('village', '').strip()
    phone       = data.get('phone', '').strip()
    panchayat_id = data.get('panchayatId', '').strip()

    if not all([username, email, password, village, phone, panchayat_id]):
        return jsonify({'error': 'All fields are required'}), 400

    # Tenant assignment: the submitted panchayat code must exist and be active.
    # Client input is only a selector — it is validated server-side here.
    panchayat = get_panchayat(panchayat_id)
    if not panchayat:
        return jsonify({'error': 'Unknown Panchayat code'}), 400
    if panchayat.get('status') != 'ACTIVE':
        return jsonify({'error': 'This Panchayat is not accepting registrations'}), 400

    existing = users_table.scan(FilterExpression=Attr('username').eq(username))
    if existing['Count'] > 0:
        return jsonify({'error': 'Username already taken'}), 409

    user_id = gen_id('USR')
    users_table.put_item(Item={
        'user_id':       user_id,
        'username':      username,
        'email':         email,
        'password_hash': hash_pw(password),
        'role':          'villager',
        'panchayatId':   panchayat_id,
        'village':       village,
        'phone':         phone,
        'created_at':    datetime.now().isoformat()
    })

    audit(panchayat_id, 'CITIZEN_REGISTERED', user_id, 'SUCCESS', details=username)

    # Auto-login after registration
    session.update({
        'user_id':     user_id,
        'username':    username,
        'role':        'villager',
        'village':     village,
        'email':       email,
        'panchayatId': panchayat_id,
    })

    user = users_table.get_item(Key={'user_id': user_id}).get('Item')
    user.pop('password_hash', None)
    return jsonify({'user': user})


# ── Public panchayat directory (id + name only, active tenants) ───────────────
@app.route('/api/panchayats', methods=['GET'])
def api_panchayats_public():
    try:
        items = panchayats_table.scan()['Items']
        active = sorted(
            (p for p in items if p.get('status') == 'ACTIVE'),
            key=lambda p: p.get('name', ''),
        )
        return jsonify({'panchayats': [
            {'panchayatId': p['panchayatId'], 'name': p['name'], 'district': p.get('district', '')}
            for p in active
        ]})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load panchayats'}), 500


@app.route('/api/complaints', methods=['GET'])
def api_complaints():
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401

    scope, err = tenant_scope_or_error()
    if err:
        return err

    role = session_role()
    if role == 'villager':
        result = complaints_table.scan(FilterExpression=(
            Attr('panchayatId').eq(scope) & Attr('user_id').eq(session['user_id'])))
    elif scope:
        # Panchayat admin (or super admin with explicit scope): tenant query
        result = complaints_table.query(
            IndexName='PanchayatIndex',
            KeyConditionExpression=Key('panchayatId').eq(scope),
        )
    else:
        # Super admin platform-wide view
        result = complaints_table.scan()

    complaints = sorted(result['Items'], key=lambda x: x['submitted_at'], reverse=True)
    return jsonify({'complaints': complaints})


@app.route('/api/complaints/<cid>', methods=['GET'])
def api_complaint_detail(cid):
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401

    complaint = complaints_table.get_item(Key={'complaint_id': cid}).get('Item')
    if not complaint:
        return jsonify({'error': 'Complaint not found'}), 404

    role = session_role()
    user_panchayat = session.get('panchayatId')

    if role == 'villager':
        if complaint.get('user_id') != session.get('user_id') or complaint.get('panchayatId') != user_panchayat:
            return tenant_forbidden_response(complaint.get('panchayatId'))
    elif role == 'panchayat_admin':
        if complaint.get('panchayatId') != user_panchayat:
            return tenant_forbidden_response(complaint.get('panchayatId'))
    elif role == 'super_admin':
        audit(complaint.get('panchayatId'), 'SUPER_ADMIN_COMPLAINT_VIEW', cid, 'SUCCESS')

    return jsonify({'complaint': complaint})


@app.route('/api/complaints', methods=['POST'])
def api_create_complaint():
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401
    if session_role() != 'villager':
        return jsonify({'error': 'Only citizens can file complaints'}), 403

    panchayat_id = session.get('panchayatId')
    panchayat = get_panchayat(panchayat_id)
    if not panchayat or panchayat.get('status') != 'ACTIVE':
        return jsonify({'error': 'Your Panchayat is not active'}), 403

    data = request.json
    category    = data.get('category')
    title       = data.get('title', '').strip() or category
    description = data.get('description', '').strip()

    if not category or len(description) < 20:
        return jsonify({'error': 'Invalid category or description too short'}), 400

    cid = gen_id('CMP')
    submitted = datetime.now().isoformat()

    complaints_table.put_item(Item={
        'complaint_id':  cid,
        'panchayatId':   panchayat_id,
        'user_id':       session['user_id'],
        'username':      session['username'],
        'email':         session['email'],
        'category':      category,
        'title':         title,
        'description':   description,
        'image_url':     data.get('image_url', ''),
        'status':        'Pending',
        'village':       session['village'],
        'submitted_at':  submitted,
        'updated_at':    submitted,
        'admin_remarks': '',
        'timeline': [{'status': 'Pending', 'remarks': '', 'at': submitted}]
    })

    audit(panchayat_id, 'COMPLAINT_CREATED', cid, 'SUCCESS', details=category)

    notify(
        subject=f"New Complaint: {category} – {session['village']}",
        message=(f"Complaint ID: {cid}\n"
                 f"From: {session['username']} ({session['village']})\n"
                 f"Category: {category}\n"
                 f"Description: {description}\n"
                 f"Submitted: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    )

    complaint = complaints_table.get_item(Key={'complaint_id': cid}).get('Item')
    return jsonify({'complaint': complaint}), 201


@app.route('/api/complaints/<cid>/status', methods=['PUT'])
def api_update_complaint_status(cid):
    role = session_role()
    if role not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403

    existing = complaints_table.get_item(Key={'complaint_id': cid}).get('Item')
    if not existing:
        return jsonify({'error': 'Complaint not found'}), 404

    complaint_tenant = existing.get('panchayatId')
    if role == 'panchayat_admin' and complaint_tenant != session.get('panchayatId'):
        return tenant_forbidden_response(complaint_tenant)

    data = request.json
    status  = data.get('status')
    remarks = data.get('remarks', '')
    now     = datetime.now().isoformat()

    complaints_table.update_item(
        Key={'complaint_id': cid},
        UpdateExpression=('SET #st = :s, admin_remarks = :r, updated_at = :u, '
                          'timeline = list_append(if_not_exists(timeline, :empty), :event)'),
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={
            ':s': status, ':r': remarks, ':u': now,
            ':empty': [],
            ':event': [{'status': status, 'remarks': remarks, 'at': now}]
        }
    )

    audit(complaint_tenant, 'COMPLAINT_STATUS_CHANGED', cid, 'SUCCESS',
          details=f"{existing.get('status')} -> {status}")

    c = complaints_table.get_item(Key={'complaint_id': cid}).get('Item', {})
    notify(
        subject=f"Complaint {cid} Updated – {status}",
        message=(f"Your complaint status has changed.\n"
                 f"ID: {cid}\nCategory: {c.get('category')}\n"
                 f"New Status: {status}\nRemarks: {remarks}")
    )

    complaint = complaints_table.get_item(Key={'complaint_id': cid}).get('Item')
    return jsonify({'complaint': complaint})


@app.route('/api/notices', methods=['GET'])
def api_notices():
    """Notices are tenant-owned. Logged-in users get their panchayat's notices
    implicitly; anonymous visitors must name an active panchayat (?p=PB001)."""
    try:
        if logged_in():
            scope, err = tenant_scope_or_error()
            if err:
                return err
            if not scope:
                return jsonify({'notices': []})
        else:
            scope = request.args.get('p', '').strip()
            panchayat = get_panchayat(scope)
            if not panchayat or panchayat.get('status') != 'ACTIVE':
                return jsonify({'error': 'Unknown or inactive Panchayat'}), 404

        result = notices_table.query(
            IndexName='PanchayatIndex',
            KeyConditionExpression=Key('panchayatId').eq(scope),
        )
        all_n = sorted(result['Items'], key=lambda x: x['posted_at'], reverse=True)
        return jsonify({'notices': all_n})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load notices'}), 500


@app.route('/api/notices/<notice_id>', methods=['GET'])
def api_notice_detail(notice_id):
    try:
        notice = notices_table.get_item(Key={'notice_id': notice_id}).get('Item')
        if not notice:
            return jsonify({'error': 'Notice not found'}), 404
        panchayat = get_panchayat(notice.get('panchayatId'))
        if not panchayat or panchayat.get('status') != 'ACTIVE':
            return jsonify({'error': 'Notice not found'}), 404
        return jsonify({'notice': notice})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load notice'}), 500


@app.route('/api/notices', methods=['POST'])
def api_create_notice():
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403

    panchayat_id = session.get('panchayatId')
    if not panchayat_id:
        return jsonify({'error': 'Your account has no Panchayat assigned'}), 403

    data = request.json
    notice_id = gen_id('NTC')
    notices_table.put_item(Item={
        'notice_id':   notice_id,
        'panchayatId': panchayat_id,
        'title':       data.get('title'),
        'content':     data.get('content'),
        'category':    data.get('category'),
        'posted_by':   session['username'],
        'posted_at':   datetime.now().isoformat(),
        'expiry_date': data.get('expiry_date', '')
    })

    audit(panchayat_id, 'NOTICE_PUBLISHED', notice_id, 'SUCCESS',
          details=str(data.get('title', '')))

    notice = notices_table.get_item(Key={'notice_id': notice_id}).get('Item')
    return jsonify({'notice': notice}), 201


@app.route('/api/uploads', methods=['POST'])
def api_upload_file():
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401

    file = request.files.get('file')
    if not file or file.filename == '':
        return jsonify({'error': 'No file provided'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Use JPG, PNG or WEBP.'}), 400

    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{gen_id('IMG')}.{ext}"
    url      = upload_s3(file, filename)
    if not url:
        return jsonify({'error': 'Upload failed. Please try again.'}), 500

    return jsonify({'url': url}), 201


@app.route('/api/schemes')
def api_schemes():
    # Real, centrally-run schemes with their actual administering ministries.
    # myscheme_url points to the scheme's page on the national myScheme
    # directory (each URL verified live).
    schemes_data = [
        {'id': 'pm-awas-yojana',
         'name': 'PM Awas Yojana (PMAY)',
         'department': 'Ministry of Rural Development',
         'category': 'Housing',
         'description': 'Financial assistance to build pucca houses for rural families.',
         'benefit': 'Up to ₹1.2 lakh assistance', 'eligibility': 'BPL families without pucca house',
         'link': 'https://pmaymis.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pmay'},
        {'id': 'pm-kisan-samman-nidhi',
         'name': 'PM Kisan Samman Nidhi',
         'department': 'Ministry of Agriculture and Farmers Welfare',
         'category': 'Agriculture',
         'description': 'Direct income support of ₹6,000/year to farmer families.',
         'benefit': '₹6,000/year in 3 installments', 'eligibility': 'Farmers with < 2 hectares land',
         'link': 'https://pmkisan.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pm-kisan-samman-nidhi'},
        {'id': 'jal-jeevan-mission',
         'name': 'Jal Jeevan Mission',
         'department': 'Ministry of Jal Shakti',
         'category': 'Water & Sanitation',
         'description': 'Tap water connection to every rural household.',
         'benefit': 'Free tap water connection', 'eligibility': 'Rural households without tap',
         'link': 'https://jaljeevanmission.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/jal-jeevan-mission'},
        {'id': 'pm-ujjwala-yojana',
         'name': 'PM Ujjwala Yojana',
         'department': 'Ministry of Petroleum and Natural Gas',
         'category': 'Energy',
         'description': 'Free LPG connection to BPL families.',
         'benefit': 'Free cylinder + connection', 'eligibility': 'BPL women without LPG',
         'link': 'https://pmuy.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pm-ujjwala-yojana'},
        {'id': 'mgnrega',
         'name': 'MGNREGA',
         'department': 'Ministry of Rural Development',
         'category': 'Employment',
         'description': '100 days guaranteed employment per year to rural households.',
         'benefit': '100 days of work at minimum wage', 'eligibility': 'Any rural adult',
         'link': 'https://nrega.nic.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/mgnrega'},
        {'id': 'ayushman-bharat-pm-jay',
         'name': 'Ayushman Bharat (PM-JAY)',
         'department': 'Ministry of Health and Family Welfare',
         'category': 'Health',
         'description': 'Health cover for secondary and tertiary hospitalisation of poor families.',
         'benefit': 'Free treatment cover of ₹5 lakh per family per year',
         'eligibility': 'Low-income families identified under SECC criteria',
         'link': 'https://www.myscheme.gov.in/schemes/ayushman-bharat-pm-jay',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/ayushman-bharat-pm-jay'},
        {'id': 'pm-fasal-bima-yojana',
         'name': 'PM Fasal Bima Yojana',
         'department': 'Ministry of Agriculture and Farmers Welfare',
         'category': 'Agriculture',
         'description': 'Crop insurance against natural calamities, pests and diseases.',
         'benefit': 'Insurance cover at low premium (2% for kharif crops)',
         'eligibility': 'Farmers growing notified crops in notified areas',
         'link': 'https://pmfby.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pm-fasal-bima-yojana'},
        {'id': 'atal-pension-yojana',
         'name': 'Atal Pension Yojana',
         'department': 'Ministry of Finance',
         'category': 'Finance',
         'description': 'Guaranteed monthly pension for unorganised sector workers after 60.',
         'benefit': 'Guaranteed pension of ₹1,000 to ₹5,000 per month',
         'eligibility': 'Citizens aged 18–40 with a savings bank account',
         'link': 'https://www.myscheme.gov.in/schemes/atal-pension-yojana',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/atal-pension-yojana'},
        {'id': 'sukanya-samriddhi-yojana',
         'name': 'Sukanya Samriddhi Yojana',
         'department': 'Ministry of Finance',
         'category': 'Social Welfare',
         'description': 'Savings scheme for a girl child’s education and marriage expenses.',
         'benefit': 'High-interest savings account with tax benefits',
         'eligibility': 'Parents or guardians of a girl child below 10 years',
         'link': 'https://www.indiapost.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/sukanya-samriddhi-yojana'},
        {'id': 'pradhan-mantri-matru-vandana-yojana',
         'name': 'Pradhan Mantri Matru Vandana Yojana',
         'department': 'Ministry of Women and Child Development',
         'category': 'Social Welfare',
         'description': 'Maternity benefit for the first living child of the family.',
         'benefit': '₹5,000 cash benefit directly to the mother’s account',
         'eligibility': 'Pregnant women and lactating mothers aged 19 or above',
         'link': 'https://pmmvy.wcd.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-matru-vandana-yojana'},
        {'id': 'swachh-bharat-mission-grameen',
         'name': 'Swachh Bharat Mission (Grameen)',
         'department': 'Ministry of Jal Shakti',
         'category': 'Water & Sanitation',
         'description': 'Incentive support for building individual household latrines in rural areas.',
         'benefit': 'Incentive for constructing an individual household toilet',
         'eligibility': 'Rural households without a toilet',
         'link': 'https://swachhbharatmission.ddws.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/swachh-bharat-mission-grameen'},
        {'id': 'pradhan-mantri-gram-sadak-yojana',
         'name': 'Pradhan Mantri Gram Sadak Yojana',
         'department': 'Ministry of Rural Development',
         'category': 'Rural Development',
         'description': 'All-weather road connectivity for eligible rural habitations.',
         'benefit': 'All-weather roads connecting villages to markets and services',
         'eligibility': 'Rural habitations meeting the population criteria under the programme',
         'link': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-gram-sadak-yojana',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-gram-sadak-yojana'},
        {'id': 'pm-vishwakarma',
         'name': 'PM Vishwakarma',
         'department': 'Ministry of Micro, Small and Medium Enterprises',
         'category': 'Employment',
         'description': 'Support for traditional artisans and craftspeople in 18 trades.',
         'benefit': 'Skill training, toolkit incentive and collateral-free loans up to ₹3 lakh',
         'eligibility': 'Traditional artisans and craftspeople engaged in notified trades',
         'link': 'https://pmvishwakarma.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pm-vishwakarma'},
        {'id': 'pradhan-mantri-kaushal-vikas-yojana',
         'name': 'PM Kaushal Vikas Yojana',
         'department': 'Ministry of Skill Development and Entrepreneurship',
         'category': 'Employment',
         'description': 'Short-term skill training and certification for Indian youth.',
         'benefit': 'Free skill training and government-recognised certification',
         'eligibility': 'Indian youth who are school or college dropouts or unemployed',
         'link': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-kaushal-vikas-yojana',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-kaushal-vikas-yojana'},
        {'id': 'national-social-assistance-programme',
         'name': 'National Social Assistance Programme',
         'department': 'Ministry of Rural Development',
         'category': 'Social Welfare',
         'description': 'Pensions and benefits for elderly, widows and persons with disabilities.',
         'benefit': 'Monthly old-age, widow and disability pensions',
         'eligibility': 'BPL senior citizens, widows and persons with disabilities',
         'link': 'https://www.myscheme.gov.in/schemes/national-social-assistance-programme',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/national-social-assistance-programme'},
        {'id': 'pm-poshan',
         'name': 'PM POSHAN (Mid-Day Meal)',
         'department': 'Ministry of Education',
         'category': 'Education',
         'description': 'Hot cooked mid-day meals for children in government and aided schools.',
         'benefit': 'One nutritious meal every school day',
         'eligibility': 'Children in classes I–VIII of government and government-aided schools',
         'link': 'https://www.myscheme.gov.in/schemes/pm-poshan',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pm-poshan'},
        {'id': 'samagra-shiksha',
         'name': 'Samagra Shiksha',
         'department': 'Ministry of Education',
         'category': 'Education',
         'description': 'Integrated support for school education from pre-school to class XII.',
         'benefit': 'School infrastructure, uniforms, textbooks and inclusive education support',
         'eligibility': 'Students of government and government-aided schools',
         'link': 'https://www.myscheme.gov.in/schemes/samagra-shiksha',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/samagra-shiksha'},
        {'id': 'national-means-cum-merit-scholarship',
         'name': 'National Means-cum-Merit Scholarship',
         'department': 'Ministry of Education',
         'category': 'Education',
         'description': 'Scholarship for meritorious students of small families to prevent dropout after class VIII.',
         'benefit': '₹12,000 per year scholarship',
         'eligibility': 'Merit students of classes IX–XII from families earning up to ₹3.5 lakh a year',
         'link': 'https://scholarships.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/national-means-cum-merit-scholarship'},
        {'id': 'kisan-credit-card',
         'name': 'Kisan Credit Card',
         'department': 'Ministry of Agriculture and Farmers Welfare',
         'category': 'Agriculture',
         'description': 'Short-term crop loans with simple repayment for cultivators.',
         'benefit': 'Crop loans up to ₹3 lakh with 4% effective interest on prompt repayment',
         'eligibility': 'Farmers, including tenant farmers and oral lessees',
         'link': 'https://www.myscheme.gov.in/schemes/kisan-credit-card',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/kisan-credit-card'},
        {'id': 'national-agriculture-market',
         'name': 'e-NAM (National Agriculture Market)',
         'department': 'Ministry of Agriculture and Farmers Welfare',
         'category': 'Agriculture',
         'description': 'Online trading platform connecting APMC mandis across India.',
         'benefit': 'Better price discovery with direct online payment to the farmer',
         'eligibility': 'Registered farmers, traders and APMC mandis',
         'link': 'https://enam.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/national-agriculture-market'},
        {'id': 'pradhan-mantri-matsya-sampada-yojana',
         'name': 'Pradhan Mantri Matsya Sampada Yojana',
         'department': 'Ministry of Fisheries, Animal Husbandry and Dairying',
         'category': 'Agriculture',
         'description': 'Development of fisheries, aquaculture and fishers’ welfare.',
         'benefit': 'Subsidies for ponds, fish farming and fishing equipment',
         'eligibility': 'Fishers, fish farmers and fisheries workers',
         'link': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-matsya-sampada-yojana',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-matsya-sampada-yojana'},
        {'id': 'deendayal-antyodaya-yojana',
         'name': 'Deendayal Antyodaya Yojana (NRLM)',
         'department': 'Ministry of Rural Development',
         'category': 'Rural Development',
         'description': 'Community institutions and credit access for rural poor households.',
         'benefit': 'Self-help groups with revolving fund and bank credit linkage',
         'eligibility': 'Rural poor households, with one woman member mobilised into an SHG',
         'link': 'https://www.myscheme.gov.in/schemes/deendayal-antyodaya-yojana',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/deendayal-antyodaya-yojana'},
        {'id': 'pradhan-mantri-suraksha-bima-yojana',
         'name': 'Pradhan Mantri Suraksha Bima Yojana',
         'department': 'Ministry of Finance',
         'category': 'Finance',
         'description': 'Affordable accidental death and disability insurance.',
         'benefit': '₹2 lakh accidental death cover at ₹20 per year',
         'eligibility': 'Savings bank account holders aged 18–70',
         'link': 'https://jansuraksha.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-suraksha-bima-yojana'},
        {'id': 'pradhan-mantri-jeevan-jyoti-bima-yojana',
         'name': 'Pradhan Mantri Jeevan Jyoti Bima Yojana',
         'department': 'Ministry of Finance',
         'category': 'Finance',
         'description': 'Affordable one-year life insurance renewed automatically.',
         'benefit': '₹2 lakh life cover at ₹436 per year',
         'eligibility': 'Savings bank account holders aged 18–50',
         'link': 'https://jansuraksha.gov.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-jeevan-jyoti-bima-yojana'},
        {'id': 'pradhan-mantri-mudra-yojana',
         'name': 'Pradhan Mantri Mudra Yojana',
         'department': 'Ministry of Finance',
         'category': 'Finance',
         'description': 'Collateral-free loans for non-farm income-generating activity.',
         'benefit': 'Loans up to ₹10 lakh for micro and small businesses',
         'eligibility': 'Micro entrepreneurs running shops, small manufacturing or services',
         'link': 'https://www.mudra.org.in',
         'myscheme_url': 'https://www.myscheme.gov.in/schemes/pradhan-mantri-mudra-yojana'},
    ]
    return jsonify({'schemes': schemes_data})


@app.route('/api/dashboard/citizen')
def api_dashboard_citizen():
    if not logged_in():
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        panchayat_id = session.get('panchayatId')
        if not panchayat_id:
            return jsonify({'error': 'Your account has no Panchayat assigned'}), 403
        result = complaints_table.scan(
            FilterExpression=(Attr('panchayatId').eq(panchayat_id)
                              & Attr('user_id').eq(session['user_id'])))
        complaints = sorted(result['Items'],
                            key=lambda x: x['submitted_at'], reverse=True)

        return jsonify({
            'complaints': complaints,
            'stats': {
                'total': len(complaints),
                'pending': sum(1 for c in complaints if c['status'] == 'Pending'),
                'in_progress': sum(1 for c in complaints if c['status'] == 'In Progress'),
                'resolved': sum(1 for c in complaints if c['status'] == 'Resolved'),
            }
        })
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load dashboard'}), 500


@app.route('/api/dashboard/admin')
def api_dashboard_admin():
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        scope, err = tenant_scope_or_error()
        if err:
            return err

        if scope:
            # Tenant query — never a full-table scan for ordinary admins
            result = complaints_table.query(
                IndexName='PanchayatIndex',
                KeyConditionExpression=Key('panchayatId').eq(scope),
            )
            all_c = result['Items']
        else:
            # Super admin platform view
            all_c = complaints_table.scan()['Items']
        total = len(all_c)

        cats = {}
        for c in all_c:
            cats[c.get('category', 'Other')] = cats.get(c.get('category', 'Other'), 0) + 1

        # Calculate average resolution time
        res_seconds = []
        for c in all_c:
            if c.get('status') == 'Resolved':
                try:
                    delta = (datetime.fromisoformat(c['updated_at'])
                             - datetime.fromisoformat(c['submitted_at']))
                    if delta.total_seconds() >= 0:
                        res_seconds.append(delta.total_seconds())
                except (KeyError, ValueError):
                    pass
        avg_resolution_hours = (sum(res_seconds) / len(res_seconds) / 3600
                                if res_seconds else None)

        complaints = sorted(all_c, key=lambda x: x['submitted_at'], reverse=True)

        return jsonify({
            'complaints': complaints,
            'stats': {
                'total': total,
                'pending': sum(1 for c in all_c if c['status'] == 'Pending'),
                'in_progress': sum(1 for c in all_c if c['status'] == 'In Progress'),
                'resolved': sum(1 for c in all_c if c['status'] == 'Resolved'),
                'avg_resolution_hours': avg_resolution_hours,
                'categories': cats
            }
        })
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load dashboard'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
