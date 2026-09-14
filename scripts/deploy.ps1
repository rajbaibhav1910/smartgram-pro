# ==============================================================================
# SmartGram Pro — Automated AWS Cloud Infrastructure Deployment (PowerShell)
# ==============================================================================
[CmdletBinding()]
param(
    [string]$Environment = "prod",
    [string]$Region = "ap-south-1",
    [string]$AdminEmail = "",
    [string]$EnableCloudFront = "false",
    [switch]$SkipDockerBuild = $false,
    [switch]$SkipFrontendBuild = $false
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n====================================================================" -ForegroundColor Cyan
    Write-Host "  >> $Message" -ForegroundColor Yellow
    Write-Host "====================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

# 1. AWS Preflight Check
Write-Step "Checking AWS Credentials and Environment..."
$caller = aws sts get-caller-identity | ConvertFrom-Json
$AccountId = $caller.Account
Write-Success "Authenticated as Account: $AccountId ($($caller.Arn))"
Write-Success "Target AWS Region: $Region"

# 2. Secrets Manager Setup for Session Key
Write-Step "Setting up AWS Secrets Manager Secret..."
$SecretName = "smartgram/$Environment/config"
$SecretExists = $false
try {
    aws secretsmanager describe-secret --secret-id $SecretName --region $Region 2>$null | Out-Null
    $SecretExists = $true
    Write-Success "Secret $SecretName already exists in Secrets Manager."
} catch {
    $SecretExists = $false
}

if (-not $SecretExists) {
    $RandomSecretKey = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
    $SecretPayload = @{
        SECRET_KEY = $RandomSecretKey
        ENV = $Environment
    } | ConvertTo-Json -Compress

    aws secretsmanager create-secret `
        --name $SecretName `
        --description "SmartGram Pro Production Credentials" `
        --secret-string $SecretPayload `
        --region $Region | Out-Null
    Write-Success "Created new secret $SecretName in AWS Secrets Manager."
}

# 3. Deploy CloudFormation Stack
Write-Step "Deploying AWS CloudFormation Master Infrastructure Stack..."
$StackName = "smartgram-$Environment"
$TemplateFile = Join-Path $PSScriptRoot "..\infrastructure\master-stack.yaml"

$DeployArgs = @(
    "cloudformation", "deploy",
    "--stack-name", $StackName,
    "--template-file", $TemplateFile,
    "--capabilities", "CAPABILITY_NAMED_IAM",
    "--parameter-overrides", "EnvironmentName=$Environment", "EnableCloudFront=$EnableCloudFront",
    "--region", $Region
)

if ($AdminEmail -ne "") {
    $DeployArgs += "AdminAlertEmail=$AdminEmail"
}

Write-Host "Executing CloudFormation deployment (this may take 5-10 minutes on first run)..." -ForegroundColor Gray
& aws @DeployArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] CloudFormation deployment failed with exit code $LASTEXITCODE." -ForegroundColor Red
    Write-Host "Inspect failures with: aws cloudformation describe-stack-events --stack-name $StackName --region $Region" -ForegroundColor Yellow
    exit $LASTEXITCODE
}
Write-Success "CloudFormation stack '$StackName' deployed successfully!"

# 4. Extract Stack Outputs
Write-Step "Retrieving Stack Resource Outputs..."
$StackOutputs = (aws cloudformation describe-stacks --stack-name $StackName --region $Region | ConvertFrom-Json).Stacks[0].Outputs

$EcrUri = ($StackOutputs | Where-Object { $_.OutputKey -eq "EcrRepositoryUri" }).OutputValue
$AppUrl = ($StackOutputs | Where-Object { $_.OutputKey -eq "ApplicationUrl" }).OutputValue
$AlbDns = ($StackOutputs | Where-Object { $_.OutputKey -eq "AlbDnsName" }).OutputValue
$FrontendBucket = "smartgram-frontend-$AccountId-$Region"

if (-not $EcrUri) {
    Write-Host "[ERROR] Could not resolve EcrRepositoryUri from stack outputs." -ForegroundColor Red
    exit 1
}

Write-Host "  • CloudFront Application URL: $AppUrl" -ForegroundColor Cyan
Write-Host "  • ALB DNS Name:             $AlbDns" -ForegroundColor Cyan
Write-Host "  • ECR Repository URI:        $EcrUri" -ForegroundColor Cyan
Write-Host "  • Frontend S3 Bucket:        $FrontendBucket" -ForegroundColor Cyan

# 5. Build and Deploy Frontend
if (-not $SkipFrontendBuild) {
    Write-Step "Building React Frontend Application..."
    Push-Location (Join-Path $PSScriptRoot "..\frontend")
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
            npm ci
        }
        npm run build
        Write-Success "Frontend built cleanly in frontend/dist."

        Write-Step "Syncing Frontend Build to Private S3 Bucket..."
        aws s3 sync dist "s3://$FrontendBucket" --delete --region $Region
        Write-Success "Frontend static assets synced to s3://$FrontendBucket"
    } finally {
        Pop-Location
    }
}

# 6. Build and Deploy Backend Container to Amazon ECR
if (-not $SkipDockerBuild) {
    Write-Step "Authenticating Docker with Amazon ECR..."
    $Password = aws ecr get-login-password --region $Region
    $Password | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
    Write-Success "Docker authenticated with ECR."

    Write-Step "Building and Tagging Backend Docker Image..."
    Push-Location (Join-Path $PSScriptRoot "..")
    try {
        $ImageTag = "${EcrUri}:latest"
        docker build -t $ImageTag -f Dockerfile .
        Write-Success "Docker container built successfully."

        Write-Step "Pushing Image to Amazon ECR..."
        docker push $ImageTag
        Write-Success "Backend container image pushed to ECR: $ImageTag"
    } finally {
        Pop-Location
    }

    Write-Step "Triggering ECS Fargate Rolling Deployment..."
    aws ecs update-service `
        --cluster "smartgram-$Environment-cluster" `
        --service "smartgram-$Environment-service" `
        --force-new-deployment `
        --region $Region | Out-Null
    Write-Success "ECS service deployment triggered."
}

# 7. Seed Admin Account in DynamoDB
Write-Step "Seeding Default Admin Account in DynamoDB..."
Push-Location (Join-Path $PSScriptRoot "..")
try {
    $env:AWS_REGION = $Region
    $env:USERS_TABLE = "SmartGramUsers"
    python create_admin.py
} finally {
    Pop-Location
}

# 8. Invalidate CloudFront Cache (if CloudFront enabled)
if ($EnableCloudFront -eq "true") {
    Write-Step "Invalidating CloudFront Edge Cache..."
    $CfId = (aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='SmartGram Pro Master CDN ($Environment)'].Id" --output text)
    if ($CfId -and $CfId -ne "None") {
        aws cloudfront create-invalidation --distribution-id $CfId --paths "/*" | Out-Null
        Write-Success "Created CloudFront cache invalidation for distribution $CfId"
    }
}

# 9. Completion Summary
Write-Step "DEPLOYMENT COMPLETE!"
Write-Host "`n🎉 SmartGram Pro is now live on AWS!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Public URL:        $AppUrl" -ForegroundColor Cyan
Write-Host "  API Health Check:  $AppUrl/api/health" -ForegroundColor Cyan
Write-Host "  Admin Login:       $AppUrl/login" -ForegroundColor Cyan
Write-Host "  Username:          admin" -ForegroundColor White
Write-Host "  Default Password:  admin123" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green
