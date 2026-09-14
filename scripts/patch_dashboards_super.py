import io

path = r'C:\PROJECT-PROJECT REPORT\AWS\SmartGram-Pro\app.py'
s = io.open(path, encoding='utf-8').read()

# ── Citizen dashboard: tenant + user scoped ──
old = """    try:
        result = complaints_table.scan(
            FilterExpression=Attr('user_id').eq(session['user_id']))
        complaints = sorted(result['Items'],
                            key=lambda x: x['submitted_at'], reverse=True)"""
new = """    try:
        panchayat_id = session.get('panchayatId')
        if not panchayat_id:
            return jsonify({'error': 'Your account has no Panchayat assigned'}), 403
        result = complaints_table.scan(
            FilterExpression=(Attr('panchayatId').eq(panchayat_id)
                              & Attr('user_id').eq(session['user_id'])))
        complaints = sorted(result['Items'],
                            key=lambda x: x['submitted_at'], reverse=True)"""
assert old in s, 'citizen dashboard'
s = s.replace(old, new)

# ── Admin dashboard: tenant query + super admin explicit scope ──
old = """    try:
        all_c = complaints_table.scan()['Items']
        total = len(all_c)"""
new = """    try:
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
        total = len(all_c)"""
assert old in s, 'admin dashboard'
s = s.replace(old, new)

# ── Public stats: aggregate across tenants (platform totals) ──
old = """@app.route('/api/stats')
def api_stats():
    c = complaints_table.scan()['Items']
    return jsonify({
        'total':       len(c),
        'pending':     sum(1 for x in c if x['status'] == 'Pending'),
        'in_progress': sum(1 for x in c if x['status'] == 'In Progress'),
        'resolved':    sum(1 for x in c if x['status'] == 'Resolved'),
    })"""
new = """@app.route('/api/stats')
def api_stats():
    \"\"\"Platform-wide aggregate counters (public, no tenant detail).\"\"\"
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
        out = []
        for p in panchayats:
            pid = p['panchayatId']
            count = complaints_table.query(
                IndexName='PanchayatIndex',
                KeyConditionExpression=Key('panchayatId').eq(pid),
                Select='COUNT',
            )['Count']
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
        return jsonify({'error': 'Failed to load audit log'}), 500"""
assert old in s, 'stats'
s = s.replace(old, new)

io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
print('dashboards + stats + super-admin API done')
