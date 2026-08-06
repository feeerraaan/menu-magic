// Re-runnable Playwright script that captures the SaCarta screenshot set for
// GitHub / Devpost / whitepaper / marketing. Requires a browser already installed
// (`npx playwright install chromium`), the demo account email, and the Supabase
// credentials used to mint a demo session via a magic link (never committed).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
//   DEMO_EMAIL=sacarta@azpy.es [SITE_URL=...] [SC_OUTPUT_DIR=...] \
//   node scripts/take-screenshots.mjs
//
// The magic-link flow replaces the need for a stored password: it generates a
// login link server-side and injects the resulting session into localStorage.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.SITE_URL ?? 'https://sacarta.azpy.es';
const OUTPUT = process.env.SC_OUTPUT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'screenshots');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'sacarta@azpy.es';
const PUBLIC_SLUG = process.env.DEMO_SLUG ?? 'sacarta';

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY env vars');
  process.exit(1);
}

mkdirSync(OUTPUT, { recursive: true });

async function getSession(email = DEMO_EMAIL) {
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const { action_link } = await linkRes.json();
  if (!action_link) throw new Error('Could not generate magic link');
  const token = new URL(action_link).searchParams.get('token');
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: token }),
  });
  const session = await verifyRes.json();
  if (!session.access_token) throw new Error('Could not verify magic link');
  return session;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A short per-page sanity check so a broken page is caught before saving.
async function assertText(page, needle, file) {
  const ok = await page.evaluate((n) => document.body.innerText.includes(n), needle);
  if (!ok) console.warn(`WARN: "${needle}" not found on ${file}`);
}

const shots = [
  { file: 'landing', url: '/', needle: 'SaCarta' },
  { file: 'dashboard', url: '/dashboard', needle: 'SaCarta', auth: true },
  { file: 'menu-editor', url: '/dashboard/editor', needle: 'Menu Editor', auth: true },
  {
    file: 'ai-import',
    url: '/dashboard/editor',
    needle: 'Import with AI',
    auth: true,
    setup: async (page) => {
      const btn = page.getByRole('button', { name: /import with ai/i });
      if (await btn.count()) {
        await btn.first().click();
        await wait(1500);
      }
    },
  },
  {
    file: 'ai-copilot',
    url: '/dashboard/ai-copilot',
    needle: 'AI Copilot',
    auth: true,
    setup: async (page) => {
      const textarea = page.locator('textarea').first();
      await textarea.fill('Which dishes are vegetarian?');
      await textarea.press('Enter');
      // Wait for the model reply: the send button shows a spinner while sending.
      const sendBtn = page.getByRole('button').filter({ has: page.locator('svg') });
      await page.waitForTimeout(2000);
      for (let i = 0; i < 20; i++) {
        const spinning = await page.locator('.animate-spin').count();
        if (spinning === 0) break;
        await wait(3000);
      }
      await wait(2500);
    },
  },
  { file: 'analytics', url: '/dashboard/analytics', needle: 'Analytics', auth: true },
  { file: 'qr', url: '/dashboard/qr', needle: 'QR Code', auth: true },
  { file: 'settings', url: '/dashboard/settings', needle: 'Settings', auth: true },
  { file: 'billing', url: '/dashboard/billing', needle: 'Billing', auth: true },
  {
    file: 'admin',
    url: '/dashboard/admin',
    needle: 'Backoffice',
    auth: true,
    email: process.env.ADMIN_EMAIL ?? 'fazpiazuadrover@gmail.com',
  },
  { file: 'public-menu', url: `/m/${PUBLIC_SLUG}`, needle: 'SaCarta' },
  {
    file: 'customer-assistant',
    url: `/m/${PUBLIC_SLUG}`,
    needle: 'SaCarta',
    setup: async (page) => {
      const launcher = page.getByRole('button', { name: /asistente del men|menu assistant/i });
      if (await launcher.count()) {
        await launcher.first().click();
        await wait(1500);
      }
    },
  },
];

const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const sessionsByEmail = new Map();

async function sessionFor(email) {
  if (!sessionsByEmail.has(email)) {
    sessionsByEmail.set(email, await getSession(email));
  }
  return sessionsByEmail.get(email);
}

const browser = await chromium.launch();
const consoleErrors = [];

for (const shot of shots) {
  try {
    const file = join(OUTPUT, `${shot.file}.png`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    if (shot.auth) {
      const session = await sessionFor(shot.email ?? DEMO_EMAIL);
      const storage = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: session.token_type,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        user: session.user,
      };
      await context.addInitScript(
        ([key, value]) => { localStorage.setItem(key, value); },
        [storageKey, JSON.stringify(storage)],
      );
    }
    const page = await context.newPage();
    page.on('pageerror', (e) => consoleErrors.push(e.message));
    await page.goto(SITE + shot.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await wait(shot.setup ? 1800 : 3500);
    if (shot.setup) await shot.setup(page);
    await assertText(page, shot.needle, shot.file);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`OK ${shot.file}.png`);
    await context.close();
  } catch (err) {
    console.error(`FAIL ${shot.file}: ${err.message}`);
  }
}

if (consoleErrors.length) {
  console.warn('\nPage errors seen:', [...new Set(consoleErrors)].slice(0, 10));
}

await browser.close();
console.log('\nDone. Screenshots in', OUTPUT);
