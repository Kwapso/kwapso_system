"use client"

// ONE CARD FOR EVERY ICON-LED GALLERY WALL — the client's ruling, 17 Sep 2026,
// verbatim, about the app record's own Modules tab: "I want it to look exactly
// like the settings modules, this kind of gallery with the icons."
//
// Settings › Modules already drew this cell (settings-screen.tsx, the wall
// `CardGrid` built there 2026-09-10 for "the settings / modules i want in the
// same component kinda grid like team members, each with its icon") — an icon
// well, the kit's own `CardTitle`, on a `variant="raised"` card that fills its
// grid cell. Rather than a second hand-copy of that JSX for the app's own
// Modules tab, this is the ONE component both now render: Settings › Modules
// passes `href` and no `actions` (a pure destination card, unchanged); the
// app's Modules tab passes `actions` (edit / switch off) and no `href` (a
// module has no page of its own to open).
//
// THE CHIP SITS ABOVE THE TITLE, IN THE SAME WRAPPER SPAN (R65 / R72
// amendment 1) — `members-gallery.tsx`'s own note explains why: a badge and a
// `CardTitle` sharing one `<span>` puts anything drawn AFTER that span outside
// the title's own JSX children array, so it can never read as the "subtitle
// under a heading" R72 forbids. `actions` sits there for the same structural
// reason, and it is buttons, never prose, so R72's own census (which matches
// `<p>`/`<span>`/`<small>`/`<em>`/`<strong>`) has nothing to catch even if it
// did sit beside the title.
//
// NOT `interactive` on the `<Card>` — the wash is `hover:bg-accent
// motion-hover`, the identical, deliberately-not-lifting hover both source
// walls already argued down from the kit's `interactive` prop (a WALL of many
// cards lifting on hover is "the page of reacting boxes UI-RULEBOOK C2 exists
// to prevent" — app-tiles.tsx's own note).

import * as React from "react"

import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { cn } from "@shared/ui/lib/utils"
import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { safeHref } from "@shared/web/rich-text"

import { InAppLink } from "@/components/shell/in-app-link"

export function GalleryCard({
  href,
  icon,
  title,
  topBadge,
  actions,
  className,
}: {
  /** Present = the whole cell is a real anchor (R37), as Settings › Modules
   * and the members gallery both already are. Absent = a plain cell, for a
   * record with no page of its own — the app's Modules tab, whose edit and
   * switch-off live in `actions` instead. */
  href?: string
  icon: IconName
  title: string
  /** Drawn ABOVE the title, in the same wrapper `<span>` — a status chip or a
   * count, never prose (R65/R72, see header). */
  topBadge?: React.ReactNode
  /** Drawn below the title, outside the title's own wrapper — buttons, never
   * a sentence. */
  actions?: React.ReactNode
  className?: string
}) {
  const body = (
    <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
      <Icon name={icon} className="text-muted-foreground size-6" />
      {topBadge ? (
        <span className="flex flex-col items-center gap-1">
          {topBadge}
          <CardTitle className="text-sm">{title}</CardTitle>
        </span>
      ) : (
        <CardTitle className="text-sm">{title}</CardTitle>
      )}
      {actions}
    </CardContent>
  )

  return (
    /* SOFT PAPER, NOT OFF-BEIGE — rulebook L43 going app wide, 21 Sep 2026.
       This card used to stand inside a painted collection frame, where
       `raised` (`--card`, off-beige) read 1.221 against soft paper. The
       frame is plain now, so its ground is the PAGE, and `--card` IS the
       page's own colour in light (#FFFEF9): `raised` here would measure
       1.000 and the card would be held up by its shadow alone. `default`
       is soft paper, the same 1.103 the search pill and every other
       object on this ground reads at. The Minimal Kit page named exactly
       this sweep: "check that nobody passed `raised` explicitly for a
       tile row that used to sit on a panel". */
    <Card variant="default" className={cn("hover:bg-accent motion-hover", className)}>
      {href ? (
        // THROUGH THE URL SEAM (web/test/rich-text.test.ts) — every caller of
        // this shared card builds `href` from a fixed segment/route table
        // today (Settings › Modules' own `/settings/${page.segment}`), but
        // this component is reused wherever an icon-led gallery wall needs a
        // real anchor, so the check is inline here rather than trusted at
        // every future call site.
        <InAppLink href={safeHref(href) ?? "/home"} className="block">
          {body}
        </InAppLink>
      ) : (
        body
      )}
    </Card>
  )
}
