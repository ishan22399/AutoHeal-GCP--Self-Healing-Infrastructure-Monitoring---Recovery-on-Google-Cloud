#!/bin/bash

# Production Deployment Script for AutoHeal-GCP
# This script deploys AutoHeal-GCP with production-ready configurations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "${BLUE}🚀 AutoHeal-GCP Production Deployment${NC}"
echo "======================================"

# Validate environment
if [ -z "$GOOGLE_PROJECT_ID" ]; then
    print_error "GOOGLE_PROJECT_ID environment variable is required"
    exit 1
fi

if [ -z "$SENDGRID_API_KEY" ]; then
    print_warning "SENDGRID_API_KEY not set - email notifications will be disabled"
fi

if [ -z "$SLACK_WEBHOOK_URL" ]; then
    print_warning "SLACK_WEBHOOK_URL not set - Slack notifications will be disabled"
fi

if [ -z "$NOTIFICATION_EMAIL" ]; then
    print_warning "NOTIFICATION_EMAIL not set - using default"
    NOTIFICATION_EMAIL="admin@example.com"
fi

# Production configuration
REGION=${GCP_REGION:-"us-central1"}
ZONE=${GCP_ZONE:-"us-central1-a"}
ENVIRONMENT="production"

print_info "Deploying to project: $GOOGLE_PROJECT_ID"
print_info "Region: $REGION"
print_info "Environment: $ENVIRONMENT"

# Create production terraform.tfvars
print_info "Creating production configuration..."
cd terraform

cat > terraform.tfvars &lt;&lt; EOF
project_id = "$GOOGLE_PROJECT_ID"
region = "$REGION"
zone = "$ZONE"
sendgrid_api_key = "$SENDGRID_API_KEY"
slack_webhook_url = "$SLACK_WEBHOOK_URL"
notification_email = "$NOTIFICATION_EMAIL"
EOF

# Deploy infrastructure
print_info "Deploying production infrastructure..."
terraform init
terraform plan -out=production.tfplan
terraform apply production.tfplan
print_status "Infrastructure deployed"

cd ..

# Deploy Cloud Functions with production settings
print_info "Deploying Cloud Functions..."
cd cloud-functions

# Set production environment variables
export GOOGLE_PROJECT_ID="$GOOGLE_PROJECT_ID"
export GCP_REGION="$REGION"

# Deploy with production configuration
gcloud functions deploy autoheal-function \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=./healing_function \
    --entry-point=autoheal_function \
    --trigger-topic=autoheal-alerts \
    --memory=1GB \
    --timeout=540s \
    --set-env-vars="GCP_PROJECT=$GOOGLE_PROJECT_ID,GCP_REGION=$REGION,SENDGRID_API_KEY=$SENDGRID_API_KEY,SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL,NOTIFICATION_EMAIL=$NOTIFICATION_EMAIL" \
    --max-instances=50 \
    --min-instances=1

print_status "Cloud Functions deployed"
cd ..

# Build and deploy dashboard
print_info "Building production dashboard..."
cd dashboard
npm ci
npm run build
print_status "Dashboard built"

# Optional: Deploy to Cloud Run
if [ "$DEPLOY_DASHBOARD" = "true" ]; then
    print_info "Deploying dashboard to Cloud Run..."
    
    # Create Dockerfile for dashboard
    cat > Dockerfile &lt;&lt; 'EOF'
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
EOF

    # Build and deploy
    gcloud builds submit --tag gcr.io/$GOOGLE_PROJECT_ID/autoheal-dashboard .
    gcloud run deploy autoheal-dashboard \
        --image gcr.io/$GOOGLE_PROJECT_ID/autoheal-dashboard \
        --region=$REGION \
        --allow-unauthenticated \
        --memory=512Mi \
        --cpu=1 \
        --max-instances=10
    
    print_status "Dashboard deployed to Cloud Run"
fi

cd ..

# Set up monitoring and alerting
print_info "Configuring production monitoring..."

# Create additional alert policies for production
gcloud alpha monitoring policies create --policy-from-file=- &lt;&lt; 'EOF'
{
  "displayName": "AutoHeal Function Errors",
  "conditions": [
    {
      "displayName": "Cloud Function error rate",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_function\" AND resource.labels.function_name=\"autoheal-function\"",
        "comparison": "COMPARISON_GREATER_THAN",
        "thresholdValue": 0.1,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
EOF

print_status "Production monitoring configured"

# Create production documentation
print_info "Generating production documentation..."
cat > PRODUCTION_DEPLOYMENT.md &lt;&lt; EOF
# AutoHeal-GCP Production Deployment

## Deployment Information
- **Project ID**: $GOOGLE_PROJECT_ID
- **Region**: $REGION
- **Environment**: $ENVIRONMENT
- **Deployment Date**: $(date)

## Deployed Resources
- Cloud Functions: autoheal-function
- Pub/Sub Topic: autoheal-alerts
- Compute Instance: autoheal-test-vm
- Cloud Run Service: autoheal-test-service
- Monitoring Policies: High CPU, Service Down, Function Errors

## Monitoring URLs
- Cloud Console: https://console.cloud.google.com/home/dashboard?project=$GOOGLE_PROJECT_ID
- Cloud Functions: https://console.cloud.google.com/functions/list?project=$GOOGLE_PROJECT_ID
- Cloud Monitoring: https://console.cloud.google.com/monitoring?project=$GOOGLE_PROJECT_ID

## Testing Commands
\`\`\`bash
# Test healing function
curl -X POST https://$REGION-$GOOGLE_PROJECT_ID.cloudfunctions.net/autoheal-function-http \\
  -H "Content-Type: application/json" \\
  -d '{"test": true}'

# View function logs
gcloud functions logs read autoheal-function --region=$REGION

# Monitor Pub/Sub messages
gcloud pubsub subscriptions pull autoheal-subscription --auto-ack
\`\`\`

## Maintenance
- Function logs are retained for 30 days
- Monitoring data is retained for 6 months
- Regular testing should be performed monthly

## Support
For issues, check:
1. Cloud Function logs
2. Cloud Monitoring alerts
3. Pub/Sub message delivery
EOF

print_status "Production deployment completed!"

echo ""
echo -e "${GREEN}🎉 AutoHeal-GCP Production Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "📋 Deployed Resources:"
echo "  • Cloud Functions with production scaling"
echo "  • Enhanced monitoring and alerting"
echo "  • Production-grade error handling"
echo "  • Comprehensive logging"
echo ""
echo "📊 Monitoring:"
echo "  • Cloud Console: https://console.cloud.google.com/home/dashboard?project=$GOOGLE_PROJECT_ID"
echo "  • Function Logs: gcloud functions logs read autoheal-function --region=$REGION"
echo ""
echo "🔧 Next Steps:"
echo "  1. Test the system with failure simulations"
echo "  2. Configure additional alert policies as needed"
echo "  3. Set up regular health checks"
echo "  4. Review and adjust scaling parameters"
echo ""
print_status "Production deployment successful!"
