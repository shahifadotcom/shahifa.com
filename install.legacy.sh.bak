#!/bin/bash

# Ubuntu Installation Script for Shahifa E-commerce Platform
# This script installs all dependencies and sets up the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Shahifa E-commerce Platform Installation${NC}"
echo "=========================================="

# Update system packages
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

# Check current Node.js version and install LTS if needed
echo -e "${YELLOW}Checking Node.js version...${NC}"
CURRENT_NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
REQUIRED_NODE_VERSION=20

if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    echo -e "${YELLOW}Installing Node.js LTS (v20)...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js v$(node -v) is already installed${NC}"
fi

# Install build essentials
echo -e "${YELLOW}Installing build essentials...${NC}"
sudo apt-get install -y build-essential

# Install Git
echo -e "${YELLOW}Installing Git...${NC}"
sudo apt-get install -y git

# Install Nginx
echo -e "${YELLOW}Installing Nginx...${NC}"
sudo apt-get install -y nginx

# Install SSL certificate tools
echo -e "${YELLOW}Installing SSL tools...${NC}"
sudo apt-get install -y certbot python3-certbot-nginx

# Install PM2 for process management
echo -e "${YELLOW}Installing PM2...${NC}"
sudo npm install -g pm2

# Install Supabase CLI
echo -e "${YELLOW}Installing Supabase CLI...${NC}"
curl -fsSL https://supabase.com/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Install project dependencies and servers
echo -e "${YELLOW}Installing project dependencies...${NC}"
npm install

echo -e "${YELLOW}Installing WhatsApp bridge dependencies...${NC}"
cd whatsapp-bridge && npm install && cd ..

echo -e "${YELLOW}Installing calling server dependencies...${NC}"
cd calling-server && npm install && cd ..

echo -e "${GREEN}✓ All dependencies installed${NC}"

# Build the project
echo -e "${YELLOW}Building the project...${NC}"
npm run build

# Setup PM2 ecosystem for all three apps
echo -e "${YELLOW}Setting up PM2 process management...${NC}"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'shahifa-ecommerce',
      script: 'npm',
      args: 'run preview -- --port 3000 --host 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'whatsapp-bridge',
      script: 'npm',
      args: 'start',
      cwd: './whatsapp-bridge',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'calling-server',
      script: 'npm',
      args: 'start',
      cwd: './calling-server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
}
EOF

# Setup Nginx configuration with WhatsApp bridge proxy
echo -e "${YELLOW}Setting up Nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/shahifa-ecommerce << 'EOF'
server {
    listen 80;
    server_name 45.88.191.92;

    # Main application proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WhatsApp Bridge proxy (accessible by frontend and Supabase)
    location /wa {
        rewrite ^/wa/(.*) /$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/shahifa-ecommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Start both applications
echo -e "${YELLOW}Starting applications with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}Installation completed successfully!${NC}"
echo ""
echo -e "${BLUE}Application Information:${NC}"
echo -e "Main App: http://45.88.191.92"
echo -e "Admin Panel: http://45.88.191.92/admin/whatsapp"
echo -e "WhatsApp Bridge: http://45.88.191.92/wa (proxied)"
echo -e "Calling Server: http://45.88.191.92:3002"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "View all apps: pm2 list"
echo -e "Main app logs: pm2 logs shahifa-ecommerce"
echo -e "WhatsApp logs: pm2 logs whatsapp-bridge"
echo -e "Calling logs: pm2 logs calling-server"
echo -e "Stop all: pm2 stop all"
echo -e "Restart all: pm2 restart all"
echo -e "Monitor: pm2 monit"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Visit http://45.88.191.92/admin/whatsapp"
echo -e "2. The page should auto-detect existing WhatsApp session"
echo -e "3. If not connected, click 'Connect WhatsApp' and scan QR"
echo -e "4. Test OTP flow by placing an order"
echo ""
echo -e "${YELLOW}Configure SSL certificate (optional):${NC}"
echo -e "sudo certbot --nginx -d yourdomain.com"