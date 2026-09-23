"use client"

// THE WORKSPACE TAB SET — the behaviour the client asked for, pinned, twice.
//
// ── THE FIRST ASK, 2026-09-06, verbatim ─────────────────────────────────────
//
//   "regarding the breadcrumbs... wdyt, would it be possible to replicate the
//    tab behaviour of chrome? what i mean: i am in a detail app, but i click
//    the first tab 'apps' see all the apps but the detail where i was stays
//    open / then we'll need a x icon on the tabs to close them / but the idea
//    is that all tabs i open stay open unless i close them / is this possible?"
//
// That built the TAB SET this file still holds: a list of open places that
// persists across navigation, added to by opening something, shortened only
// by closing something.
//
// ── THE SECOND ASK, 17 SEP 2026, verbatim — AND WHY IT IS A DIFFERENT SHAPE ──
//
//   "Unless I do it on purpose to open a new tab, everything happens on the
//    same tab. This means that I would navigate in the app, and this would
//    just keep making the breadcrumbs longer. Unless I press Command and
//    click, this would open a new tab, and the same behavior in Windows, just
//    replicating Google Chrome." — and, in the same conversation: "the
//    breadcrumbs should sit in the background, outside the container, on
//    top, and on the very far left, have a back and forward arrow." — and:
//    "Yes to Chrome navigation, push the trail on a rail pick."
//
// Until this date "opening a tab" and "navigating" were the SAME event: every
// crumb level on a cold address opened its own tab (L12), and clicking deeper
// pushed nothing anywhere because the trail WAS the URL. That is exactly what
// she is now ruling out — ordinary navigation must not mint a new workspace
// tab at all, it must grow the ONE tab she is standing on, the way Chrome's
// own address bar grows a tab's back-history on every link click. Only a
// DELIBERATE gesture (cmd/ctrl-click, middle-click — `in-app-link.tsx`) opens
// a second tab now.
//
// So a tab is no longer "a place" (`{path, label}`). It is a PLACE WITH A
// PAST: an ordered list of steps it has visited, `steps`, and a `cursor`
// saying which one she is looking at right now — Chrome's own model, applied
// per tab instead of per window. `OpenTab` is that record; `TrailStep` is one
// entry in `steps`, and it is the SAME shape `OpenTab` used to be, so a
// caller that only ever dealt in `{path, label}` (the crumb array
// `visitTrail` takes, `nav.ts`'s solo-tab door) does not have to change what
// it hands in.
//
// ── WHAT SURVIVES UNCHANGED FROM THE FIRST DESIGN, AND WHY ───────────────────
//
// 1 · THE URL STILL NAMES ONE PLACE: THE ACTIVE TAB'S CURRENT STEP. See the
//     original argument below (deep links, Back, shared links, the query
//     grammar) — none of it changed; a tab's OWN internal history is new, the
//     address bar's relationship to the tab set is not.
//
// 2 · IT SURVIVES A RELOAD, KEYED BY PERSON AND TEAM, BOUNDED AT EIGHT TABS
//     (`MAX_OPEN_TABS`), AND A BACKGROUND TAB'S IDLE COST IS STILL A HANDFUL
//     OF STRINGS. See `MAX_OPEN_TABS`'s own doc for the eight, and
//     `MAX_TRAIL_STEPS` below for the new second ceiling this design adds —
//     one tab can now hold up to thirty steps of its own, not just one.
//
// 3 · ON A PHONE THERE IS NO TAB SET AT ALL — the caller (`deep-link-
//     screen.tsx`'s `useRoomForTabs`) still decides that, this file still has
//     no opinion about a viewport.
//
// 4 · CLOSING LANDS SOMEWHERE, AND A DEAD RECORD DOES NOT LEAVE A DEAD TAB —
//     `closeTab` still returns where to go.
//
// ── WHAT ACTUALLY CHANGED, AS FOUR MOVING PARTS ──────────────────────────────
//
// A · IDENTITY MOVED FROM THE PATH TO A MINTED `id`. Two tabs may now show
//     the exact same path — cmd-clicking the same link twice is Chrome's own
//     "open it again in a new tab", not "front the one already open" — so a
//     path can no longer BE a tab's identity.  and
//     take an `id` now, never a `path`; the one-tab-per-
//     page canonical-key dedupe (`canonicalKeys`, the map, the "reactivate
//     the existing tab" branch inside the old `visitTrail`) is deleted
//     outright rather than adapted — the client's own ruling names exactly
//     the case it existed to prevent and asks for the opposite of it.
//
// B · `visitTrail` NO LONGER OPENS A TAB PER CRUMB LEVEL. It still takes the
//     same shape it always did (the current address's crumbs, outermost
//     first) because the caller still builds that array from `buildCrumbs`
//     and it costs that caller nothing to keep handing it over whole — but
//     this file now reads only the LAST entry (the page she is actually on)
//     as "the path just navigated to" and pushes ONE step with it onto
//     whichever tab is active. The one exception is the very FIRST call in a
//     freshly opened tab (no active tab yet, or a cold deep link into an
//     empty scope): there `steps` is seeded from the WHOLE incoming trail, so
//     landing cold on a nested address still shows the ancestors above it —
//     the property the original design earned under "EVERY LEVEL IS OPENED,
//     NOT JUST THE DEEPEST" — and Back still walks out through them, now via
//     the cursor instead of via a second tab.
//
// C · A NEW TAB IS NOW A DELIBERATE ACT, `openBeside`, NOT `visitTrail`'s
//     default. `in-app-link.tsx` calls it on cmd/ctrl-click and middle-click;
//     it inserts a fresh, one-step tab immediately after the active one
//     (L12's own insertion rule, unchanged) and fronts it (the client asked
//     for Chrome parity on the GESTURE, not for a background tab a person on
//     this product has no visual model for — see `openBeside`'s own note).
//     `openSoloTab` is the third, narrower door: the Import wizard's own
//     ruling (L11, "fronted, never redirects, never duplicates") still wants
//     to front an already-open tab rather than mint a new one, so it keeps
//     that one dedupe, done by hand, in the one caller that still needs it.
//
// D · BACK, FORWARD AND JUMP ARE NEW MUTATORS, `back`/`forward`/`jumpTo`.
//     Each moves the ACTIVE tab's `cursor` and returns the step's `path` for
//     the caller to navigate to (a real `router`-level move, so the address
//     bar and every screen under it update) — and each sets a one-shot flag
//     this file reads back inside its own next `visitTrail` call, so the
//     navigation THEY caused does not turn around and push a fresh step,
//     which would make Back always look one step forward of wherever you
//     just went.
//
// ── THE THIRD ASK, ALSO 17 SEP 2026 — "PUSH THE TRAIL ON A RAIL PICK" IS
//    ITSELF SUPERSEDED, FOR THE RAIL ONLY ────────────────────────────────────
//
// A rail pick (`app-shell.tsx`'s `goToSection`) no longer goes through
// `visitTrail`'s ordinary push at all — see `railPick`, below, for the rule
// in full and the client's own words. In outline: it activates an already-
// open tab sitting at the clicked module's own root, or opens a fresh one
// beside the active tab, landing AT the module's root rather than wherever
// she left off. Every other click (an ordinary link, a row, a crumb) is
// still governed by decision B above, unchanged.

import { useSyncExternalStore } from "react"

/** ONE STEP IN A TAB'S OWN HISTORY.
 *
 * `path` is the in-app address; `label` is a NAME SNAPSHOT, taken at the
 * moment this step was visited and never refreshed except by revisiting it —
 * the same "a background tab costs two strings and nothing else" argument
 * the very first version of this file made, now true of every step in a
 * tab's trail and not just of the one visible tab-strip word. A record
 * renamed elsewhere shows its old name in this list until it is visited
 * again, which is a stale WORD rather than a stale screen. */
export type TrailStep = { path: string; label: string }

/** ONE OPEN WORKSPACE TAB.
 *
 * `id` is a value nothing outside this file ever constructs — mint one with
 * `makeTabId`, never a path, never anything derived from a path, because the
 * whole point of this field existing is that a path can no longer answer
 * "which tab". `steps` is the tab's own back-history, oldest first;
 * `cursor` is the index of the step she is currently looking at.
 *
 * `path`/`label` ARE A DERIVED MIRROR OF `steps[cursor]`, NEVER A SECOND
 * SOURCE OF TRUTH — every mutator in this file rebuilds them through
 * `materialize` the instant `steps` or `cursor` changes, and `persist` strips
 * them back off before writing to `localStorage` (see its own note) so they
 * can never drift out of step with what is actually stored. They exist
 * because `agent-panel.tsx` (assistant surface, out of this change's scope —
 * "do NOT touch the assistant strip/store") already reads a tab's `.path`/
 * `.label` straight off `useOpenTabs()` to answer "does the record I'm on
 * have a workspace tab", written against the FIRST design's flat shape; this
 * mirror is what lets that file keep working unmodified against the new one,
 * and it costs this file nothing but a habit (call `materialize`, not a bare
 * object literal, at every construction site). */
export type OpenTab = { id: string; steps: TrailStep[]; cursor: number; path: string; label: string }

/** Build (or rebuild) a tab's derived `path`/`label` from its own
 * `steps`/`cursor` — the ONE place that mirror is computed, so it can never
 * be written by hand somewhere and drift. */
function materialize(id: string, steps: TrailStep[], cursor: number): OpenTab {
  const current = steps[cursor] ?? steps[steps.length - 1]
  return { id, steps, cursor, path: current?.path ?? "", label: current?.label ?? "" }
}

/** HOW MANY TABS MAY BE OPEN AT ONCE. Unchanged from the first design — see
 * the long argument this constant used to carry alone; it still holds, word
 * for word: the strip folds at four (`FOLD_AFTER` in the kit), eight is
 * twice that, and EVICT-NEVER-REFUSE is still the rule at the ceiling,
 * enforced by `recency` exactly as before. What changed is WHAT gets evicted
 * — a whole tab, id and all its steps, never a single step. */
export const MAX_OPEN_TABS = 8

/** HOW MANY STEPS ONE TAB MAY HOLD. New in this design, because a tab now
 * has a past to fill up. Chrome's own back-history is for practical purposes
 * unbounded and nobody has ever complained that it is too long — but
 * `localStorage` is not free and a person clicking through forty records in
 * one tab across an afternoon is an ordinary session, not an attack, so this
 * follows the same instinct `MAX_OPEN_TABS` did: bound it generously and
 * evict the OLDEST step, never refuse the newest one. Thirty is comfortably
 * past what a reader holds in their head about one tab's own journey — the
 * strip only ever shows the CURRENT step anyway (see `trail-line.tsx`), so a
 * step past thirty back is one Back would have to be pressed thirty times to
 * reach, at which point "it fell off" and "you would have re-opened it by
 * now" are the same sentence. */
export const MAX_TRAIL_STEPS = 30

/** How long a step's remembered name may be. Unchanged from the first
 * design — see `trim`, below. */
export const MAX_TAB_LABEL_CHARS = 80

/* -------------------------------------------------------------------------- */
/*                                 the store                                  */
/* -------------------------------------------------------------------------- */

/** Canonical key for a path, used ONLY by `openSoloTab` now (L11's own
 * dedupe) — never by `visitTrail` or `openBeside`, which is the whole of
 * what changed in decision (A) above. Unchanged implementation: strips the
 * query string and any trailing slash, because `?tab=` selects a screen's
 * own inner view rather than naming a different tab. */
function canonicalTabKey(path: string): string {
  const pathname = path.split("?")[0]
  return pathname.replace(/\/$/, "") || "/"
}

/** WHOSE TABS, IN WHICH TEAM. Unchanged from the first design — both halves
 * matter for the same two reasons (a path is meaningless outside its team;
 * this is `localStorage` on a shared device). See the original file's own
 * long note, preserved in spirit here rather than repeated at length. */
let scope: string | null = null

/** THE SET, in the order each tab was OPENED — fixed, growth-only, exactly
 * as the first design's `tabs` array was. Each element now carries its own
 * history instead of being one. */
let tabs: OpenTab[] = []

/** WHICH TAB IS ACTIVE, by `id` — the direct successor of the first design's
 * `activePath`. It names a TAB now, not a page, because two tabs can show
 * the same page and only one of them is the one she is looking at. */
let activeId: string | null = null

/** RECENCY, unchanged in spirit from the first design: oldest-activated
 * first, most-recent last, tracked apart from `tabs`'s own (fixed) order,
 * and consulted only by eviction. Keyed by `id` now instead of `path`. */
let recency: string[] = []

/** A SINGLE MINTED ID NEVER COLLIDES WITH ANOTHER, and never needs to be
 * stable across a reload (nothing outside this file persists one on its own
 * behalf) — so a timestamp plus a per-document counter is enough; there is
 * no call for `crypto.randomUUID`'s cross-machine guarantees for a value
 * that lives and dies with one browser tab's `localStorage`. */
let idCounter = 0
function makeTabId(): string {
  idCounter += 1
  return `wt-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

/** Move `id` to the fresh end of `recency` and mark its tab the one being
 * looked at. The direct successor of the first design's `touch`. */
function touch(id: string): void {
  activeId = id
  const at = recency.indexOf(id)
  if (at >= 0) recency.splice(at, 1)
  recency.push(id)
}

/** EVICT DOWN TO THE CEILING, LEAST-RECENTLY-ACTIVATED FIRST — never the tab
 * just opened or activated, because `touch` above always runs before this
 * and puts that tab at `recency`'s own tail. Unchanged rule, now operating
 * on whole tabs by `id`. */
function evict(list: OpenTab[]): OpenTab[] {
  let result = list
  while (result.length > MAX_OPEN_TABS) {
    const victim = recency.find((id) => result.some((t) => t.id === id)) ?? result[0]?.id
    if (victim === undefined) break
    result = result.filter((t) => t.id !== victim)
    const ri = recency.indexOf(victim)
    if (ri >= 0) recency.splice(ri, 1)
  }
  return result
}

/** The snapshot handed to React when nothing is open. A module constant
 * rather than a fresh `[]` — `useSyncExternalStore` compares by identity. */
const NOTHING: OpenTab[] = []

const subscribers = new Set<() => void>()

function announce(): void {
  for (const fn of subscribers) fn()
}

function storageKey(): string | null {
  return scope ? `ss-open-tabs:${scope}` : null
}

/** Truncate a label to something a tab can carry, and never to nothing. */
function trim(label: string): string {
  const clean = label.trim()
  if (!clean) return ""
  return clean.length <= MAX_TAB_LABEL_CHARS ? clean : clean.slice(0, MAX_TAB_LABEL_CHARS - 1) + "…"
}

function isTrailStep(row: unknown): row is TrailStep {
  return (
    !!row &&
    typeof row === "object" &&
    typeof (row as TrailStep).path === "string" &&
    typeof (row as TrailStep).label === "string" &&
    (row as TrailStep).path.startsWith("/")
  )
}

function isOpenTab(row: unknown): row is OpenTab {
  if (!row || typeof row !== "object") return false
  const t = row as OpenTab
  return (
    typeof t.id === "string" &&
    t.id.length > 0 &&
    Array.isArray(t.steps) &&
    t.steps.length > 0 &&
    t.steps.every(isTrailStep) &&
    typeof t.cursor === "number" &&
    t.cursor >= 0 &&
    t.cursor < t.steps.length
  )
}

/** Read defensively: this is a value from the reader's own browser, and a
 * half-written or hand-edited one must leave the app whole rather than throw
 * under the shell — the first design's own posture, kept.
 *
 * MIGRATES THE OLD SHAPE. A `localStorage` value written before 17 Sep 2026
 * is a flat `{path, label}[]` — the first design's own `OpenTab`. Read here,
 * each old tab becomes a ONE-STEP trail with a freshly minted id, cursor 0 —
 * exactly what it always was, just named in the new shape. `needsRewrite`
 * tells the caller (`setWorkspaceScope`) to persist the migrated shape
 * immediately, the same courtesy the first design's own duplicate-collapse
 * paid itself, so a second reload in the same session reads the NEW shape
 * back rather than re-migrating from scratch every time. */
function readPersisted(): { tabs: OpenTab[]; needsRewrite: boolean } {
  const key = storageKey()
  if (!key) return { tabs: NOTHING, needsRewrite: false }
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]")
    if (!Array.isArray(raw) || raw.length === 0) return { tabs: NOTHING, needsRewrite: false }

    if (isOpenTab(raw[0])) {
      // THE CURRENT SHAPE ALREADY. Validate every row defensively — a
      // half-written entry drops out rather than taking the app down — cap
      // steps per tab in case a hand-edited value grew past the ceiling —
      // and MATERIALIZE fresh `path`/`label` rather than trust whatever (if
      // anything) the disk copy carried for that derived mirror.
      const clean = raw
        .filter(isOpenTab)
        .map((t) => {
          const steps = t.steps.slice(-MAX_TRAIL_STEPS)
          const cursor = Math.min(t.cursor, steps.length - 1)
          return materialize(t.id, steps, cursor)
        })
        .slice(-MAX_OPEN_TABS)
      return { tabs: clean.length === 0 ? NOTHING : clean, needsRewrite: clean.length !== raw.length }
    }

    // THE OLD SHAPE (or garbage indistinguishable from it) — migrate.
    const cleanOld = raw.filter(isTrailStep).slice(-MAX_OPEN_TABS)
    if (cleanOld.length === 0) return { tabs: NOTHING, needsRewrite: false }
    const migrated = cleanOld.map((step) => materialize(makeTabId(), [step], 0))
    return { tabs: migrated, needsRewrite: true }
  } catch {
    return { tabs: NOTHING, needsRewrite: false }
  }
}

function persist(): void {
  const key = storageKey()
  if (!key) return
  try {
    if (tabs.length === 0) localStorage.removeItem(key)
    // STRIP THE DERIVED MIRROR BEFORE WRITING. `path`/`label` are recomputed
    // by `materialize` on every read (`readPersisted`) and every mutation —
    // writing them too would just be a second copy for a future read to
    // ignore, and a smaller `localStorage` payload besides.
    else localStorage.setItem(key, JSON.stringify(tabs.map(({ id, steps, cursor }) => ({ id, steps, cursor }))))
  } catch {
    /* private mode / storage blocked — the module variable still carries the
       set for this document, so the feature works and only the reload is
       forgotten. Never a thrown error under the shell for a preference. */
  }
}

/** WHOSE SET THIS DOCUMENT IS HOLDING. Called by the shell once the signed-in
 * person and the active team are both known, and again on a team switch. See
 * the first design's own long note — unchanged reasoning, migration added. */
export function setWorkspaceScope(next: string | null): void {
  if (scope === next) return
  scope = next
  clearSuppression() // a new scope's first navigation is never "the address catching up" from an old one's Back
  if (!next) {
    tabs = NOTHING
    recency = []
    activeId = null
    announce()
    return
  }
  const { tabs: persisted, needsRewrite } = readPersisted()
  tabs = persisted
  recency = tabs.map((t) => t.id)
  activeId = tabs.length > 0 ? (tabs[tabs.length - 1]?.id ?? null) : null
  if (needsRewrite) persist()
  announce()
}

/** ONE-SHOT FLAG: set by `back`/`forward`/`jumpTo` immediately before they
 * cause a navigation, cleared by the very next `visitTrail` call — the
 * mechanism decision (D) describes. Without it, pressing Back would move the
 * cursor left, trigger a real navigation, and `visitTrail` (fired by the
 * screen that navigation lands on) would push a FRESH step at the new
 * cursor position, silently deleting the "forward" half of the history Back
 * just stepped into — the same shape `nav.ts`'s `skipNextGoGuard` already
 * uses for a different one-shot problem next door.
 *
 * PINNED TO THE PATH IT EXPECTS, NOT A BARE BOOLEAN. `back`/`forward`/
 * `jumpTo` all hand their caller a path to navigate TO; the very next
 * `visitTrail` ought to be reporting exactly that address. If it reports a
 * DIFFERENT one instead — some other navigation raced ahead of the catch-up
 * call this flag was waiting for — treating it as "just the address settling
 * down" would silently swallow a real visit. So `visitTrail` only honours
 * the flag when the incoming leaf matches `suppressedPath`; any other leaf
 * clears it and falls through to ordinary handling, the safer failure. */
let suppressNextPush = false
let suppressedPath: string | null = null

/** Reset both one-shot fields — called wherever this file already resets
 * every other piece of transient state (`forgetOpenTabs`, a scope switch),
 * so a leftover suppression from one session, team or test can never leak
 * into the next one's first navigation. */
function clearSuppression(): void {
  suppressNextPush = false
  suppressedPath = null
}

/** SHE IS HERE NOW — the one mutator for ORDINARY navigation and a rail
 * pick, called on every address change. See decision (B) above for what
 * changed and why; `trail` is still the current address as crumbs,
 * outermost first, exactly as `buildCrumbs` has always produced it. */
export function visitTrail(trail: TrailStep[]): void {
  // NO SCOPE, NO SET — the boot, or a viewport with no room for tabs. See the
  // first design's own note: "off" has to mean nothing was recorded.
  if (!scope || trail.length === 0) return
  const leaf = trail[trail.length - 1]
  if (!leaf) return
  const label = trim(leaf.label) || leaf.label
  const active = tabs.find((t) => t.id === activeId)

  if (suppressNextPush && leaf.path === suppressedPath) {
    clearSuppression()
    // Back/Forward/Jump already moved the cursor; this call is the address
    // catching up, not a new visit. The only thing worth doing is correcting
    // the CURRENT step's label if a by-id name arrived late (the same
    // courtesy the first design paid an ancestor's crumb) — never touching
    // the cursor or the step list.
    if (active) {
      const current = active.steps[active.cursor]
      if (current && current.path === leaf.path && label && label !== current.label) {
        const nextSteps = active.steps.map((s, i) => (i === active.cursor ? { ...s, label } : s))
        tabs = tabs.map((t) => (t.id !== active.id ? t : materialize(t.id, nextSteps, t.cursor)))
        persist()
        announce()
      }
    }
    return
  }
  // A DIFFERENT ADDRESS ARRIVED WHILE A SUPPRESSION WAS ARMED — some other
  // navigation raced ahead of the catch-up call Back/Forward/Jump was
  // expecting. Clear the stale flag rather than eating THIS visit too; see
  // `suppressedPath`'s own doc for why a bare boolean would be wrong here.
  if (suppressNextPush) clearSuppression()

  if (!active) {
    // THE FIRST TAB IN A FRESH SCOPE, OR A COLD DEEP LINK. Seed the whole
    // trail as this tab's own history, so landing cold on a nested address
    // still shows the ancestors above it — decision (B)'s one exception.
    const steps = trail
      .map((s) => ({ path: s.path, label: trim(s.label) || s.label }))
      .slice(-MAX_TRAIL_STEPS)
    const tab = materialize(makeTabId(), steps, steps.length - 1)
    let next = [...tabs, tab]
    touch(tab.id)
    next = evict(next)
    tabs = next
    persist()
    announce()
    return
  }

  const current = active.steps[active.cursor]
  if (current && current.path === leaf.path) {
    // A QUERY-ONLY REFRESH OR A REDUNDANT RE-RENDER — the leaf is already
    // where this tab's cursor sits. Never grows history for free; only
    // corrects a label that arrived late.
    if (label && label !== current.label) {
      const nextSteps = active.steps.map((s, i) => (i === active.cursor ? { ...s, label } : s))
      tabs = tabs.map((t) => (t.id !== active.id ? t : materialize(t.id, nextSteps, t.cursor)))
      touch(active.id)
      persist()
      announce()
    }
    return
  }

  // A GENUINE NEW ADDRESS. Drop every step past the cursor first — a browser
  // overwrites its own redo history the instant you follow a fresh link —
  // then push, then cap at MAX_TRAIL_STEPS, oldest dropped.
  tabs = tabs.map((t) => {
    if (t.id !== active.id) return t
    const kept = t.steps.slice(0, t.cursor + 1)
    const nextSteps = [...kept, { path: leaf.path, label }].slice(-MAX_TRAIL_STEPS)
    return materialize(t.id, nextSteps, nextSteps.length - 1)
  })
  touch(active.id)
  persist()
  announce()
}

/** OPEN `path` AS ITS OWN NEW TAB, IMMEDIATELY BESIDE THE ONE SHE IS ON — the
 * client's ruling, 17 Sep 2026: a modified click (`in-app-link.tsx`) is the
 * ONLY door left to a second tab now that ordinary navigation pushes onto
 * the active one (decision B). Keeps L12's own insertion rule (after the
 * active tab's position, never at the far right) and its eviction
 * (`MAX_OPEN_TABS`, least-recently-activated goes) unchanged; unlike the
 * retired `visitTrail` dedupe, this NEVER fronts an existing tab with the
 * same path — cmd-clicking one link twice opens two tabs in Chrome, and
 * matching that is the entire point of the gesture (decision A).
 *
 * IT FRONTS THE NEW TAB RATHER THAN LEAVING IT IN THE BACKGROUND. Chrome's
 * own default for a plain cmd/ctrl-click is a background tab; this app has
 * no chrome-level "tab bar you glance at without switching to it" the way a
 * browser window does, and every other door this app already opens a tab
 * through (`nav.ts`'s `openSoloTab`, the original `visitTrail`) fronts what
 * it opens — a background tab here would be a tab a person cannot see they
 * have without reading the strip, on a product where the strip is not the
 * thing they are looking at when they click. Flagged rather than silently
 * decided: a background-open variant is a small, isolated change (skip the
 * `touch`/`activeId` lines below) if that reading turns out wrong. */
export function openBeside(path: string, label: string): void {
  if (!scope) return
  const tab = materialize(makeTabId(), [{ path, label: trim(label) || label }], 0)
  const activeIndex = tabs.findIndex((t) => t.id === activeId)
  const insertAt = activeIndex >= 0 ? activeIndex + 1 : tabs.length
  let next = [...tabs.slice(0, insertAt), tab, ...tabs.slice(insertAt)]
  touch(tab.id)
  next = evict(next)
  tabs = next
  persist()
  announce()
}

/** A RAIL PICK — clicking a module's own entry in the navigation rail
 * (`app-shell.tsx`'s `goToSection`). REPLACES "push the trail on a rail
 * pick" (this file's own SECOND-ASK note, above, and rulebook L12) as of a
 * THIRD ruling, 17 Sep 2026, verbatim:
 *
 *   "when I click on something on the navigation bar, it should always open
 *    in a new tab unless it's already open on the main screen. What I mean
 *    is, for example, if I go in the navigation bar to Tickets and then I go
 *    inside the ticket, if I click on Tickets again in the navigation bar,
 *    it should open the Tickets screen in a new tab. If I already have the
 *    main ticket screens open, do not open any tab, but open this tab. If,
 *    for example, I am in an app and I click on Tickets, it should open in a
 *    new tab."
 *
 * So a rail pick is neither `visitTrail`'s push nor an unconditional
 * `openBeside` — it asks ONE question first: is some open tab's CURRENT
 * step already this module's own root (`path`, canonicalised exactly as
 * `openSoloTab` canonicalises it — the query string selects a screen's own
 * inner view, never a different tab)? A tab whose current step is DEEPER
 * inside the module (a record, not the collection) does NOT count — the
 * client's own example is exactly that case, and her answer for it is "a
 * new tab", not "front the one I am standing in".
 *
 *   · FOUND — activate it, the identical door the strip's own tab click uses
 *     (`activateTab`): fronts the tab and arms the one-shot suppression, so
 *     the navigation this causes lands as the address catching up rather
 *     than a step pushed onto whichever tab was active a moment before.
 *   · NOT FOUND — `openBeside`, unconditionally, AT THE MODULE'S ROOT PATH —
 *     never a recalled deeper screen. This is the one place this file
 *     deliberately stops asking `nav-memory.ts`'s `sectionClick` where she
 *     was: the client's own words are "open the Tickets screen", the
 *     collection root, not wherever she left off. Lands immediately right
 *     of the active tab, fronted, exactly as every other door into
 *     `openBeside` already does.
 *
 * Returns the address the caller should navigate to — the same contract
 * `activateTab`/`back`/`forward`/`jumpTo` keep. `goToSection` hands it
 * straight to `navigate`; every rail call site (the desktop rail, the phone
 * bar, its "All sections" sheet) keeps calling `goToSection` unmodified —
 * only what that one door does changed. */
export function railPick(path: string, label: string): string {
  if (!scope) return path
  const rootKey = canonicalTabKey(path)
  const existing = tabs.find((t) => canonicalTabKey(t.steps[t.cursor]?.path ?? "") === rootKey)
  if (existing) return activateTab(existing.id) ?? path
  openBeside(path, label)
  return path
}

/** MOVE AN ALREADY-OPEN TAB TO SIT IMMEDIATELY RIGHT OF THE ACTIVE ONE,
 * WITHOUT TOUCHING RECENCY — the repositioning half of `openNewTab`'s reuse
 * branch, below, split out because `reorderTab` (a person's own drag) and
 * this (the store correcting a stale position on the SAME door that fronts a
 * tab) are different callers wanting the identical splice.
 *
 * WHY THIS EXISTS AT ALL: the client's ruling, 17 Sep 2026, verbatim —
 * "When I open a new tab from an existing tab, every time, it needs to be to
 * the immediate right of the tab that is active" — is unconditional. Before
 * this function existed, `openNewTab`'s reuse branch (`existing`, below)
 * called `touch()` alone: that fronts an already-open unused `/new` tab
 * wherever it happens to sit in `tabs`, which is wherever it landed the ONE
 * time it was minted, not necessarily beside whichever tab is active NOW. A
 * person who opens "+", switches to a third tab, then presses "+" again gets
 * the reused tab back — correctly, "you cannot have two new tabs" still
 * holds — but it surfaced to its LEFT instead of its right, because array
 * position and recency are two different facts this store keeps and only
 * `touch` was being asked to update.
 *
 * `id === activeId` IS A NO-OP: the tab being asked to move already IS the
 * one everything else would be positioned relative to (pressing "+" twice in
 * a row before navigating anywhere else, the ordinary case), and asking
 * "where is `activeId` relative to itself" is not a question with an answer.
 * Never touches `activeId`/`recency` — the caller still owns fronting
 * (`touch`), same division `reorderTab` already keeps from every mutator
 * that also moves the active tab. */
function moveAdjacentToActive(id: string): void {
  if (id === activeId) return
  const from = tabs.findIndex((t) => t.id === id)
  if (from < 0) return
  const without = [...tabs.slice(0, from), ...tabs.slice(from + 1)]
  const activeIndex = without.findIndex((t) => t.id === activeId)
  const insertAt = activeIndex >= 0 ? activeIndex + 1 : without.length
  const moved = tabs[from]
  if (!moved) return
  tabs = [...without.slice(0, insertAt), moved, ...without.slice(insertAt)]
}

/** THE CONTENT STRIP'S OWN NEW-TAB ROUTE — the destination both the strip's
 * pinned "+" and cmd/ctrl-T open, and the ONE spelling of it, so a caller
 * never re-types the string `openNewTab` already knows. */
export const NEW_TAB_PATH = "/new"

/** "+" / CMD-T — OPEN THE NEW-TAB SCREEN, REUSING AN ALREADY-OPEN, UNUSED ONE
 * RATHER THAN OPENING A SECOND. The client's ruling, 17 Sep 2026, verbatim,
 * on the CONTENT strip growing the same pinned "+" the assistant strip
 * already has: *"You cannot have two new tabs."* — the exact rule
 * `agent-conversation-tabs.ts`'s own `openNewAgentTab` already enforces for
 * the assistant's "+" ("if this new one is still unused, just open the
 * already existing one... I want to avoid having 10 new unused sessions"),
 * read onto this store.
 *
 * UNUSED HERE MEANS THE SAME THING IT MEANS THERE, TRANSLATED: a tab whose
 * ENTIRE history is the single step `{path: NEW_TAB_PATH}` — opened, and
 * never navigated anywhere from. A step genuinely visited (a search result
 * opened IN this tab, `back`'d away from and returned to) leaves `steps`
 * longer than one even once the cursor is back at the front, so that tab no
 * longer counts as unused — the assistant's own qualifier ("a typed draft
 * still counts as unused... unless a message was sent") read onto a trail
 * instead of a thread. */
export function openNewTab(label: string): void {
  if (!scope) return
  const existing = tabs.find((t) => t.steps.length === 1 && t.steps[0]?.path === NEW_TAB_PATH)
  if (existing) {
    // REPOSITION BEFORE FRONTING — see `moveAdjacentToActive`'s own doc. Read
    // `activeId` (the tab she is pressing "+" FROM) before this line moves
    // anything, the same "capture, then touch" order `openBeside` already
    // uses for a freshly minted tab.
    moveAdjacentToActive(existing.id)
    touch(existing.id)
    persist()
    announce()
    return
  }
  openBeside(NEW_TAB_PATH, label)
}

/** OPEN `path` AS ITS OWN SOLO TAB — FRONTED, NEVER DUPLICATED. The Import
 * door's own ruling (L11, `nav.ts`'s `openInNewTab`), kept exactly as it
 * was: pressing Import twice must front the wizard already open, never mint
 * a second one. `visitTrail` gave this up for free before 17 Sep 2026 (every
 * path had at most one tab); now that two tabs MAY share a path
 * (`openBeside`), this is the one door that still promises otherwise, so it
 * does the dedupe by hand — checking every open tab's CURRENT step, the
 * direct analogue of the retired canonical-key map. */
export function openSoloTab(path: string, label: string): void {
  if (!scope) return
  const canonical = canonicalTabKey(path)
  const existing = tabs.find((t) => canonicalTabKey(t.steps[t.cursor]?.path ?? "") === canonical)
  if (existing) {
    touch(existing.id)
    persist()
    announce()
    return
  }
  openBeside(path, label)
}

/** SWITCH TO AN ALREADY-OPEN TAB, BY `id` — what clicking a tab ON THE
 * STRIP means, and the reason it is its own function rather than something
 * `visitTrail` infers. The strip's own crumbs are real `<a href>`s to each
 * open tab's current step (R37), so a click on one reaches `app-shell.tsx`'s
 * `onClickCapture` through the identical wire an ordinary in-page link
 * would — the DOM gives no signal that this particular anchor is chrome
 * (the tab bar) rather than content. So the caller looks the clicked
 * crumb's `closeKey` (a tab `id`, in tab-SET mode) up in the trail array it
 * already has and calls this FIRST, before navigating: it activates the
 * tab (`touch`, no push, exactly Chrome's own "switching tabs never
 * rewrites either tab's history") and arms the same suppression
 * `back`/`forward`/`jumpTo` use, so the navigation this causes lands as the
 * address catching up rather than a fresh step pushed onto whichever tab
 * happened to be active a moment before. `null` for an unknown `id` — the
 * caller's own `trail.find(...)` already guards this in practice. */
export function activateTab(id: string): string | null {
  const target = tabs.find((t) => t.id === id)
  if (!target) return null
  touch(id)
  const dest = target.steps[target.cursor]?.path ?? null
  suppressNextPush = true
  suppressedPath = dest
  persist()
  announce()
  return dest
}

function pathOf(id: string | null): string | null {
  if (!id) return null
  const t = tabs.find((x) => x.id === id)
  return t ? (t.steps[t.cursor]?.path ?? null) : null
}

/** STEP BACK ONE, IN THE ACTIVE TAB'S OWN HISTORY. Returns the step's path to
 * navigate to, or `null` at the first step (nothing to go back to — the
 * caller, `trail-line.tsx` via `app-shell.tsx`, disables the control there
 * instead of calling this). Sets `suppressNextPush` — see its own doc. */
export function back(): string | null {
  const active = tabs.find((t) => t.id === activeId)
  if (!active || active.cursor <= 0) return null
  const nextCursor = active.cursor - 1
  const dest = active.steps[nextCursor]?.path ?? null
  tabs = tabs.map((t) => (t.id === active.id ? materialize(t.id, t.steps, nextCursor) : t))
  suppressNextPush = true
  suppressedPath = dest
  persist()
  announce()
  return dest
}

/** STEP FORWARD ONE. The mirror of `back` — see its doc. `null` at the last
 * step. */
export function forward(): string | null {
  const active = tabs.find((t) => t.id === activeId)
  if (!active || active.cursor >= active.steps.length - 1) return null
  const nextCursor = active.cursor + 1
  const dest = active.steps[nextCursor]?.path ?? null
  tabs = tabs.map((t) => (t.id === active.id ? materialize(t.id, t.steps, nextCursor) : t))
  suppressNextPush = true
  suppressedPath = dest
  persist()
  announce()
  return dest
}

/** JUMP THE ACTIVE TAB'S CURSOR DIRECTLY TO `index` — the trail line's own
 * click-any-step affordance, Chrome's long-press-Back menu without the
 * long-press. `null` for an out-of-range index or the step already active
 * (nothing to do, nowhere to navigate). */
export function jumpTo(index: number): string | null {
  const active = tabs.find((t) => t.id === activeId)
  if (!active || index < 0 || index >= active.steps.length || index === active.cursor) return null
  const dest = active.steps[index]?.path ?? null
  tabs = tabs.map((t) => (t.id === active.id ? materialize(t.id, t.steps, index) : t))
  suppressNextPush = true
  suppressedPath = dest
  persist()
  announce()
  return dest
}

/** CLOSE ONE TAB, BY `id`, AND SAY WHERE TO GO.
 *
 * Returns the address the caller should navigate to when the tab that
 * closed was the active one, or `null` when nothing is left. Closing a
 * BACKGROUND tab returns the still-active tab's own current address,
 * UNCHANGED — the first design's own contract, kept, now keyed by `id`
 * rather than inferred from array position. */
export function closeTab(id: string): string | null {
  const at = tabs.findIndex((t) => t.id === id)
  if (at < 0) return pathOf(activeId)
  const wasActive = id === activeId
  const next = [...tabs.slice(0, at), ...tabs.slice(at + 1)]
  tabs = next.length === 0 ? NOTHING : next
  const ri = recency.indexOf(id)
  if (ri >= 0) recency.splice(ri, 1)

  let landingId: string | null
  if (next.length === 0) landingId = null
  else if (wasActive) {
    // The tab that took its place, else the one before it — the neighbour
    // rule every tabbed thing in this app uses, unchanged.
    landingId = (next[at] ?? next[at - 1] ?? next[next.length - 1])?.id ?? null
  } else {
    landingId = activeId
  }
  activeId = landingId
  persist()
  announce()
  return pathOf(landingId)
}

/** CLOSE ONE TAB AND SAY WHERE TO GO — NEVER LEAVING THE STRIP EMPTY.
 *
 * THE CLIENT'S RULING, 23 SEP 2026, verbatim: *"when i close the last folder
 * tab, it shoudl open a new screen (the one with search bar)"* — "the one
 * with search bar" being `NewTabScreen` (`components/shell/new-tab-screen.tsx`,
 * the `Where to?` page), which lives at `NEW_TAB_PATH` and is exactly what
 * the strip's pinned "+" and cmd/ctrl-T already open.
 *
 * WHAT CLOSING THE LAST TAB DID BEFORE, which is not what it looked like.
 * `closeTab` (above) returns `null` once the set is empty, and its one caller
 * fell back to the collection of whatever had just been closed (`/apps` for a
 * tab sitting on `/apps/A1`). That navigation then reached `visitTrail`,
 * which — finding NO active tab — took its own cold-deep-link branch and
 * SEEDED A FRESH TAB for that collection. So the strip never actually went
 * empty and never looked broken: it silently refilled itself with a tab
 * nobody had asked for, and persisted it, so a reload brought it back too.
 * The close read as "closed that tab, opened this other one".
 *
 * A TAB, NOT AN EMPTY STRIP — the deliberate half of this decision, and the
 * two designs are visibly different (one tab on the strip, versus no strip).
 * An empty set is not a state this shell has anywhere: `tabStripState` only
 * reports `showTabSet` when the current address is IN the set, so zero tabs
 * would swap the folder strip for the plain text trail — the phone chrome —
 * rather than show "a new screen"; and `visitTrail` would mint a tab on the
 * very next navigation regardless. So the set keeps exactly one tab, and it
 * is the same `/new` tab "+" mints.
 *
 * GOES THROUGH `openNewTab`, NOT `openBeside`, so this door and the "+"/cmd-T
 * door stay ONE behaviour rather than two that merely agree today: same
 * label, same insertion, same persisted shape. Its reuse branch is moot here
 * (the set is empty, there is no unused tab to find) and harmless.
 *
 * AND THE PERSISTED SET CANNOT RESURRECT WHAT SHE JUST CLOSED: `closeTab`
 * has already cleared the stored key by the time this runs, and `openNewTab`
 * writes the `/new` tab back in the same breath — so the reload reads `/new`,
 * never the closed tab.
 *
 * `newTabLabel` is passed in rather than spelled here for the identical
 * reason `openNewTab` takes one: this file does no translation. Closing a
 * BACKGROUND tab is unchanged and never reaches the fallback — see
 * `closeTab`'s own contract. */
export function closeTabAndLand(id: string, newTabLabel: string): string {
  const landing = closeTab(id)
  if (landing !== null) return landing
  openNewTab(newTabLabel)
  return NEW_TAB_PATH
}

/** MOVE ONE TAB, BY `id`, TO A NEW ARRAY POSITION. Direct successor of the
 * first design's `reorderTab` — identical mechanism, keyed by `id`. Recency
 * is untouched: a drag is her own act of arranging the strip, not a visit. */
export function reorderTab(id: string, toIndex: number): void {
  const from = tabs.findIndex((t) => t.id === id)
  if (from < 0) return
  const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1))
  if (clamped === from) return
  const next = [...tabs]
  const [moved] = next.splice(from, 1)
  if (!moved) return
  next.splice(clamped, 0, moved)
  tabs = next
  persist()
  announce()
}


/** Drop everything, for every scope. Sign-out only — unchanged from the
 * first design. */
export function forgetOpenTabs(): void {
  tabs = NOTHING
  recency = []
  activeId = null
  scope = null
  clearSuppression()
  try {
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("ss-open-tabs:")) doomed.push(key)
    }
    for (const key of doomed) localStorage.removeItem(key)
  } catch {
    /* storage blocked — the module variable is cleared either way. */
  }
  announce()
}

/** The set, for the strip. SSR snapshot is always empty — see the first
 * design's own note; unchanged. */
export function useOpenTabs(): OpenTab[] {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => tabs,
    () => NOTHING
  )
}

/** What the store is holding right now — for tests, and for a punishing-walk
 * proof of the ceiling. */
export function openTabsSnapshot(): OpenTab[] {
  return tabs
}

/** THE ACTIVE TAB'S CURRENT ADDRESS — kept as a PATH, not an id, because
 * `agent-panel.tsx` reads this to ask "does the record I am on have a
 * workspace tab" and it has always compared against a path; changing this
 * hook's return shape would ripple into the assistant panel, which this
 * change does not own. SSR snapshot is `null`, matching `useOpenTabs`. */
export function useActiveTabPath(): string | null {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => pathOf(activeId),
    () => null
  )
}

/** What the store believes is the active tab's current path, right now —
 * the direct counterpart to `openTabsSnapshot`, for tests. */
export function activeTabPathSnapshot(): string | null {
  return pathOf(activeId)
}

/** THE ACTIVE TAB'S `id` — the new fact `useActiveTabPath` cannot carry
 * (a path is no longer unique enough to close, reorder or "close all" by).
 * `deep-link-screen.tsx`'s own tab-strip wiring reads this to build the
 * kit's `closeKey`/`onCloseAll` calls; nothing else needs it. */
export function useActiveTabId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => activeId,
    () => null
  )
}

/** What the store believes is the active tab's `id`, right now — for tests. */
export function activeTabIdSnapshot(): string | null {
  return activeId
}

/** WHAT THE STRIP SHOULD DRAW, as one decision instead of two — unchanged
 * purpose from the first design, adapted to the new shape: a tab's own
 * current path is `tab.steps[tab.cursor].path` rather than `tab.path`. */
export function tabStripState(
  // ONLY `steps`/`cursor`, NOT THE FULL `OpenTab` — this function reads
  // nothing else, and narrowing the parameter to what it actually touches is
  // what lets a test fixture (or a future caller) build a bare `{steps,
  // cursor}` tab without also inventing a `path`/`label` mirror this
  // function never looks at.
  tabs: readonly Pick<OpenTab, "steps" | "cursor">[],
  currentPath: string,
  roomForTabs: boolean
): { showTabSet: boolean; activeIndex: number } {
  const activeIndex = tabs.findIndex((tab) => tab.steps[tab.cursor]?.path === currentPath)
  return { showTabSet: roomForTabs && activeIndex >= 0, activeIndex }
}
