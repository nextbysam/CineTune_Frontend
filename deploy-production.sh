#!/bin/bash

# CineTune Video Editor - Production Deployment Script
# This script handles the complete deployment process for the production server

set -e  # Exit on error

echo "🚀 Starting CineTune Video Editor Production Deployment..."
echo "=================================================="

# Configuration
PROJECT_DIR="/opt/cinetune/CineTune_Frontend"
STANDALONE_DIR="${PROJECT_DIR}/.next/standalone"
PUBLIC_DIR="${PROJECT_DIR}/public"
STATIC_DIR="${PROJECT_DIR}/.next/static"
RENDERS_DIR="${PROJECT_DIR}/renders"

# Step 1: Navigate to project directory
echo "📁 Navigating to project directory..."
cd "$PROJECT_DIR"

# Step 2: Pull latest changes (optional - uncomment if using git on server)
# echo "🔄 Pulling latest changes from git..."
# git pull origin main

# Step 3: Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Step 4: Build the application
echo "🔨 Building Next.js application..."
npm run build

# Step 5: Ensure renders directory exists
echo "📂 Ensuring renders directory exists..."
mkdir -p "$RENDERS_DIR"

# Step 6: Copy static files to standalone directory
echo "📋 Copying static assets to standalone directory..."
cp -r "$PUBLIC_DIR" "$STANDALONE_DIR/" 2>/dev/null || true
cp -r "$STATIC_DIR" "$STANDALONE_DIR/.next/" 2>/dev/null || true

# Step 7: Copy additional required files to standalone
echo "📋 Copying additional files to standalone..."
# Copy scripts directory (needed for render-local.cjs)
cp -r "${PROJECT_DIR}/scripts" "$STANDALONE_DIR/" 2>/dev/null || true
# Copy src directory (needed for remotion compositions)
cp -r "${PROJECT_DIR}/src" "$STANDALONE_DIR/" 2>/dev/null || true
# Copy captions file if it exists
cp "${PROJECT_DIR}/captions_for_remotion.json" "$STANDALONE_DIR/" 2>/dev/null || true

# Step 8: Set proper permissions
echo "🔐 Setting file permissions..."
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"
chmod -R 777 "$RENDERS_DIR"  # Ensure renders directory is writable

# Step 9: Stop existing PM2 process
echo "⏹️  Stopping existing PM2 process..."
PM2_HOME=/home/www-data/.pm2 pm2 stop cinetune-video-editor 2>/dev/null || true
PM2_HOME=/home/www-data/.pm2 pm2 delete cinetune-video-editor 2>/dev/null || true

# Step 10: Start PM2 with new configuration
echo "🚀 Starting PM2 process..."
PM2_HOME=/home/www-data/.pm2 pm2 start "${PROJECT_DIR}/ecosystem.config.js" --env production

# Step 11: Save PM2 configuration
echo "💾 Saving PM2 configuration..."
PM2_HOME=/home/www-data/.pm2 pm2 save

# Step 12: Display status
echo "📊 Checking PM2 status..."
PM2_HOME=/home/www-data/.pm2 pm2 status

echo ""
echo "✅ Deployment complete!"
echo "=================================================="
echo ""
echo "🔍 To check logs, use:"
echo "   PM2_HOME=/home/www-data/.pm2 pm2 logs cinetune-video-editor"
echo ""
echo "🔄 To restart the application, use:"
echo "   PM2_HOME=/home/www-data/.pm2 pm2 restart cinetune-video-editor"
echo ""
echo "📊 To monitor the application, use:"
echo "   PM2_HOME=/home/www-data/.pm2 pm2 monit"