# 🏘️ SmartGram Pro — Digital Village Governance Platform

A full-stack **cloud-native** digital governance platform built on **AWS**, enabling rural communities to file complaints, track resolutions, access government schemes, and receive automated notifications — all through a modern web interface.

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-2.x-lightgrey?logo=flask)
![AWS](https://img.shields.io/badge/AWS-Cloud%20Native-orange?logo=amazonaws)
![DynamoDB](https://img.shields.io/badge/DynamoDB-NoSQL-blue?logo=amazondynamodb)
![S3](https://img.shields.io/badge/S3-Storage-green?logo=amazons3)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [AWS Services Used](#-aws-services-used)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Deployment](#-setup--deployment)
- [Environment Variables](#-environment-variables)
- [Screenshots](#-screenshots)
- [Author](#-author)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **User Auth** | Registration & login with SHA-256 hashed passwords |
| 📝 **Complaint System** | File complaints with image uploads, category tagging, and real-time tracking |
| 📊 **Admin Dashboard** | View all complaints, update statuses, post notices, analytics overview |
| 📢 **Notices Board** | Admin-posted notices with expiry dates and categories |
| 🏛️ **Schemes Directory** | Curated list of government schemes (PM Awas, PM Kisan, MGNREGA, etc.) |
| 📧 **Email Alerts** | Real-time SNS notifications on complaint submissions & status changes |
| ⏰ **Automated Reminders** | Lambda + EventBridge sends daily alerts for pending complaints |
| 📸 **Image Uploads** | Complaint images stored securely on S3 |
| 📱 **Responsive UI** | Bootstrap-based responsive design for all devices |

---

## 🏗️ Architecture

```
┌──────────────┐       ┌──────────────────────────────────────────────┐
│   Browser    │       │              AWS Cloud                       │
│   (Client)   │       │                                              │
└──────┬───────┘       │  ┌─────────┐    ┌──────────────┐            │
       │               │  │  EC2    │    │  DynamoDB     │            │
       │  HTTP/HTTPS   │  │ (Flask  │◄──►│  - Users      │            │
       ├──────────────►│  │  App)   │    │  - Complaints │            │
       │               │  │         │    │  - Notices    │            │
       │               │  └────┬────┘    └──────────────┘            │
       │               │       │                                      │
       │               │       ├────────►┌──────────────┐            │
       │               │       │         │  S3 Bucket   │            │
       │               │       │         │  (Images)    │            │
       │               │       │         └──────────────┘            │
       │               │       │                                      │
       │               │       └────────►┌──────────────┐            │
       │               │                 │  SNS Topic   │            │
       │               │                 │  (Alerts)    │            │
       │               │                 └──────┬───────┘            │
       │               │                        │                     │
       │               │  ┌──────────┐   ┌──────▼───────┐            │
       │               │  │EventBridge│──►│   Lambda     │            │
       │               │  │ (Daily)  │   │  (Reminder)  │            │
       │               │  └──────────┘   └──────────────┘            │
       │               │                                              │
       │               │  ┌──────────┐                                │
       │               │  │  Nginx   │ (Reverse Proxy)               │
       │               │  └──────────┘                                │
       │               └──────────────────────────────────────────────┘
```

---

## ☁️ AWS Services Used

| Service | Purpose |
|---------|---------|
| **EC2** | Hosts the Flask application server |
| **DynamoDB** | NoSQL database for users, complaints, and notices |
| **S3** | Stores complaint image uploads |
| **SNS** | Sends email notifications for complaint events |
| **Lambda** | Serverless function for daily pending complaint reminders |
| **EventBridge** | Schedules Lambda execution (daily cron) |
| **IAM** | Role-based access control for EC2 and Lambda |

> 💡 Designed to run entirely within the **AWS Free Tier**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.9+, Flask |
| **Frontend** | HTML5, Bootstrap 5, JavaScript |
| **Database** | Amazon DynamoDB |
| **Storage** | Amazon S3 |
| **Messaging** | Amazon SNS |
| **Automation** | AWS Lambda + Amazon EventBridge |
| **Web Server** | Nginx (reverse proxy) + Gunicorn |
| **Deployment** | Amazon EC2 (Ubuntu) |

---

## 📁 Project Structure

```
SmartGram-Pro/
├── app.py                  # Main Flask application (routes, logic)
├── config.py               # Configuration (env-based, no secrets)
├── create_admin.py         # Script to seed admin user in DynamoDB
├── requirements.txt        # Python dependencies
├── setup.sh                # EC2 setup & deployment script
├── smartgram.service       # systemd service file for auto-start
├── smartgram.nginx.conf    # Nginx reverse proxy configuration
├── lambda/
│   └── pending_reminder.py # Lambda function for daily reminders
├── static/
│   ├── css/style.css       # Custom styles
│   └── js/main.js          # Frontend JavaScript
├── templates/
│   ├── base.html           # Base template with navbar/footer
│   ├── index.html          # Landing page
│   ├── login.html          # Login page
│   ├── register.html       # Registration page
│   ├── dashboard.html      # User dashboard
│   ├── complaint.html      # Complaint submission form
│   ├── admin.html          # Admin dashboard
│   ├── notices.html        # Notices board
│   └── schemes.html        # Government schemes directory
└── GUIDE_PART1-4.md        # Detailed deployment guides
```

---

## 🚀 Setup & Deployment

### Prerequisites
- AWS Account (Free Tier eligible)
- EC2 instance (Ubuntu 22.04, t2.micro)
- IAM Role with DynamoDB, S3, SNS permissions attached to EC2

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/rajbaibhav1910/SmartGram-Pro.git
cd SmartGram-Pro

# 2. Run the setup script (installs dependencies, creates venv)
chmod +x setup.sh
./setup.sh

# 3. Set environment variables
export SECRET_KEY="your-secret-key"
export S3_BUCKET="your-s3-bucket-name"
export SNS_TOPIC_ARN="arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:SmartGramAlerts"

# 4. Create admin user
python create_admin.py

# 5. Run the application
python app.py
```

### Production Deployment (EC2)

```bash
# Copy systemd service file
sudo cp smartgram.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable smartgram
sudo systemctl start smartgram

# Configure Nginx
sudo cp smartgram.nginx.conf /etc/nginx/sites-available/smartgram
sudo ln -s /etc/nginx/sites-available/smartgram /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

> 📖 For detailed step-by-step deployment instructions, see `GUIDE_PART1.md` through `GUIDE_PART4.md`.

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Flask session secret key | Yes |
| `AWS_REGION` | AWS region (default: `us-east-1`) | No |
| `S3_BUCKET` | S3 bucket name for image uploads | Yes |
| `SNS_TOPIC_ARN` | SNS topic ARN for email alerts | Yes |

---

## 👤 Author

**Raj Baibhav**
- GitHub: [@rajbaibhav1910](https://github.com/rajbaibhav1910)

---

## 📄 License

This project is licensed under the MIT License.
