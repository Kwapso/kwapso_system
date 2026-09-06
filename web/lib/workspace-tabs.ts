"use client"

// WHAT SHE HAS OPEN — the workspace tab set, and the one store that holds it.
//
// ── THE CLIENT'S ASK, 2026-09-06, verbatim ──────────────────────────────────
//
//   "regarding the breadcrumbs... wdyt, would it be possible to replicate the
//    tab behaviour of chrome? what i mean: i am in a detail app, but i click
//    the first tab 'apps' see all the apps but the detail where i was stays
//    open / then we'll need a x icon on the tabs to close them / but the idea
//    is that all tabs i open stay open unless i close them / is this possible?"
//
// This is a DIFFERENT QUESTION from the one the breadcrumb trail answers, and
// the difference is the whole design. A trail answers WHERE AM I: it is derived
// from the URL, it has no memory, and the moment you climb to the collection the
// record you were reading is gone from it. A tab set answers WHAT DO I HAVE
// OPEN: it is a list of places that persists across navigation, is added to by
// opening something, and is only ever shortened by closing something.
//
// The two are drawn by the SAME strip of folder tabs — she is asking for the
// tabs she already has to stop forgetting — so this store's whole job is to turn
// "the trail of the address I am at" into "the set of places I am holding", in a
// way where the first is always a subset of the second.
//
// ── SIX DECISIONS, WRITTEN DOWN BECAUSE EACH ONE COULD HAVE GONE ANOTHER WAY ─
//
// 1 · THE URL STILL NAMES ONE PLACE: THE ACTIVE TAB. It does not name the set,
//     and this is the load-bearing decision the rest hang off.
//
//     A URL that carried the set (`?tabs=…`) would be wrong in four separate
//     ways, each on its own sufficient. Every open and every close would become
//     a history entry, so Back would step through somebody's tab bookkeeping
//     instead of through the screens they read. A link pasted into an email
//     would hand the reader the sender's whole workspace — which records they
//     had open is not information a link about ONE ticket should carry, and on
//     the portal side it would be a disclosure. A shared link would be
//     unbounded in length. And the deep-link grammar in `deep-link/route.ts` is
//     a PATH grammar — `/accounts/CONFIA/apps/A1` — with one query reserved for
//     dialogs (`?panel` / `?confirm` / `?id`) and one for a screen's own inner
//     view (`?tab=`); a fifth meaning on the query string would collide with
//     the fourth by name alone.
//
//     So: the address bar is unchanged, byte for byte, from before this
//     existed. `parseRoute` is untouched. A deep link from outside — an email,
//     the client portal, a pasted address — resolves exactly as it did, and
//     because it arrives in a NEW document with an empty in-memory set it is
//     also the case that CANNOT lose anybody's tabs. When a deep link lands in
//     a document that already holds a set, the set is ADDED TO and never
//     replaced (see `visitTrail`): the link's own trail is opened, its deepest
//     level is activated, and everything that was open stays open.
//
// 2 · IT SURVIVES A RELOAD, WHICH IS WHY IT IS NOT `useRemembered`.
//
//     `useRemembered` / `web/lib/nav-memory.ts` is this app's per-screen memory
//     seam and it is the WRONG one here, for a reason its own file states as a
//     ruling rather than an accident: "SESSION-SCOPED, AND A REFRESH MAY WIPE
//     IT… no `sessionStorage`, no `localStorage`, no server", because what it
//     holds is a search box and a scroll offset, and a stale one of those is
//     worse than none. A tab set is the opposite kind of fact: losing it on
//     reload is exactly the complaint ("all tabs i open stay open"), and the
//     base RELOADS on its own whenever a top-level route crosses into the /t
//     shell (EDGE-CASES §1).
//
//     It is also keyed differently. `nav-memory` is keyed by SCREEN ADDRESS, so
//     it cannot hold a fact about the workspace as a whole; there is no address
//     that owns "what is open".
//
//     So this follows the OTHER persistence seam this app already has, the one
//     for a person's own chrome: a module-level store mirrored to
//     `localStorage`, exactly as `web/lib/agent-open.ts` (the assistant column)
//     and `app-shell.tsx`'s `ss-sidebar-collapsed` / `ss-rail-closed-groups` do
//     — same `ss-` prefix, same per-device honesty. It is a preference about
//     this screen's furniture, not a synced server preference like `scale` or
//     `spine`, and it needs no migration and no door.
//
// 3 · IT IS BOUNDED, AND THE BOUND IS EIGHT. See `MAX_OPEN_TABS`.
//
// 4 · A BACKGROUND TAB COSTS TWO STRINGS AND NOTHING ELSE. See `OpenTab`.
//
// 5 · ON A PHONE THERE IS NO TAB SET AT ALL. The decision is taken by the
//     caller (`deep-link-screen.tsx`), because it is a decision about a
//     VIEWPORT and this file has no business reading one; what this file
//     guarantees is that a caller that never calls `visitTrail` never
//     accumulates anything, so "off" is genuinely off rather than a hidden
//     set quietly filling up behind a strip nobody draws.
//
// 6 · CLOSING LANDS SOMEWHERE, AND A DEAD RECORD DOES NOT LEAVE A DEAD TAB.
//     See `closeTab`, which returns where to go, and the `onRecordGone` wiring
//     in `deep-link-screen.tsx`.

import { useSyncExternalStore } from "react"

/** ONE OPEN PLACE.
 *
 * `path` is the in-app address — the same string `trailPath` builds and the
 * same one the URL carries, so a tab IS an address and there is no second
 * notion of identity to keep in step.
 *
 * `label` IS A SNAPSHOT, ON PURPOSE, AND IT IS THE WHOLE ANSWER TO "WHAT DOES A
 * BACKGROUND TAB COST". The alternative is to resolve every tab's name live,
 * which means a by-id read per background tab on every mount — `useTrailNames`
 * already does exactly that for the ANCESTORS of the current address, and doing
 * it for eight unrelated records would put eight requests behind every screen
 * for text nobody is reading. So the name is written down at the moment we are
 * looking at that record and knew it for free, and a background tab is two
 * strings: no fetch, no subscription, no cached rows, nothing mounted. A record
 * renamed by somebody else shows its old name on a tab until it is visited,
 * which is a stale WORD rather than a stale screen, and the visit corrects it.
 *
 * Nothing else is stored. Not the record's fields, not its scroll position
 * (that is `nav-memory`'s job and is keyed by the same address anyway), not
 * whether it was open in another window. */
export type OpenTab = { path: string; label: string }

/** HOW MANY TABS MAY BE OPEN AT ONCE.
 *
 * Chrome lets you open ninety and then makes them unreadable slivers; a folder
 * strip cannot even do that, because a folder tab never shrinks to say it is
 * unselected (`breadcrumb-folders.tsx`'s `TAB`: "a tab takes its content's
 * width and the STRIP scrolls"). So the honest ceiling here is the number the
 * strip can still SHOW, and the strip has already answered: `FOLD_AFTER` in the
 * kit is 4, so at five tabs the middle collapses into a `···` menu. Past that,
 * an extra tab is not a tab — it is a row in a dropdown, which is worth less
 * than the memory and the confusion it costs.
 *
 * Eight is twice the fold: enough that the four or five places somebody
 * actually works between are always drawn, plus room for the two or three a
 * deep link opens behind them, and a hard wall in front of a day's worth of
 * accumulation. It is also the number that keeps this store trivially small —
 * eight tabs is well under 2KB of `localStorage`.
 *
 * AND THE RULE AT THE CEILING IS EVICT, NEVER REFUSE. A refusal means an
 * ordinary click on an ordinary row does nothing, or pops a message about a
 * limit nobody asked to hear about — the app appearing broken to protect a
 * number. So the LEAST RECENTLY ACTIVATED tab closes to make room, which is the
 * same least-recently-visited eviction `nav-memory.ts` already uses for
 * sections and screens, and for the same reason the owner gave there: the place
 * you have not opened all afternoon is the one you have stopped thinking about.
 * The tab being opened and the tab currently active are never the eviction's
 * victims (see `visitTrail`). */
export const MAX_OPEN_TABS = 8

/** How long a tab's remembered name may be. A record's name, a reference like
 * `BERG-S0188`, a section title — all far under this. A longer one is TRUNCATED
 * rather than dropped, because a tab with a clipped name is still a tab you can
 * click and a tab with no name is not. It also puts an arithmetic ceiling on
 * the whole store: 8 × (a path plus 80 characters) is a couple of kilobytes,
 * worst case, for somebody trying to fill it. */
export const MAX_TAB_LABEL_CHARS = 80

/* -------------------------------------------------------------------------- */
/*                                 the store                                  */
/* -------------------------------------------------------------------------- */

/** WHOSE TABS, IN WHICH TEAM. Both halves matter and for different reasons.
 *
 * The TEAM is in the key because every path in the set is pinned to one team —
 * a `/t/<teamId>/…` address literally names it, and a clean `/apps/A1` resolves
 * against the ACTIVE team — so a set carried across a team switch would offer
 * somebody a strip of records they are no longer allowed to read. Keeping the
 * team in the key rather than clearing on switch means switching BACK brings
 * that team's tabs back, which is the same trade `nav-memory.ts` makes.
 *
 * The PERSON is in the key because this is `localStorage` on a shared device.
 * Sign-out clears it outright (`forgetOpenTabs`, called from the profile menu
 * beside the two clears already there), and the key is the belt to that
 * braces: two people who use one browser never see each other's places even if
 * a sign-out was killed rather than clicked. */
let scope: string | null = null

/** The set, in the ORDER EACH TAB WAS FIRST OPENED — FIXED, and it does not
 * move when a tab is merely activated. See `activePath` and `recency` below
 * for the two facts that used to be smuggled into this one array's order.
 *
 * THIS WAS A COMPROMISE WITH THE KIT UNTIL KIT v1.2.59, AND IT NO LONGER IS.
 * Chrome's tabs never move: the active one is highlighted wherever it happens
 * to sit. `BreadcrumbFolders` used to be unable to draw that — it painted the
 * LAST item as the live tab (the card's own paper, `aria-current="page"`, the
 * z-lift) with no `activeIndex` to say otherwise — so this array had to stay
 * ordered most-recently-activated-last and the strip re-ordered itself under
 * the reader's own cursor on every switch, which is the opposite of the thing
 * being copied. `BreadcrumbFoldersProps.activeIndex` is the kit's fix — WHICH
 * tab is live, decoupled from WHERE it sits — and this array is what taking it
 * looks like: growth only. A tab's position is a fact about when it was
 * OPENED, never about when it was last looked at. */
let tabs: OpenTab[] = []

/** WHICH TAB IS BEING LOOKED AT — the fact `activeIndex` asks for, sent to the
 * strip as a POSITION the caller computes (`tabs.findIndex` against this),
 * never by moving anything in `tabs` itself. `null` mirrors `tabs`'s own
 * "nothing open" state, and the two are always either both real or both empty
 * — see `touch`, `visitTrail` and `closeTab`. */
let activePath: string | null = null

/** RECENCY, KEPT APART FROM POSITION NOW THAT POSITION IS FIXED. Eviction
 * still wants "the LEAST RECENTLY ACTIVATED tab closes to make room" (see
 * `MAX_OPEN_TABS`), and that fact no longer lives in `tabs`'s own order — so
 * it is tracked here instead, oldest-activated first, most-recent last. It is
 * NOT persisted as its own key: a fresh document seeds it from the PERSISTED
 * POSITION order in `setWorkspaceScope`, which is not a guess. A set written
 * before today is ordered most-recently-activated-last, because until today
 * that was the only order this store had — so the array already on disk IS a
 * recency ranking, and taking it as one costs an already-open set nothing. */
let recency: string[] = []

/** Move `path` to the fresh end of `recency` and mark it the tab being looked
 * at. Called for a tab that is genuinely being ACTIVATED — never for an
 * ancestor merely opened on the way to one (see `put`, in `visitTrail`) —
 * which is what keeps walking back through an already-open trail from
 * refreshing every ancestor's own eviction clock. */
function touch(path: string): void {
  activePath = path
  const at = recency.indexOf(path)
  if (at >= 0) recency.splice(at, 1)
  recency.push(path)
}

/** The snapshot handed to React when nothing is open. A module constant rather
 * than a fresh `[]`, because `useSyncExternalStore` compares snapshots by
 * identity and a new array every read is an infinite render loop. */
const NOTHING: OpenTab[] = []

const subscribers = new Set<() => void>()

function announce(): void {
  for (const fn of subscribers) fn()
}

function storageKey(): string | null {
  return scope ? `ss-open-tabs:${scope}` : null
}

/** Read defensively: this is a value from the reader's own browser, and a
 * half-written or hand-edited one must leave the app whole rather than throw
 * under the shell. Anything that is not a list of `{path,label}` pairs of
 * strings is treated as nothing remembered, which is the behaviour from before
 * this existed. */
function readPersisted(): OpenTab[] {
  const key = storageKey()
  if (!key) return NOTHING
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]")
    if (!Array.isArray(raw)) return NOTHING
    const clean = raw
      .filter(
        (row): row is OpenTab =>
          !!row &&
          typeof row === "object" &&
          typeof (row as OpenTab).path === "string" &&
          typeof (row as OpenTab).label === "string" &&
          (row as OpenTab).path.startsWith("/")
      )
      .slice(-MAX_OPEN_TABS)
    return clean.length === 0 ? NOTHING : clean
  } catch {
    return NOTHING
  }
}

function persist(): void {
  const key = storageKey()
  if (!key) return
  try {
    if (tabs.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(tabs))
  } catch {
    /* private mode / storage blocked — the module variable still carries the
       set for this document, so the feature works and only the reload is
       forgotten. Never a thrown error under the shell for a preference. */
  }
}

/** WHOSE SET THIS DOCUMENT IS HOLDING. Called by the shell once the signed-in
 * person and the active team are both known, and again on a team switch.
 *
 * Setting the same scope twice is a no-op, deliberately: the shell calls this
 * from an effect that re-runs on every render where the ids are recomputed, and
 * re-reading storage there would throw away everything opened since the last
 * write in the same tick. Setting a DIFFERENT scope re-reads, which is what
 * makes a team switch swap sets rather than merge them. */
export function setWorkspaceScope(next: string | null): void {
  if (scope === next) return
  scope = next
  tabs = next ? readPersisted() : NOTHING
  // SEED RECENCY AND THE ACTIVE TAB FROM THE ORDER ALREADY ON DISK — see
  // `recency`'s own comment for why that order is not a guess. The persisted
  // array becomes the first recency ranking, oldest to newest, and its last
  // tab becomes the one the reader was looking at — which is exactly the
  // reading "last position is the active tab" always had, for every set
  // written before `activeIndex` existed. From here on position and recency
  // are two separate facts; a set already sitting in someone's browser opens
  // exactly where it left off, on the exact tab it was showing, and loses
  // nothing by the change — only the reader's first re-activation of an
  // ancestor stops moving it.
  recency = tabs.map((tab) => tab.path)
  activePath = tabs.length > 0 ? tabs[tabs.length - 1].path : null
  announce()
}

/** Truncate a label to something a tab can carry, and never to nothing. */
function trim(label: string): string {
  const clean = label.trim()
  if (!clean) return ""
  return clean.length <= MAX_TAB_LABEL_CHARS ? clean : clean.slice(0, MAX_TAB_LABEL_CHARS - 1) + "…"
}

/** SHE IS HERE NOW — the one mutator the shell calls, on every address change.
 *
 * `trail` is the current address expressed as tabs, outermost first, deepest
 * last: `[{/accounts, "Accounts"}, {/accounts/CONFIA, "Confia"}, …]`. It is
 * built from the SAME crumbs the strip has always drawn (`buildCrumbs`), which
 * is what makes the first paint after a cold deep link identical to the trail
 * this product drew yesterday — the set is seeded to exactly the trail, so
 * nothing appears to have changed until the person navigates and the older tab
 * declines to disappear.
 *
 * EVERY LEVEL IS OPENED, NOT JUST THE DEEPEST, and that is what keeps the way
 * back OUT of a nested record on screen. A person who WALKED in already has the
 * ancestors open (she went through them); a person who PASTED
 * `/accounts/BERG/stories/S12` into a document that already holds three tabs
 * would otherwise get one tab reading "BERG-S0188" with no route back to the
 * client it sits inside. Opening the whole trail costs at most a couple of tabs
 * and gives the nested address the same "shows the whole way in" property the
 * owner asked for on 24 Aug 2026 and that `buildCrumbs` already honours.
 *
 * An ancestor that is ALREADY open keeps its position — only the deepest level
 * is ACTIVATED, which since kit v1.2.59 means marked as the tab being looked
 * at rather than moved anywhere. That is what stops a strip from reshuffling
 * itself twice on one click, and — now — from reshuffling at all.
 *
 * A level with no path (the current page's own crumb carries no `href`) is
 * given the current address by the caller, so every entry here has one. */
export function visitTrail(trail: OpenTab[]): void {
  // NO SCOPE, NO SET, and this is a REFUSAL rather than a guard against a
  // caller that already checks. Nobody is signed into a team yet (the boot), or
  // the shell has decided this viewport has no room for tabs — and in both
  // cases a set that quietly accumulated in memory would be a set that appeared
  // the instant the condition flipped, out of a session that never showed one.
  // "Off" has to mean nothing was recorded, not that nothing was drawn.
  if (!scope || trail.length === 0) return
  const next = [...tabs]

  const put = (entry: OpenTab, activate: boolean) => {
    const label = trim(entry.label)
    const at = next.findIndex((tab) => tab.path === entry.path)
    if (at >= 0) {
      // Already open — POSITION NEVER MOVES, full stop. Its NAME is refreshed
      // either way, which is the only moment the app knows a record's current
      // name for free and a tab showing last week's title is the one
      // staleness a visit can fix. RECENCY is refreshed only when this is the
      // tab being activated: an ancestor merely walked through on the way to
      // one does not itself count as "just looked at" — same rule as before
      // `activeIndex` existed, just read off `recency` instead of off `next`.
      next[at] = { path: entry.path, label: label || next[at].label }
      if (activate) touch(entry.path)
      return
    }
    // New — appended at the END of the fixed-position array, which is the
    // only thing position ever does now: grow. `recency` is touched
    // regardless of `activate`, because cold-opening a whole trail means
    // every level just opened is fresh, not just the deepest one — an
    // ancestor seeded this way is exactly as protected from the next
    // eviction as the tab it leads to.
    next.push({ path: entry.path, label })
    touch(entry.path)
  }

  for (let i = 0; i < trail.length - 1; i++) put(trail[i], false)
  put(trail[trail.length - 1], true)

  // THE CEILING, ENFORCED BY RECENCY NOW, NOT BY POSITION. Position stopped
  // doubling as "how long ago" the moment it became fixed, so this reads
  // `recency`'s own front instead of the array's — the same rule, LEAST
  // RECENTLY ACTIVATED GOES, asked of the fact that actually tracks it now.
  // `touch()` above guarantees the tab just opened or activated sits at
  // `recency`'s tail, so neither one is ever this loop's victim — the same
  // guarantee the old position-based version made, kept by a different
  // mechanism.
  while (next.length > MAX_OPEN_TABS) {
    const victim = recency.find((path) => next.some((tab) => tab.path === path)) ?? next[0]?.path
    if (victim === undefined) break // next is empty; cannot happen at length > 0, kept total
    const at = next.findIndex((tab) => tab.path === victim)
    next.splice(at, 1)
    const ri = recency.indexOf(victim)
    if (ri >= 0) recency.splice(ri, 1)
  }

  tabs = next
  persist()
  announce()
}

/** CLOSE ONE, AND SAY WHERE TO GO.
 *
 * Returns the address the caller should navigate to when the tab that closed
 * was the one being looked at, or `null` when nothing is left and the caller
 * should fall back to the section's own top. Closing a BACKGROUND tab returns
 * the still-active tab's own address, UNCHANGED, so the caller's "did the
 * active tab change?" test is one string comparison and there is no second
 * entry point.
 *
 * THAT SPLIT IS EXPLICIT NOW, AND IT WAS ONLY IMPLICIT BEFORE. While position
 * doubled as recency, closing anything but the LAST tab was, by construction,
 * closing a background tab, and the neighbour computed below happened to
 * never be read except in that one case. `activeIndex` broke the coincidence
 * — a background tab can sit anywhere, including to either side of the active
 * one — so this function now asks the real question, `path === activePath`,
 * instead of inferring it from array position.
 *
 * THE NEIGHBOUR RULE IS THE ONE EVERY TABBED THING USES, and it still reads
 * off POSITION, which is exactly right: position is where the reader's eye
 * and pointer already are, recency or no. The tab to the LEFT, because that
 * is the one still on screen under the pointer that just clicked; falling
 * right only when there is nothing to the left. */
export function closeTab(path: string): string | null {
  const at = tabs.findIndex((tab) => tab.path === path)
  if (at < 0) return activePath
  const wasActive = path === activePath
  const next = [...tabs.slice(0, at), ...tabs.slice(at + 1)]
  tabs = next.length === 0 ? NOTHING : next
  const ri = recency.indexOf(path)
  if (ri >= 0) recency.splice(ri, 1)
  persist()
  const landing = next.length === 0
    ? null
    // The one that took its place, else the one before it — only computed
    // when the closed tab WAS the active one; a background close leaves the
    // active tab exactly where it was, by path, regardless of where it now
    // sits after the array shifted under it.
    : wasActive
      ? (next[at] ?? next[at - 1] ?? next[next.length - 1]).path
      : activePath
  activePath = landing
  announce()
  return landing
}

/** Drop everything, for every scope. Sign-out only: these are one person's
 * places and a `localStorage` key outlives the session that wrote it, so the
 * next person to use this browser must not inherit a strip of somebody else's
 * clients. Same sentence as `forgetEverything` and `clearAllFormDrafts`, which
 * it stands beside in `profile-menu.tsx`.
 *
 * It clears EVERY `ss-open-tabs:` key rather than just the current scope,
 * because a person who worked in two teams today has two of them and only one
 * is loaded. */
export function forgetOpenTabs(): void {
  tabs = NOTHING
  recency = []
  activePath = null
  scope = null
  try {
    const doomed: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("ss-open-tabs:")) doomed.push(key)
    }
    for (const key of doomed) localStorage.removeItem(key)
  } catch {
    /* storage blocked — the module variable is cleared either way, which is
       what protects this document. */
  }
  announce()
}

/** The set, for the strip. The SSR snapshot is always empty — this is a
 * `localStorage`-backed client fact, so the server renders no tabs and the
 * shell falls back to the ordinary breadcrumb trail for that first paint (see
 * `deep-link-screen.tsx`), which is the correct thing to draw when the answer
 * is not known yet rather than a placeholder for it. */
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

/** What the store is holding right now — for the bound test, and for anyone who
 * wants to prove the ceiling holds under a punishing walk rather than take the
 * comment on `MAX_OPEN_TABS` on trust. */
export function openTabsSnapshot(): OpenTab[] {
  return tabs
}

/** WHICH TAB IS BEING LOOKED AT, for the caller that builds the kit's
 * `activeIndex` — its own position in `useOpenTabs()`'s array, found by path
 * (`tabs.findIndex((t) => t.path === path)`) rather than handed out as a raw
 * number, because the index is only ever meaningful paired with the exact
 * array it indexes into and this store is not the one holding that pairing.
 * The SSR snapshot is `null`, matching `useOpenTabs`'s own empty one — the
 * server does not know what a person last looked at any more than it knows
 * what they have open. */
export function useActiveTabPath(): string | null {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => activePath,
    () => null
  )
}

/** What the store believes is active right now — the `activePath` counterpart
 * to `openTabsSnapshot`, for the same reason: a test proving the fixed-
 * position/real-closing behaviour needs to read the fact directly rather than
 * infer it from array order, which is precisely the inference this change
 * retires. */
export function activeTabPathSnapshot(): string | null {
  return activePath
}

/** WHAT THE STRIP SHOULD DRAW, as one decision instead of two.
 *
 * The shell has to answer two questions that must agree: is this a tab SET or
 * an ordinary trail, and which tab is live. They were separate expressions in
 * `deep-link-screen.tsx` and they disagreed the day the store stopped
 * re-ordering — the "is it a set" half still asked whether the LAST tab was the
 * address, which had been the same thing as "the active tab" only while
 * activating one moved it to the end. Step back to an earlier tab and the set
 * silently became a trail: the feature vanishing precisely when it was working.
 *
 * Each half was right on its own, which is why nothing caught it. So they are
 * one function now, returning a pair that cannot contradict itself, and it is
 * pure so the case that broke can be a test rather than a click.
 */
export function tabStripState(
  tabs: readonly OpenTab[],
  currentPath: string,
  roomForTabs: boolean
): { showTabSet: boolean; activeIndex: number } {
  const activeIndex = tabs.findIndex((tab) => tab.path === currentPath)
  // `roomForTabs` is the phone gate and it is checked HERE rather than by the
  // caller, so there is one place where "no set" is decided. An address that is
  // not in the set is the ordinary fallback, not an error: it is the first
  // paint, a phone, or Welcome, which has no crumb and so no tab.
  return { showTabSet: roomForTabs && activeIndex >= 0, activeIndex }
}
