/**
 * Smoke test for the Personnel page - the screen that broke in 7.1.25/7.1.26.
 *
 * It drives a real browser against a running dev server and checks the things
 * that failed then: the page rendering at all, the tabs responding, the search
 * returning rows, and the vote window opening promptly. The Prelature view is
 * the case that matters, because it is the only one large enough to be slow.
 *
 * READ ONLY. It opens the vote window but never clicks Vote or Approve, which
 * are the only two writes on that screen. Nothing here modifies the database.
 *
 * Usage:
 *   1. npm run dev                      (in another terminal)
 *   2. cp .playwright-credentials.example.json .playwright-credentials.json
 *      and fill in an account with access level 2.5 or higher
 *   3. npm run smoke                    (add --headed to watch it)
 *
 * Exits non-zero if any step fails, so it can gate a deploy.
 */

import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'

const BASE = process.env.SMOKE_URL || 'http://localhost:5173'
const CREDS_FILE = '.playwright-credentials.json'
const HEADED = process.argv.includes('--headed')

// How long each step may take before we call it a failure. The vote window is
// the tight one on purpose: it took minutes in 7.1.26 and that is the symptom
// this test exists to catch.
const BUDGET = { login: 30000, personnel: 20000, corpSwitch: 25000, tab: 8000, search: 8000, vote: 10000 }

if (!existsSync(CREDS_FILE)) {
  console.error(`Missing ${CREDS_FILE}. Copy .playwright-credentials.example.json and fill it in.`)
  process.exit(1)
}
const { email, password } = JSON.parse(readFileSync(CREDS_FILE, 'utf8'))

const results = []
const consoleErrors = []

async function step(name, budget, fn) {
  const started = Date.now()
  try {
    await fn()
    const ms = Date.now() - started
    const slow = ms > budget
    results.push({ name, ms, ok: !slow, note: slow ? `over budget (${budget}ms)` : '' })
    console.log(`${slow ? 'SLOW' : 'ok  '}  ${name} - ${ms}ms`)
  } catch (err) {
    const ms = Date.now() - started
    results.push({ name, ms, ok: false, note: err.message.split('\n')[0] })
    console.log(`FAIL  ${name} - ${ms}ms - ${err.message.split('\n')[0]}`)
  }
}

const browser = await chromium.launch({ headless: !HEADED })
const page = await browser.newPage()

// A page that throws during render is exactly how the Personnel view died, so
// treat any uncaught error or console error as a failure on its own.
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`)
})

// Vite moves to another port when one is taken, and this machine runs more than
// one Vite app. Testing whatever answers the port is worse than not testing, so
// confirm which app replied before trusting a single result.
await step('confirm the right app', BUDGET.personnel, async () => {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  const title = await page.title()
  if (!/safe environment/i.test(title)) {
    throw new Error(`${BASE} is serving "${title}", not Safe Environment - wrong port`)
  }
})

await step('log in', BUDGET.login, async () => {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('Email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForFunction(() => !location.hash.includes('login'), { timeout: BUDGET.login })
})

await step('open Personnel', BUDGET.personnel, async () => {
  await page.goto(`${BASE}/#/personnel`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Personnel' }).waitFor({ timeout: BUDGET.personnel })
  // The skeleton placeholder must give way to real content.
  await page.getByPlaceholder('Search name').waitFor({ timeout: BUDGET.personnel })
})

// Switching corporation happens in the header, not on this page: the selector
// inside Personnel only renders for Board of the Prelature, which the usual
// admin account is not. The header control writes the chosen corporation to
// Users/{id}.CurrentUsersCorporationsId, so it is a write, not a read - hence
// opt-in. Without the flag the run stays read only and tests whatever
// corporation the account already sits on.
if (process.argv.includes('--switch-corp')) {
  const original = await page.locator('header select, header [role="listbox"]').first().innerText()

  async function selectCorporation(name) {
    await page.getByRole('button', { name: /corporation|prelature|layton/i }).first().click()
    await page.getByRole('option', { name: new RegExp(name, 'i') }).first().click()
    await page.waitForTimeout(1500) // let the snapshot settle
  }

  await step('switch to Layton', BUDGET.corpSwitch, () => selectCorporation('Layton'))
  await step('switch Layton to Prelature', BUDGET.corpSwitch, () => selectCorporation('Prelature'))
  await step('restore original corporation', BUDGET.corpSwitch, () => selectCorporation(original.trim()))
} else {
  console.log('skip  corporation switch (pass --switch-corp; it writes your current corporation)')
}

for (const tab of ['Approved', 'Inactive', 'Requiring Attention', 'Pending Approval']) {
  await step(`tab: ${tab}`, BUDGET.tab, async () => {
    await page.locator('.tab', { hasText: tab }).first().click()
    await page.locator('.tab-active', { hasText: tab }).first().waitFor({ timeout: BUDGET.tab })
  })
}

// Search for a name actually on screen rather than a fixed string: a single
// letter scores badly through Fuse, and any hardcoded name is one deactivation
// away from breaking the test for reasons that have nothing to do with the app.
await step('search by name', BUDGET.search, async () => {
  await page.locator('.tab', { hasText: 'Approved' }).first().click()
  const cards = page.locator('h3')
  await cards.first().waitFor({ timeout: BUDGET.search })
  const name = (await cards.first().innerText()).trim()
  const term = name.split(/\s+/).filter((w) => w.length > 3)[0]
  if (!term) throw new Error(`could not pick a search term from "${name}"`)

  const box = page.getByPlaceholder('Search name')
  await box.fill(term)
  await page.waitForTimeout(800)
  const rows = await page.locator('h3').count()
  if (rows === 0) throw new Error(`search for "${term}" returned no rows`)
  await box.fill('')
})

// Opening this window is read only; Vote and Approve are never clicked.
//
// The icon is inert (pointer-events-none) for anyone without full screening, so
// aim at an enabled one. Approved is the tab most likely to hold one, and this
// is the step that took minutes in 7.1.26 - the reason the test exists.
await step('open vote window', BUDGET.vote, async () => {
  await page.locator('.tab', { hasText: 'Approved' }).first().click()
  await page.locator('h3').first().waitFor({ timeout: BUDGET.vote }).catch(() => {})
  const icon = page.locator('.click-icon.cursor-pointer:has([data-icon="check-to-slot"])').first()
  if ((await icon.count()) === 0) {
    console.log('      (no person with full screening on screen - nothing to open)')
    return
  }
  await icon.click()
  await page.getByText('Safe Environment Committee', { exact: false }).first().waitFor({ timeout: BUDGET.vote })
  await page.keyboard.press('Escape')
})

// View as another person. Safe to automate: the lens swaps documents, never
// ids, and My Status writes nothing on load.
await step('view as another person', BUDGET.vote, async () => {
  // Reload first: the vote window may still be open and would swallow the click.
  // goto() to the same hash is a no-op, so this has to be a real reload.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('Search name').waitFor({ timeout: BUDGET.personnel })
  await page.locator('.tab', { hasText: 'Approved' }).first().click()
  await page.locator('h3').first().waitFor({ timeout: BUDGET.vote }).catch(() => {})
  const eye = page.locator('.click-icon.cursor-pointer:has([data-icon="eye"])').first()
  if ((await eye.count()) === 0) {
    console.log('      (no view-as icon - needs a full admin account)')
    return
  }
  await eye.click()
  await page.getByText('Viewing as', { exact: false }).first().waitFor({ timeout: BUDGET.vote })

  // The banner sits above a layout that already fills the viewport, so a wrong
  // height here shows up as two scrollbars on every screen.
  const overflow = await page.evaluate(() => {
    const d = document.documentElement
    return { v: d.scrollHeight - d.clientHeight, h: d.scrollWidth - d.clientWidth }
  })
  if (overflow.v > 0 || overflow.h > 0) {
    throw new Error(`banner pushes the page out of the viewport (v:${overflow.v}px h:${overflow.h}px)`)
  }

  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByText('Viewing as', { exact: false }).first().waitFor({ state: 'detached', timeout: BUDGET.vote })
})

await browser.close()

console.log('\n--- summary ---')
const failed = results.filter((r) => !r.ok)
for (const r of failed) console.log(`FAILED: ${r.name} (${r.ms}ms) ${r.note}`)
if (consoleErrors.length) {
  console.log(`\n${consoleErrors.length} console/page error(s):`)
  for (const e of [...new Set(consoleErrors)].slice(0, 10)) console.log(`  ${e}`)
}

if (failed.length || consoleErrors.length) {
  console.log('\nSMOKE TEST FAILED - do not deploy.')
  process.exit(1)
}
console.log('\nAll steps passed within budget. No console errors.')
