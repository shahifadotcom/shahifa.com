const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const axios = require('axios');
const { humanSend, recordFailure, metrics: antiBanMetrics } = require('./humanBehavior');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let client;
let currentQR = null;
let isReady = false;
let isInitializing = false;

function isStaleBrowserError(error) {
    const message = error && error.message ? error.message : String(error || '');
    return /detached Frame|Session closed|Target closed|Protocol error|Execution context was destroyed|Cannot find context/i.test(message);
}

async function resetClient(reason) {
    console.error('Resetting WhatsApp client:', reason);
    isReady = false;
    currentQR = null;
    isInitializing = false;

    if (client) {
        try {
            await client.destroy();
        } catch (destroyError) {
            console.error('Client destroy error:', destroyError.message);
        }
    }

    client = null;
    try { broadcast({ type: 'disconnected', reason }); } catch (_) {}
}

async function verifyClientReady() {
    if (!isReady || !client) {
        return false;
    }

    try {
        return Boolean(client.info && client.pupPage && !client.pupPage.isClosed());
    } catch (error) {
        await resetClient(error.message);
        return false;
    }
}

// Initialize WhatsApp client
function initializeClient() {
    if (isInitializing) {
        return Promise.resolve(currentQR);
    }

    isInitializing = true;
    
    return new Promise((resolve, reject) => {
        client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'whatsapp-client',
                dataPath: './.wwebjs_auth'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        client.on('qr', (qr) => {
            console.log('QR Code received');
            currentQR = qr;
            qrcode.generate(qr, { small: true });
            try { broadcast({ type: 'qr', qrCode: qr }); } catch (_) {}
            resolve(qr);
        });

        client.on('ready', () => {
            console.log('WhatsApp client is ready!');
            isReady = true;
            isInitializing = false;
            currentQR = null;
            try { broadcast({ type: 'ready' }); } catch (_) {}
        });

        client.on('authenticated', () => {
            console.log('WhatsApp client authenticated');
            try { broadcast({ type: 'authenticated' }); } catch (_) {}
        });

        client.on('auth_failure', (msg) => {
            console.error('Authentication failed:', msg);
            isInitializing = false;
            reject(new Error('Authentication failed'));
        });

        client.on('disconnected', (reason) => {
            console.log('Client was logged out:', reason);
            isReady = false;
            currentQR = null;
            client = null;
            try { broadcast({ type: 'disconnected', reason }); } catch (_) {}
        });

        client.initialize();

        // Timeout after 2 minutes
        setTimeout(() => {
            if (!currentQR && !isReady) {
                isInitializing = false;
                reject(new Error('Initialization timeout'));
            }
        }, 120000);
    });
}

// API Routes
app.get('/status', (req, res) => {
    res.json({
        isReady,
        qrCode: currentQR,
        isInitializing
    });
});

app.post('/initialize', async (req, res) => {
    try {
        if (isReady) {
            return res.json({
                success: true,
                message: 'WhatsApp is already connected',
                isReady: true
            });
        }

        const qr = await initializeClient();
        res.json({
            success: true,
            qrCode: qr,
            message: 'QR code generated'
        });
    } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/send-message', async (req, res) => {
    const { phoneNumber, message, mediaUrl } = req.body;

    if (!phoneNumber || !message) {
        return res.status(400).json({
            success: false,
            error: 'Phone number and message are required'
        });
    }

    if (!(await verifyClientReady())) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready. Please reconnect WhatsApp from the admin panel.'
        });
    }

    try {
        // Format phone number (remove any non-digits and add country code if needed)
        const formattedNumber = phoneNumber.replace(/\D/g, '');
        if (formattedNumber.length < 8 || formattedNumber.length > 15) {
            return res.status(400).json({ success: false, error: 'Invalid phone number length' });
        }
        const chatId = `${formattedNumber}@c.us`;

        // Send message with media if mediaUrl is provided
        if (mediaUrl) {
            console.log(`Downloading image from: ${mediaUrl}`);
            const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', maxContentLength: 10 * 1024 * 1024 });
            const buffer = Buffer.from(response.data);
            const mimeType = response.headers['content-type'] || 'image/jpeg';
            const urlParts = mediaUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || 'image.jpg';
            const media = new MessageMedia(mimeType, buffer.toString('base64'), filename);

            console.log(`Sending image with caption via humanSend`);
            await humanSend(client, chatId, media, { caption: message });
        } else {
            await humanSend(client, chatId, message);
        }

        res.json({
            success: true,
            messageId: `msg_${Date.now()}`,
            timestamp: Date.now(),
            metrics: antiBanMetrics()
        });
    } catch (error) {
        console.error('Send message error:', error);

        // Anti-ban policy rejections — return 429 so caller can back off
        if (error.code && ['DAILY_CAP','HOURLY_CAP','MINUTE_CAP','RECIPIENT_COOLDOWN','BACKOFF'].includes(error.code)) {
            return res.status(429).json({
                success: false,
                error: error.message,
                code: error.code,
                retryAfterMs: error.retryAfterMs || null,
                metrics: antiBanMetrics()
            });
        }
        if (error.code === 'NOT_ON_WHATSAPP') {
            return res.status(400).json({ success: false, error: error.message, code: error.code });
        }

        recordFailure();

        if (isStaleBrowserError(error)) {
            await resetClient(error.message);
            setTimeout(() => {
                initializeClient().catch((initError) => {
                    console.error('Reinitialize after stale browser error failed:', initError.message);
                });
            }, 1000);

            return res.status(503).json({
                success: false,
                error: 'WhatsApp session became stale. The bridge has been reset; please scan the QR code again if required.'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Anti-ban metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({ isReady, ...antiBanMetrics() });
});

app.post('/disconnect', async (req, res) => {
    try {
        if (client) {
            await client.logout();
            client = null;
        }
        isReady = false;
        currentQR = null;
        isInitializing = false;

        res.json({
            success: true,
            message: 'Disconnected successfully'
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// WebSocket Server for real-time QR & status
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(message) {
    try {
        const data = JSON.stringify(message);
        wss.clients.forEach((ws) => {
            if (ws.readyState === 1) ws.send(data);
        });
    } catch (e) {
        console.error('Broadcast error:', e);
    }
}

wss.on('connection', (ws) => {
    console.log('WS client connected');
    // Send current status immediately
    ws.send(JSON.stringify({ type: 'status', isReady, qrCode: currentQR }));

    ws.on('message', async (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            switch (msg.action) {
                case 'initialize': {
                    await initializeClient();
                    if (currentQR) ws.send(JSON.stringify({ type: 'qr', qrCode: currentQR }));
                    break;
                }
                case 'disconnect': {
                    if (client) await client.logout();
                    isReady = false;
                    currentQR = null;
                    isInitializing = false;
                    ws.send(JSON.stringify({ type: 'disconnected' }));
                    break;
                }
                case 'send_message': {
                    if (!(await verifyClientReady())) throw new Error('WhatsApp not ready. Please reconnect WhatsApp from the admin panel.');
                    const formattedNumber = String(msg.phoneNumber || '').replace(/\D/g, '');
                    if (formattedNumber.length < 8 || formattedNumber.length > 15) throw new Error('Invalid phone number length');
                    const chatId = `${formattedNumber}@c.us`;

                    if (msg.mediaUrl) {
                        const response = await axios.get(msg.mediaUrl, { responseType: 'arraybuffer', maxContentLength: 10 * 1024 * 1024 });
                        const buffer = Buffer.from(response.data);
                        const mimeType = response.headers['content-type'] || 'image/jpeg';
                        const urlParts = msg.mediaUrl.split('/');
                        const filename = urlParts[urlParts.length - 1] || 'image.jpg';
                        const media = new MessageMedia(mimeType, buffer.toString('base64'), filename);
                        await humanSend(client, chatId, media, { caption: msg.text || msg.message || '' });
                    } else {
                        await humanSend(client, chatId, msg.text || msg.message || '');
                    }

                    ws.send(JSON.stringify({ type: 'message_sent', phoneNumber: formattedNumber, metrics: antiBanMetrics() }));
                    break;
                }
                case 'metrics': {
                    ws.send(JSON.stringify({ type: 'metrics', isReady, ...antiBanMetrics() }));
                    break;
                }
                case 'status':
                default: {
                    ws.send(JSON.stringify({ type: 'status', isReady, qrCode: currentQR }));
                }
            }
        } catch (err) {
            console.error('WS message error:', err);
            if (isStaleBrowserError(err)) {
                await resetClient(err.message);
                setTimeout(() => {
                    initializeClient().catch((initError) => {
                        console.error('WS reinitialize after stale browser error failed:', initError.message);
                    });
                }, 1000);
            }
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
    });

    ws.on('close', () => console.log('WS client disconnected'));
});

server.listen(port, () => {
    console.log(`WhatsApp Bridge Server running on port ${port}`);
    console.log('Available endpoints:');
    console.log(`  GET  /status - Check connection status`);
    console.log(`  POST /initialize - Generate QR code`);
    console.log(`  POST /send-message - Send WhatsApp message`);
    console.log(`  POST /disconnect - Disconnect WhatsApp`);
    console.log('WS available at ws://localhost:' + port);
});