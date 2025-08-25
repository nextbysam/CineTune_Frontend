#!/bin/bash

# Deployment script for Hetzner server
set -e

echo "🚀 Starting deployment to Hetzner server..."

# Configuration
SERVER_IP="YOUR_HETZNER_SERVER_IP"
SERVER_USER="root"
APP_NAME="cinetune-video-editor"
DEPLOY_PATH="/opt/cinetune"
BACKUP_PATH="/opt/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Build the application locally first
log_info "Building application locally..."
npm run build

# Create deployment archive
log_info "Creating deployment archive..."
tar -czf cinetune-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next \
    --exclude="*.tar.gz" \
    .

# Upload to server
log_info "Uploading to Hetzner server..."
scp cinetune-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Connect to server and deploy
log_info "Connecting to server for deployment..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

# Configuration
DEPLOY_PATH="/opt/cinetune"
BACKUP_PATH="/opt/backups"
SERVICE_NAME="cinetune-video-editor"

echo "📦 Setting up deployment environment..."

# Create directories
mkdir -p $DEPLOY_PATH
mkdir -p $BACKUP_PATH
mkdir -p $DEPLOY_PATH/logs

# Backup existing deployment
if [ -d "$DEPLOY_PATH/current" ]; then
    echo "📋 Creating backup..."
    BACKUP_NAME="cinetune-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r $DEPLOY_PATH/current $BACKUP_PATH/$BACKUP_NAME
    echo "✅ Backup created: $BACKUP_NAME"
fi

# Extract new deployment
echo "📂 Extracting new deployment..."
cd $DEPLOY_PATH
rm -rf new
mkdir new
cd new
tar -xzf /tmp/cinetune-deploy.tar.gz

# Install dependencies and build
echo "📦 Installing dependencies..."
npm ci --only=production
npm run build

# Switch deployments
echo "🔄 Switching deployments..."
cd $DEPLOY_PATH
rm -rf previous
if [ -d "current" ]; then
    mv current previous
fi
mv new current

# Copy PM2 config
cp current/ecosystem.config.js ./

# Stop existing PM2 process
echo "⏹️  Stopping existing PM2 process..."
su - www-data -c "cd $DEPLOY_PATH && pm2 stop cinetune-video-editor || true"

# Start PM2 process
echo "▶️  Starting PM2 process..."
su - www-data -c "cd $DEPLOY_PATH && pm2 start ecosystem.config.js --env production"

# Save PM2 configuration
su - www-data -c "pm2 save"

# Cleanup
rm -f /tmp/cinetune-deploy.tar.gz

echo "✅ Deployment completed successfully!"
echo "🌐 PM2 status:"
su - www-data -c "pm2 status"

ENDSSH

# Cleanup local files
rm -f cinetune-deploy.tar.gz

log_info "🎉 Deployment completed successfully!"
log_info "Your application should now be running on your Hetzner server."