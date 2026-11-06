import { createClient } from "@supabase/supabase-js";

// The server never opens a Realtime socket. Newer @supabase/supabase-js still
// constructs one and throws on Node 20, which is what Vercel runs unless the
// project is explicitly on Node 22. A no-op transport keeps REST and Auth working.
class ServerOnlyWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = ServerOnlyWebSocket.CLOSED;
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: ServerOnlyWebSocket as unknown as typeof WebSocket,
    },
  });
}
