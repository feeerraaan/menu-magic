// Dumps the bounding box of every element the film clicks, pans to or highlights,
// into video/src/targets.json. The Remotion cursor and camera address the UI by
// name ("editor.importWithAi") instead of by eyeballed pixel guesses, so a
// re-captured screenshot updates the choreography automatically.
//
// Boxes are in CSS pixels of the capture viewport (1440x900 desktop, 430x932
// phone). The PNGs are 2x that, which video/src/film.ts accounts for.
//
// Usage:
//   set -a; . /root/.secrets/menu-magic.env; set +a
//   node scripts/capture-film-targets.mjs

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.SITE_URL ?? 'https://sacarta.azpy.es';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'video', 'src', 'targets.json');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE, SUPABASE_ANON_KEY: ANON } = process.env;
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'sacarta@azpy.es';
const SLUG = process.env.DEMO_SLUG ?? 'sacarta';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSession(email) {
  const link = await (await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  })).json();
  const token = new URL(link.action_link).searchParams.get('token');
  return (await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: token }),
  })).json();
}

// Records the box of a locator under a dotted name.
async function box(out, name, locator) {
  try {
    if (!(await locator.count())) {
      console.warn(`  miss ${name}`);
      return;
    }
    const b = await locator.first().boundingBox();
    if (!b) {
      console.warn(`  miss ${name} (no box)`);
      return;
    }
    out[name] = {
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width), h: Math.round(b.height),
      cx: Math.round(b.x + b.width / 2), cy: Math.round(b.y + b.height / 2),
    };
    console.log(`  ${name}  ${out[name].cx},${out[name].cy}`);
  } catch (e) {
    console.warn(`  miss ${name}: ${e.message.split('\n')[0]}`);
  }
}

const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const browser = await chromium.launch();
let session;

async function open(url, { auth = false, phone = false } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width: 430, height: 932 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'en-GB',
    isMobile: phone,
    hasTouch: phone,
  });
  await context.addInitScript(() => localStorage.setItem('SaCarta-language', 'en'));
  if (auth) {
    if (!session) session = await getSession(DEMO_EMAIL);
    const s = session;
    await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [storageKey, JSON.stringify({
      access_token: s.access_token, refresh_token: s.refresh_token, token_type: s.token_type,
      expires_at: s.expires_at, expires_in: s.expires_in, user: s.user,
    })]);
  }
  const page = await context.newPage();
  await page.goto(SITE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(4000);
  return { page, context };
}

const T = {};

// --- the sidebar, shared by every dashboard shot ---------------------------
{
  console.log('sidebar + editor');
  const { page, context } = await open('/dashboard/editor', { auth: true });
  const nav = {
    dashboard: 'Dashboard', editor: 'Menu Editor', qr: 'QR Code', analytics: 'Analytics',
    optimizer: 'AI Optimizer', copilot: 'AI Copilot', settings: 'Settings', billing: 'Billing',
  };
  for (const [k, label] of Object.entries(nav)) {
    await box(T, `sidebar.${k}`, page.getByRole('link', { name: label }).or(page.getByText(label, { exact: true })));
  }
  await box(T, 'editor.importWithAi', page.getByRole('button', { name: /import with ai/i }));
  await box(T, 'editor.addCategory', page.getByRole('button', { name: /add category/i }));
  await box(T, 'editor.limits', page.getByText('Menus', { exact: true }));
  await box(T, 'editor.title', page.getByText('Menú Mediodía').first());
  for (const c of ['Entrantes', 'Principales', 'Postres', 'Bebidas']) {
    await box(T, `editor.cat.${c}`, page.getByText(c, { exact: true }));
  }
  await context.close();
}

// --- editor with Entrantes expanded ---------------------------------------
{
  console.log('editor expanded');
  const { page, context } = await open('/dashboard/editor', { auth: true });
  const header = page.getByText('Entrantes', { exact: true }).first();
  const row = header.locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
  await box(T, 'expanded.chevron', row.getByRole('button').first());
  await row.getByRole('button').first().click();
  await wait(1200);
  const dishes = ['Pan con tomate con jamón ibérico', 'Ensalada mallorquina', 'Croquetas caseras de cocido', 'Gazpacho andaluz'];
  for (let i = 0; i < dishes.length; i++) {
    await box(T, `expanded.dish${i}`, page.getByText(dishes[i], { exact: true }));
  }
  const pens = page.locator('button:has(svg.lucide-pen)');
  await box(T, 'expanded.dish0Pen', pens.nth(2));
  // Prices, for the copilot proof shot where each one pops its new value.
  for (let i = 0; i < 4; i++) {
    await box(T, `expanded.price${i}`, page.locator('span.text-primary.font-semibold').nth(i));
  }
  await box(T, 'expanded.addItem', page.getByRole('button', { name: /add item/i }));
  await context.close();
}

// --- the import dialog ----------------------------------------------------
{
  console.log('import dialog');
  const { page, context } = await open('/dashboard/editor', { auth: true });
  await page.getByRole('button', { name: /import with ai/i }).first().click();
  await wait(1600);
  await box(T, 'import.dialog', page.getByRole('dialog'));
  await box(T, 'import.textarea', page.locator('textarea').first());
  await box(T, 'import.submit', page.getByRole('button', { name: /^import$|import menu|start import/i }));
  await box(T, 'import.tabText', page.getByRole('tab').first());
  await box(T, 'import.tabFile', page.getByRole('tab').nth(1));
  await context.close();
}

// --- the dish dialog ------------------------------------------------------
{
  console.log('dish dialog');
  const { page, context } = await open('/dashboard/editor', { auth: true });
  const header = page.getByText('Entrantes', { exact: true }).first();
  await header.locator('xpath=ancestor::div[contains(@class,"rounded")][1]').getByRole('button').first().click();
  await wait(1200);
  await page.locator('button:has(svg.lucide-pen)').nth(2).click();
  await wait(1800);
  await box(T, 'dish.dialog', page.getByRole('dialog'));
  await box(T, 'dish.tabEs', page.getByRole('tab').first());
  await box(T, 'dish.tabEn', page.getByRole('tab').nth(1));
  await box(T, 'dish.name', page.locator('#item-name-es'));
  await box(T, 'dish.price', page.locator('#item-price'));
  await box(T, 'dish.desc', page.locator('#item-desc-es'));
  await box(T, 'dish.generate', page.getByRole('button', { name: /generate with ai/i }));
  await box(T, 'dish.translate', page.getByRole('button', { name: /translate with ai/i }));
  await box(T, 'dish.save', page.getByRole('button', { name: /^save$/i }));
  // English tab, same fields at their English positions.
  await page.getByRole('tab').nth(1).click();
  await wait(900);
  await box(T, 'dish.descEn', page.locator('#item-desc-en'));
  await box(T, 'dish.nameEn', page.locator('#item-name-en'));
  await box(T, 'dish.translateEn', page.getByRole('button', { name: /translate with ai/i }).nth(1));
  await context.close();
}

// --- the copilot ----------------------------------------------------------
{
  console.log('copilot');
  const { page, context } = await open('/dashboard/ai-copilot', { auth: true });
  const newBtn = page.getByRole('button', { name: /new conversation/i });
  if (await newBtn.count()) { await newBtn.first().click(); await wait(1600); }
  await box(T, 'copilot.newConversation', newBtn);
  await box(T, 'copilot.input', page.locator('textarea').first());
  await box(T, 'copilot.send', page.locator('button:has(svg.lucide-send)'));
  await box(T, 'copilot.thread', page.getByText(/describe the change/i).first());
  await box(T, 'copilot.title', page.getByText('AI Copilot').first());
  await context.close();
}

// --- the QR page ----------------------------------------------------------
{
  console.log('qr');
  const { page, context } = await open('/dashboard/qr', { auth: true });
  await box(T, 'qr.code', page.locator('canvas, svg[role=img], img[alt*="QR" i]').first());
  await box(T, 'qr.download', page.getByRole('button', { name: /download|pdf/i }));
  await box(T, 'qr.url', page.getByText(/\/m\//).first());
  await context.close();
}

// --- the dashboard --------------------------------------------------------
{
  console.log('dashboard');
  const { page, context } = await open('/dashboard', { auth: true });
  await box(T, 'dash.greeting', page.getByText(/good (morning|afternoon|evening)/i));
  await box(T, 'dash.health', page.getByText('Restaurant Health'));
  await box(T, 'dash.score', page.locator('div').filter({ hasText: /^\d{2}$/ }).last());
  await box(T, 'dash.today', page.getByText('Today', { exact: true }));
  await box(T, 'dash.recommendations', page.getByText(/AI recommendations/i));
  await box(T, 'dash.insights', page.getByText('Insights', { exact: true }));
  await box(T, 'dash.viewMenu', page.getByRole('button', { name: /view menu/i }));
  for (const f of ['Images', 'Descriptions', 'Languages', 'Accessibility', 'Categories', 'Pricing']) {
    await box(T, `dash.factor.${f}`, page.getByText(f, { exact: true }));
  }
  await context.close();
}

// --- settings, the language picker ---------------------------------------
{
  console.log('settings');
  const { page, context } = await open('/dashboard/settings', { auth: true });
  for (const l of ['English', 'Español', 'Català', 'Français', 'Deutsch', 'Italiano', 'Português']) {
    await box(T, `settings.lang.${l}`, page.getByText(l, { exact: true }));
  }
  await context.close();
}

// --- the public menu, on a phone -----------------------------------------
{
  console.log('public menu (phone)');
  const { page, context } = await open(`/m/${SLUG}`, { phone: true });
  await box(T, 'menu.langSwitch', page.getByRole('button', { name: /english|español/i }).first());
  await box(T, 'menu.assistantLauncher', page.locator('button:has(svg.lucide-message-circle)'));
  await box(T, 'menu.tabStarters', page.getByText('Starters', { exact: true }));
  await box(T, 'menu.title', page.getByText('SaCarta').first());
  await page.locator('button:has(svg.lucide-message-circle)').first().click();
  await wait(1600);
  await box(T, 'assistant.card', page.getByText(/menu assistant/i).locator('xpath=ancestor::div[3]'));
  await box(T, 'assistant.input', page.getByPlaceholder(/type your question/i));
  await box(T, 'assistant.send', page.locator('button:has(svg.lucide-send)'));
  await box(T, 'assistant.close', page.locator('button:has(svg.lucide-x)').first());
  await context.close();
}

await browser.close();

writeFileSync(OUT, JSON.stringify(T, null, 2) + '\n');
console.log(`\n${Object.keys(T).length} targets written to ${OUT}`);
