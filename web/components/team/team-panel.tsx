// THE TEAM TAB'S OWN SPACING RHYTHM — no longer a ground.
//
// ── WHAT THIS FILE WAS, KEPT FOR THE NEXT READER ────────────────────────────
//
// It used to paint `bg-surface-panel` behind the Members wall and the Roles
// matrix, earned by the client's own words, 2026-09-09:
//
//   "more members in each row, too much blank space. needs container!! nothing
//    on top of white background, its a rule!"
//
// At the time that was a real bug, not a style choice: both sections drew a
// bare `<section>` on `<body className="bg-background">`, and their member
// cards were `Card variant="raised"` — `bg-card`, which in light mode is the
// SAME literal colour as `--background` (#FFFEF9). Contrast 1.000, held up by
// the card's own shadow alone. This file existed to give those cards the
// panel they needed to read against.
//
// ── WHY IT DOES NOT ANY MORE, AS OF 23 SEP 2026 ─────────────────────────────
//
// Aurora, verbatim, 23 Sep 2026, over the whole settings module: "the whole
// settings module does not have the mibnimal aspect! Make minimal the whole
// app, not only tickets anymore." Read against R67 (21 Sep 2026: plain is the
// DEFAULT now) and `PAPER_ON_PURPOSE` (the five things a grouping section may
// still stand on paper for — a conversation card, an empty or error state, a
// tile, a well, or a not-a-section) rather than against this file's own
// history: this component is none of those five. It is a plain grouping
// wrapper, and the 2026-09-09 bug it fixed no longer exists at either of its
// two remaining call sites, for two independent, verified reasons — not
// because a paragraph says so, because the tokens say so:
//
//   MEMBERS (members-gallery.tsx). The member cards moved from
//   `variant="raised"` (`bg-card`, the 1.000 bug) to `variant="default"`
//   (`bg-surface-panel`, soft paper) on 21 Sep 2026, the same day this app
//   went plain-by-default — the identical move Accounts, Apps and Contacts
//   made to their own gallery cards, and `members-gallery.tsx` is already
//   named in `PAPER_ON_PURPOSE` for exactly this reason (a per-record card in
//   a grid, standing on the plain page). A soft-paper card already reads at
//   1.103 against the plain page directly. Wrapping that wall in ANOTHER
//   soft-paper band (this file's own fill) put a `bg-surface-panel` card
//   inside a `bg-surface-panel` panel — the 1.000 bug, recreated in the other
//   direction, by the interaction of two separate, later, individually
//   correct changes.
//
//   ROLES (roles-matrix.tsx). The kit's `PermissionMatrix` (shared/ui/
//   components/permission-matrix/permission-matrix.tsx) draws a bare
//   `<table>` at width ≥45rem with no fill anywhere in its body — verified
//   off the kit's own source, which carries exactly two hard-coded `bg-*`
//   classes in the whole file, both on the narrow (<45rem) per-module cards,
//   which paint their own soft paper regardless of context (a not-a-section
//   reading, same as any other per-item card). The ONLY other background the
//   kit ever paints is the sticky name column, and only when `stickyNames` is
//   set — through `stickyGround`, a prop the kit defaults to `"page"`
//   (`bg-background`) for exactly this "no panel behind the grid" case.
//   `roles-matrix.tsx` used to override it to `"panel"` to match this file's
//   own fill; now that this file paints nothing, it reads `"page"` instead —
//   the kit's own supported answer, not a workaround.
//
// So both remaining calls are now spacing-only. `narrowGround` is kept in the
// signature, UNUSED, rather than deleted: `members-gallery-toolbar.test.tsx`
// and `roles-matrix-toolbar.test.tsx` assert the literal `<TeamPanel>` /
// `<TeamPanel narrowGround={false}>` JSX text at both call sites (proving the
// toolbar sits OUTSIDE this wrapper's own box, R83) — an assertion that is
// still true and still worth keeping, and rewriting two call sites' JSX text
// to satisfy a prop this file no longer reads would be exactly the kind of
// change that turns a real invariant into noise. If a THIRD caller ever wants
// this component again for genuine soft paper, that is a new decision to
// write down, not a default to fall back into.

import * as React from "react"

import { cn } from "@shared/ui/lib/utils"

export function TeamPanel({
  children,
  className,
  /** UNUSED as of 23 Sep 2026 — see this file's own header. Kept so neither
   * call site's JSX text has to change for a prop that decided a fill this
   * component no longer paints. */
  narrowGround: _narrowGround = true,
}: {
  children: React.ReactNode
  className?: string
  narrowGround?: boolean
}) {
  return <div className={cn("flex min-w-0 flex-col gap-4", className)}>{children}</div>
}
