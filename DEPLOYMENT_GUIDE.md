# Shahifa E-commerce Platform - Complete Deployment Guide

## Overview
This guide covers the complete setup of the Shahifa e-commerce platform with WhatsApp integration on Ubuntu server (45.88.191.92).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                      │
│  ┌────────────────────┐        ┌──────────────────────┐     │
│  │ Main App (/)       │        │ WhatsApp Bridge (/wa)│     │
│  │ → localhost:3000   │        │ → localhost:3001     │     │
│  └────────────────────┘        └──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
           ↓                                    ↓
    ┌──────────────┐                   ┌─────────────────┐
    │ React App    │                   │ WhatsApp Web.js │
    │ (Vite Build) │                   │ Express Server  │
    └──────────────┘                   └─────────────────┘
           ↓                                    ↑
    ┌──────────────────────────────────────────┼────────┐
    │         Supabase Edge Functions          │        │
    │  • send-otp                              │        │
    │  • verify-otp-and-create-order    ───────┘        │
    │  • send-whatsapp-message                          │
    │  • send-order-notification                        │
    └───────────────────────────────────────────────────┘
```

## Installation Steps

### 1. Initial Setup (One-Time)

```bash
# Clone or upload your project to server
cd /path/to/shahifa-ecommerce

# Make installation script executable
chmod +x install.sh

# Run installation (installs Node.js 20, Nginx, PM2, dependencies)
./install.sh
```

This script will:
- Install Node.js v20 LTS
- Install and configure Nginx with WhatsApp bridge proxy
- Install PM2 for process management
- Install all project and WhatsApp bridge dependencies
- Build the project
- Configure firewall
- Start both applications

### 2. Starting the Application

```bash
# Make start script executable
chmod +x start.sh

# Start all servers (automatically kills processes on ports 3000 & 3001)
./start.sh
```

The start script handles:
- Port conflict resolution (auto-kills existing processes)
- Dependency installation if needed
- Building the project
- Starting both main app and WhatsApp bridge with PM2

### 3. WhatsApp Setup

**First Time Setup:**

1. Visit: `http://45.88.191.92/admin/whatsapp`
2. The page will auto-check for existing session
3. If not connected:
   - Click "Connect WhatsApp"
   - Wait for QR code (10-30 seconds)
   - Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
   - Scan the QR code
4. Session is saved and auto-detected on future visits

**Session Persistence:**
- WhatsApp session is stored in `whatsapp-bridge/.wwebjs_auth`
- Session persists across server restarts
- Auto-detected when visiting `/admin/whatsapp`
- No need to scan QR again unless manually disconnected

## URLs and Endpoints

### Public URLs
- **Main Application**: `http://45.88.191.92`
- **Admin Panel**: `http://45.88.191.92/admin/whatsapp`
- **Product Details**: `http://45.88.191.92/products/{product-slug}`

### Internal Endpoints (Proxied by Nginx)
- **WhatsApp Bridge**: `http://45.88.191.92/wa` → `http://localhost:3001`
  - `/wa/status` - Check connection status
  - `/wa/initialize` - Generate QR code
  - `/wa/send-message` - Send WhatsApp message
  - `/wa/disconnect` - Disconnect session

### WebSocket
- **Development**: `ws://localhost:3001` (direct connection)
- **Production**: Uses HTTP proxy (no separate WS port needed)

## WhatsApp Integration Flow

### OTP Flow (Checkout)

1. **User fills checkout form** → Frontend
2. **User clicks "Place Order"** → Triggers OTP send
3. **OTP Modal opens instantly** → Background OTP sending begins
4. **`send-otp` edge function** → Calls `send-whatsapp-message`
5. **`send-whatsapp-message`** → Calls `http://45.88.191.92/wa/send-message`
6. **WhatsApp Bridge** → Sends OTP via WhatsApp Web
7. **User receives OTP** → Enters in modal
8. **`verify-otp-and-create-order`** → Verifies and creates order
9. **`send-order-notification`** → Sends confirmation via WhatsApp

### Order Status Updates

Order status changes automatically trigger WhatsApp notifications via:
- `send-order-notification` edge function
- Uses notification templates from `notification_templates` table
- Sends to customer's WhatsApp number from billing address

## PM2 Management

### Viewing Applications
```bash
# List all apps
pm2 list

# Monitor all apps
pm2 monit
```

### Logs
```bash
# View all logs
pm2 logs

# Main app logs only
pm2 logs shahifa-ecommerce

# WhatsApp bridge logs only
pm2 logs whatsapp-bridge

# Clear logs
pm2 flush
```

### Process Control
```bash
# Restart all
pm2 restart all

# Restart specific app
pm2 restart shahifa-ecommerce
pm2 restart whatsapp-bridge

# Stop all
pm2 stop all

# Delete all
pm2 delete all
```

### Auto-Start on Reboot
```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

## Nginx Configuration

### Configuration File
Location: `/etc/nginx/sites-available/shahifa-ecommerce`

### Key Proxy Settings
```nginx
# Main app
location / {
    proxy_pass http://localhost:3000;
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}

# WhatsApp bridge (accessible by frontend & Supabase)
location /wa {
    rewrite ^/wa/(.*) /$1 break;
    proxy_pass http://localhost:3001;
    # Longer timeouts for WhatsApp operations
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

## Environment Variables

### Main Application (.env)
```env
VITE_SUPABASE_PROJECT_ID=mofwljpreecqqxkilywh
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=https://mofwljpreecqqxkilywh.supabase.co
```

### WhatsApp Bridge (whatsapp-bridge/.env)
```env
PORT=3001
```

### Supabase Secrets (via Supabase Dashboard)
```
WHATSAPP_BRIDGE_URL=http://45.88.191.92/wa
SUPABASE_URL=https://mofwljpreecqqxkilywh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## Troubleshooting

### WhatsApp Not Connecting

1. **Check WhatsApp bridge is running:**
```bash
pm2 logs whatsapp-bridge
curl http://localhost:3001/status
```

2. **Check Nginx proxy:**
```bash
curl http://45.88.191.92/wa/status
```

3. **Restart WhatsApp bridge:**
```bash
pm2 restart whatsapp-bridge
```

4. **Clear session and reconnect:**
```bash
cd whatsapp-bridge
rm -rf .wwebjs_auth
cd ..
pm2 restart whatsapp-bridge
# Visit /admin/whatsapp and scan QR again
```

### OTP Not Sending

1. **Check edge function logs:**
```bash
# In Supabase dashboard → Edge Functions → Logs
# Look for send-otp and send-whatsapp-message logs
```

2. **Verify WhatsApp bridge URL in Supabase:**
- Edge Functions → Settings → Secrets
- Ensure `WHATSAPP_BRIDGE_URL=http://45.88.191.92/wa`

3. **Test WhatsApp bridge directly:**
```bash
curl -X POST http://45.88.191.92/wa/send-message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890","message":"Test"}'
```

### Port Conflicts

```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :3001

# Kill specific port (start.sh does this automatically)
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:3001 | xargs kill -9
```

### Build Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build

# WhatsApp bridge clean install
cd whatsapp-bridge
rm -rf node_modules package-lock.json
npm install
cd ..
```

## Database Configuration

### Required Tables
- `notification_logs` - Stores sent notifications
- `notification_templates` - Message templates
- `otp_verifications` - OTP codes and verification
- `otp_rate_limits` - Rate limiting for OTP requests
- `orders` - Customer orders
- `order_items` - Order line items
- `profiles` - User profiles
- `products_catalog` - Product listings

### Notification Templates
Ensure these templates exist in `notification_templates`:
- `order_confirmed` - Order confirmation message
- `order_shipped` - Shipping notification
- `order_delivered` - Delivery confirmation

## Security Considerations

1. **WhatsApp Session**
   - Session files stored in `.wwebjs_auth` (excluded from git)
   - Only accessible by server processes
   - Automatic session persistence

2. **OTP Security**
   - 6-digit secure random codes
   - 10-minute expiration
   - Rate limiting (3 requests per hour per phone)
   - Timing-safe comparison to prevent attacks

3. **Firewall**
   - Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) exposed
   - Ports 3000, 3001 only accessible via Nginx proxy

## Performance Optimization

1. **PM2 Configuration**
   - Auto-restart on crash
   - Memory limits to prevent leaks
   - Log rotation to save disk space

2. **Nginx**
   - Gzip compression
   - Static file caching
   - Connection pooling

3. **WhatsApp Bridge**
   - Puppeteer headless mode
   - Persistent session to avoid re-authentication
   - Connection pooling for multiple requests

## Monitoring

### Application Health
```bash
# Check all processes
pm2 status

# Resource usage
pm2 monit

# System resources
htop
df -h
```

### Logs to Monitor
- PM2 logs: `pm2 logs`
- Nginx access: `/var/log/nginx/access.log`
- Nginx errors: `/var/log/nginx/error.log`
- WhatsApp bridge: `pm2 logs whatsapp-bridge`
- Supabase edge functions: Supabase Dashboard → Functions → Logs

## Backup and Recovery

### Critical Data to Backup
```bash
# WhatsApp session
tar -czf whatsapp-session-backup.tar.gz whatsapp-bridge/.wwebjs_auth

# Environment files
tar -czf env-backup.tar.gz .env whatsapp-bridge/.env

# Nginx config
sudo cp /etc/nginx/sites-available/shahifa-ecommerce ~/nginx-backup.conf
```

### Restore WhatsApp Session
```bash
# Stop bridge
pm2 stop whatsapp-bridge

# Restore session
tar -xzf whatsapp-session-backup.tar.gz

# Start bridge
pm2 start whatsapp-bridge
```

## SSL/HTTPS Setup (Optional)

```bash
# Install Certbot (already done in install.sh)
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

## Updating the Application

```bash
# Pull latest changes (if using Git)
git pull origin main

# Install any new dependencies
npm install
cd whatsapp-bridge && npm install && cd ..

# Rebuild
npm run build

# Restart all
pm2 restart all
```

## Support and Documentation

- **Supabase Dashboard**: https://app.supabase.com/project/mofwljpreecqqxkilywh
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **WhatsApp Web.js**: https://docs.wwebjs.dev/
- **Nginx Documentation**: https://nginx.org/en/docs/

## Common Operations Cheat Sheet

```bash
# Quick restart everything
pm2 restart all && sudo systemctl reload nginx

# View all logs in real-time
pm2 logs

# Check WhatsApp connection
curl http://45.88.191.92/wa/status | jq

# Test OTP flow (from Supabase SQL editor)
SELECT * FROM otp_verifications ORDER BY created_at DESC LIMIT 10;
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;

# Monitor system resources
htop

# Disk space
df -h
```

## Production Checklist

- [ ] Node.js v20 installed
- [ ] Nginx configured with /wa proxy
- [ ] PM2 running both apps
- [ ] WhatsApp session connected and tested
- [ ] OTP flow tested end-to-end
- [ ] Order notification flow tested
- [ ] Firewall configured
- [ ] PM2 startup script configured
- [ ] Logs monitored and rotating
- [ ] Backups configured
- [ ] SSL certificate installed (if using domain)
- [ ] Database RLS policies verified
- [ ] Notification templates populated

---

**Last Updated**: 2025-10-04
**Version**: 1.0.0
