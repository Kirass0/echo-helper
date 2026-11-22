// Screenshots of the app and of the design prototype (variant D) in matching screen states and both themes, for the
// spec review of a UI change (docs/agents/ui-review.md). Run with `npm run compare:prototype`; not part of CI.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';
import { build, preview } from 'vite';
import type { SubstatType } from '../src/core/gameData.ts';
import { isPercentType, SUBSTAT_NAMES } from '../src/evaluation/substats.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PROTOTYPE = pathToFileURL(
  join(ROOT, '.scratch/web-rewrite/prototypes/11-visual-direction/index.html'),
).href;
const OUT = process.argv[2] ?? join(tmpdir(), 'echo-helper-prototype-compare');
// Desktop width: the main column's full width.
const WIDTH = 1220;
const THEMES = ['dark', 'light'] as const;
type Theme = (typeof THEMES)[number];

/** The prototype's sample data, read from its page so both sides always show the same Echo, tables and targets. */
interface Sample {
  echo: Record<'two' | 'full', { type: SubstatType; value: number }[]>;
  rows: { name: string; target: string; erTarget: string }[];
  custom: { name: string; weights: Record<SubstatType, number> }[];
}

type AppScreen = 'evaluation' | 'strategy' | 'about';

interface Pair {
  name: string;
  /** Query and hash after the prototype's file URL. */
  prototype: string;
  screen: AppScreen;
  /** Brings a fresh app page (dark or light already set) to the state; absent while the script can't set it up. */
  app?: (page: Page, sample: Sample) => Promise<void>;
}

const PAIRS: Pair[] = [
  {
    name: 'evaluation-first-open',
    prototype: '?echo=empty',
    screen: 'evaluation',
    app: async () => {},
  },
  {
    name: 'evaluation-2-of-5',
    prototype: '?echo=two',
    screen: 'evaluation',
    app: async (page, sample) => {
      await enterEcho(page, sample.echo.two);
      await listTables(page, sample);
    },
  },
  {
    name: 'evaluation-picking',
    prototype: '?echo=picking',
    screen: 'evaluation',
    app: async (page, sample) => {
      await enterEcho(page, sample.echo.two);
      await listTables(page, sample);
      // The prototype picks for the slot after the two Substats, at +15.
      await page.getByRole('button', { name: 'Add the Substat revealed at +15' }).click();
    },
  },
  {
    name: 'evaluation-5-of-5',
    prototype: '?echo=full',
    screen: 'evaluation',
    app: async (page, sample) => {
      await enterEcho(page, sample.echo.full);
      await listTables(page, sample);
    },
  },
  ...(
    [
      ['built-in', 'Changli'],
      ['custom', 'Changli (my rotation)'],
    ] as const
  ).map(([kind, name]): Pair => ({
    name: `weights-${kind}`,
    prototype: `?echo=two&dialog=${encodeURIComponent(name)}`,
    screen: 'evaluation',
    app: async (page, sample) => {
      await enterEcho(page, sample.echo.two);
      await listTables(page, sample);
      await page.getByRole('button', { name: `Weights of ${name}`, exact: true }).click();
      await page.getByRole('dialog').waitFor();
    },
  })),
  {
    name: 'strategy-one',
    prototype: '?strat=single#upgrade-strategy',
    screen: 'strategy',
    app: (page) => critFirst(page),
  },
  {
    name: 'strategy-unfinished',
    prototype: '?strat=unfinished#upgrade-strategy',
    screen: 'strategy',
    app: async (page) => {
      await critFirst(page);
      // The prototype's unfinished rule: an Echo Score rule with no Echo Score yet, at 3/5.
      const stage = page.getByRole('region', { name: 'Tune Stage 3/5 (+15)' });
      await stage.getByRole('button', { name: '+ add a rule' }).click();
      await stage.getByRole('combobox', { name: 'Kind of rule' }).selectOption('Echo Score');
    },
  },
  // Comparing comes with ticket 17: add its `app` step then.
  { name: 'strategy-compare', prototype: '?strat=compare#upgrade-strategy', screen: 'strategy' },
  { name: 'about', prototype: '#about', screen: 'about', app: async () => {} },
];

/** The prototype's strategy: "Crit first" for Changli, built rule by rule until the examples come (ticket 16). */
async function critFirst(page: Page) {
  await page.getByRole('combobox', { name: 'Substat Weight Table' }).selectOption('Changli');
  for (const [tuneStage, count] of [
    [2, '1'],
    [4, '2'],
  ] as const) {
    const stage = page.getByRole('region', {
      name: `Tune Stage ${tuneStage}/5 (+${tuneStage * 5})`,
    });
    await stage.getByRole('button', { name: '+ add a rule' }).click();
    await stage.getByRole('combobox', { name: 'How many' }).selectOption(count);
    await stage.getByRole('button', { name: 'pick Substats' }).click();
    const substats = page.getByRole('group', { name: 'Substats' });
    await substats.getByLabel('Crit Rate').check();
    await substats.getByLabel('Crit Damage').check();
    await page.keyboard.press('Escape');
  }
  await page
    .getByRole('region', { name: 'Results' })
    .getByRole('row', { name: /^Echoes started/ })
    .waitFor();
}

async function enterEcho(page: Page, substats: Sample['echo']['two']) {
  for (const [index, { type, value }] of substats.entries()) {
    await page
      .getByRole('button', { name: `Add the Substat revealed at +${(index + 1) * 5}` })
      .click();
    await page.getByRole('button', { name: SUBSTAT_NAMES[type], exact: true }).click();
    await page
      .getByRole('button', { name: isPercentType(type) ? `${value}%` : String(value), exact: true })
      .click();
  }
}

/** Lists the prototype's tables in its order, making its Custom table from the Built-in one it's named after. */
async function listTables(page: Page, sample: Sample) {
  const add = page.getByRole('combobox', { name: 'Add a Weight Table' });
  for (const row of sample.rows) {
    const custom = sample.custom.find((table) => table.name === row.name);
    if (!custom) {
      await add.selectOption(row.name);
      continue;
    }
    // The prototype's Custom table is a Built-in one, already listed, with one weight changed.
    const base = sample.rows.find((other) => custom.name.startsWith(`${other.name} `));
    if (!base) throw new Error(`No listed Built-in table to duplicate for ${custom.name}`);
    await page.getByRole('button', { name: `Weights of ${base.name}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Duplicate' }).click();
    await dialog.getByRole('textbox', { name: 'Name' }).fill(custom.name);
    for (const [type, weight] of Object.entries(custom.weights))
      await dialog
        .getByRole('textbox', { name: SUBSTAT_NAMES[type as SubstatType], exact: true })
        .fill(String(weight));
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
  for (const row of sample.rows) {
    if (row.target)
      await page
        .getByRole('textbox', { name: `Target Score for ${row.name}`, exact: true })
        .fill(row.target);
    if (row.erTarget)
      await page
        .getByRole('textbox', { name: `ER Target Score for ${row.name}`, exact: true })
        .fill(row.erTarget);
  }
  // The prototype focuses the first row.
  await page.getByRole('table').getByRole('row').nth(1).getByRole('cell').nth(3).click();
}

/** Whether the app's tab shows anything besides its purpose line. */
async function appHasScreen(page: Page) {
  return page
    .locator('main')
    .evaluate((main) =>
      [...main.children].some(
        (child) =>
          child instanceof HTMLElement &&
          child.offsetParent !== null &&
          !child.querySelector(':scope > a[href^="#about-"]'),
      ),
    );
}

/** Waits until web fonts are in and the page has stopped changing, so the calculation results are on screen. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  let last = '';
  for (let tries = 0; tries < 50; tries++) {
    const now = await page.evaluate(() => document.body.innerHTML);
    if (now === last) return;
    last = now;
    await page.waitForTimeout(300);
  }
}

/**
 * Saves the whole page from the top. The window is made as tall as the page rather than shot `fullPage`, so a
 * fixed dimmed area behind a dialog covers the whole picture, as it does a window.
 */
async function shoot(page: Page, file: string) {
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: WIDTH, height });
  await settle(page);
  await page.screenshot({ path: file });
}

/** Runs `use` on a page of its own, in a fresh browser context (so empty storage), closed afterwards. */
async function withPage<T>(browser: Browser, theme: Theme, use: (page: Page) => Promise<T>) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: 900 },
    colorScheme: theme,
  });
  try {
    return await use(await context.newPage());
  } finally {
    await context.close();
  }
}

function shootPrototype(browser: Browser, pair: Pair, theme: Theme, file: string) {
  return withPage(browser, theme, async (page) => {
    const [query, hash = ''] = pair.prototype.split('#');
    const params = new URLSearchParams(query);
    params.set('variant', 'D');
    params.set('theme', theme);
    await page.goto(`${PROTOTYPE}?${params}${hash ? `#${hash}` : ''}`, {
      waitUntil: 'networkidle',
    });
    // The prototype's control bar isn't part of the design.
    await page.addStyleTag({ content: '#bar { display: none !important; }' });
    await shoot(page, file);
  });
}

/** Shoots the app in the pair's state; returns why it was skipped instead, if it was. */
function shootApp(
  browser: Browser,
  url: string,
  pair: Pair,
  sample: Sample,
  theme: Theme,
  file: string,
) {
  return withPage(browser, theme, async (page): Promise<string | null> => {
    await page.goto(`${url}#${pair.screen}`);
    if (theme === 'light')
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
    if (!(await appHasScreen(page))) return `the app has no ${pair.screen} screen yet`;
    if (!pair.app)
      return 'the app has the screen, but the script does not set this state up yet: add its `app` step in scripts/comparePrototype.ts';
    await pair.app(page, sample);
    // Tooltips and hover styles from the last click aren't part of the state.
    await page.mouse.move(0, 0);
    await shoot(page, file);
    return null;
  });
}

function readSample(browser: Browser) {
  return withPage(browser, 'dark', async (page) => {
    await page.goto(PROTOTYPE);
    // Top-level `const`s of the prototype's script, reachable by name from the page.
    return (await page.evaluate('({ echo: ECHO, rows: ROWS, custom: CUSTOM })')) as Sample;
  });
}

async function main() {
  console.log('Building the app…');
  await build({ root: ROOT, logLevel: 'warn', configLoader: 'runner' });
  const server = await preview({
    root: ROOT,
    logLevel: 'warn',
    configLoader: 'runner',
    preview: { port: 4183 },
  });
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('vite preview gave no URL');

  // Clears only what an earlier run saved, so a folder passed in keeps its other files.
  await mkdir(OUT, { recursive: true });
  for (const file of await readdir(OUT))
    if (/-(app|prototype)\.png$/.test(file) || file === 'index.md') await rm(join(OUT, file));

  const browser = await chromium.launch();
  const index = [`# App and prototype (variant D), ${WIDTH}px wide`, ''];
  try {
    const sample = await readSample(browser);
    for (const pair of PAIRS)
      for (const theme of THEMES) {
        const name = `${pair.name}-${theme}`;
        const appFile = `${name}-app.png`;
        const prototypeFile = `${name}-prototype.png`;
        const skipReason = await shootApp(browser, url, pair, sample, theme, join(OUT, appFile));
        if (skipReason) {
          index.push(`- ${name}: skipped, ${skipReason}`);
          console.log(`  skipped ${name}: ${skipReason}`);
          continue;
        }
        await shootPrototype(browser, pair, theme, join(OUT, prototypeFile));
        index.push(`- ${name}: ${appFile} | ${prototypeFile}`);
        console.log(`  ${name}`);
      }
  } finally {
    await browser.close();
    await server.close();
  }
  await writeFile(join(OUT, 'index.md'), `${index.join('\n')}\n`);
  console.log(`\nScreenshots and index.md in ${OUT}`);
}

await main();
