// Bakes the static stage layers into PNGs.
//
// The dark stage is a stack of five full frame paints: two radial glows, a grid,
// a grain tile and a vignette. None of them animate, but a software rasterizer
// repaints all five on every one of the 4950 frames, and at 1920x1080 that was
// the single largest cost in the render (about 0.87 s per frame). Baked to one
// image blit per layer it drops to roughly a third of that.
//
// The layers stay authored here as the same CSS the components used, so the look
// is unchanged and the source of truth is still readable.
//
//   node scripts/bake-backdrops.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'public', 'bg');
mkdirSync(out, { recursive: true });

const C = {
  ink: '#181310',
  terracotta: '#E26436',
  amber: '#ECB613',
};

const glow = (color, size, x, y) => `
  <div style="position:absolute;left:${x};top:${y};width:${size}px;height:${size}px;
              transform:translate(-50%,-50%);border-radius:50%;
              background:radial-gradient(circle, ${color}33 0%, ${color}14 38%, transparent 62%)"></div>`;

const GRID = `
  <div style="position:absolute;inset:0;
    background-image:linear-gradient(to right, rgba(128,128,128,0.07) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(128,128,128,0.07) 1px, transparent 1px);
    background-size:48px 48px"></div>`;

const GRAIN = `
  <div style="position:absolute;inset:0;opacity:0.045;
    background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')"></div>`;

const backdrops = {
  // The default product stage: terracotta key light, terracotta fill.
  stage: `${glow(C.terracotta, 1300, '50%', '44%')}${glow(C.terracotta, 820, '80%', '78%')}${GRID}${GRAIN}`,
  // The warm variant, used where the shot needs to feel like a dining room.
  'stage-warm': `${glow(C.terracotta, 1300, '50%', '44%')}${glow(C.amber, 820, '80%', '78%')}${GRID}${GRAIN}`,
  // The brand and close scenes, lit from the centre with an amber kicker.
  'stage-brand': `${glow(C.terracotta, 1300, '50%', '44%')}${glow(C.amber, 800, '76%', '74%')}${GRID}${GRAIN}`,
  // The dining room the guest scenes sit in: out of focus warm lights, no grid.
  // Nine blurred layers, which is why it is baked rather than composed live.
  'stage-dining': [
    [220, 180, 340, C.amber, 0.16],
    [1560, 300, 300, C.terracotta, 0.14],
    [980, 120, 260, '#c9a227', 0.11],
    [420, 880, 380, C.terracotta, 0.13],
    [1720, 860, 320, C.amber, 0.12],
    [1200, 940, 240, '#c9a227', 0.10],
    [120, 560, 260, C.terracotta, 0.09],
    [1850, 540, 220, C.amber, 0.10],
    [760, 640, 300, C.terracotta, 0.07],
  ]
    .map(
      ([x, y, size, color, o]) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;
        transform:translate(-50%,-50%);border-radius:50%;background:${color};opacity:${o};filter:blur(46px)"></div>`,
    )
    .join('') + GRAIN,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

for (const [name, html] of Object.entries(backdrops)) {
  await page.setContent(
    `<body style="margin:0;width:1920px;height:1080px;background:${name === 'stage-dining' ? '#0d0a08' : C.ink};position:relative;overflow:hidden">${html}</body>`,
  );
  await page.screenshot({ path: join(out, `${name}.png`), type: 'png' });
  console.log(`baked ${name}.png`);
}

// The vignette rides on top of the content, so it is baked with alpha.
for (const [name, strength] of [
  ['vignette', 0.5],
  ['vignette-strong', 0.6],
  ['vignette-deep', 0.7],
]) {
  await page.setContent(
    `<body style="margin:0;width:1920px;height:1080px;position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse 75% 65% at 50% 48%, transparent 40%, rgba(9,7,6,${strength}) 100%)"></div>
    </body>`,
  );
  await page.screenshot({ path: join(out, `${name}.png`), type: 'png', omitBackground: true });
  console.log(`baked ${name}.png`);
}

await browser.close();
console.log('\nBackdrops in', out);
