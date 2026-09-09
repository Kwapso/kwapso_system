"use client"

// CollectionHeading (R16 ii) — the count's home on a screen with NO counted tab
// strip. A real <h1> (title from the module registry) with the exact server
// total as a chip, built through the ONE formatCount seam. Scoping counts to
// tabs was the original loophole: a sidebar page renders no tab strip, so those
// screens "obeyed the law" showing no count anywhere. The target list is DERIVED
// from the registry (every section with a countCacheKey whose placement isn't
// "tab") — never hand-listed. And the count never depends on an unrelated
// permission: the heading renders for anyone who can see the screen.
//
// NO GLYPH — client ruling: a main screen's title is text only. It used to
// carry the section's own `CONCEPT_ICON` glyph beside the word; that glyph is
// gone from here (the rail is still where a section's icon lives).
//
// NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove the
// eyebrow on the title on main screens. Remove that eyebrow, kill it." This
// reverses the 2026-09-01 ruling that put one here (the NAV SECTION word this
// screen's own `TEAM_SECTIONS` entry already carries — Apps → "Build",
// Contacts → "Accounts"), and it is a reversal rather than a refinement: the
// rail already shows that same `NAV_GROUP_LABELS` word above this very
// screen's row, one glance away, so the line above the title was saying a
// second time what the navigation had just said. A main screen's title is now
// the title and its count, and nothing above it. Nothing else read the label
// through this file, so `NAV_GROUP_LABELS` keeps its one real reader, the
// rail in `app-shell.tsx`.
//
// AND NO CONDENSED STAND-IN — same ruling, verbatim: "when I scroll down, the
// whole compressed title is useless, so remove that. When I scroll down, what
// is at the top should be only the tabs, if there are tabs, on the same line
// as the whole eyebrow." `condensed-title.tsx` — the smaller bar that took the
// sticky slot once this heading scrolled away, on both kinds of screen — is
// deleted outright, along with the `IntersectionObserver` that watched this
// heading and the `--collection-tabs-top` clearance it published for the tab
// strip below. What pins at the top of a scrolled main screen is now the tab
// strip and nothing else (`STICKY_FOLDER_TABS`,
// shared/web/screen-engine/tabs-view.tsx, `top-0`); a screen with no tabs pins
// nothing at all. Read "on the same line as the whole eyebrow" as the tabs
// taking the position the eyebrow row used to hold — the same ruling kills the
// eyebrow one sentence earlier, so it cannot also be asking for one.

// Type-only: this file renders no hooks and no state of its own — `action` is a
// node it is handed and places, so React is imported for the type and nothing else.
import type * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Headline } from "@shared/ui/components/typography/typography"
import { formatCount } from "@shared/web/format-count"
import { TEAM_SECTIONS } from "@/lib/pages"
import { useCountStandsDown } from "@/components/records/counted-tabs"
import { useT } from "@shared/web/language"

export function CollectionHeading({
  sectionKey,
  total,
  action,
}: {
  /** the module-registry key — the title comes from there, never a literal. */
  sectionKey: string
  /** the exact server total (undefined while loading → the chip renders nothing). */
  total: number | undefined
  /** THE SCREEN'S OWN DOOR, pinned to the far right of the title line. One
   * control, icon-only, and it is deliberately NOT the collection's.
   *
   * WHY IT IS NOT IN THE TOOLBAR, which is where this app puts a button. The
   * client's 2026-08-31 ruling — "never align the button with the tabs … that
   * button belongs in the right of the toolbar, part of the toolbar" — was
   * about "Raise ticket", and it is right about it: creating a ticket is
   * something you do TO the collection, so it belongs in the row that searches,
   * filters and sorts that collection. A module's settings gear is not about
   * the collection at all, and R50 makes the difference load-bearing rather
   * than philosophical: `<ToolbarRow>` returns null on an empty collection,
   * before any slot is considered, so a gear in `actions` would disappear from
   * a team that has no tickets yet — which is the exact moment somebody goes
   * looking for the ticket types. A door out of a screen cannot be gated on
   * the screen having rows.
   *
   * ONE CONTROL, and the title still leads. `justify-between` only appears when
   * something is passed, so every screen that passes nothing renders the
   * byte-identical `<h1>` it rendered before this prop existed — the eyebrow
   * ruling ("nothing above it") and the no-glyph ruling (nothing before the
   * word) both stand untouched, because this sits AFTER the word, on the far
   * side of the line. */
  action?: React.ReactNode
}) {
  // ARBITRATION (R16 iii): a counted tab strip wins THE COUNT. It does not win
  // the page's name.
  //
  // This used to `return null` here, and that is how the Sprints screen shipped
  // with no title at all while every screen beside it had one — the owner found
  // it on 30 Aug 2026 and asked the right question: how did this get past rules
  // this strict. It got past them because it OBEYED them. R16 says a collection
  // shows its count exactly once, and deleting the entire heading satisfies that
  // sentence perfectly. Nothing anywhere said a page must have a name, so nothing
  // objected. A check right about what it checks and silent about what matters.
  //
  // So the badge stands down and the heading stays. Every tabbed screen —
  // sprints, tasks, and any other that grows a counted strip — gets its name
  // back, from one change, because they all came here for it.
  const t = useT()
  const countStandsDown = useCountStandsDown()

  const section = TEAM_SECTIONS.find((s) => s.key === sectionKey)
  const title = section?.title ?? sectionKey
  const badge = countStandsDown ? "" : formatCount(total)
  const heading = (
    /* CLIENT CORRECTION, 2026-08-31, verbatim: "title on main screens still
       way too small! it's currently smaller than in detail screens. makes no
       sense." The reference "Kwapso UI Kit.dc.html" scale names this step
       outright — display-m / 56 / 500 is "Page title" — and a main screen's
       own title is exactly that role. The earlier pass moved this from h3 (24)
       to h2 (32), which was still one step short of the kit's own named step,
       and a detail screen's title (record-chrome.tsx, now h1/44) was left the
       larger of the two. This closes that gap: display-m is genuinely bigger
       than a record's own h1, matching the client's own stated expectation.
       NOTHING SITS ABOVE IT ANY MORE — the eyebrow row that did until
       2026-09-03 is gone (this file's header), so this heading is a single
       node again rather than a fragment holding two. */
    <Headline as="h1" size="display-m" className="flex items-center gap-2">
      {t(title)}
      {badge ? <Badge variant="secondary">{badge}</Badge> : null}
    </Headline>
  )
  // NOTHING PASSED, NOTHING WRAPPED — the heading is returned exactly as it was
  // before `action` existed, so the fourteen screens that do not take a door out
  // are not asked to pay a div for a prop they never use.
  if (!action) return heading
  return (
    <div className="flex items-start justify-between gap-3">
      {heading}
      {action}
    </div>
  )
}
