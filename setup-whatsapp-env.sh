#!/bin/bash

# WhatsApp Environment Setup Script
# Sets the WHATSAPP_BRIDGE_URL environment variable for Supabase

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up WhatsApp Bridge Environment Variable...${NC}"
echo "================================================="

# Default WhatsApp bridge URL
WHATSAPP_BRIDGE_URL="http://45.88.191.92:3001"

echo -e "${YELLOW}Setting WHATSAPP_BRIDGE_URL to: $WHATSAPP_BRIDGE_URL${NC}"

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Setting environment variable in Supabase...${NC}"
    
    # Set the environment variable
    supabase secrets set WHATSAPP_BRIDGE_URL="$WHATSAPP_BRIDGE_URL"
    
    echo -e "${GREEN}WhatsApp Bridge URL environment variable set successfully!${NC}"
    echo -e "${BLUE}Your WhatsApp integration is now configured to use: $WHATSAPP_BRIDGE_URL${NC}"
else
    echo -e "${YELLOW}Supabase CLI not found. Please install it and run:${NC}"
    echo -e "supabase secrets set WHATSAPP_BRIDGE_URL=\"$WHATSAPP_BRIDGE_URL\""
fi

echo ""
echo -e "${GREEN}Setup complete! Now you can:${NC}"
echo -e "1. Run ./start.sh to start both servers"
echo -e "2. Go to /admin/whatsapp to connect your WhatsApp"
echo -e "3. Scan the QR code with your mobile device"