#!/bin/bash

# SSL Certificate Setup Script for Plavdata
# Run this script on your VPS after initial deployment

set -e

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "Error: .env.prod not found. Please create it from .env.prod.example"
    exit 1
fi

# Load environment variables
source .env.prod

if [ -z "$SERVER_NAME" ]; then
    echo "Error: SERVER_NAME not set in .env.prod"
    exit 1
fi

echo "=== SSL Certificate Setup for $SERVER_NAME ==="

# Create directories
mkdir -p certbot/www certbot/conf

# Step 1: Start services without SSL first
echo "Step 1: Starting services (HTTP only)..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d nginx backend frontend

# Wait for nginx to start
sleep 5

# Step 2: Obtain certificate
echo "Step 2: Obtaining SSL certificate from Let's Encrypt..."
echo "Please enter your email for Let's Encrypt notifications:"
read -r EMAIL

docker compose -f docker-compose.prod.yml run --rm certbot \
    certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$SERVER_NAME"

if [ $? -eq 0 ]; then
    echo ""
    echo "=== SUCCESS! ==="
    echo "SSL certificate obtained for $SERVER_NAME"
    echo ""
    echo "Next steps:"
    echo "1. Edit nginx/nginx.conf"
    echo "2. Uncomment the HTTPS server block (lines 85-139)"
    echo "3. Uncomment the HTTP->HTTPS redirect (lines 45-47)"
    echo "4. Update .env.prod: VITE_API_BASE_URL=https://$SERVER_NAME"
    echo "5. Rebuild frontend: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build frontend"
    echo "6. Restart nginx: docker compose -f docker-compose.prod.yml restart nginx"
    echo ""
    echo "Certificate will auto-renew via the certbot service."
else
    echo "Failed to obtain certificate. Check the error above."
    exit 1
fi

