# 🏘️ SmartGram Pro — Digital Village Governance Platform

A production-grade, **multi-tenant**, **cloud-native** digital governance platform built entirely on **AWS**, empowering rural Gram Panchayats to manage citizen complaints, publish notices, showcase government schemes, and visualize village assets on an interactive GIS map — all through a modern React web interface deployed via CI/CD.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey?logo=flask)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![AWS](https://img.shields.io/badge/AWS-Cloud%20Native-FF9900?logo=amazonaws)
![ECS Fargate](https://img.shields.io/badge/ECS-Fargate-FF9900?logo=amazonecs)
![DynamoDB](https://img.shields.io/badge/DynamoDB-NoSQL-4053D6?logo=amazondynamodb)
![CloudFormation](https://img.shields.io/badge/IaC-CloudFormation-FF4F8B)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [AWS Services Used](#-aws-services-used)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Infrastructure as Code](#-infrastructure-as-code)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Author](#-author)
- [License](#-license)

---

## ✨ Features

### 🏛️ Multi-Tenant Panchayat System
| Feature | Description |
|---------|-------------|
| 🔐 **Role-Based Auth** | Three roles — **Villager**, **Panchayat Admin**, and **Super Admin** — with tenant-scoped data isolation |
| 🏘️ **Panchayat Onboarding** | Super Admin can create new panchayats and assign local admins instantly |
| 🔒 **Tenant Isolation** | Every complaint, notice, and map asset is scoped to its panchayat; cross-tenant access is denied and audited |

### 📝 Complaint Management
| Feature | Description |
|---------|-------------|
| 📸 **File with Image Uploads** | Citizens submit complaints with category tags and image evidence (stored on S3, served via CloudFront CDN) |
| 📊 **Real-Time Status Tracking** | Track complaint lifecycle: Pending → In Progress → Resolved |
| 📧 **SNS Email Alerts** | Automatic email notifications on new complaints and status changes |
| ⏰ **Automated Reminders** | AWS Lambda + EventBridge sends daily alerts for stale pending complaints |

### 🗺️ Interactive GIS Map
| Feature | Description |
|---------|-------------|
| 🌍 **MapLibre GL Integration** | Interactive village map with real GeoJSON features (Points, Lines, Polygons) |
| 🏫 **Asset Management** | Track schools, hospitals, anganwadis, water tanks, hand pumps, street lights, roads, and more |
| 🚧 **Project Tracking** | Visualize development projects with status (planned → approved → in progress → completed → verified) and progress bars |
| 🗺️ **Ward Boundaries** | Draw village boundary and ward polygons directly on the map |

### 📢 Additional Modules
| Feature | Description |
|---------|-------------|
| 📋 **Notices Board** | Admin-posted notices with expiry dates, categories, and detail views |
| 🏛️ **Schemes Directory** | Curated catalog of government schemes (PM Awas Yojana, PM Kisan, MGNREGA, etc.) with eligibility & application details |
| 🌐 **Internationalization (i18n)** | Multi-language UI support via i18next |
| 📱 **Responsive Design** | Mobile-first, Tailwind CSS powered responsive interface |
| 📜 **Audit Logging** | Every sensitive action is recorded for accountability and transparency |

---

## 🏗️ Architecture

```
┌────────────────┐
│   Browser /    │
│   Mobile       │
└───────┬────────┘
        │  HTTPS
        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           AWS Cloud (ap-south-1)                        │
│                                                                          │
│  ┌──────────────┐     ┌──────────────────┐                               │
│  │  CloudFront  │────►│  S3 Bucket       │  ← React SPA (Static Assets) │
│  │  CDN         │     │  (Frontend)      │                               │
│  └──────┬───────┘     └──────────────────┘                               │
│         │ /api/*                                                         │
│         ▼                                                                │
│  ┌──────────────┐     ┌──────────────────┐                               │
│  │  Application │     │  ECS Fargate     │                               │
│  │  Load        │────►│  (Flask API      │                               │
│  │  Balancer    │     │   Container)     │                               │
│  └──────────────┘     └────────┬─────────┘                               │
│                                │                                         │
│              ┌─────────────────┼─────────────────┐                       │
│              ▼                 ▼                  ▼                       │
│  ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐              │
│  │  DynamoDB        │ │  S3 Bucket   │ │  SNS Topic       │              │
│  │  ─ Users         │ │  (Media /    │ │  (Email Alerts)  │              │
│  │  ─ Complaints    │ │   Images)    │ │                  │              │
│  │  ─ Notices       │ └──────────────┘ └──────────────────┘              │
│  │  ─ Panchayats    │                                                    │
│  │  ─ MapAssets     │  ┌──────────────┐   ┌──────────────┐               │
│  │  ─ AuditLog      │  │ EventBridge  │──►│  Lambda      │               │
│  └──────────────────┘  │ (Daily Cron) │   │  (Pending    │               │
│                        └──────────────┘   │   Reminder)  │               │
│                                           └──────────────┘               │
│  ┌──────────────────┐  ┌──────────────┐                                  │
│  │  Secrets Manager │  │  ECR         │  ← Docker Image Registry         │
│  │  (App Secrets)   │  │  (Backend)   │                                  │
│  └──────────────────┘  └──────────────┘                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │  VPC: 10.0.0.0/16                                               │     │
│  │  ├─ Public Subnets (2 AZs)  — ALB, NAT Gateway                  │     │
│  │  └─ Private Subnets (2 AZs) — ECS Tasks                         │     │
│  └──────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## ☁️ AWS Services Used

| Service | Purpose |
|---------|---------|
| **VPC** | Isolated network with public/private subnets across 2 Availability Zones |
| **ECS Fargate** | Serverless container orchestration for the Flask API (no EC2 management) |
| **ECR** | Private Docker container registry for backend images |
| **ALB** | Application Load Balancer for traffic routing and health checks |
| **DynamoDB** | Fully managed NoSQL database (6 tables: Users, Complaints, Notices, Panchayats, MapAssets, AuditLog) |
| **S3** | Object storage for complaint images (media bucket) and React static assets (frontend bucket) |
| **CloudFront** | Global CDN for low-latency frontend delivery and S3 media serving |
| **SNS** | Simple Notification Service for real-time email alerts |
| **Lambda** | Serverless function for automated daily pending complaint reminders |
| **EventBridge** | Scheduled cron rule triggering the Lambda reminder daily |
| **Secrets Manager** | Secure storage for application secrets (Flask secret key, etc.) |
| **IAM** | Fine-grained roles for ECS tasks, Lambda execution, and CI/CD |
| **CloudFormation** | Infrastructure as Code — entire stack defined in YAML templates |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 3, React Router 7, TanStack React Query, Framer Motion, Recharts, MapLibre GL, Zod, i18next |
| **Backend** | Python 3.11, Flask 3, Flask-CORS, Gunicorn (gthread workers) |
| **Database** | Amazon DynamoDB (6 tables with GSIs) |
| **Storage** | Amazon S3 (media + frontend buckets) |
| **Messaging** | Amazon SNS |
| **Automation** | AWS Lambda + Amazon EventBridge |
| **Containerization** | Docker (multi-stage, non-root, with health checks) |
| **Orchestration** | AWS ECS Fargate |
| **CDN** | Amazon CloudFront |
| **IaC** | AWS CloudFormation (modular + unified master stack) |
| **CI/CD** | GitHub Actions (build → deploy → invalidate cache) |

---

## 📁 Project Structure

```
SmartGram-Pro/
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions CI/CD pipeline
│
├── frontend/                         # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/                    # Route-level page components
│   │   │   ├── LandingPage.tsx       #   Public landing page
│   │   │   ├── LoginPage.tsx         #   User login
│   │   │   ├── RegisterPage.tsx      #   Citizen registration (with panchayat selector)
│   │   │   ├── DashboardPage.tsx     #   Citizen dashboard
│   │   │   ├── ComplaintsPage.tsx    #   Complaint listing
│   │   │   ├── ComplaintSubmitPage.tsx #  Submit a new complaint
│   │   │   ├── ComplaintDetailPage.tsx # Complaint detail & status timeline
│   │   │   ├── AdminDashboardPage.tsx #  Panchayat admin panel (complaints, notices, analytics)
│   │   │   ├── SuperAdminPage.tsx    #   Platform-wide super admin dashboard
│   │   │   ├── MapPage.tsx           #   Interactive GIS village map
│   │   │   ├── NoticesPage.tsx       #   Notices board
│   │   │   ├── SchemesPage.tsx       #   Government schemes directory
│   │   │   └── ProfilePage.tsx       #   User profile
│   │   ├── components/               # Reusable UI components
│   │   │   ├── admin/                #   Admin-specific components
│   │   │   ├── layout/               #   Navbar, sidebar, footer
│   │   │   ├── notices/              #   Notice cards & forms
│   │   │   ├── schemes/              #   Scheme cards & details
│   │   │   └── ui/                   #   Buttons, modals, inputs, etc.
│   │   ├── services/                 # API client functions
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── i18n/                     # Internationalization config & translations
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── lib/                      # Utility functions
│   │   ├── data/                     # Static scheme data
│   │   ├── layouts/                  # Layout wrappers
│   │   ├── App.tsx                   # Root component with routing
│   │   └── main.tsx                  # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── infrastructure/                   # AWS CloudFormation templates
│   ├── master-stack.yaml             # 🏗️ Unified master stack (all resources)
│   ├── 01-vpc-networking.yaml        # VPC, subnets, IGW, NAT, route tables
│   ├── 02-security-iam.yaml         # IAM roles, policies, security groups
│   ├── 03-database-storage.yaml     # DynamoDB tables, S3 buckets, ECR, Secrets Manager
│   ├── 04-ecs-cluster-alb.yaml      # ECS cluster, task def, service, ALB, target groups
│   ├── 05-lambda-eventbridge.yaml   # Lambda function, EventBridge cron rule
│   └── 06-cloudfront-cdn.yaml       # CloudFront distribution, OAC, cache policies
│
├── lambda/
│   └── pending_reminder.py           # Daily scan for stale pending complaints → SNS alert
│
├── scripts/
│   ├── deploy.sh                     # Linux deployment script
│   ├── deploy.ps1                    # Windows PowerShell deployment script
│   ├── setup_local_tables.py         # Create DynamoDB tables locally (for dev)
│   ├── migrate_to_multitenant.py     # Migration script for multi-tenancy
│   └── qa_*.py / patch_*.py          # QA testing & patching scripts
│
├── data/
│   └── villages_index.json           # Pre-indexed village directory (~6L+ villages)
│
├── app.py                            # Flask REST API (all backend routes)
├── config.py                         # Environment-based configuration (+ Secrets Manager)
├── create_admin.py                   # Seed super admin user in DynamoDB
├── Dockerfile                        # Production container (Python 3.11-slim, Gunicorn)
├── requirements.txt                  # Python dependencies
├── setup.sh                          # EC2/VM quick-start script
├── smartgram.service                 # systemd service file (legacy EC2 deploy)
├── smartgram.nginx.conf              # Nginx reverse proxy config (legacy EC2 deploy)
└── GUIDE_PART1-4.md                  # Step-by-step deployment guides
```

---

## 🚀 Getting Started

### Prerequisites

- **AWS Account** with appropriate permissions
- **Python 3.11+** and **Node.js 20+** installed locally
- **Docker** (for building container images)
- **AWS CLI v2** configured with credentials

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/rajbaibhav1910/smartgram-pro.git
cd smartgram-pro

# 2. Backend setup
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Set environment variables
export AWS_REGION="ap-south-1"
export SECRET_KEY="your-dev-secret-key"
export S3_BUCKET="your-s3-bucket-name"
export SNS_TOPIC_ARN="arn:aws:sns:ap-south-1:ACCOUNT_ID:SmartGramAlerts"

# 4. Create local DynamoDB tables (requires DynamoDB Local or AWS credentials)
python scripts/setup_local_tables.py

# 5. Seed the admin user
python create_admin.py

# 6. Frontend setup
cd frontend
npm install

# 7. Run both backend and frontend concurrently
npm run dev:all
```

The frontend dev server runs on `http://localhost:5173` and proxies API calls to the Flask backend on port `5000`.

### Docker (Production Build)

```bash
# Build the production container
docker build -t smartgram-pro:latest .

# Run locally
docker run -p 5000:5000 \
  -e AWS_REGION=ap-south-1 \
  -e SECRET_KEY=your-secret-key \
  -e S3_BUCKET=your-bucket \
  smartgram-pro:latest
```

---

## 🔄 CI/CD Pipeline

The project uses **GitHub Actions** for fully automated build and deployment. The pipeline triggers on every push to `main` or via manual dispatch.

### Pipeline Stages

```
Checkout → Setup Node 20 → Setup Python 3.11
    → Install & Validate Backend
    → Build React Frontend (npm ci → npm run build)
    → Configure AWS Credentials (from GitHub Secrets)
    → Deploy CloudFormation Master Stack
    → Build & Push Docker Image → Amazon ECR
    → Sync React Static Assets → S3 Frontend Bucket
    → Force New ECS Fargate Deployment
    → Invalidate CloudFront CDN Cache
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key with deployment permissions |
| `AWS_SECRET_ACCESS_KEY` | Corresponding IAM secret key |

---

## 🏗️ Infrastructure as Code

All AWS resources are defined in **CloudFormation YAML templates** under `infrastructure/`.

### Master Stack Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `EnvironmentName` | `prod` | Environment identifier (used in all resource names) |
| `DeployNatGateway` | `false` | Enable NAT Gateway (set `true` for production) |
| `EnableCloudFront` | `false` | Enable CloudFront CDN (requires verified AWS account) |
| `AdminAlertEmail` | _(empty)_ | Email address for SNS complaint alert subscriptions |

### Deploy the Stack

```bash
aws cloudformation deploy \
  --stack-name smartgram-prod \
  --template-file infrastructure/master-stack.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides EnvironmentName=prod \
  --region ap-south-1
```

---

## 🔑 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SECRET_KEY` | Flask session secret key | _(insecure default)_ | Yes |
| `AWS_REGION` | AWS deployment region | `ap-south-1` | No |
| `S3_BUCKET` | S3 bucket for complaint image uploads | `smartgram-media-bucket` | Yes |
| `SNS_TOPIC_ARN` | SNS topic ARN for email alerts | _(empty)_ | No |
| `CDN_DOMAIN` | CloudFront domain for media URLs | _(empty)_ | No |
| `SECRET_NAME` | AWS Secrets Manager secret ID | _(empty)_ | No |
| `USERS_TABLE` | DynamoDB Users table name | `SmartGramUsers` | No |
| `COMPLAINTS_TABLE` | DynamoDB Complaints table name | `SmartGramComplaints` | No |
| `NOTICES_TABLE` | DynamoDB Notices table name | `SmartGramNotices` | No |
| `PANCHAYATS_TABLE` | DynamoDB Panchayats table name | `SmartGramPanchayats` | No |
| `MAP_ASSETS_TABLE` | DynamoDB Map Assets table name | `SmartGramMapAssets` | No |
| `AUDIT_LOG_TABLE` | DynamoDB Audit Log table name | `SmartGramAuditLog` | No |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new citizen (with panchayat assignment) |
| `POST` | `/api/auth/login` | Login with username & password |
| `POST` | `/api/auth/logout` | Logout (clear session) |
| `GET`  | `/api/auth/me` | Get current authenticated user profile |

### Complaints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/complaints` | List complaints (tenant-scoped) |
| `POST` | `/api/complaints` | Submit a new complaint (with optional image) |
| `GET`  | `/api/complaints/:id` | Get complaint details |
| `PUT`  | `/api/complaints/:id` | Update complaint status (admin) |

### Notices
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/notices` | List notices (tenant-scoped) |
| `POST` | `/api/notices` | Create a notice (admin) |
| `GET`  | `/api/notices/:id` | Get notice details |

### GIS Map
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/map/features` | Get all map features (GeoJSON FeatureCollection) |
| `POST` | `/api/map/features` | Add a map feature (admin) |
| `PUT`  | `/api/map/features/:id` | Update a map feature (admin) |
| `DELETE`| `/api/map/features/:id` | Delete a map feature (admin) |

### Super Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/super/overview` | Platform-wide statistics |
| `GET`  | `/api/super/panchayats` | List all panchayats |
| `POST` | `/api/super/panchayats` | Create a new panchayat (with optional admin) |
| `PUT`  | `/api/super/panchayats/:id` | Update/suspend a panchayat |
| `GET`  | `/api/super/audit` | View audit log |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Health check (for ALB/ECS) |
| `GET`  | `/api/stats` | Public aggregate complaint statistics |
| `GET`  | `/api/villages?search=` | Search village directory (autocomplete) |
| `GET`  | `/api/panchayats` | List active panchayats (public, for registration) |

---

## 👤 Author

**Raj Baibhav**
- GitHub: [@rajbaibhav1910](https://github.com/rajbaibhav1910)

---

## 📄 License

This project is licensed under the MIT License.
