# Tickets

## What it is

A **Ticket** is something an Account has asked the agency for, a question, a
problem, a change, and it lives in Tickets until it's sorted (`shared/glossary.ts`
`ticket`). It carries the conversation (its thread), the request's fixed
lifecycle, and the client's stakeholders on it; the work the agency actually
does about a ticket is a separate record, a **Story**, that the ticket derives
its own picture from. The URL segment and every word a person reads say
"tickets"; the permission the server checks, the tables, the API path and the
MCP tool names are still `help`, on purpose (`web/lib/screens.ts`'s
`MODULE_PERMISSION` map, `documents/DATA-MODEL.md` § *help + help_threads*) —
renaming a permission string already written into every role's sheet in every
team database would only take access away, so the address bar and the
database deliberately disagree on the word.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Tickets list (`tickets.list`) | list, paged, sub-tab strip (Triage / Ready / team kinds / Closed / All) | `/tickets`, `/t/<teamId>/tickets` |
| Ticket detail | bespoke (`help-detail.tsx`, thread + stages + attachments + stakeholders) | `/t/<teamId>/tickets/<id>` |
| Tickets dashboard tab | bespoke, agency-only grouped reads | ticket module's Dashboard tab |
| Triage queue | bespoke (`triage-queue.tsx`) | Triage sub-tab |

There is no ticket detail `ScreenRecipe` (`BASE_RECIPES` only carries
`tickets.list`) — a ticket's status ladder, its reply thread and its stakeholder
panel are all controls no engine block draws, so the detail is host-composed
(`web/components/tickets/help-detail.tsx`, `ticket-detail-body.tsx`).

## Doors

All served by `workers/content/src/index.ts`'s `ROUTES` table, gated with the
shared `gated`/`gatedBody` opening (`workers/content/src/routes/help.ts`) on
the `help` module.

| Route | Does |
|---|---|
| `GET /api/content/help` | list tickets, paged (`help:read`) |
| `GET /api/content/help/thread` | one ticket's replies (`help:read`) |
| `POST /api/content/help` | raise a ticket (`help:create`) |
| `POST /api/content/help/update` | edit a ticket (`help:update`) |
| `POST /api/content/help/status` | move a ticket along its fixed lifecycle (`help:update`) |
| `POST /api/content/help/bulk-status` / `bulk-status-by-filter` | move many tickets to one status (`help:update`) |
| `POST /api/content/help/rank` | drag-rank a ticket (`help:update`) |
| `POST /api/content/help/archive` | archive / restore a ticket (`help:update`) |
| `POST /api/content/help/reply`, `/reply/update`, `/reply/delete` | thread a reply, edit or take one back (`help:create`/`help:update`) |
| `POST /api/content/help/resolve` | resolve + reply + email the client (`help:update`) |
| `GET /api/content/help/dashboard` | the Dashboard tab's grouped reads, agency only |
| `GET /api/content/help/stages` | a ticket's stage history + time in each, agency only |
| `GET`/`POST /api/content/help/rating` | how the agency did on a ticket |
| `GET`/`POST /api/content/help/stakeholders` | a ticket's stakeholders |
| `GET`/`POST /api/content/help/attachments`, `/attachments/remove` | ticket files |
| `POST /api/content/help/triage-read` | the two acts the ladder can't infer on its own |

## Business rules

- A ticket cannot resolve, and cannot be archived, while a running work-log
  timer is against it — `refuseWhileTimerRuns` is called from both `setStatus`'s
  `resolved` branch and `setTicketArchived` in `workers/content/src/lib/help.ts` — `R99`
- A ticket's status move is idempotent: the `UPDATE … WHERE status <> ?`
  predicate rides every status write, so re-resolving an already-resolved
  ticket writes no second history row and pings nobody — `R17`
- A ticket's `ref` (the number a client quotes, e.g. `BERG-T0412`) is minted
  once through `canonicalRef` and is never rewritten in place — a `UNIQUE`
  partial index, `idx_help_ref ON help (ref) WHERE ref IS NOT NULL` — `R55`
- The tickets list is a collection that only grows, so it pages by key rather
  than capping — `help` is a `GROWING_COLLECTIONS` entry (`shared/rules/registry.ts`) — `R14`
- A ticket detail screen reads a ticket past the loaded page by its own ID
  (`help:one:<id>`) rather than `.find()`-ing it out of the cached list, which
  only holds the loaded prefix — `R38`
- Every non-GET ticket route opens with the shared `gated`/`gatedBody` wrapper
  before it reads a body or touches a row — `workers/content/test/gating-seam.test.ts`
- Every ticket mutation calls `publishChange` so open lists and the open
  thread patch just the changed row — `workers/content/test/publish-seam.test.ts`
- Every body field a ticket door reads is validated positionally at the
  boundary (`requireText`/`optionalText`/`queryText`) — `workers/content/test/validate.test.ts`
- The resolve email (one of only two sends in the product that reach a
  customer's inbox) is classified `record` and carries a link back to the
  ticket, built through the one `record-link.ts` helper, and that link points
  at the recipient's own front door — `R30`
- A ticket's own reply thread, its stage history and the agency's triage rota
  all read their cross-module activity gate as `help` — `ACTIVITY_GATE_MAP`
  in `shared/rules/registry.ts` — `R18`
- A ticket's chip row (id, status, type) is built through the one
  `orderChips()` seam rather than hand-assembled JSX — `R94`
- The Dashboard and Stages doors refuse a client login at the door; every
  route a Client-role caller can reach through the portal is a reasoned
  subset of what the agency gateway serves — `R21`
- A ticket's tab-strip counts (Triage / Ready / Closed / All) render through
  the one `formatCount` seam, never a second hand-rolled count —
  `web/components/tickets/tickets-collection.tsx` — `R16`

## Edge cases

- The list `SELECT` is deliberately "fat": `TICKET_COLS` carries every field
  the detail screen renders (including `screen_recording_link` and
  `source_screen`, which the list card never shows), not just the columns the
  list displays — trimming it without checking `help-detail.tsx` first breaks
  the detail screen silently (`documents/EDGE-CASES.md` § *the list cache
  paints a detail screen*).
- `new` is deliberately the pre-triage state: a ticket does not leave it until
  it names a type, a client, an app and who raised it (`shared/triage-readiness.ts`),
  enforced by `markTriaged` so the agent and MCP obey the same rule.
- `awaiting_validation` was a seventh status, retired 7 Sep 2026; a ticket that
  passed through it historically still reads back correctly via
  `RETIRED_HELP_STATUSES` (`shared/types.ts`).

## Open issues

- The tickets sub-tab strip's type mark was a colour, then an icon
  (`ticketTypeIconName`, 17 Sep 2026); the `ticketsListRecipe`'s own `leading:
  "mark"` slot is unreachable dead configuration now that
  `tickets-collection.tsx` composes its own rows — left named rather than
  deleted because a cold account's empty state still reads from the recipe.
- Sorting a ticket's own record panels (attachments, stakeholders) that page
  inside the record has no control yet; the door support (`sort`/`dir`) exists
  on `/api/content/help`, the panel-side control does not (`documents/BASE-IMPROVEMENTS.md` #33b).
