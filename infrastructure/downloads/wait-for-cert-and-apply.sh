#!/bin/bash

CERT_ARN="arn:aws:acm:us-east-1:720237151757:certificate/d0ea9ce4-e589-4cf0-8008-2be2d05a3509"
TF_VARS_FILE="production.tfvars"
SLEEP_INTERVAL=30

echo "Polling ACM certificate status for $CERT_ARN..."

while true; do
  STATUS=$(aws acm describe-certificate \
    --certificate-arn "$CERT_ARN" \
    --query 'Certificate.Status' \
    --output text)

  echo "Current status: $STATUS"

  if [[ "$STATUS" == "ISSUED" ]]; then
    echo "Certificate issued. Running terraform apply..."
    terraform apply -var-file="$TF_VARS_FILE" -auto-approve
    exit 0
  elif [[ "$STATUS" == "FAILED" ]]; then
    echo "Certificate validation failed. Check ACM or DNS."
    exit 1
  fi

  echo "Waiting $SLEEP_INTERVAL seconds before checking again..."
  sleep "$SLEEP_INTERVAL"
done
