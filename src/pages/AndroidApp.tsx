import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Wifi, MessageSquare, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SMSMessage {
  sender: string;
  message: string;
  timestamp: number;
  transactionId?: string;
  amount?: string;
  gateway?: string;
}

interface ConnectionStatus {
  connected: boolean;
  serverUrl: string;
  lastHeartbeat?: number;
}

export default function AndroidApp() {
  const [isConnected, setIsConnected] = useState(false);
  const [smsPermission, setSmsPermission] = useState(false);
  const [backgroundPermission, setBackgroundPermission] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    serverUrl: 'http://45.88.191.92:3000'
  });
  const [recentMessages, setRecentMessages] = useState<SMSMessage[]>([]);
  const [processingCount, setProcessingCount] = useState(0);

  // Check permissions on component mount
  useEffect(() => {
    checkPermissions();
    
    // Start heartbeat when connected
    let heartbeatInterval: NodeJS.Timeout;
    if (isConnected) {
      heartbeatInterval = setInterval(() => {
        sendHeartbeat();
      }, 30000); // Every 30 seconds
    }

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [isConnected]);

  const checkPermissions = async () => {
    try {
      // Check SMS permission
      if ('permissions' in navigator) {
        const smsResult = await (navigator.permissions as any).query({ name: 'sms' });
        setSmsPermission(smsResult.state === 'granted');
      }

      // Check background permission (Android specific)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        setBackgroundPermission(!!registration);
      }
    } catch (error) {
      console.error('Permission check failed:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      toast.loading('Requesting permissions...');
      
      // Request SMS permission
      if ('permissions' in navigator) {
        const smsResult = await (navigator.permissions as any).request({ name: 'sms' });
        setSmsPermission(smsResult === 'granted');
      }

      // Register service worker for background operation
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setBackgroundPermission(true);
        console.log('Service Worker registered:', registration);
      }

      toast.success('Permissions granted successfully!');
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      toast.error('Failed to grant permissions. Please enable manually in settings.');
      return false;
    }
  };

  const connectToServer = async () => {
    try {
      if (!smsPermission || !backgroundPermission) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      toast.loading('Connecting to server...');

      // Test connection to Supabase
      const { data, error } = await supabase
        .from('transaction_verifications')
        .select('id')
        .limit(1);

      if (error) throw error;

      setIsConnected(true);
      setConnectionStatus({
        connected: true,
        serverUrl: 'http://45.88.191.92:3000',
        lastHeartbeat: Date.now()
      });

      // Start SMS monitoring
      startSMSMonitoring();
      
      toast.success('Connected successfully! SMS monitoring started.');
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('Failed to connect to server');
    }
  };

  const sendHeartbeat = async () => {
    try {
      const { error } = await supabase
        .from('transaction_verifications')
        .select('id')
        .limit(1);

      if (!error) {
        setConnectionStatus(prev => ({
          ...prev,
          lastHeartbeat: Date.now()
        }));
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
      setIsConnected(false);
    }
  };

  const startSMSMonitoring = () => {
    if ('MessageEvent' in window) {
      // Mock SMS monitoring for web - in real Android app this would use native SMS APIs
      const mockMonitoring = () => {
        console.log('SMS monitoring started...');
        
        // Simulate periodic SMS checks
        setInterval(() => {
          // This is placeholder - real implementation would read actual SMS
          checkForNewSMS();
        }, 5000);
      };

      mockMonitoring();
    }
  };

  const checkForNewSMS = async () => {
    // In real Android app, this would read SMS messages
    // For now, this is a placeholder that shows the structure
    
    // Mock SMS detection patterns for Bangladesh payment gateways
    const patterns = [
      /bKash.*?(?:TrxID|Transaction ID):?\s*([A-Z0-9]+)/i,
      /Nagad.*?(?:TxnId|Transaction):?\s*([A-Z0-9]+)/i,
      /Rocket.*?(?:TxID|Reference):?\s*([A-Z0-9]+)/i,
    ];

    // This would be replaced with actual SMS reading in native Android
    console.log('Checking for new SMS messages...');
  };

  const extractTransactionData = (message: string): Partial<SMSMessage> => {
    const patterns = {
      bkash: /bKash.*?(?:TrxID|Transaction ID):?\s*([A-Z0-9]+).*?(?:Amount|Tk):?\s*([0-9,.]+)/i,
      nagad: /Nagad.*?(?:TxnId|Transaction):?\s*([A-Z0-9]+).*?(?:Amount|Tk):?\s*([0-9,.]+)/i,
      rocket: /Rocket.*?(?:TxID|Reference):?\s*([A-Z0-9]+).*?(?:Amount|Tk):?\s*([0-9,.]+)/i,
    };

    for (const [gateway, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) {
        return {
          transactionId: match[1],
          amount: match[2],
          gateway: gateway.toLowerCase()
        };
      }
    }

    return {};
  };

  const sendTransactionToServer = async (transactionId: string, gateway: string, amount: string, sender: string, message: string) => {
    try {
      // Use edge function for proper handling with service role
      const { data, error } = await supabase.functions.invoke('sms-transaction-handler', {
        body: {
          smsData: {
            transaction_id: transactionId,
            sender_number: sender,
            message_content: message,
            wallet_type: gateway,
            amount: parseFloat(amount.replace(/[,]/g, '')),
            timestamp: Date.now()
          }
        }
      });

      if (error) throw error;
      
      setProcessingCount(prev => prev + 1);
      toast.success(`Transaction ${transactionId} sent to server`);
      
      console.log('Server response:', data);
    } catch (error) {
      console.error('Failed to send transaction:', error);
      toast.error('Failed to send transaction to server');
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setConnectionStatus(prev => ({ ...prev, connected: false }));
    toast.info('Disconnected from server');
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/lovable-uploads/90b7b25b-9f3f-4853-937c-a55a044f46db.png')`
      }}
    >
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Smartphone className="w-6 h-6" />
              SMS Transaction Scanner
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Connection Status */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Server Connection</span>
              <Badge variant={connectionStatus.connected ? "default" : "secondary"}>
                {connectionStatus.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Server: {connectionStatus.serverUrl}
            </div>
            
            {connectionStatus.lastHeartbeat && (
              <div className="text-sm text-muted-foreground">
                Last ping: {new Date(connectionStatus.lastHeartbeat).toLocaleTimeString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>SMS Access</span>
              </div>
              {smsPermission ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span>Background Mode</span>
              </div>
              {backgroundPermission ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Activity Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{processingCount}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{recentMessages.length}</div>
                <div className="text-sm text-muted-foreground">Recent SMS</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            {!isConnected ? (
              <Button 
                onClick={connectToServer} 
                className="w-full"
                size="lg"
              >
                Connect & Start Monitoring
              </Button>
            ) : (
              <Button 
                onClick={disconnect} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                Disconnect
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        {!smsPermission && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              SMS permission is required to scan transaction messages. Please grant permission in your device settings.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              App is running in background. Transaction IDs will be automatically detected and sent to server.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}