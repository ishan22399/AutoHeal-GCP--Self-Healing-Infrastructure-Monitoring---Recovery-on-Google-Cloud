#!/bin/bash

# AutoHeal-GCP Setup Script
# This script sets up the complete AutoHeal-GCP environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
ZONE="us-central1-a"

echo -e "${BLUE}🛠️  AutoHeal-GCP Setup Script${NC}"
echo "=================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed. Please install it first:"
    echo "https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No GCP project set. Please set your project:"
        echo "gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
fi

print_info "Using GCP Project: $PROJECT_ID"
print_info "Using Region: $REGION"
print_info "Using Zone: $ZONE"

# Confirm setup
echo ""
read -p "Do you want to proceed with the setup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Step 1: Initialize Terraform
print_info "Step 1: Initializing Terraform..."
cd terraform
terraform init
print_status "Terraform initialized"

# Step 2: Create terraform.tfvars
print_info "Step 2: Creating Terraform variables..."
cat > terraform.tfvars &lt;&lt; EOF
project_id = "$PROJECT_ID"
region = "$REGION"
zone = "$ZONE"
notification_email = "admin@example.com"
EOF
print_status "Terraform variables created"

# Step 3: Plan Terraform deployment
print_info "Step 3: Planning Terraform deployment..."
terraform plan
echo ""
read -p "Do you want to apply the Terraform plan? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Terraform deployment skipped"
else
    terraform apply -auto-approve
    print_status "Infrastructure deployed"
fi

cd ..

# Step 4: Deploy Cloud Functions
print_info "Step 4: Deploying Cloud Functions..."
cd cloud-functions
chmod +x deploy.sh

# Set environment variables for deployment
export GOOGLE_PROJECT_ID="$PROJECT_ID"
export GCP_REGION="$REGION"

./deploy.sh
print_status "Cloud Functions deployed"
cd ..

# Step 5: Install simulator dependencies
print_info "Step 5: Setting up failure simulators..."
cd simulator
if command -v python3 &> /dev/null; then
    python3 -m pip install -r requirements.txt
    print_status "Simulator dependencies installed"
else
    print_warning "Python3 not found. Please install simulator dependencies manually:"
    echo "cd simulator && pip install -r requirements.txt"
fi
cd ..

# Step 6: Setup dashboard (optional)
print_info "Step 6: Setting up dashboard..."
cd dashboard
if command -v npm &> /dev/null; then
    npm install
    print_status "Dashboard dependencies installed"
    print_info "To start the dashboard, run: cd dashboard && npm run dev"
else
    print_warning "npm not found. Please install dashboard dependencies manually:"
    echo "cd dashboard && npm install"
fi
cd ..

# Step 7: Create useful scripts
print_info "Step 7: Creating utility scripts..."

# Create test script
cat > test_autoheal.sh &lt;&lt; 'EOF'
#!/bin/bash
echo "🧪 Testing AutoHeal-GCP System"
echo "=============================="

# Get VM external IP
VM_IP=$(gcloud compute instances describe autoheal-test-vm --zone=us-central1-a --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null)

if [ -n "$VM_IP" ]; then
    echo "Testing VM endpoint: http://$VM_IP:8080"
    curl -f "http://$VM_IP:8080/health" || echo "VM health check failed"
    echo ""
    echo "Triggering CPU stress test..."
    curl -f "http://$VM_IP:8080/stress" || echo "Stress test trigger failed"
else
    echo "Could not get VM IP address"
fi

# Test Cloud Run service
CLOUD_RUN_URL=$(gcloud run services describe autoheal-test-service --region=us-central1 --format="get(status.url)" 2>/dev/null)
if [ -n "$CLOUD_RUN_URL" ]; then
    echo "Testing Cloud Run service: $CLOUD_RUN_URL"
    curl -f "$CLOUD_RUN_URL" || echo "Cloud Run service test failed"
else
    echo "Could not get Cloud Run service URL"
fi
EOF

chmod +x test_autoheal.sh

# Create cleanup script
cat > cleanup.sh &lt;&lt; 'EOF'
#!/bin/bash
echo "🧹 Cleaning up AutoHeal-GCP resources"
echo "====================================="

read -p "This will destroy all AutoHeal-GCP resources. Are you sure? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd terraform
    terraform destroy -auto-approve
    echo "✅ Resources cleaned up"
else
    echo "Cleanup cancelled"
fi
EOF

chmod +x cleanup.sh

print_status "Utility scripts created"

# Final summary
echo ""
echo -e "${GREEN}🎉 AutoHeal-GCP Setup Complete!${NC}"
echo "================================="
echo ""
echo "📋 What was deployed:"
echo "  • GCP Infrastructure (VMs, Cloud Run, Pub/Sub, etc.)"
echo "  • Cloud Functions for healing logic"
echo "  • Monitoring and alerting policies"
echo "  • Test applications and simulators"
echo ""
echo "🧪 Testing your setup:"
echo "  ./test_autoheal.sh"
echo ""
echo "📊 Start the dashboard:"
echo "  cd dashboard && npm run dev"
echo ""
echo "🔥 Run failure simulations:"
echo "  cd simulator"
echo "  python3 simulate_cpu_spike.py --duration 60"
echo "  python3 simulate_memory_leak.py --duration 60"
echo ""
echo "🧹 Clean up resources:"
echo "  ./cleanup.sh"
echo ""
echo "📚 View logs:"
echo "  gcloud logging read 'resource.type=\"cloud_function\"' --limit 50"
echo ""
print_status "Setup completed successfully!"
