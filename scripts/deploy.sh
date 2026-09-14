#!/usr/bin/env bash
# ==============================================================================
# SmartGram Pro — Automated AWS Cloud Infrastructure Deployment (Bash)
# ==============================================================================
set -euo pipefail

ENVIRONMENT="${1:-prod}"
REGION="${AWS_REGION:-ap-south-1}"
ADMIN_EMAIL="${2:-}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${YELLOW}  >> SmartGram Pro Deployment Pipeline (${ENVIRONMENT} - ${REGION})${NC}"
echo -e "${CYAN}====================================================================${NC}\n"

# 1. AWS Preflight
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}[OK] Authenticated as Account: ${ACCOUNT_ID}${NC}"
echo -e "${GREEN}[OK] Target Region: ${REGION}${NC}"

# 2. Secrets Manager Setup
SECRET_NAME="smartgram/${ENVIRONMENT}/config"
if ! aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "Creating secret $SECRET_NAME in Secrets Manager..."
    RANDOM_KEY=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "SmartGram Pro Production Credentials" \
        --secret-string "{\"SECRET_KEY\":\"${RANDOM_KEY}\",\"ENV\":\"${ENVIRONMENT}\"}" \
        --region "$REGION" >/dev/null
    echo -e "${GREEN}[OK] Secret created.${NC}"
else
    echo -e "${GREEN}[OK] Secret ${SECRET_NAME} exists.${NC}"
fi

# 3. Deploy CloudFormation Stack
STACK_NAME="smartgram-${ENVIRONMENT}"
TEMPLATE_FILE="$(dirname "$0")/../infrastructure/master-stack.yaml"

echo "Deploying CloudFormation master infrastructure..."
DEPLOY_CMD=(
    aws cloudformation deploy
    --stack-name "$STACK_NAME"
    --template-file "$TEMPLATE_FILE"
    --capabilities CAPABILITY_NAMED_IAM
    --parameter-overrides "EnvironmentName=${ENVIRONMENT}"
    --region "$REGION"
)

if [ -n "$ADMIN_EMAIL" ]; then
    DEPLOY_CMD+=(--parameter-overrides "EnvironmentName=${ENVIRONMENT}" "AdminAlertEmail=${ADMIN_EMAIL}")
fi

"${DEPLOY_CMD[@]}"
echo -e "${GREEN}[OK] CloudFormation stack deployed.${NC}"

# 4. Extract Outputs
ECR_URI=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='EcrRepositoryUri'].OutputValue" --output text)
APP_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='ApplicationUrl'].OutputValue" --output text)
FRONTEND_BUCKET="smartgram-frontend-${ACCOUNT_ID}-${REGION}"

echo -e "  • Public URL:        ${CYAN}${APP_URL}${NC}"
echo -e "  • ECR URI:           ${CYAN}${ECR_URI}${NC}"
echo -e "  • Frontend Bucket:   ${CYAN}${FRONTEND_BUCKET}${NC}"

# 5. Build and Deploy Frontend
echo "Building frontend static assets..."
pushd "$(dirname "$0")/../frontend" >/dev/null
if [ ! -d "node_modules" ]; then
    npm ci
fi
npm run build
aws s3 sync dist "s3://${FRONTEND_BUCKET}" --delete --region "$REGION"
popd >/dev/null
echo -e "${GREEN}[OK] Frontend uploaded to S3.${NC}"

# 6. Build and Push Backend Container
echo "Building backend Docker container..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
pushd "$(dirname "$0")/.." >/dev/null
docker build -t "${ECR_URI}:latest" -f Dockerfile .
docker push "${ECR_URI}:latest"

echo "Triggering ECS zero-downtime rolling deployment..."
aws ecs update-service \
    --cluster "smartgram-${ENVIRONMENT}-cluster" \
    --service "smartgram-${ENVIRONMENT}-service" \
    --force-new-deployment \
    --region "$REGION" >/dev/null
popd >/dev/null
echo -e "${GREEN}[OK] ECS service update triggered.${NC}"

# 7. Seed Admin in DynamoDB
echo "Seeding default admin user..."
AWS_REGION="$REGION" USERS_TABLE="SmartGramUsers" python "$(dirname "$0")/../create_admin.py"

# 8. Invalidate CloudFront Cache
CF_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='SmartGram Pro Master CDN (${ENVIRONMENT})'].Id" \
    --output text)
if [ -n "$CF_ID" ] && [ "$CF_ID" != "None" ]; then
    aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*" >/dev/null
    echo -e "${GREEN}[OK] CloudFront cache invalidation submitted for ${CF_ID}.${NC}"
fi

echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}Public URL:        ${APP_URL}${NC}"
echo -e "${CYAN}API Health:        ${APP_URL}/api/health${NC}"
echo -e "${CYAN}Admin Credentials: admin / admin123${NC}\n"
