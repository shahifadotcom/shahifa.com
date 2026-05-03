// Centralized WhatsApp Bridge endpoints
// Uses Supabase Edge Function proxy for secure access (admin auth required)
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = 'https://mofwljpreecqqxkilywh.supabase.co';

export const BRIDGE_HTTP = `${SUPABASE_URL}/functions/v1/whatsapp-bridge-proxy`;
export const BRIDGE_WS = 'ws://45.88.191.92:3001';

export const buildBridgeUrl = (path: string) => {
  return `${BRIDGE_HTTP}?path=${encodeURIComponent(path)}`;
};

// Authenticated fetch to the WhatsApp bridge proxy.
// Automatically attaches the current user's Supabase JWT (admin role required by the proxy).
export const bridgeFetch = async (path: string, init: RequestInit = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(buildBridgeUrl(path), { ...init, headers });
};
