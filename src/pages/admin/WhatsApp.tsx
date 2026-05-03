import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, QrCode, MessageSquare, Settings, Users, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { BRIDGE_WS, bridgeFetch } from "@/lib/whatsappBridge";

interface WhatsAppStatus {
  isConnected: boolean;
  isReady: boolean;
  qrCode?: string;
  sessionData?: any;
  phoneNumber?: string;
  clientInfo?: string;
}

const WhatsApp = () => {
  const [status, setStatus] = useState<WhatsAppStatus>({
    isConnected: false,
    isReady: false
  });
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [messageStats, setMessageStats] = useState({
    total: 0,
    today: 0,
    failed: 0
  });
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchMessageStats();
    
    // Auto-detect existing WhatsApp session on page load with multiple endpoints
    const checkExistingSession = async () => {
      const endpoints = [
        'http://localhost:3001',
        'http://45.88.191.92:3001'
      ];
      
      addLog('Checking for existing WhatsApp session across multiple endpoints...');
      
      for (const endpoint of endpoints) {
        try {
          addLog(`Trying ${endpoint}...`);
          const response = await bridgeFetch('/status');
          
          if (response.ok) {
            const data = await response.json();
            if (data?.isReady) {
              setStatus({
                isConnected: true,
                isReady: true,
                clientInfo: data.clientInfo || 'WhatsApp Connected',
                phoneNumber: data.phoneNumber
              });
              addLog(`✓ Found active WhatsApp session on ${endpoint}`);
              addLog(`Connected as: ${data.phoneNumber || 'Unknown'}`);
              return; // Exit on first successful connection
            }
          }
        } catch (error) {
          addLog(`✗ ${endpoint} not reachable`);
        }
      }
      
      addLog('No active WhatsApp session found on any endpoint');
    };
    
    checkExistingSession();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const initializeWhatsApp = async () => {
    setLoading(true);

    const ensureWebSocket = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      try {
        wsRef.current = new WebSocket(BRIDGE_WS);
        wsRef.current.onopen = () => {
          addLog('Connected to local WhatsApp bridge (WebSocket)');
          wsRef.current?.send(JSON.stringify({ action: 'status' }));
          wsRef.current?.send(JSON.stringify({ action: 'initialize' }));
        };
        wsRef.current.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'qr' && msg.qrCode) {
              await generateQRImage(msg.qrCode);
              addLog('QR code received from bridge');
            } else if (msg.type === 'ready') {
              setStatus({ isConnected: true, isReady: true, clientInfo: 'WhatsApp Connected' });
              setQrDataUrl(null);
              toast.success('WhatsApp connected successfully!');
              addLog('WhatsApp account linked successfully');
            } else if (msg.type === 'status' && msg.qrCode && !status.isReady) {
              await generateQRImage(msg.qrCode);
            } else if (msg.type === 'error') {
              toast.error(msg.message || 'Bridge error');
            }
          } catch (e) {
            console.error('WS parse error', e);
          }
        };
        wsRef.current.onclose = () => addLog('WebSocket to bridge closed');
        wsRef.current.onerror = () => addLog('WebSocket error');
      } catch (e) {
        console.warn('WebSocket connection to localhost failed, will use HTTP fallback');
      }
    };

    try {
      ensureWebSocket();
      // HTTP fallback to trigger QR generation
      const res = await bridgeFetch('/initialize', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data?.qrCode) {
        await generateQRImage(data.qrCode);
        addLog('QR code generated (HTTP)');
      }
      checkForConnection();
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      toast.error('Failed to contact local bridge at 45.88.191.92:3001');
      addLog('Failed to contact local bridge at http://45.88.191.92:3001');
    } finally {
      setLoading(false);
    }
  };

  const checkForConnection = () => {
    const connectionCheck = setInterval(async () => {
      try {
        const res = await bridgeFetch('/status');
        const data = await res.json();
        if (data?.isReady) {
          clearInterval(connectionCheck);
          setStatus({ isConnected: true, isReady: true, clientInfo: 'WhatsApp Connected' });
          setQrDataUrl(null);
          toast.success('WhatsApp connected successfully!');
          addLog('WhatsApp account linked successfully');
        } else if (data?.qrCode && !qrDataUrl) {
          await generateQRImage(data.qrCode);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }, 3000);

    setTimeout(() => clearInterval(connectionCheck), 60000);
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    try {
      await bridgeFetch('/disconnect', { method: 'POST' });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'disconnect' }));
        wsRef.current.close();
      }
      setStatus({ isConnected: false, isReady: false });
      setQrDataUrl(null);
      toast.success('WhatsApp disconnected successfully');
      addLog('WhatsApp account disconnected');
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Failed to disconnect WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const fetchMessageStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: totalMessages } = await supabase
        .from('notification_logs')
        .select('id', { count: 'exact' });

      const { data: todayMessages } = await supabase
        .from('notification_logs')
        .select('id', { count: 'exact' })
        .gte('created_at', today);

      const { data: failedMessages } = await supabase
        .from('notification_logs')
        .select('id', { count: 'exact' })
        .eq('status', 'failed');

      setMessageStats({
        total: totalMessages?.length || 0,
        today: todayMessages?.length || 0,
        failed: failedMessages?.length || 0
      });
    } catch (error) {
      console.error('Error fetching message stats:', error);
    }
  };

  const generateQRImage = async (qrString: string) => {
    try {
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(qrString, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrDataUrl(`data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
          <rect width="256" height="256" fill="#f3f4f6"/>
          <text x="128" y="128" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">
            QR Code Error
          </text>
        </svg>
      `)}`);
    }
  };

  const sendTestMessage = () => {
    if (!status.isReady) {
      toast.error('WhatsApp is not ready');
      return;
    }

    const phoneNumber = prompt('Enter phone number (with country code):');
    if (!phoneNumber) return;

    
    const message = 'Test message from Shahifa Store - WhatsApp integration is working!';

    // Try WS first
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'send_message', phoneNumber, text: message }));
      addLog(`Sent test message via WS to ${phoneNumber}`);
      toast.success('Test message requested');
      return;
    }

    // HTTP fallback
    bridgeFetch('/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, message })
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success('Test message sent successfully');
        addLog(`Test message sent to ${phoneNumber}`);
      } else {
        toast.error(data?.error || 'Failed to send test message');
        addLog(`Failed to send test message: ${data?.error}`);
      }
    }).catch(() => {
      toast.error('Failed to contact local bridge');
      addLog('Failed to contact local bridge for sending message');
    });
  };


  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Integration</h1>
            <p className="text-muted-foreground">
              Connect and manage WhatsApp Web for automated notifications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <Badge variant={status.isReady ? "default" : "secondary"}>
              {status.isReady ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messageStats.total}</div>
              <p className="text-xs text-muted-foreground">All time sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Messages</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messageStats.today}</div>
              <p className="text-xs text-muted-foreground">Sent today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{messageStats.failed}</div>
              <p className="text-xs text-muted-foreground">Failed to send</p>
            </CardContent>
          </Card>
        </div>

        {/* WhatsApp Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              WhatsApp Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!status.isReady ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Link your personal WhatsApp account to enable automated customer notifications
                </p>
                
                {qrDataUrl && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-64 h-64" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-medium">Scan QR Code with WhatsApp</p>
                      <p className="text-sm text-muted-foreground">
                        1. Open WhatsApp on your phone<br/>
                        2. Go to Settings → Linked Devices<br/>
                        3. Tap "Link a Device" and scan this QR code<br/>
                        4. Your personal WhatsApp account will be linked
                      </p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={initializeWhatsApp} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Connecting...' : 'Connect WhatsApp'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>WhatsApp is connected and ready</span>
                  {status.clientInfo && (
                    <Badge variant="outline">{status.clientInfo}</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Available Features:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Order confirmation messages</li>
                    <li>✓ Shipping notifications</li>
                    <li>✓ Delivery confirmations</li>
                    <li>✓ Customer support messages</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button onClick={sendTestMessage} variant="outline" disabled={!status.isReady}>
                    Send Test Message
                  </Button>
                  <Button onClick={disconnectWhatsApp} variant="destructive" disabled={!status.isReady}>
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connection Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-muted/30 p-3 rounded-md">
              {connectionLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                connectionLog.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Confirmations</p>
                  <p className="text-sm text-muted-foreground">Send WhatsApp message when order is confirmed</p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Shipping Updates</p>
                  <p className="text-sm text-muted-foreground">Notify customers when order ships</p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delivery Confirmations</p>
                  <p className="text-sm text-muted-foreground">Send confirmation when order is delivered</p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default WhatsApp;