// Static regression checks for the v2.20 auth integration. No network or
// credentials are required. These do not replace a real-browser login test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const options = read('lib/supabase/cookie-options.ts');
assert.match(options, /path:\s*"\/"/);
assert.match(options, /sameSite:\s*"lax"/);
assert.match(options, /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/);
assert.match(options, /maxAge:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*30/);
assert.doesNotMatch(options, /^\s*name\s*:/m, 'Keep the original Supabase cookie name');
for (const path of ['lib/supabase/server.ts', 'lib/supabase/client.ts', 'lib/supabase/proxy.ts']) {
  const file = read(path);
  assert.match(file, /cookieOptions:\s*momoAuthCookieOptions/, `${path} must share cookie options`);
  console.log(`PASS - Shared cookies in ${path}`);
}
const proxy = read('lib/supabase/proxy.ts');
assert.match(proxy, /setAll\(cookiesToSet, headers\)/);
assert.match(proxy, /Object\.entries\(headers\)/);
assert.match(proxy, /await supabase\.auth\.getClaims\(\)/);
console.log('PASS - Proxy keeps refreshed cookies and forwards cache protection');
const keeper = read('components/auth/SessionKeeper.tsx');
assert.match(keeper, /createSupabaseBrowserClient\(\)/);
assert.match(keeper, /supabase\.auth\.getSession\(\)/);
assert.doesNotMatch(keeper, /\.signOut\(/);
for (const path of ['app/admin/(dashboard)/layout.tsx', 'app/portal/(dashboard)/layout.tsx']) {
  assert.match(read(path), /<SessionKeeper\s*\/>/, `${path} must mount SessionKeeper`);
  console.log(`PASS - Persistent browser client in ${path}`);
}
assert.match(read('lib/admin/auth.ts'), /supabase\.auth\.getClaims\(\)/);
assert.match(read('lib/admin/auth.ts'), /\.from\("admin_users"\)/);
assert.match(read('lib/portal/auth.ts'), /supabase\.auth\.getUser\(\)/);
assert.match(read('lib/portal/auth.ts'), /\.from\("organization_members"\)/);
assert.match(read('app/admin/(dashboard)/actions.ts'), /supabase\.auth\.signOut\(\)/);
assert.match(read('app/portal/(dashboard)/actions.ts'), /supabase\.auth\.signOut\(\)/);
assert.match(read('app/legal/page.tsx'), /border-white\/6/);
console.log('PASS - Role checks, explicit logout and border-white/6 retained');
