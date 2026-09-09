#!/usr/bin/env node
/**
 * scroll-cadence-bench — measure whether the app's scrolling is SMOOTH, which
 * is a different property from whether it is FAST.
 *
 * WHY IT IS SEPARATE FROM scripts/speed-bench.mjs. The owner's report on
 * 9 Sep 2026: "the app is running very quickly and data is loading very
 * quickly, the scrolling just feels sluggish ... I'll give you that it's very
 * fast. It just doesn't feel smooth." Latency and frame cadence are two
 * measurements and nothing in this repo measured the second one. A load-time
 * bench answers the half of that sentence that was already fine.
 *
 * WHAT IT MEASURES, and why each instrument is here rather than the obvious one.
 *
 *   · PRESENTED FRAMES, from Chrome's own `PipelineReporter` trace events.
 *     Each carries `state` (PRESENTED / DROPPED / NO_UPDATE_DESIRED) and
 *     `scroll_state`, so this counts frames a person actually saw and the gaps
 *     between them. THE OBVIOUS INSTRUMENT IS WRONG HERE: requestAnimationFrame
 *     deltas measure the MAIN THREAD's cadence, and a composited scroll does not
 *     use the main thread — rAF reported a flat 60fps on every screen and every
 *     control in this run, including ones the compositor treated differently.
 *
 *   · scroll_state — SCROLL_COMPOSITOR_THREAD or SCROLL_MAIN_THREAD, Chrome's
 *     own answer to "is this scroller composited". `--calibrate` proves the
 *     field discriminates before any number off it is believed: a document
 *     scroller must read COMPOSITOR and a scroller behind a non-passive wheel
 *     listener must read MAIN_THREAD. If they ever read the same, the field
 *     stopped meaning this and every conclusion below is void.
 *
 * IT MUST BE A REAL BROWSER. The MCP Browser pane is a hidden tab where rAF
 * never fires and first-paint layout lies — the same reason
 * scripts/verify-virtual-scroll.mjs exists. Headed, not headless: frame cadence
 * without a real display and a real vsync is a confident wrong number.
 *
 * USAGE
 *   node scripts/scroll-cadence-bench.mjs --calibrate
 *   node scripts/scroll-cadence-bench.mjs --screen=knowledge --repeats=5
 *
 * Signs in through the admin test-login door, exactly as scripts/smoke-staging.mjs
 * does; the key comes from the Keychain and is never printed. Playwright is not
 * a repo dependency — install it first, the same caveat scripts/walk-mobile.mjs
 * carries.
 */

import { chromium } from "playwright"
import { testLoginKey, NO_KEY_MESSAGE } from "./lib/test-login-key.mjs"
import { FRONT_DOORS } from "./lib/front-doors.mjs"

const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d }
const has = (n) => process.argv.includes(`--${n}`)

const BASE = process.env.SCROLL_BASE ?? FRONT_DOORS.staging.agency
const EMAIL = process.env.SCROLL_EMAIL ?? "alaap@kwapso.com"
const SCREEN = arg("screen", "knowledge")
const REPEATS = Number(arg("repeats", "5"))

/** The one scroller behind every screen, and the card that clips it. Both are
 *  the kit's own slots (shared/ui/compositions/templates/screen-shell.tsx), so
 *  this reaches them by contract rather than by class name. */
const BODY = '[data-slot="screen-shell-body"]'
const CARD = '[data-slot="screen-shell-content"]'

/** THE CONTROL IS ONE PROPERTY, APPLIED AT RUNTIME. Not a code change: the
 *  shell's layout is architectural and the owner rules on UI. `border-radius:0`
 *  on the card is what flips the scroller onto the compositor — proved by
 *  `--calibrate`'s bisect, where a clip alone and a radius alone both stay
 *  composited and only the two together do not. */
const VARIANTS = {
  baseline: null,
  square: `${CARD}{border-radius:0 !important;}`,
  // THE CANDIDATES, added 9 Sep 2026 when the owner ruled "do this". `square`
  // proves the MECHANISM and is not shippable — the card's radius is the
  // shell's one elevation cue and the corner is client-approved. Calibration
  // already established that a clip alone and a radius alone are both fine, so
  // each of these separates the pair a different way, and the question is which
  // one composites while leaving the card looking exactly as it does now.
  //
  // unclip  — the card keeps its radius and stops clipping; the body's own
  //           `overflow-y-auto` is the clip, and it carries no radius.
  // contain — both stay on the card, and the scroller is given its own paint
  //           containment, on the chance Blink will promote it anyway.
  // maskclip— the card keeps its radius and clips with a mask instead of
  //           `overflow`, which is a different code path in Blink.
  unclip: `${CARD}{overflow:visible !important;}`,
  contain: `${BODY}{contain:paint !important;}`,
  maskclip: `${CARD}{overflow:visible !important;-webkit-mask-image:radial-gradient(#fff,#fff) !important;mask-image:radial-gradient(#fff,#fff) !important;}`,
  // THE SHAPE ACTUALLY PROPOSED FOR THE KIT, measured as itself rather than
  // inferred from `unclip`. Moving the clip off the card leaves the BODY
  // square, and a square body paints the card tone into the card's rounded
  // bottom corners, against a different ground - so the card would READ square
  // at the bottom. Giving the body the bottom radius fixes the picture and
  // re-forms radius-plus-clip on the scroller itself, one level down, which is
  // the very pairing this whole exercise is about. Whether that costs the win
  // back is a question for the trace, not for reasoning.
  unclipRound: `${CARD}{overflow:visible !important;} ${BODY}{border-bottom-left-radius:var(--radius) !important;border-bottom-right-radius:var(--radius) !important;}`,
}

const pctl = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] * 100) / 100 : 0 }

/** Every frame Chrome's compositor began during the trace, with its state. */
function frames(events) {
  const begun = events
    .filter((e) => e.name === "PipelineReporter" && e.ph === "b" && e.args?.frame_reporter)
    .sort((a, b) => a.ts - b.ts)
  const presented = begun.filter((e) => /PRESENTED/.test(e.args.frame_reporter.state))
  const gaps = []
  for (let i = 1; i < presented.length; i++) gaps.push((presented[i].ts - presented[i - 1].ts) / 1000)
  const states = {}
  for (const e of begun) { const k = e.args.frame_reporter.scroll_state; states[k] = (states[k] ?? 0) + 1 }
  return {
    scrollState: Object.entries(states).filter(([k]) => k !== "SCROLL_NONE").map(([k, v]) => `${k}:${v}`).join(" ") || "SCROLL_NONE",
    presented: presented.length,
    p50: pctl(gaps, 50), p95: pctl(gaps, 95), p99: pctl(gaps, 99),
    max: Math.round(Math.max(0, ...gaps) * 10) / 10,
    /** A FRACTION, NOT A MEAN. A mean frame time hides the thing a person
     *  feels: one frame in eight arriving late reads as stutter and barely
     *  moves an average. */
    late: gaps.filter((g) => g > 16.7).length, n: gaps.length,
  }
}

/** Trace one gesture and hand back what the compositor did. */
async function measure(page, cdp, selector) {
  await page.evaluate(`${selector}.scrollTop = 0`)
  await page.waitForTimeout(400)
  const chunks = []
  cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value))
  const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r))
  await cdp.send("Tracing.start", { transferMode: "ReportEvents", traceConfig: { includedCategories: ["cc", "benchmark", "viz"] } })
  await cdp.send("Input.synthesizeScrollGesture", { x: 760, y: 500, xDistance: 0, yDistance: -3000, speed: 1600, gestureSourceType: "mouse" })
  await page.waitForTimeout(300)
  await cdp.send("Tracing.end")
  await done
  /** THE CANARY IS A PRECONDITION, NOT A FOOTNOTE. A gesture that lands on
   *  nothing scrollable produces a beautiful flat 60fps, which is exactly what
   *  a broken measurement looks like. */
  const moved = await page.evaluate(`${selector}.scrollTop`)
  return { moved, valid: moved > 200, ...frames(chunks) }
}

/* ── proving the instrument discriminates, before believing it ──────────── */
async function calibrate(browser) {
  const rows = Array.from({ length: 400 }, (_, i) => `<div class=r>row ${i} — text so the box has something to paint</div>`).join("")
  const base = `body{margin:0;font:14px system-ui}.r{height:40px;padding:8px 16px;border-bottom:1px solid #ddd}`
  const card = (radius, clip) => `<style>${base}
    html,body{height:100%;overflow:hidden}
    #page{height:100dvh;overflow:hidden;padding:12px;background:#eee;display:flex}
    #card{flex:1;min-height:0;display:flex;flex-direction:column;overflow:${clip ? "hidden" : "visible"};border-radius:${radius ? "24px" : "0"};background:#fff}
    #box{flex:1;min-height:0;overflow-y:auto;background:#fff}
   </style><div id=page><div id=card><div id=box>${rows}</div></div></div>`

  const cases = {
    "document scroll — must read COMPOSITOR": [`<style>${base}</style>${rows}`, "document.scrollingElement"],
    "non-passive wheel listener — must read MAIN_THREAD": [`<style>${base}#box{height:100vh;overflow-y:auto}</style><div id=box>${rows}</div><script>box.addEventListener('wheel',()=>{let s=0;for(let i=0;i<2e4;i++)s+=i},{passive:false})</script>`, "document.getElementById('box')"],
    "nested scroller, clip only": [card(false, true), "document.getElementById('box')"],
    "nested scroller, radius only": [card(true, false), "document.getElementById('box')"],
    "nested scroller, radius + clip — the shell's card": [card(true, true), "document.getElementById('box')"],
  }
  for (const [name, [html, sel]] of Object.entries(cases)) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await page.setContent(html)
    await page.waitForTimeout(1000)
    const r = await measure(page, cdp, sel)
    console.log(`${name.padEnd(52)} ${r.valid ? "" : "INVALID "}${r.scrollState.padEnd(28)} p50=${r.p50} p95=${r.p95} late=${r.late}/${r.n}`)
    await ctx.close()
  }
}

/* ── the app ────────────────────────────────────────────────────────────── */
async function sessionCookie() {
  const key = testLoginKey()
  if (!key) { console.error(NO_KEY_MESSAGE); process.exit(1) }
  const minted = await fetch(`${BASE}/api/auth/admin/test-login`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": key },
    body: JSON.stringify({ email: EMAIL }),
  })
  const { code } = await minted.json().catch(() => ({}))
  if (!code) { console.error(`could not mint a code for ${EMAIL} (status ${minted.status})`); process.exit(1) }
  const verified = await fetch(`${BASE}/api/auth/email/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, code }),
  })
  const raw = (verified.headers.get("set-cookie") ?? "").split(";")[0]
  if (!/^(__Host-)?kwapso_session=/.test(raw)) { console.error(`no session cookie (status ${verified.status})`); process.exit(1) }
  const at = raw.indexOf("=")
  return { name: raw.slice(0, at), value: raw.slice(at + 1), domain: new URL(BASE).hostname, path: "/", httpOnly: true, secure: true, sameSite: "Lax" }
}

const browser = await chromium.launch({ headless: false, args: ["--window-size=1600,1000"] })

if (has("calibrate")) {
  await calibrate(browser)
  await browser.close()
} else {
  const cookie = await sessionCookie()
  const active = await fetch(`${BASE}/api/tenancy/active`, { headers: { Cookie: `${cookie.name}=${cookie.value}` } }).then((r) => r.json())
  const url = `${BASE}/t/${active.team.id}/${SCREEN}`
  const pooled = {}
  /** INTERLEAVED, so a machine that warms up or a network that slows drifts
   *  through both arms rather than through whichever ran second. */
  for (let i = 0; i < REPEATS; i++) {
    for (const [variant, css] of Object.entries(VARIANTS)) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 })
      await ctx.addCookies([cookie])
      const page = await ctx.newPage()
      const cdp = await ctx.newCDPSession(page)
      await page.goto(url, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(7000)
      if (css) { await page.addStyleTag({ content: css }); await page.waitForTimeout(600) }
      const r = await measure(page, cdp, `document.querySelector('${BODY}')`)
      ;(pooled[variant] ??= []).push(r)
      console.log(`run ${i + 1} ${variant.padEnd(9)} ${r.valid ? "" : "INVALID "}px=${r.moved} ${r.scrollState.padEnd(28)} p50=${r.p50} p95=${r.p95} p99=${r.p99} max=${r.max} late=${r.late}/${r.n}`)
      await ctx.close()
    }
  }
  for (const [variant, rs] of Object.entries(pooled)) {
    const good = rs.filter((r) => r.valid)
    if (good.length === 0) { console.log(`POOLED ${variant}: NOTHING SCROLLED in any run — no number to report`); continue }
    const late = good.reduce((a, r) => a + r.late, 0)
    const n = good.reduce((a, r) => a + r.n, 0)
    console.log(`POOLED ${variant.padEnd(9)} ${good.length} runs · late ${late}/${n} = ${Math.round((late / n) * 1000) / 10}% · median p95 ${pctl(good.map((r) => r.p95), 50)}ms`)
  }
  await browser.close()
}
