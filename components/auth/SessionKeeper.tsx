"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Initialise browser-side session management while a signed-in dashboard is open.
 * The Supabase browser client refreshes tokens while the tab is active, keeping
 * the shared auth cookies current for refreshes and other tabs.
 *
 * This is NOT an access check. The server still verifies every protected page
 * and every privileged action using the existing Admin/Portal role checks.
 */
export default function SessionKeeper() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    // Initialises the existing cookie-backed session; never sign out on a
    // transient client-side error. The server remains the authority.
    void supabase.auth.getSession();
  }, []);

  return null;
}
