# SmartGram Pro – Cloud-Based Digital Village Governance Platform
## COMPLETE IMPLEMENTATION GUIDE — PART 1

---

# SECTION 1 — PROJECT OVERVIEW

## What is SmartGram Pro?
SmartGram Pro is a cloud-powered web platform that brings digital governance to rural villages (gram panchayats). Instead of villagers walking to the panchayat office for every complaint or notice, they can do everything online — submit complaints, upload photos of problems, track progress, and receive SMS/email alerts.

## Real-World Problem It Solves
- Villagers have no digital way to report road damage, water supply issues, electricity failures
- Admin staff lose paper complaints and have no tracking system
- Notices are posted on walls and most people miss them
- No accountability — complaints vanish without resolution
- No analytics for admins to see problem patterns

## Project Objectives
1. Digitize complaint submission with photo evidence
2. Give every complaint a unique ID and real-time status tracking
3. Let admins post notices and government schemes online
4. Send automatic email alerts when complaints are filed/updated
5. Run daily Lambda automation to remind admin of pending complaints
6. Monitor everything with CloudWatch dashboards

## Features Summary
| Feature | Who Uses It |
|---|---|
| Register / Login | Villagers & Admin |
| Submit Complaint + Photo | Villagers |
| Track Complaint Status | Villagers |
| Admin Dashboard Analytics | Admin |
| Update Complaint Status | Admin |
| Post/View Notices | Admin + Villagers |
| View Government Schemes | Villagers |
| Email Alerts | Both |
| Daily Pending Reminder | Admin (automated) |

## AWS Services Used & Why

| Service | Why It's Used |
|---|---|
| **EC2** | Runs your Flask web server (Ubuntu VM in the cloud) |
| **DynamoDB** | NoSQL database — stores users, complaints, notices |
| **S3** | Stores uploaded complaint images (cheap, scalable) |
| **IAM** | Controls permissions — who can access what |
| **SNS** | Sends email alerts to admin and villagers |
| **Lambda** | Serverless function for daily pending-complaint automation |
| **EventBridge** | Schedules Lambda to run every day at 9 AM |
| **CloudWatch** | Logs, metrics, alarms for your entire system |

---

# SECTION 2 — COMPLETE AWS ARCHITECTURE

## Text Architecture Diagram

```
VILLAGER/ADMIN (Browser)
         |
         | HTTP Request
         v
[Route53 - Optional DNS]
         |
         v
[EC2 Ubuntu t2.micro]
  ├── Nginx (Port 80 → Port 5000)
  └── Flask App (Port 5000)
         |
         |─────────────────────────────────────┐
         v                                     v
[DynamoDB Tables]                        [S3 Bucket]
  ├── Users                          smartgram-images/
  ├── Complaints                       └── complaint_photos/
  └── Notices
         |
         v
[SNS Topic: SmartGramAlerts]
  └── Email Subscriptions (Admin, Villager)
         |
         v
[EventBridge Rule - Daily 9AM]
         |
         v
[Lambda Function: PendingComplaintReminder]
  └── Scans DynamoDB → Sends SNS Email
         |
         v
[CloudWatch]
  ├── EC2 Metrics
  ├── Lambda Logs
  └── Flask Application Logs
```

## Request Flow (Villager submits complaint)
1. Villager opens browser → hits public EC2 IP
2. Nginx receives request on Port 80 → forwards to Flask on Port 5000
3. Flask validates login session → renders complaint form
4. Villager fills form + attaches photo → submits
5. Flask uploads photo to S3 → gets image URL
6. Flask writes complaint record to DynamoDB (Complaints table)
7. Flask publishes SNS notification → admin gets email
8. Flask returns success page with Complaint ID
9. DynamoDB stores record with status = "Pending"

## Notification Flow
- Complaint Filed → SNS → Admin Email
- Status Updated → SNS → Villager Email
- Daily 9 AM → EventBridge → Lambda → Scan DynamoDB → SNS → Admin Email (pending list)

## Automation Flow
```
EventBridge (cron: 0 9 * * ? *)
    → Triggers Lambda (PendingComplaintReminder)
        → Scans DynamoDB for status = "Pending"
        → Counts pending complaints
        → Publishes message to SNS
            → Admin receives daily email summary
```

---

# SECTION 3 — AWS ACCOUNT SETUP

## Step 1: Sign Into AWS Console
- Go to: https://aws.amazon.com
- Click "Sign In to the Console"
- Use root account OR create an IAM user (recommended)

## Step 2: Select Region
**ALWAYS use us-east-1 (N. Virginia) for this project.**
Why? Free tier benefits apply per region. Some services like SNS and Lambda have more free tier quota. Keep all services in same region to avoid cross-region charges.

To set region: Top-right corner of AWS Console → Click region dropdown → Select "US East (N. Virginia) us-east-1"

## Step 3: Free Tier Precautions
⚠️ CRITICAL — READ CAREFULLY:
- EC2: Use ONLY t2.micro (750 hours/month free)
- DynamoDB: 25 GB free, 25 read/write capacity units
- S3: 5 GB free storage, 20,000 GET, 2,000 PUT requests/month
- Lambda: 1 million free invocations/month
- SNS: 1 million publishes/month, 1,000 email notifications/month
- CloudWatch: 10 custom metrics, 5 GB log data free

**Set a billing alarm:**
1. Go to AWS Console → Billing → Budgets
2. Create Budget → Cost Budget → $1 threshold
3. Add your email → You'll get alerted before charges happen

## Step 4: IAM Basics
IAM = Identity and Access Management
- Never use root account for daily work
- Create an IAM user with AdministratorAccess for yourself
- Create IAM Roles for services (EC2, Lambda) to access other services

**Create IAM Admin User:**
1. AWS Console → IAM → Users → Add User
2. Username: smartgram-admin
3. Check: AWS Management Console access
4. Permissions: Attach directly → AdministratorAccess
5. Download CSV with credentials — SAVE IT SAFELY

---

# SECTION 4 — CREATE DYNAMODB TABLES

## Open DynamoDB
AWS Console → Search "DynamoDB" → Click "Create table"

---

## Table 1: Users

| Setting | Value |
|---|---|
| Table name | `SmartGramUsers` |
| Partition key | `user_id` (String) |

**Steps:**
1. Click "Create table"
2. Table name: `SmartGramUsers`
3. Partition key: `user_id`, Type: String
4. Leave sort key blank
5. Table settings: Customize → Capacity mode: **On-demand** (free tier friendly)
6. Click "Create table" → Wait 30 seconds

**Example Record:**
```json
{
  "user_id": "USR001",
  "username": "ramesh_kumar",
  "email": "ramesh@village.com",
  "password_hash": "pbkdf2:sha256:...",
  "role": "villager",
  "village": "Rampur",
  "phone": "9876543210",
  "created_at": "2024-01-15T10:30:00"
}
```

---

## Table 2: Complaints

| Setting | Value |
|---|---|
| Table name | `SmartGramComplaints` |
| Partition key | `complaint_id` (String) |

**Steps:**
1. Click "Create table"
2. Table name: `SmartGramComplaints`
3. Partition key: `complaint_id`, Type: String
4. Capacity mode: On-demand
5. Click "Create table"

**Example Record:**
```json
{
  "complaint_id": "CMP-20240115-001",
  "user_id": "USR001",
  "username": "ramesh_kumar",
  "category": "Road Damage",
  "description": "Large pothole on main road near temple",
  "image_url": "https://smartgram-bucket.s3.amazonaws.com/complaints/CMP001.jpg",
  "status": "Pending",
  "village": "Rampur",
  "submitted_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00",
  "admin_remarks": ""
}
```

---

## Table 3: Notices

| Setting | Value |
|---|---|
| Table name | `SmartGramNotices` |
| Partition key | `notice_id` (String) |

**Steps:**
1. Click "Create table"
2. Table name: `SmartGramNotices`
3. Partition key: `notice_id`, Type: String
4. Capacity mode: On-demand
5. Click "Create table"

**Example Record:**
```json
{
  "notice_id": "NTC-20240115-001",
  "title": "Gram Sabha Meeting on 20 January",
  "content": "All villagers are invited to attend the gram sabha...",
  "category": "Meeting",
  "posted_by": "Sarpanch Mahesh Patel",
  "posted_at": "2024-01-15T09:00:00",
  "expiry_date": "2024-01-20"
}
```

---

# SECTION 5 — CREATE S3 BUCKET

## Step-by-Step Bucket Creation

1. AWS Console → S3 → "Create bucket"
2. **Bucket name:** `smartgram-pro-images-[your-name]`
   - Must be globally unique! Add your name or random number
   - Example: `smartgram-pro-images-ramesh2024`
   - Rules: lowercase only, no spaces, no underscores at start
3. **Region:** US East (N. Virginia) us-east-1
4. **Block Public Access:** UNCHECK "Block all public access"
   - Acknowledge the warning checkbox
   - This is needed so complaint images can be viewed in browser
5. **Versioning:** Disable (not needed for free tier)
6. Click "Create bucket"

## Add Bucket Policy (Allow Public Read)
1. Click your bucket name
2. Go to **Permissions** tab
3. Scroll to **Bucket policy** → Edit
4. Paste this policy (replace YOUR-BUCKET-NAME):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```
5. Click "Save changes"

## Create Folder Inside Bucket
1. Click bucket → "Create folder"
2. Folder name: `complaint-images`
3. Click "Create folder"

## Free Tier Precautions for S3
- Keep images under 1MB each (add validation in Flask)
- Total free: 5 GB — you have plenty for testing
- Delete test images after project to save space
- Enable S3 Storage Lens to monitor usage (free)

---

# SECTION 6 — CREATE IAM ROLE

## Why We Need an IAM Role
When your Flask app (running on EC2) needs to talk to DynamoDB, S3, and SNS — it needs permission. Instead of hardcoding AWS keys (NEVER DO THIS!), we attach an IAM Role to EC2. The role automatically provides temporary credentials.

## Step-by-Step Role Creation

1. AWS Console → IAM → Roles → "Create role"
2. **Trusted entity type:** AWS service
3. **Service:** EC2
4. Click Next

### Attach These Policies:

| Policy | Why |
|---|---|
| `AmazonDynamoDBFullAccess` | Read/write complaints, users, notices |
| `AmazonS3FullAccess` | Upload complaint images |
| `AmazonSNSFullAccess` | Send email alerts |
| `CloudWatchFullAccess` | Write logs and metrics |

5. Search and check each policy above
6. Click Next
7. **Role name:** `SmartGramEC2Role`
8. Description: "EC2 role for SmartGram Pro application"
9. Click "Create role"

## Lambda Role (Separate)
1. Create another role → Trust: Lambda
2. Attach: `AmazonDynamoDBReadOnlyAccess`, `AmazonSNSFullAccess`, `CloudWatchLogsFullAccess`
3. Role name: `SmartGramLambdaRole`

---

# SECTION 7 — LAUNCH EC2 INSTANCE

## Step-by-Step Launch

### Step 1: Open EC2
AWS Console → EC2 → "Launch instance"

### Step 2: Configure Instance
| Setting | Value | Why |
|---|---|---|
| Name | `SmartGram-Pro-Server` | Identify your server |
| AMI | Ubuntu Server 22.04 LTS (HVM) | Free tier, stable, popular |
| Architecture | 64-bit (x86) | Standard |
| Instance type | **t2.micro** | FREE TIER — 1 vCPU, 1 GB RAM |
| Key pair | Create new (see below) | SSH access |

### Step 3: Create Key Pair
1. Click "Create new key pair"
2. Name: `smartgram-key`
3. Type: RSA
4. Format: .pem (for Linux/Mac) OR .ppk (for PuTTY on Windows)
5. Click "Create key pair" → .pem file downloads automatically
6. **SAVE THIS FILE SAFELY — you cannot download it again!**
7. Move it to a safe folder: `C:\Users\YourName\smartgram-key.pem`

### Step 4: Network Settings
1. Click "Edit" next to Network settings
2. VPC: Default VPC (leave as is)
3. Subnet: No preference
4. Auto-assign public IP: **Enable** ← CRITICAL! Without this, no public access
5. Firewall: Create security group
6. Security group name: `SmartGram-SG`

### Step 5: Security Group Rules (Inbound)
Add these rules:

| Type | Port | Source | Why |
|---|---|---|---|
| SSH | 22 | My IP | Connect via terminal |
| HTTP | 80 | 0.0.0.0/0 | Web access (Nginx) |
| Custom TCP | 5000 | 0.0.0.0/0 | Flask direct access (testing) |
| HTTPS | 443 | 0.0.0.0/0 | Secure web (optional) |

### Step 6: Storage
- Root volume: 8 GB gp2 (default) — Free tier gives 30 GB, this is fine

### Step 7: Advanced Details
1. Scroll to "Advanced details"
2. **IAM instance profile:** Select `SmartGramEC2Role`
3. This gives EC2 access to DynamoDB, S3, SNS without any hardcoded keys

### Step 8: Launch
Click "Launch instance" → Wait 2-3 minutes → Status: Running

---

# SECTION 8 — CONNECT TO EC2

## Method 1: EC2 Instance Connect (Easiest — Browser Based)
1. Go to EC2 → Instances → Select your instance
2. Click "Connect" button (top right)
3. Click "EC2 Instance Connect" tab
4. Username: `ubuntu`
5. Click "Connect"
6. A browser terminal opens — no need for PEM file!

## Method 2: SSH from Windows Terminal
```bash
# First, fix PEM file permissions (run in PowerShell as Admin)
icacls "C:\Users\YourName\smartgram-key.pem" /inheritance:r /grant:r "%USERNAME%:R"

# Connect (replace YOUR-EC2-IP with actual Public IPv4 address)
ssh -i "C:\Users\YourName\smartgram-key.pem" ubuntu@YOUR-EC2-IP
```

## Method 3: PuTTY (Windows GUI)
1. Download PuTTY from putty.org
2. Convert .pem to .ppk using PuTTYgen
3. Open PuTTY → Host: ubuntu@YOUR-EC2-IP
4. Connection → SSH → Auth → Browse for .ppk file
5. Click Open

**Find Your Public IP:**
EC2 → Instances → Your instance → "Public IPv4 address" column
Example: 54.234.123.45

---
