# Cinetune Video Editor - Production Deployment Guide

## Overview

This guide covers deploying the Cinetune Video Editor to a production Hetzner server with Node.js, PM2, Nginx reverse proxy, and SSL certificates.

## Prerequisites

- Hetzner Cloud Server (Ubuntu 20.04+ recommended, minimum 2GB RAM)
- Domain name pointed to your server IP (optional for testing)
- Access to Hetzner web console
- GitHub repository with your code

---

## 🖥️ Hetzner Web Console Deployment (Step-by-Step)

### Step 1: Initial Server Setup

1. **Login to your Hetzner server via web console**
   - Access your server through Hetzner Cloud Console
   - Click on "Console" to open the web terminal

2. **Update the system:**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install required packages:**
   ```bash
   apt install -y curl wget git nginx ufw fail2ban htop unzip software-properties-common
   ```

### Step 2: Install Node.js 18

1. **Add NodeSource repository:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   ```

2. **Install Node.js:**
   ```bash
   apt-get install -y nodejs
   ```

3. **Verify installation:**
   ```bash
   node --version
   npm --version
   ```

### Step 3: Install PM2 for Process Management

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Verify PM2 installation:**
   ```bash
   pm2 --version
   ```

### Step 4: Clone Your Repository

1. **Navigate to the deployment directory:**
   ```bash
   mkdir -p /opt/cinetune
   cd /opt/cinetune
   ```

2. **Clone your repository:**
   ```bash
   # Replace with your actual GitHub repository URL
   git clone https://github.com/nextbysam/CineTune_Frontend.git CineTune_Frontend
   ```

3. **Navigate to the project:**
   ```bash
   cd CineTune_Frontend
   ```

### Step 5: Setup Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create production environment file:**
   ```bash
   cp .env.production .env
   nano .env
   ```
   
   Update with your actual values:
   ```env
   NODE_ENV=production
   PORT=3000
   PEXELS_API_KEY=your_actual_pexels_api_key_here
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Copy static files for nginx serving (Important for standalone builds):**
   ```bash
   # Create symbolic links for easier nginx access to static files
   ln -sf /opt/cinetune/CineTune_Frontend/.next/static /opt/cinetune/CineTune_Frontend/static
   
   # Set permissions for static files
   chown -R www-data:www-data /opt/cinetune/CineTune_Frontend/.next
   chmod -R 755 /opt/cinetune/CineTune_Frontend/.next
   ```

### Step 6: Create Application User

1. **Create www-data user (if not exists):**
   ```bash
   id www-data || useradd -r -s /bin/false www-data
   ```

2. **Create necessary directories:**
   ```bash
   mkdir -p /var/log/cinetune
   mkdir -p /opt/cinetune/CineTune_Frontend/public/uploads
   mkdir -p /opt/cinetune/CineTune_Frontend/renders
   ```

3. **Set proper permissions:**
   ```bash
   chown -R www-data:www-data /opt/cinetune
   chown -R www-data:www-data /var/log/cinetune
   chmod -R 755 /opt/cinetune
   ```

### Step 7: Setup PM2 with User

1. **Create home directory for www-data:**
   ```bash
   mkdir -p /home/www-data
   chown www-data:www-data /home/www-data
   ```

2. **Setup PM2 startup for www-data user:**
   ```bash
   # This command will create the systemd service automatically
   su - www-data -c "pm2 startup systemd" || pm2 startup systemd -u www-data --hp /home/www-data
   ```
   
   ✅ **Expected output:** You should see:
   - `[PM2] Init System found: systemd`
   - Service template details
   - `[PM2] Writing init configuration in /etc/systemd/system/pm2-www-data.service`
   - `[PM2] [v] Command successfully executed.`

3. **Save PM2 process list for auto-restart:**
   ```bash
   # This step is important - it tells PM2 what processes to resurrect on boot
   pm2 save
   ```

### Step 8: Start Application with PM2

1. **Start the application:**
   ```bash
   cd /opt/cinetune/CineTune_Frontend
   PM2_HOME=/home/www-data/.pm2 pm2 start ecosystem.config.js --env production
   ```

2. **Check PM2 status:**
   ```bash
   PM2_HOME=/home/www-data/.pm2 pm2 status
   ```

3. **Save PM2 configuration:**
   ```bash
   PM2_HOME=/home/www-data/.pm2 pm2 save
   ```

   **Note:** We use `PM2_HOME=/home/www-data/.pm2` because the www-data user doesn't have shell access for security reasons.

### Step 9: Configure Nginx

1. **Backup default nginx config:**
   ```bash
   cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
   ```

2. **Choose nginx configuration based on your setup:**

   **Option A: For IP-only testing (recommended for initial setup):**
   ```bash
   cd /opt/cinetune/CineTune_Frontend
   cp nginx-simple.conf /etc/nginx/nginx.conf
   ```

   **Option B: For subdomain with SSL (app.thecinetune.com) - Fixed for static files:**
   ```bash
   cd /opt/cinetune/CineTune_Frontend
   cp nginx-standalone.conf /etc/nginx/nginx.conf
   ```
   
   **Option C: Original nginx config (if you have custom modifications):**
   ```bash
   cd /opt/cinetune/CineTune_Frontend
   cp nginx.conf /etc/nginx/nginx.conf
   ```
   
   ⚠️ **Important:** Use `nginx-standalone.conf` for production deployments to properly serve Next.js static files and prevent 404 errors.

4. **Test nginx configuration:**
   ```bash
   nginx -t
   ```

5. **Start and enable nginx:**
   ```bash
   systemctl start nginx
   systemctl enable nginx
   ```

### Step 10: Configure Firewall

1. **Setup UFW firewall:**
   ```bash
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 22
   ufw allow 80
   ufw allow 443
   ufw --force enable
   ```

### Step 11: Test Your Application

1. **Check if your app is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check if nginx is proxying correctly:**
   ```bash
   curl http://localhost/api/health
   ```

3. **Access from browser:**
   - Open your browser
   - Go to `http://YOUR_SERVER_IP` (replace with actual IP)
   - You should see your video editor application

### Step 12: Setup SSL (Optional but Recommended)

1. **Install Certbot:**
   ```bash
   apt install -y certbot python3-certbot-nginx
   ```

2. **Get SSL certificate for subdomain:**
   ```bash
   certbot --nginx -d app.thecinetune.com
   ```

---

## 🔧 Troubleshooting for Web Console Setup

### Common Issues and Solutions

1. **If you see 404 errors for JS/CSS files (main issue):**
   ```bash
   # This is the most common issue - static files not served properly
   
   # Step 1: Check if build completed successfully
   ls -la /opt/cinetune/CineTune_Frontend/.next/static/
   
   # Step 2: Use the correct nginx config for standalone builds
   cd /opt/cinetune/CineTune_Frontend
   cp nginx-standalone.conf /etc/nginx/nginx.conf
   
   # Step 3: Test nginx configuration
   nginx -t
   
   # Step 4: Restart nginx
   systemctl restart nginx
   
   # Step 5: Check nginx is serving static files
   curl -I http://localhost/_next/static/css/app/layout.css
   
   # Step 6: If still failing, check file permissions
   chown -R www-data:www-data /opt/cinetune/CineTune_Frontend/.next
   chmod -R 755 /opt/cinetune/CineTune_Frontend/.next
   ```

2. **If PM2 startup fails:**
   ```bash
   # Try running the PM2 startup command as root
   pm2 startup systemd
   # Then copy and run the generated command
   ```

2. **If the app doesn't start:**
   ```bash
   # Check PM2 logs
   su - www-data -c "pm2 logs"
   
   # Or check the log files directly
   tail -f /var/log/cinetune/error.log
   ```

3. **If Nginx fails to start:**
   ```bash
   # Check nginx configuration
   nginx -t
   
   # Check nginx logs
   tail -f /var/log/nginx/error.log
   ```

4. **If you can't access the app:**
   ```bash
   # Check if the app is running on port 3000
   netstat -tlnp | grep :3000
   
   # Check if nginx is running
   systemctl status nginx
   
   # Check firewall status
   ufw status
   ```

5. **Permission errors:**
   ```bash
   # Fix permissions for the entire cinetune directory
   chown -R www-data:www-data /opt/cinetune
   chmod -R 755 /opt/cinetune
   ```

### Quick Status Checks

```bash
# Check all services
systemctl status nginx
su - www-data -c "pm2 status"

# Check ports
netstat -tlnp | grep -E ":(80|443|3000)"

# Check logs
su - www-data -c "pm2 logs cinetune-video-editor --lines 50"
tail -f /var/log/nginx/error.log
```

### Manual Start (if PM2 fails)

```bash
# You can manually start the app for testing
cd /opt/cinetune/CineTune_Frontend
NODE_ENV=production PORT=3000 node server.js
```

---

## 🚀 Quick Start (Node.js + PM2 Deployment)

### Step 1: Server Setup

1. **Connect to your Hetzner server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Run the server setup script:**
   ```bash
   curl -sSL https://raw.githubusercontent.com/your-repo/react-video-editor/main/server-setup.sh | bash
   ```

   Or upload and run locally:
   ```bash
   scp server-setup.sh root@YOUR_SERVER_IP:/tmp/
   ssh root@YOUR_SERVER_IP "chmod +x /tmp/server-setup.sh && /tmp/server-setup.sh"
   ```

### Step 2: Configure Environment

1. **Update environment variables on server:**
   ```bash
   ssh root@YOUR_SERVER_IP
   cp /opt/cinetune/.env.template /opt/cinetune/.env
   nano /opt/cinetune/.env
   ```

   Add your production values:
   ```env
   NODE_ENV=production
   PORT=3000
   PEXELS_API_KEY=your_actual_pexels_key
   NEXT_PUBLIC_APP_URL=https://app.thecinetune.com
   # Add other required environment variables
   ```

### Step 3: SSL Certificate Setup

1. **For Let's Encrypt (free SSL):**
   ```bash
   certbot --nginx -d app.thecinetune.com
   ```

2. **For custom SSL certificates:**
   ```bash
   # Copy your certificates to the server
   scp your-certificate.pem root@YOUR_SERVER_IP:/etc/nginx/ssl/fullchain.pem
   scp your-private-key.pem root@YOUR_SERVER_IP:/etc/nginx/ssl/privkey.pem
   ```

### Step 4: Deploy Application

1. **Update deployment script configuration:**
   ```bash
   nano deploy.sh
   ```
   
   Update the server IP and credentials:
   ```bash
   SERVER_IP="YOUR_HETZNER_SERVER_IP"
   SERVER_USER="root"
   ```

2. **Run deployment:**
   ```bash
   ./deploy.sh
   ```

---

## 📁 File Structure

```
react-video-editor/
├── ecosystem.config.js           # PM2 process configuration
├── nginx.conf                    # Nginx reverse proxy configuration
├── deploy.sh                     # Deployment script
├── server-setup.sh              # Server initialization script
├── setup-nginx.sh               # Nginx setup script
├── cinetune-video-editor.service # Systemd service configuration (backup)
├── .env.production              # Production environment variables
├── DEPLOYMENT.md                # This file
└── src/app/api/health/          # Health check endpoint
```

---

## 🖥️ Node.js + PM2 Deployment

### Setup Application

1. **Install dependencies:**
   ```bash
   npm ci --only=production
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start with PM2:**
   ```bash
   # Copy PM2 config to deployment directory
   cp ecosystem.config.js /opt/cinetune/
   
   # Start the application
   su - www-data -c "cd /opt/cinetune/CineTune_Frontend && pm2 start ../ecosystem.config.js --env production"
   
   # Save PM2 configuration for auto-restart
   su - www-data -c "pm2 save"
   ```

4. **Check PM2 status:**
   ```bash
   su - www-data -c "pm2 status"
   ```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production) | Yes |
| `PORT` | Application port (3000) | Yes |
| `PEXELS_API_KEY` | Pexels API key for stock videos | Yes |
| `MAX_FILE_SIZE` | Maximum upload file size | No |
| `UPLOAD_DIR` | Upload directory path | No |
| `RENDER_DIR` | Render output directory | No |

### Nginx Configuration

The included `nginx.conf` provides:
- SSL termination
- Reverse proxy to Node.js app
- Static file caching
- Security headers
- Rate limiting
- Gzip compression

Update xthe following in `nginx.conf`:
- Replace `your-domain.com` with your actual domain
- Update SSL certificate paths if needed
- Adjust rate limiting as needed

### Security Considerations

1. **Firewall Rules:**
   ```bash
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS
   ufw enable
   ```

2. **SSL Security:**
   - Use strong SSL ciphers (configured in nginx.conf)
   - Enable HSTS
   - Regular certificate renewal

3. **File Permissions:**
   ```bash
   chown -R www-data:www-data /opt/cinetune
   chmod -R 755 /opt/cinetune
   ```

---

## 📊 Monitoring and Maintenance

### Health Checks

- Health endpoint: `https://your-domain.com/api/health`
- Returns application status, uptime, and memory usage

### Log Management

1. **PM2 logs:**
   ```bash
   su - www-data -c "pm2 logs cinetune-video-editor"
   su - www-data -c "pm2 logs cinetune-video-editor --lines 100"
   ```

2. **Application log files:**
   ```bash
   tail -f /var/log/cinetune/combined.log
   tail -f /var/log/cinetune/error.log
   ```

3. **Nginx logs:**
   ```bash
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   ```

### Backup Strategy

1. **Application data:**
   ```bash
   # Backup uploads and renders
   tar -czf backup-$(date +%Y%m%d).tar.gz /opt/cinetune/CineTune_Frontend/public/uploads /opt/cinetune/CineTune_Frontend/renders
   ```

2. **Database backup (if applicable):**
   ```bash
   pg_dump cinetune > cinetune-backup-$(date +%Y%m%d).sql
   ```

---

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 PID
   ```

2. **Permission denied:**
   ```bash
   sudo chown -R www-data:www-data /opt/cinetune
   ```

3. **SSL certificate issues:**
   ```bash
   certbot certificates
   certbot renew --dry-run
   ```

4. **Memory issues:**
   ```bash
   # Check memory usage
   free -h
   # Restart application
   sudo systemctl restart cinetune-video-editor
   ```

### Performance Optimization

1. **Enable Gzip in Nginx** (already configured)
2. **Set up CDN for static assets**
3. **Configure Redis for session storage**
4. **Set up database connection pooling**

---

## 🔄 Updates and Rollbacks

### Update Application

1. **Using deployment script:**
   ```bash
   ./deploy.sh
   ```

2. **Manual update from production server:**
   ```bash
   # SSH into your production server
   ssh root@YOUR_SERVER_IP
   
   # Navigate to the project directory
   cd /opt/cinetune/CineTune_Frontend
   
   # Pull the latest changes from the repository
   git pull origin main
   
   # Install updated dependencies (production only)
   npm ci --only=production
   
   # Build the application with the latest changes
   npm run build
   
   # Fix static file permissions after build
   chown -R www-data:www-data /opt/cinetune/CineTune_Frontend/.next
   chmod -R 755 /opt/cinetune/CineTune_Frontend/.next
   
   # Restart the PM2 process with the new build
   PM2_HOME=/home/www-data/.pm2 pm2 restart cinetune-video-editor
   
   # Verify the application is running correctly
   PM2_HOME=/home/www-data/.pm2 pm2 status
   
   # Optional: Check application logs for any errors
   PM2_HOME=/home/www-data/.pm2 pm2 logs cinetune-video-editor --lines 20
   ```

3. **Safe update with backup (recommended):**
   ```bash
   # SSH into your production server
   ssh root@YOUR_SERVER_IP
   
   # Navigate to cinetune directory
   cd /opt/cinetune
   
   # Create backup of current version
   cp -r current current-backup-$(date +%Y%m%d-%H%M%S)
   
   # Navigate to current directory
   cd current
   
   # Check current status before update
   git status
   git log --oneline -5
   
   # Pull latest changes
   git pull origin main
   
   # Install dependencies and build
   npm ci --only=production
   npm run build
   
   # Fix static file permissions after build
   chown -R www-data:www-data /opt/cinetune/CineTune_Frontend/.next
   chmod -R 755 /opt/cinetune/CineTune_Frontend/.next
   
   # Test the application locally first
   curl http://localhost:3000/api/health
   
   # If test passes, restart with PM2
   PM2_HOME=/home/www-data/.pm2 pm2 restart cinetune-video-editor
   
   # Monitor for a few minutes
   PM2_HOME=/home/www-data/.pm2 pm2 monit
   ```

### Rollback

1. **Quick rollback using backup:**
   ```bash
   # SSH into your production server
   ssh root@YOUR_SERVER_IP
   
   # Navigate to cinetune directory
   cd /opt/cinetune
   
   # List available backups
   ls -la current-backup-*
   
   # Replace current with backup (use the most recent backup)
   mv CineTune_Frontend CineTune_Frontend-failed-$(date +%Y%m%d-%H%M%S)
   cp -r current-backup-YYYYMMDD-HHMMSS CineTune_Frontend
   
   # Restart the application
   PM2_HOME=/home/www-data/.pm2 pm2 restart cinetune-video-editor
   
   # Verify rollback success
   PM2_HOME=/home/www-data/.pm2 pm2 status
   curl http://localhost:3000/api/health
   ```

2. **Git-based rollback:**
   ```bash
   # SSH into your production server
   ssh root@YOUR_SERVER_IP
   
   # Navigate to project directory
   cd /opt/cinetune/CineTune_Frontend
   
   # Check recent commits
   git log --oneline -10
   
   # Rollback to specific commit (replace COMMIT_HASH with actual hash)
   git reset --hard COMMIT_HASH
   
   # Reinstall dependencies and rebuild
   npm ci --only=production
   npm run build
   
   # Restart application
   PM2_HOME=/home/www-data/.pm2 pm2 restart cinetune-video-editor
   
   # Verify rollback
   PM2_HOME=/home/www-data/.pm2 pm2 status
   ```

---

## 📞 Support

### Useful Commands

```bash
# PM2 Commands
su - www-data -c "pm2 status"                    # Check PM2 status
su - www-data -c "pm2 restart cinetune-video-editor"  # Restart app
su - www-data -c "pm2 reload cinetune-video-editor"   # Zero-downtime restart
su - www-data -c "pm2 stop cinetune-video-editor"     # Stop app
su - www-data -c "pm2 delete cinetune-video-editor"   # Delete app from PM2
su - www-data -c "pm2 monit"                     # Monitor resources

# Nginx Commands
nginx -t                                         # Test configuration
nginx -s reload                                  # Reload configuration
systemctl restart nginx                          # Restart Nginx

# SSL Certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Monitoring URLs

- Health Check: `https://app.thecinetune.com/api/health`
- Application: `https://app.thecinetune.com`

---

## 📝 Notes

- Ensure your Hetzner server has at least 2GB RAM for optimal performance
- The application uses significant CPU during video processing
- Consider using a CDN for better performance with large video files
- Regular backups are recommended before deployments
- Monitor disk space for uploads and renders directories

---

*Last updated: 2025-08-25*