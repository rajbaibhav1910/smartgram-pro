#!/bin/bash
# SmartGram Pro – EC2 Setup Script
# Run this after connecting to EC2 for the first time
# Usage: bash setup.sh

set -e
echo "=== SmartGram Pro EC2 Setup ==="

# 1. Update system
sudo apt update -y && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install python3 python3-pip python3-venv git nginx -y

# 3. Create project directory and venv
mkdir -p /home/ubuntu/smartgram
cd /home/ubuntu/smartgram
python3 -m venv venv
source venv/bin/activate

# 4. Install Python packages
pip install flask boto3 werkzeug gunicorn

# 5. Start & enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo ""
echo "=== Setup complete! Next steps ==="
echo "1. Copy your project files to /home/ubuntu/smartgram/"
echo "2. Update config.py with your S3 bucket and SNS ARN"
echo "3. Run: cd /home/ubuntu/smartgram && source venv/bin/activate"
echo "4. Create admin: python3 create_admin.py"
echo "5. Start app:    gunicorn --bind 0.0.0.0:5000 app:app"
echo "6. Configure Nginx (see GUIDE_PART3.md Section 21)"
