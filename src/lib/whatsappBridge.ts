// Centralized WhatsApp Bridge endpoints
// Uses Supabase Edge Function proxy for secure access

const SUPABASE_URL = 'https://mofwljpreecqqxkilywh.supabase.co';

export const BRIDGE_HTTP = `${SUPABASE_URL}/functions/v1/whatsapp-bridge-proxy`;
export const BRIDGE_WS = 'ws://45.88.191.92:3001';

// Helper to build proxy URLs with path
export const buildBridgeUrl = (path: string) => {
  return `${BRIDGE_HTTP}?path=${encodeURIComponent(path)}`;
};
