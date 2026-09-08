"use client"

// IS THIS SCREEN STILL BEING TOLD ABOUT CHANGES? — the sentence the live layer
// could always answer and never said out loud.
//
// The whole app is cache-first with row-level live-sync (CACHING.md): a screen
// reads once and the team socket keeps it fresh. That is excellent while the
// socket is up and silently wrong the moment it is not — the rows stay on
// screen, nothing errors, nothing spins, and a stale list is indistinguishable
// from a list where nothing has happened. Of every failure this app can have,
// it is the one a person is least able to notice and most likely to act on.
//
// So: when the connection is up this renders NOTHING. A permanent "Live" badge
// is chrome on every screen, all day, telling somebody that the normal thing is
// happening — and a person who sees "Live" a thousand times stops reading it,
// which means it is worth nothing on the one day it says something else. The
// honest signal is the exception, and it appears exactly when it is true.
//
// It also carries the ONLY thing a person can actually do about it. The socket
// is already reconnecting on its own backoff, so the button is not "try again"
// — it is "I do not want to wait": drop every cached entry and let the screens
// on show re-read through the ordinary door. `invalidatePrefix("")` is that,
// through the seam the live listeners already use, rather than a reload that
// would throw away the whole client-resolved shell (R37's argument, one layer
// down).

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { ArrowClockwise, CloudSlash } from "@shared/ui/foundations/icons"

import { useT } from "./language"
import { useTeamLive } from "./realtime"
import { invalidatePrefix } from "./store"

/** Say so when this tab has stopped hearing about changes, and offer the one
 * remedy that is in the person's hands. Renders nothing while the link is up.
 *
 * Both front doors mount it in their own shell. It sets no page width (R29): it
 * is a strip inside whatever container the shell already owns. */
export function LiveStatus() {
  const t = useT()
  const live = useTeamLive()
  if (live) return null
  return (
    <div
      // `role="status"` rather than `alert`: it is worth announcing when it
      // changes and is not worth interrupting what somebody is reading.
      role="status"
      // The gap to the content below is the strip's OWN margin rather than a
      // wrapper at each host: it is paid only when the strip renders, which is
      // the same argument `TimerBar`'s conditional band makes one file over.
      //
      // NO BORDER, 8 Sep 2026, and it is the kit's own law rather than taste.
      // This strip drew `border-warning/40 border` until the main × feat/ui-ux
      // merge put it in front of the kit's borders rule for the first time
      // (RULES.md §2.7, executable since kit v1.2.70): a boundary is a paper
      // step, a fill, or an inset shadow, and a CSS border is none of the
      // three. The tint IS the paper step here — which is what the app's two
      // other notice strips already do, `bg-warning/10` on a wave's warning and
      // `bg-destructive/10` on an import's error rows, neither of which has ever
      // carried an outline. The strip lost a hairline and gained agreement with
      // its own siblings.
      className="bg-warning/10 text-warning mb-4 flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs"
    >
      <CloudSlash className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {t("Not updating live right now — you may not be seeing the latest changes.")}
      </span>
      <Button
        type="button"
        // Not `ghost`: that variant paints tertiary ink, which on this strip's
        // own tinted ground is the one place in the app where the quietest
        // control sits on the least quiet background. The kit's own note says
        // a control carrying an icon is `secondary` anyway.
        variant="secondary"
        size="sm"
        className="shrink-0"
        onClick={() => invalidatePrefix("")}
      >
        <ArrowClockwise className="size-3.5" />
        {t("Refresh")}
      </Button>
    </div>
  )
}
