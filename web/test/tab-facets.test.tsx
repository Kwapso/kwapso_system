import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { ticketFacets, triageFacets } from "@/components/tickets/tickets-collection"
import { COLLECTION_FILTERS } from "@/lib/collection-filters"
import {
  HELP_TOOLBAR_FACET_FIELDS,
  helpFacetFilter,
  helpTabFacets,
  OPEN_FACET,
  WAITING_FACET,
} from "@/lib/live-resources"
import {
  HELP_STATUSES,
  OPEN_TAB_STATUSES,
  type HelpStatus,
} from "@shared/types"
import type { TriageWaiting } from "@/lib/api/content"
import { stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")

/* ══════════════════════════════════════════════════════════════════════════
   WHICH FILTERS A TICKET TAB OFFERS — THE RULE, NOT THE FIVE LISTS.

   ── WHAT IS BEING PINNED, AND WHY IT IS THE RULE ──────────────────────────

   The client named the filter set for five of the seven ticket tabs on
   2026-09-07 (her words are on `helpTabFacets`, web/lib/live-resources.ts).
   A test that asserted her five answers back would pass on the day it was
   written and say nothing at all about the sixth tab, or the eighth — and an
   over-offered facet is invisible: a Status select on a tab that holds one
   status looks exactly like a Status select on a tab that holds four. It draws,
   it opens, it has a value in it. The only thing wrong with it is that it
   cannot change the answer.

   So this suite drives the real functions over EVERY TAB THE STRIP DRAWS, read
   off the component's own source, and asserts each one against a span computed
   independently from the tab's own door query. A tab added tomorrow is covered
   the moment it is typed into the array, without anybody editing this file —
   which is the whole property the client's ruling needs and the one a list of
   five could never have.

   ── AND THE THREE THINGS THAT ARE NOT THE RULE ────────────────────────────

   Beside it: the Type facet never offers the kind that is kept but never shown;
   every facet on a PAGED tab is a door parameter rather than a filter over the
   rows in hand (R14/R16 — the queue's own facets are the deliberate exception
   and the suite says why); and the Status facet's words are the server's closed
   vocabulary rather than whatever is on the page.

   NOT A LAW OF THE BASE. It governs one screen's controls rather than a shape
   every module must take, so it is a plain regression suite beside
   `default-tab-is-first.test.ts` rather than a registry entry and a RULES.md
   row — the same weight, for the same reason.
   ══════════════════════════════════════════════════════════════════════════ */

/** `t`, for a test. The facet LABELS go through it and the DATA labels (a
 * client's name, an app's name, a team's own ticket kind) deliberately do not,
 * so an identity function is the honest stand-in: it proves which strings were
 * offered to the dictionary without pretending to be one. */
const t = (english: string) => english

const src = readFileSync(join(WEB, "components/tickets/tickets-collection.tsx"), "utf8")
/** …AND THE SAME FILE WITH ITS PROSE TAKEN OUT. Every assertion about what the
 * screen DOES reads this one: this file's own comments quote the patterns it
 * forbids (the `rows.filter(` note beside `narrowTriage` is a paragraph about
 * why that shape is banned), and a census that matched them would fail on a
 * sentence explaining the rule it is enforcing. Same seam the Laws' own
 * censuses use, for the same reason. */
const code = stripComments(src)

/** ANY `.filter(` HANGING OFF THE FIND BAR'S OWN ROWS, whatever the layout.
 *
 * The `\s*` before the dot is not cosmetic and it is not free. Until
 * 2026-09-07 this was the literal `\brows\.filter\(` — so a chain broken after
 * `rows` was invisible to it, this file's assertion below was passing on
 * whitespace, and `tickets-collection.tsx` carried a paragraph telling the next
 * reader to KEEP the line break so the suite would stay green. The law that
 * owns this shape (`web/test/paged-search.test.ts`, R14's search half) was
 * fixed the same way and on the same day; this is its screen-local echo. */
const NARROWS_LOADED_ROWS = /\brows\s*\.filter\(/g

/** THE BOARD'S OWN SOURCE, AND THE SCREEN WITHOUT IT — one slice, taken once,
 * because two assertions need opposite halves of it: inside the `<Kanban>` tag
 * a `rows.filter(` is a PARTITION and is checked as one, and outside it there
 * may be none at all. Offsets rather than just the text, so "the rest of the
 * screen" is exactly the complement and nothing falls between the two. */
const BOARD = (() => {
  const at = code.indexOf("<Kanban")
  const end = code.indexOf("\n    />", at)
  return { at, end, text: at < 0 || end < at ? "" : code.slice(at, end) }
})()

/** THE SECOND BOARD — 17 Sep 2026, "also add this board view by status in
 * general tickets, all". One screen, two `<Kanban>` tags now (Open's above,
 * All's below it), so the FIRST occurrence past `BOARD.end` is unambiguously
 * this one — the same slicing `BOARD` itself does, just started further in. */
const ALL_BOARD = (() => {
  const at = code.indexOf("<Kanban", BOARD.end)
  const end = code.indexOf("\n    />", at)
  return { at, end, text: at < 0 || end < at ? "" : code.slice(at, end) }
})()

/** EVERY TAB TOKEN THE STRIP DRAWS, resolved off the component's own source.
 *
 * Two reads, because the strip is written in two halves. The `tabs: [` array
 * names CONSTANTS (`{ value: TRIAGE, … }`) and the constants are declared above
 * it, either as a literal (`const CLOSED: HelpFacet = "status:resolved"`) or as
 * an alias for a token `live-resources.ts` builds (`const OPEN = OPEN_FACET`).
 * Resolving them here rather than importing them is deliberate: they are module
 * -private on purpose, and exporting seven constants so a test could read them
 * would be the test changing the shape of the thing it checks. */
function stripTabs(): { name: string; token: string }[] {
  const literal = new Map(
    [...src.matchAll(/^const ([A-Z_]+): HelpFacet = "([^"]+)"/gm)].map((m) => [m[1], m[2]])
  )
  // The two ALIASES (`const OPEN = OPEN_FACET`), resolved through the exported
  // tokens themselves rather than by copying what they spell today — so the day
  // "Open" stops meaning three stages, this census follows it instead of
  // checking a stale string.
  const exported: Record<string, string> = { OPEN_FACET, WAITING_FACET }
  for (const m of src.matchAll(/^const ([A-Z_]+) = ([A-Z_]+)$/gm))
    if (exported[m[2]] !== undefined) literal.set(m[1], exported[m[2]])
  const arrayAt = src.indexOf("tabs: [")
  expect(arrayAt, "could not find the tab strip's `tabs: [` array").toBeGreaterThan(-1)
  const array = src.slice(arrayAt, src.indexOf("\n    ],", arrayAt))
  const names = [...array.matchAll(/\{\s*value:\s*([A-Z_]+)\s*,/g)].map((m) => m[1])
  return names.map((name) => {
    const token = literal.get(name)
    expect(
      token,
      `the strip draws a tab called ${name} and this census cannot resolve its token. ` +
        "Teach it the new spelling rather than deleting the case — an unresolved tab is a tab nothing checks."
    ).toBeDefined()
    return { name, token: token as string }
  })
}

/** THE SPAN, COMPUTED INDEPENDENTLY OF `helpTabFacets`.
 *
 * Deliberately a second implementation rather than a call into the thing under
 * test: a check that asks the code what it thinks and then agrees with it is a
 * parser agreeing with itself. This reads the tab's DOOR QUERY — the same one
 * `<PagedFind>` spreads into `fetchPage`, which is the ground truth about what
 * a tab can contain — and derives the answer from the door's own vocabulary. */
function spanOf(token: string): { statuses: HelpStatus[]; derived: boolean; pinned: string[] } {
  const query = helpFacetFilter(token)
  const statuses =
    query.status === undefined
      ? [...HELP_STATUSES]
      : query.status
          .split(",")
          .map((w) => w.trim())
          .filter((w): w is HelpStatus => (HELP_STATUSES as readonly string[]).includes(w))
  return {
    statuses,
    derived: Object.keys(query).some(
      (k) => !(HELP_TOOLBAR_FACET_FIELDS as readonly string[]).includes(k)
    ),
    pinned: Object.keys(query).filter((k) =>
      (HELP_TOOLBAR_FACET_FIELDS as readonly string[]).includes(k)
    ),
  }
}

/** The four the toolbar draws, in the client's own reading order. Read off the
 * collection's own declaration rather than typed here, minus `view` — which is
 * the archive SCOPE rather than a facet over a ticket's fields and is offered
 * on every tab unconditionally (`collection-filters.ts` carries that ruling). */
const RULED_FIELDS = COLLECTION_FILTERS.help.map((f) => f.field).filter((f) => f !== "view")

describe("which filters a ticket tab offers", () => {
  it("finds the strip's tabs at all", () => {
    // THE BLINDNESS TRIPWIRE. Every assertion below is a loop over this list, so
    // a census that resolved nothing would pass every one of them silently —
    // which is the failure mode a source-reading check has and a hand-list does
    // not. The strip has drawn seven tabs since 2026-09-06; five is a floor with
    // room to lose two without this going quiet.
    expect(stripTabs().length).toBeGreaterThan(4)
  })

  it("declares exactly the client's four, in her order, plus the archive scope", () => {
    // Her words, 2026-09-07: "client, app, type, and status". The ORDER is what
    // the filter panel reads top to bottom, so it is part of the ruling rather
    // than an implementation detail.
    expect(RULED_FIELDS).toEqual(["accountId", "appId", "helpType", "status"])
    expect(
      COLLECTION_FILTERS.help.map((f) => f.field),
      "Archived is the archive SCOPE, kept deliberately and last — see collection-filters.ts"
    ).toEqual(["accountId", "appId", "helpType", "status", "view"])
  })

  it("offers a facet only where the tab spans more than one value of its field", () => {
    for (const { name, token } of stripTabs()) {
      const offered = helpTabFacets(token)
      const span = spanOf(token)

      // ── THE THREE SINGLE-VALUED PARAMETERS ────────────────────────────────
      // The door takes one client, one app and one kind, so "the tab pins it"
      // and "the tab spans one value of it" are the same sentence.
      for (const field of ["accountId", "appId", "helpType"] as const) {
        expect(
          offered[field],
          `${name} ${span.pinned.includes(field) ? "pins" : "does not pin"} \`${field}\`, so it must ${
            span.pinned.includes(field) ? "NOT " : ""
          }offer that facet — a select whose only value is the one already in force is a control with nothing to control`
        ).toBe(!span.pinned.includes(field))
      }

      // ── STATUS ────────────────────────────────────────────────────────────
      // NEVER EXACTLY ONE. This is the whole ruling in one line, and it holds
      // whatever else is true of a tab: Triage, Ready and Closed each pin one
      // stage, and a Status control on any of them offers a single word.
      expect(
        offered.statuses.length,
        `${name} would offer a Status facet with exactly one option — that is the control this rule exists to remove`
      ).not.toBe(1)

      const shouldOffer = !span.derived && span.statuses.length > 1
      expect(
        offered.statuses.length > 0,
        shouldOffer
          ? `${name} spans ${span.statuses.length} statuses and is not a derived tab, so it must offer Status`
          : `${name} must NOT offer Status — it ${span.derived ? "is a DERIVED tab, whose status clause is scaffolding borrowed from Open rather than the tab's own range" : `spans only ${span.statuses.length} status`}`
      ).toBe(shouldOffer)

      // …AND THE WORDS ARE EXACTLY THE ONES THE TAB CAN CONTAIN. A stage a tab
      // cannot hold is a filter that returns nothing under a badge counting
      // rows it excluded.
      if (shouldOffer) expect(offered.statuses).toEqual(span.statuses)
      for (const s of offered.statuses)
        expect(
          (HELP_STATUSES as readonly string[]).includes(s),
          `${name} offers "${s}", which is not one of the door's own stages`
        ).toBe(true)
    }
  })

  it("reproduces the client's own five answers — and derives the sixth she never named", () => {
    /* HER RULING, KEYED BY TOKEN. This is the CROSS-CHECK, not the mechanism:
       the loop above is what would catch a new tab, and this is what proves the
       rule the loop applies is the rule she asked for. If the two ever disagree
       it is this file that is wrong about her words, or the rule is.

       READY IS IN THIS TABLE AND WAS NOT IN HER MESSAGE. She named Open,
       Waiting, Closed, All and Triage; Ready she did not mention. The rule
       settles it rather than a guess doing so — `status:ready` is ONE status, so
       Status would offer one word — and it is the same answer the rule gives
       Closed and Triage, which she did name. That is why it is written here as
       an ordinary row rather than as an exception. */
    const HERS: Record<string, string[]> = {
      "status:ready": ["accountId", "appId", "helpType"], // Ready — derived, not named
      [OPEN_FACET]: ["accountId", "appId", "helpType", "status"], // "On open …"
      waiting: ["accountId", "appId", "helpType"], // "On waiting, client, app, and type"
      "status:resolved": ["accountId", "appId", "helpType"], // "On closed client app type"
      all: ["accountId", "appId", "helpType", "status"], // "On all client app type status"
    }
    for (const [token, fields] of Object.entries(HERS)) {
      const offered = helpTabFacets(token)
      const got = [
        offered.accountId && "accountId",
        offered.appId && "appId",
        offered.helpType && "helpType",
        offered.statuses.length > 0 && "status",
      ].filter(Boolean)
      expect(got, `the tab \`${token}\` does not offer what the client asked for`).toEqual(fields)
    }
    /* The Open tab's Status offers exactly the stages it SPANS and none of the
       ones it does not. "Resolved" is the one that would be most obviously
       wrong, and `new` the one that would be quietly wrong.

       READ OFF `OPEN_TAB_STATUSES` RATHER THAN TYPED OUT, and 2026-09-07 is why:
       the client ruled "in open, include status ready and waiting", `ready`
       joined that array (shared/types.ts carries the ruling and what it cost),
       and this line had spelled the old three — so it would have failed while
       being perfectly correct about a set nobody uses any more. A test that
       copies the constant it is checking measures the copy. What is worth
       asserting here is the RELATIONSHIP: the facet's options are the tab's own
       span, in the tab's own order, with the stages outside it absent. */
    expect(helpTabFacets(OPEN_FACET).statuses).toEqual([...OPEN_TAB_STATUSES])
    for (const outside of HELP_STATUSES.filter(
      (st) => !(OPEN_TAB_STATUSES as readonly string[]).includes(st)
    ))
      expect(
        helpTabFacets(OPEN_FACET).statuses,
        `the Open tab offers "${outside}", a stage its own list cannot contain`
      ).not.toContain(outside)
    expect(helpTabFacets("all").statuses).toEqual([...HELP_STATUSES])
  })

  it("draws exactly those facets, with the marks each record wears elsewhere", () => {
    // THE RULE REACHING THE CONTROL. Everything above is about `helpTabFacets`;
    // this drives the function the toolbar actually calls, so a rule computed
    // correctly and then ignored at the call site cannot pass.
    const apps = [
      { id: "app-1", name: "Ledger", logoUrl: null, stage: "Build", staff: [] },
      { id: "app-2", name: "Atlas", logoUrl: null, stage: "Build", staff: [] },
    ] as unknown as Parameters<typeof ticketFacets>[0]["apps"]
    const built = (facet: string) =>
      ticketFacets({
        facet,
        t,
        clients: [
          { accountId: "acct-2", accountName: "Zeta", open: 1, total: 2 },
          { accountId: "acct-1", accountName: "Bergman", open: 4, total: 9 },
        ],
        accounts: new Map(),
        apps,
        helpTypeOptions: ["Question", "Issue", "Extra"],
      })

    for (const { name, token } of stripTabs()) {
      const offered = helpTabFacets(token)
      const fields = built(token).map((f) => f.field)
      const want = [
        offered.accountId && "accountId",
        offered.appId && "appId",
        offered.helpType && "helpType",
        offered.statuses.length > 0 && "status",
        "view", // the archive scope, on every tab
      ].filter(Boolean)
      expect(fields, `${name}'s toolbar draws the wrong set of filters`).toEqual(want)
    }

    const open = built(OPEN_FACET)
    // EVERY OPTION WEARS A MARK, and none of them is the whole answer: the word
    // is the label and the mark rides beside it. A menu with a face on four rows
    // and nothing on the fifth reads as the broken row.
    for (const facet of open)
      for (const option of facet.options ?? [])
        expect(option.label.length, `an option on ${facet.field} has no word`).toBeGreaterThan(0)
    for (const field of ["accountId", "appId", "helpType", "status"])
      for (const option of open.find((f) => f.field === field)?.options ?? [])
        expect(option.mark, `${field} draws an option with no mark`).toBeTruthy()

    // THE CLIENT MENU IS THE DOOR'S TALLY, ALPHABETISED — not the order the door
    // ranked them in (busiest first), which is the right answer to "who has the
    // most" and the wrong one for a menu somebody is scanning for a name.
    expect(open.find((f) => f.field === "accountId")?.options?.map((o) => o.label)).toEqual([
      "Bergman",
      "Zeta",
    ])
    // …AND THE TYPE MENU IS THE CLIENT'S FIXED ORDER, never alphabetical and
    // never the vocabulary's own (which leads with Question).
    expect(open.find((f) => f.field === "helpType")?.options?.map((o) => o.value)).toEqual([
      "Issue",
      "Question",
      "Extra",
    ])
  })

  // A CASE CALLED "NEVER OFFERS THE KIND THAT IS KEPT BUT NEVER SHOWN" STOOD
  // HERE and went on 15 Sep 2026 with the kind it named. It proved that BOTH
  // Type menus on this screen — the list's and the triage queue's, built by two
  // different functions — refused the word even when it arrived in their input,
  // which was the point: the subtraction upstream in `use-screen-data.ts` was
  // not what was being tested.
  //
  // The owner deleted that kind outright (`shared/ticket-types.ts`), the
  // upstream subtraction went with it, and a menu now offers exactly the team's
  // own live vocabulary. Deleted rather than re-pointed at a word nothing
  // withholds, which would have been a green test asserting nothing.


  it("gives the triage queue the client's three, and no Status", () => {
    // "On triage client up and type" — "up" is "app". Every row in the queue is
    // `status = 'new'` (that is what put it there), so the same rule that takes
    // Status off Closed takes it off here.
    const row = (accountId: string, accountName: string): TriageWaiting =>
      ({
        id: accountId,
        ref: null,
        description: "",
        createdAt: "",
        days: 1,
        missing: [],
        helpType: "Issue",
        accountId,
        accountName,
        accountLogo: null,
        appId: null,
        appName: null,
        appLogo: null,
        moduleId: null,
        moduleName: null,
        moduleMark: null,
        raisedByContactId: null,
        raisedByContactName: null,
        raisedByContactLogo: null,
        titleDe: null,
        titleEn: null,
      }) as unknown as TriageWaiting
    const facets = triageFacets([row("acct-2", "Zeta"), row("acct-1", "Bergman")], t, [])
    expect(facets.map((f) => f.field)).toEqual(["accountId", "helpType"])
    expect(facets.some((f) => f.field === "status")).toBe(false)
    // The client menu is new here, alphabetised, and each option carries the
    // client's own face — resolved by the DOOR onto the row, never looked up in
    // the accounts cache this screen holds (which is page one).
    const clients = facets.find((f) => f.field === "accountId")
    expect(clients?.options?.map((o) => o.label)).toEqual(["Bergman", "Zeta"])
    for (const option of clients?.options ?? []) expect(option.mark).toBeTruthy()
  })

  it("asks the door, on every tab that pages", () => {
    /* R14 + R16, and the reason this screen may not do what the queue does. The
       ticket list PAGES, so a facet answered in the browser narrows the fifty
       rows in hand while the count above it describes the collection — the exact
       failure the client reported once as "filter by type, the count doesn't
       change".

       Three claims, each read off a different file so nothing here is a parser
       agreeing with itself: the door really parses all four parameters; the
       screen hands the door the WHOLE question rather than a copy of the fields
       somebody remembered; and the queue's own in-hand narrowing is over a
       BOUNDED read, which is what makes it the legitimate exception. */
    const door = readFileSync(join(ROOT, "workers/content/src/routes/help.ts"), "utf8")
    const parsed = new Set(
      [...door.matchAll(/searchParams\.get\("(\w+)"\)/g)].map((m) => m[1])
    )
    expect(parsed.size, "the door parses nothing — this derivation has gone blind").toBeGreaterThan(3)
    for (const field of RULED_FIELDS)
      expect(
        parsed.has(field),
        `the toolbar offers \`${field}\` and workers/content/src/routes/help.ts does not parse it — an offered filter that cannot be honoured must not be shown`
      ).toBe(true)

    // THE TAB'S OWN NARROWING GOES IN FIRST AND THE PERSON'S QUESTION OVER IT.
    // The order is what makes the Status facet a narrowing WITHIN the Open tab
    // rather than a second control fighting it for the same parameter.
    const at = src.indexOf("fetchPage={(query, cursor) =>")
    expect(at, "the ticket list no longer has a fetchPage of its own").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 1200)
    const spread = tag.indexOf("...helpFacetFilter(facet)")
    const query = tag.indexOf("...query")
    expect(spread, "the ticket list no longer spreads the tab's own narrowing into fetchPage").toBeGreaterThan(-1)
    expect(
      query > spread,
      "`...query` must come AFTER `...helpFacetFilter(facet)` — the person's own pick has to win over the tab's default, or picking Scheduled on the Open tab would still ask the door for all three stages"
    ).toBe(true)

    // …AND NOTHING NARROWS THE LOADED ROWS. The one in-browser narrowing on this
    // screen is the queue's, and it is named `waiting` rather than `rows`
    // precisely so the paged half cannot borrow it by accident.
    //
    // TWO PLACES MAY TOUCH THOSE ROWS NOW — 17 Sep 2026 gave the All tab a
    // board beside Open's — AND BOTH ARE THE BOARD, which PARTITIONS its rows
    // into columns rather than dropping any (each board's own `it` below
    // proves that, and is where the exception is argued). Everywhere else on
    // this screen the count is zero, and the match is whitespace-insensitive
    // now — see NARROWS_LOADED_ROWS for the newline that used to be the whole
    // check.
    expect(BOARD.at, "the Open tab no longer draws the kit's board").toBeGreaterThan(-1)
    expect(BOARD.end, "the Kanban tag is not closed where this slice expects").toBeGreaterThan(BOARD.at)
    expect(ALL_BOARD.at, "the All tab no longer draws a second board").toBeGreaterThan(-1)
    expect(ALL_BOARD.end, "the All board's Kanban tag is not closed where this slice expects").toBeGreaterThan(
      ALL_BOARD.at
    )
    const elsewhere = code.slice(0, BOARD.at) + code.slice(BOARD.end, ALL_BOARD.at) + code.slice(ALL_BOARD.end)
    expect(
      [...elsewhere.matchAll(NARROWS_LOADED_ROWS)].map((m) =>
        elsewhere.slice(m.index, elsewhere.indexOf("\n", m.index)).trim()
      ),
      "something outside the board filters the door's own loaded rows — that is the narrowing R16 exists to prevent"
    ).toEqual([])
    expect(
      code.includes("waiting: TriageWaiting[],"),
      "narrowTriage no longer takes the queue's own bounded list — if the triage door started paging, its facets must move to the door too"
    ).toBe(true)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE OPEN TAB'S BOARD — five columns, and the two of them that are not the
   same KIND of thing as the other three.

   CLIENT, 2026-09-07, verbatim: "in open, include status ready and waiting /
   add them after / with this 5 columns, use all width available in screen".

   WHY THIS IS A SOURCE SCAN AND NOT A RENDER. Everything worth locking here is
   about where a number and a set of cards COME FROM, and both of those are
   invisible to a rendered board: a column fed from the loaded page and a column
   fed from the door's own count look identical on screen and identical in the
   DOM. The failure this guards is R16's founding one — a column counting rows
   the screen will not show — and it is a wiring fault, so it is read off the
   wiring. `tickets-collection.tsx` does not export `OpenBoard`, and exporting a
   component so a test can mount it would be widening the file's surface to
   check something the file's own text already states.
   ══════════════════════════════════════════════════════════════════════════ */
describe("the Open tab's board", () => {
  /** The `<Kanban …>` tag, sliced out so an assertion about the BOARD cannot be
   * satisfied by something else on this 3,600-line screen. */
  const board = (() => {
    expect(BOARD.at, "the Open tab no longer draws the kit's board").toBeGreaterThan(-1)
    expect(BOARD.end, "the Kanban tag is not closed where this slice expects").toBeGreaterThan(BOARD.at)
    return BOARD.text
  })()

  /* ── "BRING ABCK THE COLOR ON T STAGE IN BOARD VIEW" (client, 21 Sep 2026) ─

     THIS TEST USED TO ASSERT THE OPPOSITE, AND THAT IS ON PURPOSE, READ TWICE.
     On 2026-09-09 the client said "remove the color from the status header!" …
     "column header should have no color", and this test locked that in: zero
     `dot:` lines anywhere on the board. On 21 Sep 2026, reviewing the deployed
     tickets module, she reversed it in her own word for the object this board
     draws — "bring abck the color on t stage in board view" (UI-RULEBOOK.md
     L43) — which is why `OpenBoard`'s own header (tickets-collection.tsx)
     keeps BOTH rulings written out in full rather than silently swapping one
     for the other: the next reader needs to know the removal was real and is
     no longer the standing rule.

     SO THE ASSERTION NOW LOCKS THE REVERSAL, THE SAME WAY: exactly ONE `dot:`
     line in this board's source — the four STAGE columns share one
     `OPEN_TAB_STATUSES.map(...)` literal, so one written line covers all four
     rendered heads — and it reads off `helpStatusDotTone`, the one function
     the ticket's own chip and the Status filter already read for a stage's
     colour, never a second table. THE FIFTH COLUMN (Waiting) still carries
     none: it is a PREDICATE, not a stage, and her sentence named the stage —
     see the Waiting column's own `it` below for that half, argued rather than
     assumed.

     A SOURCE SCAN FOR THE REASON THE REST OF THIS DESCRIBE IS ONE (see its
     header): the board is not mounted here, and the thing being locked is what
     the screen HANDS the kit rather than what a browser paints. The kit's own
     `dot` is optional and both of its draw sites are gated on `!== undefined`
     (shared/ui/components/kanban/kanban.tsx), so "passes a dot" IS "draws a
     dot" — the kit cannot drop one it was handed. */
  it("hands the kit exactly one dot line, shared by the four stage columns, read off helpStatusDotTone", () => {
    expect(
      [...board.matchAll(/\bdot\s*:/g)].length,
      "the Open board's `dot:` line count changed — the four stage columns share ONE `OPEN_TAB_STATUSES.map(...)` literal, so this should stay 1 even though it colours four rendered heads; a second line would mean a second table for the same stage tone"
    ).toBe(1)
    expect(
      /dot:\s*helpStatusDotTone\(stage\)/.test(board),
      "the Open board's stage columns must read their colour off `helpStatusDotTone`, the one function the ticket's own chip and the Status filter already read — never a second, hand-written tone table"
    ).toBe(true)
  })

  it("touches the loaded rows exactly once, and that touch is a PARTITION", () => {
    /* THE ONE EXCEPTION TO "NOTHING NARROWS THE DOOR'S ANSWER", ARGUED RATHER
       THAN ASSUMED — and the assertion that replaced a check the layout used to
       decide. Until 2026-09-07 both this suite and R14's own law matched the
       literal `rows.filter(`, so THIS call passed only because its chain was
       written across three lines, and the component said so in a comment
       telling the reader not to tidy it. That is a law bending the code it
       polices. Both matchers ignore the whitespace now, so the call has to earn
       its place on what it MEANS:

         1 · there is exactly ONE of them on the board — no second, quieter one
             hiding behind the first;
         2 · its predicate keys on the COLUMN'S OWN `stage`, the variable the
             `.map` binds, so each loaded ticket lands in the column matching
             the one status it has;
         3 · and the columns are mapped off `OPEN_TAB_STATUSES` (the `it` above
             holds that), so EVERY status a loaded row can carry is drawn.

       Together those three are the sentence a regex cannot say on its own:
       nothing this screen loaded is dropped. A `.filter(` here on anything
       else — a date, an assignee, a search term — is the R16 defect and fails
       on (2), which is the whole reason the predicate is read rather than
       counted. The COUNT above each column is the other half and stands down
       under `narrowed`; that is checked where the counts are. */
    const partitions = [...board.matchAll(NARROWS_LOADED_ROWS)].map((m) =>
      board.slice(m.index, board.indexOf(")", board.indexOf("=>", m.index)) + 1).replace(/\s+/g, " ")
    )
    expect(
      partitions.length,
      "the board no longer buckets the loaded rows at all, or it does it more than once — either way this check is describing a screen that has moved on"
    ).toBe(1)
    expect(
      /^rows\s*\.filter\(\(\w+\) => \w+\.status === stage\)$/.test(partitions[0]),
      `the board's one touch of the loaded rows is \`${partitions[0]}\`, which is not a partition by the column's own stage — a filter on anything else drops cards the exact count above them still counts (R16)`
    ).toBe(true)
  })

  it("takes its stage columns from OPEN_TAB_STATUSES, so it cannot show one the tab's list denies", () => {
    /* THE WHOLE OF 2026-09-07's TENSION, IN ONE ASSERTION. `ready` could have
       been added as a COLUMN while the Open tab's own list kept refusing ready
       tickets — the board would then have counted rows the screen underneath it
       does not have, which is R16's founding defect. It was added to
       `OPEN_TAB_STATUSES` instead, and this is what holds that: the columns are
       MAPPED off that array rather than written out, so the board, the tab's
       query, its badge and its Status facet are one fact. A future stage joins
       all five surfaces or none. */
    /* THE MATCHER, NOT THE LAW, MOVED, 22 Sep 2026. Until Aurora's ruling
       ("remove column waiting from tickets open board") this array held a
       second, hand-written column after the map, so `columns` had to be an
       array LITERAL wrapping a spread: `[...OPEN_TAB_STATUSES.map(...), {…}]`.
       With the Waiting column gone there is nothing left to wrap the map in —
       `columns` is the `.map(...)` call itself now, and wrapping it in a
       redundant `[...spread]` fails its own lint (`unicorn/no-useless-spread`,
       caught live building this change). The law this locks is unchanged: the
       columns still have to be MAPPED off `OPEN_TAB_STATUSES`, never written
       out by hand. */
    expect(
      /columns=\{OPEN_TAB_STATUSES\.map\(/.test(board),
      "the board's stage columns are no longer mapped off OPEN_TAB_STATUSES — a hand-written column can show a stage the Open tab's own list refuses"
    ).toBe(true)
    for (const stage of OPEN_TAB_STATUSES)
      expect(
        helpTabFacets(OPEN_FACET).statuses,
        `the board would draw a "${stage}" column for a stage the Open tab does not span`
      ).toContain(stage)
  })

  it("carries exactly the four stage columns and no Waiting column", () => {
    /* THIS TEST USED TO ASSERT THE OPPOSITE, AND THAT IS ON PURPOSE, READ
       TWICE (the same shape the dot test above already carries once on this
       file). It used to lock a FIFTH column, Waiting, drawn after the four
       stages, fed by its own door read off the Waiting tab's own cache key.
       Aurora removed it, 22 Sep 2026, verbatim: "remove column waiting from
       tickets open board. tehn expand the other columsntto take full width."
       So the law this test now locks is the flip side of the one it used to:
       the board's `columns` is nothing but the four-stage map — no second
       column literal joins it, no `WAITING` token survives anywhere in the
       board's own source, and the read that used to feed it
       (`waitingQ`/`waitingTotal`, gated behind `onOpenBoard`) is gone with
       it rather than left standing unread. */
    expect(
      board.includes("id: WAITING"),
      "the board still carries a Waiting column literal — she asked for it removed"
    ).toBe(false)
    expect(
      /\bWAITING\b/.test(board),
      "the board's own source still names WAITING somewhere — the column and everything that fed it should be gone, not just the column head"
    ).toBe(false)
    expect(
      board.includes("waitingTotal") || board.includes("waitingRows") || board.includes("waitingQ"),
      "the board still reads a waiting-specific value — that read existed only to feed the column this ruling removed"
    ).toBe(false)
    // THE MAP IS THE WHOLE `columns` VALUE, not one term ORed or spread
    // against a second one — the same close-reading the width test below
    // does for `columnWidth`, applied to the columns array's own shape: the
    // `.map(...)` call closes with `}))` immediately before the prop's own
    // closing `}`, so nothing else was appended after it.
    expect(
      /columns=\{OPEN_TAB_STATUSES\.map\(\(stage\) => \(\{[\s\S]*?\}\)\)\}/.test(board),
      "the board's columns prop is no longer exactly one OPEN_TAB_STATUSES.map(...) call — something else is joining it"
    ).toBe(true)
  })

  it("tells the reader what the counts mean, in the footnote where the reader is", () => {
    /* THIS USED TO GUARD A REPEATING COLUMN, AND THAT COLUMN IS GONE, 22 Sep
       2026 (Aurora: "remove column waiting from tickets open board" — see the
       column's own removed `it` above). A waiting ticket used to be drawn
       twice — once in its real stage, once in the fifth column — and the
       footnote carried the sentence that told a reader why the columns did
       not sum to the tab's own badge. With no fifth column there is nothing
       left to repeat, so that sentence is gone with it.
       WHAT SURVIVES IS THE REASON A FOOTNOTE EXISTS ON THIS BOARD AT ALL:
       the kit's only summary is `footnoteMeta` and it is deliberately still
       not passed, and the Open TAB's badge still sums the STAGES only (R16),
       so the board still has to tell the reader in words what the number
       over each column means, and it still does — just a plainer sentence
       now that there is only one kind of column to explain. */
    expect(
      board.includes("footnoteMeta"),
      "the board passes the kit's own summary line — this board's own footnote is the one place that explains the counts, not a second kit summary"
    ).toBe(false)
    expect(
      code.includes("formatCount(OPEN_TAB_STATUSES.reduce("),
      "the Open tab's badge is no longer the sum of its stages' own disjoint counts"
    ).toBe(true)
    expect(
      /badge: formatCount\(OPEN_TAB_STATUSES\.reduce[\s\S]{0,120}waiting/i.test(code),
      "the Open tab's badge has taken a waiting term — there is no Waiting column left for it to be counting"
    ).toBe(false)
    for (const half of [
      "Cards are the tickets that matched, as far as they have loaded. Click a card to open the ticket.",
      "Each column counts every open ticket at that stage. Click a card to open the ticket.",
    ])
      expect(board.includes(half), `the board's own footnote no longer says: "${half}"`).toBe(true)
    for (const stale of ["Waiting repeats cards from the stages before it", "Waiting repeats those same tickets"])
      expect(
        code.includes(stale),
        `the board's footnote still carries a sentence about the column that was removed: "${stale}"`
      ).toBe(false)
  })

  it("stays READ-ONLY — the kit makes that a property of the API, not a promise", () => {
    /* No `onMove` means no card is draggable, no card takes the move keys and
       no drop target lights up (the kit's own doc). Two reasons, and the second
       one arrived with the fifth column: `scheduled`, `in_progress` and `ready`
       are flipped by work landing in a sprint, a timer starting and the last
       story closing — a drop would assert a fact by geometry — and "waiting" is
       not a status at all, so a drop into that column has no field to write. */
    expect(
      board.includes("onMove"),
      "the board took an onMove — dragging a card would assert a lifecycle fact by geometry, and the Waiting column has no field a drop could write"
    ).toBe(false)
    expect(
      board.includes("onCardSelect"),
      "a card no longer opens its ticket, which is the one thing this board does"
    ).toBe(true)
  })

  it("fills the width by SHARING it, never by escaping the card it sits in", () => {
    /* "use all width available in screen". Nothing on the path caps the board —
       `app-shell.tsx`'s one page container is `max-w-none` (R29) and
       `CollectionCard` sets no measure — so the constraint was the kit's own
       fixed 18rem column, which neither grows nor shrinks. The fix is the kit's
       `columnWidth` prop carrying a fluid value, floored at the kit's own
       stated minimum. NOT a negative margin and NOT a width of this screen's
       own: either would be a second page measure, which is exactly what R29
       exists to stop, and the first would also be a lie about where the card
       ends.
       THE ARITHMETIC MOVED, 22 Sep 2026, THE SAME DAY THE FIFTH COLUMN DID —
       Aurora: "remove column waiting from tickets open board. tehn expand the
       other columsntto take full width." Four columns need three gaps between
       them, not the four a fifth column used to need, so a FROZEN STRING here
       (`… - 4 * … ) / 5`) is exactly what silently passed the wrong arithmetic
       the day the column count changed under it. This reads the two numbers
       back OUT of the source instead and checks them as a RELATIONSHIP against
       `OPEN_TAB_STATUSES.length` — the same array the columns themselves are
       mapped off (the `it` above) — so the next column count change fails
       here rather than passing on a stale digit nobody re-read. */
    const columnWidth = /columnWidth="max\(18rem, calc\(\(100% - (\d+) \* var\(--space-2h\)\) \/ (\d+)\)\)"/.exec(
      board
    )
    expect(
      columnWidth,
      "the board's columnWidth is no longer the kit's own fluid calc() over the --space-2h gap token — columns no longer share the row's width"
    ).not.toBeNull()
    const [, gapCount, columnCount] = columnWidth as unknown as [string, string, string]
    expect(
      Number(columnCount),
      "columnWidth's own divisor no longer matches the number of stage columns OPEN_TAB_STATUSES actually draws — the arithmetic and the columns have drifted apart"
    ).toBe(OPEN_TAB_STATUSES.length)
    expect(
      Number(gapCount),
      "columnWidth's own gap count is not one fewer than the column count — N columns sitting in a row need N-1 gaps between them, not N"
    ).toBe(OPEN_TAB_STATUSES.length - 1)
    expect(
      /-m[xlrs]?-/.test(board),
      "the board pulls itself out of its card with a negative margin — nothing on this path sets a width to escape (R29)"
    ).toBe(false)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE ALL TAB'S BOARD — one column per LIVE STATUS, and nothing else.

   CLIENT, 17 Sep 2026, verbatim, the second half of the same ruling that
   opened this file's other board describe block: "Also add this board view
   by status in general tickets, all." Six columns, not five: All holds a
   ticket in ANY stage (Open's own board deliberately does not), so its
   partition is `HELP_STATUSES` — every live word `help.status` can hold —
   rather than the narrower `OPEN_TAB_STATUSES`, and there is no sixth
   "Waiting" column, because that column is a PREDICATE about triage
   workload and this board's whole point is a plain partition by status.
   Kept far shorter than "the Open tab's board" above: the shared pieces
   (`ticketStatusColumnTitles`, `ticketBoardCard`) are ONE function each now,
   so what is worth locking here is what is DIFFERENT about this board, not
   the whole account a second time. ══════════════════════════════════════ */
describe("the All tab's board", () => {
  const board = (() => {
    expect(ALL_BOARD.at, "the All tab no longer draws its own board").toBeGreaterThan(-1)
    expect(ALL_BOARD.end, "the All board's Kanban tag is not closed where this slice expects").toBeGreaterThan(
      ALL_BOARD.at
    )
    return ALL_BOARD.text
  })()

  it("takes its columns from the WHOLE live vocabulary, HELP_STATUSES, not the Open tab's narrower one", () => {
    // Mapped off the array itself — `HELP_STATUSES` holds all six live
    // stages (shared/types.ts) — rather than written out stage by stage, so
    // this board cannot drift from the vocabulary the door, the strip's own
    // badges and every other status-driven surface already agree on.
    expect(
      /columns=\{HELP_STATUSES\.map\(/.test(board),
      "the All board's columns are no longer mapped off HELP_STATUSES — a hand-written column set can drift from the live status vocabulary"
    ).toBe(true)
    expect(HELP_STATUSES.length, "HELP_STATUSES no longer holds six live stages").toBe(6)
  })

  it("touches the loaded rows exactly once, and that touch is a PARTITION", () => {
    const partitions = [...board.matchAll(NARROWS_LOADED_ROWS)].map((m) =>
      board.slice(m.index, board.indexOf(")", board.indexOf("=>", m.index)) + 1).replace(/\s+/g, " ")
    )
    expect(
      partitions.length,
      "the All board no longer buckets the loaded rows exactly once — either it dropped its partition or it grew a second one"
    ).toBe(1)
    expect(
      /^rows\s*\.filter\(\(\w+\) => \w+\.status === stage\)$/.test(partitions[0]),
      `the All board's one touch of the loaded rows is \`${partitions[0]}\`, which is not a partition by the column's own stage — a filter on anything else drops cards the exact count above them still counts (R16)`
    ).toBe(true)
  })

  // "BRING ABCK THE COLOR ON T STAGE IN BOARD VIEW" (client, 21 Sep 2026,
  // UI-RULEBOOK.md L43) covers every ticket board in this file, the same way
  // the 2026-09-09 removal this reverses did — see `OpenBoard`'s equivalent
  // `it`, above, for the full account. One `dot:` line, shared by all six
  // rendered heads through the one `HELP_STATUSES.map(...)` literal, read off
  // `helpStatusDotTone`.
  it("hands the kit exactly one dot line, shared by the six columns, read off helpStatusDotTone", () => {
    expect(
      [...board.matchAll(/\bdot\s*:/g)].length,
      "the All board's `dot:` line count changed — the six columns share ONE `HELP_STATUSES.map(...)` literal, so this should stay 1"
    ).toBe(1)
    expect(
      /dot:\s*helpStatusDotTone\(stage\)/.test(board),
      "the All board's columns must read their colour off `helpStatusDotTone`, the same seam OpenBoard and the ticket's own chip read — never a second, hand-written tone table"
    ).toBe(true)
  })

  it("draws no sixth Waiting column — that predicate belongs to Open's board, not a plain status partition", () => {
    expect(
      board.includes("WAITING"),
      "the All board names WAITING — it is a predicate over triage workload, not a status, and this board is a partition of HELP_STATUSES alone"
    ).toBe(false)
  })

  it("a card opens the ticket, and nothing here promises a drag this board does not wire", () => {
    expect(board.includes("onMove"), "the All board accepts onMove — see Open's own header for why a ticket board stays read-only").toBe(
      false
    )
    expect(board.includes("onCardSelect"), "a card no longer opens its ticket on the All board").toBe(true)
  })
})
