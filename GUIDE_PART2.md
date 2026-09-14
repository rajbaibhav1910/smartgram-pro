# SmartGram Pro – GUIDE PART 2
## Sections 9–16: Software, Flask App, DB, S3, SNS

---

# SECTION 9 — INSTALL SOFTWARE ON EC2

After connecting to EC2, run these commands one by one:

```bash
# 1. Update package list — always do this first
sudo apt update -y
# Why: Downloads latest info about available packages from Ubuntu servers

# 2. Upgrade installed packages
sudo apt upgrade -y
# Why: Security patches and bug fixes

# 3. Install Python 3 and pip
sudo apt install python3 python3-pip python3-venv -y
# Why: Flask runs on Python. pip installs Python packages. venv = virtual environment

# 4. Install git
sudo apt install git -y
# Why: To clone your code repository (optional but good practice)

# 5. Install Nginx
sudo apt install nginx -y
# Why: Web server that sits in front of Flask, handles port 80, SSL, load balancing

# 6. Check versions
python3 --version    # Should show Python 3.10.x
pip3 --version       # Should show pip 22.x
nginx -v             # Should show nginx/1.18.x

# 7. Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
# Why: enable = starts Nginx automatically on every server reboot
```

---

# SECTION 10 — CREATE PROJECT STRUCTURE

```bash
# Create project directory
mkdir -p /home/ubuntu/smartgram
cd /home/ubuntu/smartgram

# Create virtual environment
python3 -m venv venv
# Why: Isolates project dependencies from system Python

# Activate virtual environment
source venv/bin/activate
# You'll see (venv) in prompt — this means it's active

# Install required packages
pip install flask boto3 werkzeug gunicorn

# Packages explained:
# flask       - web framework
# boto3       - AWS SDK for Python (talks to DynamoDB, S3, SNS)
# werkzeug    - password hashing, file utilities
# gunicorn    - production WSGI server (better than Flask dev server)
```

## Complete Folder Structure
```
/home/ubuntu/smartgram/
├── app.py                    ← Main Flask application
├── config.py                 ← Configuration (region, bucket name, etc.)
├── requirements.txt          ← Python package list
├── venv/                     ← Virtual environment (auto-created)
├── static/
│   ├── css/
│   │   └── style.css         ← Custom CSS
│   ├── js/
│   │   └── main.js           ← JavaScript
│   └── images/
│       └── logo.png          ← App logo
├── templates/
│   ├── base.html             ← Base template (navbar, footer)
│   ├── index.html            ← Home page
│   ├── login.html            ← Login page
│   ├── register.html         ← Register page
│   ├── complaint.html        ← Submit complaint form
│   ├── my_complaints.html    ← Track my complaints
│   ├── admin.html            ← Admin dashboard
│   ├── notices.html          ← Notices page
│   └── schemes.html          ← Government schemes
└── lambda/
    └── pending_reminder.py   ← Lambda function code
```

```bash
# Create all folders
mkdir -p /home/ubuntu/smartgram/{static/css,static/js,static/images,templates,lambda}
```

---

# SECTION 11 — COMPLETE FLASK APPLICATION

## config.py
```python
# config.py — Central configuration file
import os

class Config:
    # Flask secret key — used to encrypt session cookies
    # In production, use a long random string
    SECRET_KEY = 'smartgram-secret-key-change-in-production-2024'
    
    # AWS Configuration
    AWS_REGION = 'us-east-1'  # Must match region where you created services
    
    # S3 Bucket name — replace with YOUR bucket name
    S3_BUCKET = 'smartgram-pro-images-ramesh2024'
    
    # DynamoDB Table Names
    USERS_TABLE = 'SmartGramUsers'
    COMPLAINTS_TABLE = 'SmartGramComplaints'
    NOTICES_TABLE = 'SmartGramNotices'
    
    # SNS Topic ARN — you'll get this after creating SNS topic
    SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789:SmartGramAlerts'
    
    # File upload settings
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1 MB max image size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
```

## app.py (Complete Flask Application)
```python
# app.py — Main SmartGram Pro Flask Application
# ============================================

from flask import (Flask, render_template, request, redirect, 
                   url_for, session, flash, jsonify)
import boto3
import uuid
import hashlib
import os
from datetime import datetime
from config import Config
from werkzeug.utils import secure_filename

# ── Initialize Flask App ─────────────────────────────────────────────────────
app = Flask(__name__)
app.config.from_object(Config)

# ── Initialize AWS Clients ────────────────────────────────────────────────────
# boto3 automatically uses the IAM Role attached to EC2
# No need for access keys/secret keys!

dynamodb = boto3.resource('dynamodb', region_name=app.config['AWS_REGION'])
s3_client = boto3.client('s3', region_name=app.config['AWS_REGION'])
sns_client = boto3.client('sns', region_name=app.config['AWS_REGION'])

# Get DynamoDB table references
users_table     = dynamodb.Table(app.config['USERS_TABLE'])
complaints_table = dynamodb.Table(app.config['COMPLAINTS_TABLE'])
notices_table   = dynamodb.Table(app.config['NOTICES_TABLE'])

# ── Helper Functions ──────────────────────────────────────────────────────────

def hash_password(password):
    """Hash password using SHA-256. In production use bcrypt."""
    return hashlib.sha256(password.encode()).hexdigest()

def allowed_file(filename):
    """Check if uploaded file extension is allowed."""
    return ('.' in filename and 
            filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS'])

def generate_id(prefix):
    """Generate unique ID with prefix and timestamp."""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    short_uuid = str(uuid.uuid4())[:6].upper()
    return f"{prefix}-{timestamp}-{short_uuid}"

def send_sns_notification(subject, message):
    """Send email notification via SNS."""
    try:
        sns_client.publish(
            TopicArn=app.config['SNS_TOPIC_ARN'],
            Subject=subject,
            Message=message
        )
    except Exception as e:
        print(f"SNS Error: {e}")  # Don't crash app if SNS fails

def upload_to_s3(file, filename):
    """Upload file to S3 and return public URL."""
    try:
        s3_client.upload_fileobj(
            file,
            app.config['S3_BUCKET'],
            f"complaint-images/{filename}",
            ExtraArgs={'ContentType': file.content_type}
        )
        url = f"https://{app.config['S3_BUCKET']}.s3.amazonaws.com/complaint-images/{filename}"
        return url
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        return None

def is_logged_in():
    """Check if user is logged in."""
    return 'user_id' in session

def is_admin():
    """Check if logged-in user is admin."""
    return session.get('role') == 'admin'

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Home page — shows summary stats."""
    try:
        # Count total complaints
        complaints_count = complaints_table.scan(Select='COUNT')['Count']
        # Count resolved complaints
        resolved = complaints_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('status').eq('Resolved'),
            Select='COUNT'
        )['Count']
        # Count notices
        notices_count = notices_table.scan(Select='COUNT')['Count']
    except:
        complaints_count = resolved = notices_count = 0
    
    return render_template('index.html',
                           complaints_count=complaints_count,
                           resolved=resolved,
                           notices_count=notices_count)


@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration."""
    if request.method == 'POST':
        username = request.form['username'].strip()
        email    = request.form['email'].strip()
        password = request.form['password']
        village  = request.form['village'].strip()
        phone    = request.form['phone'].strip()
        role     = request.form.get('role', 'villager')  # default: villager
        
        # Validate input
        if not all([username, email, password, village, phone]):
            flash('All fields are required!', 'danger')
            return render_template('register.html')
        
        # Check if username already exists
        existing = users_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('username').eq(username)
        )
        if existing['Count'] > 0:
            flash('Username already taken. Choose another.', 'warning')
            return render_template('register.html')
        
        # Create user record
        user_id = generate_id('USR')
        users_table.put_item(Item={
            'user_id':       user_id,
            'username':      username,
            'email':         email,
            'password_hash': hash_password(password),
            'role':          role,
            'village':       village,
            'phone':         phone,
            'created_at':    datetime.now().isoformat()
        })
        
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login."""
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password']
        
        # Find user by username
        result = users_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('username').eq(username)
        )
        
        if result['Count'] == 0:
            flash('User not found. Please register first.', 'danger')
            return render_template('login.html')
        
        user = result['Items'][0]
        
        # Verify password
        if user['password_hash'] != hash_password(password):
            flash('Wrong password. Try again.', 'danger')
            return render_template('login.html')
        
        # Set session
        session['user_id']  = user['user_id']
        session['username'] = user['username']
        session['role']     = user['role']
        session['village']  = user['village']
        session['email']    = user['email']
        
        flash(f"Welcome back, {user['username']}!", 'success')
        
        if user['role'] == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')


@app.route('/logout')
def logout():
    """Clear session and logout."""
    username = session.get('username', 'User')
    session.clear()
    flash(f'Goodbye, {username}! You have been logged out.', 'info')
    return redirect(url_for('index'))


@app.route('/dashboard')
def dashboard():
    """Villager dashboard — my complaints."""
    if not is_logged_in():
        flash('Please login first.', 'warning')
        return redirect(url_for('login'))
    
    # Get complaints for this user
    result = complaints_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr('user_id').eq(session['user_id'])
    )
    my_complaints = sorted(result['Items'], 
                           key=lambda x: x['submitted_at'], 
                           reverse=True)
    
    return render_template('dashboard.html', complaints=my_complaints)


@app.route('/complaint', methods=['GET', 'POST'])
def submit_complaint():
    """Submit a new complaint with optional image."""
    if not is_logged_in():
        flash('Please login to submit a complaint.', 'warning')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        category    = request.form['category']
        description = request.form['description'].strip()
        
        if not description:
            flash('Please describe the complaint.', 'danger')
            return render_template('complaint.html')
        
        image_url = None
        
        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_name = f"{generate_id('IMG')}_{filename}"
                image_url = upload_to_s3(file, unique_name)
        
        # Create complaint record
        complaint_id = generate_id('CMP')
        complaints_table.put_item(Item={
            'complaint_id':  complaint_id,
            'user_id':       session['user_id'],
            'username':      session['username'],
            'email':         session['email'],
            'category':      category,
            'description':   description,
            'image_url':     image_url or '',
            'status':        'Pending',
            'village':       session['village'],
            'submitted_at':  datetime.now().isoformat(),
            'updated_at':    datetime.now().isoformat(),
            'admin_remarks': ''
        })
        
        # Send SNS notification to admin
        send_sns_notification(
            subject=f"New Complaint: {category} from {session['village']}",
            message=(f"Complaint ID: {complaint_id}\n"
                     f"From: {session['username']} ({session['village']})\n"
                     f"Category: {category}\n"
                     f"Description: {description}\n"
                     f"Submitted: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        )
        
        flash(f'Complaint submitted! Your ID: {complaint_id}', 'success')
        return redirect(url_for('dashboard'))
    
    categories = ['Road Damage', 'Water Supply', 'Electricity', 
                  'Sanitation', 'School/Education', 'Health', 
                  'Agriculture', 'Other']
    return render_template('complaint.html', categories=categories)


@app.route('/admin')
def admin_dashboard():
    """Admin dashboard with analytics."""
    if not is_admin():
        flash('Admin access required.', 'danger')
        return redirect(url_for('login'))
    
    # Get all complaints
    all_complaints = complaints_table.scan()['Items']
    
    # Analytics
    total     = len(all_complaints)
    pending   = sum(1 for c in all_complaints if c['status'] == 'Pending')
    progress  = sum(1 for c in all_complaints if c['status'] == 'In Progress')
    resolved  = sum(1 for c in all_complaints if c['status'] == 'Resolved')
    
    # Category breakdown
    categories = {}
    for c in all_complaints:
        cat = c.get('category', 'Other')
        categories[cat] = categories.get(cat, 0) + 1
    
    # Sort by newest first
    all_complaints = sorted(all_complaints, 
                            key=lambda x: x['submitted_at'], 
                            reverse=True)
    
    return render_template('admin.html',
                           complaints=all_complaints,
                           total=total,
                           pending=pending,
                           in_progress=progress,
                           resolved=resolved,
                           categories=categories)


@app.route('/admin/update_status', methods=['POST'])
def update_status():
    """Admin updates complaint status."""
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    complaint_id = request.form['complaint_id']
    new_status   = request.form['status']
    remarks      = request.form.get('remarks', '')
    
    # Update in DynamoDB
    complaints_table.update_item(
        Key={'complaint_id': complaint_id},
        UpdateExpression='SET #st = :s, admin_remarks = :r, updated_at = :u',
        ExpressionAttributeNames={'#st': 'status'},  # 'status' is reserved word
        ExpressionAttributeValues={
            ':s': new_status,
            ':r': remarks,
            ':u': datetime.now().isoformat()
        }
    )
    
    # Get complaint to find villager email
    complaint = complaints_table.get_item(
        Key={'complaint_id': complaint_id}
    ).get('Item', {})
    
    # Notify villager
    if complaint.get('email'):
        send_sns_notification(
            subject=f"Complaint {complaint_id} Status Update",
            message=(f"Your complaint has been updated.\n"
                     f"Complaint ID: {complaint_id}\n"
                     f"Category: {complaint.get('category')}\n"
                     f"New Status: {new_status}\n"
                     f"Admin Remarks: {remarks}\n"
                     f"Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        )
    
    flash(f'Status updated to {new_status}', 'success')
    return redirect(url_for('admin_dashboard'))


@app.route('/notices')
def notices():
    """View all notices."""
    all_notices = notices_table.scan()['Items']
    all_notices = sorted(all_notices, 
                         key=lambda x: x['posted_at'], 
                         reverse=True)
    return render_template('notices.html', notices=all_notices)


@app.route('/admin/post_notice', methods=['POST'])
def post_notice():
    """Admin posts a new notice."""
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    notice_id = generate_id('NTC')
    notices_table.put_item(Item={
        'notice_id':   notice_id,
        'title':       request.form['title'],
        'content':     request.form['content'],
        'category':    request.form['category'],
        'posted_by':   session['username'],
        'posted_at':   datetime.now().isoformat(),
        'expiry_date': request.form.get('expiry_date', '')
    })
    
    flash('Notice posted successfully!', 'success')
    return redirect(url_for('admin_dashboard'))


@app.route('/schemes')
def schemes():
    """Government schemes page (static content)."""
    schemes_data = [
        {
            'name': 'PM Awas Yojana (PMAY)',
            'description': 'Housing for All scheme providing financial assistance to build pucca houses.',
            'benefit': 'Up to ₹1.2 lakh assistance',
            'eligibility': 'BPL families without pucca house',
            'link': 'https://pmaymis.gov.in'
        },
        {
            'name': 'PM Kisan Samman Nidhi',
            'description': 'Direct income support of ₹6,000/year to farmer families.',
            'benefit': '₹6,000 per year in 3 installments',
            'eligibility': 'Small & marginal farmers with less than 2 hectares',
            'link': 'https://pmkisan.gov.in'
        },
        {
            'name': 'Jal Jeevan Mission',
            'description': 'Providing tap water connection to every rural household by 2024.',
            'benefit': 'Free tap water connection',
            'eligibility': 'Rural households without tap connection',
            'link': 'https://jaljeevanmission.gov.in'
        },
        {
            'name': 'Pradhan Mantri Ujjwala Yojana',
            'description': 'Free LPG connection to BPL families.',
            'benefit': 'Free LPG cylinder + connection',
            'eligibility': 'BPL women not having LPG connection',
            'link': 'https://pmuy.gov.in'
        },
        {
            'name': 'MGNREGA',
            'description': 'Guarantees 100 days of employment per year to rural households.',
            'benefit': '100 days of work at minimum wage',
            'eligibility': 'Rural adult willing to do manual labor',
            'link': 'https://nrega.nic.in'
        }
    ]
    return render_template('schemes.html', schemes=schemes_data)


@app.route('/api/stats')
def api_stats():
    """API endpoint returning complaint stats as JSON (for dashboard charts)."""
    complaints = complaints_table.scan()['Items']
    stats = {
        'total':       len(complaints),
        'pending':     sum(1 for c in complaints if c['status'] == 'Pending'),
        'in_progress': sum(1 for c in complaints if c['status'] == 'In Progress'),
        'resolved':    sum(1 for c in complaints if c['status'] == 'Resolved'),
    }
    return jsonify(stats)


# ── Run Application ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Debug=False for production
    app.run(host='0.0.0.0', port=5000, debug=False)
```

---

# SECTION 14 — DYNAMODB INTEGRATION EXPLAINED

## Key boto3 Operations

### 1. put_item — Create a new record
```python
complaints_table.put_item(Item={
    'complaint_id': 'CMP-001',
    'status': 'Pending',
    # ... all fields
})
# Inserts new item. If complaint_id already exists, it REPLACES the item.
```

### 2. get_item — Read one specific record
```python
result = complaints_table.get_item(
    Key={'complaint_id': 'CMP-001'}  # Must provide partition key
)
item = result.get('Item')  # Returns None if not found
```

### 3. scan — Read ALL records (with optional filter)
```python
# Get all pending complaints
result = complaints_table.scan(
    FilterExpression=Attr('status').eq('Pending')
)
items = result['Items']  # List of dictionaries
count = result['Count']  # Number of matching items
```
⚠️ WARNING: scan reads the ENTIRE table. For large tables, use `query` with GSI (Global Secondary Index). For this project, scan is fine.

### 4. update_item — Update specific fields
```python
complaints_table.update_item(
    Key={'complaint_id': 'CMP-001'},
    UpdateExpression='SET #st = :s, updated_at = :u',
    ExpressionAttributeNames={'#st': 'status'},  # 'status' is a reserved word!
    ExpressionAttributeValues={
        ':s': 'Resolved',
        ':u': '2024-01-16T10:00:00'
    }
)
# Only updates specified fields. Other fields are untouched.
```

### 5. delete_item — Remove a record
```python
complaints_table.delete_item(
    Key={'complaint_id': 'CMP-001'}
)
```

---

# SECTION 15 — S3 IMAGE UPLOAD

## How It Works
```python
def upload_to_s3(file, filename):
    """
    file     - FileStorage object from Flask (request.files['image'])
    filename - unique filename to save as in S3
    """
    s3_client.upload_fileobj(
        file,              # File-like object
        'your-bucket-name', # Bucket name
        f"complaint-images/{filename}",  # S3 key (path inside bucket)
        ExtraArgs={
            'ContentType': file.content_type  # 'image/jpeg', 'image/png', etc.
        }
    )
    # Build public URL
    url = f"https://your-bucket.s3.amazonaws.com/complaint-images/{filename}"
    return url
```

## Display Images in HTML
```html
<!-- In your template, if image_url exists -->
{% if complaint.image_url %}
  <img src="{{ complaint.image_url }}" 
       alt="Complaint Image" 
       class="img-fluid rounded"
       style="max-height: 300px;">
{% else %}
  <p class="text-muted">No image uploaded</p>
{% endif %}
```

## Validate File Size in Flask
```python
# In config.py
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1 MB

# Flask automatically returns 413 error if file exceeds this
# Handle it:
@app.errorhandler(413)
def too_large(e):
    flash('File too large! Maximum size is 1 MB.', 'danger')
    return redirect(url_for('submit_complaint'))
```

---

# SECTION 16 — SNS NOTIFICATIONS

## Step 1: Create SNS Topic
1. AWS Console → SNS → Topics → "Create topic"
2. Type: **Standard** (not FIFO)
3. Name: `SmartGramAlerts`
4. Click "Create topic"
5. Copy the **Topic ARN** — looks like:
   `arn:aws:sns:us-east-1:123456789012:SmartGramAlerts`
6. Paste this ARN in your `config.py` file

## Step 2: Add Email Subscription
1. Click your topic → "Create subscription"
2. Protocol: **Email**
3. Endpoint: your-email@gmail.com
4. Click "Create subscription"
5. Check your email inbox → Click "Confirm subscription" link
6. ✅ Now your email will receive all SNS messages

## Step 3: Send Notification from Flask
```python
def send_sns_notification(subject, message):
    """Send email via SNS."""
    sns_client = boto3.client('sns', region_name='us-east-1')
    
    response = sns_client.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:SmartGramAlerts',
        Subject=subject,     # Email subject line (max 100 chars)
        Message=message      # Email body text
    )
    # response['MessageId'] - unique ID of this notification
    print(f"SNS sent: {response['MessageId']}")
```

## Add Villager Email to Same Topic (Optional)
For per-user notifications, you'd create subscriptions dynamically or use SES.
For this project: all notifications go to admin email (SNS topic).

---
