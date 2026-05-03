#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="shahifa-ecommerce"
WHATSAPP_PROJECT_NAME="whatsapp-bridge"
MAIN_PORT=3000
WHATSAPP_PORT=3001

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Shahifa E-commerce Startup Script   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}Warning: Running as root is not recommended${NC}"
fi

# Kill any existing processes on our ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:$MAIN_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$WHATSAPP_PORT | xargs kill -9 2>/dev/null || true

# Stop existing background processes if they exist
if [ -f ".whatsapp-bridge.pid" ]; then
    WHATSAPP_PID=$(cat .whatsapp-bridge.pid)
    kill $WHATSAPP_PID 2>/dev/null || true
    rm .whatsapp-bridge.pid
fi

if [ -f ".ecommerce.pid" ]; then
    ECOMMERCE_PID=$(cat .ecommerce.pid)
    kill $ECOMMERCE_PID 2>/dev/null || true
    rm .ecommerce.pid
fi

# Clean up nohup log files
rm -f nohup.out whatsapp-bridge-nohup.log

echo -e "${GREEN}✓ Cleanup completed${NC}"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Install WhatsApp bridge dependencies
if [ -d "whatsapp-bridge" ]; then
    if [ ! -d "whatsapp-bridge/node_modules" ]; then
        echo -e "${YELLOW}Installing WhatsApp bridge dependencies...${NC}"
        cd whatsapp-bridge
        npm install
        cd ..
        echo -e "${GREEN}✓ WhatsApp bridge dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ WhatsApp bridge dependencies already installed${NC}"
    fi
fi

# Build the project
echo -e "${YELLOW}Building the project...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Using PM2 for process management...${NC}"
    
    # Stop existing PM2 processes if running
    pm2 stop $PROJECT_NAME 2>/dev/null || true
    pm2 delete $PROJECT_NAME 2>/dev/null || true
    pm2 stop $WHATSAPP_PROJECT_NAME 2>/dev/null || true
    pm2 delete $WHATSAPP_PROJECT_NAME 2>/dev/null || true
    
    # Create PM2 ecosystem file in CJS format
    cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME',
      script: 'npm',
      args: 'run preview -- --port $MAIN_PORT --host 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: $MAIN_PORT
      }
    },
    {
      name: '$WHATSAPP_PROJECT_NAME',
      cwd: './whatsapp-bridge',
      script: 'node',
      args: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: $WHATSAPP_PORT
      }
    }
  ]
}
EOF
    
    # Start applications with PM2
    pm2 start ecosystem.config.cjs
    pm2 save
    
    echo -e "${GREEN}Both applications started with PM2!${NC}"
    echo -e "${BLUE}Main Application: http://45.88.191.92:$MAIN_PORT${NC}"
    echo -e "${BLUE}Admin Panel: http://45.88.191.92:$MAIN_PORT/admin/whatsapp${NC}"
    echo -e "${BLUE}WhatsApp Bridge: http://45.88.191.92:$WHATSAPP_PORT${NC}"
    echo ""
    echo -e "${GREEN}🎉 All Services Ready!${NC}"
    echo -e "${YELLOW}Useful PM2 commands:${NC}"
    echo -e "  pm2 status              - Check status"
    echo -e "  pm2 logs                - View logs"
    echo -e "  pm2 restart all         - Restart all"
    echo -e "  pm2 stop all            - Stop all"
else
    echo -e "${YELLOW}PM2 not found. Using nohup for background execution...${NC}"
    echo -e "${YELLOW}Tip: Install PM2 for better process management: npm install -g pm2${NC}"
    
    # Start main ecommerce application in background
    echo -e "${YELLOW}Starting main ecommerce application...${NC}"
    nohup npm run preview -- --port $MAIN_PORT --host 0.0.0.0 > /dev/null 2>&1 &
    ECOMMERCE_PID=$!
    echo $ECOMMERCE_PID > .ecommerce.pid
    echo -e "${GREEN}✓ Main application started (PID: $ECOMMERCE_PID)${NC}"
    
    # Start WhatsApp bridge in fork mode
    if [ -d "whatsapp-bridge" ]; then
        echo -e "${YELLOW}Starting WhatsApp bridge in fork mode...${NC}"
        cd whatsapp-bridge
        nohup node server.js > ../whatsapp-bridge-nohup.log 2>&1 &
        WHATSAPP_PID=$!
        cd ..
        echo $WHATSAPP_PID > .whatsapp-bridge.pid
        echo -e "${GREEN}✓ WhatsApp bridge started (PID: $WHATSAPP_PID)${NC}"
    fi
    
    # Wait a moment for services to start
    sleep 3
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   All Services Started Successfully   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}🌐 Application URLs:${NC}"
    echo -e "  Main App:      http://45.88.191.92:$MAIN_PORT"
    echo -e "  Admin Panel:   http://45.88.191.92:$MAIN_PORT/admin"
    echo -e "  WhatsApp Bridge: http://45.88.191.92:$WHATSAPP_PORT"
    echo ""
    echo -e "${YELLOW}📝 Management Commands:${NC}"
    echo -e "  Stop all:      kill \$(cat .ecommerce.pid .whatsapp-bridge.pid 2>/dev/null)"
    echo -e "  View logs:     tail -f whatsapp-bridge-nohup.log"
    echo ""
    echo -e "${GREEN}✅ Setup Complete!${NC}"
fi
