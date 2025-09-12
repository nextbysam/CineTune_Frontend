#!/bin/bash

# Quick fix for production server - run this IMMEDIATELY on the production server
# This script fixes the PM2 configuration issue without full rebuild

set -e

echo "🔧 Quick Fix for CineTune Production Server"
echo "==========================================="

PROJECT_DIR="/opt/cinetune/CineTune_Frontend"
STANDALONE_DIR="${PROJECT_DIR}/.next/standalone"

# Step 1: Navigate to project directory
cd "$PROJECT_DIR"

# Step 2: Check if standalone directory exists
if [ ! -d "$STANDALONE_DIR" ]; then
    echo "❌ Standalone directory not found. Running build..."
    npm run build
else
    echo "✅ Standalone directory exists"
fi

# Step 3: Copy necessary files to standalone if missing
echo "📋 Ensuring necessary files in standalone..."

# Copy scripts directory (needed for render-local.cjs)
if [ ! -d "$STANDALONE_DIR/scripts" ]; then
    cp -r "${PROJECT_DIR}/scripts" "$STANDALONE_DIR/"
    echo "   ✅ Copied scripts directory"
fi

# Copy src directory (needed for remotion compositions)
if [ ! -d "$STANDALONE_DIR/src" ]; then
    cp -r "${PROJECT_DIR}/src" "$STANDALONE_DIR/"
    echo "   ✅ Copied src directory"
fi

# Copy public directory
if [ ! -d "$STANDALONE_DIR/public" ]; then
    cp -r "${PROJECT_DIR}/public" "$STANDALONE_DIR/"
    echo "   ✅ Copied public directory"
fi

# Copy static files
if [ ! -d "$STANDALONE_DIR/.next/static" ]; then
    cp -r "${PROJECT_DIR}/.next/static" "$STANDALONE_DIR/.next/"
    echo "   ✅ Copied static files"
fi

# Step 4: Ensure renders directory exists
mkdir -p "${PROJECT_DIR}/renders"
chmod 777 "${PROJECT_DIR}/renders"
echo "✅ Renders directory ready"

# Step 5: Update PM2 configuration
echo "🔄 Updating PM2 configuration..."
cat > "${PROJECT_DIR}/ecosystem.config.js" << 'EOF'
module.exports = {
	apps: [
		{
			name: "cinetune-video-editor",
			script: "server.js",
			cwd: "/opt/cinetune/CineTune_Frontend/.next/standalone",
			instances: 1,
			exec_mode: "fork",
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				PORT: 3000,
				HOSTNAME: "0.0.0.0",
			},
			env_production: {
				NODE_ENV: "production",
				PORT: 3000,
				HOSTNAME: "0.0.0.0",
			},
			log_file: "/var/log/cinetune/combined.log",
			out_file: "/var/log/cinetune/out.log",
			error_file: "/var/log/cinetune/error.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			autorestart: true,
			restart_delay: 5000,
			max_restarts: 10,
			min_uptime: "10s",
			node_args: "--max-old-space-size=2048",
		},
	],
};
EOF

# Step 6: Set permissions
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"

# Step 7: Restart PM2
echo "🚀 Restarting PM2..."
PM2_HOME=/home/www-data/.pm2 pm2 stop cinetune-video-editor 2>/dev/null || true
PM2_HOME=/home/www-data/.pm2 pm2 delete cinetune-video-editor 2>/dev/null || true
PM2_HOME=/home/www-data/.pm2 pm2 start "${PROJECT_DIR}/ecosystem.config.js" --env production
PM2_HOME=/home/www-data/.pm2 pm2 save

# Step 8: Show status
echo ""
echo "📊 PM2 Status:"
PM2_HOME=/home/www-data/.pm2 pm2 status

echo ""
echo "✅ Quick fix complete!"
echo "==========================================="
echo ""
echo "Test the server by visiting the application URL"
echo "Check logs with: PM2_HOME=/home/www-data/.pm2 pm2 logs cinetune-video-editor"