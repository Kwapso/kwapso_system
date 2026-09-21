"use client"

// R16 on the portal: a collection shows its count, EXACTLY ONCE, and the number
// is an exact server COUNT(*) rendered through the ONE `formatCount` seam —
// imported from the host, never re-implemented (a second copy of the rules would
// be a second set of rules the day either changed).
//
// The agency app arbitrates between two possible places for that number, because
// its screens have counted tabs AND headings and only one may win. The portal has
// no counted tabs, so the arbitration collapses to a rule instead of a context:
// THIS is the only place a count is rendered. A portal screen that wants a count
// renders one of these; a portal component that wants to print a number itself is
// a bug the portal's rules test catches.
//
// `total` is the server's number, straight off the door. Zero or still-loading
// renders nothing at all — never a "0" that reads as an empty collection while
// the rows are still on their way.

import { Badge } from "@shared/ui/components/badge/badge"
import { Headline } from "@shared/ui/components/typography/typography"
import { formatCount } from "@shared/web/format-count"

export function CollectionHeading({
  label,
  total,
  action,
  level = "screen",
}: {
  label: string
  /** the door's exact server total — never a loaded list's length */
  total: number | null | undefined
  action?: React.ReactNode
  /**
   * "screen" (the default) is a portal MAIN SCREEN'S own title, display-m,
   * 56/500, the reference kit's own "Page title" step (see the note kept
   * below). "section" is a SUB-SECTION under a real page title: company-
   * screen.tsx's "Contacts" under the account `<h1>`, home-screen.tsx's
   * "Your company's tickets" under the greeting, ticket-attachments.tsx's
   * "Files and links" on a page with no `<h1>` at all. 21 Sep 2026 audit
   * finding: `CollectionHeading` was reused at all three sites at display-m,
   * which is right for a screen and wrong for a label inside one.
   *
   * "section" is NOT one of `Headline`'s own named sizes stepped down from
   * display-m: the kit's ladder bottoms out at h4 (20), and every rung on it
   * is still a HEADLINE, too loud for a label that introduces a grouped
   * block of content rather than naming the page. That job already has an
   * answer in this app, at exactly this weight, for exactly this reason: the
   * agency's `TicketSidePanel` titles (`web/components/tickets/ticket-
   * detail-body.tsx`'s title row, "Assigned to", "Stakeholders", "Related
   * stories" and the rest), `text-sm` at the kit's medium weight, on an
   * `<h3>` so the outline still nests under whatever real heading precedes
   * it. A portal sub-section is the identical job, a label for a grouped
   * block, never a second page title, so "section" reads at that same
   * register rather than inventing a fourth heading size for one job the
   * app already has a name for.
   */
  level?: "screen" | "section"
}) {
  const count = formatCount(total)
  // CENTRED ON THE TITLE LINE — the agency app's own CollectionHeading carries
  // the full ruling (Aurora, 21 Sep 2026: "EVERYWHERE (not only tickets) align
  // the gear settinsvvutton to middle horozotnal of title"). `items-baseline`
  // aligned `action` to the title text's own baseline rather than the middle of
  // its line box; `items-center` is the same fix this law asks for everywhere
  // else a head draws an action beside its title. Both levels below keep it.
  if (level === "section") {
    return (
      // `flex-wrap` plus the name's own `basis-[12rem]`: a name paired with a
      // Badge is a rigid child (`whitespace-nowrap`) beside a shrinkable one,
      // and on a phone the rigid one wins unless the row can wrap the chip
      // to a second line instead of crushing the name (the same fix
      // ticket-row.tsx's own name block already takes).
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex min-w-0 flex-1 basis-[12rem] items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{label}</span>
          {count ? <Badge variant="secondary">{count}</Badge> : null}
        </h3>
        {action}
      </div>
    )
  }
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      {/* display-m — CLIENT CORRECTION, 2026-08-31, verbatim: "title on main
          screens still way too small! it's currently smaller than in detail
          screens. makes no sense." This used to sit at h3 (24, matching
          SHAPE_HEADING_SIZE.calm — itself a step short because the vendored
          `Title` primitive has no rung above h2/32 at all), then at a bare
          `text-lg` (18) before that. The reference kit names this step
          outright — display-m / 56 / 500 is "Page title" — and a portal main
          screen's title is exactly that role, the same as the agency app's own
          CollectionHeading. */}
      <Headline as="h2" size="display-m" className="flex items-center gap-2">
        {label}
        {count ? <Badge variant="secondary">{count}</Badge> : null}
      </Headline>
      {action}
    </div>
  )
}
