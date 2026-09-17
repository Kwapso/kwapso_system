"use client"

// The ONE soft-navigation bus. The whole post-auth app is a single client-resolved
// shell (deep-link-screen.tsx mounts once and never unmounts), so EVERY in-app move must
// go through its History-API `go()` — a framework `router.push` into a deep /t path is a
// hard reload in the static export (EDGE-CASES §1) that tears the shell (and a running
// agent) down. Deep components (the profile menu, team switcher, invite inbox) can't
// easily reach the host's `go()`, so the host registers it here and they call
// `softNavigate` — no prop-threading, no context provider. If the host isn't mounted yet
// (a pre-auth screen, or the very first paint) it falls back to a real navigation.

import { openSoloTab } from "@/lib/workspace-tabs"
import { anyDirty, clearAllDirty, requestDiscardConfirm } from "@/lib/unsaved-changes"

let hostGo: ((path: string) => void) | null = null

/** The deep-link host registers its `go()` here on mount; returns an unregister fn. */
export function registerHostGo(fn: (path: string) => void): () => void {
  hostGo = fn
  return () => {
    if (hostGo === fn) hostGo = null
  }
}

/** THE BUS ASKS BEFORE IT MOVES — see `unsaved-changes.ts`'s own header for
 * the whole account. `perform` is about to unmount whatever is on screen
 * right now (R37: one shell, one route, so a navigation IS an unmount); if
 * that screen is holding an unsaved draft (`anyDirty()`), the move is held
 * for a yes/no answer instead of happening in silence. On Discard the
 * registry is cleared and `perform` finally runs; on Keep editing `perform`
 * never runs at all — nothing moves.
 *
 * CALLED FROM TWO PLACES THAT ARE NOT EACH OTHER. `softNavigate` below is
 * one; the other is `go()` itself (`deep-link-screen.tsx`, registered here
 * as `hostGo`), because the app's OTHER internal callers — the nav rail, a
 * breadcrumb, `closeWorkspaceTab` — reach `go` directly (`onNavigate={go}`)
 * and never pass through `softNavigate` at all, so guarding only the bus's
 * own front door would miss exactly the case this seam exists for (pressing
 * a nav item while a draft sits behind you). Asking twice on one navigation
 * is not two decisions: by the time `go`'s own check runs, either nothing
 * was dirty to begin with, or `softNavigate` already asked and a Discard
 * already cleared the registry — so the second check is a silent
 * pass-through, never a second dialog. */
export function guardNavigate(perform: () => void): void {
  if (anyDirty().length === 0) {
    perform()
    return
  }
  void requestDiscardConfirm().then((discard) => {
    if (discard) {
      clearAllDirty()
      perform()
    }
  })
}

/** Navigate WITHOUT a reload when the shell is mounted (History-API `go()`); otherwise a
 * plain navigation (pre-auth, or before the host mounts). Use this everywhere instead of
 * `router.push` for in-app links.
 *
 * GUARDED, UNLESS `path` IS WHERE WE ALREADY ARE — a same-path call (a query-only
 * refresh) never unmounts anything, so it is never worth a confirm even while
 * something elsewhere is dirty. Compared against `window.location.pathname`
 * because this file is not a component and has no `currentPath` of its own;
 * `go()` re-derives the identical comparison from its own closed-over state. */
export function softNavigate(path: string): void {
  const perform = () => {
    if (hostGo) hostGo(path)
    else if (typeof window !== "undefined") window.location.assign(path)
  }
  const leaving = typeof window === "undefined" || path.split("?")[0] !== window.location.pathname
  if (!leaving) {
    perform()
    return
  }
  guardNavigate(perform)
}

/** OPEN `path` AS ITS OWN SOLO TAB ON THE STRIP — FRONTED — AND GO THERE.
 *
 * THE CLIENT, testing Import, 2026-09-14: "make sure that it opens as a new
 * solo tab on the breadcrumbs, because now it redirects." Every "Import CSV"
 * door today just `softNavigate`s the tab you were already standing in to the
 * wizard, which reads exactly like a redirect — the collection she pressed it
 * from is gone from the strip until she clicks Back.
 *
 * A SOLO TAB IS ITS OWN ONE-STEP TAB. `openSoloTab` (`workspace-tabs.ts`)
 * fronts an already-open tab whose CURRENT step matches this path rather
 * than opening a second one — the one dedupe this app still promises after
 * 17 Sep 2026's ruling retired it everywhere else (`workspace-tabs.ts`'s own
 * decision (C) has the whole account of why this door alone keeps it: the
 * client's own words at the time were about the Import wizard specifically,
 * "make sure that it opens as a new solo tab... because now it redirects",
 * and repeat-pressing Import must still front the one wizard, never mint a
 * second).
 *
 * THE VIEWPORT GATE IS DUPLICATED ON PURPOSE, NOT SHARED. Neither
 * `openSoloTab` nor `openBeside` takes a view on screen width
 * (workspace-tabs.ts, decision 5 of the first design: "this file has no
 * business reading one") — every other caller is a hook already living
 * inside `deep-link-screen.tsx`, which knows `roomForTabs` before it calls
 * in. This is the one caller with no host screen to ask, so it asks the same
 * question at the same breakpoint that hook does (48rem — the kit's own
 * `md`, where `ScreenShell` swaps the tab strip for the plain text trail),
 * so "no tab set on a phone" stays true through this door too, rather than
 * quietly filling one up behind a strip nobody draws.
 *
 * `path` MAY CARRY A QUERY STRING (the scoped import door does —
 * `?groups=…`), and it travels to `softNavigate` whole. The TAB is keyed on
 * the bare pathname only, with the query stripped before it reaches
 * `visitTrail` — the same convention `currentPath` already keeps everywhere
 * else in the shell (`deep-link-screen.tsx`'s `trailPath` never carries one
 * either), so this tab still matches what `tabStripState` compares it
 * against and two scoped imports at different `?groups=` front the one tab
 * rather than each other. */
export function openInNewTab(path: string, label: string): void {
  const roomForTabs =
    typeof window !== "undefined" && window.matchMedia("(min-width: 48rem)").matches
  if (roomForTabs) openSoloTab(path.split("?")[0] ?? path, label)
  // NEVER GUARDED — the one navigation this app has ruled must not ask.
  // Opening a new workspace tab does not leave the one you were on (R74: the
  // tab you pressed the door from stays in the strip, reachable, exactly as
  // it was); `softNavigate` would still see it as "leaving" by path and ask
  // anyway, so this calls the bus's raw mover directly and sets the flag
  // `go()` itself consumes for the one call it is about to make — the only
  // way to skip `go`'s own check (the direct callers it exists for, see
  // `guardNavigate`'s own header) without threading a second argument
  // through `registerHostGo` for one caller.
  skipNextGoGuard = true
  if (hostGo) hostGo(path)
  else if (typeof window !== "undefined") window.location.assign(path)
}

/** Set by `openInNewTab` immediately before its one, synchronous call into
 * `hostGo` — read and cleared by `go()` (`deep-link-screen.tsx`) for that
 * same call, and by nothing else. There is no gap for another navigation to
 * land between the two: both run in the same tick, on the same thread, with
 * no `await` in front of `hostGo(path)` above. */
let skipNextGoGuard = false

/** Consumed once — `true` only for the exact `go()` call `openInNewTab`
 * makes, `false` for every other caller, forever after. */
export function consumeGoGuardSkip(): boolean {
  const skip = skipNextGoGuard
  skipNextGoGuard = false
  return skip
}
