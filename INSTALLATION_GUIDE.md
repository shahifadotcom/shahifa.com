# Shahifa E-commerce Platform - Installation Guide

## Prerequisites

Before installing, ensure you have the following installed on your server:

- **Node.js** v20+ (LTS recommended)
- **npm** v9+
- **PM2** (for process management - optional but recommended)
- **Git** (for version control)

## Quick Start

### Option 1: Automated Installation (Recommended for Ubuntu/Debian)

Run the installation script that will install all dependencies and set up the entire platform:

```bash
chmod +x install.sh
./install.sh
```

This script will:
1. Update system packages
2. Install Node.js LTS (v20)
3. Install PM2 globally
4. Install all project dependencies (main app, WhatsApp bridge, calling server)
5. Build the main project
6. Set up PM2 ecosystem for all three servers
7. Configure Nginx (if needed)
8. Start all services

### Option 2: Manual Installation

1. **Install dependencies for all services:**

```bash
# Main project dependencies
npm install

# WhatsApp bridge dependencies
cd whatsapp-bridge && npm install && cd ..

# Calling server dependencies
cd calling-server && npm install && cd ..
```

2. **Build the main project:**

```bash
npm run build
```

3. **Start all services:**

```bash
chmod +x start.sh
./start.sh
```

## Running the Platform

### Starting All Services

The `start.sh` script will automatically:
- Check and free up required ports (3000, 3001, 3002)
- Install dependencies if not already installed
- Build the main project
- Start all three services (main app, WhatsApp bridge, calling server)

```bash
./start.sh
```

### With PM2 (Recommended for Production)

If PM2 is installed, the script will use it automatically:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-restart on server reboot
```

### Without PM2 (Development)

The script will run all services in the background using npm:

```bash
./start.sh
```

Press `Ctrl+C` to stop all servers.

## Service Ports

The platform runs three separate services:

| Service | Port | Description |
|---------|------|-------------|
| Main Application | 3000 | React frontend + Vite dev server |
| WhatsApp Bridge | 3001 | WhatsApp Web.js integration server |
| Calling Server | 3002 | WebRTC signaling server for audio/video calls |

## Environment Configuration

### Main Application

The main app uses Supabase connection details from `src/integrations/supabase/client.ts`. No separate .env file needed.

### WhatsApp Bridge

Create `whatsapp-bridge/.env` (or it will be created automatically):

```env
PORT=3001
```

### Calling Server

Create `calling-server/.env` (already created with correct values):

```env
PORT=3002
SUPABASE_URL=https://mofwljpreecqqxkilywh.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Accessing the Platform

After starting, you can access:

- **Main Application:** http://45.88.191.92:3000 (or http://localhost:3000)
- **Admin Panel:** http://45.88.191.92:3000/admin
- **WhatsApp Admin:** http://45.88.191.92:3000/admin/whatsapp
- **WhatsApp Bridge:** http://45.88.191.92:3001
- **Calling Server:** http://45.88.191.92:3002

## PM2 Commands

If using PM2, here are useful commands:

```bash
# View all running apps
pm2 list

# View logs for all apps
pm2 logs

# View specific app logs
pm2 logs shahifa-ecommerce
pm2 logs whatsapp-bridge
pm2 logs calling-server

# Monitor all apps
pm2 monit

# Restart all apps
pm2 restart all

# Stop all apps
pm2 stop all

# Delete all apps from PM2
pm2 delete all

# Save current PM2 configuration
pm2 save
```

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error, the start.sh script will automatically try to kill the process. If it fails:

```bash
# For port 3000
lsof -ti:3000 | xargs kill -9

# For port 3001
lsof -ti:3001 | xargs kill -9

# For port 3002
lsof -ti:3002 | xargs kill -9
```

### Dependencies Not Installing

Make sure you have the correct Node.js version:

```bash
node -v  # Should be v20 or higher
npm -v   # Should be v9 or higher
```

If you have an older version:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### WhatsApp Bridge Not Connecting

1. Check if the WhatsApp bridge is running:
   ```bash
   pm2 logs whatsapp-bridge
   ```

2. Visit the admin panel at http://45.88.191.92:3000/admin/whatsapp

3. Click "Initialize WhatsApp" and scan the QR code with your mobile device

### Calling Server Not Working

1. Check if the calling server is running:
   ```bash
   pm2 logs calling-server
   ```

2. Verify the server is listening on port 3002:
   ```bash
   netstat -tuln | grep 3002
   ```

3. Make sure the Supabase credentials in `calling-server/.env` are correct

## Production Deployment

For production deployment, it's recommended to:

1. **Use PM2** for process management
2. **Set up Nginx** as a reverse proxy
3. **Enable SSL** using Let's Encrypt
4. **Configure firewall** to only allow necessary ports

The `install.sh` script handles most of this automatically for Ubuntu/Debian systems.

### Nginx Configuration

The install script creates an Nginx configuration. You can manually edit it:

```bash
sudo nano /etc/nginx/sites-available/shahifa-ecommerce
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### SSL Certificate (Optional)

```bash
sudo certbot --nginx -d yourdomain.com
```

## Updating the Platform

To update the platform to the latest version:

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install
cd whatsapp-bridge && npm install && cd ..
cd calling-server && npm install && cd ..

# Rebuild the project
npm run build

# Restart all services
pm2 restart all
```

## Support

For issues or questions:
- Check the logs: `pm2 logs`
- Review the error messages in the console
- Ensure all services are running: `pm2 list`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Shahifa E-commerce                    │
│                     Platform                            │
└─────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│  Main Application│ │   WhatsApp   │ │   Calling    │
│   (Port 3000)    │ │    Bridge    │ │    Server    │
│                  │ │  (Port 3001) │ │  (Port 3002) │
│  React + Vite    │ │  Express.js  │ │  Socket.IO   │
│  + Supabase      │ │  + WA Web.js │ │  + WebRTC    │
└──────────────────┘ └──────────────┘ └──────────────┘
```

Each service runs independently and can be managed separately through PM2.
