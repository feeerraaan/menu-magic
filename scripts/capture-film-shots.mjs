// Captures the screenshot set the launch film and the two trailers need
// (docs/video/*.md). Separate from scripts/take-screenshots.mjs, which owns the
// marketing set: this one captures INTERACTION STATES (dialog open, category
// expanded, field filled, language tab switched, phone viewport, tall full-page
// shots for camera pans) so the Remotion camera can cut between them at the
// moment a click lands.
//
// Read only against production data: it never clicks Save, never sends a copilot
// message and never runs an AI action that mutates the menu. Text typed into
// fields is local DOM state and is discarded when the context closes.
//
// Usage:
//   set -a; . /root/.secrets/menu-magic.env; set +a
//   DEMO_EMAIL=sacarta@azpy.es node scripts/capture-film-shots.mjs
//   SC_ONLY=editor,qr node scripts/capture-film-shots.mjs   # subset

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.SITE_URL ?? 'https://sacarta.azpy.es';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = process.env.SC_OUTPUT_DIR ?? join(ROOT, 'video', 'public', 'film');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'sacarta@azpy.es';
const SLUG = process.env.DEMO_SLUG ?? 'sacarta';

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY');
  process.exit(1);
}

mkdirSync(OUTPUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSession(email) {
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const { action_link } = await linkRes.json();
  if (!action_link) throw new Error('could not generate magic link');
  const token = new URL(action_link).searchParams.get('token');
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: token }),
  });
  const session = await verifyRes.json();
  if (!session.access_token) throw new Error('could not verify magic link');
  return session;
}

// The description the film types on screen. Typed locally so the shot shows a
// real filled field without spending an AI credit or writing to the database.
// These are the descriptions the app actually stores for the first Entrantes
// dish ("Pan con tomate con jamón ibérico"), read back from production so the
// text the film types on screen is the real product copy, not invented copy.
const DESC_ES = 'Pan payés tostado, tomate maduro rallado, aceite de oliva virgen extra y jamón ibérico.';
const DESC_EN = 'Toasted country bread, grated ripe tomato, extra virgin olive oil and Iberian ham.';
const MENU_TEXT = `ENTRANTES
Pan con tomate  6,50
Croquetas de jamón  9,00
Ensalada de tomate de ramallet  11,50
Pulpo a la brasa  18,00

PRINCIPALES
Arroz meloso de bogavante  26,00
Lomo de dorada a la plancha  22,50
Cordero lechal al horno  24,00
Fideuà de marisco  23,00`;

// Helpers -------------------------------------------------------------------

async function expandCategory(page, name) {
  const header = page.getByText(name, { exact: true }).first();
  const row = header.locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  // The chevron is the first button in the row header.
  await row.getByRole('button').first().click();
  await wait(900);
}

async function openFirstDish(page) {
  // lucide renders Edit2 as svg.lucide-pen. In DOM order the pens are:
  // 0 = the menu name pen, 1 = the category pen, 2 = the first dish pen.
  await page.locator('button:has(svg.lucide-pen)').nth(2).click();
  await wait(1600);
}

async function fillDescription(page, text) {
  const ta = page.locator('textarea').first();
  await ta.click();
  await ta.fill(text);
  await wait(500);
}

// Shot list ------------------------------------------------------------------

const DESKTOP = { width: 1440, height: 900, dpr: 2 };
const PHONE = { width: 430, height: 932, dpr: 3 };
// The dashboard scrolls its content container, not the document, so fullPage
// captures nothing extra. Tall viewports are how the camera gets a page it can
// pan across. These shots are for panning only: clicks use the 900 tall set,
// which is the viewport the target boxes in src/targets.json were measured in.
const TALL = (h) => ({ width: 1440, height: h, dpr: 2 });

const shots = [
  // --- establishing pages -------------------------------------------------
  { file: 'dashboard', url: '/dashboard', auth: true, needle: 'Restaurant Health' },
  { file: 'dashboard-full', url: '/dashboard', auth: true, needle: 'Restaurant Health', fullPage: true },
  { file: 'editor', url: '/dashboard/editor', auth: true, needle: 'Menu Editor' },
  { file: 'qr', url: '/dashboard/qr', auth: true, needle: 'QR Code' },
  { file: 'analytics-full', url: '/dashboard/analytics', auth: true, needle: 'Analytics', fullPage: true },
  { file: 'optimizer', url: '/dashboard/ai-optimizer', auth: true, needle: 'Optimizer' },
  { file: 'landing-full', url: '/', needle: 'SaCarta', fullPage: true },

  // --- import dialog ------------------------------------------------------
  {
    file: 'import-empty',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Import with AI',
    setup: async (page) => {
      await page.getByRole('button', { name: /import with ai/i }).first().click();
      await wait(1400);
    },
  },
  {
    file: 'import-filled',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Import with AI',
    setup: async (page) => {
      await page.getByRole('button', { name: /import with ai/i }).first().click();
      await wait(1400);
      const ta = page.locator('textarea').first();
      if (await ta.count()) {
        await ta.click();
        await ta.fill(MENU_TEXT);
      }
      await wait(600);
    },
  },

  {
    file: 'import-pdf',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Import with AI',
    setup: async (page) => {
      await page.getByRole('button', { name: /import with ai/i }).first().click();
      await wait(1400);
      const pdfTab = page.getByRole('tab', { name: /pdf/i }).first();
      if (await pdfTab.count()) await pdfTab.click();
      await wait(900);
    },
  },

  // --- editor, category expanded -----------------------------------------
  {
    file: 'editor-expanded',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Entrantes',
    setup: async (page) => {
      await expandCategory(page, 'Entrantes');
    },
  },

  // --- the dish dialog, one shot per state the film cuts between ----------
  {
    file: 'dish-empty',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Entrantes',
    setup: async (page) => {
      await expandCategory(page, 'Entrantes');
      await openFirstDish(page);
      const ta = page.locator('textarea').first();
      if (await ta.count()) await ta.fill('');
      await wait(600);
    },
  },
  {
    file: 'dish-filled',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Entrantes',
    setup: async (page) => {
      await expandCategory(page, 'Entrantes');
      await openFirstDish(page);
      await fillDescription(page, DESC_ES);
    },
  },
  {
    file: 'dish-en-empty',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Entrantes',
    setup: async (page) => {
      await expandCategory(page, 'Entrantes');
      await openFirstDish(page);
      const tab = page.getByRole('tab', { name: /english|en/i }).first();
      if (await tab.count()) await tab.click();
      await wait(700);
      const ta = page.locator('textarea').first();
      if (await ta.count()) await ta.fill('');
      await wait(500);
    },
  },
  {
    file: 'dish-en-filled',
    url: '/dashboard/editor',
    auth: true,
    needle: 'Entrantes',
    setup: async (page) => {
      await expandCategory(page, 'Entrantes');
      await openFirstDish(page);
      const tab = page.getByRole('tab', { name: /english|en/i }).first();
      if (await tab.count()) await tab.click();
      await wait(700);
      await fillDescription(page, DESC_EN);
    },
  },
  // --- tall viewports, for the camera pans --------------------------------
  { file: 'analytics-tall', url: '/dashboard/analytics', auth: true, needle: 'Analytics', device: TALL(2400) },
  { file: 'dashboard-tall', url: '/dashboard', auth: true, needle: 'Restaurant Health', device: TALL(1300) },
  { file: 'qr-tall', url: '/dashboard/qr', auth: true, needle: 'QR Code', device: TALL(1400) },
  { file: 'editor-tall', url: '/dashboard/editor', auth: true, needle: 'Entrantes', device: TALL(1600), setup: (page) => expandCategory(page, 'Entrantes') },
  { file: 'optimizer-tall', url: '/dashboard/ai-optimizer', auth: true, needle: 'Optimizer', device: TALL(1800) },

  // --- settings: the real language picker, all seven languages ------------
  { file: 'settings', url: '/dashboard/settings', auth: true, needle: 'Settings' },
  { file: 'settings-full', url: '/dashboard/settings', auth: true, needle: 'Settings', fullPage: true },

  // --- copilot: empty thread and a typed question, never sent ------------
  {
    file: 'copilot-empty',
    url: '/dashboard/ai-copilot',
    auth: true,
    needle: 'AI Copilot',
    setup: async (page) => {
      const newBtn = page.getByRole('button', { name: /new conversation/i });
      if (await newBtn.count()) await newBtn.first().click();
      await wait(1600);
    },
  },
  {
    file: 'copilot-typed',
    url: '/dashboard/ai-copilot',
    auth: true,
    needle: 'AI Copilot',
    setup: async (page) => {
      const newBtn = page.getByRole('button', { name: /new conversation/i });
      if (await newBtn.count()) await newBtn.first().click();
      await wait(1600);
      // Typed but never sent: no AI credit spent, no menu mutated.
      const ta = page.locator('textarea').first();
      await ta.click();
      await ta.fill('Increase the price of all Entrantes dishes by 10%');
      await wait(600);
    },
  },

  // --- the public menu, on a phone ---------------------------------------
  { file: 'menu-es', url: `/m/${SLUG}`, needle: 'SaCarta', device: PHONE, lang: 'es' },
  { file: 'menu-en', url: `/m/${SLUG}`, needle: 'SaCarta', device: PHONE, lang: 'en' },
  { file: 'menu-full', url: `/m/${SLUG}`, needle: 'SaCarta', device: PHONE, lang: 'en', fullPage: true },
  // The Spanish tall menu, so the film can actually SHOW the language switch:
  // starting on the English capture made the switch invisible.
  { file: 'menu-full-es', url: `/m/${SLUG}`, needle: 'SaCarta', device: PHONE, lang: 'es', fullPage: true },
  {
    file: 'assistant-open',
    url: `/m/${SLUG}`,
    needle: 'SaCarta',
    device: PHONE,
    lang: 'en',
    setup: async (page) => {
      await page.locator('button:has(svg.lucide-message-circle)').first().click();
      await wait(1600);
    },
  },
  {
    file: 'assistant-answer',
    url: `/m/${SLUG}`,
    needle: 'SaCarta',
    device: PHONE,
    lang: 'en',
    setup: async (page) => {
      await page.locator('button:has(svg.lucide-message-circle)').first().click();
      await wait(1600);
      const input = page.getByPlaceholder(/type your question|escribe tu pregunta/i).first();
      // Asked in English because the assistant answers in the guest's language
      // (the lang param is passed to the AI backend). The film's GuestScene
      // types the same English question.
      await input.fill("I'm coeliac, what can I eat?");
      await input.press('Enter');
      // Wait for the pending state to CLEAR. Matching on keywords fails here,
      // because the question itself contains every keyword the answer would.
      for (let i = 0; i < 30; i++) {
        await wait(2000);
        const txt = await page.evaluate(() => document.body.innerText);
        if (!/thinking|pensando|escribiendo/i.test(txt)) break;
      }
      await wait(2500);
    },
  },
];

// Runner ---------------------------------------------------------------------

const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const sessions = new Map();
async function sessionFor(email) {
  if (!sessions.has(email)) sessions.set(email, await getSession(email));
  return sessions.get(email);
}

const only = process.env.SC_ONLY ? process.env.SC_ONLY.split(',').map((s) => s.trim()) : null;
const browser = await chromium.launch();
const failures = [];

for (const shot of shots) {
  if (only && !only.includes(shot.file)) continue;
  const dev = shot.device ?? DESKTOP;
  let context;
  try {
    context = await browser.newContext({
      viewport: { width: dev.width, height: dev.height },
      deviceScaleFactor: dev.dpr,
      locale: 'en-GB',
      isMobile: dev === PHONE,
      hasTouch: dev === PHONE,
    });
    const lang = shot.lang ?? 'en';
    await context.addInitScript((l) => {
      localStorage.setItem('SaCarta-language', l);
    }, lang);
    if (shot.auth) {
      const s = await sessionFor(shot.email ?? DEMO_EMAIL);
      await context.addInitScript(
        ([key, value]) => localStorage.setItem(key, value),
        [storageKey, JSON.stringify({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          token_type: s.token_type,
          expires_at: s.expires_at,
          expires_in: s.expires_in,
          user: s.user,
        })],
      );
    }
    const page = await context.newPage();
    await page.goto(SITE + shot.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(shot.setup ? 3000 : 4000);
    if (shot.setup) await shot.setup(page);
    if (shot.needle) {
      const ok = await page.evaluate((n) => document.body.innerText.includes(n), shot.needle);
      if (!ok) console.warn(`  WARN "${shot.needle}" not found on ${shot.file}`);
    }
    await page.screenshot({ path: join(OUTPUT, `${shot.file}.png`), fullPage: !!shot.fullPage });
    const box = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
    console.log(`OK   ${shot.file}.png  (page ${box[0]}x${box[1]})`);
  } catch (err) {
    failures.push(`${shot.file}: ${err.message.split('\n')[0]}`);
    console.error(`FAIL ${shot.file}: ${err.message.split('\n')[0]}`);
  } finally {
    if (context) await context.close();
  }
}

await browser.close();
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  ' + f));
}
console.log('\nDone. Shots in', OUTPUT);
