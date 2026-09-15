"use client"

// THE TICKETS SCREEN — one tab strip, one collection, and a triage queue.
//
// It lived inside the deep-link host's collection switch, which was fine while it
// was one strip. CHECKLIST 5.1 added a second ("sub-tabs by TYPE beneath the
// existing All / My / Archived strip") and 5.11 added a queue that is not a
// filter of the list at all, and both needed state of their own — so this is a
// component rather than a branch. The host renders it and hands over the things
// only the host knows: the recipe, the rights, and the two action callbacks.
//
// ── THE REDESIGN, 2026-08-31 ─────────────────────────────────────────────────
//
// This screen used to stack TWO folder tab strips (CHECKLIST 5.1's own
// description above is the fossil of that: "sub-tabs … beneath the existing …
// strip"). The owner had ruled, 2026-08-28, to keep both rather than move one
// into the toolbar ("there's no way out .. lets' keep 2 tabs but both as the
// folder tabs" — `web/test/rules.test.ts`'s `TWO_STRIPS_OK` carried that
// ruling). The CLIENT overruled it the next business day, verbatim: "there can
// never be 2 rows of tabs, no folder tabs, no line tabs. just never." Not a
// narrower version of the 28 Aug ruling — the opposite of it — so this is a
// genuine redesign, not a spacing fix.
//
// WHAT THE TWO STRIPS WERE ASKING were always two different questions:
//
//   the OLD OUTER strip was WHOSE and WHERE — All tickets / Archived, a raiser-
//   scope-turned-VIEW the door has answered as a server scope since tickets
//   started paging;
//
//   the strip that REMAINS is WHAT KIND and HOW FAR ALONG — Ready, then one tab
//   per live `Ticket type` value, then Closed, then All. DERIVED from the
//   team's own vocabulary rather than hard-coded: deactivating "Bug" on the
//   Dropdown values screen takes its tab away, and adding a word adds one.
//
// THREE SHAPES WERE ON THE TABLE. (a) fold Archived in as one more value on the
// remaining strip — rejected, because Archived is orthogonal to kind/stage (an
// archived ticket can be any type, at any stage) and folding it in as a sibling
// of Ready/Issue/Closed would have made "archived Ready tickets" unreachable,
// a real capability the two stacked strips already gave away. (b) move it to
// the toolbar as a plain control — too vague to be a decision. What shipped is
// closer to (c): Archived becomes a real FILTER (`COLLECTION_FILTERS.help`,
// field `view`), the exact shape Accounts' own "Archived" toggle already uses
// beside its Companies/All tab (`web/lib/collection-filters.ts`) — so scope and
// kind/stage stay two REAL, independently-askable questions, just never drawn
// as two tab strips. A tab and a filter compose for free through
// `<PagedFind>`'s own `query` object (paged-find.tsx), so "archived Ready
// tickets" is still one search away, through the toolbar's Filter control
// rather than a second folder strip.
//
// THE TOOLBAR MOVES INSIDE THE CARD, the other half of the same client note
// (verbatim on a screenshot of THIS screen: the search/sort sat on the base
// background, above the peachy panel holding the rows). Accounts hit the
// identical defect the same day and fixed it the identical way
// (`collection-content.tsx`, `accountTabs`): `<PagedFind>`'s `wrap` boxes the
// toolbar AND the rows in one `CollectionCard`, and the tab strip sits directly
// above it with zero gap. Before v1.2.28 that gap had to stay zero so the
// folder tab's own pulled-down feet (`--folder-tab-overlap`) melted into the
// card rather than showing on the base background; the folder shape is gone
// now (tabs-view.tsx's own header has the client's 2026-09-02 ruling) and the
// flush join is kept on its own merits. Tickets and Accounts draw the same
// join.
//
// THE TOOLBAR GAINS A FILTER AND A CREATE BUTTON, the two pieces the old
// search-and-sort-only bar was missing next to Accounts' fixed one: the
// Archived filter above, and a "Raise ticket" button beside the tab row where
// Accounts' New/Import/Export row sits. There is no Export/Import button here
// because there is no export or import door for tickets (SCOPE ch.07 — a
// ticket is a conversation, not an importable record; `internal-money.ts`'s
// neighbour AGENTIC-IMPORT.md says the same about what earns a target). A
// "view selector" beyond the tab strip and the Archived filter is not drawn
// either. The kit's own `ViewSwitch` (`shared/ui/components/collection-frame/
// view-switch.tsx`) is genuinely reached elsewhere now (Apps' Tiles/List,
// Waves' List/Timeline, 1 Sep 2026) — the reason it stays off THIS screen is
// that a ticket has no second real way to look at the same rows, not that
// the control is unproven. A Board grouped by `status` was analysed and
// flagged as real future work (per-status paged reads, an R16 arbitration
// question), not a "no view exists yet" gap.
//
// Every narrowing is still the DOOR's (R14 + R16). Filtering the loaded page
// would answer "the questions among the newest fifty" while the badge above
// counted all of them, which is the failure R16 exists for and the one a
// manager reported as "filter by type, the count doesn't change".
//
// AND ONE TAB IS STILL NOT A FILTER — IT IS THE FIRST ONE NOW (2026-09-06).
// "Triage" swaps the collection for the queue of requests nobody has read, and
// the DOOR decides whether this caller is given that queue at all (CHECKLIST
// 5.11: only the person on duty sees it). A screen that hid a list it had
// already been handed would be a curtain, not a rule.
//
// It sat on the END of this strip until the client's eighth design round, for
// two reasons that were both true and neither of which was about her: it was
// written last, and it is not a narrowing of the list. A strip is read left to
// right in the order the work happens, and triage is the FIRST thing done to a
// ticket — and, for the one person who does it, the only reason to open this
// screen at all. The tab moved; the reasoning is on `tabsConfig` below, and the
// queue behind it is a SITTING rather than a list now (`TriageQueue`'s own
// header has the client's words and the kit component it is built on).

import * as React from "react"

/* THE BOARD AND THE SPLIT — the kit's own, vendored, and both adopted in this
   pass (their `KIT_COMPONENT_EXEMPT` lines were deleted by the same commit —
   R46's rot-check refuses an exemption for a part that is reached). Neither is
   drawn app-side: `OpenBoard` and `ReadySplit` below supply rows and a pane. */
/* `KanbanColumnDot` USED TO BE IMPORTED BESIDE IT, for the tone each column
   head wore. The client took the colour off the column heads on 2026-09-09 (the
   ruling is written out at `COLUMN` below), the kit's `dot` prop is optional and
   is simply not passed any more, so the type has nothing left to constrain. */
/* THE LIST VIEW'S TABLE, composed from the kit's own primitives rather than
   drawn through `RecordTable` — the reason is written out at the `triageView
   === "list"` branch below, and it is R16's: `RecordTable` brings
   `CollectionFrame`, which brings a second search box and a second count onto a
   screen that already has one of each. */

import { InAppLink } from "@/components/shell/in-app-link"
// THE LABELS ONLY. The collection's DEFAULT sort used to be read here too and
// is not any more: which order a tab opens in is a per-tab answer now
// (`helpTabSorts`), and a screen holding both would be two places deciding one
// thing — with the tab's answer silently losing on whichever prop forgot.
import type { TriageWaiting } from "@/lib/api/content"
/* ONE READER OF THIS FILE LEFT, AND IT IS THE STATUS FILTER. `helpStatusDotTone`
   still fills the swatch on each option of the Status facet below (`DOT_TONE_FILL`
   + `helpFacets`), which is a menu of STATUSES and is untouched by the 2026-09-09
   ruling — she took the colour off the board's COLUMN HEADS, not off the app's
   idea of what a status colour is. `waitingDotTone` came with it until that day
   and is gone from `shared/status-tones.ts` entirely: the board's Waiting column
   was its only caller, and an export nobody imports is a contract nobody agreed
   to (web/test/dead-exports.test.ts). */
import { useT } from "@shared/web/language"

/** THE FOUR RECORDS A TICKET POINTS AT — the author, the client, the app and the
 * section — under the words, each wearing its own face, each a link.
 *
 * ══ WHY THIS IS ONE COMPONENT AND NOT FOUR LINES ON THE CARD ════════════════
 *
 * The client is still choosing between three presentations of this block, and
 * said so. So the BLOCK is the unit: the card hands over a ticket and a team,
 * this decides what the four rows ARE (which of them exist, what each one's face
 * is, where each one goes), and the return statement below is the only thing a
 * layout change touches. Swapping the tinted band for a stacked list, a
 * two-column grid or a run of inline chips is one edit in one place, and none of
 * the four destinations, faces or absence rules move with it.
 *
 * ══ THEY ARE LINKS, AND THAT IS R37 RATHER THAN A PREFERENCE ════════════════
 *
 * She asked for links explicitly ("she wants to navigate from them"), and the
 * law decides HOW: the whole post-auth app is one shell that mounts once, so a
 * bare `<a href="/t/…">` throws the document away, re-runs every module from
 * nothing, destroys the warm cache and any running agent, and replays the boot
 * animation — the fault the owner reported on "Manage dropdowns" in exactly
 * those words. `<InAppLink>` is a REAL anchor (middle-click, copy-address and
 * screen readers all still work) with only the plain left click intercepted into
 * `softNavigate`. There is no second way to write this and the census in
 * `web/test/shell-nav.test.ts` reads every component off disk to keep it that
 * way.
 *
 * ══ AND THEY CARRY THEIR FACES, RESOLVED BY THE DOOR (R35) ══════════════════
 *
 * Every one of the four arrives on the triage row already named and already
 * pictured — the client's logo and the author's avatar rode it before today, the
 * app's `logo_url` and the section's emoji were added to `needsTriage` for this
 * block (`workers/content/src/lib/triage.ts` carries the reasoning). NOTHING
 * HERE RESOLVES AN ID. That is not neatness: `accounts` is a paged collection, so
 * a card that looked a client up in the cache this screen holds would have gone
 * blank on the fifty-first client — the bug `record-picker.tsx`'s header is a
 * monument to — and the same trap is one growth spurt away for apps.
 *
 * ══ WHERE EACH ONE GOES, INCLUDING THE AWKWARD ONE ══════════════════════════
 *
 *   AUTHOR   `/accounts/<contactId>`. A contact is a row of the SAME `accounts`
 *            table a company is (SCOPE ch.03) — there is no contacts table, and
 *            `deep-link-screen.tsx`'s own open-intent rewrites `contacts` to
 *            `accounts` for this exact reason. Never a second `/contacts/<id>`
 *            address for a record that already has one.
 *   CLIENT   `/accounts/<accountId>`. The same door, the other kind of row.
 *   APP      `/apps/<appId>`.
 *   SECTION  `/apps/<appId>?tab=modules` — AND THIS ONE IS WORTH READING. A
 *            module has no address of its own anywhere in this product: no
 *            segment in `TEAM_SECTIONS`, no detail recipe, no branch in
 *            `module-content.tsx`, and `relationship-map.tsx` deliberately omits
 *            `app_modules` from its `RECORD_PATH` because a module is a division
 *            OF an app rather than a record with a screen. Two ways to honour
 *            "make it a link": invent `/modules/<id>` and the screen behind it —
 *            a feature nobody asked for, on the strength of one chip — or send
 *            the reader to the one place the module actually is, which is its
 *            app's Modules tab. The tab was not addressable either, so it was
 *            given an address (`app-detail.tsx`, the same six lines
 *            `account-detail.tsx` already uses for `?tab=organisation`). The
 *            module and the app therefore land on the same RECORD and different
 *            TABS, which is the honest picture of what a module is.
 *
 * A ROW WITH NO NAME IS NOT DRAWN, and each absence is ordinary rather than an
 * error: a ticket raised by the agency has no client, one nobody has attributed
 * has no author, a ticket about no app has neither app nor section. Three of
 * those four are readiness gaps, so the card already says out loud why it cannot
 * move — a placeholder here would be the same complaint twice. AND A ROW WITH A
 * NAME BUT NOWHERE TO GO IS DRAWN WITHOUT A LINK rather than dropped: `href` is
 * nullable for the one shape that can occur, a section on a ticket whose app id
 * is missing, where there is genuinely no destination. Losing the fact would be
 * worse than losing the link. */
export function TriageMeta({ teamId, ticket }: { teamId: string; ticket: TriageWaiting }) {
  const t = useT()
  /** THE FOUR, DECIDED ONCE. Everything a presentation could want to know is
   * settled here — whether the row exists, what it is called, what its face is,
   * which box that face wears and where it goes — so the JSX below is pure
   * layout and a different layout inherits all of it. `shape` is the one that
   * is easy to get wrong twice: a person in their own right is a CIRCLE and
   * everything else is a rounded square, which is `record-mark.tsx`'s rule and
   * not this file's to restate per row. */
  /* ONE ROW NOW, NOT FOUR — client, 2026-09-06: "at the bottom, in the quiet
     style, just the author with the avatar."

     The client, the app and the module were all here for one round and have
     gone three different ways. The APP moved UP into the eyebrow as a chip, the
     client and the module are simply not on this card any more: they live on
     the ticket, one press of Open away. That is a real subtraction and it is
     hers — the card is scanned forty times a sitting, and every item on it is
     a thing the eye has to reject before it reaches the words the customer
     wrote.

     KEPT AS AN ARRAY OF ONE rather than collapsed into a single node, because
     the shape is what made swapping presentations a one-edit job last round and
     the client has moved this block three times in two days. A second row costs
     one object here, not a rewrite of the render. */
  const rows = [
    ticket.raisedByContactName && {
      key: "author",
      label: t("Raised by"),
      name: ticket.raisedByContactName,
      picture: ticket.raisedByContactLogo,
      mark: null,
      shape: "round" as const,
      path: ticket.raisedByContactId ? `accounts/${ticket.raisedByContactId}` : null,
    },
  ].filter(Boolean) as {
    key: string
    label: string
    name: string
    picture: string | null
    mark: string | null
    shape: "round" | "square"
    path: string | null
  }[]

  return (
    // ── THE DEFAULT PRESENTATION: A TINTED BAND ──────────────────────────────
    // One quiet band under the words, the four rows reading left to right in the
    // order the client named them, thin rules between. `bg-surface-quiet` is a
    // real tone step off the card the queue draws on (and has a dark half of its
    // own), which is what makes this read as a footer to the description rather
    // than as more description. R31: the box radius, the only one a box may
    // take. `flex-wrap` because on a phone four faces and four names do not fit
    // on one line and a horizontally scrolling band is worse than a wrapped one.
    // THE TINT IS GONE WITH THE OTHER THREE ROWS. A band earned its ground
    // when it held four facts that needed separating from the description; one
    // byline does not, and a second quiet block would now sit directly above the
    // picker's own well — two tinted grounds stacked, which is the defect the
    // band was drawn to avoid in the first place. Quiet style, as asked: small,
    // muted, no fill of its own.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {rows.map((r, i) => (
        <React.Fragment key={r.key}>
          {/* THE THIN RULE, and it is a FILL rather than a border — the same 1px
              tick `record-picker.tsx`'s own divider draws, for the same reason
              (BUILD-A-SCREEN.md §6.1: separation is a fill or an inset shadow,
              never a CSS border). `aria-hidden` because the grouping it marks is
              visual; each row already carries its own label in words. */}
          {i > 0 && <span aria-hidden className="bg-border h-5 w-px shrink-0" />}
          <span className="flex min-w-0 items-center gap-1.5 text-xs">
            {/* WHAT KIND OF THING THIS IS, in words rather than by position.
                Four faces in a row with no labels is a puzzle: an app's logo and
                a client's logo are the same shape, and on the tickets where both
                are wordmarks they are the same KIND of picture too. */}
            <span className="text-muted-foreground">{r.label}</span>
            {/* NO FACE HERE — client, 2026-09-06: "author inside the card is
                no icon." The byline is one linked name under the words now, and
                a 20px round picture beside it was the last decoration on a card
                she has spent a day stripping: the client went, the module went,
                the readiness sentence went, Reply and Edit went. R35 ("a record
                is known by its picture") is not broken by this — it governs
                where a record is OFFERED or LISTED, and this is a byline, not a
                choice. The picker that offers people still draws every face,
                which is where telling two colleagues apart actually matters.

                `picture`/`mark`/`shape` stay on the row above rather than being
                deleted with the element: they are what a different presentation
                would need, and this block has moved three times in two days. */}
            {r.path ? (
              // THE TEAM PREFIX IS COMPOSED HERE, IN A TEMPLATE LITERAL, and
              // that is R20's render-side census rather than a style choice
              // (`web/test/rich-text.test.ts`): every URL bound to an anchor in
              // either front door must be a literal we wrote, an inline
              // `safeHref(…)`, or a named exemption. Handing the attribute a
              // field off a row object is none of those, and it is refused for a
              // good reason — a URL arriving from an object is a URL a reviewer
              // cannot see the origin of. So the row above carries the
              // RECORD-RELATIVE address (`accounts/<id>`, a fixed segment and an
              // id) and the shell prefix is written where the anchor is.
              // `InAppLink` puts the whole thing through `safeHref` again on the
              // way to the DOM, which is its own seam and not this file's to
              // repeat.
              //
              // AND THAT CENSUS READS RAW SOURCE, comments included — so this
              // paragraph may not spell the attribute-plus-brace shape it is
              // about, or it reports itself. Learned here, the ordinary way.
              <InAppLink
                href={`/t/${teamId}/${r.path}`}
                className="text-foreground truncate underline-offset-2 hover:underline"
              >
                {r.name}
              </InAppLink>
            ) : (
              // NO DESTINATION, SO NO LINK — never a dead anchor. See the
              // header: this is the section-without-an-app case, and the fact
              // is worth more than the affordance.
              <span className="text-foreground truncate">{r.name}</span>
            )}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}
