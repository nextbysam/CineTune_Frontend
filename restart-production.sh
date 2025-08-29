#!/bin/bash
# Production Server Restart Script for CineTune Video Editor
# Usage: ./restart-production.sh

echo "🔄 Starting production server refresh for CineTune Video Editor..."

# Navigate to project directory
cd /opt/cinetune/CineTune_Frontend

# 1. Install production dependencies only
echo "📦 Installing production dependencies..."
npm ci --only=production

# 2. Build the application
echo "🔨 Building application..."
npm run build

# 3. Set proper ownership for web server
echo "🔐 Setting file ownership..."
chown -R www-data:www-data /opt/cinetune/CineTune_Frontend/.next

# 4. Set proper permissions
echo "🔐 Setting file permissions..."
chmod -R 755 /opt/cinetune/CineTune_Frontend/.next

# 5. Restart PM2 process
echo "🚀 Restarting PM2 process..."
PM2_HOME=/home/www-data/.pm2 pm2 restart cinetune-video-editor

# 6. Check PM2 status
echo "📊 Checking PM2 status..."
PM2_HOME=/home/www-data/.pm2 pm2 status

echo "✅ Production server refresh complete!"
echo "🌐 Server should be available at your configured domain/port" 