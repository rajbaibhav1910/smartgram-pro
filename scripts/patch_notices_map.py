import io

path = r'C:\PROJECT-PROJECT REPORT\AWS\SmartGram-Pro\app.py'
s = io.open(path, encoding='utf-8').read()

# ── Notices: tenant scoping ──
old = """@app.route('/api/notices', methods=['GET'])
def api_notices():
    try:
        all_n = notices_table.scan()['Items']
        all_n = sorted(all_n, key=lambda x: x['posted_at'], reverse=True)
        return jsonify({'notices': all_n})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load notices'}), 500"""
new = """@app.route('/api/notices', methods=['GET'])
def api_notices():
    \"\"\"Notices are tenant-owned. Logged-in users get their panchayat's notices
    implicitly; anonymous visitors must name an active panchayat (?p=PB001).\"\"\"
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
        return jsonify({'error': 'Failed to load notices'}), 500"""
assert old in s, 'notices GET'
s = s.replace(old, new)

old = """        notice = notices_table.get_item(Key={'notice_id': notice_id}).get('Item')
        if not notice:
            return jsonify({'error': 'Notice not found'}), 404
        return jsonify({'notice': notice})"""
new = """        notice = notices_table.get_item(Key={'notice_id': notice_id}).get('Item')
        if not notice:
            return jsonify({'error': 'Notice not found'}), 404
        panchayat = get_panchayat(notice.get('panchayatId'))
        if not panchayat or panchayat.get('status') != 'ACTIVE':
            return jsonify({'error': 'Notice not found'}), 404
        return jsonify({'notice': notice})"""
assert old in s, 'notice detail'
s = s.replace(old, new)

old = """    data = request.json
    notice_id = gen_id('NTC')
    notices_table.put_item(Item={
        'notice_id':   notice_id,
        'title':       data.get('title'),
        'content':     data.get('content'),
        'category':    data.get('category'),
        'posted_by':   session['username'],
        'posted_at':   datetime.now().isoformat(),
        'expiry_date': data.get('expiry_date', '')
    })

    notice = notices_table.get_item(Key={'notice_id': notice_id}).get('Item')
    return jsonify({'notice': notice}), 201"""
new = """    panchayat_id = session.get('panchayatId')
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
    return jsonify({'notice': notice}), 201"""
assert old in s, 'notices POST'
s = s.replace(old, new)

old = """@app.route('/api/notices', methods=['POST'])
def api_create_notice():
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403"""
new = """@app.route('/api/notices', methods=['POST'])
def api_create_notice():
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403"""
assert old in s, 'notices POST guard'
s = s.replace(old, new)

# ── Map features: tenant scoping ──
old = """@app.route('/api/map/features', methods=['GET'])
def api_map_features():
    try:
        items = map_assets_table.scan()['Items']
        features = [_feature_from_item(i) for i in items]
        return jsonify({'type': 'FeatureCollection', 'features': features})
    except Exception as e:
        app.logger.error(f"DynamoDB error: {e}")
        return jsonify({'error': 'Failed to load map features'}), 500"""
new = """@app.route('/api/map/features', methods=['GET'])
def api_map_features():
    \"\"\"GIS features are tenant-owned; scope is implicit for logged-in users.\"\"\"
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
        return jsonify({'error': 'Failed to load map features'}), 500"""
assert old in s, 'map GET'
s = s.replace(old, new)

old = """@app.route('/api/map/features/<feature_id>', methods=['GET'])
def api_map_feature(feature_id):
    item = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not item:
        return jsonify({'error': 'Feature not found'}), 404
    return jsonify({'feature': _feature_from_item(item)})"""
new = """@app.route('/api/map/features/<feature_id>', methods=['GET'])
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
    return jsonify({'feature': _feature_from_item(item)})"""
assert old in s, 'map detail'
s = s.replace(old, new)

old = """    now = datetime.now().isoformat()
    feature_id = gen_id('MAP')
    item = {
        'feature_id': feature_id,
        'feature_type': feature['feature_type'],"""
new = """    panchayat_id = session.get('panchayatId')
    if not panchayat_id:
        return jsonify({'error': 'Your account has no Panchayat assigned'}), 403

    now = datetime.now().isoformat()
    feature_id = gen_id('MAP')
    item = {
        'feature_id': feature_id,
        'panchayatId': panchayat_id,
        'feature_type': feature['feature_type'],"""
assert old in s, 'map create stamp'
s = s.replace(old, new)

old = """    map_assets_table.put_item(Item=item)
    return jsonify({'feature': _feature_from_item(item)}), 201"""
new = """    map_assets_table.put_item(Item=item)
    audit(panchayat_id, 'MAP_FEATURE_CREATED', feature_id, 'SUCCESS',
          details=feature['properties'].get('name', ''))
    return jsonify({'feature': _feature_from_item(item)}), 201"""
assert old in s, 'map create audit'
s = s.replace(old, new)

old = """    existing = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not existing:
        return jsonify({'error': 'Feature not found'}), 404
    feature, error = _clean_feature_payload(request.json or {})
    if error:
        return jsonify({'error': error}), 400"""
new = """    existing = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not existing:
        return jsonify({'error': 'Feature not found'}), 404
    if session_role() == 'panchayat_admin' and existing.get('panchayatId') != session.get('panchayatId'):
        return tenant_forbidden_response(existing.get('panchayatId'))
    feature, error = _clean_feature_payload(request.json or {})
    if error:
        return jsonify({'error': error}), 400"""
assert old in s, 'map update guard'
s = s.replace(old, new)

old = """    existing = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not existing:
        return jsonify({'error': 'Feature not found'}), 404
    map_assets_table.delete_item(Key={'feature_id': feature_id})
    return jsonify({'success': True})"""
new = """    existing = map_assets_table.get_item(Key={'feature_id': feature_id}).get('Item')
    if not existing:
        return jsonify({'error': 'Feature not found'}), 404
    if session_role() == 'panchayat_admin' and existing.get('panchayatId') != session.get('panchayatId'):
        return tenant_forbidden_response(existing.get('panchayatId'))
    map_assets_table.delete_item(Key={'feature_id': feature_id})
    audit(existing.get('panchayatId'), 'MAP_FEATURE_DELETED', feature_id, 'SUCCESS')
    return jsonify({'success': True})"""
assert old in s, 'map delete guard'
s = s.replace(old, new)

old = """@app.route('/api/map/features', methods=['POST'])
def api_map_create_feature():
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403"""
new = """@app.route('/api/map/features', methods=['POST'])
def api_map_create_feature():
    if session_role() not in ('panchayat_admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403"""
assert old in s, 'map create guard'
s = s.replace(old, new)

s = s.replace("def api_map_update_feature(feature_id):\n    if not is_admin():",
              "def api_map_update_feature(feature_id):\n    if session_role() not in ('panchayat_admin', 'super_admin'):")
s = s.replace("def api_map_delete_feature(feature_id):\n    if not is_admin():",
              "def api_map_delete_feature(feature_id):\n    if session_role() not in ('panchayat_admin', 'super_admin'):")

io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
print('notices + map endpoints tenant-scoped')
