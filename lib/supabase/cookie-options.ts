import type { CookieOptionsWithName } from "@supabase/ssr";

// Use the same cookie settings in the browser, Server Actions and Next.js Proxy.
// Do not override the Supabase-generated cookie name: changing it would log out
// existing users. The browser must be able to read these cookies to refresh tokens.
// Supabase Auth's server-side session rules still determine when a session ends.
export const momoAuthCookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
} satisfies CookieOptionsWithName;
