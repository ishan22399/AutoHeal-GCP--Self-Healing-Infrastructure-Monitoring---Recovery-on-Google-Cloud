#!/bin/bash

# Deploy AutoHeal Cloud Functions to GCP

set -e

# Configuration
PROJECT_ID=${GOOGLE_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-"us-central1"}
FUNCTION_NAME="autoheal-function"
PUBSUB_TOPIC="autoheal-alerts"

echo "🚀 Deploying AutoHeal Cloud Functions..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please authenticate with gcloud first:"
    echo "gcloud auth login"
    exit 1
fi

# Deploy the Pub/Sub triggered function
echo "📦 Deploying Pub/Sub triggered function..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=./healing_function \
    --entry-point=autoheal_function \
    --trigger-topic=$PUBSUB_TOPIC \
    --memory=512MB \
    --timeout=540s \
    --set-env-vars="GCP_PROJECT=$PROJECT_ID,GCP_REGION=$REGION" \
    --max-instances=10

# Deploy the HTTP triggered function for testing
echo "🌐 Deploying HTTP triggered function..."
gcloud functions deploy "${FUNCTION_NAME}-http" \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=./healing_function \
    --entry-point=autoheal_http \
    --trigger-http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=60s \
    --set-env-vars="GCP_PROJECT=$PROJECT_ID,GCP_REGION=$REGION" \
    --max-instances=5

echo "✅ Cloud Functions deployed successfully!"
echo ""
echo "📋 Function URLs:"
echo "HTTP Function: https://$REGION-$PROJECT_ID.cloudfunctions.net/${FUNCTION_NAME}-http"
echo ""
echo "🧪 Test the HTTP function:"
echo "curl https://$REGION-$PROJECT_ID.cloudfunctions.net/${FUNCTION_NAME}-http"
