#!/bin/bash

# Server setup script for Hetzner Ubuntu server
# Run this script on your Hetzner server as root

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

log_info "🚀 Setting up Hetzner server for Cinetune Video Editor deployment..."

# Update system
log_info "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
log_info "📦 Installing required packages..."
apt install -y \
    curl \
    wget \
    git \
    nginx \
    ufw \
    fail2ban \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js 18
log_info "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
log_info "🚀 Installing PM2 for process management..."
npm install -g pm2

# Setup PM2 startup script
pm2 startup systemd -u www-data --hp /home/www-data

# Create application user
log_info "👤 Creating application user..."
if ! id "www-data" &>/dev/null; then
    useradd -r -s /bin/false www-data
fi

# Create application directories
log_info "📁 Creating application directories..."
mkdir -p /opt/cinetune
mkdir -p /opt/cinetune/logs
mkdir -p /opt/backups
mkdir -p /var/log/cinetune

# Set permissions
chown -R www-data:www-data /opt/cinetune
chown -R www-data:www-data /var/log/cinetune
chmod -R 755 /opt/cinetune

# Configure firewall
log_info "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Configure fail2ban
log_info "🛡️ Configuring fail2ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Create nginx configuration directory
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Create SSL certificate directory
mkdir -p /etc/nginx/ssl

# Install Let's Encrypt certbot (optional)
log_info "🔒 Installing Certbot for SSL certificates..."
apt install -y certbot python3-certbot-nginx

# Create environment file template
log_info "📝 Creating environment template..."
cat > /opt/cinetune/.env.template << 'EOF'
# Production Environment Variables
NODE_ENV=production
PORT=3000
PEXELS_API_KEY=your_pexels_api_key_here

# Add other environment variables as needed
# DATABASE_URL=
# JWT_SECRET=
# STRIPE_SECRET_KEY=
EOF

# Create a sample health check endpoint
log_info "🏥 Setting up health check..."
mkdir -p /opt/cinetune/scripts
cat > /opt/cinetune/scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check script
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $response -eq 200 ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is unhealthy (HTTP $response)"
    exit 1
fi
EOF

chmod +x /opt/cinetune/scripts/health-check.sh

# Create logrotate configuration
log_info "📋 Setting up log rotation..."
cat > /etc/logrotate.d/cinetune << 'EOF'
/var/log/cinetune/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        systemctl reload cinetune-video-editor || true
    endscript
}
EOF

# Display system information
log_info "ℹ️ System Information:"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"

log_info "✅ Server setup completed!"
log_warn "⚠️ Next steps:"
echo "1. Copy your SSL certificates to /etc/nginx/ssl/"
echo "2. Update /opt/cinetune/.env with your environment variables"
echo "3. Update the nginx.conf with your domain name"
echo "4. Run your deployment script from your local machine"
echo "5. Test SSL setup with: certbot --nginx -d your-domain.com"

log_info "🎉 Your Hetzner server is now ready for Cinetune deployment!"