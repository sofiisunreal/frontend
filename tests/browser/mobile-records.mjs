// After npm run build, run node --test tests/browser/mobile-records.mjs
// with the project's local Chrome QA helper installed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import test from 'node:test';
import { Browser, sleep } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const root = resolve(process.env.BUDGETLY_TEST_BUILD || 'dist');
const baseline = process.env.BUDGETLY_MEASURE_BASELINE === '1';
const widths = [320, 360, 390, 430, 768, 1440];
const themes = ['light', 'dark'];
const profile = { id: 900001, username: 'local-fixture', first_name: 'Amina' };
const longName = 'Household essentials and transport – ' + 'CustomCategory'.repeat(4);
const categories = [
  { id: 1, name: 'Groceries', category_type: 'expense', user: profile.id },
  { id: 2, name: longName, category_type: 'expense', user: profile.id },
  { id: 3, name: 'Salary', category_type: 'income', user: null },
];
const budgets = [
  { id: 1, category: 1, period_type: 'monthly', start_date: '2026-11-01', end_date: '2026-11-30', amount: '35000.00', spent_amount: '12345.67', remaining_amount: '22654.33', percentage_used: 35 },
  { id: 2, category: 2, period_type: 'custom', start_date: '2026-11-01', end_date: '2026-12-15', amount: '9999999999.99', spent_amount: '10000000000.00', remaining_amount: '-0.01', percentage_used: 100 },
];
const types = { '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.html': 'text/html' };
const states = new Map();
const measures = {};
let browser, server, origin;

function fixture(mode) {
  return { categories: mode === 'empty-categories' ? [] : structuredClone(categories), budgets: mode === 'empty-budgets' ? [] : structuredClone(budgets), requests: [], release: mode !== 'loading' };
}

const bootstrap = `<script>
const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme');
localStorage.setItem('budgetly.theme', params.get('theme'));
sessionStorage.setItem('budgetly.access', 'local-fixture');
sessionStorage.setItem('budgetly.refresh', 'local-fixture');
const localFetch = window.fetch.bind(window);
window.fetch = (input, options) => {
  const url = new URL(input, location.href);
  if (url.pathname.startsWith('/api/')) return localFetch('/fixture' + url.pathname + '?id=' + params.get('id'), options);
  if (url.origin !== location.origin) return Promise.reject(new Error('External fetch blocked'));
  return localFetch(input, options);
};
</script>`;

test.before(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname.startsWith('/fixture/api/')) {
      const state = states.get(url.searchParams.get('id'));
      const path = url.pathname.slice('/fixture'.length);
      if (!state) return json(404, {});
      if (path === '/api/auth/profile/') return json(200, profile);
      if (path === '/api/billing/access/') return json(200, { has_lifetime_access: true, entitlement_status: 'active', purchase_required: false });
      if (path === '/api/auth/legal-documents/') return json(503, { code: 'legal_documents_unavailable' });
      if (path === '/api/auth/legal-status/') return json(200, { documents_available: false, acceptance_required: false });
      const match = path.match(/^\/api\/(categories|budgets)\/(?:([0-9]+)\/)?$/);
      if (!match) return json(req.method === 'GET' ? 200 : 405, []);
      const [, key, id] = match;
      const records = state[key];
      if (req.method === 'GET') {
        while (!state.release && !res.destroyed) await sleep(20);
        if (!res.destroyed) json(200, records);
        return;
      }
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : null;
      state.requests.push({ method: req.method, path, body });
      const index = records.findIndex(record => String(record.id) === id);
      if (req.method === 'POST') {
        const record = { id: 99, user: profile.id, ...body };
        records.push(record);
        return json(201, record);
      }
      if (index < 0) return json(404, {});
      if (req.method === 'PATCH') return json(200, Object.assign(records[index], body));
      if (req.method === 'DELETE') {
        records.splice(index, 1);
        res.writeHead(204).end();
        return;
      }
      return json(405, {});
    }
    try {
      const file = url.pathname.startsWith('/assets/') ? resolve(root, '.' + url.pathname) : resolve(root, 'index.html');
      if (!file.startsWith(root + sep)) return json(404, {});
      let body = await readFile(file);
      if (extname(file) === '.html') body = body.toString().replace('<head>', '<head>' + bootstrap);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Security-Policy': "connect-src 'self'; font-src 'self'; img-src 'self' data:;" });
      res.end(body);
    } catch { json(404, {}); }
  });
  await new Promise((listen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', listen);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await Browser.launch();
});

test.after(async () => {
  await browser?.close();
  if (server?.listening) await new Promise(close => server.close(close));
  if (process.env.BUDGETLY_RECORD_MEASURES) await writeFile(process.env.BUDGETLY_RECORD_MEASURES, JSON.stringify(measures, null, 2));
});

async function waitFor(page, selector) {
  for (let deadline = Date.now() + 8000; Date.now() < deadline;) {
    if (await page.eval(sel => Boolean(document.querySelector(sel)), selector)) return;
    await sleep(40);
  }
  assert.fail(`Missing ${selector}`);
}

async function click(page, selector, label) {
  for (let deadline = Date.now() + 8000; Date.now() < deadline;) {
    const clicked = await page.eval(({ selector, label }) => {
      const button = [...document.querySelectorAll(selector)].find(item =>
        !item.disabled && (item.querySelector('.orbit-button-rest') || item).textContent.trim() === label);
      if (!button) return false;
      button.click();
      return true;
    }, { selector, label });
    if (clicked) return;
    await sleep(40);
  }
  assert.fail(`Missing button: ${label}`);
}

async function fill(page, name, value) {
  await page.eval(({ name, value }) => {
    const input = document.querySelector(`[role="dialog"] input[name="${name}"]`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, { name, value });
}

async function select(page, name, value) {
  await page.eval(({ name, value }) => {
    const field = document.querySelector(`[role="dialog"] select[name="${name}"]`);
    field.value = value;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }, { name, value });
}

async function visit(path, width, theme, mode = 'populated') {
  const id = crypto.randomUUID();
  const state = fixture(mode);
  states.set(id, state);
  const page = await browser.newPage({ width, height: 1000, mobile: width <= 800, reducedMotion: true });
  await page.goto(`${origin}${path}?id=${id}&theme=${theme}`, { settleMs: 100 });
  return { page, state };
}

function measure(page) {
  return page.eval(() => {
    function box(element) {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    }
    return {
      width: innerWidth,
      theme: document.documentElement.dataset.theme,
      overflow: document.documentElement.scrollWidth - innerWidth,
      tableDisplay: getComputedStyle(document.querySelector('.data-table')).display,
      tableOverflow: document.querySelector('.table-wrap').scrollWidth - document.querySelector('.table-wrap').clientWidth,
      rows: [...document.querySelectorAll('.data-table tbody tr')].map(row => ({
        ...box(row),
        actionWidth: box(row.querySelector('.row-actions')).width,
        cellPadding: getComputedStyle(row.cells[0]).paddingBlockStart,
        buttons: [...row.querySelectorAll('button')].map(box),
        amountLines: [...row.querySelectorAll('.record-col-amount, .record-col-spent_amount strong, .record-col-remaining_amount')].map(cell => {
          const text = [...cell.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          if (!text) return 0;
          const range = document.createRange();
          range.selectNodeContents(text);
          return range.getClientRects().length;
        }),
        text: row.innerText,
      })),
    };
  });
}

for (const path of ['/categories', '/budgets']) {
  test(`${path} fits the viewport and keeps both actions inside populated cards across widths and themes`, async () => {
    for (const width of widths) for (const theme of themes) {
      const { page } = await visit(path, width, theme);
      try {
        await waitFor(page, '.data-table .record-actions button');
        await page.eval(async () => { await document.fonts.ready; });
        const result = await measure(page);
        measures[`${path}:${width}:${theme}`] = result;
        if (process.env.BUDGETLY_RECORD_MEASURES && width === 390 && theme === 'dark') {
          await page.screenshot({ path: `.taste-skill/mobile-records/${path.slice(1)}-${baseline ? 'before' : 'after'}.png`, format: 'png' });
        }
        if (baseline) continue;
        assert.equal(result.width, width);
        assert.equal(result.theme, theme);
        assert.equal(result.overflow, 0);
        if (width > 800) {
          assert.equal(result.tableDisplay, 'table');
          continue;
        }
        assert.equal(result.tableOverflow, 0);
        const ordinary = result.rows[0];
        assert(ordinary.height <= (path === '/categories' ? 165 : 260), `${width}px: ${ordinary.height}px tall`);
        for (const row of result.rows) for (const button of row.buttons) {
          assert(button.width >= 44 && button.height >= 44, `${width}px: touch target too small`);
          assert(button.left >= row.left && button.right <= row.right && button.top >= row.top && button.bottom <= row.bottom);
          assert(button.left >= 0 && button.right <= width);
        }
        assert.equal(ordinary.buttons.length, 2);
        if (path === '/categories') {
          assert.match(ordinary.text, /Groceries[\s\S]*Expense[\s\S]*Personal/);
          assert.match(result.rows[2].text, /Salary[\s\S]*Income[\s\S]*Default/);
          assert.equal(result.rows[2].buttons.length, 0);
        } else {
          assert.match(ordinary.text, /Groceries[\s\S]*Monthly[\s\S]*35,000\.00[\s\S]*12,345\.67[\s\S]*22,654\.33/);
          assert.match(result.rows[1].text, /-0\.01/);
          assert.deepEqual(result.rows[1].amountLines, [1, 1, 1], `${width}px: budget amounts should stay readable`);
        }
      } finally { await page.close(); }
    }
  });
}

if (!baseline) {
  for (const [path, singular, emptyMode] of [['/categories', 'category', 'empty-categories'], ['/budgets', 'budget', 'empty-budgets']]) {
    test(`${path} keeps loading and empty states usable at 320px and 768px`, async () => {
      for (const [width, theme] of [[320, 'dark'], [768, 'light']]) {
        const loading = await visit(path, width, theme, 'loading');
        try {
          await waitFor(loading.page, '.orbit-resource-loading .data-table tbody tr');
          const result = await measure(loading.page);
          assert.equal(result.width, width);
          assert.equal(result.overflow, 0);
          assert.equal(result.tableOverflow, 0);
          assert(result.rows.every(row => row.height < 210 && row.buttons.length === 0));
          loading.state.release = true;
          await waitFor(loading.page, '.record-actions button');
        } finally { await loading.page.close(); }

        const empty = await visit(path, width, theme, emptyMode);
        try {
          await waitFor(empty.page, '.empty-state button');
          assert.equal(await empty.page.eval(() => document.documentElement.scrollWidth - innerWidth), 0);
          assert.equal(await empty.page.eval(() => Boolean(document.querySelector('.data-table'))), false);
          await click(empty.page, '.empty-state button', `Add ${singular}`);
          await waitFor(empty.page, '[role="dialog"]');
        } finally { await empty.page.close(); }
      }
    });

    test(`${path} supports create, edit, cancel and confirmed delete using the existing dialogs`, async () => {
      const { page, state } = await visit(path, 320, 'light');
      const field = singular === 'category' ? 'name' : 'amount';
      const createdValue = singular === 'category' ? 'Fixture category' : '2500';
      const editedValue = singular === 'category' ? 'Groceries updated' : '36000';
      try {
        await waitFor(page, '.record-actions button');
        await click(page, '.resource-primary-actions button', `New ${singular}`);
        await waitFor(page, '[role="dialog"]');
        if (singular === 'budget') await select(page, 'category', '1');
        else await select(page, 'category_type', 'expense');
        await fill(page, field, createdValue);
        await click(page, '[role="dialog"] button[type="submit"]', `New ${singular}`);
        await waitFor(page, '.inline-notice');
        await waitFor(page, '.record-actions button');
        assert.equal(state.requests[0]?.method, 'POST');
        assert.equal(state.requests[0]?.path, `/api${path}/`);
        assert.equal(state.requests[0]?.body[field], createdValue);

        await click(page, '.data-table tbody tr:first-child .record-actions button', 'Edit');
        await waitFor(page, '[role="dialog"]');
        await fill(page, field, editedValue);
        await click(page, '[role="dialog"] button[type="submit"]', 'Save changes');
        await waitFor(page, '.inline-notice');
        await waitFor(page, '.record-actions button');
        assert.equal(state.requests[1]?.method, 'PATCH');
        assert.equal(state.requests[1]?.path, `/api${path}/1/`);
        assert.equal(state.requests[1]?.body[field], editedValue);

        await click(page, '.data-table tbody tr:first-child .record-actions button', 'Delete');
        await waitFor(page, '[role="dialog"]');
        assert.match(await page.eval(() => document.querySelector('[role="dialog"] h2').textContent), /Delete this record/);
        assert.equal(state.requests.length, 2);
        await click(page, '[role="dialog"] button', 'Keep record');
        assert.equal(state.requests.length, 2);
        await click(page, '.data-table tbody tr:first-child .record-actions button', 'Delete');
        await click(page, '[role="dialog"] button', 'Delete record');
        await waitFor(page, '.inline-notice');
        assert.deepEqual(state.requests[2], { method: 'DELETE', path: `/api${path}/1/`, body: null });
      } finally { await page.close(); }
    });
  }
}
