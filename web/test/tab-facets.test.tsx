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
  TICKET_TYPE_KEPT_FOR_MIGRATION,
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
      { id: "app-1", name: "Ledger", logoUrl: null, stage: "Development", staff: [] },
      { id: "app-2", name: "Atlas", logoUrl: null, stage: "Development", staff: [] },
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
        helpTypeOptions: ["Question", "Issue", TICKET_TYPE_KEPT_FOR_MIGRATION],
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
    ])
  })

  it("never offers the kind that is kept but never shown", () => {
    /* The client's ruling of 6 Sep 2026: requirements tickets are KEPT and never
       displayed. The door excludes them from the list, from every COUNT(*) that
       badges it and from the triage queue — so a filter offering the word would
       narrow to an empty list under a count that had already subtracted those
       rows, which reads as "this client has no tickets" rather than as a
       question nothing can answer.

       BOTH MENUS, because there are two Type controls on this screen and they
       are built by two functions. */
    const listTypes = ticketFacets({
      facet: "all",
      t,
      clients: [],
      accounts: new Map(),
      apps: [],
      // The word arrives here even though `use-screen-data.ts` already
      // subtracts it — that is the point: this proves the FACET refuses it, not
      // that somebody upstream remembered to.
      helpTypeOptions: ["Question", TICKET_TYPE_KEPT_FOR_MIGRATION, "Issue"],
    }).find((f) => f.field === "helpType")
    expect(listTypes?.options?.map((o) => o.value)).toEqual(["Issue", "Question"])

    const row = (helpType: string | null): TriageWaiting =>
      ({
        id: `t-${helpType}`,
        ref: null,
        description: "",
        createdAt: "",
        days: 1,
        missing: [],
        helpType,
        accountId: "acct-1",
        accountName: "Bergman",
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
    const queue = triageFacets(
      [row("Question"), row(TICKET_TYPE_KEPT_FOR_MIGRATION), row("Issue")],
      t,
      []
    )
    expect(queue.find((f) => f.field === "helpType")?.options?.map((o) => o.value)).toEqual([
      "Issue",
      "Question",
    ])
  })

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
    // ONE PLACE MAY TOUCH THOSE ROWS AND IT IS THE BOARD, which PARTITIONS them
    // into columns rather than dropping any (its own `it` below proves that, and
    // is where the exception is argued). Everywhere else on this screen the
    // count is zero, and the match is whitespace-insensitive now — see
    // NARROWS_LOADED_ROWS for the newline that used to be the whole check.
    expect(BOARD.at, "the Open tab no longer draws the kit's board").toBeGreaterThan(-1)
    expect(BOARD.end, "the Kanban tag is not closed where this slice expects").toBeGreaterThan(BOARD.at)
    const elsewhere = code.slice(0, BOARD.at) + code.slice(BOARD.end)
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

  /* ── "COLUMN HEADER SHOULD HAVE NO COLOR" (client, 2026-09-09) ────────────

     SHE ASKED TWICE, IN TWO SHAPES, WHICH IS WHY THIS IS PINNED. On 2026-09-07
     she said "grerat but status (th header) have no color associated" and the
     screen read it as a complaint about WHICH colour — the column heads and the
     Status filter were tinting the same stage two different ways — so the dot
     was CORRECTED rather than removed, and a long comment was written defending
     the corrected tones. On 2026-09-09 she said it in the imperative and again
     in the same review: "remove the color from the status header!" … "column
     header should have no color".

     So the old argument is still readable in this repo's history and is
     precisely the kind of thing a future reader finds, believes, and acts on.
     This is the assertion that stops them: no column on this board hands the
     kit a `dot`, on the FIVE heads together, read off the board's own source.

     A SOURCE SCAN FOR THE REASON THE REST OF THIS DESCRIBE IS ONE (see its
     header): the board is not mounted here, and the thing being locked is what
     the screen HANDS the kit rather than what a browser paints. The kit's own
     `dot` is optional and both of its draw sites are gated on `!== undefined`
     (shared/ui/components/kanban/kanban.tsx), so "passes no dot" IS "draws no
     dot" — the kit cannot invent one. */
  it("hands the kit no dot for any column head", () => {
    expect(
      [...board.matchAll(/\bdot\s*:/g)].length,
      "a column on the Open board is passing the kit a `dot` again — the client removed the colour from these heads on 2026-09-09 (\"column header should have no color\"), and the 2026-09-07 argument for a CORRECTED dot, still in this file's history, is not a licence to restore one"
    ).toBe(0)
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
    expect(
      /columns=\{\[\s*\.\.\.OPEN_TAB_STATUSES\.map\(/.test(board),
      "the board's stage columns are no longer mapped off OPEN_TAB_STATUSES — a hand-written column can show a stage the Open tab's own list refuses"
    ).toBe(true)
    for (const stage of OPEN_TAB_STATUSES)
      expect(
        helpTabFacets(OPEN_FACET).statuses,
        `the board would draw a "${stage}" column for a stage the Open tab does not span`
      ).toContain(stage)
  })

  it("adds Waiting as a fifth column, AFTER the stages, fed by its own door read", () => {
    /* WAITING IS NOT A `GROUP BY status` BUCKET. There is no waiting column in
       the database and no flag on a loaded row (`waitingClause`,
       workers/content/src/lib/help.ts), so the cards cannot be a slice of the
       Open page and the count cannot be a term of `byStatus`. Both come from
       the door's own answer to the Waiting question — the SAME cache key the
       Waiting tab rests on, so the tab and the column can never disagree. */
    const stages = board.indexOf("...OPEN_TAB_STATUSES.map(")
    const waiting = board.indexOf("id: WAITING")
    expect(waiting, "the board has no Waiting column — the client asked for five").toBeGreaterThan(-1)
    expect(
      waiting > stages,
      'the Waiting column is drawn before the stages — the client said "add them after"'
    ).toBe(true)
    expect(
      /count:\s*narrowed \? undefined : waitingTotal/.test(board),
      "the Waiting column's number is not the door's own total for the waiting question — `.length` there would be page one under a badge counting all of them (R14/R16)"
    ).toBe(true)
    expect(
      /helpFacetKey\(teamId, "all", WAITING\)/.test(code),
      "the board's waiting cards no longer come from the Waiting tab's own cache key — the column and the tab can now disagree about who is waiting"
    ).toBe(true)
  })

  it("repeats cards rather than moving them, and says so where the reader is", () => {
    /* A waiting ticket is ALSO triaged / scheduled / in progress / ready, so it
       is drawn twice: once in the stage it is genuinely in, once here. The
       alternative ("waiting wins") would take it out of its stage column and
       make the four stage columns lie about the work.
       THAT COSTS NO TOTAL, and this is the half that has to be checked rather
       than reasoned about: nothing adds the columns up. The kit's only summary
       is `footnoteMeta` and it is deliberately not passed, and the Open TAB's
       badge sums the STAGES only — so the collection is still counted exactly
       once on this screen. The footnote carries the sentence a reader needs,
       because five columns beside each other read as five buckets. */
    expect(
      board.includes("footnoteMeta"),
      "the board passes the kit's own summary line — with a repeating column that number would double-count"
    ).toBe(false)
    expect(
      code.includes("formatCount(OPEN_TAB_STATUSES.reduce("),
      "the Open tab's badge is no longer the sum of its stages' own disjoint counts"
    ).toBe(true)
    expect(
      /badge: formatCount\(OPEN_TAB_STATUSES\.reduce[\s\S]{0,120}waiting/i.test(code),
      "the Open tab's badge has taken a waiting term — waiting overlaps the stages, so adding it counts tickets twice"
    ).toBe(false)
    for (const half of ["Waiting repeats cards from the stages before it", "Waiting repeats those same tickets"])
      expect(
        code.includes(half),
        `the board's footnote no longer tells the reader that the last column repeats the ones before it: "${half}"`
      ).toBe(true)
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
       ends. */
    expect(
      /columnWidth="max\(18rem, calc\(\(100% - 4 \* var\(--space-2h\)\) \/ 5\)\)"/.test(code),
      "the board's columns no longer share the row's width — five fixed columns overflow a laptop and leave a wide display two-thirds empty"
    ).toBe(true)
    expect(
      /-m[xlrs]?-/.test(board),
      "the board pulls itself out of its card with a negative margin — nothing on this path sets a width to escape (R29)"
    ).toBe(false)
  })
})
