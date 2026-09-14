# SmartGram Pro – GUIDE PART 4
## Sections 22–27: Testing, Troubleshooting, Viva Q&A, Resume, PPT, Future

---

# SECTION 22 — FINAL TESTING CHECKLIST

## Test 1: Register a Villager
1. Open `http://YOUR-EC2-IP`
2. Click Register → Fill all fields → Role: Villager → Submit
3. ✅ Check DynamoDB → `SmartGramUsers` → should have new record

## Test 2: Login
1. Login with your username/password
2. ✅ Should redirect to dashboard

## Test 3: Submit Complaint with Image
1. Click "Submit Complaint"
2. Select Category: Road Damage
3. Write description (min 20 chars)
4. Upload a small JPG photo
5. Submit
6. ✅ Note the Complaint ID shown (e.g., `CMP-20240115-A1B2C3`)
7. ✅ Check DynamoDB → `SmartGramComplaints` → new record with `status: Pending`
8. ✅ Check S3 bucket → `complaint-images/` folder → your photo is there
9. ✅ Check email inbox → SNS notification received

## Test 4: Admin Login & Status Update
1. Logout → Login as admin (username: admin, password: admin123)
2. ✅ Admin dashboard shows analytics cards
3. ✅ Chart shows complaint breakdown
4. Find the complaint → Click edit icon
5. Change status to "In Progress" → Add remarks → Update
6. ✅ DynamoDB record updated
7. ✅ Email notification sent

## Test 5: Post a Notice
1. In admin panel → Post Notice section
2. Title: "Gram Sabha on 25 January"
3. Category: Meeting → Content: some text → Submit
4. ✅ Go to Notices page → notice appears

## Test 6: Lambda Execution
1. Lambda Console → `SmartGramPendingReminder` → Test
2. ✅ Execution result shows 200
3. ✅ Email received with pending complaint list
4. ✅ CloudWatch → Logs → `/aws/lambda/SmartGramPendingReminder` → log entries visible

## Test 7: Government Schemes Page
1. Visit `/schemes`
2. ✅ All 5 schemes display with Apply buttons

---

# SECTION 23 — TROUBLESHOOTING

## Problem 1: Flask "ModuleNotFoundError"
```
ModuleNotFoundError: No module named 'flask'
```
**Fix:**
```bash
# Make sure venv is activated!
source /home/ubuntu/smartgram/venv/bin/activate
# Then run again
```

## Problem 2: Security Group — Connection Timeout
**Symptom:** Browser shows "This site can't be reached"
**Fix:**
1. EC2 → Security Groups → `SmartGram-SG`
2. Inbound rules → Verify Port 80 and Port 5000 are open to `0.0.0.0/0`
3. Also check EC2 instance is in "Running" state

## Problem 3: S3 Upload Error — Access Denied
```
botocore.exceptions.ClientError: AccessDenied
```
**Fix:**
1. Verify IAM Role `SmartGramEC2Role` is attached to EC2 instance
2. EC2 Console → Your instance → IAM Role column → should show `SmartGramEC2Role`
3. Verify role has `AmazonS3FullAccess`
4. Verify bucket name in `config.py` matches exactly

## Problem 4: DynamoDB Region Mismatch
```
Could not connect to the endpoint URL: dynamodb.us-west-2.amazonaws.com
```
**Fix:**
```python
# In config.py — make sure this matches where you created your tables
AWS_REGION = 'us-east-1'
```

## Problem 5: IAM Permission Denied on SNS
```
botocore.exceptions.ClientError: not authorized to perform: SNS:Publish
```
**Fix:**
1. IAM → Roles → `SmartGramEC2Role` → Add permission → `AmazonSNSFullAccess`
2. Or confirm your SNS Topic ARN is correct in config

## Problem 6: Gunicorn Not Found
```bash
bash: gunicorn: command not found
```
**Fix:**
```bash
source venv/bin/activate   # Must activate first!
pip install gunicorn
gunicorn --bind 0.0.0.0:5000 app:app
```

## Problem 7: Nginx 502 Bad Gateway
**Symptom:** Visit port 80, get 502 error
**Fix:**
```bash
# Check if Flask/Gunicorn is running
sudo systemctl status smartgram
# If not running:
sudo systemctl start smartgram
# Check logs:
sudo journalctl -u smartgram -n 50
```

## Problem 8: Images Not Displaying
**Fix:** Check S3 bucket policy has public read allowed (Section 5)

## Problem 9: Email Not Received from SNS
**Fix:**
1. Check spam/junk folder
2. Confirm you clicked the confirmation link in the original subscription email
3. SNS Console → Topic → Subscriptions → Status should be "Confirmed"

---

# SECTION 24 — VIVA QUESTIONS & ANSWERS (30 Questions)

**Q1. What is SmartGram Pro?**
A cloud-based digital village governance platform built on AWS that enables villagers to submit and track complaints, view notices and government schemes, while admins manage everything through a dashboard.

**Q2. Why did you use DynamoDB instead of MySQL?**
DynamoDB is AWS's managed NoSQL database — no server to maintain, scales automatically, has a generous free tier (25GB), and works perfectly with boto3. For this project's schema (flexible complaint records), NoSQL is ideal.

**Q3. What is an IAM Role and why is it important?**
An IAM Role grants permissions to AWS services without using hardcoded credentials. Our EC2 instance uses `SmartGramEC2Role` to access DynamoDB, S3, and SNS securely.

**Q4. What is the difference between IAM User and IAM Role?**
IAM User = a person (has permanent credentials). IAM Role = a set of permissions assigned to a service/resource (uses temporary credentials automatically rotated by AWS).

**Q5. Explain the S3 bucket policy you used.**
We used a bucket policy with `s3:GetObject` permission for `Principal: "*"` — this makes all objects in the bucket publicly readable via URL, so complaint images can be displayed in the browser.

**Q6. What is boto3?**
boto3 is the official AWS SDK for Python. It lets Python code interact with AWS services like DynamoDB, S3, SNS, etc. using simple method calls.

**Q7. What is SNS and how is it used here?**
Amazon SNS (Simple Notification Service) is a pub/sub messaging service. We created a topic `SmartGramAlerts` with email subscriptions. When a complaint is filed or status updated, Flask publishes a message to SNS, which delivers it as email.

**Q8. What is AWS Lambda?**
Lambda is a serverless compute service. You upload code (our `pending_reminder.py`) and AWS runs it on demand. You pay only for execution time. No server management needed.

**Q9. How does EventBridge trigger Lambda?**
EventBridge is a scheduling/event bus service. We created a rule with cron expression `cron(30 3 * * ? *)` that fires daily at 3:30 UTC (9 AM IST) and invokes the Lambda function.

**Q10. What is the cron expression for 9 AM IST daily?**
`cron(30 3 * * ? *)` — because IST is UTC+5:30, so 9:00 AM IST = 3:30 AM UTC.

**Q11. What does CloudWatch do in this project?**
Monitors EC2 metrics (CPU, network), stores Lambda execution logs automatically, and can trigger alarms when thresholds are crossed.

**Q12. What is Gunicorn and why use it instead of Flask's built-in server?**
Gunicorn is a production-grade WSGI server. Flask's built-in server is single-threaded and not safe for production. Gunicorn handles multiple concurrent requests, restarts on crash, and integrates with Nginx.

**Q13. What is Nginx and why put it in front of Flask?**
Nginx is a high-performance web server/reverse proxy. It handles port 80, serves static files efficiently, buffers slow clients, and can later add SSL. It forwards dynamic requests to Gunicorn/Flask on port 5000.

**Q14. What is a reverse proxy?**
A reverse proxy sits between the client and backend server. Nginx receives the request on port 80 and forwards it to Flask on port 5000, then sends Flask's response back to the client.

**Q15. What is `put_item` in DynamoDB?**
Creates or completely replaces an item in a DynamoDB table. If the partition key exists, the item is overwritten.

**Q16. What is `update_item` in DynamoDB?**
Updates specific attributes of an existing item without replacing the entire item. Uses UpdateExpression to define what changes.

**Q17. Why is `status` wrapped in ExpressionAttributeNames?**
`status` is a reserved word in DynamoDB. Using `#st` as a placeholder in ExpressionAttributeNames avoids the reserved word conflict.

**Q18. What is a partition key in DynamoDB?**
The primary key that uniquely identifies each item. DynamoDB uses it to determine which partition (server) stores the item. All queries must include it.

**Q19. What is the difference between scan and query in DynamoDB?**
`scan` reads every item in the table (expensive). `query` uses the partition key to retrieve specific items efficiently. For production, use query with GSI (Global Secondary Index).

**Q20. How does session management work in Flask?**
Flask stores session data in a signed cookie on the client side. The `SECRET_KEY` is used to cryptographically sign it, preventing tampering. We store `user_id`, `username`, `role` in session.

**Q21. What is t2.micro and why use it?**
t2.micro is an EC2 instance type with 1 vCPU and 1 GB RAM. It's part of the AWS Free Tier — 750 hours/month free for 12 months. Sufficient for this project's load.

**Q22. What is a Security Group in AWS?**
A virtual firewall for EC2 instances. Controls inbound and outbound traffic by port, protocol, and source IP. We opened ports 22 (SSH), 80 (HTTP), and 5000 (Flask testing).

**Q23. What is the free tier for DynamoDB?**
25 GB storage, 25 Read Capacity Units, 25 Write Capacity Units per month — permanently free (not just 12 months).

**Q24. What is On-Demand vs Provisioned capacity in DynamoDB?**
On-Demand: pay per request, scales automatically — good for unpredictable workloads. Provisioned: you specify read/write capacity in advance — cheaper for predictable workloads.

**Q25. What is `secure_filename` from Werkzeug?**
Sanitizes uploaded filenames to remove path traversal attacks and special characters. Example: `../../etc/passwd` becomes `etc_passwd`.

**Q26. How is the complaint image URL constructed?**
After uploading to S3 with key `complaint-images/filename.jpg`, the URL is:
`https://BUCKET-NAME.s3.amazonaws.com/complaint-images/filename.jpg`

**Q27. What is the MAX_CONTENT_LENGTH setting?**
Limits the maximum size of uploaded files in Flask. Set to 1MB (`1 * 1024 * 1024` bytes). Flask automatically returns HTTP 413 if exceeded.

**Q28. What AWS region did you use and why?**
`us-east-1` (N. Virginia). It has the most AWS services available, best free tier coverage, and lowest latency to most global locations.

**Q29. How would you make this production-ready?**
1. Use HTTPS with SSL certificate (AWS Certificate Manager + Route53)
2. Replace SHA-256 with bcrypt for password hashing
3. Use DynamoDB GSI for efficient queries instead of scan
4. Add CloudFront CDN for static files
5. Use environment variables for all secrets
6. Enable DynamoDB Point-in-Time Recovery (PITR)

**Q30. What is the overall architecture flow?**
User → Route53 (DNS) → Nginx (port 80) → Gunicorn/Flask (port 5000) → DynamoDB (data) + S3 (images) + SNS (alerts). EventBridge → Lambda daily → DynamoDB scan → SNS email. CloudWatch monitors everything.

---

# SECTION 25 — RESUME DESCRIPTION (ATS-Friendly)

```
SmartGram Pro – Cloud-Based Digital Village Governance Platform
Tech Stack: Python Flask | AWS EC2 | DynamoDB | S3 | SNS | Lambda | EventBridge | CloudWatch | Nginx

• Designed and deployed a full-stack cloud web application on AWS EC2 (Ubuntu t2.micro) 
  enabling rural citizens to submit complaints, track resolution status, and access government services

• Engineered a serverless automation pipeline using AWS Lambda and EventBridge (cron scheduling) 
  that sends daily email summaries of pending complaints to administrators via Amazon SNS

• Implemented RESTful Flask backend with DynamoDB CRUD operations (put_item, update_item, scan) 
  managing 3 tables: Users, Complaints, Notices with on-demand capacity mode

• Built S3-integrated complaint image upload system with public bucket policy, 
  processing file validation, secure naming, and direct URL generation for browser display

• Configured production deployment with Gunicorn WSGI server and Nginx reverse proxy 
  on Ubuntu EC2, with systemd service for auto-restart on failure

• Applied AWS IAM best practices using EC2 Instance Roles (no hardcoded credentials) 
  and least-privilege Lambda execution roles

• Set up CloudWatch monitoring with EC2 metrics, Lambda logs, and billing alarms 
  for proactive infrastructure management within AWS Free Tier constraints
```

---

# SECTION 26 — PPT PRESENTATION CONTENT

## Slide 1 — Title Slide
**SmartGram Pro**
Cloud-Based Digital Village Governance Platform
[Your Name] | [Date] | AWS Academy Project

## Slide 2 — Problem Statement
- 60%+ of India's population lives in villages
- Complaints lost in paperwork — no tracking
- Notices on walls — most people miss them
- No accountability for panchayat work
- No analytics for admin decision-making
**Result: Citizens frustrated, governance inefficient**

## Slide 3 — Solution
SmartGram Pro digitizes village governance:
✓ Online complaint submission with photo evidence
✓ Real-time status tracking with unique IDs
✓ Email alerts at every step
✓ Digital notice board accessible from phone
✓ Government schemes directory
✓ Admin analytics dashboard

## Slide 4 — AWS Architecture Diagram
[Paste the text architecture from Section 2]
Key: EC2 → Flask → DynamoDB + S3 + SNS
Lambda ← EventBridge (daily schedule)
CloudWatch monitoring all components

## Slide 5 — AWS Services Used
| Service | Purpose |
|---|---|
| EC2 t2.micro | Hosts Flask web application |
| DynamoDB | Stores users, complaints, notices |
| S3 | Stores complaint photos |
| IAM | Secure access control |
| SNS | Email notifications |
| Lambda | Serverless daily automation |
| EventBridge | Cron scheduler for Lambda |
| CloudWatch | Monitoring & logging |

## Slide 6 — Tech Stack
- **Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript
- **Backend:** Python 3.11, Flask 3.x, Gunicorn
- **Database:** Amazon DynamoDB (NoSQL)
- **Storage:** Amazon S3
- **Web Server:** Nginx reverse proxy
- **AWS SDK:** boto3

## Slide 7 — Key Features Demo
1. Villager registers → logs in
2. Submits complaint with photo
3. Gets email confirmation via SNS
4. Admin views analytics dashboard
5. Admin updates status → villager notified
6. Lambda runs daily → pending reminder

## Slide 8 — DynamoDB Schema
**SmartGramUsers:** user_id (PK), username, email, role, village
**SmartGramComplaints:** complaint_id (PK), user_id, category, status, image_url
**SmartGramNotices:** notice_id (PK), title, content, category, posted_by

## Slide 9 — Cost Analysis (Free Tier)
| Service | Free Tier | Our Usage |
|---|---|---|
| EC2 | 750 hrs/month | ~720 hrs |
| DynamoDB | 25 GB storage | < 1 MB |
| S3 | 5 GB storage | < 100 MB |
| Lambda | 1M invocations | ~30/month |
| SNS | 1000 emails | ~50/month |
**Total Monthly Cost: $0 (Free Tier)**

## Slide 10 — Security Best Practices
- IAM Roles (no hardcoded credentials)
- Password hashing with SHA-256
- Flask session signing with SECRET_KEY
- S3 public read only (no write)
- Security Groups restrict SSH to admin IP
- CloudWatch billing alarm at $1

## Slide 11 — Future Enhancements
- AI complaint auto-classification (Amazon Comprehend)
- GIS heatmaps (Amazon Location Service)
- Mobile app (React Native + AWS Amplify)
- IoT sensor integration (AWS IoT Core)
- Hindi/regional language support (Amazon Translate)
- WhatsApp alerts (Twilio + Lambda)

## Slide 12 — Conclusion
- Built complete cloud application in 1 day
- Used 8 AWS services synergistically
- Zero cost deployment on AWS Free Tier
- Production-ready with Nginx + Gunicorn
- Scalable architecture — handles villages to district level
- Resume-worthy project demonstrating full-stack + cloud skills

---

# SECTION 27 — FUTURE ENHANCEMENTS

## 1. AI Complaint Classification (Amazon Comprehend)
```python
comprehend = boto3.client('comprehend', region_name='us-east-1')
result = comprehend.detect_sentiment(Text=description, LanguageCode='en')
# Auto-tag urgent complaints based on sentiment score
# Route high-priority complaints to senior officials
```

## 2. GIS Heatmaps (Amazon Location Service)
- Map complaints by GPS coordinates
- Admin sees problem hotspots on interactive map
- Identify areas with recurring infrastructure issues
- Integrate Leaflet.js or Google Maps API

## 3. Mobile App (React Native + AWS Amplify)
- Amplify Auth (Cognito) for mobile login
- Amplify Storage (S3) for photo capture and upload
- Push notifications via Amazon Pinpoint
- Offline complaint drafting with sync

## 4. IoT Sensor Integration (AWS IoT Core)
- Water level sensors → auto-create water shortage complaints
- Street light sensors → detect failures automatically
- Soil moisture sensors for agriculture alerts
- Data stored in DynamoDB via IoT Rules

## 5. Multilingual Support (Amazon Translate)
```python
translate = boto3.client('translate', region_name='us-east-1')
result = translate.translate_text(
    Text=complaint_description,
    SourceLanguageCode='hi',  # Hindi input
    TargetLanguageCode='en'   # Stored in English
)
```
- Support Hindi, Marathi, Tamil, Telugu inputs
- Auto-translate admin responses back to local language

## 6. Voice Complaint Submission (Amazon Transcribe)
- Villagers record audio complaint on phone
- Transcribe converts speech to text automatically
- Removes literacy barrier

## 7. WhatsApp Alerts
- Lambda + Twilio API sends WhatsApp messages
- More reliable delivery than email in rural areas

## 8. Blockchain Audit Trail (Hyperledger on AWS)
- Immutable record of all complaint status changes
- Prevents tampering by corrupt officials
- Full accountability chain

---

# COMPLETE FILE CHECKLIST

Verify all these files exist in your project:

```
SmartGram-Pro/
├── app.py                         ✅ (Guide Part 2)
├── config.py                      ✅ (created)
├── requirements.txt               ✅ (created)
├── GUIDE_PART1.md                 ✅ Sections 1-8
├── GUIDE_PART2.md                 ✅ Sections 9-16
├── GUIDE_PART3.md                 ✅ Sections 17-21
├── GUIDE_PART4.md                 ✅ Sections 22-27
├── static/
│   ├── css/style.css              ✅ (created)
│   └── js/main.js                 ✅ (created)
├── templates/
│   ├── base.html                  ✅ (created)
│   ├── index.html                 ✅ (created)
│   ├── login.html                 ✅ (created)
│   ├── register.html              ✅ (created)
│   ├── complaint.html             ✅ (created)
│   ├── dashboard.html             ✅ (created)
│   ├── admin.html                 ✅ (created)
│   ├── notices.html               ✅ (created)
│   └── schemes.html               ✅ (created)
└── lambda/
    └── pending_reminder.py        ✅ (created)
```

## DEPLOYMENT ORDER (Do in this exact order)
1. Create DynamoDB tables (Section 4)
2. Create S3 bucket + policy (Section 5)
3. Create IAM roles (Section 6)
4. Launch EC2 + attach role (Section 7)
5. Connect to EC2 (Section 8)
6. Install software (Section 9)
7. Upload project files to EC2
8. Install pip packages
9. Create admin user (Section 20)
10. Run with Gunicorn (Section 20)
11. Configure Nginx (Section 21)
12. Create SNS topic + subscribe email (Section 16)
13. Update config.py with real ARN/bucket name
14. Create Lambda function (Section 17)
15. Create EventBridge rule (Section 18)
16. Test everything (Section 22)
17. Set up CloudWatch alarm (Section 19)
🎉 PROJECT COMPLETE!
