import { createBrowserClient } from "@supabase/ssr";
import { momoAuthCookieOptions } from "./cookie-options";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: momoAuthCookieOptions },
  );
}
