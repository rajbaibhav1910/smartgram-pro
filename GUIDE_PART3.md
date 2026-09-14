# SmartGram Pro – GUIDE PART 3
## Sections 17–21: Lambda, EventBridge, CloudWatch, Deployment, Nginx

---

# SECTION 17 — AWS LAMBDA AUTOMATION

## Step 1: Create Lambda Function
1. AWS Console → Lambda → "Create function"
2. Choose: **Author from scratch**
3. Function name: `SmartGramPendingReminder`
4. Runtime: **Python 3.11**
5. Architecture: x86_64
6. Execution role: **Use existing role** → Select `SmartGramLambdaRole`
7. Click "Create function"

## Step 2: Upload Lambda Code
1. In the function page, scroll to **Code source**
2. Click the `lambda_function.py` file
3. Delete existing code, paste contents of `lambda/pending_reminder.py`
4. Click **Deploy** (orange button)

## Step 3: Add Environment Variables
1. Go to **Configuration** tab → **Environment variables** → Edit
2. Add:
   - `TABLE_NAME` = `SmartGramComplaints`
   - `SNS_TOPIC_ARN` = your full SNS ARN

## Step 4: Test Lambda
1. Click **Test** tab → Create new test event
2. Event name: `TestRun`
3. Event JSON: `{}`
4. Click **Test**
5. Check **Execution result** — should show `200` and count
6. Check your email for the notification!

## Lambda IAM Permissions Needed
Your `SmartGramLambdaRole` must have:
- `AmazonDynamoDBReadOnlyAccess` — to scan complaints table
- `AmazonSNSFullAccess` — to publish notifications
- `CloudWatchLogsFullAccess` — to write execution logs

---

# SECTION 18 — EVENTBRIDGE AUTOMATION

## Create Scheduled Rule (Daily 9 AM)

1. AWS Console → **EventBridge** → Rules → "Create rule"
2. Name: `SmartGramDailyReminder`
3. Description: "Triggers pending complaint reminder every day at 9 AM IST"
4. Rule type: **Schedule**
5. Click Next

### Schedule Expression
```
cron(30 3 * * ? *)
```
**Why 3:30 UTC?** 3:30 UTC = 9:00 AM IST (India Standard Time is UTC+5:30)

6. Click Next → Target types: **AWS service**
7. Target: **Lambda function**
8. Function: `SmartGramPendingReminder`
9. Click Next → Create rule

### Cron Expression Reference
| Expression | Meaning |
|---|---|
| `cron(0 9 * * ? *)` | Every day at 9:00 AM UTC |
| `cron(30 3 * * ? *)` | Every day at 9:00 AM IST |
| `cron(0 0 ? * MON *)` | Every Monday at midnight UTC |
| `rate(1 day)` | Every 24 hours from creation |

## Verify It Works
1. EventBridge → Rules → `SmartGramDailyReminder`
2. Click **Monitoring** tab
3. Invocation metrics will appear after first trigger

---

# SECTION 19 — CLOUDWATCH MONITORING

## What CloudWatch Does for SmartGram Pro
- Stores Flask application logs
- Tracks Lambda execution logs automatically
- Monitors EC2 CPU/memory/network
- Creates alarms when something goes wrong

## EC2 Metrics (Automatic)
Go to CloudWatch → Metrics → EC2 → Per-Instance Metrics:
- **CPUUtilization** — if > 80%, your server is under load
- **NetworkIn/NetworkOut** — traffic volume
- **StatusCheckFailed** — instance health

## Lambda Logs (Automatic)
CloudWatch → Log Groups → `/aws/lambda/SmartGramPendingReminder`
- Every Lambda execution creates a log stream
- Shows print() output, errors, duration, memory used

## Flask Application Logs on EC2
Add this to your `app.py` to write logs to CloudWatch:

```python
import logging
import boto3
from datetime import datetime

# Simple file logging (CloudWatch agent picks this up)
logging.basicConfig(
    filename='/var/log/smartgram.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)

# Use in routes:
# logging.info(f"Complaint {complaint_id} filed by {session['username']}")
```

## Create CloudWatch Alarm (EC2 CPU)
1. CloudWatch → Alarms → "Create alarm"
2. Select metric → EC2 → CPUUtilization → your instance
3. Condition: Greater than 80%
4. Period: 5 minutes
5. Action: SNS notification to `SmartGramAlerts`
6. Alarm name: `SmartGram-HighCPU`

---

# SECTION 20 — DEPLOYMENT

## Step 1: Copy Project to EC2

**Option A — Direct copy (SCP from Windows):**
```powershell
# Run in PowerShell on your local machine
scp -i "C:\Users\YourName\smartgram-key.pem" -r "C:\Users\baibh\Downloads\AWS\SmartGram-Pro" ubuntu@YOUR-EC2-IP:/home/ubuntu/smartgram
```

**Option B — Create files directly on EC2:**
```bash
# On EC2, create each file using nano editor
nano /home/ubuntu/smartgram/app.py
# Paste code → Ctrl+X → Y → Enter to save
```

## Step 2: Activate venv and Install Dependencies
```bash
cd /home/ubuntu/smartgram
source venv/bin/activate
pip install -r requirements.txt
```

## Step 3: Update config.py on EC2
```bash
nano config.py
# Update:
# S3_BUCKET = 'your-actual-bucket-name'
# SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:SmartGramAlerts'
```

## Step 4: Create Admin User in DynamoDB
Run this Python script once on EC2 to create default admin:
```bash
source venv/bin/activate
python3 << 'EOF'
import boto3, hashlib, uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('SmartGramUsers')
table.put_item(Item={
    'user_id':       'USR-ADMIN-001',
    'username':      'admin',
    'email':         'admin@smartgram.gov.in',
    'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
    'role':          'admin',
    'village':       'All Villages',
    'phone':         '9999999999',
    'created_at':    datetime.now().isoformat()
})
print("Admin created!")
EOF
```

## Step 5: Run Flask with Gunicorn
```bash
cd /home/ubuntu/smartgram
source venv/bin/activate

# Test run first (development)
python3 app.py
# Visit: http://YOUR-EC2-IP:5000

# Production run with Gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 2 app:app
```

## Step 6: Run as Background Service (Systemd)
```bash
sudo nano /etc/systemd/system/smartgram.service
```
Paste:
```ini
[Unit]
Description=SmartGram Pro Flask App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/smartgram
Environment="PATH=/home/ubuntu/smartgram/venv/bin"
ExecStart=/home/ubuntu/smartgram/venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl start smartgram
sudo systemctl enable smartgram
sudo systemctl status smartgram   # Should show: Active (running)
```

## Step 7: Open Ports in Security Group
EC2 → Security Groups → `SmartGram-SG` → Inbound rules:
- Port 22 (SSH) — your IP
- Port 80 (HTTP) — 0.0.0.0/0
- Port 5000 (Flask) — 0.0.0.0/0 (for testing)

## Access Your App
```
http://YOUR-EC2-PUBLIC-IP:5000     ← Flask direct
http://YOUR-EC2-PUBLIC-IP          ← via Nginx (after Section 21)
```

---

# SECTION 21 — NGINX SETUP

## Why Nginx?
- Handles port 80 (standard HTTP) → forwards to Flask on port 5000
- Serves static files faster than Flask
- Provides buffer for slow clients
- Foundation for SSL/HTTPS later

## Configure Nginx

```bash
# Create SmartGram Nginx config
sudo nano /etc/nginx/sites-available/smartgram
```

Paste this complete config:
```nginx
server {
    listen 80;
    server_name _;   # Accept any hostname/IP

    # Proxy all requests to Flask/Gunicorn
    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    # Serve static files directly via Nginx (faster)
    location /static/ {
        alias /home/ubuntu/smartgram/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Max upload size (match Flask config)
    client_max_body_size 2M;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/smartgram /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test config for syntax errors
sudo nginx -t
# Expected: "syntax is ok" and "test is successful"

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl restart nginx
```

## Verify Everything Running
```bash
sudo systemctl status nginx      # Active (running)
sudo systemctl status smartgram  # Active (running)

# Test locally on EC2
curl http://localhost
# Should return your Flask HTML page
```

Now visit `http://YOUR-EC2-PUBLIC-IP` in your browser — SmartGram Pro is live!
