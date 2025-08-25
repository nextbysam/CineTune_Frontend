#!/bin/bash

# Setup Nginx for Cinetune Video Editor
set -e

# Colors
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo)"
    exit 1
fi

log_info "🌐 Setting up Nginx for Cinetune Video Editor..."

# Copy nginx configuration
log_info "📋 Copying Nginx configuration..."
cp nginx.conf /etc/nginx/nginx.conf

# Test nginx configuration
log_info "🔍 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    log_info "✅ Nginx configuration is valid"
    
    # Reload nginx
    log_info "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    log_info "✅ Nginx setup completed!"
else
    log_error "❌ Nginx configuration test failed"
    exit 1
fi

log_info "🎉 Nginx is now configured for Cinetune!"
log_warn "⚠️ Don't forget to:"
echo "1. Update your domain name in /etc/nginx/nginx.conf"
echo "2. Setup SSL certificates with: certbot --nginx -d your-domain.com"
echo "3. Ensure your Node.js app is running on port 3000"