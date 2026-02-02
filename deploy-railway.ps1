# Railway Terraform Deployment Script
# Automated deployment of EvolutionBackend to Railway

param(
    [Parameter(Mandatory=$true)]
    [string]$RailwayToken,
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubRepo = "https://github.com/YOUR_USERNAME/EvolutionBackend"
)

Write-Host "🚀 Railway Terraform Deployment Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Set Railway API token
Write-Host "✓ Setting Railway API token..." -ForegroundColor Green
$env:RAILWAY_API_TOKEN = $RailwayToken

# Navigate to terraform directory
$terraformDir = Join-Path $PSScriptRoot "terraform"
Write-Host "✓ Navigating to: $terraformDir" -ForegroundColor Green
Set-Location $terraformDir

# Check if terraform is installed
Write-Host "✓ Checking Terraform installation..." -ForegroundColor Green
try {
    $tfVersion = terraform version
    Write-Host "  Found: $($tfVersion[0])" -ForegroundColor Gray
} catch {
    Write-Host "❌ Terraform not found! Please install: choco install terraform" -ForegroundColor Red
    exit 1
}

# Create terraform.tfvars if it doesn't exist
if (-not (Test-Path "terraform.tfvars")) {
    Write-Host "✓ Creating terraform.tfvars from example..." -ForegroundColor Green
    Copy-Item "terraform.tfvars.example" "terraform.tfvars"
    
    # Update GitHub repo in tfvars
    $tfvarsContent = Get-Content "terraform.tfvars" -Raw
    $tfvarsContent = $tfvarsContent -replace 'github_repo = ".*"', "github_repo = `"$GitHubRepo`""
    Set-Content "terraform.tfvars" $tfvarsContent
    
    Write-Host "  ⚠️  Please review terraform.tfvars and update if needed" -ForegroundColor Yellow
} else {
    Write-Host "✓ terraform.tfvars already exists" -ForegroundColor Green
}

# Initialize Terraform
Write-Host ""
Write-Host "📦 Initializing Terraform..." -ForegroundColor Cyan
terraform init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Terraform init failed!" -ForegroundColor Red
    exit 1
}

# Run Terraform Plan
Write-Host ""
Write-Host "📋 Planning infrastructure changes..." -ForegroundColor Cyan
terraform plan
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Terraform plan failed!" -ForegroundColor Red
    exit 1
}

# Ask user if they want to apply
Write-Host ""
Write-Host "🤔 Do you want to deploy these changes to Railway?" -ForegroundColor Yellow
Write-Host "   This will create:" -ForegroundColor Gray
Write-Host "   - Railway Project" -ForegroundColor Gray
Write-Host "   - PostgreSQL Database" -ForegroundColor Gray
Write-Host "   - Redis Cache" -ForegroundColor Gray
Write-Host "   - Backend Service" -ForegroundColor Gray
Write-Host "   - Evolution API Service" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "Type 'yes' to continue"

if ($confirm -eq "yes") {
    Write-Host ""
    Write-Host "🚀 Deploying to Railway..." -ForegroundColor Cyan
    terraform apply -auto-approve
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Deployment Information:" -ForegroundColor Cyan
        terraform output
        Write-Host ""
        Write-Host "🔗 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Visit the Railway dashboard URL above" -ForegroundColor Gray
        Write-Host "2. Get your service public URLs" -ForegroundColor Gray
        Write-Host "3. Test: https://<backend>.up.railway.app/health" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Deployment failed! Check errors above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "⏸️  Deployment cancelled." -ForegroundColor Yellow
}
