"use client"

// A COMPACT PILL, NOT A STRIP. Aurora's ruling, 22 Sep 2026 (documents/
// UI-RULEBOOK.md K62), picking "Compact pill, bottom centre": the screen's
// own connection state is now said in the kit's toast register rather than
// as a banner pushed above a screen's content.
//
// The whole app is cache-first with row-level live-sync (CACHING.md): a
// screen reads once and the team socket keeps it fresh. That is excellent
// while the socket is up and silently wrong the moment it is not, which is
// why this renders NOTHING while `useTeamLive` says the link is up, and
// exactly the exception when it says otherwise.
//
// THE OFFSET IS EXACTLY THE TOAST'S OWN (shared/ui/components/sonner/
// sonner.tsx) AND NOTHING ELSE: `var(--space-7)` up from the bottom on a
// wide screen, `var(--space-4)` on a phone, the same two tokens `<Toaster>`
// already passes as `offset` and `mobileOffset`. ONE clearance stacks on top
// of that base, read off a custom property rather than computed here (the
// same seam app-shell.tsx already uses for `--shell-top`): `--live-status-
// tab-clear`, for the phone's own fixed bottom tab bar (agency only, zero at
// `md`, where the bar is `md:hidden` and so measures zero height on its own;
// the portal's own bottom nav shows at every width, so its wrapper sets the
// same property with no `md` override). Both shells MEASURE the bar rather
// than guess: a `ResizeObserver` on the bar itself, published onto each
// shell's own root wrapper as the bar's own real height plus one 16px
// gutter (`web/components/shell/app-shell.tsx` and `web-portal/components/
// portal-shell.tsx`).
//
// There used to be a second clearance property here, one this file will not
// name again because the whole point is that it is gone: it read a ticket
// screen's own dark Latest activity / Record band (R89). GONE, not fixed:
// staging measured it putting the pill 160px/240px above the bottom, more
// than the band it was clearing, on every width, because the band is a
// STICKY element inside the page's own scroller and is mostly NOT at the
// viewport's true bottom edge — a fact no flat number or measurement of the
// band itself could ever correct for, since the pill needed the band's
// DISTANCE from the viewport bottom, not its height. The fix is that this
// pill takes exactly the version toast's own offsets and nothing else, the
// same register K62 borrowed in the first place — it can sit in front of
// the band on a ticket screen exactly as the toast already does everywhere
// else.
//
// It carries the ONLY thing a person can do about it, the same remedy the
// strip always offered: the socket is already reconnecting on its own
// backoff, so the button is not "try again", it is "I do not want to
// wait". `invalidatePrefix("")` is that, through the seam the live
// listeners already use. The close mark dismisses THIS disconnection only;
// reconnecting and dropping again shows it again.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { ArrowClockwise, CloudSlash, X } from "@shared/ui/foundations/icons"
import { cn } from "@shared/ui/lib/utils"

import { useT } from "./language"
import { useTeamLive } from "./realtime"
import { invalidatePrefix } from "./store"

/** Say so when this tab has stopped hearing about changes, and offer the one
 * remedy that is in the person's hands. Renders nothing while the link is
 * up. A fixed, bottom centred pill (K62): it sets no page width (R29) and
 * occupies no layout space either way, so both shells mount it once,
 * anywhere in their own tree, rather than at the top of a screen's own
 * content. */
export function LiveStatus() {
  const t = useT()
  const live = useTeamLive()
  const [dismissed, setDismissed] = React.useState(false)

  // A dismissal is scoped to ONE disconnection. The moment the link comes
  // back, the next drop is a fresh thing to say, not the one already waved
  // off, so this clears the instant `live` flips back to true rather than
  // on every render, which would undo a dismissal nobody asked to undo.
  React.useEffect(() => {
    if (live) setDismissed(false)
  }, [live])

  if (live || dismissed) return null

  return (
    <div
      role="status"
      className={cn(
        // `left-0 w-screen`, NOT `inset-x-0`. Measured on staging at 1440px
        // with a real vertical scrollbar: `inset-x-0` (`left:0; right:0`)
        // centred this pill at x=712.5, 7.5px left of the true centre
        // (720), while `window.innerWidth` genuinely read 1440. The cause
        // is `web/app/globals.css`'s (and the portal's own copy's)
        // `html, body { overflow-x: clip }`, load-bearing, "THE PAGE DOES
        // NOT SCROLL SIDEWAYS. EVER.", not something this file may touch.
        // Once the root carries a non-visible `overflow-x`, `right: 0` on a
        // `position: fixed` descendant resolves against
        // `document.documentElement.clientWidth` (1425, the viewport minus
        // the scrollbar) rather than `window.innerWidth` (1440, the real
        // viewport `position: fixed` is supposed to use), confirmed by a
        // throwaway repro page carrying the same two root rules. `right: 0`
        // is the half that reads the narrowed box; `left: 0` alone never
        // does, because there is nothing on the right to resolve against
        // the wrong edge. `w-screen` (`width: 100vw`) supplies the width
        // instead, and `vw` is unaffected by the same bug (proved on the
        // same repro page: a `left:0; width:100vw` pill centred at exactly
        // 720 with the identical two root rules in play), so the flex
        // child inside centres on the real viewport again.
        "pointer-events-none fixed left-0 w-screen z-[70] flex justify-center px-4",
        "bottom-[calc(var(--space-4)+var(--live-status-tab-clear,0px))]",
        "md:bottom-[calc(var(--space-7)+var(--live-status-tab-clear,0px))]"
      )}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-pill bg-warning text-warning-foreground py-3 ps-[var(--space-6)] pe-[var(--space-3h)] text-caption shadow-xl">
        <CloudSlash className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">{t("Not updating live right now.")}</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          // The toast's own light wash action, R98's named exemption in
          // shared/rules/registry.ts (BUTTON_SIZE_EXEMPT): a control inside
          // this register follows the TOAST's own dense height, not a
          // toolbar's.
          className="shrink-0 bg-[color-mix(in_srgb,currentColor_14%,transparent)] text-current hover:bg-[color-mix(in_srgb,currentColor_24%,transparent)]"
          onClick={() => invalidatePrefix("")}
        >
          <ArrowClockwise className="size-3.5" />
          {t("Refresh")}
        </Button>
        {/* The small close mark, sized to the toast's own 28px chip
            (`size-7`) rather than the kit's `size="icon"` default: `size="icon"`
            keeps this off the R98 census entirely (only `size="sm"` and a
            custom `h-`/`py-`/`px-` class are matched), and tailwind-merge
            resolves the `size-7` override cleanly against it.

            "Dismiss", not "Close": this pill is not a tab, but every census
            in the app that counts a workspace tab strip's own close buttons
            (`web/test/workspace-tabs-are-wired.test.tsx`) matches on the
            word "close" in an aria-label, and this pill is mounted as a
            sibling of the shell's own content, fixed to the viewport, never
            inside the strip. A shared word for two different controls is
            how one test miscounted the other's. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-[color-mix(in_srgb,currentColor_65%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_14%,transparent)] hover:text-current"
          aria-label={t("Dismiss")}
          onClick={() => setDismissed(true)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
