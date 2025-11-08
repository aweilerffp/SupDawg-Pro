#!/bin/bash

# SupDawg Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🐕 Starting SupDawg deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo "Error: Please run this script from the SupDawg root directory"
    exit 1
fi

# Backend deployment
echo -e "${YELLOW}📦 Building backend...${NC}"
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install --production

# Run database migrations
echo "Running database migrations..."
npm run migrate

# Create logs directory
mkdir -p logs

cd ..

# Frontend deployment
echo -e "${YELLOW}📦 Building frontend...${NC}"
cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Build production bundle
echo "Building production bundle..."
npm run build

cd ..

# PM2 deployment
echo -e "${YELLOW}🚀 Deploying with PM2...${NC}"
cd backend

# Stop existing process if running
pm2 delete supdawg-backend 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Backend deployed successfully!${NC}"

cd ..

# Copy frontend build to web server directory (adjust path as needed)
if [ -d "/var/www/supdawg" ]; then
    echo -e "${YELLOW}📋 Copying frontend files to web server...${NC}"
    sudo rm -rf /var/www/supdawg/frontend/dist
    sudo mkdir -p /var/www/supdawg/frontend
    sudo cp -r frontend/dist /var/www/supdawg/frontend/
    sudo chown -R www-data:www-data /var/www/supdawg/frontend/dist
    echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  /var/www/supdawg not found. Please manually copy frontend/dist to your web server directory${NC}"
fi

# Reload Nginx
echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
sudo nginx -t && sudo systemctl reload nginx || echo "Nginx reload failed - please check configuration"

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check PM2 status: pm2 status"
echo "2. View logs: pm2 logs supdawg-backend"
echo "3. Test the application at your domain"
echo ""
