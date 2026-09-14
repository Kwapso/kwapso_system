"use client"

// The ONE soft-navigation bus. The whole post-auth app is a single client-resolved
// shell (deep-link-screen.tsx mounts once and never unmounts), so EVERY in-app move must
// go through its History-API `go()` — a framework `router.push` into a deep /t path is a
// hard reload in the static export (EDGE-CASES §1) that tears the shell (and a running
// agent) down. Deep components (the profile menu, team switcher, invite inbox) can't
// easily reach the host's `go()`, so the host registers it here and they call
// `softNavigate` — no prop-threading, no context provider. If the host isn't mounted yet
// (a pre-auth screen, or the very first paint) it falls back to a real navigation.

import { visitTrail } from "@/lib/workspace-tabs"

let hostGo: ((path: string) => void) | null = null

/** The deep-link host registers its `go()` here on mount; returns an unregister fn. */
export function registerHostGo(fn: (path: string) => void): () => void {
  hostGo = fn
  return () => {
    if (hostGo === fn) hostGo = null
  }
}

/** Navigate WITHOUT a reload when the shell is mounted (History-API `go()`); otherwise a
 * plain navigation (pre-auth, or before the host mounts). Use this everywhere instead of
 * `router.push` for in-app links. */
export function softNavigate(path: string): void {
  if (hostGo) hostGo(path)
  else if (typeof window !== "undefined") window.location.assign(path)
}

/** OPEN `path` AS ITS OWN SOLO TAB ON THE STRIP — FRONTED — AND GO THERE.
 *
 * THE CLIENT, testing Import, 2026-09-14: "make sure that it opens as a new
 * solo tab on the breadcrumbs, because now it redirects." Every "Import CSV"
 * door today just `softNavigate`s the tab you were already standing in to the
 * wizard, which reads exactly like a redirect — the collection she pressed it
 * from is gone from the strip until she clicks Back.
 *
 * A SOLO TAB IS A TRAIL OF ONE. `visitTrail` (`workspace-tabs.ts`) already
 * generalises to that shape on its own terms — no ancestors, one entry,
 * itself the only and active level — so this is not a second tab mechanism,
 * it is the model's own single mutator, called with a one-entry trail instead
 * of the crumb-derived one `deep-link-screen.tsx` builds for an ordinary
 * navigation. Calling it again on the SAME path fronts the tab already open
 * rather than opening a second one — `visitTrail`'s own rule for any
 * already-open path, unchanged here: this seam adds no duplicate-route logic
 * of its own.
 *
 * THE VIEWPORT GATE IS DUPLICATED ON PURPOSE, NOT SHARED. `visitTrail` itself
 * takes no view on screen width (workspace-tabs.ts, decision 5: "this file
 * has no business reading one") — every other caller is a hook already living
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
  if (roomForTabs) visitTrail([{ path: path.split("?")[0] ?? path, label }])
  softNavigate(path)
}
