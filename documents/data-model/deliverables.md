### deliverables. KEEP (BUILT 2026-08-18, team migration `0036_deliverables`). WHAT WE HAND OVER

One table, hanging off an **app**, and the whole of it is the owner's own
sentence about what the word means: *"handover materials / handover docs / API
documentation / loom or teller reviews / SOPs of how to use the app, etc."* So a
deliverable is a piece of MATERIAL with a **kind**, a **title**, a **date** and
something it points at. CHECKLIST 8.7 sat parked for weeks because nobody had
said that; it is a module rather than a tab because a table, a permission row and
a machine surface are what a shelf needs to exist at all.

| Column | What it is |
|---|---|
| `app_id` | NOT NULL. The legacy app hung these off apps too (`glide/RECONCILIATION.md`: 8 rows, *Name, type, a content URL and a thumbnail*), and the reason is that file's own headline, the customer is the owner but the **app is the unit of work**. A handover doc with no system to hand over is not a record anybody could file. |
| `account_id` | Denormalised from the app at creation and never edited, exactly as `processes` and its three children carry it, so the account fence rides ONE clause with no join. |
| `title` · `kind` · `dated_on` | What the card shows: a name, the word in small caps, and the day. `kind` pick-or-creates into the **Deliverable kind** dropdown group (`shared/selectable-groups.ts`) — a vocabulary and not an enum, because the owner's list ends in "etc." `dated_on` is a calendar DAY through `optionalDate`. |
| `url` | ONE column for TWO shapes: an object we host (a `/media/internal/…` URL the upload door minted) or a link we do not (a Loom recording, a Google Doc, an API reference). The same sentence `brand_assets.file_url` makes, for the reason `help_attachments` gives at length — "here is the thing I mean" is one act, and two columns would be two ways to be wrong about which is set. Everything stored goes through `safeExternalLink`. |
| `image_url` | The picture on the card, when there is one. Separate from `url` because a Loom link carries no thumbnail of its own and a PDF is not its own preview. |

**THE FENCE IS BUILT, AND SWITCHED OFF.** This is the one table in the app whose
rows genuinely are the client's — the material is what we hand them — and it is
still agency-only today: no door is on the portal gateway's surface, every one of
the five opens with `refusePortalCaller` (R21), and nothing in `web-portal/`
names the table or the paths, proved off disk by
`workers/content/test/deliverables.test.ts`. Whether a client may see their own
handover shelf is a product decision the owner has not made, and the base's rule
is that an unmade decision is a closed door. `account_id` is what makes opening
it later a door change rather than a data migration.

**Its history gates on its own module** (`ACTIVITY_GATE_MAP.deliverables`), not on
`processes`: "Ana handed over the Payroll API reference" names a deliverable, and
a role that may open the app but not its shelf must not read that sentence out of
the feed either (R18). The live ping carries the **app's** id rather than the
deliverable's, the shape `account_links` already has. The retired account rate
card had it too, until 10 Sep 2026 — a
deliverable has no list and no screen of its own, so the app is the one row a
listener can act on.

