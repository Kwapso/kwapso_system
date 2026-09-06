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

/** The set, most recently activated LAST.
 *
 * THE ORDER IS THE ONE THING HERE THAT IS A COMPROMISE WITH THE KIT, AND IT IS
 * WORTH BEING PLAIN ABOUT. Chrome's tabs never move: the active one is
 * highlighted wherever it happens to sit. `BreadcrumbFolders` cannot draw that
 * — it paints the LAST item as the live tab (the card's own paper, `aria-
 * current="page"`, and, since the tabs overlap, the one that paints over its
 * neighbours by being later in DOM order). There is no `activeIndex`.
 *
 * Faking it app-side would mean hand-drawing the folder strip, which is exactly
 * what this codebase does not do with kit shapes. So the set is ordered
 * MOST-RECENTLY-ACTIVATED LAST, and the tab you are looking at is always the
 * front folder — which is what a folder metaphor actually does: you pull the
 * one you are reading to the front of the drawer. Everything the client asked
 * for holds (nothing closes on its own; clicking the collection keeps the
 * record open; the strip only ever grows by opening and shrinks by closing);
 * what is missing is that a tab stays put on screen.
 *
 * When the kit grows `activeIndex`, `activate()` below stops re-ordering and
 * the strip becomes fixed-position and Chrome-exact. That is the only line that
 * changes. */
let tabs: OpenTab[] = []

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
 * is activated (moved to the front folder). That is what stops a strip from
 * reshuffling itself twice on one click.
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
      // Already open. Its NAME is refreshed either way — this is the only
      // moment the app knows a record's current name for free, and a tab
      // showing last week's title is the one staleness a visit can fix.
      const found = { path: entry.path, label: label || next[at].label }
      if (!activate) {
        next[at] = found
        return
      }
      next.splice(at, 1)
      next.push(found)
      return
    }
    // New. An ancestor goes in BEFORE the tab that is about to become active,
    // so a freshly-seeded strip reads outermost-first exactly like the trail it
    // was built from.
    next.push({ path: entry.path, label })
  }

  for (let i = 0; i < trail.length - 1; i++) put(trail[i], false)
  put(trail[trail.length - 1], true)

  // THE CEILING, ENFORCED FROM THE OLD END. The active tab is last and every
  // ancestor of the address we just arrived at is behind it, so dropping from
  // the front takes the least recently activated thing every time — and can
  // never take the tab somebody is looking at, because that one is at the other
  // end of the array. A trail deeper than the ceiling would eat its own
  // ancestors, which is correct: the deepest levels are the ones that were
  // asked for.
  while (next.length > MAX_OPEN_TABS) next.shift()

  tabs = next
  persist()
  announce()
}

/** CLOSE ONE, AND SAY WHERE TO GO.
 *
 * Returns the address the caller should navigate to when the tab that closed
 * was the one being looked at, or `null` when nothing is left and the caller
 * should fall back to the section's own top. Closing a BACKGROUND tab returns
 * the still-active tab's own address, so the caller's "did the active tab
 * change?" test is one string comparison and there is no second entry point.
 *
 * THE NEIGHBOUR RULE IS THE ONE EVERY TABBED THING USES: the tab to the LEFT,
 * because in a strip ordered oldest-first that is the place you were before
 * this one, and it is the one still on screen under the pointer that just
 * clicked. Falling right only when there is nothing to the left. */
export function closeTab(path: string): string | null {
  const at = tabs.findIndex((tab) => tab.path === path)
  if (at < 0) return tabs[tabs.length - 1]?.path ?? null
  const next = [...tabs.slice(0, at), ...tabs.slice(at + 1)]
  tabs = next.length === 0 ? NOTHING : next
  persist()
  announce()
  if (next.length === 0) return null
  // The one that took its place, else the one before it.
  return (next[at] ?? next[at - 1] ?? next[next.length - 1]).path
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
