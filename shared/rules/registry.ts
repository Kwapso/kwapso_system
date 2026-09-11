// THE LAWS OF THE BASE, as data. This is the single source of truth the human
// RULES.md and the machine-checks (shared/rules + the per-worker publish-seam
// tests + web/test/rules.test.ts) are both pinned to. A law may not be added
// without a check; a check may not exist without a law (enforced by L0 in
// web/test/rules.test.ts). Deny-lists are DATA here, so every exception is a
// reviewed, visible line — never a silent bypass (the proven publish-seam pattern).

export type Dimension = "arch" | "ui" | "workflow" | "ai"
export type RuleStatus = "enforced" | "aspirational"
export interface Rule {
  id: string
  dimension: Dimension
  law: string
  /** WHY the law reads the way it does, where a future reader would otherwise
   * re-litigate a decision INSIDE it — the option that was considered and lost,
   * and what decided it. The `law` says what is enforced; this says what was
   * chosen. Optional: most laws are their own argument, and only a law that had a
   * genuine fork in it earns one. */
  why?: string
  /** the test id that enforces it (a per-worker suite or a web rules.test case). */
  checkId: string
  status: RuleStatus
}

/** ── WHOSE BOOK IS THIS? THE NUMBERS ARE NOT UNIQUE ACROSS THE ESTATE ────────
 *
 * THE OWNER, 26 Aug 2026, on the collision a review round surfaced: "pick the
 * law that overrides the other. The one that is the most recent and makes more
 * sense in the broader context, you figure out what."
 *
 * The ruling, and it is a governance decision rather than a fix:
 * **`alaap-swift-struck/brimba`'s R-series is canonical. This repository's is
 * the divergent one.** Two reasons, and they agree:
 *
 *   • MOST RECENT. The newest law either repository holds is brimba's R26
 *     (`fork-sweep-complete`, 25 Aug 2026). Every law of ours that competes with
 *     a brimba number was written on 10–12 Aug, before the divergence was
 *     visible to anybody.
 *   • BROADER CONTEXT. brimba is the base a future product FORKS. Its R-series
 *     travels into every app built on it; ours travels nowhere. When one of two
 *     namespaces has to yield, it is the one with a single reader.
 *
 * WHAT WAS ACTUALLY WRONG, which is bigger than the R26 that was reported. The
 * two books forked their numbering at R20 and both kept minting: SEVEN ids
 * (R20–R26) carry a completely different law in each repository, and we hold
 * eleven more (R27–R37) that brimba will mint over the top of the moment it
 * writes its twenty-seventh law. One collision was the visible edge of a
 * divergent series.
 *
 * WHAT IS NOT BEING DONE, and why it is a decision and not an omission.
 * Renumbering our seven would rewrite 847 references across the source, the
 * docs and the tests — a change with no user, no behaviour and real risk, on a
 * repository that shares no build with brimba and goes red for none of this.
 * The harm is not to a build; it is to a PERSON who reads "R24" and cannot tell
 * which book it came from. So the cure is to make the book say so, and to make
 * the NEXT collision impossible, which is the only harm still in front of us.
 *
 * `LAW_ID_ORIGIN` below is that record, and the check on it is the guard. */
/** AND ONE RENUMBERING THAT DID HAPPEN, 8 Sep 2026, so nobody hunts for it.
 *
 * `main` and `feat/ui-ux` were apart for 92 and 57 commits, and BOTH minted an
 * R52, an R53 and an R54 — six different laws under three numbers. One set had
 * to move, and the paragraph above is the precedent for how that is decided: the
 * harm is a reader who cannot tell which law a number means, so MINIMISE THE
 * REFERENCE REWRITE. feat/ui-ux's four laws (R52 record-title-treatment, R53
 * toolbar-slot-set, R54 staff-names-are-first-names, R55 refs-match-the-formula)
 * were named at 148 sites across 39 files, most of them code comments where a
 * wrong number is invisible; main's three were named at 14. So the branch's
 * numbers stand and MAIN'S THREE MOVED UP: one-door-per-unit R52 → R56,
 * component-folders R53 → R57, named-paths R54 → R58.
 *
 * What went stale is commit MESSAGES on both sides — "test(rules): R52 — a
 * component asks a door once" now describes R56 — and a commit message is a
 * record of a moment, which is the one thing here that could not be rewritten
 * and the one thing that was never meant to be current. */
export const BASE_REPOSITORY = "alaap-swift-struck/brimba"

/** The highest law id the canonical base had minted when this was last read
 * (26 Aug 2026, brimba@ab21e2b). A law WE mint must sit above it, so a number
 * this repository invents can never be one the base also invents.
 *
 * Raise it when the base mints more — and if raising it would swallow ids we
 * already hold, that is the divergence widening and it wants the owner, not a
 * bigger number. */
export const BASE_LAW_CEILING = 26

/** THE SEVEN THAT ALREADY COLLIDE, named so that nobody rediscovers them as a
 * surprise. `ours` is this repository's checkId for that number; `theirs` is
 * brimba's. Both are real, enforced laws in their own book.
 *
 * This list may only SHRINK — an entry goes when the two books agree on that
 * number again, which in practice means when one of the two laws is retired or
 * this repository is merged back into the base and renumbered as one act. */
export const LAW_ID_ORIGIN: { id: string; ours: string; theirs: string }[] = [
  { id: "R20", ours: "validated-bodies", theirs: "static-destinations" },
  { id: "R21", ours: "client-reachable-doors", theirs: "create-returns-row" },
  { id: "R22", ours: "agent-body-parity", theirs: "create-opens-record" },
  { id: "R23", ours: "cited-answers", theirs: "mutation-returns-row" },
  { id: "R24", ours: "money-taint-outbound", theirs: "bulk-twin-declared" },
  { id: "R25", ours: "savings-caption", theirs: "activity-birth-to-death" },
  { id: "R26", ours: "vector-fence", theirs: "fork-sweep-complete" },
]

export const RULES_REGISTRY: Rule[] = [
  {
    id: "R1",
    dimension: "arch",
    law: "Every mutation route publishes a live change ping.",
    checkId: "publish-seam",
    status: "enforced",
  },
  {
    id: "R2",
    dimension: "ui",
    law: "Every record-detail screen draws its tab strip through the library TabsView, and every record's history is REACHABLE — from the ink footer's Latest activity eyebrow, which opens the slide-in rail. The Activity TAB was retired on 7 Sep 2026 (\"kill all old activity tabs\"), so no detail renders <ActivityPanel> any more and the check follows the history to the rail its two hosts mount.",
    checkId: "record-detail-tabs",
    status: "enforced",
  },
  {
    id: "R3",
    dimension: "ui",
    law: "Collection tab strips use the library TabsView (icon + count badge) — no hand-rolled button toggles.",
    checkId: "no-handrolled-toggles",
    status: "enforced",
  },
  {
    id: "R4",
    dimension: "ui",
    law: "Every form/dialog renders through the shared FormShell (one title/subtitle · separator · fields · separator · action layout).",
    checkId: "forms-use-formshell",
    status: "enforced",
  },
  {
    id: "R5",
    dimension: "arch",
    law: "Record activity is read through ONE generic (table, id) path — any module's history, no per-module read SQL.",
    checkId: "generic-activity-path",
    status: "enforced",
  },
  {
    id: "R6",
    dimension: "ui",
    law: "Product terms live in ONE glossary (clear, brief, no over-explaining) — the app speaks one dictionary.",
    checkId: "glossary-wellformed",
    status: "enforced",
  },
  {
    id: "R7",
    dimension: "ui",
    law: "Every form dialog persists its draft per session (useFormDraft) — unsaved input survives navigating away (CACHING.md §11).",
    checkId: "forms-persist-drafts",
    status: "enforced",
  },
  {
    id: "R8",
    dimension: "ui",
    law: "Every tab that reveals a collection carries that collection's count, on BOTH tab surfaces: a team section tab (placement:'tab') declares a countCacheKey, and a RECORD-DETAIL tab is badged from the block it reveals — recipe details through the withTabCounts seam (the collection is derived from the tab's own block: activity → its source, list → its module), bespoke details in their own tabs config. A tab that shows no collection says so once, as a reviewed RECORD_TAB_COUNT_EXCEPTIONS entry. R8 owns WHICH collection a tab's badge describes (derived from the recipe/registry, never hand-listed). The NUMBER the badge shows is owned by R16 (an exact server total through formatCount); where the two disagree, R16 prevails. Earned by: every record in the app shipping an Activity tab with no count at all — the team strip was walked, the record tabs were built elsewhere and never were.",
    checkId: "tab-counts-derived",
    status: "enforced",
  },
  {
    id: "R9",
    dimension: "arch",
    law: "The agent knows what the app can do — its system prompt carries a capability brief GENERATED from the import/export catalog (+ the glossary), so the UI and the agent can never disagree about a capability. And it knows what the app REFUSES: a vocabulary-gated write states its call ORDER (create the dropdown value first, write the rows second, one turn) on BOTH surfaces the model reads — the tool's own description and the system rule wall. It also knows what the app can DRAW: the visual blocks it may emit are generated from ONE catalogue (shared/agent-blocks.ts), so the prompt can never advertise a shape the renderer refuses or hide one it draws, and every example in the prompt is proved by RUNNING the parser over it. Earned by: a perfectly-planned single call refused by the vocabulary gate, ending a turn having changed nothing.",
    checkId: "agent-app-parity",
    status: "enforced",
  },
  {
    id: "R10",
    dimension: "arch",
    law: "Every state-changing route opens with a permission gate — requireRight (or the gated()/gatedBody() wrapper / requireAnyImportRight / adminGuard) — unless it is a reviewed identity-gated write (teamless onboarding, own-pointer, ownership) that gates on whoAmI instead. No ungated door can ship.",
    checkId: "gating-seam",
    status: "enforced",
  },
  {
    id: "R11",
    dimension: "arch",
    law: "Every external fetch (a bare global fetch() to the internet — the D1 REST door, the email sender, the AI model call) carries an AbortSignal timeout, so a hung socket can never stall a worker. Service-binding calls (X.fetch()) are Cloudflare-bounded and exempt.",
    checkId: "fetch-timeout",
    status: "enforced",
  },
  {
    id: "R12",
    dimension: "arch",
    law: "Every cron / scheduled handler records its failures to the error store (recordWorkerError) — unattended work has no user watching, so a swallowed background failure would be invisible in the 90-day error_logs. (A user-facing catch that shows a friendly message should record too — a documented convention, e.g. the agent's model-call catch.)",
    checkId: "cron-records",
    status: "enforced",
  },
  {
    id: "R13",
    dimension: "arch",
    law: "Shipping the code ships the capability: every module is a TargetDef in the import/export catalog or a reviewed CATALOG_EXEMPT entry — AND the core catalogue table reconciles itself against the code on READ (INSERT-only, ON CONFLICT DO NOTHING: a target the owner switched OFF stays off; only a row that never existed is created; the picker never pre-filters is_active in SQL). Earned by: staging importing two modules that production, running byte-identical code, could not — rows are data, and no deploy carries data.",
    checkId: "catalog-coverage",
    status: "enforced",
  },
  {
    id: "R14",
    dimension: "arch",
    law: "No unbounded list endpoint, and no capped GROWING one: every exported list*/search* function backing a collection route applies a HARD CAP (LIMIT n, said in a comment) — but a collection that GROWS with ordinary use (GROWING_COLLECTIONS) must PAGE instead, by KEY not offset: an opaque cursor, an exact total, and hasMore, with a client that can actually reach page two. A cap is an honest refusal to answer; paging is an answer. Earned by: one unbounded read stalling a worker under a 24,000-row catalogue — then the same catalogue proving a 1,000-row ceiling is just a slower refusal.",
    checkId: "bounded-lists",
    status: "enforced",
  },
  {
    id: "R15",
    dimension: "arch",
    law: "No deaf publishers: every resource string any worker publishes must reach a listener (TEAM_RESOURCES / SIMPLE_INVALIDATIONS in web/lib/live-resources.ts, or the portal's own PORTAL_LISTENERS) or a reasoned DEAF_EXEMPT entry — the publisher set DERIVED by scanning publishChange calls, never hand-listed. Earned by: the dropdown manager staling because its worker pinged a resource nothing listened to. RETIRED HALF: this law also used to require every paged screen to hold a useLiveRefetch subscription. That clause detected paged screens by matching '/search?' or 'usePagedList' in web/components — zero files matched, so it could never fail, and the hook it protected had no call sites. The need was real and then went away: paging moved to opaque cursors over the SHARED STORE, so a paged list's rows now live in a cache key with its cursor in a sidecar — the very caches the row-level registry patches and the portal's listener map invalidates. No screen holds page state outside them any more, which was the hook's whole premise, so the clause and web/lib/use-live-refetch.ts were retired rather than re-detected.",
    checkId: "live-collections",
    status: "enforced",
  },
  {
    id: "R16",
    dimension: "ui",
    law: "Every screen showing a collection shows its count, exactly once: the NUMBER is a server COUNT(*) rendered through the ONE formatCount seam (floored abbreviation at every magnitude, zero/loading render nothing), counted EXACTLY up to TOTAL_COUNT_CAP (1,000,000) and reported as \"at least\" beyond it — through the one bounded seam shared/workers/count.ts, for every GROWING_COLLECTIONS total; a total that stopped early SAYS SO in the same object, because pagedJson DERIVES totalCapped from the total itself; a number that feeds a DECISION rather than a display (billable seconds, an export's completeness) stays EXACT and does not come through the capped path; the PLACE is a tab badge where the screen has a counted tab, else a CollectionHeading; the ARBITRATION is a React context (CountedTabs / CountedAbove) — a counted tab WINS and the heading stands down, decided per-permission at render, never by a prop. Where R8 and R16 disagree about a number, R16 prevails (R8 owns WHICH collection a tab describes). Earned by: a 24,011-product catalogue advertising '1000' (a capped list's length), and the same '24k' shown twice on one screen.",
    why: "AMENDED 2026-08-14, and the amendment is narrower than 'allow an approximate count'. An unbounded COUNT(*) over a growing table was the one read in the product with no ceiling at all, on every page of every paged screen — while the exactness it bought above a thousand was precision the badge threw away immediately (24,011 and 24,499 both render '24k'). TWO OPTIONS WERE ARGUED. (b) keep the count exact and cache it briefly was the more obvious one and it LOST, for two reasons. First, a cache fights a mechanism that already exists: app-shell.tsx bumps the primed total sidecar by ±1 on every add/remove ping, so a 60-second server cache would be overwritten back to the stale value by the next list fetch — create a ticket and the badge goes 222 to 223, then jumps BACK to 222 for a minute, and a badge that moves backwards is worse than one that says 'at least'. Invalidation does not rescue it: the mutation runs in a different isolate from the one holding the cache, so cross-isolate invalidation costs a Durable Object round trip on every count read, which is MORE work than today. Second, the cache key would have to be the CALLER'S FENCE, not the collection — these counts vary with module rights (R18), the account fence, ticketFence, ownerClause — so keyed by collection it discloses one caller's count to another, and keyed correctly it fragments until the hit rate stops being the win. So (a), capped — at 1,000,000 rather than the 50,000 first proposed, because at 100,000 rows a badge reading '50k+' tells a manager LESS than '100k' does, and deliberately the SAME number as the search ceiling so the app has one place where counting stops rather than two. It can only ever do LESS work than before (the inner LIMIT stops a scan that previously ran to the end), which was the owner's condition, met by construction. Measured, not assumed: on 14 Aug 2026 the largest collection in the app is the activity feed at 2,253 rows, about 400x under the ceiling, so no screen renders differently today. Honest limitation: a bounded million-row scan is a CEILING, not a cheap query — a constant-time count needs a counter maintained by every write, named and not taken.",
    checkId: "counted-collections",
    status: "enforced",
  },
  {
    id: "R17",
    dimension: "arch",
    law: "State transitions are idempotent: every deactivate/reactivate UPDATE carries the current-status predicate (deactivate: AND deactivated_at IS NULL; reactivate: IS NOT NULL — status moves: AND status <> ?), reads the changed-row count back, and when zero rows moved writes NO activity row and publishes NO change. Earned by: a double-clicked Deactivate writing two 'deactivated' rows 2.0s apart into one record's history — history says what happened, not how many times a button was pressed.",
    checkId: "idempotent-transitions",
    status: "enforced",
  },
  {
    id: "R18",
    dimension: "arch",
    law: "A cross-module read carries the caller's module rights: the team activity feed subtracts the caller's denied modules (ONE shared clause that any count over the feed must reuse), and every relatedTable a worker writes resolves to a module in ACTIVITY_GATE_MAP or a reasoned ACTIVITY_TABLE_EXEMPT entry. Earned by: a member with one read right seeing every module's before/after ('changed BIG-0000001 price from 4,500 to 3,900') through the one ungated feed.",
    checkId: "activity-gate-coverage",
    status: "enforced",
  },
  {
    id: "R19",
    dimension: "ai",
    law: "Agent/MCP filter parity: any tool sitting on a screen's list/search door EXPOSES and FORWARDS every filter that door parses — the required set is DERIVED from the door's own parameter parsing, never hand-listed. Earned by: the assistant falling back to free text and answering a DIFFERENT question — 3,465 descriptions that mentioned the words instead of the 134 records actually carrying the value.",
    checkId: "agent-filter-parity",
    status: "enforced",
  },
  {
    id: "R20",
    dimension: "arch",
    law: "Input is validated at the boundary — and it is SCANNED. Every field a worker reads off a request body must sit in a CHECKING position: the first argument of a validator from shared/workers/validate.ts (requireText / optionalText / queryText / requireIdList), the operand of typeof, inside Array.isArray() or Number(), a strict comparison against a literal, or the needle of an allow-list .includes(). Nothing else — a truthiness guard is not a type check, and a cast is not a check at all. A body may not be DESTRUCTURED at the read (that scatters untrusted values into bare locals nothing can follow). A door that genuinely cannot validate is a reasoned RAW_BODY_EXEMPT line, and the list may only SHRINK: a listed line that is no longer an offender turns the build red. The QUERY string is the other half of the same request and is censused the same way: every searchParams.get must sit inside a checker. That half was itself prose for months — \"locked separately by validate.test.ts\", which locks what queryText DOES and never asked whether a door calls it — and the census found the two that never did (realtime's ?user= and ?team=, each of which NAMES a Durable Object, sixty lines below a /publish door that caps its channel name for exactly that reason). Earned by: POST /api/auth/email/start with {\"email\": 123} — an unauthenticated 500 that crashed BEFORE the send throttle and wrote a row into the global core database on every request. This law existed as a sentence for months, claiming to be locked by a test that covers the query half and excludes auth outright.",
    checkId: "validated-bodies",
    status: "enforced",
  },
  {
    id: "R21",
    dimension: "arch",
    law: "A door on the AGENCY's own material refuses a client login, at the door. Every route reachable at the agency origin that a caller holding only the Client role's rights can pass — including every door gated by nothing but membership — must either refuse a portal caller (refusePortalCaller), resolve the caller's account fence (accountScope), be a door the client portal itself opens, or be a reasoned CLIENT_REACHABLE_EXEMPT line. The reachable set is DERIVED: the Client role's rights come from the seed, the routes from each worker's own ROUTES table, the gates from the handler source, the portal's surface from PORTAL_DOORS. Earned TWICE: the learning library and the dropdown vocabulary, then the ticket stakeholder list — each defended only by the OTHER gateway's allow-list, which is to say not defended, because the agency gateway forwards by prefix and a client login is an ordinary team member. Enumerate by WHAT A CLIENT CAN REACH, never by what a module owns.",
    checkId: "client-reachable-doors",
    status: "enforced",
  },
  {
    id: "R22",
    dimension: "ai",
    law: "Agent/MCP BODY-FIELD parity — R19's sentence about the other half of the request. A tool sitting on a WRITE door EXPOSES and FORWARDS every field that door reads off the request body: the required set is DERIVED from the door's own `body.<field>` reads — its handler plus any helper in the same file it calls, one level deep (R20 is what makes them legible — a body is never destructured at the read) — and the forwarding half is proved by RUNNING the tool's buildBody on a filled-in call rather than reading its source, so a builder that delegates to a helper is judged by what the door receives. The one level closed R19's blind spot in the same breath: while the scan read the handler alone, a door that factored its parsing into a helper beside it dropped out of the census entirely and its tool's obligations silently became none. A field deliberately left off is a named line in NARROWED_BODY_FIELDS with its reason, said again in developer English in MCP.md §3, and the list is a RATCHET: an excuse in front of a field the tool now exposes turns the build red. Earned by: R19 deriving its obligations from searchParams.get() only, so four write tools offered a narrower contract than their door accepted, for six weeks, under a green build — update_team could not set the logo, create_role could not carry its permission matrix, reply_help_ticket could not @mention, agent_chat could not attach a file. A law that only inspects the query string measures query strings.",
    checkId: "agent-body-parity",
    status: "enforced",
  },
  {
    id: "R23",
    dimension: "ai",
    law: "An answer from the knowledge base carries its sources, or it is not an answer. Retrieval never writes prose — it hands back the passages it found and the sources they came from, and the assistant composes the reply with those in front of it. So `found`, `passages` and `citations` are ONE decision made in ONE place (knowledgeAnswer): no citation means no passage, and a sentence the assistant must say instead of inventing one. No door may assemble that response by hand — the same shape as R14's pagedJson seam, and for the same reason: a door that builds half a contract ships half a contract, and here the missing half is the difference between \"we have nothing on that\" and a confident answer with nothing behind it. The compartment a question was answered from, and the REASONING that chose it, ride the same object, because a wrong compartment is invisible otherwise. And now the assistant writing it is sometimes US (2026-08-18): the Knowledge tab asks the door to compose the reply, one cheap model call, so the law's own sentence became a code path rather than a hope about a chat panel. It did not bend to make room. The prose is an INPUT to knowledgeAnswer, decided in the same expression as the citations (answer: found ? …), so a written answer cannot outlive its sources; the writer (lib/knowledge-compose.ts) is handed the settled passages and citations, reads nothing about found, and hands back a string; the door may not name answer: any more than it may name passages; and the passages reach the model FENCED, because half of them are words a client wrote. Earned by: the owner's own sentence in the brief — \"an answer with no source is a bug, not a style choice\" — and by what a sourceless answer costs where this one is aimed: an agency repeating it to a client.",
    checkId: "cited-answers",
    status: "enforced",
  },
  {
    // Minted as R23 by its own lane, which was building beside the knowledge
    // base and could not see it. Two laws cannot share a number, and the
    // knowledge base's was already written into CLAUDE.md — so this one moved.
    id: "R24",
    dimension: "arch",
    law: "A CONVERSATION THAT HAS READ A WITHHELD FIGURE MAY NOT THEN WRITE WHERE THE CLIENT READS. Per turn, refused at the step, before the door is called. `GET /api/tenancy/app-money` hands over what one app gives back priced IN FULL; the client's own value door (`GET /api/tenancy/impact`) nulls those prices on any app whose account has price visibility switched off. Same subtraction, one of them unredacted — so a figure that comes out of it is a number a particular client may be forbidden to see. The chain it closes is an injected one: a client raises a portal ticket carrying 20,000 characters of their own prose, that prose is read by the model the next time anybody here asks a question that touches tickets, and reply_help_ticket is a write gated on help:read, the lowest bar in the catalogue, confirming only when it @mentions somebody. Every door on that path does its own job and the number still arrives in the client's inbox. Both sets are DERIVED — the money doors from tenancy's own ROUTES and each handler's own source (the pin in shared/workers/money-taint.ts must equal them exactly), the client-readable doors from the non-GET half of PORTAL_DOORS, the TOOLS from those doors off the shipped catalogue at load time, so a money tool added tomorrow on an existing door is covered the moment it exists. It refuses BEFORE it defers: a confirm ends the turn and confirmAndRun resumes from a stored row that remembers nothing, so a proposal is judged when it is made and again as it runs. MCP cannot use this predicate at all — one tools/call has no turn, so moneyIsInContext is always false there and the ported check would pass with the hole open — so that surface refuses the money door outright, at forwardTool, asked of the door the call will actually open rather than of the tool's name. WHAT STOOD THERE BEFORE was one sentence of prose in a tool description, which is the least structural defence available and was being asked to hold against prose written by the person it protects the number from. THE INBOUND HALF OF THIS LAW WAS RETIRED ON 2026-09-10, and the retirement is the more interesting half of the row. R24 was written about internal_rates: what an hour of our own work cost us, and the margin computed from it, living in ONE file that nothing a client login could reach imported — structural rather than conditional, because a condition can be inverted and a permission can be granted while an import cannot be forgotten. The client retired that whole feature (\"kill the whole internal rates thing. will develop this in the future much much more but for now i iwanna wipe it clean\"), and the tables, the doors, the six tools, the two screens and workers/tenancy/src/lib/internal-money.ts went with it. It was RETIRED RATHER THAN RE-POINTED because after the removal no structurally-fenced number is left in this base: every money figure that still reaches a client reaches them because a CONDITION let it through — a sprint's sold price behind their account's price-visibility switch, a step's role rate behind the main-stakeholder fence, an app's running cost nulled on the row for a portal scope — and not one of them is fenced by the import graph, which is the only thing R24's inbound half ever measured. A law whose whole doctrine is \"not conditional\" cannot take a subject whose exposure is a condition without asserting something false. THE SENTENCE WAS CORRECTED THE SAME DAY IT WAS WRITTEN, and the correction is worth keeping. It first read \"every surviving money surface — the account rate card, a sprint's sold price, the savings priced off the client's own role rates — is shown to a client deliberately, behind their account's price-visibility switch\". An hour later the client retired the account rate card too (\"the whole account rates also killed it\"), which took the first item off that list and left the switch governing exactly ONE figure rather than two. The doctrine survived the edit because it never rested on WHICH surfaces exist; the enumeration did not, and a stated `why` that has stopped being true is the rot this codebase writes laws against. R15's retired half is the precedent and its sentence applies word for word: a law kept alive by a filter matching nothing buys confidence without paying for it. The outbound half never rested on the import graph, which is why it survived its own subject; the price it paid is that its door list is now derived from a NAMED SET OF FUNCTIONS (MONEY_READERS) rather than from a file's exports, and that is weaker, and it is written down in money-taint.ts rather than hidden.",
    checkId: "money-taint-outbound",
    status: "enforced",
  },
  {
    id: "R25",
    dimension: "ui",
    law: "A SAVINGS FIGURE NEVER RENDERS WITHOUT SAYING WHAT IT IS MADE OF. Every screen on either front door that shows a saving renders SAVINGS_CAPTION from shared/workers/savings.ts, word for word: the times are estimates we agreed with you, the subtraction is arithmetic. The check derives the screens from the payload they read (savedSecondsPerMonth / savedHours) rather than a hand-list, so a new screen is held to it the day it is written. Earned by the sentence the owner used about what would make him abandon this and go back to a spreadsheet — 'the numbers stop being believable'. A client who understands that the inputs are agreed and the arithmetic is arithmetic trusts the figure; one who believes we held a stopwatch stops trusting every other number in the app the day one of them looks wrong. The caption is not decoration around the feature, it is half of it.",
    checkId: "savings-caption",
    status: "enforced",
  },
  {
    id: "R26",
    dimension: "arch",
    law: "THE VECTOR INDEX NARROWS; THE TEAM'S DATABASE DECIDES. The knowledge base searches one account-wide Vectorize index, so two properties that used to be free have to be bought back explicitly. First, tenancy is a PARTITION and not a filter: every call into the store passes `namespace: guard.teamId`, built in one function (namespaceFor) from the caller's own guard and never from a request — Vectorize applies a namespace before the search, so a query cannot see another tenant's vectors even if every metadata filter were wrong. Second, and this is the clause that makes the first one survivable: nothing readable ever comes out of the index. It is asked for ids and scores alone (`returnValues: false`, `returnMetadata: \"none\"`, and a hit type with no text field), and every passage in every answer is then read back out of the TEAM'S OWN DATABASE under the caller's own owner clause with excluded sources gone. A mislabelled or stale vector can therefore cost a relevant passage; it cannot produce one the caller was never allowed to read. The check reads knowledge-vectors.ts and knowledge.ts off disk AND runs the doors against an index deliberately planted with lying vectors — one claiming the team shelf for a private source, one left behind by a source somebody excluded, one belonging to another team — and asserts none of them reaches an answer.",
    checkId: "vector-fence",
    status: "enforced",
  },
  {
    id: "R27",
    dimension: "ai",
    law: "DESCRIBED CONTRACTS — every `backticked` identifier in a tool description names something real: an argument the tool's own schema declares; a query param or body field its door reads (the same census R19/R22 stand on); a field its response actually carries — the pagedJson contract and the door's own extras read out of the call itself, the handler's own json({...}) literals, the row fields the module's libs map off a database row, and R23's knowledgeAnswer seam; another tool's name on either machine surface; or a reasoned DESCRIPTION_VOCABULARY entry. The vocabulary is a deny-list in spirit: every entry carries a reason, an entry nothing uses turns the build red, and so does an entry a derived class already covers. Nothing hand-listed that can be derived: tools from the three catalogue files themselves, doors from each worker's own switchboard, reads from handler source, response keys from the seams and the module's own libs. Scope, stated honestly: the law checks IDENTIFIERS, not sentences — a false sentence built from real identifiers is R19/R22's to make pointless; what THIS law ends is a name that exists nowhere surviving review because only humans read prose, and humans assume a green build checked it. Earned by: 2026-08-16 — a session reverted a tool description to a false promise, added two parameters that do not exist and a fake filter claim, and npm run check passed, because every law on the machine surface read the wiring (schema, buildQuery, buildBody) and none read the words a developer actually reads.",
    checkId: "described-contracts",
    status: "enforced",
  },
  {
    id: "R28",
    dimension: "ui",
    law: "A STRING THE APP SAYS IS IN THE CATALOGUE, AND THE CATALOGUE SAYS NOTHING THE APP DOESN'T. `shared/i18n-strings.json` must be exactly the set of user-visible English sentences the two front doors say, derived by re-running the ONE shared definition of what a person reads (`scripts/lib/i18n-source.mjs` — the same walk the extractor writes from and the adoption codemod wraps). That definition answers TWO questions, and both are DERIVED: which POSITIONS a person reads (the seven), and which FILES — `appFiles()`, the front doors' own import closure. A file is walked because a front door imports it, not because of the folder it happens to sit in. Three failures. MISSING: a sentence in the source that is not in the catalogue — English is the key, so an uncatalogued string is translated nowhere and ships in English to a reader who chose German. ORPHAN: a catalogue entry that matches no string in the app — nothing breaks today, which is precisely why it rots into a record of what the app used to say while being paid for on every build. UNREACHABLE: a file under web/, web-portal/ or shared/ that says something a person reads and that the walk never opens — censused off the DISK rather than off the graph, so a resolver that missed an import cannot hide behind its own answer, with a reasoned UNWALKED_OK line the only way out and a rot check so the list can only shrink. The walk stops at ONE directory, `shared/ui/`, the vendored component library: `resolveImport` always refused it, by package name, as 'somebody else's code and not ours to translate', and vendoring changed its address rather than what it is — the app still says its own words through the props it translates. The reason, and the screen-reader residue it leaves as real debt, are in VENDORED_UI_SCOPE. And the same sentence from the other end: the call site and the definition never disagree — every `t(\"…\")` literal must be a string the walk accepts, because a developer wrapping `t(\"of\")` has DECLARED it copy while isUserVisible refuses it as a non-sentence, and the fix is never to widen the predicate but to write the whole sentence with a hole in it, which is also the only shape a translator can reorder.",
    why: "The translation pipeline is BUILD-TIME (13.5): every language the app speaks, produced once per deploy, costing nothing at runtime. That design's whole load-bearing assumption is that the catalogue is current, and its only enforcement was a person remembering to re-run a script — the weakest kind of rule in a codebase whose other twenty-seven are machine-checked. The extractor already had a `--check` mode and it was never wired to anything. Then, on 2026-08-19, the second half of the question: current AGAINST WHAT? The set was six hand-written folders, and three kinds of copy had been living outside them under a green build. `formatRelative` (shared/web/format.ts) returned \"just now\", \"5m ago\", \"3h ago\" and \"2d ago\" in ENGLISH to nine call sites across BOTH front doors, so a German reader read *Erstellt von Aurora · 5d ago* — the translated half and the untranslated half of one line, on every record in the app. The whole language settings screen and the whole text-size section live in shared/web/, already wrapped in `t(...)`, in no catalogue; they only looked finished because the SEED happened to carry by hand the three languages somebody here can actually read. And shared/scale.ts holds \"Compact\", \"Comfortable\" and \"Large\", rendered through `t(step.label)` with the English one directory outside the walk. A folder list cannot be made correct, only current — and \"current\" is exactly what nobody notices going stale. An import cannot be forgotten, which is R24's reasoning applied to words instead of money. The check re-runs the real walker rather than describing it: a check with its own idea of \"a string a person reads\" would be a second definition, and the day the two drifted the build would stay green while the app spoke English.",
    checkId: "catalogued-strings",
    status: "enforced",
  },
  {
    id: "R29",
    dimension: "ui",
    law: "THE PAGE HAS ONE WIDTH, AND A SCREEN DOES NOT GET ITS OWN. Each front door owns exactly one page container — `web/components/shell/app-shell.tsx` at `max-w-none`, `web-portal/components/portal-shell.tsx` at `max-w-3xl` — and no other component may set a page-level width. A page container is identified positionally, the way R20 identifies a checked field: one line carrying `mx-auto`, `w-full` and a `max-w-*` together, which is the exact signature of a centred content column and of nothing else. Anything else that needs a cap (a dialog, a sheet, a door card, a chat bubble, a line of prose) is not centred-and-full-width and is not caught. Exceptions are DATA in `SCREEN_WIDTH_EXEMPT`, each with its reason, and every one is rot-checked: an entry whose file no longer sets a width turns the build red, so the list can only shrink.",
    why: "The owner named this one himself, and named it as an inconsistency rather than a bug: work logs, tasks and meetings use the full width, and he could not see why other pages did not. The answer was that those three render through the one shell and six screens cap themselves narrower. One of the six is the shell's OWN loading skeleton (`app-shell.tsx:489`, `max-w-2xl`), so every cold load of the agency app visibly snapped sideways as 672px of skeleton became 1120px of content. That is the shape of failure this law exists for: not a rule anybody disagreed with — UI-RULEBOOK L1 already said 'one container, one cap', and round one of the feedback implemented it in `deep-link-screen.tsx` — but a rule that was implemented in the one place somebody happened to be looking and stayed unimplemented in six others, silently, under a green build. A width is invisible to every other check in this repo: TypeScript sees a string, the lint sees a string, and no test reads layout. It ships a screen that works, on which two thirds of a wide display is empty.",
    checkId: "one-page-width",
    status: "enforced",
  },
  {
    id: "R30",
    dimension: "workflow",
    law: "EVERY EMAIL IS CLASSIFIED, AND ONE THAT NAMES A RECORD CARRIES THE WAY BACK TO IT. Every function in workers/ that composes a branded message (the `brandedEmail` / `sendBrandedEmail` seams — derived from the source, never hand-listed) must appear in EMAIL_CENSUS as either `record` (it is about a specific record: it passes `ctaUrl`, built through the one helper, shared/workers/record-link.ts) or `none` with a real reason (and then it must NOT pass `ctaUrl` — an email that names no destination may not promise one). Both directions: an unclassified send fails the build, and a census entry matching no send is an orphan and fails too. No email may spell an origin: the two front doors arrive as configuration, because THE RECIPIENT DECIDES WHICH APP THE LINK OPENS — staff read the agency app, a client contact reads the portal, and the same ticket therefore has two addresses. Sending a client an agency URL hands them a link they cannot open and advertises a door they may not pass (R21).",
    why: "The mention email said, in prose, 'Open the ticket to read the full conversation and reply' — and contained no link of any kind. The copy instructed an action the message made impossible, and it had been doing so since the notification path was written, because nothing in the build could see the difference between an email that links and one that only talks about linking. Buttons alone would have fixed twelve emails and nothing else: the thirteenth, written next year, would ship the same way. So the deliverable is the CENSUS — the same shape as R27's vocabulary and R13's exemptions — and the buttons are what it forced. The classification is also where the front-door decision is recorded, which is why it is a law and not a lint: 'which hostname does this go to' is a security question wearing a formatting question's clothes.",
    checkId: "linked-emails",
    status: "enforced",
  },
  {
    id: "R31",
    dimension: "ui",
    law: "TWO RADII AND NO THIRD, SPELLED THE KIT’S WAY. A rectangular surface is `rounded-[var(--radius)]` and a pill is `rounded-pill`; a directional variant of the first is the same word applied to one edge, and the law has never constrained WHICH edge or WHERE — the check reads the VALUE, and `rounded-t-[var(--radius)]` is admitted because the value and the token are the two radii's own. TWO POSITIONS ARE NAMED, and the second was added 2026-09-10 rather than left to look like a breach: a SHEET that meets the bottom of the screen (the original), and THE TOP BAND OF A PINNED TOOLBAR, which carries its container's own top corners with it while the container's real top edge has scrolled away (R63 part 4, the client's \"when pin, i still want it round\" — `shared/web/pinned-chrome.ts` has the measurement, and the kit's own `list.tsx` already spells the same word on a list's first row). Neither is a new radius: one value, one token, one edge of it. No other step of the scale may be written in `web/`, `web-portal/` or `shared/`, and `shadow-*` stays at exactly one use. ONE further radius is admitted, as DATA with its reason in `RADIUS_EXCEPTION` and rot-checked so an exception nothing uses turns the build red: `rounded-select` (6px), on the mark of a selection control, because at `rounded-xl` a checkbox is a lozenge and at `rounded-full` it is a radio button. The kwapso kit admits a second (4px on a bar, on the grounds that a bar is not a box), and the kit's gantt, heatmap and flowchart now draw it as `rounded-[var(--radius-bar)]`. The kit vendored at `shared/ui/` SPELLS THE SAME TWO WORDS THROUGH ITS TOKENS: `rounded-pill` is its pill (`--radius-pill`, the themable spelling of `rounded-full` — data in `RADIUS_EXCEPTION` with the rest), and any `rounded-[…]` whose bracket RESOLVES THROUGH A RADIUS TOKEN — `var(--radius…)` plain, on one edge, `inherit`, or a `calc()` over the token for a concentric inner corner — is the same vocabulary spelled where a named step cannot reach. What stays forbidden is exactly what was always forbidden: a NAMED third step (`rounded-lg`, `rounded-md`, `rounded-2xl`…) or a bare number that answers to no token. A third BOX radius is still forbidden. Enforced by one grep, because every step from `sm` to `3xl` already resolves to the same 24px in this theme. NOTHING is out of scope: the vendored component library was excused for one day and the exemption's own rot check deleted it the moment the reskin collapsed those radii.",
    why: "It is the cheapest rule in the book to obey and it was the most broken: 63 of 125 radius classes were off-vocabulary — `rounded-lg` 52 times, `rounded-md` 7, `rounded-2xl` 2 — and changing every one of them moved NOTHING on screen, because `--radius-sm` through `--radius-3xl` are all `var(--radius)`. So five words were in use for one value, which means five decisions a developer can make where there is only one, and the day the theme gives those steps different values the app acquires five radii it never chose. The law could not be written before the fix, because a law that ships with a 57-line exemption list is a list and not a law. It ships the moment the grep is clean. THE ONE THING IT DOES NOT REACH is the bare `rounded` class: that is 4px here, not 24px, so it is a genuinely different value on an inline highlight and a 32px thumbnail, and folding it in would be a redesign wearing a sweep's clothes.",
    checkId: "two-radii",
    status: "enforced",
  },
  {
    id: "R32",
    dimension: "ui",
    law: "EVERY COLOUR RESOLVES THROUGH A TOKEN. No screen in `web/`, `web-portal/` or `shared/` may name a Tailwind colour ramp (`amber-*`, `emerald-*`, `red-*`, `green-*`, `blue-*`, `slate-*`, `gray-*`, `zinc-*` …) or write a hex literal. What a colour MEANS has a token — `warning`, `success`, `destructive`, `muted`, `primary`, `chart-1` to `chart-5` — and a mark comes from the chart series (UI-RULEBOOK C6). The five files that legitimately hold hexes are DATA in `PALETTE_LITERAL_OK`, each with its reason, and rot-checked so the list can only shrink.",
    why: "A hard-coded colour is invisible to a theme. `import-screen.tsx` said `amber-600` and `emerald-500` where it meant warning and success, so the one screen in the app that reports a result was the one screen a rebrand could not reach; `shared/departments.ts` held five hexes the LEGACY app had chosen, none of them one of kwapso's own seven, so a department dot was the single mark on screen that did not belong to this product's palette. Neither was a bug anybody would file — both look fine, in one theme, on one day. That is the whole argument for making it a law rather than a review note: colour drift is only ever visible in aggregate, and nobody sees the aggregate.",
    checkId: "closed-palette",
    status: "enforced",
  },
  {
    id: "R33",
    dimension: "ui",
    law: "EVERY EXTRACTED POSITION ASKS FOR ITS TRANSLATION. R28 makes the catalogue match the code; this makes the code READ the catalogue. Every position `scripts/lib/i18n-source.mjs` reports in `web/` or `web-portal/` — the same one definition, so the two laws can never disagree about what a sentence is — must sit inside a `t(...)` call, with exactly two ways out. A `label:` or `helpText:` on an object that spreads a field config is translated ON THE WAY TO THE SCREEN by `shared/web/field.tsx`, which is positional (the object says what it is) and is held shut by the second half of the check: NO file in either front door may import `Field` from the library directly, so the seam cannot be walked around. The ban is matched on the PATH TAIL of the kit's Field — `components/field/field` since the kit's v1.1.0 layout move folded `controls/` and `structures/` into one `components/` on 2026-08-27 (it was `controls/field/field` from the design-kit swap until that move, and `primitives/field/field` before the swap, and each rename is exactly why the tail must move WITH the file: a ban matching a path nothing imports is a ban that passes vacuously, which it silently did for one evening until the story pass caught it). The check no longer takes the literal on trust — it asserts `shared/web/field.tsx` actually imports that tail before judging anybody by it, so a fourth rename fails loudly rather than reporting all clear. That guard was added when the second rename landed; this SENTENCE was not, and named the dead `controls/…` tail until 2026-09-06. Everything else is a copy TABLE read through `t` somewhere else, and each one is DATA in `TRANSLATED_WHERE_READ` with the seam that reads it, rot-checked both ways — a pin that no longer has an unwrapped position of that kind turns the build red, and so does a `via` that no longer appears in the source, so the list can only shrink.",
    why: "R28 could be perfectly satisfied by an app that speaks English to everybody, and on 2026-08-18 it was: 666 of 2,001 extracted positions — every form field label in the app, 119 of the toasts, both error boundaries and every dialog title written as a ternary — were in the catalogue, translated at build time into every language the app speaks, and never asked for. The catalogue was current and the screens were English, because nothing had ever checked that an EXTRACTED position is a WRAPPED one. The field labels are the reason it went unnoticed for so long and the reason the fix is a seam rather than 138 edits: a field config is a module-level constant, `t` is a hook, so `t(...)` genuinely could not be written where those words are declared — the one class of string in this app that a developer could not have wrapped even if they had thought to. `translateRecipe` had already answered the identical question for the screen recipes (declare the English, translate on the way to the screen); this is that answer applied to the other half of the app, plus the import ban that makes it provable.",
    checkId: "wrapped-strings",
    status: "enforced",
  },
  {
    id: "R34",
    dimension: "ui",
    law: "THE GLOSSARY IS THE DICTIONARY THE SCREENS SPEAK. Every user-visible English sentence in the two front doors — `shared/i18n-strings.json`, which R28 makes exactly that set — is read for a KNOWN SYNONYM of a glossary term. The banned words are DATA (`GLOSSARY_SYNONYMS`), each naming the term it competes with, and a sentence that has a reason to keep one is an entry in `GLOSSARY_SYNONYM_OK` with that reason, rot-checked so the list can only shrink. The list is deliberately NARROW: a word earns a place only when it can mean nothing else in this app.",
    why: "R6 has always said two things and only one of them was checked. `glossary-wellformed` reads the glossary FILE — term non-empty, definition brief, no duplicates — and not one line of the app. So the half of the law a person actually experiences (\"use those words in UI copy; never invent a synonym\") was enforced by nobody, and the app shipped green saying \"Permissions\" on one screen and \"access rights\" on another, \"teammate\" for a member, \"cost card\" for the internal rates and \"Portal login\" for portal access. Two words for one thing is not a typo: a manager reading \"Permissions\" and \"Access right\" has to work out whether they are the same, every time, and the answer is not on the screen. WHY A DENY-LIST RATHER THAN A REQUIREMENT that every sentence use only glossary words: because most sentences are ordinary English, and a rule that flagged them would be turned off. This one may only get smaller — a word comes off the list when the term goes, never because a screen wanted it back.",
    checkId: "glossary-in-copy",
    status: "enforced",
  },
  {
    id: "R35",
    dimension: "ui",
    law: "A RECORD NEVER APPEARS WITHOUT ITS FACE. Wherever a record or a dropdown value is shown to be chosen or scanned — a picker option, a row in a collection, a row in a nested panel inside another record's screen — it is drawn with its visual beside its name: its own picture where it has one, its type's glyph where the type has one, and its initial where it has neither. Never nothing, and never the glyph written INTO the words (a pictograph inside a sentence is the one shape UI-CONVENTIONS §5 refuses). Enforced at the three places it can be lost rather than by inspecting markup: `PickerOption` and `PickableRecord` must DECLARE the visual fields, so a type cannot drop a picture before a component sees it; every list recipe must name its `leading` column; and the one shared nested row (`Row` in work-panels.tsx) takes its mark as a REQUIRED prop, with `null` a real and visible answer.",
    why: "A visual is a key identifier, not decoration on the main page — the owner said so three times across two rounds, and each time the fix was applied where he pointed and nowhere else. The census on 19 Aug 2026 found the true size: THIRTY-THREE pickers, not one of which could show a visual at all, because `PickerOption` had no field for one; ten of fourteen list recipes naming no leading column; around twenty nested panels drawing bare words for records that lead with a glyph on their own screen; and `PickablePerson` dropping `imageUrl` one line before every picker that offers a person. WHY THE CHECK IS POSITIONAL RATHER THAN VISUAL: there is no honest regex for 'this JSX is a record row' — `.map(x => <li>` matches attachments, replies, comments and steps, none of which are records. So the rule stands on the three CHOKEPOINTS instead, which is the same move `record-picker.tsx` being the only composer of `command` already makes: a field that is not carried cannot be forgotten later, it is already gone, and a required prop cannot be skipped by a twenty-first panel. TWO PICKERS HAD WORKED AROUND THE MISSING SLOT by concatenating the emoji into the label, which put a pictograph in the search index and on the trigger; both now pass it as a mark.",
    checkId: "records-carry-their-face",
    status: "enforced",
  },
  {
    id: "R36",
    dimension: "arch",
    law: "EVERY SWITCH ON THE PERMISSION MATRIX DECIDES SOMETHING. The matrix is a grid, so a module gets four boxes whether or not four decisions exist behind them — and a box that decides nothing is one an owner ticks, saves, and believes they granted by. The offered set is data (`MODULE_OFFERED_RIGHTS`, exceptions only, so it can only shrink), and the consulted set is DERIVED off the source: literal `requireRight`/`gated`/`gatedBody` pairs, the MCP `TOOL_GATES` strings, every module in `ACTIVITY_GATE_MAP` (which the record feed asks for `read` on) and every import `TARGETS` module (which the importer asks for `create` on). The check fails BOTH ways. Offered-but-unasked is theatre. Asked-but-unoffered is worse and is the half that matters: a door written against a right no role can be given refuses everybody, including the Admin role, which is locked and cannot be edited to fix it. Earned on 21 Aug 2026, when the owner asked what the twenty-three rows were for: fifteen of the eighty-eight boxes decided nothing, seven of them undocumented, and one whole module (`screens`) had four boxes and no door — its two doors gate on `teams:edit`. Two more modules, `learning` and `marketing`, still held permission rows six weeks after the product purged them, because a purge deletes forward and migration 0021 had CROSS JOINed them onto every role.",
    checkId: "offered-rights",
    status: "enforced",
  },
  {
    id: "R37",
    dimension: "arch",
    law: "A LINK INSIDE THE APP NEVER LEAVES THE SHELL. The whole post-auth app is ONE client-resolved shell that mounts once and never unmounts, so every move within it is a History-API push through the single soft-navigation bus (`softNavigate` / the host's `go()`) and nothing is fetched. A bare `<a href=\"/t/…\">` opts out of all of it: the browser discards the document, every module re-runs from nothing, the warm cache and any running agent are destroyed, and the boot mark plays again because the module-level session cache has reset to empty. So an in-app destination is written with `<InAppLink>` — a REAL anchor, so middle-click, copy-address and screen readers still work, with only the plain left click intercepted — or it carries that same interception inline. The check is a CENSUS OFF THE DISK of every component's anchors, classified by where the href points: inside the app, an `/api/` door, a pre-auth route, or elsewhere. Not a hand-list of files, and not one spelling of the mistake.",
    why: "Earned three times, by one class of bug, under a green build each time. First the knowledge base, which was missing from `TOP_LEVEL_MODULES` so every tap on a sidebar page left the History API — the note is still in `deep-link/route.ts`. Then \"Manage dropdowns\", which the owner reported himself on 24 Aug 2026 in the words that name the mechanism exactly: \"I can see the app reload because I see the boot loading animation\" — and the boot mark's trigger is a module-level `sessionCache` that only a fresh document can reset. Then the internal rate card, whose own comment says it copied the dropdowns link, which is what turns a typo into a pattern. THE GUARD THAT EXISTED COULD NOT SEE TWO OF THE THREE: `shell-nav.test.ts` read SIX hand-listed files for ONE spelling (`router.push`), and a bare anchor in any of two hundred other components is a different spelling in a file nobody listed. That is R21's lesson arriving in a second module — enumerate by what NAVIGATES, never by what somebody remembered to write down — and it is why the seam is a component rather than a convention: a bare anchor is now a red build, and there is exactly one way to write the right thing.",
    checkId: "in-app-anchors",
    status: "enforced",
  },
  {
    id: "R38",
    dimension: "ui",
    law: "A RECORD DETAIL MAY NOT LOOK ITS RECORD UP IN A PAGE. A screen that shows one record of a collection R14 makes PAGE (`GROWING_COLLECTIONS`) must read that record by ID — a dedicated per-record door, or a `<module>:one:<id>` fallback beside the list — never a `find` over the cached list, which holds only the loaded prefix. The check is POSITIONAL, as R20's is: it ties the `find` to the query VARIABLE built from a paged cache key, so a find over a BOUNDED collection (apps, member roles) — where page one IS the collection — is never caught. The by-id key then has to reach a listener like any other (R15), or a status change patches the list and leaves the open record showing yesterday.",
    why: "The owner opened a ticket from the triage queue on 26 Aug 2026 and was told 'That ticket no longer exists.' It existed: number 1,030 of 1,820 in staging, and the entire lookup was a `find` over the newest fifty rows. Every ticket past the cursor was unreachable by direct link, from an email button, from a bookmark — and the screen made the most alarming claim available to it, that the record was gone, on a collection whose whole point is that it grows. Nothing was red: the door had answered `?id` since paging landed and says why in its own comment, and the API client's `helpOne` had been written and never called. Three sibling screens already had it right — `meeting-detail` and `knowledge-detail` name the variable `inPage`, and `story:one:` was added to the live registry in August after the identical fault — so this was one screen left behind by a pattern the rest of the app knew. R14 made the lists page and nothing asked what that did to the screens that read them.",
    checkId: "details-ask-the-door",
    status: "enforced",
  },
  {
    id: "R39",
    dimension: "ui",
    law: "THE KIT SUPPLIES THE UI, AND NOTHING ELSE DOES. No file in `web/`, `web-portal/` or `shared/web/` imports a UI package. The kit at `shared/ui/` is the one source of a control, a structure, a glyph and a toast; its own dependencies (Radix, sonner, recharts, class-variance-authority) are ITS to import, and the app reaches them THROUGH it — `@shared/ui/components/sonner/sonner`, never `sonner`. The deny-list is DERIVED from the kit's own package.json peers plus the icon packs, so a dependency the kit adds tomorrow is covered without anyone editing this law. Exceptions are data in `UI_PACKAGE_EXEMPT` with a reason each, rot-checked so a pin whose file no longer imports the package turns the build red and the list can only shrink.",
    why: "A design system is a source of truth only for as long as nothing else can supply the same thing, and every breach of that starts as one import for one component the kit did not have that day. The icon swap of 2026-08-27 is the worked example: 96 kit glyphs were not enough, so five files imported lucide directly and a sixth reached for lucide's RUNTIME loader, which meant the app carried a second icon pack of 3,924 glyphs — and when the kit's art changed, thirty-seven names kept drawing the OLD pack beside the new one, on the same screen, under a green build. Nothing was wrong with any single import; the whole was a second design system nobody had decided to have. This law is the sentence that makes the next one impossible, written the day the last one was removed rather than after the next one arrives.",
    checkId: "kit-supplies-the-ui",
    status: "enforced",
  },
  {
    id: "R40",
    dimension: "arch",
    law: "A STORED FILE MUST REACH A PERSON. Every call that puts BYTES in a bucket — an `env.<BUCKET>.put(` on a binding the wrangler configs declare as an `r2_bucket`, or the one shared seam that does it for you (`storeImageDataUrl`) — is claimed by an entry in `STORED_FILES` naming the FIELD a person reads the reference back through and the front-door FILE that renders it. Both halves are DERIVED: the write census is read off disk, so a new upload door cannot ship unclaimed; and the render is proved by finding that field reaching a fetched ATTRIBUTE — `href=`, `src=` or `picture=` — in that file, directly or through a `const` assigned from `safeHref`/`safeSrc`. A field that only ever reaches a form's values is NOT a read: that subtraction is the whole discriminator, because a filename written back into an edit dialog is not a file anybody can open. Rot-checked both ways, so an entry whose door no longer writes bytes turns the build red and the list can only shrink.",
    why: "THREE INSTANCES OF ONE BUG, all green. R15 makes a published change reach a listener and R16 makes a count reach a screen; nothing made BYTES reach a person, so the app grew three doors that accepted a file, stored it perfectly and led nowhere. A story's attachments were written by one dialog and rendered by no screen at all. A client uploaded a document through the portal's \"Send a file\" and the agency was shown the FILENAME as plain text in a metadata line — the URL was on the row and read by nothing. A task's `file_url` was write-only from the day it shipped. In all three the door answered 200 and the bytes were in R2, which is exactly why no test and no reviewer caught it: everything worked except the last step, and the last step is the only one a person experiences. The check has to walk write-to-read, because that is the direction the failure runs, and it has to subtract form values, because a field round-tripped through an edit dialog looks like a read and is not one.",
    checkId: "reachable-bytes",
    status: "enforced",
  },
  {
    id: "R41",
    dimension: "arch",
    law: "A FILE SOMEBODY PICKED IS EITHER SENT OR REFUSED, NEVER DROPPED. R40's sibling, and the boundary is the point: R40 asks whether a STORED file reaches a person, so where nothing is stored it is silent by construction. A create dialog cannot upload while somebody types — R2 is addressed by the record's id and on a create that id does not exist yet — so the picked files wait and are hung on whatever `onSubmit` HANDS BACK. Every dialog that defers an upload that way is a line in `DEFERRED_UPLOAD_FORMS` naming the maker whose id it needs, rot-checked against the dialog still deferring; and every CREATE call site of it, censused off the disk, must actually return that id — either as a concise arrow whose body IS the maker call, or as a named value that is returned. A site passing the record's id is an EDIT and is skipped, read from the same prop the dialog itself switches on. Deliberately NARROW: the fault is a DISCARDED RESULT rather than a missing call, so there is no absent function to census, only a value that goes nowhere — an honest small law that can be checked beats a general one that cannot.",
    why: "Three of the four `<StoryFormDialog>` create sites did `await createStoryFrom(...)` and threw the id away, so `target` was null, the guarded upload never ran, and every file picked in those forms was dropped in silence: story created, success toast, no error, no row, no object, nothing to recover from. `createStoryFrom` had returned the id since the day the upload was written — the callers simply did not pass it on, and a discarded value looks exactly like correct code. It is the worse half of the class R40 names: R40's failures at least leave the bytes in the bucket. Found 2026-08-27 while answering a different question about the same dialog, which is the third time in one day this class was found by pulling on a thread rather than by any check.",
    checkId: "picked-files-are-sent",
    status: "enforced",
  },
  {
    id: "R42",
    dimension: "arch",
    law: "Every accepted source type resolves to a declared reader on EVERY door, or to an honest refusal — and no door chooses its own.",
    checkId: "declared-readers",
    status: "enforced",
  },
  {
    id: "R43",
    dimension: "ai",
    law: "Agent/MCP TOOL-SET parity. A tool that exists on the agent's own catalog exists on MCP's too, or the gap is a named, reasoned line — and the reverse.",
    why:
      "R19/R22's coverage census only asks whether a door has a tool on SOME machine surface, so a door with an agent tool and no MCP tool (or the reverse) passes that census trivially — the asymmetry the owner's own sentence names (\"same thing an agent can do, same thing from MCP\") was never itself checked. Every one of the 25 agent-only and 23 mcp-only tools turned out to be a real, written decision (MCP.md §3), but the comment introducing the agent's own AGENT_ONLY array had drifted to naming four of them while twenty-five existed — a law that stops looking when a block grows is a law that rewards growing it quietly.",
    checkId: "agent-mcp-tool-parity",
    status: "enforced",
  },
  {
    id: "R44",
    dimension: "ui",
    law: "A CATALOGUED STRING MUST BE ANSWERED, UP TO A CEILING THAT ONLY FALLS. R28 makes `shared/i18n-strings.json` exactly the set of English sentences the app says; R33 makes every one of those positions ask for its translation. Neither asks whether the ASKING is ever ANSWERED — a string can be extracted, wrapped in `t(...)`, and still have no entry anywhere in `overlay(CATALOGUE, SEED)` for a translated language, which is a silent English sentence on a screen that otherwise looks finished. Per translated language, the count of extracted strings with no non-empty entry — the same predicate `coverage()` already uses — is pinned in `TRANSLATION_CEILING`. The check computes the true count fresh, off the same three files, and requires it to equal the pin exactly: an untranslated string added past the ceiling fails the build (a regression), and a ceiling left higher than the true count after a translation lands fails it too (a stale pin hiding the next regression behind the improvement it never recorded). The pin can fall; it can never rise without the count behind it rising too.",
    why: "Not a hard zero. `shared/i18n-catalogue.ts` says a missing translation degrades to English on screen, which is a sentence rather than a bug — an app can ship one language ahead of the rest without being broken, and it does today by 307 strings in three languages, mostly the process-map and Google-connections screens built after the last translation pass. A hard zero here would turn every ordinary feature PR red the moment it adds one new label, and a red build that fires on unrelated work is a build people learn to route around — which is worse than no law, because the next accidental regression hides behind the routine one. A ceiling that can only fall keeps the debt VISIBLE and BOUNDED without making it un-shippable: adding untranslated copy is still free, but it is no longer free to hide, because the pin has to move in the same diff and a reviewer sees it move.",
    checkId: "translation-ceiling",
    status: "enforced",
  },
  {
    id: "R45",
    dimension: "ui",
    law: "EVERY KIT COMPOSITION IS DECIDED. All 47 files under `shared/ui/compositions/` (the pinned kit's screen-shaped assemblies, one directory level above its components) are derived off disk, and each one resolves to EITHER an adoption this app actually reaches — a direct `@shared/ui/compositions/...` import in `web/`, `web-portal/` or `shared/web/` — OR a reasoned entry in `COMPOSITION_EXEMPT`, naming why not: a genuine structural mismatch, a shape already assembled from other already-adopted kit parts under a different name, a real gap this app should or should never have, or a question left for the owner. The two acceptable outcomes are adopted, or DELIBERATELY not used for a stated reason — a composition nobody looked at, or hand-rolled screen UI that quietly duplicates one, is the only unacceptable result. Rot-checked both ways, so the exemption list can only shrink: a composition with neither an import nor an exemption turns the build red, and an exemption whose composition is now directly imported turns it red too.",
    why: "The owner's own words, 30 Aug 2026: \"make sure that we get 47 out of 47 compositions... if there are some compositions that we don't use, I completely get that, but flag those... there should be nothing that we have hard-coded unless it's some kind of composition that does not exist.\" Two lanes had worked through 37 of the 47 by hand, in prose, with no check behind it — which meant the count could regress the moment a new composition landed in a kit update, or the moment somebody hand-rolled a screen that duplicated one, and nothing would say so. The census is deliberately a DIRECT-IMPORT string match, the same shape as R39's: it undercounts a genuine transitive adoption (a composition reached only through another kit part), but an undercount fails safe into \"go write the exemption down\", where an over-count would let a real gap hide behind a stale claim.",
    checkId: "composition-coverage",
    status: "enforced",
  },
  {
    id: "R46",
    dimension: "ui",
    law: "EVERY KIT COMPONENT AND FOUNDATION RESOLVES TO A REACHED ADOPTION OR A REASONED, ROT-CHECKED EXEMPTION. The kit at `shared/ui/` ships every directory under `components/` plus the three foundations (icons, tokens, motion). The number is DERIVED and written down nowhere: `kitInventory()` in `scripts/kit-coverage.mjs` reads it off the pinned tree, so it moves with the pin instead of rotting in four documents. The count came from the owner, with his instruction: \"all 118 components should be imported, and if you're not using some, I understand that, but there should be nothing hard-coded.\" A part is REACHED, not merely imported: `computeReachability` (`scripts/kit-coverage.mjs`) seeds from every kit reference either front door or `shared/web/` makes, in EITHER language the kit ships in — a JS/TS `from \"@shared/ui/…\"` or a CSS `@import \"…\"` — then closes over the kit's OWN cross-references (a component that imports another, a stylesheet that imports another) until nothing new appears, so a part reached only through another adopted part, or only through a stylesheet, still counts. Every part the walk does not reach is claimed by a line in `KIT_COMPONENT_EXEMPT` naming the one sentence a non-technical reader can check — no surface in the app has this shape, or adopting it would break another law. Rot-checked BOTH ways: a part the walk NOW reaches loses its exemption, and a part with no exemption and no reach fails the build — so the list can only shrink.",
    why: "Counting only JS/TS import lines undercounted in the SAME direction seven times in one day, and always by dropping a real adoption rather than inventing a false one: six parts reach the app only through another kit part it has already adopted (`notes` through Comments, `folder` through Tabs, `title` through the kit's own `record-detail`, `progress` through `file-upload`, `gallery` and `checklist` picked up by two other lanes overnight with nobody re-running the census to notice), and `motion` reaches both front doors only through a CSS `@import` in their own `globals.css` — a reference no JS-import grep can see in either direction, because there is no import LINE in that language for it to miss. Canaried both ways: deleting the `@import` from both `globals.css` drops the reached-foundations count from 3/3 to 2/3, and restoring it recovers 3/3. A census that misses seven real adoptions cannot tell an unimported part from a badly-walked one, so the exemption list this law rot-checks is only honest once the walk it is checked against actually follows both languages the kit speaks — the same lesson R39's own deny-list learned about a THIRD dependency (an icon pack) arriving by a route nobody grepped for, applied here to the SECOND language a stylesheet speaks.",
    checkId: "component-coverage",
    status: "enforced",
  },
  {
    id: "R47",
    dimension: "ai",
    law: "EVERY MODULE A PERSON CAN SEE, THE ASSISTANT CAN ANSWER ABOUT — AND WHAT IS NOT IN THE CORPUS SAYS WHY. Two clauses over one census, derived from the permission matrix itself (`TEAM_MODULES`, every module that offers a `read` right). FIRST: each of them resolves to at least one way the assistant can answer — a KNOWLEDGE KIND that mirrors it (`INGEST_KINDS`, its module read off the kind's own `table` through `ACTIVITY_GATE_MAP`/`QUERY_MODULES`, or off the `modules` a kind declares when its text carries more than its table), or a GATED READ TOOL on the agent's own catalogue (the tool's door found in that worker's own switchboard, its module read off the handler's own `requireRight`/`gated` pair), or a reasoned `ASSISTANT_BLIND_MODULES` line. SECOND, and this is the clause with the teeth: a module reachable ONLY by tool declares IN WRITING why its material is not in the searchable corpus — a `CORPUS_EXEMPT` line, rot-checked, so a module that gains a kind must lose its excuse and the list can only shrink. Nothing hand-listed: the modules come from the matrix, the kinds from the sweep, the tools from the catalogue, and each tool's gate from the source of the door it forwards to.",
    why: "The owner's own sentence, 1 Sep 2026: anything he can see in the app, the knowledge base should be able to see. He proved it was false the way he proves everything — he asked. \"What is Alex's full name?\" was unanswerable, and not because retrieval failed: NOTHING anywhere in the base said who his own colleagues are. `staff_profiles` carries a `user_id` and no name at all, and the names live in the global core database, so no team table could have answered it. TWO CLAUSES BECAUSE ONE WAS MEASURED AND FOUND TOOTHLESS. The first draft asked only whether a module was reachable at all, and the census came back 21 of 22 green — every module already had a list tool, which is exactly why the failure was invisible: a tool answers when you know to call it, and a person asking a vague question reaches the corpus. So the law separates the two and makes the corpus gap a written decision rather than an accident. THE MONEY IS THE CASE THAT SETTLES THE SHAPE: what a client's apps give back, priced, is reachable by tool (`get_app_impact`, on a door that refuses a client login), and it must NEVER be in the corpus, because the corpus has exactly one gate — `knowledge:read` — and no way to subtract a caller's denied modules. A law that only asked 'is it reachable' would have called that a pass and said nothing; a law that demanded a kind for every module would have demanded the breach. Written down, it is the true sentence: reachable, but only by the people who could already see it.",
    checkId: "assistant-coverage",
    status: "enforced",
  },
  {
    id: "R48",
    dimension: "ui",
    law: "THE TOOLBAR, SEARCH INCLUDED, IS A DEFAULT — NEVER A PER-SCREEN CHOICE. Every collection/data-view screen draws its toolbar's search box UNLESS a named, reasoned entry says otherwise. Two censuses, off the disk, never a hand-list: every `BASE_RECIPES` entry (`web/lib/screens.ts`) whose recipe carries a `CollectionConfig` must have `searchable: true`, or be named in `TOOLBAR_EXEMPT`; and every `<ToolbarRow>` call site across `web/` and `web-portal/` (`web/components/deep-link/screen-bits.tsx`'s own bespoke toolbar, reached by a bounded collection with no recipe search to inherit) must pass a `search` prop, or be named in the same registry. Both directions are rot-checked: an exemption whose file no longer matches the condition it was pinned for fails the build, so the list can only shrink.",
    why: "The client's own words, correcting a narrower answer already given once: \"I don't care here. You're giving me specifics, and I told you that the toolbar, including the search, should be absolutely everywhere we have a data view or a collection view. Stop hardcoding this. Just write it as a rule.\" A recipe's `searchable` flag and a bespoke `<ToolbarRow search={…}>` prop were both ORDINARY optional fields before this law — nothing stopped a screen from omitting either, and two did, silently: Tasks' Calendar tab and Triage both drew a toolbar with a button and no search box at all, reasoned only in a code comment nothing read at build time (\"the calendar has no search of its own\"). Flipping the default is the only fix that cannot regress the same way twice — an opt-IN can always be forgotten by omission, which is exactly what happened; an opt-OUT has to be written down, named, and given a reason a reviewer can read, in the same shape R31/R32/R29 already use for their own reasoned exceptions. A collection genuinely and permanently empty of rows (`WaveFinder`'s and Sprints' own \"nothing to search yet\" fallback) is the one legitimate reason left, because a search box over zero rows is a control that cannot do anything — and that reason is now written down rather than assumed. SUPERSEDED IN PART, R50 (2026-09-03): that fallback shape — a bare `<ToolbarRow actions={…}>` reached only once the collection was empty — is exactly how a create button kept escaping this law's own two censuses, because both only ever asked whether `search` was present, never whether `actions` agreed with it. Both call sites now carry one `<ToolbarRow>` gated by R50's own required `empty` prop instead, and `TOOLBAR_EXEMPT` no longer names either.",
    checkId: "toolbar-shows-search",
    status: "enforced",
  },
  {
    id: "R49",
    dimension: "ui",
    law: "THE GAP BETWEEN A TOOLBAR ROW AND WHAT IT SITS ABOVE IS ONE NUMBER, PAID BY THE ROW ITSELF, NEVER A PER-SCREEN MARGIN. `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) pays `--toolbar-content-gap` (`web/app/globals.css`) as its own trailing margin, on its own root, so every call site gets it for free. No call site may ALSO wrap the row in a gapped flex column or space-y stack, and no call site may pass a competing `mb-*` in its own `className` — either is the same number being spent twice, which is how it grows past what it was meant to be. Checked as a census off the disk: `ToolbarRow`'s own definition must carry the token, and no `<ToolbarRow>` call site (or the variable a screen names `*[Tt]oolbar*` and renders in its place) may sit inside a `flex-col` wrapper that ALSO declares its own `gap-*`/`space-y-*`, or pass a hardcoded `mb-*` of its own, unless named in `TOOLBAR_CONTENT_GAP_EXEMPT` with the real reason.",
    why: "The client's own words, item 5 of the 2026-09-03 spacing round: \"tehre's wahy too much space between the toolbar and the contenta\" — confirmed on every screen she checked, not a detail-screen-only thing. It had drifted into five different numbers doing the identical job: a wrapping `flex flex-col gap-N` div (`gap-2`/`gap-3`/`gap-4`/`gap-6`, 7.5–22.5px), a `space-y-3`, and a `className=\"mb-4\"` passed straight to the row — fourteen call sites, four mechanisms, no shared owner. The exact shape `--tab-content-gap` already fixed for a tab strip and its panel (R48's neighbour law in spirit, same client session), read the other way round: the STRIP pays its own trailing space so a caller cannot forget it or invent a new number, and a margin on a sibling is the thing that drifts — this law spends the same `--space-5` `--tab-content-gap` already uses, because both are 'the gap between a control strip and the content under it' and a system with one rhythm does not mint a second number for the same sentence.",
    checkId: "toolbar-content-gap",
    status: "enforced",
  },
  {
    id: "R50",
    dimension: "ui",
    law: "NEVER TOOLBAR ON AN EMPTY COLLECTION — NOT EVEN THE CREATE BUTTON. R48 made the search box a default; this makes the WHOLE row answer one question together. `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) takes a required `empty` prop — true when the collection holds zero rows before any search or filter narrows it — and returns `null` unconditionally when it is true, before any other slot (search, filters, sort, view, or `actions`, the create button) is even considered. `<PagedFind>` (`web/components/records/paged-find.tsx`) takes the equivalent required `restingEmpty` prop for the same reason on the door-searched half of the app, suppressing its own search/filters/sort/match-count/actions row the identical way while a genuinely empty collection is not being searched. `<SectionWithCreate>`'s own header-drawn create button (`showCreateInHeader`) carries the same gate through an optional `empty` prop, for the one shape neither `folderTabs` nor `useKitPanel` already covers. Two censuses, off the disk: every `<ToolbarRow>` call site across `web/` and `web-portal/` must pass an `empty` prop DERIVED FROM THE COLLECTION'S OWN ROW COUNT, and every `<PagedFind>` call site must pass a `restingEmpty` prop the same way — a prop that is MISSING, or hardcoded to a bare `{true}`/`{false}` literal (the row answering the question with a constant rather than real data), must be named in `EMPTY_TOOLBAR_EXEMPT` with the real reason. Rot-checked both ways, so the list can only shrink. THE THIRD CENSUS, added 2026-09-10, is the same sentence one layer down: a section heading built from a `<div>` and an `<h2>` is not a `<ToolbarRow>` and was outside both censuses above BY CONSTRUCTION, so five sections drew a create button over a collection holding zero rows while the empty state below them already offered the first add. `AddButton` (the app's one create-button seam, same file) therefore takes its own optional `empty` prop and opens with `if (empty) return null` before it draws anything, exactly as the row does; and every `<AddButton>` call site across `web/`, `web-portal/` and `shared/web/` must either sit INSIDE a toolbar's own `actions`/`renderActions` slot — where the row has already answered the question and a second copy of the answer is a second thing to get wrong — or pass `empty`, derived from the collection's own row count and never a bare `{true}`/`{false}` literal, or be named in the same registry. `SectionWithCreate`'s header button is not censused: it is drawn inside the declaring file, where `showCreateInHeader` already carries `&& !empty`, and that conjunct is asserted directly as part of the central-guard clause.",
    why: "The client's own words, verbatim, about a Time tab on a brand-new record: \"once again, when empty collection no toolbar at all - fix everywhere and set as a rule.\" \"Once again\" is the load-bearing word: R48 (2 Sep 2026) had already ruled 'NEVER TOOLBAR ON EMPTY COLLECTION' once, and `CollectionFrame`'s own `isEmptyState` branch (the recipe engine's kit-panel path) had correctly carried it since — but that law's own two censuses only ever asked whether a `search` prop was PRESENT, never whether the REST of the row agreed with it. A `<ToolbarRow search={data.length > 0 && …} actions={canCreate && <AddButton/>} />` passes R48 outright (it has a `search` prop) while still drawing a lone, floating create button the moment the collection is empty — precisely her screenshot: a Time tab with zero rows, no search box, no sort, no filter, just a circular orange \"+\" sitting above \"No time logged against this yet.\" The audit this law's own census forced turned up the identical shape SEVEN more times, each reasoned as if it were the intended design rather than the bug it was: Sprints' Overview/Calendar toolbar fell back to a bare `<ToolbarRow actions={…}>` \"the same gate waves-screen.tsx puts on its own finder\" (a comment describing the bug as a precedent); Waves' own finder did the identical fallback, precedent and all; a wave's own Sprints tab kept a `<ToolbarRow>` alive through `canCreate` alone, picker included, regardless of `sprints.length`; Deliverables, Modules, and every one of Client-org's three lists (departments/roles/tools) gated `search` on the collection's own length and left `actions` gated on nothing but a permission check; Dropdown values fell back to the exact same shape with an Import CSV button riding along; and Tickets' own Triage queue drew its toolbar from a PARENT component that could never see whether the CHILD's queue — fetched two components away — held a single row. The fix could not be a fourteenth per-call-site patch, so it is not one: `empty`/`restingEmpty` are REQUIRED props precisely because an OPTIONAL one is what let every one of these seven happen — a caller who remembers to gate `search` and forgets to gate `actions` the identical way is not a caller who forgot a rule, it is a rule that was never asked of that slot.",
    checkId: "empty-toolbar",
    status: "enforced",
  },
  {
    id: "R51",
    dimension: "ui",
    law: "A PANEL THAT MINIMISES COLLAPSES; IT IS NEVER UNMOUNTED ON THE STATE THAT ANIMATES IT, AND IT IS NEVER LEFT REACHABLE ONCE SHUT. Three clauses, all read off `shared/ui/compositions/templates/screen-shell.tsx` and `shared/ui/foundations/motion/motion.css`. (i) The assistant column must stay MOUNTED across the open/shut flip — a `isAsideOpen ? <aside…> : null` gate returns, and there is nothing left in the tree for an exit transition to play on. (ii) The wrapper that collapses must carry all four of `.motion-column-collapse`, a `data-state` bound to `isAsideOpen`, `inert` bound to `!isAsideOpen`, and a `--motion-column-size`; a collapsed column is zero-width and transparent but still in the tab order and the accessibility tree, so `inert` is what makes \"shut\" true for a keyboard and a screen reader rather than only for the eye. (iii) `.motion-column-collapse` in motion.css must NOT size itself with `grid-template-columns` / `fr` units. That is the shape this law exists to forbid: it is the row-collapse rule with the axis swapped, it looks right, and inside a flex row it silently does nothing.",
    why: "Client: \"i want to close the assistant by clicking on its folder tab, that should minimize it with a nice animation.\" The first implementation was `.motion-row-collapse` turned ninety degrees — `grid-template-columns: 1fr -> 0fr` — on the reasoning that a fraction interpolates against the grid's own resolved track, so the column would collapse from whatever width it actually had without that width being restated in the motion layer. That reasoning is correct for the row rule and wrong here, and nothing in review catches the difference: the collapsing wrapper is a FLEX ITEM, so its grid is sized under an intrinsic (max-content) constraint, and under an intrinsic constraint a `0fr` track is floored at its own base size instead of resolving to zero. Measured in verify/shell-chat the track never moved off 356.25px — the panel went fully transparent and kept every pixel of its width, pushing the card to 851px instead of the 1207.5px it should recover. That is visibly WORSE than the instant disappearance it replaced, and it passed `tsc`, passed lint, and looked correct in the source. It is only visible to someone who measures the settled geometry, which is why it is a law and not a comment. Clause (i) is the other half of the same bug: the column was originally unmounted the instant `isAsideOpen` flipped, so the first attempt at an animation had nothing to animate and the fix had to change the mounting, not the CSS. Clause (ii) exists because the fix for (i) CREATES an accessibility regression if taken alone — keeping a panel mounted so it can animate is exactly what leaves a keyboard user tabbing into an invisible column — and the client's own earlier ruling on the shut state (\"closed assistant show nothing. it's literally only the bar\") is not satisfied by a column that merely cannot be seen.",
    checkId: "aside-collapse",
    status: "enforced",
  },
  {
    id: "R52",
    dimension: "ui",
    law: "EVERY PATH THAT DRAWS A RECORD DETAIL WEARS THE SAME TITLE TREATMENT — ONE CONSTANT, NEVER A PER-CALL-SITE CLASS. `RECORD_TITLE_TREATMENT` (`shared/web/record-heading.tsx`) is the record heading's own step (h1/44, reached as `[&_[data-slot=title-heading]]:text-4xl` because the kit's `Title` has no h1 rung) and the 80% title/actions split, as ONE string. One census, off the disk, over `web/`, `web-portal/` and `shared/web/`: every call site that renders the kit's `<RecordDetail>` or its `<RecordChrome>` template — the app's only two ways to draw a detail screen — must apply that exact constant in its `className` AND import it from `shared/web/record-heading`, and none of them may pass a competing `titleSize` prop of its own. The constant's own definition is pinned too: `RECORD_TITLE_SIZE` must still be the h1 step against the kit's own `data-slot=title-heading` hook, and `RECORD_TITLE_TREATMENT` must still be built from it, so the law cannot be satisfied by an identifier that has been quietly emptied. A tripwire asserts the census found more than one path at all — a scan that goes blind reports agreement.",
    why: "The client's own words, 2026-09-06, verbatim: \"i want that unless other oomponents are above the tabs, the tabs are at exact same heigh in main screen and detail screen / also titels at same high / need to lok more uniform\" — and, standing behind it, the ruling she has now given three times: \"i dont want you to hardcode fixes for single pages, but to state rules about components.\" THE DEFECT WAS EXACTLY A PER-CALL-SITE PATCH OUTLIVING ITS ONE CALL SITE. This app draws a record detail TWO ways — thirteen hand-composed `*-detail.tsx` screens through `RecordScreen` (`web/components/records/record-chrome.tsx`), and five recipe-driven ones through `renderDetail` (`shared/web/screen-engine/screen-renderer.tsx`) — and the 44px title, a fix for a real client correction on 2026-08-31 (\"title on main screens still way too small! it's currently smaller than in detail screens\"), was written as a PRIVATE constant inside the first one. The second path never saw it and fell through to the kit's own `titleSize = \"h3\"` default, so `team.detail`, `members.detail`, `invites.detail`, `brand.detail` and `purposes.detail` set a record's own name at 24px while thirteen sibling screens set it at 44px — a 20px step, and every pixel of it lands on the tab strip below, which is the height the client was actually pointing at. `team.detail` is the app's own landing screen, so this was the FIRST detail screen most people saw. The 2026-09-01 ruling on the title row (\"we always reserve a % on the left for the buttons\") had gone the identical way, private to the same file, invisible to the same five screens. NOTHING WAS RED, and nothing could have been: a default on one path and a class on the other is not a contradiction any type or any test could see, and neither file names the other. The tab-strip GAP, by contrast, was already uniform on both paths and on main screens — because it had been made a TOKEN (`--tab-content-gap`, R49's neighbour) rather than a class in one file. That is the whole difference between the half of this that drifted and the half that did not, and it is why the fix is one exported constant with a census over the paths, not a second copy of the class.",
    checkId: "record-title-treatment",
    status: "enforced",
  },
  {
    id: "R53",
    dimension: "ui",
    law: "THE COLLECTION TOOLBAR'S SLOT SET IS THE ROW'S, NOT THE CALL SITE'S — AND ITS SORT SLOT IS A DEFAULT. R48 made the search box a default and R50 made the whole row answer one question about emptiness; this rules the slots BETWEEN them. `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) draws its five slots in one fixed order — search → filters → sort → view → actions — and two of them, `sort` and `view`, are now STRUCTURED CONFIGS (`ToolbarSortSlot` / `ToolbarViewSlot`) that the row builds the `<SortControl>` and `<ViewSwitch>` from itself, exactly as `folderTabs` is a `FolderTabStrip` rather than raw JSX. Three censuses, off the disk, never a hand-list. (i) THE CENTRAL GUARD: `ToolbarRow`'s own source must declare `sort?: ToolbarSortSlot` and `view?: ToolbarViewSlot` (never a `React.ReactNode`, which accepts anything and therefore enforces nothing) and must render both controls itself. (ii) NOBODY ELSE BUILDS EITHER CONTROL: no `.tsx` under `web/`, `web-portal/` or `shared/web/` may render a `<SortControl>` or a `<ViewSwitch>` unless it is named in `TOOLBAR_CONTROL_OWNERS` — the app's other toolbar-owning components, each with the reason it owns one. (iii) SORT IS A DEFAULT: every `<ToolbarRow>` call site must pass a `sort` prop, or its enclosing component must be named in `TOOLBAR_SORT_EXEMPT` with the real reason its rows have no order to offer. `view` needs no exemption registry and that is a property of the control rather than a gap in the law: `ViewSwitch` renders nothing for fewer than two views, so a single-body collection draws nothing whether or not it passes one — the absence is self-enforcing where `sort`'s was not. Both lists are rot-checked in both directions, and a tripwire fails the build if either census matches nothing at all.",
    why: "The client's own words, 2026-09-06, on two screenshots of her own MAIN COLLECTION screens side by side — Apps (`Search apps…` / Filter / ↑ / Name / ▦ Tiles / +) and Tasks (`Search 82 tasks…` / Filter / +): \"why the fuck i still have different toolbar variations??? unify joder.\" PART OF THE ANSWER IS HONEST AND IS NOW WRITTEN DOWN RATHER THAN ASSUMED: Tasks' five table tabs sort by their own column headers (the engine's `frameSortOptions` stands its picker down when it can see a table, so a screen does not get two controls for one question) and its six views are a folder tab strip, so it genuinely offers neither picker — that is a reasoned exemption, and every screen like it now says so in `TOOLBAR_SORT_EXEMPT` where a reviewer can read it. THE REST WAS NOT A DECISION ANYBODY MADE. `sort` and `view` were ordinary optional `React.ReactNode` props, so a call site could pass the right control, pass nothing, or — the shape that actually happened — pass the control to a DIFFERENT slot. Eleven of the eighteen bespoke toolbars drew a sort control and EIGHT of them handed it to `search`: `<>{searchInput}{statusSelect}{sortControl}</>` on Dropdown values, Modules, both account panels, a contact's meetings, a wave's sprints and all three of Client-org's lists (that last one through a `ListToolbar` helper written to stop three copies of the search field, quietly carrying a second control past the row's ordering contract with it). `search` is the row's ONE GROWING slot, so every one of those eight sat inside the stretching search cluster at whatever `label`/`hideLabel` treatment that screen happened to type, while Apps and Deliverables — the two that used the slot as named — drew the identical chip in the non-growing box beside `actions`. Same control, same app, two places, and R48/R49/R50 could all see the row and none of them could see this: they ask whether a PROP is present, and a `ReactNode` slot's contents are invisible to a census by construction. That is why the fix is not an eighteenth call-site patch but a change of TYPE — a config the row renders, so a caller no longer constructs a `<SortControl>` at all and has nothing left to misplace. The reverse census (iii) is the same sentence R48 wrote one slot along: an opt-IN can be forgotten by omission, which is exactly how a contact's Companies panel ended up with no order at all while the mirror-image list of the people inside one company — the same `AccountLink` rows, the same two columns — had ordered by both since the day it was written.",
    checkId: "toolbar-slot-set",
    status: "enforced",
  },
  {
    id: "R54",
    dimension: "ui",
    law: "THE AGENCY'S OWN PEOPLE ARE NAMED BY THEIR FIRST NAME, AND NOBODY ELSE IS. One seam, `shared/staff-name.ts`, turns a staff person into the word a screen shows — `staffName` from the structured `first_name`/`last_name` pair (exact, so a two-word given name survives) and `staffNameFromSnapshot` from the frozen \"First Last\" a row stored at write time, plus `describeWithStaffName`, which rewrites an activity SENTENCE against that same row's own actor snapshot by exact prefix. THE TRIM HAPPENS AT THE RENDER SEAM AND NEVER IN A WORKER, and the file's header carries the three findings that decided it. The census is DERIVED TWICE, never hand-listed: the actor-snapshot COLUMNS are read off the workers' own writes (the column `actor.name` is stamped into — as an interpolated `sqlString`, as an `insertRow` property, positionally out of an `INSERT … VALUES` list, or through a `?` aligned to its own bind), the PAYLOAD FIELDS are read off the mappings that carry those columns onto the wire, and a second source adds any `*Name` field that declares a `*IsClient` sibling in `shared/types.ts`, because a field that has to say which population it holds is a field that holds a person. THE CENSUS ITSELF KEEPS ONLY THE `*Name` FIELDS, because the reader scan matches a field by name and a name has to be specific enough to mean one thing — `.by` is how every sort state in the app spells its own column. That narrowing is not silent: a mapping whose field is not `*Name` must be named in `NON_NAME_PAYLOAD` with the one file that renders it, that file is checked for the seam by name, and the list is rot-checked, so the boundary is declared rather than quietly dropped. Every `web/` file that READS one of those fields must resolve it through the seam at least once, judged positionally the way R20 judges a checked body field: a pure FORWARD into another census field is not a rendering, and neither is a MATCH position (`.toLowerCase()`, `.localeCompare(`) — which is the point of trimming late, since the stored string stays a search and sort key. `STAFF_NAME_RAW` is the reasoned residue, rot-checked so it can only shrink, and a tripwire fails the build if either derivation goes blind.",
    why: "The client's ruling, 7 Sep 2026, verbatim: \"upwise, when it's staff who records activity, only use the first name, so not Audora Alasa, only Audora. Do this across all the app. We only record name and surname for the contacts and the customers.\" TWO SENTENCES, TWO POPULATIONS, and the second is what makes this a law rather than a find-and-replace. A CLIENT LOGIN IS AN ORDINARY TEAM MEMBER and `toActor` (shared/workers/gating.ts) is the only actor constructor in the estate — the portal gateway builds none of its own — so a row a CONTACT authored through the portal carries THEIR name in the same `creator_name` column ours do: a process comment, a raised ticket, a reply, an attachment, a completed to-do. Three read seams already answered that question per row for the portal's own redaction (`raiser_is_client`, `from_client`, `is_staff`) and then threw the answer away, which left the agency app holding one field with two populations in it and nothing to tell them apart; those flags now ride the wire, and the activity feed and the to-do grew the one they had never had. THE TRIM IS AT THE RENDER SEAM FOR THREE MEASURED REASONS, not one aesthetic one: `work_logs.user_name` is written from `actor.name` and then used as a LIKE search term, as a sort expression AND as the keyset cursor key (workers/content/src/lib/work-logs.ts), so a worker-side trim would change which rows a search finds and where a page boundary falls; `assignableMembers` (web/lib/members.ts) appends an email to a name that is not unique in a picker, and first names collide where full names do not, so that de-duplication has to run on the word the reader actually sees; and `actorName` is on the machine surface too (the activity tool's own contract), where the ruling — about what a PERSON reads — has no business. AND THE SENTENCE, WHICH IS WHERE SHE ACTUALLY SAW IT. The kit's ActivityFeed draws `actor` only as an avatar's accessible name; the visible line is `description`, a sentence 140 writers across the workers compose with `${actor.name}` inside it and store. Shortening the actor field alone would have changed nothing on the screen she was pointing at. `describeWithStaffName` replaces an EXACT PREFIX match against the row's own snapshot — the row is telling us which characters are its actor's name, so this is a fact the row carries rather than a guess about English — and it therefore fixes HISTORY as well as everything written from today, which no change to a writer could do. THE RESIDUE IS NAMED RATHER THAN HIDDEN: a description that puts a SECOND person inside its prose (\"X changed Y's role to Admin\", \"X removed Y from the team\", \"X invited Y as Admin\") keeps that person's full name, because no column on the row names the second person and guessing which run of characters in a stored sentence is a surname is the prose parsing this seam refuses to do. INITIALS ARE UNTOUCHED, also on purpose: an initial is a MARK, not a name — R35's own word for the case where a record has neither picture nor glyph — and \"AA\" is not \"Audora Alasa\".",
    checkId: "staff-names-are-first-names",
    status: "enforced",
  },
  {
    id: "R55",
    dimension: "arch",
    law: "A STORED REFERENCE IS WHAT THE FORMULA MAKES, AND THE FORMULA IS ONE PLACE. `canonicalRef` (shared/workers/refs.ts) is the shape of a reference as a FUNCTION, with a SQL twin (`canonicalRefSql`) beside it, and the two are proved to agree by RUNNING both over the same numbers rather than by reading them — including either side of 9,999, where a pad that truncated would start minting duplicates against a live unique index. `nextTeamRef` must RETURN that function's answer and may not build the string itself. Nothing else in any worker may write a `ref` column: an `INSERT` naming `ref` on a kind's table must be in a file that mints through the shared door, and NO code anywhere may `UPDATE … SET ref = …` — a reference is minted once, and the one act allowed to rewrite one is a team migration that keeps the old string in `ref_aliases`. Every door that SEARCHES a reference must also search that alias, through the one `refAliasMatchSql` seam — AND SO MUST THE GENERIC ENGINE, which has no hand-written SQL for that clause to scan: a queryable field on a `ref` column DECLARES `renumbered` exactly when its table is one the backfill wrote aliases for (derived from `TEAM_REF_TABLES`, failing both ways so `tasks` may not claim a history it has none of), the engine ORs the same seam in from that flag, and the behaviour is PROVED by running the engine's own `readWhere` over the replayed ledger — the retired string finds its row, and neither the account fence nor the withheld clause is widened by it. WHICH TABLES THESE ARE IS DERIVED TWICE AND HAND-LISTED NOWHERE: the schema's own answer (every `ref TEXT` in a `CREATE TABLE` and every `ALTER TABLE … ADD COLUMN ref` in `TEAM_MIGRATIONS` — two shapes, each of which finds tables the other does not) against `TEAM_REF_TABLES`, which `tsc` refuses to let fall behind `TEAM_REF_KINDS`. A ref-bearing table with no kind is a reasoned `REF_TABLES_WITHOUT_A_KIND` line, rot-checked so it can only shrink. And the DATA half is proved rather than asserted: the real migration ledger is replayed into a real SQLite handle over rows in the shapes staging actually held, and every surviving reference must read back through the formula, every retired string must resolve to its row, no counter may be able to mint a number a row already holds, a second run must change nothing, and a newborn team must come out untouched. A blindness tripwire fails the build if either schema scan stops answering or the replay stops moving rows.",
    why: "The formula lived inside `nextTeamRef` as a template literal, which means the rule \"a reference looks like this\" existed only during the instant one was minted — there was nothing afterwards to ask. So when the client's 2026-08-31 ruling changed the MINT and migrations 0059/0060 rewrote NOT ONE STORED ROW, the data and the rule came apart in silence and stayed apart for six days under a green build. refs.ts said in its own header that the old account-coded shape \"is GONE\"; the client was reading `VU Solutions-T1183` and `FluClinic-T0001` off her own screens, and a probe on 7 Sep 2026 found every one of the 2,317 stored references in the team holding real data still account-coded. NOTHING IN THE REPOSITORY COULD HAVE CAUGHT IT, and that is the point: `npm run check` builds its database by replaying the whole ledger, so the schema it tests is current by construction and only an environment with a HISTORY can drift. THE COUNTER CLAUSE IS THE ONE THAT WOULD HAVE BITTEN NEXT. The backfill preserves a number where the number is free and reissues where it is not — 1,694 of 1,896 ticket numbers kept, but stories collapsed to 34 distinct numbers across 275 rows, so most of those had to move — which pushes rows far past where the counters stand. Renumber and leave the counter alone and the next record minted collides on `idx_help_ref`; \"reconcile\" it downwards to match the rows and it re-mints numbers already handed out (staging's ticket counter reads 168 with no row to show for it). Both are one-line mistakes and only a law that reads the counter against the rows can tell them apart. AND THE ALIAS CLAUSE IS THE CLIENT'S OWN RULING, 7 Sep 2026, shown the choice between a plain rewrite and a rewrite that keeps the old string resolvable: \"alias yes\". A reference exists to be QUOTED, so a search that finds only today's number breaks every email a client has ever been sent — which makes \"does the search look in both\" a property of the product and not of the database.",
    checkId: "refs-match-the-formula",
    status: "enforced",
  },
  {
    id: "R56",
    dimension: "arch",
    law: "A COMPONENT ASKS A DOOR ONCE. Every `useCached(key, fetcher)` read across `web/` and `web-portal/` is censused off the disk, grouped by the COMPONENT it sits in (not the file, which can hold seven panels each with its own local `key`) and by the DOOR its fetcher calls (`tenancy.selectable`, `listFetch.apps` — the receiver and method, since the arguments say which rows and not which question). A component holding two reads of one door is a finding, and the two shapes are graded differently because they cost differently. SAME KEY TWICE is an outright defect with no exemption available: the store dedupes by key (`inFlight` in shared/web/store.ts), so the second read buys nothing and exists only as a second place to change one question. TWO DIFFERENT KEYS on one door is a REAL second request the store cannot dedupe, and is sometimes right — those are named in `TWO_READS_ONE_DOOR` with the reason, rot-checked, so the list can only shrink. Identifiers are resolved to what they were assigned and a `cond ? KEY : null` gate normalises to KEY, because a read gated on a permission is the same question as an ungated one — which is exactly the shape that shipped.",
    why: "round_trip_review's criterion 2 is called \"no question is asked twice\". On 5 Sep 2026 it scored 100 out of 100 at weight 13, and on 6 Sep the same lane found `app-detail.tsx` reading `selectable:<team>` twice — once unconditionally and once gated on `canRaiseTicket`, so the gated one could never be the read that warmed the cache. The criterion was scored by a human reading a probe's hits, and the probe HAD reported it; it was dismissed as a false positive on the correct but incomplete grounds that the store dedupes the request. That is true and it is not the whole property: the reviewer was right about the network and wrong about the score, and a criterion whose 100 depends on a judgement call made in a hurry is a criterion that says nothing. The owner asked, a month apart, whether the duplicate reads those reviews found were sorted and whether any review still watches for them — the honest answer was that a review watched and nothing checked. This is the check. It found the property is otherwise held: 183 fetching read sites across both front doors, zero same-key duplicates, and four components asking one door under two keys, every one of them a genuinely different question (a week of meetings versus all of them; four versions of one process map; a record's time versus a person's; and the open task list beside the all list, which use-screen-data.ts keeps apart on purpose because ticking a task off the OPEN list would make a detail screen sourced from it answer \"that record no longer exists\").",
    checkId: "one-door-per-unit",
    status: "enforced",
  },
  {
    id: "R57",
    dimension: "ui",
    law: "web/components IS ONE FOLDER PER MODULE OR KIND, AND EVERY FOLDER SAYS WHAT BELONGS IN IT. The 7 Sep 2026 fold turned 128 flat files into twelve new folders beside the three that already existed — 148 components in all, before and after on TWO AXES: `tickets-screen.tsx` sits in `tickets/` because it draws a module and `home-screen.tsx` in `screens/` because there is no home module; `collection-heading.tsx` in `records/` because every collection reuses it and `collection-content.tsx` in `deep-link/` because only the routing shell renders it. The rule is written once, in `web/components/README.md`, one line per folder, and the check DERIVES the permitted set from that file's own table rows rather than holding a second copy of the list — so the doc and the law cannot disagree, because there is only one of them. Three failures: a component left loose at the top level, a folder nobody described, and a described folder nobody has.",
    why: "Both pairs above are right and neither is guessable, which is the whole reason the words exist and not just the check: a newcomer has to READ the rule, and before this there was nothing to read. The arrangement was recorded in a commit message and enforced by nobody, in a repo whose other fifty-seven invariants are all machine-checked — so the next component dropped at the top level would have been green, and the one after it would have made \"the top level is empty\" untrue for good. Deriving the folder set from the README rather than from a constant is what stops the usual second failure, a list in a test that drifts from the paragraph a person actually reads.",
    checkId: "component-folders",
    status: "enforced",
  },
  {
    id: "R58",
    dimension: "arch",
    law: "A PATH THIS REPO NAMES MUST RESOLVE ON DISK. ONE pattern, two censuses, one walker, and EVERYTHING THE PATTERN IS BUILT FROM IS READ OFF THE DISK: the roots it accepts are the repository's own top-level folders, so a folder created tomorrow is covered the day it exists, and the exemption for a path that is OUTPUT rather than source is `.gitignore`'s own answer rather than a second list — a file this repo GENERATES is named by the script that writes it and cannot be required on a fresh clone. DOCS is every `.md` this repo writes, wherever it lives, which now includes the fifteen that sit beside the code they describe (`web/components/README.md`, which R57 derives a law out of, was read by neither half). CODE is every root that holds code of ours, at every depth, in every text extension this repo writes — `.ts`, `.tsx`, `.mts`, `.mjs`, `.sql`, `.css`, `.json`, `.jsonc`, `.md`, `.html` — and a segment may open with `[`, because seventeen real screens live under a Next catch-all the canon names constantly. An import specifier in this codebase never carries an extension, so the census reads PROSE and string literals and never the module graph. A BLINDNESS TRIPWIRE is the last clause: every file either census READS must be a path that census could RECOGNISE, so an extension, a root or a segment shape falling quietly out of the pattern is caught by the files it stopped seeing rather than by a green run that measures less. The way out is a reasoned `GONE_ON_PURPOSE` line — a path a document names precisely BECAUSE it is gone (\"the clause and web/lib/use-live-refetch.ts were retired\") — rot-checked both ways, so a path that comes back and a pin nothing mentions any more both turn the build red and the list can only shrink.",
    why: "Every law here is a source scan, and every scan reads a path it was HANDED; nothing read the paths the repo WRITES. Earned by eight dangling paths in the canon and twelve in our own source, and WIDENED on 9 Sep 2026 because the check was narrower than its own sentence — the source half read only `.ts`/`.tsx` out of a hand-typed list of folders, so a `.md` named in worker source passed a green build (demonstrated, not argued), and the docs half read only `documents/**.md` and the root canon. Six more real dangling paths fell out of the widening, including a core migration citing a suite that has never existed for the activity table's append-only guard, which is genuinely enforced under another name — the same shape the law was earned by, still in the tree a day later. It is worse than untidy: FIVE of the twelve named a GUARD that does not exist. workers/auth/src/lib/sessions.ts promised the build fails if a fourth copy of the session cookie name appears and named a test file that is not there; workers/content/src/routes/triage.ts said a whole-repo census watched the triage rota and named another. Both properties are genuinely enforced, by suites under different names — so a reader who checks is reassured by a file that is not there, and a reader who does not check is reassured by nothing at all. The 7 Sep fold of web/components left one more behind, in a comment two folders away, and a human found it weeks after a green build.",
    checkId: "named-paths",
    status: "enforced",
  },
  {
    id: "R59",
    dimension: "ui",
    law: "A FORM IS A SLIDE-IN; A WARNING IS AN OVERLAY. The client's ruling, 2026-09-09, over a screenshot of the \"New access token\" dialog: \"This should be a slide-in, like all the other screens. The only ones that are overlays are the warnings, such as archive or delete, and so on.\" A surface that COLLECTS — a form, an editor, a picker — presents as the kit's `Sheet`, which slides in from the inline end on desktop and, below 45rem, becomes the bottom sheet capped at 85dvh that her 2026-09-04 ruling asked for. A surface that ASKS a yes/no question about something that already exists is an `AlertDialog`, centred. The check does NOT try to recognise a form, because a regex that decides what a form looks like has a hole the week somebody writes one differently: it INVERTS, and holds every centred-overlay mount — every `<DialogContent>` across `web/`, `web-portal/` and `shared/web/` — to a reasoned `CENTRED_DIALOG_OK` line. A new form added next month reaches for a `Dialog`, has no line, and is red on the day it is written. The law is deliberately blind to kit v1.2.72's new `presentation` prop, which looks like the answer and is not: of its four values `overlay` and `responsive` are both CENTRED on a desktop (`responsive` flips to the bottom sheet only below 45rem), `sheet` is a bottom sheet on a 1920 monitor, and `fullscreen` is a page — so a `<DialogContent>` is a finding whatever it carries. The shape the client asked for is `Sheet side=\"right\"`, a different component, and the one the app's other ~35 forms already use. Two rot-checks make the list a ratchet rather than a loophole: an entry whose file no longer mounts a centred overlay must go, and an EXEMPT overlay that grows form machinery (a `<form>`, a `FormShell`, a `<Field>`, an `<Input>`) turns the build red where it stands — which is the exact way an exemption would otherwise be used to smuggle back the thing the law forbids.",
    why: "The ruling was already the app's practice and was enforced by nobody, which is the shape that always rots. `FormShellDialog` moved ~35 forms from the centred `Dialog` to a `Sheet` on 2026-08-31 and its header argues the case at length — but it argued it for its own call sites, so the five forms that never adopted the shell stayed centred under a green build, and one of them was the screen the client happened to screenshot. Detecting the fault directly was tried first and abandoned: a form-machinery scan finds four of the five and misses `role-picker-dialog.tsx` outright, because a radio group and an onClick that writes is a form with no `<form>` in it. The inversion costs two exemption lines today and cannot miss a sixth. The two it costs are honest ones and are referred back to the client rather than sorted: `agent-usage-dialog.tsx` (read where the credits went) and `record-calendar.tsx` (what is on this day) are neither forms nor warnings, and she has ruled on neither.",
    checkId: "forms-are-not-overlays",
    status: "enforced",
  },
  {
    id: "R60",
    dimension: "ui",
    law: "AN IMAGE FILLS ITS BOX; IT IS NEVER SHRUNK TO FIT INSIDE ONE. The client's ruling, 2026-09-09, blanket and unhedged: \"everywhere for images: do fill, not fit!\" Every picture either front door draws is `object-cover` — it fills the box it is given and is CROPPED to it — never `object-contain`, `object-fill`, `object-none` or `object-scale-down`. TWO CENSUSES, because there are two ways to say the losing word: the CLASS, written into a className anywhere under `web/app`, `web/components`, `web/lib`, the portal's three, and `shared/web`; and the PROP, `fit=\"contain\"` handed to the kit's own `Image`, which turns exactly that value into exactly that class. Without the second half the law is a one-line evasion — delete the className, pass the prop, ship the same pixels green — and it earned its place on the first run by catching a fit in the kit's gallery that the hand census the law was written from had missed for being spelled as a prop. The vendored kit is OUT of the requirement and IN the count: `shared/ui/` held five of these and now holds ONE (kit v1.2.73 adopted this ruling upstream and four went with it; the survivor is `image.tsx`'s own `fit` branch, which must exist for as long as `Image` accepts `fit=\"contain\"` at all) and none can be fixed here (it is hash-pinned; a hand-edit is red on its own), so `KIT_CONTAIN_CEILING` pins the number for exact equality the way R44 pins a translation debt — it falls when the upstream fix is tagged and pulled, and can never rise. One reasoned, rot-checked `OBJECT_FIT_OK` line is the way out and there is exactly one: a ticket ATTACHMENT's preview, where the picture is the content rather than a mark standing for a record whose name is beside it. And one clause is held directly rather than by census: `RecordMark`, which draws almost every picture in the product, may not grow a `fit` prop again — it had one, its square DEFAULT was `contain`, and a default applies to every caller who never made the choice.",
    why: "The cost is real and was accepted knowingly, which is why the law says it out loud rather than hiding it: a wide wordmark in a small square LOSES ITS ENDS. What it was weighed against is the aggregate — a marked column where a contained logo sits smaller, paler and a different shape from the filled face beside it and the letter tile below it, grey bars down one row in three. On staging only 48 of 134 accounts hold a picture at all, so most boxes are a solid letter tile either way and the contained ones were the odd shape out rather than the norm. A law rather than six edits for R32's reason about colour and R35's about thirteen placeholders: a fit is invisible to every other check here and only visible in aggregate, and the census this was written from found NINE `object-contain` against eleven `object-cover` without one of the nine being wrong on its own screen. Nobody files that as a bug.",
    checkId: "image-fills",
    status: "enforced",
  },
  {
    id: "R61",
    dimension: "ui",
    law: "A MODULE'S SETTINGS HAVE TWO DOORS AND ONE DERIVATION. The client's ruling, 2026-09-09: a settings gear on each module's own screen — *\"Only the ones with something to set\"* — and *\"somewhere in the settings, we have a tab that says 'Module' or 'Business Logic' … to find the module once\"*, because *\"everything around settings should be under settings screen concentrated (and 'quick access' through the gear in each module) but not in random places across the app.\"* Two entrances, one page, and therefore ONE question: `visibleModuleSettings` in `web/components/screens/module-settings-screen.tsx` is the only expression that decides whether a module has settings THIS reader may open, and the gear, the page itself and the Modules tab's index all ask it. THREE CLAUSES, all derived off the disk. (i) THE PAIR: every `segment` in `MODULE_SETTINGS` has exactly ONE `<ModuleSettingsGear segment=\"…\">` mounted somewhere in `web/`, and every gear mounted names a segment that table declares — a module with settings and no gear is a page nobody standing on that module can find, and a gear on a module with nothing to set renders `null` forever and is a door drawn on a wall. (ii) THE INDEX IS DERIVED: the Modules panel on `settings-screen.tsx` calls `moduleSettingsIndex` and spells NO module segment of its own, so rows cannot be hand-kept and cannot fall behind the table. (iii) ONE GATE: the settings host contains exactly one `can(` call — the one inside `visibleModuleSettings` — so the tab, the gear and the page cannot come to hold three copies of one permission. A declared segment must also be a real `MODULE_PERMISSION` key, which is both a clause (a settings page whose segment names no module is an address nothing links to) and the census's proof that it parsed words rather than noise.",
    why: "Everything about this shape is correct today and NOTHING held it there: the pilot's own file spent nine lines explaining that the second entrance was not built yet and that whoever built it must ask the same function — an instruction to a future reader, which is the form a rule takes right up until it is ignored. The failure mode is not hypothetical, it is arithmetic: the index is the deliverable and FILLING it is later work, so the next several edits to `MODULE_SETTINGS` will each be somebody adding a module's settings page while looking at Tickets, and the gear and the row are in two different files neither of which they have to open. One of the two gets forgotten, the build stays green, and the symptom is a module you can configure from the settings tab but not from its own screen — or worse, the other way round, since a gear on a module the table does not list draws nothing at all and looks exactly like a module with no settings. A one-row index is also the worst possible moment to write this law and the best: with one module the pair is trivially in step, so the check costs nothing to satisfy and is the only thing that will still be true at eight. Clause (iii) is the one that is not about drift but about refusal — she asked for a gear that never leads to a page that turns you away, and a tab that restated the gate would have been a second place to get that wrong.",
    checkId: "module-settings-two-doors",
    status: "enforced",
  },
  {
    id: "R62",
    dimension: "ui",
    law: "THE TWO ZEROS ARE ONE REGISTER, AND THE ADD BUTTON IS THE ONLY DIFFERENCE. A collection has two empty states and they are different FACTS: RESTING (it holds no rows at all — first run, and the screen exists to be filled) and FILTERED (it holds rows a search, a tab or a facet has narrowed to none — nothing is wrong, the reader asked a question with no answer). Each front door draws BOTH through ONE component — `CollectionEmptyState` (`shared/web/screen-engine/collection-frame.tsx`) on the agency door, `PortalEmpty` (`web-portal/components/portal-empty.tsx`) on the client portal — which takes a `filtered` prop, swaps the WORDS on it, and WITHDRAWS the create action on it. Everything else is drawn identically. FOUR CLAUSES, all off the disk. (i) THE SUBTRACTION IS IN THE COMPONENT, NEVER AT THE CALL SITE: each register computes its create action through `filtered ? undefined : …` and its action row renders only that withdrawn identifier, so a caller hands its create action over unconditionally and cannot forget to gate it — R50\u2019s reason for making `empty` required, one component along. (ii) AND IT IS PROVED BY RENDERING, not by reading: the register is drawn twice in a real DOM, once `filtered` and once not, and the button must be absent from the first and present in the second — every previous attempt to settle a question about this file by reading it reached a confident wrong answer. (iii) ONE FILTERED REGISTER, NOT TWO: no `.tsx` under `web/`, `web-portal/` or `shared/web/` may render the kit\u2019s `<ShapeStateBody … filtered>`, which was the second one, unless named in `SECOND_ZERO_REGISTER_OK` with a reason; rot-checked, so the list can only shrink. (iv) AND THE ENGINE ASKS THE QUESTION HONESTLY: `CollectionFrame`\u2019s `narrowed` is its own query/facets OR the `narrowedOutside` a door-searched host hands down, and it is what it passes as `filtered` — because a GROWING collection\u2019s search lives in `<PagedFind>` at the door, so the frame\u2019s own query is always empty and every door-searched zero read as a resting one. A blindness tripwire fails the build if the call-site census matches nothing.",
    why: "The client\u2019s own words, 2026-09-09, verbatim: \u201cthe empty because of filters hosul look the same as empty collection but the add button.\u201d THEY DID NOT. The resting zero had a good shared register and the filtered one had none: a census off the disk found 113 zero-row render sites in `web/` and 17 in `web-portal/`, and while 34 of the agency ones drew `CollectionEmptyState` — a `Headline h3`, a sentence and up to two buttons — FORTY-THREE were bare grey `<p>` tags, TWELVE of them literally the same sentence, `t(\"Nothing here matches that.\")`, copy-pasted into eight files. In every one of those eight the two zeros sat in ONE component, four lines apart: the full register when the list was empty, one grey line the moment a search narrowed the same list to nothing. A reader flipped between two different-looking screens by typing one letter. Five more drew `EmptyLine` (one grey line and a concept glyph, now deleted — it had no call sites left) and four drew the kit\u2019s `ShapeStateBody`, which is a genuinely different box: `px-6 py-[var(--space-8)]` against the register\u2019s un-inset `py-[var(--space-7)]`, so the two zeros started at different x; a raw `text-2xl` span against `Headline`\u2019s step-plus-tracking; and a `text-caption`/`max-w-[40ch]` body against `Text size=\"sm\" measure`. Four differences, not one of them a decision anybody made. AND THE KIT HALF WAS SHIPPING IN ENGLISH: `ShapeStateBody`\u2019s `noResultsTitle`/`noResultsDescription` are defaults inside `shared/ui/`, which R28\u2019s walk deliberately does not enter (`resolveImport` returns null for the vendored kit), so \u201cNo records match\u201d and \u201cEvery record is filtered out\u201d were in no catalogue and translated nowhere — on every filtered zero on the agency door, in an app whose ceiling is 0/0/0 — and the engine computed the collection\u2019s own translated sentence, passed it as `emptyTitle`, and threw it away, because `filtered` reads `noResultsTitle`. THE BUTTON WAS WRONG IN BOTH DIRECTIONS. On the door-searched half — accounts, contacts, stories, processes, knowledge sources, and every nested work panel — the host handed the frame already-narrowed rows with `searchable:false`, so the frame\u2019s own query was empty, a search that matched nothing read as \u201cthis collection is empty\u201d, and it drew \u201cAdd the first\u201d over a list a term was hiding: exactly the duplicate that composition 27.22 forbids a create button in this body to stop (\u201cclearing filters is a retreat\u201d). The fix cannot be a forty-fourth call-site patch and is not one: the FACT is a prop, the LOOK is not the call site\u2019s to choose, and the subtraction happens in the one component — which is R50\u2019s own lesson about `empty`, read one layer down. `title` and `description` are read only at rest for the same reason: \u201cNo accounts yet.\u201d is a claim about the collection and it is plainly untrue while somebody is searching it.",
    checkId: "one-zero-register",
    status: "enforced",
  },
  {
    id: "R63",
    dimension: "ui",
    law: "THE COLLECTION TOOLBAR STAYS ON TOP, AND THE PIN IS THE ROW'S — NEVER A PER-SCREEN CHOICE. The client's ruling, 2026-09-10: \"on scroll down, i also want the toolbar to be on top all time visible. everywhere.\" R48 made the search box a default, R50 made the whole row answer one question about emptiness, R53 made the slot set the row's; this makes the POSITION the row's too. Every component that owns a collection toolbar wears ONE class, `PINNED_TOOLBAR` (`shared/web/pinned-chrome.ts`): `position: sticky` against `--pinned-chrome-h`, a flex COLUMN so R49's trailing gap sits inside a box that PAINTS, and `bg-[var(--pinned-ground)]` — the tone it is STANDING on, published by the ground class itself in both front doors' `globals.css` (the mechanism the kit's own `tokens.css` §8 uses to make a secondary button the other tone from whatever it stands on), so no caller is asked which. A pinned bar that paints nothing is a bar the rows scroll through; one that paints the wrong tone is a hole punched in the card; and a gap below it that is a flex `gap` rather than padding is space the rows carry away the moment it sticks (the bug `STICKY_FOLDER_TABS` was fixed out of on 2026-09-03, in a third place). FOUR CLAUSES, every census off the disk. (i) THE SEAM declares the pin and the offset, in one file. (ii) EVERY TOOLBAR-OWNING COMPONENT WEARS IT, and the subject is not a list this law keeps: it is `TOOLBAR_CONTROL_OWNERS`, the census R53 already rot-checks in both directions, PLUS the client portal's own collection rows, derived as the files that ask the DOOR for a search (`useDoorSearch`) — the portal draws no `<ToolbarRow>` on purpose (R48 §ii-b) and the law is about the FUNCTION. (iii) NOBODY WRITES THEIR OWN: no `.ts`/`.tsx` under `web/`, `web-portal/` or `shared/web/` spells `top-[var(--pinned-chrome-h…)]` except the seam. (iv) THE OFFSET IS DECLARED WHERE CHROME PINS, one declaration per thing that can pin ABOVE a toolbar and none anywhere else: both front doors' `globals.css` (the default zero, and the `:has(> .pinned-strip)` rule that raises it for a collection tab strip's own container — derived, so every host of `renderFolderTabs` is covered by the rule rather than by a line somebody remembered), the strip's own marker class, a record screen's root (its strip is the panels' SIBLING, and a custom property only reaches downward), and the portal shell's MEASURED header (a header of buttons has no tab strip's token geometry to read, and its height moves with the language). A screen with nothing pinned above its toolbar pins flush at zero and needs no entry anywhere, which is the property R48 wanted for the search box: the default is the right answer. (v) THE CONTAINER'S OWN TOP BAND PINS WITH THE ROW — her second sentence the same day: \"when sticky toolbar, include also the top part of the container above it! if not looks weird. so the spacing between tabs and container should stay, as well as spacing between beginning container and toolbar.\" Pin the toolbar alone and the card's top edge and the card's top inset both leave with the scroll, so the bar arrives flush under the tabs, standing on nothing, touching a card that no longer has a top. The pinned box therefore starts at the CONTAINER'S top edge, and her two distances are the two that survive: tabs to container is `--pinned-chrome-h` above, already painted by the strip's own `pb`; container to toolbar is `--pinned-lead`, the container's own top inset paid as `pt` INSIDE the pinned box and taken straight back as a negative `mt`, so the row does not move by one pixel at rest and the band above it paints on scroll. The pair is asserted as a pair, because the padding alone adds that inset to every collection for ever and the margin alone subtracts it. Published by the BOX and consumed by the ROW, exactly as the offset is — `CollectionCard` publishes the same ladder `cn(\"p-4\")` leaves on `CardContent` (`--space-4`, and `--space-7` above `lg`), the kit's own collection panel is published from the frame's `className` because the panel is not this app's element to edit, both `globals.css` declare the `0px` default, and the rule that stands a nested toolbar down zeroes the lead on it too: a pt/mt pair is invisible while sticky and an upward shove the moment it is not. Exactly two files may name the property, rot-checked both ways. (vi) AND THE BAND KEEPS THE CONTAINER'S ROUNDED TOP CORNERS — her THIRD sentence the same day, after looking at (v): \\\"When pin, I still want it round. That's exactly what I asked for, so do whatever you have to do.\\\" TWO faults, either of which alone makes the other's fix a no-op: the pinned box is INSIDE the container, so it spans the CONTENT box and never reaches the corner the container's radius is drawn on (its BORDER box, one inset out); and a rounded corner is a transparent NOTCH with the container's own paper behind it — the container runs far below the pin, only its top EDGE has scrolled away — so a notch filled with nothing shows the band's own tone and still reads square. `--pinned-inset-x` is the container's SIDE inset, spent back as `px` and a negative `mx` — (v)'s pair on the other axis, asserted as a pair — so the box reaches the border box without the row moving a pixel; `--pinned-behind` is what is BEHIND the container, painted across the whole band, with a `::before` painting `--pinned-ground` over it at `rounded-t-[var(--radius)]`, so the notch shows exactly what the container's real top corners show at rest. A pseudo-element and not a wrapper, because (i)'s flex COLUMN is what keeps R49's trailing gap inside something that paints and a real child would join that column. The fallback is the IDENTITY, `var(--pinned-behind, var(--pinned-ground))` — a toolbar that is nobody's inset child paints one tone front and back, so its corners are cut out of the tone they show and it pins flush and square exactly as before: no branch, no second class, nothing for a screen to decide. THE CAPTURE HAPPENS ONE LEVEL UP and that is the load-bearing half: `--pinned-ground` is published by the ground class itself, so a container that PAINTS has already overwritten it for everything inside it, and the last element still holding the outer value is its PARENT. `CollectionCard` IS that ground-class element, so it wears `PINNED_INSET_MARK` and `globals.css` captures on the parent through `*:has(> .pinned-inset)`, the identical `:has()` move (iv) makes off `.pinned-strip`; `PINNED_TOOLBAR_IN_KIT_PANEL` already rides the frame's root, outside the kit's panel and painting nothing, so it publishes `--pinned-behind` directly. And the stand-down rule puts the identity back on a nested row beside a zero side inset, because a rounded band of OUTSIDE ground in the middle of a panel is a hole cut in the paper. R31 is WIDENED, not broken: the same value on the same one edge, which is all `two-radii` ever constrained, and its prose now names this position beside the bottom sheet.",
    why: "MEASURED IN A BROWSER, at 1440x900 and 375x812, against the real app — because a sticky rule that silently does nothing looks exactly like one that works, in source, and this repo's history is full of source reads reaching confident wrong answers. Three things only a browser could have said. FIRST, the offset is real and is not zero: a collection's own tab strip and a record's are ALREADY stuck at the top of the same scrollport, so a toolbar at `top: 0` lands in the strip's band and one of the two disappears — measured, the strip pins at the pane's top edge (y=50) and the toolbar lands exactly on its bottom edge (y=116) on Accounts, Apps, Contacts, Sprints and a record's Contacts panel, and flush at 50 on Knowledge and Waves, which have no strip. SECOND, `position: sticky` is bounded by its own CONTAINING BLOCK, and the one call site that boxes the row in furniture of its own — the tickets Dashboard, whose panels are SIBLINGS of the toolbar's card rather than its contents (the client's own \"the toolbar in dashboard needs some kind of container\") — measured a stuck range of 32px: the row travelled with the scroll and pinned nowhere, on one of the two screens she actually screenshotted, while everywhere else the row shares a card with the rows it narrows and the range is the whole collection (3,011px on Accounts, 1,049 on Apps). The pin moved out to a box whose containing block is the dashboard column; the row's own pin stays and is simply inert there. THIRD, TWO PINNED TOOLBARS ARE WORSE THAN ONE: the knowledge base draws a `<PagedFind>` row AND the kit frame's own `+` row, and with both pinned they landed in the same band with the outer one painting over the inner one's create button — so a container that already holds a pin stands the nested one down, one bar per collection, and it is the outer one, because that is the row that narrows the collection. WHAT THE BROWSER ALSO SAID AND THIS LAW DOES NOT FIX: at 375px the agency row WRAPS, so a pinned Accounts toolbar occupies 264 of the 702px a phone has — the kit's own `ToolbarRow` (v1.2.x) solved that upstream with a one-row layout and a `···` overflow, and this app's bespoke row has not adopted it. That is a real cost of the ruling on a phone and it is written here rather than hidden behind a breakpoint nobody asked for.",
    checkId: "pinned-toolbar",
    status: "enforced",
  },
  {
    id: "R64",
    dimension: "ui",
    law: "A SECTION ON THE TEAM AREA'S STRIP HAS A DOOR, OR NAMES THE SCREEN THAT TOOK ITS PLACE — AND THAT SCREEN CARRIES ITS ACTS. R40 asks whether a stored file reaches a person; this asks the same question one layer up, about a CAPABILITY. `TEAM_SECTIONS` (`web/lib/pages.ts`) entries with `placement: \"tab\"` live only on the team area's own strip, and the app's one entrance to that area is the \"This team\" list on Settings › Team, which is DERIVED from that same table minus the keys its own filter subtracts. So a subtracted key has no door at all unless somebody built it one, and the law is that it must SAY where: a `SECTION_HOSTED_ELSEWHERE` line naming the file that carries that section's material. FOUR CLAUSES, every census off the disk and each end grounded in a different oracle so the check can never be a parser agreeing with itself. (i) THE OFFERED HALF IS REAL: the `adminSections` panel actually soft-navigates into `/t/<teamId>/<segment>`, so the subtraction cannot be checked against a door that has itself been deleted. (ii) EVERY SUBTRACTED TAB SECTION HAS AN ENTRY, and every entry names a key that is still both a tab section and subtracted — rot-checked both ways, so the list can only shrink and a stale line cannot excuse a live gap. (iii) THE NAMED FILE EXISTS. (iv) AND IT CARRIES THE SECTION'S ACTS: the acts are DERIVED from the recipes bound to that module in `web/lib/screens.ts` (`action:` ids), each act is resolved to the DOOR CLIENT CALL its own dispatcher makes in `web/lib/use-screen-actions.ts` (`tenancy.setMemberRole`, `tenancy.removeMember`, `tenancy.revokeInvite`, …), and the host file must make that same call. Nothing is hand-listed but the host filename: the sections come from the nav table, the subtraction from the screen's own filter literal, the acts from the recipes, and the proof of an act from the dispatcher's own source.",
    why: "SHIPPED, GREEN, AND FOUND BY AN AUDIT RATHER THAN BY ANYTHING HERE. The Settings › Team redesign (2026-09-09) replaced the members ladder with a gallery that deliberately does not navigate, and left three administrative acts — change a member's role, remove a member, revoke a pending invitation — on `/t/<teamId>/members` and `/t/<teamId>/invites`. A census of every `softNavigate(...)` and `href=` under `web/` found exactly ONE link into the team area anywhere in the app, and it points at one member's RECORD rather than at the collection. The other entrance was the \"This team\" list on that very tab, which by then rendered a single row — Internal rates, gated on `commercials:read`. So an owner WITH that right reached member management by opening a RATE CARD and hopping sideways on a tab strip, and an owner WITHOUT it — holding full `team_members` rights — had no in-app path to any of the three. Nothing was broken: every door answered, every gate was correct, every test was green, and the gallery's own header comment told the next reader that role changes 'still live on the member's own record, reached from the team area's Members section', naming a route nothing linked to. THAT SENTENCE IS THE SHAPE OF THE FAILURE: the app's reachability lived in prose, and prose does not fail a build. It is also why the law is written about the SUBTRACTION rather than about links in general — a link census cannot see a destination built from a variable (`/t/${teamId}/${item.id}`, which is how the one real door is written), so a law that counted links would have had to special-case the very door it was checking. Subtracting a key from that list is the one deliberate, greppable act that takes a section's door away, and it is now the act that has to say where the material went. Written while three of the four tab sections are already subtracted, which is the cheapest moment to satisfy it: the entries record a state that is correct today, and the check is what keeps the next Settings edit from quietly removing a capability again.",
    checkId: "sections-have-a-door",
    status: "enforced",
  },
  {
    id: "R65",
    dimension: "ui",
    law: "ON A CARD THAT STANDS FOR A RECORD, THE CHIP SITS ABOVE THE TITLE. The client's ruling, 2026-09-10, on the member cards of Settings › Team: \"in team, adn generlaly in this component write the law, chip on top of title & bigger images\" — the second time she has said it, after \"in cards put chips above title\" about the Kanban card. A card is read top-down in one glance and the chip is what SORTS it (the role, the stage, the type); a chip UNDER the name is read after the thing it was meant to qualify, which is the wrong order on the one surface where a reader is scanning rather than reading. WHICH CARDS, DERIVED, NEVER HAND-LISTED: a card that stands for a record is a kit `<Card>` carrying a `key=` prop, and the oracle for that is REACT'S OWN, not this law's — a card drawn one-per-row of a collection must carry a key and a card that is a panel around a section must not, so the partition is made by a rule nobody here can bend. THREE CLAUSES over that census. (i) A record card NAMES its record through the kit's `<CardTitle>`: without this the law is a one-line evasion, because a title hand-rolled into a `<span>` has no position a census can read, and \"above\" is a statement about position. (ii) Every `<Badge>` inside a record card opens BEFORE that `<CardTitle>` in source order — source order IS visual order in a `flex-col` card, which is what `Card`'s own cva declares (`flex flex-col`, \"a card is a column: header, body, footer, in that order\"). (iii) The way out is DATA — a `CARD_CHIP_BELOW_OK` line per file, rot-checked in both directions, so an exemption that stops describing anything turns the build red and the list can only shrink.",
    why: "WRITTEN BECAUSE SHE HAD TO SAY IT TWICE, which is the only evidence this repo accepts that a preference is a rule (\"generlaly in this component write the law\"). The Kanban card was fixed on its own in September and the member card shipped the opposite way a day later, green, because nothing in the build knew the two were the same question. THE CENSUS IS A `key=` PROP AND THAT IS THE WHOLE DESIGN. Three other definitions were tried and each one either over- or under-counted: \"a `<Card>` containing a `<Badge>`\" catches `staff-panel.tsx`'s certificates panel (a Card wrapping a LIST, whose \"Archived\" chip belongs to a row inside it, not to the card) and the portal's ticket header (a Card that is one record and has no title at all — its `RecordRef` chip IS the heading); \"a `<Card>` inside a `.map(`\" is the right idea but cannot be read off the disk without balancing braces, and a regex that gets that wrong fails OPEN; and a hand-list is what the client's own words rule out. React's list-key requirement gives the same partition for free, from a rule that predates this app and that no author here can quietly redefine. CLAUSE (i) IS THE LOAD-BEARING HALF and it is the one that cost a change: `members-gallery.tsx` drew its member's name in a bare `<span className=\"text-sm font-medium\">`, so a chip-position census over that file would have reported a perfectly ordered card while looking at nothing at all. Requiring the kit's own title part is what makes the position readable — and it is the same move R53 made when it took the toolbar's slots off `React.ReactNode`: a slot that accepts anything enforces nothing.",
    checkId: "chip-above-title",
    status: "enforced",
  },
  {
    id: "R66",
    dimension: "ui",
    law: "A PICTOGRAPH IS NOT A WORD, AND NOT A MARK EITHER. The client has ruled three times — \"i said no emojis. why are there still emojis? kill them!\" (2026-08-31), \"for type, kill the emojis. this is legacy. in current system we use colors\" (2026-09-07), \"also kill emojis!!!\" (2026-09-10) — and until the third one the whole defence was ONE write door, `optionalMark` in `shared/workers/validate.ts`, on ONE kind of field. No emoji appears in the words a person reads, or in the data behind them. WHAT COUNTS AS ONE IS THE DOOR'S OWN ANSWER, IMPORTED: the check calls `optionalMark` rather than carrying a codepoint table, so the law and the door share one definition by construction and a future emoji release, a skin tone, a joined sequence or a flag is handled here exactly as it is handled there. It also puts the line in the right place — the predicate is `Extended_Pictographic` / `Regional_Indicator` plus the three combiners, so the typographic dingbats this app and the pinned kit legitimately draw (U+2715 on a close button, U+27A4 and U+2605 as department marks) are NOT emoji and are not caught. FOUR CENSUS TARGETS, each a different oracle: (i) `shared/i18n-strings.json`, which R28 makes EXACTLY the set of user-visible English sentences both front doors say — so this covers every word a person reads without owning a walk of its own, the same composition R44 makes; (ii) `shared/i18n-catalogue.ts` and `shared/i18n-seed.ts`, the other three languages, because a German sentence with a pictograph in it is invisible to (i) and is the same fault; (iii) THE VOCABULARY DATA — the team seed and the migration ledger that back-fill `selectable_data`, plus the three shared tables whose rows carry a `mark` — which is the half a copy census cannot see, because a mark is DATA and sits in no catalogue and no `t(...)`; (iv) `shared/i18n.ts`, the one file that renders a pictograph on purpose. The data files are censused WHOLE, comments included, because the repo already has the convention and states it in `optionalMark`'s own header: name a glyph by codepoint (`String.fromCharCode(0x26a0, 0xfe0f)`), never paste one. Source comments across `web/`, `web-portal/` and `workers/` are deliberately OUT: twenty-eight of the thirty-two pictographs in this repo's source are there and every one is evidence — the client's own message quoted beside the change it caused, a Google Chat line measured on staging, a test fixture. THE EXEMPTION IS A CLASS, NOT A LIST (widened 2026-09-10 at the client's fourth ruling, \"keep emojis for countries and languages only\"): a pictograph passes when it is a FLAG — a pair of Regional_Indicator characters, which is Unicode's own definition of a flag sequence and the shape nothing else in the emoji set has — naming a region ICU's own table recognises (`Intl.DisplayNames`, `fallback: \"none\"`). One predicate answers both halves of her sentence because Unicode has no language pictograph: a language is drawn by the flag of a country that speaks it, so the check also asserts, off `LANGUAGES` itself, that every language the app speaks is marked by a country flag and by nothing else. A LONE regional indicator is not a flag, a pair naming no country is not a flag, and every other pictograph — an emoji mark on a ticket type above all — is still refused. The write door is NOT widened with it: `optionalMark` still refuses a flag too, so the law permits more than the door does and never the other way round. The remaining way out is a reasoned `EMOJI_OK` line, for a pictograph that is the content and is not a flag, rot-checked both ways so the list can only shrink — it is EMPTY, because the class exemption is what the four language flags now pass under.",
    why: "IT KEPT COMING BACK, AND THE REASON IS WORTH THE WHOLE LAW. The 2026-08-31 ruling WAS answered — properly at the door, and apparently in the data: team migrations `0034_ticket_and_story_vocabulary` and `0044_a_sprint_state_has_a_face` substituted two-letter codes for the seeded ticket-type and story-type marks. Every one of those eight statements is guarded `AND mark IS NULL`. A row that already held a pictograph is not null, so not one of them could ever have replaced one — they filled the EMPTY marks and stepped over precisely the rows the ruling was about. Six weeks later, under a green build, with the write door shut behind it and the seed clean, the client was still looking at a warning sign beside \"Issue\" and a book beside \"Requirements\" and asked a third time. A fix that cannot reach the thing it was written for reads, in source, exactly like one that did. THE OTHER HALF IS THE LABEL: three Choices screens went on calling the field \"Emoji\" and asking for one (\"e.g. a question mark\") while the door answered \"Mark should be a short word or initial, not an emoji\" — a control arguing with the door behind it, for six weeks, because `optionalMark` closed the door and nobody read the room. THE EXEMPTION IS ONE LINE ON PURPOSE. The four language flags are the single case where the pictograph IS the content: every other pictograph this app drew stood in for a word already beside it — a ticket's kind, a module's name, a tool's name — which is what made it redundant as well as wrong. A flag identifies a language at a glance, it is `aria-hidden` with the language's own name in its own spelling next to it, and there is no two-letter code that does that job. Written as DATA rather than as a silence so that if she wants those gone too it is one deletion in `shared/i18n.ts` and one line here, which is the shape a decision nobody has asked her about should take.",
    checkId: "no-emoji-in-copy",
    status: "enforced",
  },
  {
    id: "R67",
    dimension: "ui",
    law: "A TITLED SECTION STANDS ON PAPER; NOTHING IS DRAWN ON THE BARE PAGE GROUND. The subject is every `<section>` under `web/`, `web-portal/` or `shared/web/` that carries a HEADING of its own (`<h1>`\u2026`<h4>`, the kit's `<Headline>`, or `<CollectionHeading>`) \u2014 the smallest unit that is unambiguously a titled section of content, stated by the source rather than inferred. A CONTAINER IS DERIVED, never listed: the paper family is read off the kit's own `shared/ui/foundations/tokens/tokens.css` \u2014 every `--surface-*` token, plus an alias MORE THAN ONE of them points at (which is `--card`, and is why `bg-card` counts and `bg-muted`, reached by `--surface-idle` alone, does not), MINUS `--surface-page`, which the kit defines as `var(--background)` and which IS the ground. A section passes in exactly TWO shapes, and they are one sentence read from either end. Either the section IS the box \u2014 it or a JSX ancestor in its own file carries a paper fill, which is what `web/components/team/team-panel.tsx` does \u2014 or EVERY BODY it draws stands in one, which is what `CollectionFrame` does on every collection screen in the base: heading outside, content on paper. THE CLAUSE WITH THE TEETH IS \"every body\": containment is asked PER BRANCH, walking through fragments, ternaries, `&&` and `.map()`, so a section cannot pass on the strength of the one branch that happens to have a panel in it. FOUR THINGS ARE DELIBERATELY NOT CONTENT, each a decision rather than a convenience: the TITLE BLOCK (any child that itself carries the heading \u2014 a heading is not something that stands on anything, and the create button rides beside it); PROSE (`<p>`, `<span>`, `<small>`, `<em>`, `<strong>`, `<a>`, `<br>` \u2014 a sentence under a heading is part of the title block, and every settings section in the app is heading + sentence + control); an ACT (a lone `<Button>`, or a component that renders nothing but one \u2014 \"Show older\", \"Try again\"; a control is pressed, not read); and an OVERLAY (a component that reaches a portal, resolved transitively \u2014 `<AddLinkDialog>` is a `<FormShellDialog>` is a kit `<Sheet>` is a Radix portal, and stopping at the first hop reported a slide-in form as content lying on the page). Anything `hidden`/`sr-only` is skipped for the same reason. The census is a real syntax tree, not a regex over indentation, and it resolves what a component paints through the module-scope constants its own file declares (`Skeleton` \u2192 `skeletonVariants` \u2192 `cva(PULSE, \u2026)` \u2192 `bg-surface-quiet`). Exceptions are data in `UNCONTAINED_SECTION_OK` with a reason each, rot-checked, so the list can only shrink. A blindness tripwire fails the build if the derived fill family, the file walk, or the heading census ever comes back empty, or if no section passes at all.",
    why: "THE CLIENT, TWICE IN TWO DAYS, AND THE SECOND TIME SHE ASKED FOR THE LAW. 2026-09-09, over the Team tab: \"more members in each row, too much blank space. needs container!! nothing on top of white background, its a rule!\" 2026-09-10, over Settings \u203a Integrations: \"but give it a container. once again, nothing shoudl sit on the white, everything contained! (make this a law)\". \"Once again\" is the load-bearing word, exactly as it was in R50: the first ruling was answered at ONE screen (team-panel.tsx, which carries the measured tones), and a fix at one screen is how the same fault reaches the next tab. WHY IT IS NOT \"EVERY SCREEN'S ROOT IS A PANEL\". That version was written first and thrown away: it is either trivially true, or it forbids the shape the whole app already uses and she has already approved \u2014 a heading outside, the content on paper under it. Both shapes pass here. WHAT THE FIRST RUN FOUND, and it is the argument for the law: 22 uncontained sections across both front doors. Eleven were in the AGENCY app and every one of them was an inconsistency WITHIN a screen that already used paper \u2014 the zero register of three lists on the client's org chart, a stakeholder panel's zero, a meeting's calendar zero, the Google connections section's error and skeleton beside rows that DID stand on paper, the profile page's whole activity feed, a sprint board's hand-grouped rows, and the three Appearance option groups on the very tab she was looking at. That last one is the sharpest: the kit's option card is `Card`'s DEFAULT variant, and in LIGHT `--card`, `--background` and `--surface-raised` are all #FFFEF9 \u2014 so those cards measured contrast 1.000 against the page and were held up by a hairline, the identical pairing team-panel.tsx documents from the Team tab the day before. Nobody would have filed any of them as a bug, because a missing surface is only visible in the aggregate and nobody sees the aggregate. All eleven were fixed the same day. THE ELEVENTH FINDING IS THE ONE TO READ: `web/components/team/access-tokens.tsx` drew its ROWS on soft paper and its error, its skeleton and its zero on the page. A check asking \"does this section have a panel in it anywhere\" answers yes and describes the wrong screen \u2014 she was looking at the branch with nothing in it. That is why containment is asked per branch, and it is the difference between a law that catches her bug and one that reports success over it. The remaining nine are the whole CLIENT PORTAL, six files, and they are exempted rather than fixed because the portal is consistent with ITSELF: stacking titled sections on `portal-shell.tsx`'s unpainted `<main>` is its visual language, not six oversights, so giving it panels is a redesign of the client-facing app and belongs in a deliberate pass with her looking at it. Read `UNCONTAINED_SECTION_OK`, not this sentence. WHAT THE CENSUS DOES NOT SEE, written down rather than discovered later: it resolves components by NAME, so where two libraries share one (recharts' `Tooltip` and the kit's) it takes the first and under-reaches \u2014 the portal's savings chart is a real uncontained section this walk lets through. Under-reaching is the deliberate direction: a false offender in a build gate is worse than a section the law stays quiet about.",
    checkId: "sections-stand-on-paper",
    status: "enforced",
  },
  {
    id: "R69",
    dimension: "arch",
    law: "A SIGHTING IS NEVER WRITTEN THROUGH THE RAW PRIMITIVE. `knowledge_sightings` decides who may read a folded source, and `team_visible` is a denormalised copy of what its rows imply — so a write that changes a sighting's `shelf` or `gone_at` without recomputing that copy in the SAME script leaves a fence answering from a stale value. `execKnowledgeScript` enforces that at RUNTIME by inspecting the resolved script string and walking each write's own interval, but a writer that reaches for `d1ExecScript` directly never runs the guard at all — it cannot see what does not call it. So every file under `workers/*/src` that writes `knowledge_sightings` must go through the wrapper, and the ONE file allowed the raw primitive is DERIVED rather than listed: the file that EXPORTS `execKnowledgeScript` is the wrapper, and a wrapper must call the thing it wraps.",
    why: "The runtime guard closes the case where somebody splices the recompute in the wrong order, and cannot close the case where somebody skips the wrapper — which is the easier mistake, because `d1ExecScript` is what every other module in this worker already uses. Twenty files in `workers/content/src` call it; reaching for the familiar one is the default, not the exception. Written the day a real writer existed: pinned against an empty set it would have been a check that passes because there is nothing to check, which is the failure this repo produced five separate times in one night — a ceiling derived from the code it checks, an equivalence whose empty case was trivially true on both sides, a loop over a collection that became empty, the right assertion on the wrong field, and a privilege path with no test at all.",
    checkId: "guarded-sighting-writes",
    status: "enforced",
  },
  {
    id: "R68",
    dimension: "arch",
    law: "ONE IDENTITY PER SOURCE, RE-POINTED AT THE MECHANISM THAT WAS ALWAYS DOING THE WORK. BUILD-5-knowledge-rebuild.md's fault, closed by 0073: a Google item's key used to be `<readerId>:<externalId>`, so the same Drive folder shared with two colleagues filed as two `knowledge_sources` rows, each chunked, embedded and stored separately. 0073's fix reached for a new column, `identity_key`, and a new unique index over it — but the real fold has always run through migration 0012's `idx_knowledge_sources_origin`, a UNIQUE PARTIAL index on `(origin_table, origin_row_id)`, sixty-one migrations earlier, and `identity_key` sat beside it for six weeks enforcing the same fact a second way, written by nothing (`grep -rn \"identity_key\" workers/content/src/` found two hits, both comments, before migration 0080 removed the column). Two clauses, each grounded in a different oracle, now pointed at the real thing. (i) The constraint is real: read straight off 0012's own migration SQL for the literal `CREATE UNIQUE INDEX idx_knowledge_sources_origin ON knowledge_sources (origin_table, origin_row_id) WHERE origin_row_id IS NOT NULL` — never trusted from a comment. (ii) The fold's contract is the census, not the presence of one function: the naive version of this clause — \"does a file exist whose INSERT carries the right ON CONFLICT\" — is trivial by construction, since there is exactly one shared upsert function (`workers/content/src/lib/knowledge-ingest.ts`), so of course one file has it; that is the same vacuous-population failure clause (ii) had under the old column, wearing a different hat. The real question is a PER-ROW predicate: does anything that CLAIMS an origin (its own INSERT names `origin_table` in its column list) skip the fold it obligates? Every `INSERT INTO knowledge_sources` under `workers/content/src/` is censused — three today, pinned — and each is decided individually: two are exempt because they never claim an origin (a typed note, an uploaded file, both in `knowledge.ts`), one is compliant because it claims one and folds (`knowledge-ingest.ts`).",
    why: "Earned twice, by the same shape a fold apart. First by BUILD-5-knowledge-rebuild.md's own fault above; then by this law's own first draft, which enforced a column nothing wrote and a per-file check with a population of exactly one file — passing for the same reason a check with zero subjects passes, because there was nothing on either side to fail. Re-pointed rather than dropped, because the sentence was right: one identity per source, computed the one way the fold actually reads, never a string with the reader baked in. Proved both ways: breaking the compliant site's ON CONFLICT target turns clause (ii) red; adding an unfolded origin claim to an exempt site also turns it red — the second is the one that matters, because it proves the rule decides a ROW rather than counting a population.",
    checkId: "one-identity-per-source",
    status: "enforced",
  },
]

/** R66 — A PICTOGRAPH THAT IS THE CONTENT AND IS NOT A FLAG. Keyed by
 * repo-relative path, and only a path `EMOJI_CENSUS` (in
 * `web/test/rules.test.ts`) actually reads. Rot-checked BOTH ways: a line
 * naming a file this law does not census excuses nothing and fails, and a line
 * naming a file with no refusable pictograph left in it has outlived its
 * subject and fails too. So it can only shrink.
 *
 * EMPTY SINCE 2026-09-10, AND EMPTY IS THE GOAL. It held exactly one line —
 * `shared/i18n.ts`, excusing the four language flags — until the client widened
 * her own ruling: *"Keep emojis for countries and languages only."* That is a
 * statement about a CLASS of glyph, so the law now expresses it as one, and the
 * flags need no line: a pictograph is exempt when it is a pair of
 * Regional_Indicator characters (Unicode's own definition of a flag sequence)
 * naming a region ICU's own table recognises (`Intl.DisplayNames`). Neither
 * oracle lives in this repo, so a fifth language or the first country flag is
 * covered without editing a law, and the four-glyph hand-list that would
 * otherwise have rotted here was never written.
 *
 * ONE PREDICATE COVERS BOTH HALVES OF HER SENTENCE because Unicode has no
 * language pictograph: a language is drawn by the flag of a country that speaks
 * it (Andorra stands in for Catalan — Catalonia has no sequence of its own).
 * The check ties that half to `LANGUAGES` itself, so a language whose mark is
 * not a country flag turns the build red at the moment it is written.
 *
 * WHAT THIS TABLE IS STILL FOR: a pictograph that is genuinely the content and
 * is NOT a flag. It costs a paragraph of prose to use, which is the correct
 * price, and adding a line to make a red build green is the one use of it that
 * is never correct — she has ruled on emoji four times. */
export const EMOJI_OK: Record<string, string> = {}

/** R65 — A RECORD CARD THAT PUTS A CHIP UNDER ITS TITLE, and the reason that is
 * right rather than an oversight.
 *
 * Keyed by repo-relative path. Rot-checked BOTH ways: a file here whose record
 * cards no longer break the rule is a line nobody can justify (it turns the
 * build red and is deleted), and a file that breaks it without a line turns the
 * build red too. So the list can only shrink.
 *
 * EMPTY, and empty is the goal. It exists for the case the client's sentence
 * does not cover — a card whose chip is genuinely a FOOTER fact about the record
 * rather than the thing that sorts it — and it costs a paragraph of prose to
 * use, which is the correct price. Adding a line to make a red build green is
 * the one use of this list that is never correct: the client has ruled on this
 * twice, and a third card quietly opting out is the drift the law was written
 * against. */
export const CARD_CHIP_BELOW_OK: Record<string, string> = {}

/** R64 — WHERE A TEAM-AREA SECTION'S MATERIAL LIVES, now that the section's own
 * screen has no door.
 *
 * Keyed by the `TEAM_SECTIONS` key (`web/lib/pages.ts`); the value names the
 * file on a REACHABLE screen that carries that section's material, and says in
 * one sentence what a person does there. The check derives the rest: which keys
 * need a line (the ones `settings-screen.tsx`'s own `adminSections` filter
 * subtracts), which acts each section owes (the recipe actions bound to that
 * module in `web/lib/screens.ts`), and what proves an act is really offered (the
 * door-client call its dispatcher in `web/lib/use-screen-actions.ts` makes).
 *
 * ROT-CHECKED BOTH WAYS, so this list can only shrink. A key here that is no
 * longer a subtracted tab section is a line nobody can justify — it either got
 * its own door back or stopped existing — and a subtracted key with no line at
 * all is the 2026-09-09 regression happening again. Adding a line to make a red
 * build green is the one use of this list that is never correct: if the material
 * is not actually on the screen named, the capability is gone and no line here
 * changes that.
 *
 * All three are Settings › Team, which is not a coincidence and is the point:
 * that tab is where the client moved the team's people and their rights
 * ("Everything should be in different containers… not taken anywhere else",
 * 2026-09-09), and it is reached from the profile menu by everybody, gated on
 * nothing. The team area is what is LEFT — and Internal rates, the one section
 * still on its strip with a door, is a row the client has asked to kill or move.
 * Nothing here depends on it surviving. */
export const SECTION_HOSTED_ELSEWHERE: Record<string, string> = {
  members:
    "The member's own full-screen profile (web/components/team/member-screen.tsx), at /t/<teamId>/members/<userId> — the client's own \"when clickingon card in team, open full screen the profile (we wil ad more to this)\", 2026-09-10, superseding the slide-in that shipped the day before. A card on Settings › Team's members gallery is a real anchor to it, and the profile is where their role is changed and they are removed from the team.",
  roles:
    "Settings › Team, the roles matrix (web/components/team/roles-matrix.tsx) — every role's rights at once, the client's own \"All the roles together, I want to have an overview\"; a role is a COLUMN since 2026-09-10 (\"would it not make more sense taht the roles are the cokumns and the permissions the rows\"), and pressing its column head opens the role's slide-in, where it is edited and switched on or off.",
  invites:
    "Settings › Team, the Invites button on the members toolbar (web/components/team/members-gallery.tsx) — the client's own \"the invites, make it secondary button on the toolbar\", 2026-09-09. It expands the pending invites beside the wall, and each row can be revoked from there.",
}

/** R59 — A CENTRED OVERLAY (`<DialogContent>`) THAT IS NEITHER A FORM NOR A
 * WARNING, and the reason it is allowed to stay centred.
 *
 * Keyed by repo-relative path. The client's line sorts a surface by what it
 * DOES — collecting is a form and gets a drawer, asking a yes/no question about
 * an existing thing is a warning and gets an `AlertDialog` — and a surface that
 * only SHOWS is on neither side of it. Both entries here are that, and both are
 * open questions for her rather than settled decisions by us.
 *
 * Rot-checked in both directions, so this list can only shrink: a file here that
 * no longer mounts a centred overlay is a line nobody can justify, and a file
 * here that GROWS form machinery is the law being smuggled around — either turns
 * the build red. Adding a line to make a red build green is the one use of this
 * list that is never correct; if the surface collects anything, it is a drawer. */
export const CENTRED_DIALOG_OK: Record<string, string> = {
  "web/components/assistant/agent-usage-dialog.tsx":
    "A READ-ONLY USAGE PANEL — where the team's AI credits went, drawn as an ActivityFeed. It collects nothing (no field, no choice, no commit control; its only button is the kit's own close chip) and it asks nothing, so neither of the client's two buckets fits. Its sibling behind the next badge, agent-history-dialog.tsx, looks identical and IS a drawer, because every row there is a button that picks a thread — the pair is the clearest statement of where this law draws its line. Referred to the client 2026-09-09: a panel you only read may belong in the drawer with everything else, or the centre may be right for something you close without answering.",
  "web/components/records/record-calendar.tsx":
    "THE DAY LIST BEHIND A '+N more' CHIP — the records that did not fit in a month-grid cell, each one a link to its own screen. It is a disambiguation step for a click that has already happened, closer to a menu than to a screen: it collects nothing and asks nothing, and it is deliberately small and transient in a way a full-height drawer would contradict. Referred to the client 2026-09-09 with the usage panel above; if she rules that everything non-warning slides in, both lines go and both files move.",
}

/** R47 — MODULES THE ASSISTANT CANNOT ANSWER ABOUT AT ALL: no knowledge kind,
 * no gated read tool, and a reason why that is right rather than an oversight.
 *
 * One line long, and it should stay that way: a module a person can see and the
 * assistant cannot reach is the exact failure this law exists to make visible.
 * Rot-checked — a module here that gains a kind or a tool turns the build red,
 * so the list can only shrink. */
/** R54 — A STAFF-NAME FIELD READ ON A SCREEN THAT NEVER PUTS IT THROUGH THE SEAM.
 *
 * Keyed `<repo-relative file>::<field>`, because the law asks per SCREEN whether
 * that screen resolves that name — the same shape R20's per-door census takes.
 * Rot-checked in both directions: an entry the census would no longer catch is a
 * line nobody can justify and nobody can safely delete, so it turns the build red
 * and the list can only ever shrink.
 *
 * Empty is the goal, and empty is where it stands. The one line it ever held was
 * the two triage banners in `web/components/tickets/tickets-collection.tsx`, deferred on
 * the day this law landed only because a concurrent lane owned that file; both
 * call sites now resolve through `staffNameFromSnapshot`, exactly as
 * `triage-strip.tsx` — the third copy of the same sentence — always did. */
export const STAFF_NAME_RAW: Record<string, string> = {}

export const ASSISTANT_BLIND_MODULES: Record<string, string> = {
  agent:
    "THE MODULE IS THE SWITCH, and both of its rights are about the assistant rather than about anything the assistant could read: `read` is 'see your own threads with it' and `create` is 'say something to it' (shared/team-modules.ts). There is no third act and no record type behind it — a thread is the conversation the assistant is standing in, not material about the agency. Filing past conversations as a corpus would be worse than useless: the assistant would retrieve its own earlier answers as evidence for new ones, which is how a wrong answer becomes a cited fact. DELETE THIS LINE if the agent ever grows a record somebody could ask a question ABOUT.",
}

/** R47's second clause — MODULES REACHABLE BY TOOL AND DELIBERATELY NOT IN THE
 * SEARCHABLE CORPUS, each with the reason in words a person can check.
 *
 * READ THE TWO CATEGORIES APART. Everything here IS reachable: the assistant can
 * answer about all of it, through a gated tool, with the module's own permission
 * checked at the door exactly as it is for a person on the screen. What these
 * lines say is that the material is not ALSO copied into the knowledge base's
 * searchable pile — which is a different question, and for one entry below it is
 * a hard rule rather than a judgement.
 *
 * WHY THE DISTINCTION IS REAL AND NOT PEDANTRY. The corpus has exactly ONE gate,
 * `knowledge:read`, and no way to subtract a caller's denied modules the way the
 * activity feed does (R18). So putting a module's words in the corpus grants
 * them to everybody who may ask the knowledge base a question. For most of the
 * lines below the reason is simply that there are no WORDS to file — a rate, a
 * filename, a switch. For `commercials` it is R24, and it is absolute.
 *
 * Rot-checked: a module here that gains a knowledge kind must lose its line, so
 * this list can only shrink. */
export const CORPUS_EXEMPT: Record<string, string> = {
  // ── THE ONE THAT IS A RULE AND NOT A JUDGEMENT ────────────────────────────
  commercials:
    "WHAT THEIR APPS GIVE BACK, PRICED. Reachable — `get_app_impact` answers it, on a door that refuses a client login outright, so anybody whose role may see money on the screen can ask the assistant for the same number and anybody whose role may not is refused the same way. It is kept OUT of the searchable pile because the pile has one gate and cannot fence per module: a passage in it is readable by everyone who may ask the knowledge base a question, and whether a client may see a price is a per-ACCOUNT switch that a passage cannot carry. So the honest sentence is not 'the assistant cannot see the money' — it can — but 'only the people who could already see it can get it out of the assistant'. THE LINE HAS NARROWED TWICE IN ONE DAY. Until 10 Sep 2026 it was about the agency's own cost cards and the margin, which SCOPE said a client must never see under any setting; the client retired that feature whole, and an hour later retired what a client IS CHARGED too (`list_account_rates` and `query_records` on `account_rates` answered it until then). What is left is one read, and the switch is still the reason.",

  // ── NOTHING TO FILE: A SWITCH, A SHEET, OR A NUMBER ───────────────────────
  all_tasks:
    "NOT A RECORD TYPE. Read the row as a sentence: 'this role may see everyone's tasks'. It is a switch over a SIGHT, and the tasks themselves are already in the corpus as the `task` kind — so there is nothing here to file that is not filed, and a source saying 'this role can see everyone's tasks' would be a permission fact wearing a passage's clothes.",
  member_roles:
    "A PERMISSION SHEET, AND IT MUST NEVER BE STALE. What each role may do is answered live by `get_role_permissions` and by `query_records` on `roles`, straight off the matrix. A corpus copy would be a second account of who can do what, written once and then wrong the next time somebody ticks a box — and of everything in this app, the permission matrix is the document where a confident, out-of-date answer does the most harm.",
  knowledge:
    "IT IS THE CORPUS. The knowledge base's own sources are what the pile is made of; filing the index inside the thing it indexes would put every source's metadata into competition with its content, so a question about a client could be answered by a passage describing a document about that client rather than by the document. `list_knowledge_sources` returns a source's own words when given its id, which is the honest way to ask what the base holds.",

  // ── THE MATERIAL IS A FILE, AND THE ROW IS A LABEL ON IT ──────────────────
  deliverables:
    "WHAT WE HANDED OVER — a title, a kind, a date and a LINK. There is no body column on the row at all (team-schema.ts), so the words are in the document at the other end of the URL and the corpus would be filing a filename. That is R40's own distinction said again: a filename in a pile is not a document anybody can read. A REAL CANDIDATE, not a permanent no: the day the source readers (R42) are pointed at the handover shelf the way they are at the knowledge base's own uploads, this becomes a kind and this line goes.",
  brand_assets:
    "THE BRAND LIBRARY IS PICTURES AND FONTS. The row carries a name, a category, a one-line shelving `description` ('the primary logo, dark background') and a link to bytes. The material is the file; the description is where it sits. Same shape as `deliverables` above, and the same condition for deleting this line.",

  // ── THE WORDS ARE ALREADY IN THE CORPUS, ATTACHED TO SOMETHING ELSE ───────
  delivery:
    "WHY WE MEET — about ten labels with a department each. Every one of them is ALREADY in the corpus, written into the meeting it explains: the meeting kind's own sentence reads '… is a meeting of ours about <purpose>'. A source per purpose would file the label twice, once attached to the conversation it describes and once alone, and the lone copy is the one with nothing in it to answer a question with.",
  google:
    "A CONNECTION IS A CREDENTIAL AND A SHELF, not material — whose Google account is joined up, and which folders and spaces they named. What it BRINGS is already four kinds (`document`, `email`, `event`, `message`), each carrying the personal fence that says whose sight it arrived through. Filing the connection itself would put one person's own account in a pile everybody with `knowledge:read` can search, which is the opposite of the fence those four kinds exist to keep.",
}

/** R44 — the ceiling. Per translated language, the number of extracted strings
 * (`shared/i18n-strings.json`) with no non-empty entry in `overlay(CATALOGUE,
 * SEED)` — the exact predicate `coverage()` already uses to tell a person
 * choosing a language what to expect. Pinned rather than computed inline so a
 * change to it is a reviewed line in a diff: raising it silently is exactly the
 * drift the law exists to catch, so the check requires the true count to equal
 * this number exactly, in both directions. Measured 2026-08-30.
 *
 * RAISED 307 -> 308 the same day, deliberately, and this is what a raise has to
 * look like. Three mobile placeholders were SHORTENED to stop them overflowing a
 * 375px field — and all three of the long originals were translated while none of
 * the short replacements was, so a width fix was quietly buying itself three
 * English sentences on a German screen. R44 caught it; nobody raised the pin to
 * make the build green.
 *
 * Two of the three cost nothing in the end, because the catalogue already had a
 * shorter sentence that says the same thing: "Search…" became "Search" and
 * "Ask the knowledge base…" became "Ask the knowledge base", both existing keys,
 * both translated in all three languages. Borrowing a sentence the app can
 * already say is always cheaper than writing a new one, and it is the same move
 * the error screen made last week.
 *
 * The third, "Ask about this record…", has no translated equivalent at any
 * length, so it is one string of real debt spent on purpose. THAT is the whole
 * point of the ceiling: not that it never moves, but that moving it is a line in
 * a diff with a reason beside it.
 *
 * LOWERED 308 -> 0, 30 Aug 2026 (feat/i18n-fill), including the debt above —
 * "Ask about this record…" now has all three. All 308 were translated in one
 * run through the app's OWN Cloudflare allowance (`@cf/openai/gpt-oss-120b`
 * over the `ai/run` REST door, `scripts/i18n-translate-workers-ai.mjs`), never
 * the owner's ANTHROPIC_API_KEY, grounded in `shared/glossary.ts` and written
 * to `shared/i18n-seed.ts` (never `shared/i18n-catalogue.ts`, which says
 * DO-NOT-HAND-EDIT and means it). Every one was checked mechanically —
 * placeholders survive, "kwapso" survives, no invented trailing full stop —
 * and a 20-string sample across both shapes and languages was read by hand.
 * The ceiling can rise again the same way it did before: a reasoned line in
 * this comment, on the day something is deliberately shipped untranslated.
 *
 * RAISED 0 -> 39 (de only), 1 Sep 2026, ship-night debt, not a design call.
 * The night's own new copy (the record-header/toolbar/tab work, the To-do →
 * Input rename, the new Contacts screen) added 39 English strings with no
 * German entry yet. Neither translation door was reachable from this
 * environment tonight: `i18n-translate.mjs` needs the owner's
 * `ANTHROPIC_API_KEY` (`~/.config/kwapso/keys.env`, blocked from this
 * session by the same credential-file guardrail that blocked the Cloudflare
 * and GitHub-identity steps earlier the same night), and
 * `i18n-translate-workers-ai.mjs` needs `cf-exec`'s Cloudflare token, equally
 * unavailable here. All three languages moved the same 39 — none of them had
 * these strings yet, not just German.
 *
 * RAISED 39 -> 60 (all three), same night, same reason. The toolbar-everywhere
 * sweep and the kit's real empty-collection design (title + explanation +
 * "Add the first"/"Import a list") added 21 more English strings the same
 * two translate scripts still can't reach from this environment.
 *
 * RAISED 60 -> 114 (all three), same night, merging Alaap's own parallel
 * push — the rail's collapsible groups, the relationship map, the source
 * chips, the assistant's compare/panel width work — with this session's own
 * batch, on top of the ship-night debt above. Same two blocked credential
 * paths, still unreachable from this environment; the same 54 new strings
 * moved for all three languages, none of them ahead of the others. Lower all
 * three back to 0 the next time either script runs with real credentials —
 * it is a few minutes of spend, not a decision to leave open.
 *
 * RAISED 114 -> 115 (all three), same night — the assistant's source-chips row
 * gained a visible "Reading from" caption (client, 1 Sep 2026: the row read as
 * unlabelled black pills with no context). One string, same two blocked
 * credential paths.
 *
 * LOWERED 115 -> 114 (all three), same night — the overnight audit removed a
 * dead three-dot profile-menu button ("Account menu"), which had a real,
 * already-translated string. A genuine improvement, not a stale pin.
 *
 * RAISED 114 -> 124 (all three), same night — the Opus-decided per-collection
 * view work: Apps' Tiles/List switch and Waves' List/Timeline switch, each
 * with their own new copy (view labels, empty states, the Gantt period
 * stepper). Ten strings, same two blocked credential paths.
 *
 * RAISED 124 -> 130 (all three), same night — the Opus-decided Tickets
 * Dashboard tab (the tickets-by-client chart, its own honesty caption about
 * internal tickets, and the tab's own label). Six strings, same two blocked
 * credential paths. */
// RAISED 2026-09-02, 130 → 140: the new Theme and Scale picture-card
// sections (shared/web/theme-section.tsx, shared/web/scale-section.tsx)
// extracted 9 new English strings — the three THEMES/SCALES option
// labels/descriptions this app had not drawn a card for before today. None
// has a translation yet in any of the three languages (no environment here
// carries the credential a real translation run needs — the same blocked
// path every prior raise in this file cites: ANTHROPIC_API_KEY or a
// Cloudflare Workers-AI token). Real work still owed, not debt hidden.
//
// RAISED AGAIN, SAME DAY, 140 → 141: the filter row's own "Filter" chip
// gained a count ("Filter (3)") once it carries active facets and the row
// is closed — one new interpolated string, same blocked translation path.
//
// RAISED AGAIN, SAME DAY, 141 → 142: ThemeSection's card press gained a
// success toast ("Theme changed.") to match SpineSection and ScaleSection,
// which already confirm their own presses this way.
//
// RAISED AGAIN, SAME DAY, 142 → 143: the filter panel's facets became compact
// fields (client ruling against her own artifact — see
// shared/web/screen-engine/filter-bar.tsx), so each one says what it says while
// nothing is picked: "Any {what}", ONE new interpolated string. Two strings
// left the catalogue in the same change (the expanded facet's own "Search
// {what}…" and "No matches."), and both were already answered in all three
// languages, so losing them moves no count — the net +1 is the new sentence
// alone, on the same blocked translation path every raise above cites.
// RAISED AGAIN, SAME DAY, 143 → 145: the spine is offered during onboarding
// now (client ruling 2026-09-02, "default spine to mango, but everyone can
// change it during the onboarding or anytime at settings"), so
// web/app/onboarding/page.tsx says TWO new sentences — the set card's badge
// ("Picked", 27.14's own word for the card Settings badges "In use") and the
// field's help line ("You can change this later in Settings.", which is the
// ruling's second clause said out loud to the person it is about). The three
// spine option labels and descriptions are NOT new: onboarding draws the same
// `SpineChoice` Settings draws, so it says the same six sentences the
// catalogue already holds rather than a second set of its own. Same blocked
// translation path every raise above cites — no environment here carries the
// credential a real translation run needs. Real work owed, not debt hidden.
// RAISED 2026-09-03, 143 → 144: the assistant became `ScreenShell`'s third
// COLUMN (client, verbatim: "closed asstant show nothing. it's literally only
// the bar"), so the shell's edge handle needs the second half of its accessible
// name — "Close the assistant". ONE new sentence: "Open the assistant" was
// already the launcher's own label and is already in the catalogue, and the
// column's own name is the catalogued "Assistant". The rail's handle needed
// nothing at all, because "Collapse"/"Expand" were its labels before the handle
// moved into the kit. Same blocked translation path every raise above cites —
// no environment here carries the credential a real translation run needs.
// RAISED 2026-09-03, 144 → 149, SAME DAY, DIFFERENT LANE: a concurrent pass on
// the spine (`shared/spine.ts` + `shared/web/spine-section.tsx`, out of scope
// for the toolbar work sharing this session) added five new sentences —
// `npm run lang` is what surfaced the shift, not a string this toolbar change
// wrote. Every one of `de`/`es`/`ca` moves by the same five, which is why all
// three raise together rather than drifting apart. Same blocked translation
// path every raise above cites — no environment here carries the credential a
// real translation run needs, and this pin only records the count, it does
// not excuse leaving the five in English.
// RAISED 2026-09-03, 149 → 153, SAME SESSION, THE TOOLBAR WORK ITSELF (R48):
// Tasks' Calendar tab and the Triage queue each gained a real search box
// where they used to have none (see filter-bar.tsx/tasks-screen.tsx/
// tickets-collection.tsx and R48 in this file) — three new sentences
// ("Search the triage queue…", "No entries in the triage queue match your
// search.", "No tasks match your search.") plus "Search tasks…", which turned
// out never to have been extracted before despite already being said by the
// existing five non-Calendar tabs (`tasksListRecipe`'s own
// `searchPlaceholder`) — reused here rather than invented, and its debt is
// therefore pre-existing, surfaced rather than caused by this change. Same
// blocked translation path every raise above cites.
// FELL 2026-09-03, 153 → 152, ALL THREE: the count moved off the toolbar's
// own label string onto a real `Badge` beside it (client ruling, same day:
// "Mango round background with no border behind the number" — see
// filter-bar.tsx), so "Filter ({count})" is no longer said anywhere and
// dropped as an orphan on the next `npm run lang`. It was untranslated in
// all three languages, so all three fall by exactly one and none drift apart
// from each other.
// Bumped by +2/language on 2026-09-03: the record-activity audit (R33/R28)
// wired the kit's `ActivityFeed` `loading`/`error` registers into
// `ActivityPanel` (web/components/records/activity-panel.tsx) so a still-loading or
// failed feed stops rendering "No activity yet." Two new `t(...)` sentences
// — "Couldn't load activity" and "We couldn't load this record's activity.
// Try again in a moment." — extract with no seed entry yet in any of the
// three languages. Measured in isolation against a clean checkout of this
// commit's parent with only that change applied (155 → 157); this pin
// covers exactly that rise and does not answer for any other in-flight
// change to the true count.
// Bumped by +14/language on 2026-09-03: the R28/R33/R34 sweep on
// account-detail-panels.tsx (ContactsPanel's remove/restore-contact confirm
// and PortalAccessPanel's revoke/restore-login confirm) wrapped a dozen
// previously-bare English string literals in `t(...)`, including the two
// interpolated confirm titles/labels, each rewritten as a whole sentence
// with a named hole (`t("Remove {person} from {account}?", {...})`) rather
// than a translated fragment glued to a raw value. Fourteen distinct new
// catalogue strings result: "Remove contact", "Remove {person}", "Remove
// {person} from {account}?", "Contact removed.", "Contact added back.",
// "Couldn't remove that contact.", "Couldn't add that contact back.", "Add
// {person} back", "They stay in your accounts, with everything they're
// attached to. You're only saying they're no longer a contact here.",
// "Access taken away.", "Access switched back on.", "Couldn't change that
// login.", "They won't be able to sign in any more. Everything they're
// attached to, their records, their history, stays exactly where it is,
// and you can switch it back on later." — plus work-logs-panel.tsx's own
// new sub-fetch error line, "Couldn't load the hours for this record."
// None has a seed entry yet in any of the three languages. Measured on
// this tree with the concurrent +2/language change above already applied
// (154 → 168); this pin covers exactly this change's own rise on top of
// that one and does not answer for any other in-flight change to the true
// count.
// 2026-09-03, 183 → 186 (loading-toolbar pass, web/components/records/paged-find.tsx,
// load-more.tsx, tickets-collection.tsx, meetings-screen.tsx). This pass's
// OWN new sentences: `t("That's the first {n}. Search or filter to find what
// you're after.")` (load-more.tsx, replacing a translated-fragment-plus-raw-
// English glue) and `t("Nothing in Meetings this week.")` (meetings-screen.tsx,
// the This Week tab's own empty sentence, previously the whole collection's).
// The other two the extractor folded in on this run — "Couldn't load the
// triage queue." and "{name} is on triage this week, so the queue is
// theirs." — are ALSO this pass's own (tickets-collection.tsx's missing
// error branch and its raw interpolated on-duty line), so the note directly
// above crediting them to a different, concurrent change was measuring the
// same shared working tree at an earlier instant of this same edit; nothing
// here was invented to explain a rise somebody else caused. Measured fresh
// against the run this pin now pins to: `node scripts/i18n-extract.mjs`
// scored the true count at 186 for all three languages the moment this
// change was made, so this is a snapshot, not a promise about what anyone
// else lands after it — reconcile again before `npm run check` is trusted.
// 2026-09-03, 186 → 189, AGAIN NOT BY THIS CHANGE: a second `i18n-extract`
// run (needed because the working tree kept moving under a live, multi-agent
// session) folded in three more strings this pass did not write — "A
// colleague", "Your team", "Why a step takes longer, {reason}" — from other
// concurrent work. Recorded rather than reverted, for the same reason as the
// note below: a stale pin hides the NEXT regression, whoever's it is.
// 2026-09-03, 168 → 183, AND NOT BY THE CHANGE THAT MOVED THE PIN. The
// recipe-path fix (screen-renderer.tsx / recipe.ts: no mark on a record title,
// icons on recipe tabs, the Activity block's own registers, the confirm's red
// button and busy state) added ZERO new catalogue strings — every sentence it
// says was already in the catalogue, reused word for word from
// web/components/records/activity-panel.tsx and shared/web/use-confirm.tsx so the two
// implementations of each cannot drift. What raised the count is the
// `node scripts/i18n-extract.mjs` run that change is required to make: the
// working tree's catalogue was stale against several other in-flight changes,
// and the extract folded fifteen of THEIR new English sentences in
// ("Check your connection and try again.", "Couldn't load the triage queue.",
// "We couldn't load your tickets.", the six other "We couldn't load…" lines,
// "{name} is on triage this week, so the queue is theirs.", and the three
// fragments rewritten into whole sentences with holes). Measured both ways on
// this tree: the catalogue as it stood before the extract scores exactly 168
// and passes; after it, 183. So this pin records somebody else's rise, honestly
// rather than by reverting a step the change was told to run — it is expected
// to be reconciled against the other concurrent bumps rather than trusted as
// the final number.
export const TRANSLATION_CEILING: Record<string, number> = {
  // RAISED 216 -> 217 in all three on 8 Sep 2026. ONE sentence, and it is the
  // first of a class worth naming here because the next 48 arrive the same way:
  //
  //  · "The system this work is on. Everything below is narrowed by it." — the
  //    New story dialog's explanation of its App row. It was WRITTEN when the
  //    field was built and has never rendered, because the config set `hint:`
  //    and `FieldConfig` has no such key; it has `helpText`. Nothing in the app
  //    or the kit accepts a `hint` prop, and TypeScript never objected because
  //    the config is a named constant rather than an inline literal, so the
  //    excess-property check does not fire.
  //
  // FORTY-EIGHT MORE LIKE IT sit across both front doors — tickets, sprints,
  // rates, reviews, legal details, time — every one an explanation somebody
  // wrote for a person and no person has ever read. They are outside R28, R33
  // and R34 as well, because those walk `label:` and `helpText:` and a dead key
  // says nothing to anybody. This one was converted alone, deliberately, to
  // MEASURE what the class costs: one ceiling point per language each, so the
  // whole set is +48 more unless it is translated in the same change.
  //
  // The owner asked why the row shows "Required" over a value he cannot touch
  // (8 Sep 2026). This sentence is the answer the dialog always meant to give.
  //
  // RAISED 213 -> 216 in all three on 7 Sep 2026, dead-end lane. THREE new
  // English sentences, all three of them the words a dead end needed in order
  // to stop being one — a field the machine surface could already write, put in
  // front of the person who owns the record:
  //
  //  · "Screen recording" and "Open the recording" — one row and its link on
  //    the ticket's Overview. `help.screen_recording_link` has been settable on
  //    `create_help_ticket`/`update_help_ticket` since the door shipped, stored,
  //    selected and typed, and rendered by no screen on either front door: a
  //    person could hand the assistant a Loom link, read "Screen recording: …"
  //    on the confirm panel, press yes, and never see it again.
  //  · "Who reviews it" — the story's own reviewer, resolved at the door
  //    through `memberOrThrow` and shown by nothing. The row appears only when
  //    a story HAS one (zero of 329 on staging do), so it is a sentence a
  //    German reader meets the first time the capability is used rather than on
  //    every story.
  //
  // NOT TRANSLATED HERE, ON PURPOSE, for the same reason as every entry below:
  // `scripts/i18n-translate.mjs` spends the OWNER'S own API key and has
  // rate-limited his personal account before. The next reviewed run takes all
  // three back down together.
  //
  // RAISED 211 -> 213 in all three on 7 Sep 2026, first-run lane, under the
  // owner's ruling that there should be empty states for everything. TWO new
  // English sentences, both the kit's own empty register (27.21) reaching a
  // host-composed tab the engine never drew for:
  //
  //  · "No tasks with a deadline yet." — Tasks' Calendar tab on a team with
  //    nothing dated. Its own sentence because that tab's collection is the
  //    dated tasks, and a team with undated tasks lands there too, so "no
  //    tasks yet" would be false for them.
  //  · "Nothing in Meetings yet." — Meetings' Calendar tab. The SAME words the
  //    meetings recipe has always carried as its `emptyText`, said at a `t(…)`
  //    call site for the first time; a recipe's `emptyText` is translated
  //    where it is read (screens.ts, `t(c.emptyText)`), which the extractor
  //    does not see, so the sentence was never in the catalogue although a
  //    screen has drawn it since 5 Sep. The calendar tab saying it through
  //    `t()` is what put it here — a genuine debt made visible, not a new one.
  //
  // NOT TRANSLATED HERE, ON PURPOSE, for the same reason as every entry below:
  // `scripts/i18n-translate.mjs` spends the OWNER'S own API key and has
  // rate-limited his personal account before. The next reviewed run takes all
  // LOWERED 244 -> 240 in all three on 6 Sep 2026, the tickets-dashboard lane,
  // and this is the direction the pin is supposed to move. Twenty-five new
  // English sentences landed with the Monday screen and NOT ONE of them is in
  // this number, because all twenty-five were written into `shared/i18n-seed.ts`
  // in German, Spanish and Catalan in the same commit. The four the pin actually
  // records are RETIREMENTS, and all four were already untranslated:
  //
  //  · "Tickets by client", "No tickets are tied to a client yet.", "Raise a
  //    ticket against a client and it shows up here." and "The agency's own
  //    tickets aren't tied to a client, so they're left out here — these bars
  //    won't add up to the total above." All four belonged to
  //    `TicketsByAccountCard`, which existed only to be one of the two borrowed
  //    charts on the old Dashboard tab. The tab is now its own screen over its
  //    own door read, nothing else ever called that card, and a component with
  //    no call sites is four sentences being translated on every build for a
  //    screen nobody can reach — which is exactly the rot R28's ORPHAN clause
  //    exists to stop, arriving here as ceiling debt instead.
  //
  // WHY THE TWENTY-FIVE WERE SEEDED RATHER THAN LEFT TO THE NEXT TRANSLATION
  // RUN, when every entry below reasons the other way. The entries below are
  // sentences on screens made of ROWS — a list in the wrong language is still a
  // list, because the rows are names and dates and a reader recognises them.
  // This screen has no rows. It is five pictures, and the sentences on it are
  // the half that says what each picture may NOT be used for: which months were
  // dropped and why, how many tickets the matrix cannot speak for, that the
  // weekend does not count towards a duration. A chart whose caveats are in a
  // language the reader did not choose is a chart read without its caveats, and
  // a number nobody can check is the one place that costs something. So these
  // were worth writing by hand; they also cost nothing to write, since the seed
  // never goes to the model.
  //
  // RAISED 233 -> 238 in all three on 6 Sep 2026, the triage-review lane (the
  // client's review of the sitting the entry below built), and the arithmetic is
  // written down because R44's whole point is that a ceiling cannot move
  // quietly. SIX new English sentences and ONE retired one, which is why the
  // number moves by exactly five:
  //
  //  · FOUR are the VERB PER TYPE on the queue's primary button — "Assign" for
  //    an issue, "Plan" for a request, "Store" for an extra, and "An app", the
  //    fallback label an app facet uses for a row whose app has somehow lost its
  //    name. "Accept" was already catalogued and is still the word for a
  //    question, so the button that used to say one thing now says four and
  //    only three of them are new. The client ruled each word herself.
  //  · ONE is the queue toolbar's sort chip, "Raised" — the collection had no
  //    order to offer until she asked for one (`TRIAGE_SORTS`).
  //  · ONE replaces the sentence that was retired: "No entries in the triage
  //    queue match your search." became "Nothing in the triage queue matches
  //    what you asked for." because two FILTERS now sit beside that search box,
  //    and a reader who had narrowed by app and typed nothing would have been
  //    told her search matched nothing — a sentence pointing at the wrong
  //    control. THE RETIRED ONE WAS TRANSLATED IN ALL THREE LANGUAGES, so this
  //    single swap is the one real loss in the five: a German reader who used
  //    to read that line in German now reads a truer sentence in English. It is
  //    the same trade the entry below records and it is made deliberately —
  //    a fluent sentence naming the wrong control is worse than a plain one
  //    naming the right one.
  //
  // NOT TRANSLATED HERE, ON PURPOSE, for the reason every entry below gives:
  // `scripts/i18n-translate.mjs` spends the OWNER'S own API key and has
  // rate-limited his personal account before, so a translation run is his to
  // authorise and never a lane's to trigger. The next reviewed run takes all
  // three back down together.
  //
  // RAISED 211 -> 233 in all three on 6 Sep 2026, the triage-sitting lane, and
  // the arithmetic is written down because R44's whole point is that a ceiling
  // cannot move quietly. TWENTY-TWO new English sentences and THREE retired
  // ones, and the three retired ones were all already translated, which is why
  // the number moves by exactly the twenty-two:
  //
  //  · nine are the SITTING ITSELF, a shape the app has never drawn before —
  //    the counted line ("{position} of {total}"), the bar's own accessible
  //    name, the tail's heading and its "next" mark, the ruled word "Skip", the
  //    queue's own accessible name, and the two sentences a finished sitting
  //    says. There was nothing to reuse: the screen this replaces was a list of
  //    rows and said none of them.
  //  · six are the TWO ONE-ROW PICKERS the client chose in round eight — each
  //    one's question ("Which type is this?", "Who is picking this up?"), the
  //    reason line under it that makes a confirm button unnecessary, and what
  //    each says when its vocabulary is empty.
  //  · four are the DECISIONS and their results — "Change category", "Undo",
  //    "Triaged.", "Filed as {type}.", "Put back as it was." — replacing "Mark
  //    it read" / "Marked as read.", which were one act where there are now
  //    four.
  //  · three are the CARD: the date line the client dictated ("raised {date}"),
  //    the attachment column's heading, and the way out of a readiness gap.
  //
  // THE THREE RETIRED SENTENCES WERE TRANSLATED IN ALL THREE LANGUAGES, so this
  // is not the trade the entry below records (a fluent-but-false sentence for an
  // English-but-true one): "Mark it read", "Marked as read." and "{days} days ·
  // {when}" describe an act and a row that no longer exist, and nothing a German
  // reader used to understand has become English.
  //
  // NOT TRANSLATED HERE, ON PURPOSE, and for the same reason as both entries
  // below: `scripts/i18n-translate.mjs` spends the OWNER'S own API key and has
  // rate-limited his personal account before, so a translation run is his to
  // authorise and never a lane's to trigger. The next reviewed run takes all
  // three back down together.
  //
  // RAISED 196 -> 211 in all three on 5 Sep 2026, first-run lane, and the
  // arithmetic is written down because R44's whole point is that a ceiling
  // cannot move quietly. SIXTEEN new English sentences and TWO retired ones:
  //
  //  · eleven are the empty states a brand-new team actually reads — the two
  //    shared defaults `CollectionEmptyState` now chooses between, and the
  //    per-collection sentences on Members, Invites, Tickets, Contacts and the
  //    knowledge base. They replace ONE sentence that all sixteen recipe
  //    collections shared and that was true of exactly one of them ("Records
  //    land here … or when a client raises a request from the portal", right on
  //    Tickets and false on the other fifteen).
  //  · four are the landing screen's "Start here" block, which names the first
  //    act on a team with nothing in it — the screen previously answered "where
  //    is everything" and never "what do I do".
  //  · one is the onboarding line, which told everybody "your team gets created
  //    right after" under a product where team creation is closed.
  //
  // TWO OF THE SIXTEEN ARE A REAL LOSS, not just an addition: the retired
  // sentences WERE translated in all three languages, so a German reader trades
  // a fluent-but-false sentence for an English-but-true one on those two
  // screens. That is the right trade and it is still a debt, which is why it is
  // recorded here rather than absorbed.
  //
  // NOT TRANSLATED HERE, ON PURPOSE, and for the same reason as the entry
  // below: `scripts/i18n-translate.mjs` spends the OWNER'S own API key and has
  // rate-limited his personal account before, so a translation run is his to
  // authorise and never a lane's to trigger. The next reviewed run takes all
  // three back down together.
  //
  // RAISED 189 -> 196 in all three on 4 Sep 2026, and the reason is recorded
  // because R44's whole point is that a ceiling cannot move quietly. R48's portal
  // search shipped seven new English sentences — the two search fields, their
  // clear buttons, the no-match copy and the match count — and none of the three
  // languages answers them yet.
  //
  // NOT TRANSLATED HERE ON PURPOSE. `scripts/i18n-translate.mjs` spends the
  // OWNER'S own API key and has rate-limited his personal account before, so a
  // translation run is his to authorise and never a lane's to trigger. Accepted,
  // visible, bounded debt is the shape R44 was written for; this is exactly it.
  //
  // It only ever falls. The next reviewed run takes all three back down together.
  // LOWERED 238 -> 237 in all three, same day, the triage-review lane's second
  // pass. Not a translation run: the client removed the Reply button from the
  // sitting's card ("remove all of this … I want to keep the Open function, but
  // not here"), and the sentence it carried was one of the untranslated five.
  // Deleting an English-only string lowers the true count by one, so the pin
  // follows it down — R44 fails a ceiling left ABOVE the count for exactly this
  // reason: a stale pin would hide the next regression behind an improvement it
  // never recorded. It can fall; it can never rise without the count rising too.
  // AND DOWN AGAIN, 237 -> 236, the same lane's third pass: the picker's
  // explanatory note ("Picking somebody puts them on the ticket and marks it
  // triaged, in one go.") was deleted at the client's request, and it was one
  // of the untranslated. Deleting an English-only sentence lowers the true
  // count, so the pin follows. Third fall in one day and every one of them a
  // deletion rather than a translation run — the ceiling is doing exactly what
  // it was written to do, which is refuse to sit above the truth.
  // RAISED 236 -> 237, the view-switch pass: "Queue" and "List" are the two
  // view names the switch offers, and the retired one is the picker note the
  // client had deleted a pass earlier. Two new English sentences, one already
  // counted as removed — net +1. The ceiling has fallen three times today and
  // risen once; it moves either way, and the arithmetic is written down each
  // time so it can never move quietly.
  // RAISED 237 -> 243, the cleared-queue pass. The client picked D1 for the
  // finished sitting (a per-type tally) and E1 for the one that was already
  // clear (plain, no celebration), and between them they add six sentences: the
  // cleared headline, its count line, the tally's "{count} {type}" and "{count}
  // given to somebody", the undo control's own words, and E1's two-branch
  // on-duty line. Not translated here for the standing reason below — the
  // translate script spends the owner's own key and a run is his to authorise.
  // RAISED 243 -> 244, the list's action column: one new sentence, the
  // screen-reader name for the header the client asked to leave visually blank
  // ("no header"). Every verb it draws — Accept, Assign, Plan, Store — and the
  // picker's own strings were already catalogued by the card, which is what
  // sharing `triageAct` and `RecordPicker` between the two views buys.
  // MERGED 8 Sep 2026, main × feat/ui-ux, and RAISED 240 -> 246 in all three.
  //
  // THE ARITHMETIC. The two branches carried different debts over different
  // sentences: main's pin read 217 and feat/ui-ux's read 240, and neither is
  // the merged number, because untranslated-ness is a UNION — a sentence main
  // never translated is still untranslated after the merge, and so is one of
  // hers. So the count was RE-MEASURED against the merged catalogue rather than
  // reasoned to, and it comes back 246 in de, es and ca alike (2,039 extracted
  // strings; `npm run lang` run immediately before). +6 over the higher of the
  // two pins is the part of main's residue that feat/ui-ux had not already
  // paid, and nothing here is new copy this merge wrote.
  //
  // RAISING IS THE EXCEPTION AND THIS IS THE REASON. A merge is the wrong
  // commit to clear 246 × 3 translations in: 738 new entries would bury the
  // 290-file merge they rode in on, and every one of them is a sentence
  // somebody should be able to read in the diff that introduces it. The debt
  // is older than this commit and it is unchanged in kind by it. The next
  // reviewed translation pass takes all three down together — and it can only
  // ever take them DOWN.
  //
  // LOWERED 246 -> 244 in all three, the field-hints lane. 44 `FieldConfig`s
  // across both front doors set `hint:` instead of `helpText:` — a key the
  // type has never had, silently dropped by the excess-property check's own
  // blind spot for named constants — so every explanation written for a
  // person was read by nobody. Renamed and extracted (43 distinct new English
  // sentences; one is shared verbatim by two fields), and translated by hand
  // into de/es/ca per the owner's 8 Sep 2026 ruling that translation is the
  // builder's own job and never spends his key. That is +0 net against this
  // ceiling — the 43 are BRAND NEW extractions, not previously counted, and
  // all 43 are translated the same commit they are catalogued in.
  //
  // The -2 is two SEPARATE, already-catalogued sentences translated in the
  // same pass: "The system this work is on. Everything below is narrowed by
  // it." (the New story dialog's App field, converted alone on 8 Sep 2026 to
  // measure this exact class, and part of the 246 as an untranslated string
  // until now), and "Choices" (the Settings tab renamed from "Dropdown
  // values" on 2026-09-01, extracted since but never translated — caught
  // because this lane's own `typeField` hint named the OLD screen name and
  // had to be corrected to "the Choices screen" first, R34, which put the
  // tab's own word in front of the same translator).
  //
  // LOWERED 244 -> 0 in all three, 9 Sep 2026, the client's "translate them."
  // The 244 the previous entry pinned — every extracted sentence with no
  // seed/catalogue entry in any of de/es/ca at the time the count was fixed —
  // is translated by hand in shared/i18n-seed.ts's own R44 pass, per the same
  // 8 Sep 2026 ruling: translation is the builder's own job and never spends
  // the owner's key. Read alongside the extraction that ran in the same
  // change: the true count moved during the pass (peer lanes append to this
  // seed file continuously), so the number actually answered is not a fixed
  // 244 read off a snapshot but whatever `npm run lang` plus a fresh
  // `coverage()` walk reported true and empty immediately before this pin was
  // written — verified zero, not assumed zero. Two classes of entry inside
  // that pass are not new prose: several split an existing joined
  // title+description sentence into the two separate `t(...)` calls the
  // screen now makes (the wording carried over unchanged from the joined
  // entry, per the precedent already in this file for "No waves yet."), and
  // "Regular" filled a scale-option label whose sibling "Compact"/"Large"
  // happened to already be answered because those two English words are
  // shared verbatim with `shared/scale.ts`'s own Compact/Comfortable/Large
  // set. Nothing was left in English on purpose; nothing was deferred.
  // RAISED 0 -> 11 in all three, 10 Sep 2026, kb_F's own source-card build.
  // Eleven new sentences (the knowledge-list card: compartment/app/sharing/
  // pieces/sightings/last-modified, the edit affordance, and the file-backed
  // edit note) shipped in English rather than guessed at in German, Spanish
  // and Catalan by a build lane forbidden from spending on a translation
  // model (`scripts/i18n-translate.mjs` calls one) and not confident enough
  // in its own Catalan to hand-translate a real product string. Two of the
  // eleven were placeholder wording pending a glossary decision.
  //
  // RAISED 11 -> 12 in all three, same day, once the hub answered that
  // decision: R6/R34 caught the placeholder using two undefined product
  // words ("passage", "sighting") before it ever reached the glossary check,
  // because that check reads shared/glossary.ts and never the copy, so an
  // undefined term on screen would have shipped green. Swapped for the hub's
  // own wording ("Found in search — never quoted in an answer.", "N people
  // have seen this" / "1 person has seen this") — net +1 string (two removed,
  // three added, one gaining a singular form) — and the ceiling moves with
  // it, in this same change, same as R44 asks.
  //
  // RAISED 12 -> 16 in all three, 11 Sep 2026, tracker `b-filing`: the
  // account-match confirm sheet's four sentences (the title, the "looks
  // like it belongs to" line, and the two button labels). Same reason as
  // every entry above it — a $0-cap build lane, not fluent enough in
  // Catalan to hand-translate a shipping product string, and forbidden from
  // spending on the translation model. Accepted debt, not a regression to
  // chase: raise it back to 0 once a translation pass answers all sixteen.
  de: 16,
  es: 16,
  ca: 16,
}

/** R46 — the reviewed exemptions. A component or foundation here is not
 * reached by the app today, each with the one sentence a non-technical reader
 * can check: no surface in the app has this shape, or adopting it would break
 * another law. Rot-checked both ways in `web/test/rules.test.ts` — an entry
 * the walk now reaches turns the build red until the line is deleted, and a
 * part with neither a reach nor a line here does the same. Keyed by the kit's
 * own directory name (`components/<name>` or `foundations/<name>`), the same
 * id `computeReachability` produces. */
export const KIT_COMPONENT_EXEMPT: Record<string, string> = {
  "components/visibility":
    "unreached as of 2026-09-03, and by a deletion rather than a gap: its `useIsVisible` had exactly one caller in the app, `web/components/condensed-title.tsx`, which watched a screen's real title and swapped in a smaller sticky stand-in once it scrolled away. The client removed that bar outright (\"when I scroll down, the whole compressed title is useless, so remove that\"), so nothing in either front door now asks \"is this element on screen right now\" — every other scroll-dependent surface in the app is plain `position: sticky` (the record and collection tab strips, the shell's breadcrumb bar), which needs no observer at all. The day a screen genuinely needs to know what is in view again, this is the part to reach for rather than a second IntersectionObserver.",
  "components/heatmap":
    "no screen aggregates \"which record did how much work each period\" as a grid — work-log views are single-series (one record's weeks, or one week's people, web/components/work/work-logs-panel.tsx), never a record×period matrix.",
  "components/pulse-band":
    "a confirmed name collision, not a gap: web/components/screens/pulse.tsx exports its own PulseBand, a StatGrid-plus-two-bar-charts dashboard band with no day-of-week axis at all — unrelated in shape to the kit's day-by-week density strip. Nothing in the app tracks per-day-of-week workload.",
  "components/donut":
    "explicitly rejected in the app's own comment: web/components/screens/pulse-charts.tsx documents that every comparison chart (hours by person, by app, by stage) stays a bar \"deliberately not a pie: … a bar is the only chart anybody reads a comparison off reliably.\"",
  "components/rings":
    "no single-KPI-against-a-target or part-of-a-whole metric exists anywhere that isn't already a bar comparison — the app's eleven charts are all multi-category bars or time-series areas (web/components/screens/pulse-charts.tsx).",
  "components/radar":
    "no feature compares one record across several independent dimensions at once — every metric the app tracks (hours, margin, savings, stage counts) is a single measure over time or over a group, which the existing bar/area charts already cover.",
  "components/progress-toggle":
    "both progress readouts in the app are plain text (web/components/work/sprints-screen.tsx's \"3 of 11 done\") or a continuous bar (KpiProgress, web/components/work/tasks-screen.tsx) — never discrete done/undone segments for this pill row to draw.",  "components/container":
    "adopting it would break R29: web/components/shell/app-shell.tsx's own `max-w-none` line is the sole machine-checked page-width owner for the agency front door, and Container's own presets (app 1240 / marketing 1200 / document 960) don't even offer that width.",
  "components/signature":
    "the app's one approval flow, PortalApprovalBand (web-portal/components/ticket-screen.tsx), is a click-to-approve button with a caption — not a drawn, canvas signature capture. No sign-off flow in the app asks for one.",
  "components/rating":
    "no star icon and no rating concept exists anywhere in either front door's UI code.",
  "components/aspect-ratio":
    "the one ratio-boxed image (web/components/apps/deliverables-panel.tsx) applies the plain `aspect-video` Tailwind utility directly to a single thumbnail — one site, not a reusable wrapper's job.",
  "components/video":
    "no `<video>` element exists anywhere in web/, web-portal/, or shared/web/.",
  "components/web-embed":
    "the only `<iframe>` in the codebase is a sanitizer test fixture (web/test/stored-html.test.tsx) proving embeds get stripped — not a real embedded-content surface.",
  "components/progress-dashboard":
    "multi-metric displays are already assembled from StatGrid + KpiProgress + Chart (web/components/screens/pulse.tsx, work-logs-panel.tsx, agent-blocks.tsx) — nothing needs this component's specific stacked-bars shape.",
  "components/tree":
    "no nested/hierarchical disclosure exists in the app — process branching (web/components/process/step-form-dialog.tsx) renders as a flowchart DAG through the kit's own Flowchart, not a tree, and the kit's own Comments is explicitly one level deep.",
  "components/notifications":
    "the app relies on the kit's own `sonner` toasts for the moment and `activity-feed` for the history — no bell icon or notification-center composition exists anywhere for this to replace.",
  "components/spreadsheet":
    "time logs (web/components/work/time-panel.tsx) are list-based with edits through a separate dialog, exactly the \"hours, invoices\" content the kit's own header names — but adopting it means re-architecting a working dialog-based edit flow into inline cell-editing, not a swap. The account rate card stood beside it in this sentence until 10 Sep 2026, when the client retired it.",
  "components/matrix":
    "work-logs-panel.tsx deliberately renders hours by week/person/kind as three independent 1D bar charts, each failing on its own when it has nothing to say — no two-dimensional record×period cross-tab exists for this to replace.",
  "components/swimlane":
    "no two-axis grouping (a status column further split by a second axis like assignee) exists anywhere in the app — story and sprint state is shown one dimension at a time.",
  "components/timeline":
    "the app's only history surfaces are the vertical ActivityFeed (already adopted) and Chart-based burndown/line charts — nothing draws a horizontal dated-event spine.",
  "components/chat":
    "no human-to-human messaging feature exists — the app's two thread UIs (the AI assistant, ticket conversations) are both already-adopted, different kit parts (agent-chat, ticket-thread) solving a different problem.",
  "components/tiles":
    "the home screen (web/components/screens/home-screen.tsx) uses PulseBand/StatGrid small KPI cards plus a links list — not a big-number wall-screen tile grid.",
  "components/map":
    "no lat/lng, address-mapping, or map integration exists anywhere in web/, web-portal/, or shared/web/.",
  "components/compare":
    "no 2-4 record side-by-side comparison screen exists anywhere in the app.",
  "components/flowdetail":
    "a fundamental mismatch: process steps are editable in this app (web/components/process/steps-panel.tsx has onEditStep/canEdit), and flowdetail's click-a-step panel is read-only by design — the app already adopted plain Flowchart directly instead (web/components/process/process-flowchart.tsx).",
  "components/copilot-overlay":
    "documented and deliberate: web/components/assistant/agent-host.tsx names copilot-overlay in its own comment, explaining that only the launcher's PLACEMENT was reused (it has to clear the phone's bottom nav bar, which the kit's own corner-pinned launcher does not account for) — the panel was rebuilt because agent-panel.tsx needs RunSteps and citation pills the kit's overlay does not model.",
  "components/detail-view":
    "a documented architecture choice, not an oversight: UI-CONVENTIONS.md §2b rules that bespoke `*-detail.tsx` screens are host-composed from TabsView + ActivityFeed + DescriptionList + Card precisely because each carries a control the screen engine (and this generic template) has no block for.",
}

/** R39 — the reviewed exceptions. A file here imports a UI package directly
 * because the kit does not expose what it needs. Each is a GAP IN THE KIT
 * stated out loud, not a preference: the fix is upstream, and when it lands the
 * pin goes red because the import is gone. */
export const UI_PACKAGE_EXEMPT: Record<string, string> = {
  "shared/web/screen-engine/screen-renderer.tsx":
    "ScreenLayer draws a dialog in four presentations — responsive (bottom sheet on a phone, centred card on a desktop), overlay, sheet and fullscreen — and the kit exposes neither: its DialogContent is centred only and its Sheet takes a fixed `side`. Radix is the kit's OWN dependency and this uses the very primitive the kit's Dialog and Sheet are built on, so the two can never disagree about behaviour — but it is still the app deciding a shape. UPSTREAM FIX: a `presentation` prop on the kit's DialogContent. Delete this line the day it ships.",
}

/** R33 — the copy TABLES: a file that declares words as data and reads them back
 * through `t` somewhere else, so the position where they are WRITTEN is not the
 * position where they are translated.
 *
 * They are not a loophole, they are the same ruling `translateRecipe` makes and
 * says out loud: the English stays where a developer typed it, because English
 * is the catalogue's KEY (shared/i18n.ts); a test and a team override still read
 * the English; and the translation happens once, at the one place the data
 * passes through, instead of at every declaration. What makes it safe to say
 * "not here" is `via` — the call that does the reading, which must still exist
 * in the source, or the pin goes red and somebody has to look.
 *
 * Keyed by file, narrowed by KIND, so a pin bought for a nav registry does not
 * also excuse a raw toast in the same file. Rot-checked in both directions: a
 * file with no unwrapped position of a pinned kind fails, and so does a `via`
 * string that no longer appears anywhere in the two front doors. The list can
 * only shrink. */
export const TRANSLATED_WHERE_READ: Record<
  string,
  { kinds: ("property" | "field-label" | "jsx-text" | "jsx-child" | "attribute" | "toast")[]; via: string[]; why: string }
> = {
  "shared/web/screen-engine/config.ts": {
    kinds: ["property"],
    via: ["t(config.emptyText)"],
    why: "The screen engine's collection defaults — `emptyText: \"Nothing here yet.\"` — are module-level DATA (the same shape as a field config: `t` is a hook and a default object is a constant), and the one place the sentence reaches a screen is CollectionFrame's empty state, which reads it through `t(config.emptyText)`. Declared English, translated on the way to the screen — the ruling R33's own law text makes for field configs, applied to the collection config the engine inherited when the old library moved app-side.",
  },
  "shared/brand.ts": {
    kinds: ["property"],
    via: ["brand.description"],
    why: "NOT TRANSLATED, and it cannot be — said plainly rather than dressed as a seam. The one sentence here reaches a person only through `shared/web/pwa.ts`, as the PWA manifest description and a `<meta name=\"description\">`, both of which Next writes ONCE at build time with no reader and no language to ask about. Every other position in this file is a colour, a URL or a name. Pinned rather than exempted from the walk, because the day somebody renders this sentence inside the app it should be caught, and a pin is the thing a reader trips over.",
  },
  "web/lib/screens.ts": {
    kinds: ["property", "field-label"],
    via: ["translateRecipe", "translateFields"],
    why: "THE recipe store, and the original of this whole pattern. A recipe is data in a module with no React in it, it is also what a team OVERRIDES and what the rule scans read, and both of those want the English. `resolveRecipe` puts every rendered recipe through `translateRecipe` on the way to the screen — one function instead of two hundred call sites, and a recipe written next month is translated the day it is written.",
  },
  "web/lib/pages.ts": {
    kinds: ["property"],
    via: ["t(i.title)", "t(s.title)"],
    why: "the nav registry: one source for the app's destinations, their slugs and the permission each needs. The shell and the section rail each read `title` through `t` as they draw the link, which is also the only place a destination becomes words rather than routing.",
  },
  "web/lib/collection-sorts.ts": {
    kinds: ["property"],
    via: ["translatedSorts"],
    why: "the sort vocabulary per collection, beside the `value` each label belongs to — and the value is a DOOR PARAMETER, so the two must stay in one object. `translatedSorts(key, t)` is the one read.",
  },
  "web/lib/collection-filters.ts": {
    kinds: ["property"],
    via: ["translatedFacets"],
    why: "the same, for filter facets: each label sits beside the `field` and `value` the door parses, which are names of data and are never translated. `translatedFacets(key, t, rows)` is the one read.",
  },
  "web/components/apps/apps-screen.tsx": {
    kinds: ["property"],
    via: ["t(o.label)"],
    why: "APP_SORTS is the same shape as COLLECTION_SORTS one file over — a BOUNDED collection's own sort vocabulary, module-level so it sits beside the `value` each label belongs to, translated on the way to `<SortControl>` (`APP_SORTS.map((o) => ({ ...o, label: t(o.label) }))`) rather than at declaration, where `t` is not a hook this constant could call.",
  },
  "web/components/tickets/tickets-collection.tsx": {
    kinds: ["property"],
    via: ["t(o.label)"],
    why: "TRIAGE_SORTS, the same reasoning as APP_SORTS above — the triage queue's own one-option sort vocabulary (`Raised`, added 2026-09-06 when the client asked the queue for the full toolbar), module-level so the label sits beside the `value` the sort slot is keyed on, and translated where `<ToolbarRow>` reads it (`TRIAGE_SORTS.map((o) => ({ ...o, label: t(o.label) }))`) rather than at the constant, where `t` is not a hook a module-level table could call.",
  },
  "web/components/apps/deliverables-panel.tsx": {
    kinds: ["property"],
    via: ["t(o.label)"],
    why: "DELIVERABLE_SORTS, the same reasoning as APP_SORTS above — the deliverables shelf's own two-option sort vocabulary, translated where it is read (`DELIVERABLE_SORTS.map((o) => ({ ...o, label: t(o.label) }))`) rather than at the module-level constant.",
  },
  "web/components/choices/selectable-screen.tsx": {
    kinds: ["property"],
    via: ["t(o.label)"],
    why: "VALUE_SORTS, the same reasoning again — Choices' own Value/Group sort vocabulary, translated where `<SortControl>` reads it (`VALUE_SORTS.map((o) => ({ ...o, label: t(o.label) }))`) rather than at the module-level constant.",
  },
  "web/components/screens/module-settings-screen.tsx": {
    kinds: ["property"],
    via: ["t(page.title)", "t(section.title)"],
    why: "MODULE_SETTINGS — the same shape as every copy table above, and the reason it is one is the client's own ruling of 2026-09-09 (*\"a lot of them are specific to the module\"*): a module's settings page is DATA, so that the second module is an entry in a list rather than a screen somebody writes. A page's `title` and each section's `title`/`description` sit beside the `segment` the URL is built from and the `types` the vocabulary is keyed on, which are names of data and are never translated — so the words cannot be split off into a `t(...)` at the constant without splitting the row that holds them, and `t` is a hook a module-level table could not call anyway. Every one of the three is read through `t` on the way to the screen (`t(page.title)`, `t(section.title)`, `t(section.description)`), and the gear reads the page title through `t` a second time for its own tooltip and accessible name. THE PAGE'S OWN `description` WAS THE FOURTH until 2026-09-10, when the client ruled *\"in ticket settings (or any other module) no subtitle\"* and the field was deleted rather than left unread — a column nothing renders is a sentence translated into three languages on every build for nobody, which is R28 calling it an orphan and this entry claiming it is translated where it is read.",
  },
  "web/components/work/tasks-screen.tsx": {
    kinds: ["field-label", "property"],
    via: ["translateFields(columns, t)", "t(tab.label)"],
    why: "a screen that composes its OWN table columns and its own six-tab strip. The columns are spread onto the recipe after `resolveRecipe` has run, so `translateRecipe` never sees them — `translateFields` is that same rule called at the place they are spread in; the tab labels are read through `t` where the strip is built.",
  },
  "web/components/meetings/meetings-screen.tsx": {
    kinds: ["field-label"],
    via: ["translateFields(ALL_COLUMNS, t)"],
    why: "the meetings All view, host-composed for the same reason and translated through the same one call.",
  },
  "web/components/accounts/contacts-screen.tsx": {
    kinds: ["field-label"],
    via: ["translateFields(CONTACT_COLUMNS, t)"],
    why: "the contacts table's three column headings — Contact, Account, Role — the client's own 2026-09-09 ruling (\"for contacts lets do view table, also add column role after account\"). Same shape as the meetings All view one line up and the same single read: the columns are the HOST's, spread onto the recipe AFTER `resolveRecipe` has translated it, so `translateRecipe` never sees them and `translateFields` at the point they are spread in is the one place they can ask. Declared at module level because a `TableColumn` array is a constant and `t` is a hook.",
  },
  "web/components/knowledge/google-connections.tsx": {
    kinds: ["property"],
    via: ["t(SERVICE_COPY[service].label)", "t(SERVICE_COPY[service].scope, BRAND)"],
    why: "`SERVICE_COPY` — each Google service's name and the sentence saying WHAT CONNECTING IT LETS US SEE. It is keyed by the service the caller is drawing, so the words are looked up rather than written at the point of use, and all three reads go through `t` — carrying `BRAND` since 5 Sep 2026, because the calendar sentence names the app and now says `{brand}` rather than spelling it out (shared/brand.ts is the one place that word is decided). The privacy sentence in particular is the one a person most needs in their own language.",
  },
  "web/components/knowledge/google-scope-dialog.tsx": {
    kinds: ["property"],
    via: ["t(m.title)", "t(m.description, BRAND)", "t(EVENT_KINDS[kind].title)"],
    why: "`MODES` and `EVENT_KINDS` — two closed vocabularies. MODES is keyed by SERVICE on purpose: the same two answers mean opposite things on the two connections (Gmail's 'only' takes mail away; Calendar's can hand more over, because kwapso reads only the primary calendar today), so the sentences cannot be shared and the table is what keeps them apart. EVENT_KINDS' `value` is Google's own event-type word, passed straight to events.list, so the table is a translation of an API constant and never a mapping. Every half is read through `t` in the same file — `m.description` carrying `BRAND`, because the calendar mode names the app through a `{brand}` hole rather than spelling it out.",
  },
  "web/components/knowledge/google-source-dialog.tsx": {
    kinds: ["property"],
    via: ["t(k.title)", "t(s.description)"],
    why: "`SHELVES` and `KINDS` — two closed vocabularies whose `value` is a database column value and whose `title`/`description` are the words offered beside it. Both halves are read through `t` in the same file. (The FIELD configs in this file are not pinned: they are positional, through `shared/web/field.tsx`.)",
  },
  "web/components/team/internal-record-dialog.tsx": {
    kinds: ["property"],
    via: ["label: f.label", "t(f.placeholder)"],
    why: "one form for three record kinds, each supplying its FIELDS as data (`brandAssetFields`, `deliverableFields`, `purposeFields`). The label reaches the screen through this file's `<Field config={{ ...defaultFieldConfig, label: f.label }}>`, which is the translating seam; the placeholder is put through `t` beside it.",
  },
  "web-portal/components/ticket-row.tsx": {
    kinds: ["property"],
    via: ["t(status.label)"],
    why: "`STATUS_WORDS` — the client's words for each ticket status, keyed by the status the row holds (SCOPE ch.06). The key is our vocabulary and the label is theirs; the row reads it through `t`.",
  },
  "web-portal/components/portal-shell.tsx": {
    kinds: ["property"],
    via: ["{t(label)}"],
    why: "the portal's four destinations, as data beside the href and the icon each belongs to. The bottom bar reads every label through `t` as it draws the link.",
  },
}
/** R34 — WORDS THE APP MAY NOT SAY, and the glossary term each one competes with.
 *
 * `term` is a key of `GLOSSARY` (shared/glossary.ts), checked, so a synonym can
 * never outlive the word it was banned in favour of.
 *
 * THE BAR FOR A LINE HERE IS HIGH, and it is the whole reason this list is
 * usable. A word goes on it only when, in THIS app, it can mean nothing but the
 * record it is standing in for. That rules out most of what a careless writer
 * reaches for, and the exclusions are as considered as the entries:
 *
 *   • "client" is NOT here, and it is the most tempting one. `Account` is the
 *     RECORD, but "client" is the relationship — "no client login can reach it",
 *     "what clients have asked us for" — and it is the word the agency uses out
 *     loud. Banning it would flag twenty-six good sentences to catch one bad
 *     placeholder.
 *   • "option" is not here either, because the glossary's OWN definition of
 *     Dropdown values is "the options behind your team's dropdowns". A rule that
 *     contradicts the dictionary it enforces is a rule people learn to exempt.
 *   • "permission" (singular) is allowed and "permissions" is not: "you don't
 *     have permission to open that" is plain English about an act, while
 *     "Permissions" as a heading is a second name for Access rights.
 *   • "request" is not here. It means a ticket on five screens and an HTTP call
 *     or a unit of the assistant's allowance on three others, and no word list
 *     can tell those apart. That one needs eyes.
 *
 * Matched WHOLE and case-insensitively, exactly as written — no automatic
 * plural, so both forms are listed when both are wrong. Explicit data beats a
 * clever matcher that surprises somebody at midnight. */
export const GLOSSARY_SYNONYMS: { word: string; term: string; why: string }[] = [
  // ── Words the app was actually saying on 18 Aug 2026 ──────────────────────
  { word: "teammate", term: "member", why: "a person on your team is a Member — the word the Members screen, the invite and the role are all named after" },
  { word: "teammates", term: "member", why: "the plural of the above" },
  { word: "permissions", term: "permission", why: "the Roles screen headed a matrix \"Permissions\" while two other screens called the same thing an access right. The singular stays free: \"you don't have permission to\" is a sentence about an act, not a name for a record" },
  { word: "portal login", term: "portalAccess", why: "Portal access is the thing an admin grants and takes away; \"Portal login\" reads as the credential, which is not what the switch does" },
  // `{ word: "cost card", term: "rateCard" }` stood here. THERE ARE NO RATE
  // CARDS LEFT and no `rateCard` term for a synonym to compete with: the agency's
  // two went on 10 Sep 2026 and the client-facing one an hour later ("the whole
  // account rates also killed it"). A deny-list line whose TERM is not in the
  // glossary is a rule about a word this app has no right word for, which is the
  // opposite of what this list is.
  { word: "diary", term: "meeting", why: "a conversation we have had or are about to have is a Meeting — the screen, the module and the glossary are all named after it; the same word was also standing in for Google's own calendar, a second and different thing this product only ever reads" },
  // ── …and the ones nobody has written yet, which is the cheaper half ───────
  { word: "user", term: "member", why: "the standard SaaS word for the person this app calls a Member. It has never appeared in either front door and this is what keeps it that way" },
  { word: "users", term: "member", why: "the plural of the above" },
  { word: "customer", term: "account", why: "an Account is a company or a person you work with, prospect or client; \"customer\" narrows it to the ones who are paying and quietly excludes the rest" },
  { word: "customers", term: "account", why: "the plural of the above" },
  { word: "timesheet", term: "workLog", why: "a Work log is one row of time; \"timesheet\" names a weekly form this product does not have" },
  { word: "time entry", term: "workLog", why: "the same record under a second name" },
  { word: "work item", term: "story", why: "one piece of work we do is a Story. \"Work item\" is the word that would blur it back together with a Task and a To-do, which SCOPE ch.02 keeps apart on purpose" },
  { word: "helpdesk", term: "ticket", why: "what a client asks us for lives in Tickets; naming the module after the industry's word for it would put a third word beside Ticket and Conversation" },
  { word: "help desk", term: "ticket", why: "the spaced spelling of the above" },
  { word: "knowledge article", term: "source", why: "one piece of material in the knowledge base is a Source — a note, or something the app keeps in step. \"Article\" says somebody wrote it, which is true of about half of them" },
  { word: "subtask", term: "task", why: "a Task has no children in this product, and a word for a thing that does not exist is a promise on screen" },
  { word: "sub-task", term: "task", why: "the hyphenated spelling of the above" },
]

/** R33 — the sentences that keep a banned word, and why. Rot-checked in both
 * directions: an entry naming a sentence the app no longer says goes red, and so
 * does one whose sentence no longer contains the word it was excused for. An
 * exemption that has stopped being needed is a record of an argument nobody is
 * having any more.
 *
 * EMPTY IS THE RIGHT ANSWER TODAY, and it is worth saying why rather than
 * deleting the table. The five words the app really was saying were changed
 * rather than excused, because each was a straight swap for the term the
 * dictionary already had. The table exists for the case that is not — a sentence
 * where the banned word is genuinely the right one — and it costs a line of
 * prose to use, which is the correct price. */
export const GLOSSARY_SYNONYM_OK: Record<string, string> = {}

/** R31 — the radii admitted BESIDE `rounded-xl` and `rounded-full`, and why each
 * one earns a third number.
 *
 * The two-radius law is right about the thing it was written against: five
 * spellings of one pixel value are five decisions where there is one. It is not
 * right that two numbers can draw everything, and the kwapso design kit says so
 * outright — ruling 03 admits exactly two exceptions, "a bar is not a box", and
 * the kit's own specimen page calls the first of them "the ONE named exception
 * to the two-radius law: 6px. Nothing else may."
 *
 * So the vocabulary grows by data rather than by drift, in the shape R32 uses
 * for colour literals: one entry, one reason, and a rot check that turns the
 * build red when an entry stops describing anything. The list can only shrink,
 * and a third box radius is still forbidden — these are not box radii.
 *
 * WHY THE KIT'S SECOND EXCEPTION IS NOT HERE YET. It names 4px for a bar, a heat
 * cell or a rotated decision node. Nothing in either app draws one today, so an
 * entry for it would be an exception with no use — precisely what the ratchet
 * exists to catch. It gets added by the commit that needs it, which is the only
 * moment anyone can check the reason is true. */
export const RADIUS_EXCEPTION: Record<string, string> = {
  "rounded-select":
    "6px, on the mark of a selection control — the checkbox. It is the one place a third number is unavoidable rather than convenient: at `rounded-xl` a 16px checkbox is a lozenge, and at `rounded-full` it is a radio button, so the two-radius vocabulary cannot express 'a square box with softened corners' at this size. Fixed at 0.375rem rather than derived from `--radius`, because it is not a smaller box — it is a different shape doing a different job.",
  "rounded-ss-none":
    "Not a third number — zero, on the single corner where the assistant's own folder tab attaches. `web/components/assistant/agent-panel.tsx`'s docked panel (`PANEL_COLUMN`) keeps `--radius` on all four corners and then REMOVES one of them, exactly the argument the kit's own `screen-shell.tsx` already makes for its content card's leading corner (`CARD_JOINED`, out of this file's scope because that surface is vendored): the tab's silhouette is a fixed SVG path that may not be edited, so the object it joins gives its corner up instead, and a plain CSS radius is the app's own to remove. Start-start rather than top-left so it mirrors with the tab in RTL for free. Applied ONLY when the panel is docked (the tab is only drawn there — the floating popover keeps all four corners); squaring a second corner, or this one on a surface with no tab above it, would be a different change and is not this one.",
}

/** THE VENDORED COMPONENT LIBRARY — the one directory in `shared/` that is not
 * this team's own screen code, and the laws whose SCOPE that changes.
 *
 * `shared/ui/` is Kwapso UI v0.15.0, copied into this repo on 2026-08-22
 * and now owned by it (`shared/ui/README.md` says why, and says that upstream is
 * never edited from here). Nothing about the CODE changed in that move — it is
 * still a generic component library, consumed through props — but it moved from
 * `node_modules/` into a folder three laws scan, so three laws had to say which
 * side of the line it sits on. Saying nothing was not an option: the build went
 * red the moment the files landed, and the two honest answers were "hold it to
 * the law" and "say why it is out of scope". Both were taken, one each.
 *
 * HELD TO THE LAW, no exemption: R32 (closed palette). The library named a
 * Tailwind ramp in exactly one file — `container.tsx`, four `neutral-*` classes
 * — and that is the same fault R32 exists to catch, in a component neither door
 * renders. It was FIXED rather than excused, so R32 keeps its full reach into
 * `shared/ui/` and this table has no entry for it. That is the shape to prefer:
 * an exemption is the answer only when the alternative is worse.
 *
 * OUT OF SCOPE, with a reason: the one below. It is rot-checked by its own
 * law's test — if `shared/ui/` stops offending, the entry must be deleted — so
 * this table can only shrink.
 *
 * IT HELD TWO, AND THE RATCHET TOOK ONE BACK. `two-radii` was excused here on
 * 2026-08-22 because the library still wrote `rounded-sm/md/lg/2xl` at about
 * sixty sites, and collapsing them was a decision about SHAPE that belonged
 * with the kit's four radii in front of it rather than with the commit that
 * moved some files. When that stage landed the same day, the check went red
 * naming the entry, and the entry went with the commit that earned it. That is
 * the mechanism working exactly once, in public, which is the only evidence
 * worth having that it works at all. */
export const VENDORED_UI = "shared/ui/"

export const VENDORED_UI_SCOPE: Record<string, string> = {
  "two-radii":
    "R31 polices the RADIUS VOCABULARY of screens this team writes. The kit has the same law in its own book — `shared/ui/docs/RULES.md` §4.2, which forbids the Tailwind step names outright and is stricter than R31 was until 2026-08-27 — and its own gate to run it under. Scanning the vendored copy produces UNACTIONABLE red: the hand-edit guard forbids fixing it here, so the only honest response to a hit is a message upstream, which is a review comment wearing a build failure's clothes. This is the position CLAUDE.md already takes on lint for the same directory and the same reason: 'its own repo lints it; linting a vendored copy we may not edit would only produce unactionable red.' Earned at v1.2.0, when `compositions/screens/settings.tsx` arrived writing `rounded-full` twice — a real breach of the KIT's §4.2, reported upstream, and not ours to fix.",
  "closed-palette":
    "R32's subject is the same: a colour a SCREEN THIS TEAM WROTE names literally instead of resolving through a token. The kit's §2.2 says the same thing in its own book. And the first hit after vendoring v1.2.0 shows why the scan is worse than useless here rather than merely noisy — `compositions/screens/settings.tsx` holds nine hexes on purpose, because it draws a PREVIEW of the light and dark themes, and a swatch of what dark mode looks like must not flip when you are in dark mode. That is the one shape of literal a token cannot express, it is correct, and it would have to be pinned in `PALETTE_LITERAL_OK` forever with somebody else's reasoning copied into our law book.",
  "catalogued-strings":
    "R28 already had a reasoned position on this code and it has not changed — only the code's address has. `resolveImport` refused a bare `@kwapso/ui/...` specifier with the words 'somebody else's code and is not ours to translate', so the library's strings were never in the catalogue and never translated. They are component DEFAULTS: the app says its own words through the props it already translates (`emptyText`, `placeholder`, `label`, `empty`), and R28's subject is what the two front doors SAY. Vendoring must not silently reverse that, because the reversal is expensive in the one direction nobody would notice — the ~150 library strings would enter the catalogue in English, and the only thing that turns an English key into German is `scripts/i18n-translate.mjs`, which spends the owner's Anthropic key. So the walk stops at this directory by PATH now that it can no longer stop by package name. THE RESIDUE IS REAL DEBT AND IS NOT PRETENDED AWAY: a handful of these strings are screen-reader labels the app cannot override from a prop ('Close' on Dialog and Sheet, 'Loading' on Spinner, 'Toggle theme' on ModeToggle), and a blind reader who chose German hears them in English. They are written up in NEEDS-A-SPEC.md rather than left for somebody to rediscover.",
}

/** R32 — the files that may hold a colour LITERAL, and why. Everything else in
 * the two front doors and `shared/` resolves through a token. Rot-checked: an
 * entry whose file no longer holds one turns the build red. */
export const PALETTE_LITERAL_OK: Record<string, string> = {
  "shared/brand.ts":
    "the branding seam itself. It is where a fork of this base changes the palette, so it is the one file whose job is to hold the values the rest of the app resolves.",
  "shared/workers/email-template.ts":
    "an email. No CSS variable survives a mail client, so every colour in a message has to travel as a literal — and it is not a screen, so no theme reaches it anyway.",
  "shared/web/pwa.ts":
    "the OS-level theme colour, read by the browser chrome and the app switcher before any stylesheet exists.",
  "shared/web/splash.ts":
    "the launch screen, painted by the OS from a manifest before the app has loaded.",
  "shared/web/google-sign-in.tsx":
    "Google's own mark, whose colours are theirs and are specified by their brand terms.",
  "web/lib/image.ts":
    "a canvas fill. It is drawn into a bitmap, and a canvas has no cascade to read a variable out of.",
}

/** R29 — the ONE page container per front door, and the width it is allowed to set.
 * Everything else that matches the page-container signature is either in
 * SCREEN_WIDTH_EXEMPT below or is a breach. */
export const PAGE_WIDTH_OWNER: Record<string, string> = {
  // MOVED HERE FROM `deep-link-screen.tsx` (31 Aug 2026). That file's own
  // return only reaches five of the ten screens `AppShell` renders — home,
  // settings, profile, invitations and kwapso return earlier, straight into
  // the shell, and never hit deep-link-screen's wrapper — so those five ran
  // with NO cap at all while every module screen (meetings, accounts,
  // tickets, …) stopped at 1600px. Invisible below 1600px of available
  // width and plainly visible above it, which is why the client saw Kwapso
  // as the widest screen rather than the one exception. `app-shell.tsx`'s
  // content div is the one node all ten screens pass through, so the cap
  // lives there now and every screen inherits it the same way.
  //
  // WIDENED AGAIN, TWICE MORE, SAME DAY (client, live on staging). Round two:
  // "screen width. you made them thinner! i wanted them even wider!" —
  // answered with a guessed fluid cap, `min(96vw,2200px)`. Round three, the
  // one that actually fixed it: "wider screens, align to the right same
  // level as breadcrumbs!" — the breadcrumb row (the shell's `header` prop)
  // sets no width of its own, so it already runs to the full padded edge of
  // the content column; `max-w-none` is what makes this div's own right edge
  // land on that same edge, on every rail state and every viewport, rather
  // than a second guessed number. See the fuller note in app-shell.tsx.
  "web/components/shell/app-shell.tsx": "max-w-none",
  // The portal's cap is NARROWER on purpose and it is a locked decision
  // (UI-RULEBOOK L5, "Do not do" #15): a client reads a handful of screens on a
  // phone, and 768px with larger type is the right measure for that. Three lines
  // in the one file (the header, the main region and the bottom nav) so all three
  // align to the same edge.
  "web-portal/components/portal-shell.tsx": "max-w-3xl",
}

/** R48 — reviewed exceptions to "every collection/data-view screen shows its
 * toolbar's search box by default". Two shapes of key, because the law runs
 * two censuses:
 *
 *   · A `BASE_RECIPES` key (`web/lib/screens.ts`, e.g. `"tickets.list"`) —
 *     the recipe's own `CollectionConfig.searchable` is `false`.
 *   · A FILE PATH (`web/components/....tsx`) — a `<ToolbarRow>` call site in
 *     that file has no `search` prop.
 *
 * Rot-checked in both directions, the same shape `SCREEN_WIDTH_EXEMPT` above
 * uses: an entry whose condition is no longer true (the recipe turned its
 * search back on, or the call site gained a `search` prop) fails the build,
 * so a screen that gets fixed cannot leave its pin behind. The list can only
 * shrink — a NEW screen reaches for the toolbar by doing nothing at all,
 * because `searchable: true` is `listCollection`'s own default and every
 * `<ToolbarRow>` a screen writes is expected to carry search unless it is
 * named here. */
export const TOOLBAR_EXEMPT: Record<string, string> = {
  // ── THE PORTAL'S BOUNDED ROOMS (R48 census ii-b, added 4 Sep 2026). The
  // client portal draws no <ToolbarRow> at all, so until this census existed the
  // law passed on that whole front door by matching nothing. Its two GROWING
  // collections — tickets and what the client has sent us — now search the door
  // and are not listed here; a paging room cannot be exempted at all. These four
  // are bounded, which is the law's own stated ground: a search box over a
  // handful of rows is a control that cannot do anything.
  "web-portal/components/home-screen.tsx":
    "not a collection — a dashboard PREVIEW of the newest few tickets with a link to the rest. The collection it previews is tickets-screen.tsx, which searches. A box here would search the preview, which is the lie R48 exists to stop.",
  "web-portal/components/company-screen.tsx":
    "bounded by the account itself — the company's own record and its contacts, a handful of people. This is the one screen where a contact list is the whole content; it does not page, and it cannot grow past the people at one client.",
  "web-portal/components/ticket-attachments.tsx":
    "bounded by ONE ticket — the files on the ticket in front of you. It does not page, and a client who can see the ticket can see all of them at once.",
  "web-portal/components/deliverables-screen.tsx":
    "bounded today: what the agency has deliberately marked visible for this client, unpaged. THIS ENTRY DIES THE DAY IT PAGES — the census refuses an exemption for any portal room carrying hasMore/loadMore, so adding paging here fails the build until it also searches.",
  // ── THE SIX PAGED RECIPES — search lives in the host's <PagedFind>, never
  // in the recipe's own in-memory engine (SEARCH.md's layered model: a
  // GROWING collection's search has to ask the door, because the frame can
  // only filter the page it is holding). `listCollection(..., {paged:true})`
  // is what turns `searchable` off for exactly this reason, and every one of
  // these six DOES show a real toolbar with a real search box — `PagedFind`
  // (components/records/paged-find.tsx) draws an unconditional `<SearchInput>`, no
  // per-caller way to switch it off — so this is a recorded "search lives
  // elsewhere", not a screen with none.
  "tickets.list":
    "paged (R14) — its search box is the host's own <PagedFind>, drawn by tickets-collection.tsx, which always renders a SearchInput. The recipe's own in-memory search would only ever see page one and call it the whole list.",
  "accounts.list":
    "paged (R14) — its search box is the host's own <PagedFind>, drawn in web/components/deep-link/collection-content.tsx, which always renders a SearchInput. Same reason as tickets.list: the recipe's own search sees only the loaded page.",
  "knowledge.list":
    "paged (R14) — its search box is the host's own <PagedFind>, drawn in web/components/deep-link/collection-content.tsx (the same file as accounts.list, a second call site), which always renders a SearchInput.",
  "contacts.list":
    "paged (R14) — its search box is the host's own <PagedFind> in contacts-screen.tsx, which always renders a SearchInput. Same reason as tickets.list.",
  "meetings.list":
    "paged (R14) — its search box is the host's own <PagedFind> in meetings-screen.tsx, which always renders a SearchInput. Same reason as tickets.list.",
  "processes.list":
    "paged (R14) — its search box is the host's own <PagedFind> in processes-screen.tsx, which always renders a SearchInput. Same reason as tickets.list.",
  "stories.list":
    "paged (R14) — its search box is the host's own <PagedFind> in stories-screen.tsx, which always renders a SearchInput. Same reason as tickets.list.",

  // THE TWO GENUINELY-EMPTY <ToolbarRow> CALL SITES THIS LAW USED TO NAME
  // HERE (sprints-screen.tsx, waves-screen.tsx) ARE GONE, 2026-09-03, R50.
  // Both used to fall back to a BARE `<ToolbarRow actions={…}>` — search
  // gone, but the create button left standing — reasoned in a comment as a
  // deliberate "nothing to search" opt-out rather than the lone-"+"-pill bug
  // R50 was written for. R48's own two-clause law only ever asked "is there
  // a `search` prop", so a `<ToolbarRow search={sprints.length > 0 && …}
  // actions={canCreate && <AddButton/>} />` passed it outright — `search`
  // WAS conditionally present, `actions` simply was not gated the same way.
  // sprints-screen.tsx now carries ONE `<ToolbarRow>`, always, with a
  // required `empty` prop (R50) deciding whether the WHOLE row draws —
  // search included, exactly as this law still requires, and the create
  // button along with it, which is the half this law never asked about.
  // waves-screen.tsx dropped `<ToolbarRow>` for this collection altogether:
  // `<WaveFinder>` (its own real toolbar) already only ever rendered once
  // `all.length > 0`, so the bare fallback had nothing left to justify once
  // R50 made "Add the first" `<CollectionEmptyState>`'s job instead.
}

/** R49 — reviewed exceptions: a `<ToolbarRow>` call site (or wrapper) that
 * genuinely needs its own spacing decision beside the row's own baked-in
 * `--toolbar-content-gap`, with the real reason. Rot-checked: an entry whose
 * file no longer matches the condition it was pinned for fails the build, so
 * the list can only shrink. Empty today — every call site's OWN
 * toolbar-to-content boundary now reads the one token; the handful of
 * `flex-col gap-*` wrappers that still exist beside a `<ToolbarRow>` (a
 * heading-to-toolbar rhythm in `client-org-panel.tsx`, a group-to-group one in
 * `stakeholders-panel.tsx`, a numbers-to-rows one in `work-logs-panel.tsx`)
 * are nested INSIDE a plain, gap-less wrapper around the row itself, so they
 * govern a different sibling pair and never compete with the row's own gap —
 * the census below does not even reach them. */
export const TOOLBAR_CONTENT_GAP_EXEMPT: Record<string, string> = {}

/** R50 — reviewed exceptions: a `<ToolbarRow>` or `<PagedFind>` call site
 * that genuinely needs to keep drawing its row (or a piece of it) even while
 * the collection it narrows holds zero rows, with the real reason. A FILE
 * PATH earns an entry two ways, over the law's two censuses:
 *
 *   · A `<ToolbarRow>` call site with no `empty` prop AT ALL, or one whose
 *     `empty` is a hardcoded `{true}`/`{false}` literal rather than an
 *     expression derived from the collection's own row count — a literal is
 *     the row answering R50's own question with a constant, which is exactly
 *     the shape a caller could otherwise use to quietly opt back out.
 *   · A `<PagedFind>` call site with no `restingEmpty` prop, under the
 *     identical rule.
 *
 * Rot-checked in both directions, the same shape `TOOLBAR_EXEMPT` above
 * uses: an entry whose call site now derives the prop from real data fails
 * the build, so a screen that gets fixed cannot leave its pin behind. */
/** R52 — the components that ask ONE door under TWO keys on purpose.
 *
 * Only this shape is exemptible. Reading one KEY twice has no entry here and
 * never will: the store dedupes it, so the second read buys nothing at all.
 *
 * Keyed `file::Component::door`, because the unit is the component and one file
 * can hold several. */
export const TWO_READS_ONE_DOOR: Record<string, string> = {
  "web/components/meetings/meetings-screen.tsx::MeetingsScreen::listFetch.meetings":
    "three questions, not one asked three times — `meetingsKey(teamId)` is the collection, `meetingsKey(teamId, weekView)` is the strip above it, and `meetingsKey(teamId, \"mine\")` is the tab for the ones this reader was in the room for. Each narrowing is one the DOOR resolves and the browser cannot: the week, because the list is ordered by start time descending and page one is the furthest-out future, so deriving it client-side would show only what page one happened to contain; and Mine, because \"I was in the room\" is read off the stored guest list with a fenced creator fallback, which no filter over the rows in hand can reproduce.",
  "web/components/process/process-detail.tsx::ProcessDetailScreen::tenancy.processDetail":
    "four reads of one door because a process map can be COMPARED with itself: the current version, a named older version, the map as it stood on a date, and the one being diffed against. Three of the four are null-keyed unless a comparison is open, so an ordinary open costs one. They are four different records that happen to share a door.",
  "web/components/work/work-logs-panel.tsx::WorkLogsPanel::contentApi.workLogs":
    "one record's own time and one PERSON's time are different fences, not the same list filtered — `recordTimeKey(targetTable, targetId)` is what this record cost, and the person-filtered read is a different question the door answers with a different total. Filtering the first client-side would give a number that disagrees with the badge.",
  "web/components/tickets/tickets-collection.tsx::TicketsCollection::listFetch.helpFacet":
    "the sub-tab that is OPEN and the WAITING column on the Open board are two questions, and only one of them is ever live at a time. `facetQ` reads whichever stage tab a person has picked; `waitingQ` is null-keyed unless `facet === OPEN && openView === \"board\"`, and its `help-facet:all:waiting` key is the same one the Waiting TAB rests on, so the board column and that tab are one read between them rather than two. Collapsing them would mean the board's Waiting column counted page one of the open list instead of the door's own total (R14/R16), which is the arithmetic the column exists to show. Named on 8 Sep 2026, when main's R56 met feat/ui-ux's ticket board — neither branch could see this, because the law and the screen landed on opposite sides of the merge.",
  "web/lib/use-screen-data.ts::useScreenData::listFetch.tasks":
    "the OPEN list and the ALL list are kept apart deliberately, and the file says why: ticking a task off the open list REMOVES it from the open list, so a detail screen sourced from that collection would answer \"that record no longer exists\" the moment somebody used the button on it. This is R38's failure prevented by construction; collapsing the two reads would reintroduce it.",
}

/** R67 — THE FILES THAT STILL DRAW A TITLED SECTION ON THE BARE PAGE GROUND,
 * and the reason each does.
 *
 * Keyed by FILE, and rot-checked: an entry whose sections are all contained now
 * fails the build, so the list can only shrink. Each line names what would have
 * to change, not merely that it has not.
 *
 * A line here is a debt, not a design. The law's own header
 * (web/test/sections-stand-on-paper.test.ts) has the client's two rulings and
 * the definition; this is the arrears against them. */
export const UNCONTAINED_SECTION_OK: Record<string, string> = {
  // ── THE CLIENT PORTAL, ALL SIX FILES, ONE DECISION ────────────────────────
  //
  // Every line below is the same finding: the portal stacks titled sections
  // straight onto `portal-shell.tsx`'s `<main>`, which paints nothing. That is
  // not six oversights, it is the portal's whole visual language, set the day
  // it was built and never revisited. The agency app was fixed here on
  // 2026-09-10 — eleven sections across eight files — because every one of
  // them was an inconsistency WITHIN a screen that already used paper. The
  // portal is consistent with itself, so putting panels on it is a REDESIGN of
  // the client-facing app rather than a defect being repaired, and it should be
  // done in one deliberate pass with the client looking at it, not inferred
  // from a source scan by a lane whose subject was Settings. Named per file
  // rather than as one "the portal is out" clause on purpose: a clause is
  // invisible, six lines are a list somebody has to read.
  "web-portal/components/company-screen.tsx":
    "two sections on the client's own company page — their details (`DescriptionList`) and the people we work with (`List`) — both drawn straight on the page ground.",
  "web-portal/components/delivery-block.tsx":
    "what the client bought: the loading skeleton and the `List` of delivery blocks under it both stand on the page ground; nothing in this section ever paints.",
  "web-portal/components/home-screen.tsx":
    "the portal home's ticket section — its rows sit in a bare `<div>` on the page. Its zero (`PortalEmpty`) and its error (`ErrorPanel`) do paint, so this section changes shape between states exactly as Access tokens did on the agency side.",
  "web-portal/components/sent-to-us.tsx":
    "what the client has already sent us: the skeleton, the search row and the done pile are all on the page ground.",
  "web-portal/components/ticket-attachments.tsx":
    "a ticket's attachments on the client's side — the skeleton and the drop target are on the page ground; the file rows themselves paint.",
  "web-portal/components/waiting-on-you.tsx":
    "the loading skeleton for what is awaiting the client's input. Its error and its rows both paint, so this is the loading state alone — the section jumps onto paper the moment the read lands.",
}

export const EMPTY_TOOLBAR_EXEMPT: Record<string, string> = {
  "web/components/accounts/account-detail-panels.tsx":
    "ContactsPanel's <ToolbarRow> carries `empty={false}` — the one collection in the app with TWO first-adds rather than one (\"Add contact\", linking a person already on the books, and \"New contact\", making one), and `CollectionEmptyState` only ever carries a single labelled `onCreate` — it cannot offer both, so the row's own two icon buttons have to stay reachable on an empty contacts list exactly as they do on a populated one.",
  "web/components/accounts/contact-panels.tsx":
    "all three <ToolbarRow> call sites (Companies/Tickets/Meetings, one person's read-only summary panels) carry `empty={false}` — each is reached only PAST that panel's own early `X.length === 0` return, so the row can never actually be empty by the time it renders; the literal records that guarantee rather than hides it.",
  "web/components/tickets/tickets-collection.tsx":
    "TWO shapes in one file. TriageQueue's <ToolbarRow> carries `empty={false}` — reached only past two earlier returns (`!view.yours`, `view.waiting.length === 0`), so the queue is guaranteed non-empty by the time this row renders; the literal records that guarantee rather than hides it. And the `raiseTicket` <AddButton> is a NODE built once (`const raiseTicket = canCreateTicket ? <AddButton…/> : null`) and handed to the `actions` slot of every body this screen has, so the row it lands in has already returned null on an empty collection — it is a toolbar action written one line further up, and the census reads position rather than data flow.",
  "web/components/process/steps-panel.tsx":
    "TWO different first-adds on one collection, which is Contacts' exemption above in a different module: \"Add step\" types what somebody heard, and `<ReadACall>` beside it has the app propose the steps off a meeting and walk the person through them. `CollectionEmptyState` carries a single labelled `onCreate` and cannot offer both, so both stay reachable on an empty step list exactly as they are on a populated one.",
  "web/components/tickets/help-stakeholders.tsx":
    "not a heading's create button at all — this <AddButton> is the SUBMIT of the picker beside it (\"Pick someone to keep in the loop\" → Add stakeholder), and the pair is already gated on `addable.length > 0`, which is the candidate list rather than the collection above it. Gating it on the stakeholder list's own emptiness would remove the only way to add the first stakeholder, and the collection it would be gated on is not the one it draws from.",
}

/** R62, clause (iii) — THE FILES THAT MAY STILL DRAW A SECOND FILTERED-ZERO
 * REGISTER, and the reason each does.
 *
 * The law is that a collection’s two empty states are ONE component with the
 * fact as a prop. The kit’s `<ShapeStateBody … filtered>` was the other one,
 * and it is what the agency door drew for every filtered zero until 2026-09-09
 * — a different box (`px-6 py-[var(--space-8)]` against the register’s
 * un-inset `py-[var(--space-7)]`, a raw `text-2xl` span against `Headline`, a
 * `text-caption`/40ch body against `Text size="sm" measure`) whose words were
 * kit defaults outside R28’s walk and therefore untranslated everywhere.
 *
 * EMPTY ON PURPOSE, AND THAT IS THE POINT. `ShapeStateBody` is still the app’s
 * LOADING and ERROR body and stays imported for those — this list is only about
 * its `filtered` register. A screen that genuinely needs a second one writes the
 * reason here where a reviewer reads it; rot-checked, so an entry whose file no
 * longer draws one turns the build red and the list can only shrink. */
export const SECOND_ZERO_REGISTER_OK: Record<string, string> = {}

/** R53, clause (ii) — THE COMPONENTS THAT MAY BUILD A `<SortControl>` OR A
 * `<ViewSwitch>`, and the reason each owns one.
 *
 * The law's point is that a toolbar control belongs to the ROW that draws it,
 * not to the screen that wants one: `<ToolbarRow>` (`web/components/deep-link/
 * screen-bits.tsx`) builds both from a config now, so eleven screens that used
 * to construct their own — eight of them into the wrong slot — construct
 * nothing. That sentence is only true while the census can name every OTHER
 * place a sort or view control is made, which is what this list is. It is
 * deliberately NOT a scope exemption ("shared/web/ is out of scope"): each of
 * these is a real, second toolbar with its own slots, and a second toolbar is
 * exactly the thing the client is looking at when she says "different toolbar
 * variations". Naming them here makes them visible as data instead of invisible
 * to a census that only walks `<ToolbarRow>` call sites.
 *
 * Rot-checked: an entry whose file no longer renders either control fails the
 * build, so the list can only shrink. */
export const TOOLBAR_CONTROL_OWNERS: Record<string, string> = {
  "web/components/deep-link/screen-bits.tsx":
    "THE ROW THIS LAW IS ABOUT. `<ToolbarRow>` builds both controls from `ToolbarSortSlot`/`ToolbarViewSlot`, which is clause (i) of R53 — it is the owner, not an exception to the rule.",
  "web/components/records/paged-find.tsx":
    "THE DOOR-SEARCHED HALF OF THE APP. `<PagedFind>` draws its own toolbar because its search, its facets and its ORDER all have to reach the door rather than the fifty rows in the browser (R14 — \"the sort actually doesn't work\" was a frame ordering page one and calling it sorted). Its `sorts`/`defaultSort` props are already the same default-with-a-reason shape R53 clause (iii) puts on `<ToolbarRow>`, and all nine of its call sites pass both.",
  "shared/web/screen-engine/collection-frame.tsx":
    "THE RECIPE ENGINE'S OWN FRAME, and the one path that already got this right: its sort control is DERIVED (`frameSortOptions`, web/lib/screens.ts) from the recipe's own columns rather than passed in, and it stands itself down for a paged collection, for a table whose headers already order it, and for a list with fewer than two orderable columns. A screen drawn this way cannot forget a sort control, because it never had to ask for one — which is the shape R53 is copying onto the bespoke row.",
  "web/components/work/wave-finder.tsx":
    "A SECOND HAND-WRITTEN COPY OF `<ToolbarRow>`, and the honest name for it. It repeats the row's own `data-slot=\"toolbar-row-column\"`/`\"toolbar-row-track\"`, its fill, its two-radius rule and its `--toolbar-content-gap` margin, and then adds a sixth slot `<ToolbarRow>` has no name for (`period`, the waves timeline's own date-range control) and puts `view` AFTER it rather than before `actions`. FOLDING IT IN IS OPEN WORK, not a decision this law makes: it needs a `period` slot on the shared row and a ruling on which fill a toolbar wears inside a `<CollectionCard>` (this one paints `bg-surface-panel`, `<ToolbarRow>` paints `--surface-raised`, and Dropdown values draws a `<ToolbarRow>` inside a `CollectionCard` today — so the two disagree and neither is obviously wrong). Pinned here so the divergence is a line somebody can read rather than a file the toolbar censuses cannot see.",
}

/** R53, clause (iii) — COLLECTIONS WITH NO ORDER TO OFFER, each with the real
 * reason, keyed by the component that draws the `<ToolbarRow>`.
 *
 * The sort slot is a DEFAULT (the same sentence R48 wrote for the search box
 * one slot along), so a `<ToolbarRow>` that passes no `sort` has to say why
 * here. Keyed by ENCLOSING COMPONENT rather than by file, unlike R48's and
 * R50's own lists: three of these files hold two or three separate toolbars
 * with genuinely different answers — `contact-panels.tsx` alone has one panel
 * that now sorts by two columns, one that sorts by direction only, and one that
 * cannot honestly sort at all — and a file-level pin would exempt all three on
 * one panel's reason.
 *
 * NONE OF THESE IS "we did not get round to it". A slot a screen cannot fill
 * honestly is not a defect, and the bar is the one `frameSortOptions` already
 * sets for the engine's own frame: a control offering an order the rows cannot
 * actually be put in is dead UI, and a control that orders page one of a paged
 * list is worse than dead — it is wrong. Rot-checked in both directions: an
 * entry whose component now passes `sort` fails the build. */
export const TOOLBAR_SORT_EXEMPT: Record<string, string> = {
  "web/components/team/members-gallery.tsx#MembersGallery":
    "A GALLERY OF THE PEOPLE ON THE TEAM, and the client named its toolbar slot by slot on 2026-09-09: search, a Role filter, Invites, and the plus. There is no order to offer that anybody would ask for. The wall carries four facts — a round mark, the full name, the role chip and the email — and three of them order the same way (a person's name IS the row, an email sorts by the same name in a worse spelling, and a role is the FILTER one slot along, not a second control asking the same question). The one field that would genuinely sequence a team, the date somebody joined, is deliberately not on the card: the row this replaced spent a whole line on \"<role> · joined <date>\" and \"this takes too much space\" is the correction that produced the gallery. A sort picker offering a single option over a bounded, alphabetical wall of nine cards is a control that answers nothing.",
  "web/components/work/tasks-screen.tsx#TasksScreen":
    "THE CALENDAR TAB, and this is the screen from the client's own screenshot. Its bespoke row sits above `RecordCalendar`, a month grid: the day a task falls on IS its order, and there is nothing else a square could be put in sequence by — the same sentence meetings-screen.tsx already writes for its own calendar view (\"a calendar square does not order, the day it falls on does\"). The other five tabs draw through `RecordTable` → the kit's `CollectionFrame`, where every column header orders the whole bounded list, so a picker above them would be a second control for one question.",
  "web/components/apps/stakeholders-panel.tsx#StakeholdersPanel":
    "NOT ONE LIST. It draws two named groups — Ours and Theirs — each with the lead/main contact pinned at the top, so the grouping and that pin ARE the order; one search box narrows both (\"who is on this, on either side\" is one question). There is no single sequence for a sort control to act on, and applying one per group would order two lists from one chip.",
  "web/components/work/work-logs-panel.tsx#WorkLogsPanel":
    "TIME IS READ IN TIME ORDER, and this list PAGES (`<LoadMore>`, R14). A browser-side reorder would put the fifty entries currently in hand into a new sequence and present it as the order of the whole log, which is exactly the defect `frameSortOptions` refuses for every paged collection in the engine. If this ever earns a sort it belongs on the door, as a `<PagedFind>` `sorts` option, not here.",
  "web/components/accounts/contact-panels.tsx#ContactTicketsPanel":
    "A PAGE-ONE SUMMARY OF A PAGED LIST (`<LoadMore>`, R14) on somebody's record — the whole ticket collection has its own screen, with its own door-backed search, filters and sort. Same reason as WorkLogsPanel above: ordering the loaded page and calling it the order of the list is the lie R14 exists to stop.",
  "web/components/tickets/tickets-dashboard.tsx#TicketsDashboard":
    "A DASHBOARD IS NOT A LIST, AND HAS NO ROW ORDER TO OFFER. The client asked for this toolbar in the same breath as the exemption — \"dashboard should also have toolbar / filter by client and type / no sort\", 6 Sep 2026 — and the reason is structural rather than a preference. There are no rows on this tab at ALL: every number on it is a COUNT(*) or a quantile the database took over the whole backlog, and the six panels under this row are a pipeline grid, a stacked bar per system, two ranked lists the DOOR ordered (busiest first), a 4×4 matrix, a duration distribution and the monthly trend beside it. Not one of them is a sequence a reader could ask to see differently — the pipeline's order is the ticket lifecycle, the matrix's is the ticket vocabulary, and the rankings are already the answer to \"who has the most\", which is the question. A `<SortControl>` here would offer to reorder a picture. The three NARROWINGS it does carry — the two filters and, since 7 Sep 2026, the search box (\"still missing full toolbar!\", which is why this row now has a search box and this entry still has no sort) — are not the browser narrowing loaded rows either (there are none to narrow): they are parameters of `GET /api/content/help/dashboard`, spent in the WHERE clause of all nine of its grouped reads and carried in the cache key, which is the only shape that can work when the screen holds no data of its own. SEARCHING A BACKLOG AND REORDERING A PICTURE ARE DIFFERENT ACTS, which is why this entry survived the change that deleted this component's `TOOLBAR_EXEMPT` line: a term is a WHERE clause the door can answer, and an order is a sequence that does not exist here. The app record's own Dashboard view is this same component with an `appId` and four panels instead of six, and it changes nothing here: a pipeline, a matrix and a duration distribution are no more orderable for one system than for all of them.",
  "web/components/work/sprints-screen.tsx#SprintsScreen":
    "THE BESPOKE ROW SERVES TWO BODIES THAT ARE NOT FLAT LISTS — Overview, which groups sprints under their own state headings, and Calendar, a month grid. A sort chip would either fight the grouping or reorder squares by something other than the date they sit on. The third tab, \"All sprints\", is a flat list drawn by the recipe engine, and it gets its picker from `frameSortOptions` off its own columns — which is why this screen looks sorted where it is a list and unsorted where it is not.",
}

/** R29 — reviewed exceptions. A file listed here matches the page-container
 * signature and is allowed to, WITH ITS REASON. Rot-checked in both directions:
 * an entry whose file no longer sets a width fails the build, so a screen that
 * gets fixed cannot leave its pin behind.
 *
 * The ratchet CLOSED on 18 Aug 2026. Six screens were pinned here as a work list
 * rather than as an approval (plan W1); the boot loader deleted `app-shell.tsx`'s
 * pin when it rewrote the skeleton, and the rearrangement lane deleted the other
 * five by widening Home, Settings, Profile, Invitations and Kwapso to the shell's
 * own container. What survives is one entry that is not a page at all, which is
 * what this list was always meant to hold. */
export const SCREEN_WIDTH_EXEMPT: Record<string, string> = {
  "web/components/shell/install-prompt.tsx":
    "not a page. It is the install nudge's Sheet content, which is centred and full-width INSIDE the sheet, and a sheet is an overlay with its own measure.",
}

/** R13 — reviewed exemptions: modules that are deliberately NOT import targets,
 * each with its reason. Every other module must have a TargetDef in the catalog. */
export const CATALOG_EXEMPT: Record<string, string> = {
  teams: "team metadata is created by the team factory (one row per team), never imported",
  team_members: "membership arrives through invites (an identity flow) — a CSV cannot consent for a person",
  help: "tickets are conversations raised in-app; importing them would forge authorship and timelines",
  screens: "screen recipes are app furniture (config), not team data",
  agent: "the assistant's threads/usage are system records, not importable content",
  contacts:
    "not a table — the module is a SWITCH over rows the `accounts` target already imports. A company and a person are one row shape (SCOPE ch.03), so a file of people is a file of accounts with the Type column set to person, and the link between a person and a company is set on the account afterwards for the same reason the parent pointer is: a file's own rows cannot be resolved to ids until the file has been written. Giving this module a second import target would be two ways to load one table, and the second one would be the one nobody keeps in step.",
  portal_users:
    "a login is a granted identity, not importable content — a CSV cannot consent for a person (the same reason team_members is exempt)",
  all_tasks:
    "not a table — the module is a SWITCH over whose tasks a list answers about (4.9). The rows themselves are `tasks`, which the work engine's own target already imports; giving this module a second target would be two ways to load one table, and the second one would be the one nobody keeps in step. The same shape as `contacts`, one spine along.",
  knowledge:
    "a source is either TYPED here — and indexed in the same call, because the owner asked for instant syncing, which costs one embedding per chunk — or MIRRORED from a row the app already owns and kept in step by the sweep. A CSV would be a third way in with the first one's cost and neither one's upkeep: the importer writes row by row through the module's own gated create door, so a 5,000-row file would be 5,000 chunkings and 5,000 model calls inside one request, against a €50/month ceiling. The in-rule answer to 'we have a spreadsheet of process notes' is to point the sweep at where they already live, or to import them into the module they belong to and let the mirror do it.",
  processes:
    "a process map's numbers are AGREED estimates — a time a client and a staff member settled together, in front of each other, about the client's own work. Every savings figure in the app is a subtraction of two of them, so a CSV would import estimates nobody agreed and produce figures nobody can defend, which is the exact failure this module exists to prevent. A map is authored a step at a time, with the person whose work it describes.",
  todos:
    "a to-do is a REQUEST WE MAKE OF A CLIENT, and raising one emails them. It is one of only two things in the whole product that reaches a client's inbox (BUILD-1 §7), and an import is the one shape of write that produces hundreds at once — a spreadsheet of forty rows would be forty emails into somebody's morning, from our own verified sender, before anybody had read the file back. The write it would replace is a title and a date typed while you are already talking to them. Stories ARE importable, for the opposite reason: nothing about a story leaves the building.",
  staff_profiles:
    "both tables here name a PERSON — by their member id, which is the one thing a spreadsheet cannot supply. A CSV column of names or email addresses would have to be resolved to members, and resolving it wrongly files somebody's personality profile, or somebody's qualification, against the wrong colleague. That is the same reason team_members is exempt, arriving from the other direction: a file cannot say who somebody is. A profile is written on the member's own page, where the question never comes up.",
  google:
    "a connection is a CAPABILITY, not a record: the row is worthless without the refresh token inside it, and that token can only be minted by a person standing at Google's own consent screen and saying yes. A CSV of connections would either import rows that authorise nothing, or — if it carried tokens — be a spreadsheet of other people's mailboxes travelling through an upload form. The named folders and spaces are exempt for the second reason team_members is: each one has to be a folder THAT PERSON can actually open, and a file of ids nobody checked would either fail at Google or, worse, quietly share the wrong thing under a familiar name.",
  google_mail:
    "not a table at all — the module exists to carry ONE switch on the permission sheet (may kwapso send mail as you). There is nothing to import into a right; it is granted on the Roles screen, one role at a time, by somebody who understands what they are granting.",
  deliverables:
    "a deliverable is MATERIAL — a file we hold or a link we do not — and a CSV can carry the link but never the file, so a file of them would import half the shelf as titles pointing at nothing. And the row that matters cannot be resolved from a spreadsheet at all: a deliverable hangs off exactly one APP, which is an id here and a name in a file, and `apps` is not an import target (it belongs to `processes`, exempt above for its own reason), so there is nothing for a reference to resolve against and every row would have to be re-filed by hand — which is the entire write. The legacy set is EIGHT rows across twenty-eight apps (glide/RECONCILIATION.md), typed in the afternoon somebody decides to. The write an import would replace is: you finish a handover, and you attach it, once, standing on the app it belongs to.",
  commercials:
    "THERE IS NOTHING TO IMPORT INTO. The module carried three rate cards and now carries none: the agency's own two were retired on 10 Sep 2026 (\"kill the whole internal rates thing\") and the client-facing one an hour later (\"the whole account rates also killed it\"). What is left is a single READ — what an app gives back, priced — and an importer writes rows, so there is no create door here for a target to point at and no table for it to write. The argument that stood here while the card existed is worth keeping beside the absence, because it is the reason nobody should add one back casually: a rate card is a commercial agreement, a bulk overwrite silently changes what a client is charged with no conversation attached and no one row to point at afterwards, and the write it would replace is four fields typed once a year.",
}

/** R21 — the doors a CLIENT LOGIN can reach at the agency origin that neither
 * refuse them nor read a customer-owned module through the fence, each with the
 * reason that is fine.
 *
 * Only two shapes of reason belong here. **The door answers about the caller
 * themselves** (their own teams, their own rights, their own invitations), or
 * **the door carries a fence the check cannot see from the gate alone** — which
 * today means exactly one door, the activity feed, whose module is resolved from
 * the table being asked about rather than written at the gate.
 *
 * A door that answers about the AGENCY — its articles, its vocabulary, its
 * screens, its imports, its staff — does not belong on this list; it belongs
 * behind `refusePortalCaller`. If you are writing a new line here and the
 * sentence you want is "a client would never call it", stop: that is not a
 * reason, that is the assumption both leaks were built on.
 *
 * Enforced by web/test/rules.test.ts (`client-reachable-doors`), which also
 * fails on a line that no longer names a route — a rotting exemption is worse
 * than none, because it reads as a decision somebody made on purpose. */
export const CLIENT_REACHABLE_EXEMPT: Record<string, string> = {
  // GONE, both of them, and worth recording why the reasons READ so well.
  //
  // `POST /api/tenancy/bootstrap` said "it answers with the caller's OWN first
  // team". `GET /api/tenancy/teams` said "the caller's own membership list — the
  // teams THEY belong to, no id at all". Both sentences are true about the
  // QUESTION and say nothing about the ANSWER, which in both cases is a
  // `TeamSummary` row: the agency's name, its logo, and `dbStatus`. Two of the
  // five fields `/api/tenancy/active` had already been closed for, walking out of
  // its two siblings. Both doors now refuse a client login (routes/team.ts
  // refuseClientOnTeams) — which is why these lines are deleted rather than
  // reworded: an exemption is a claim about what is BEHIND a door, and "it is
  // about you" is not one.
  "GET /api/tenancy/my-permissions":
    "the caller's own rights, which they are entitled to know; it names no other person and no record",
  "GET /api/tenancy/invitations":
    "invitations addressed to the caller's own email address — theirs to see, and theirs alone (the lookup is by their identity, never by an id they pass)",
  "POST /api/tenancy/invitations/accept":
    "accepts an invitation addressed to the caller — ownership is re-checked inside acceptInvite against their own email, so the body can only name their own invitation or be refused",
  "GET /api/tenancy/activity":
    "its module gate is RESOLVED from the table being asked about (ACTIVITY_GATE_MAP), so no module is written at the door for the R21 scan to read — but the fence is there and it is the strictest one in the codebase: portalActivityClause answers `0 = 1` for every table PORTAL_ACTIVITY_FENCE does not mark account-owned, which is every table except the client's own company, its contacts and its logins. This is the door that leaked twice; the clause, its data table and the burglar suite in workers/tenancy/test/account-leak.test.ts are the three things holding it.",
}

/** THE ACCOUNT-SCOPED MODULES — the ones whose rows belong to a CUSTOMER, not to
 * the team at large. A caller pinned to one account (a portal user) must never
 * reach another account's rows through ANY door on these modules, whatever their
 * role says. DATA, not a hand-list in a test: every route gating on a module
 * named here is derived off disk and must have a burglar attacking it
 * (workers/tenancy/test/account-leak.test.ts), and a module added here with no
 * attack turns the build red. */
export const ACCOUNT_SCOPED_MODULES = ["accounts", "portal_users", "processes"] as const

/** EVERY read a CLIENT LOGIN can reach that returns rows belonging to someone —
 * file → the fence it must carry, or a reasoned exemption.
 *
 * Earned the hard way. The fence was applied door by door to the ACCOUNT doors,
 * and the first security sweep found three other doors that return account-owned
 * rows and never got it: the record activity feed, the team activity feed, and
 * the ticket list. The burglar suite could not have caught them, because it derived
 * its targets from the account routes — the very set that excluded them. The
 * lesson is the shape of this list: enumerate by WHAT A CLIENT CAN REACH, never
 * by what the account module happens to own.
 *
 * A file added here with `fence: null` must state why in `why`. A file that reads
 * one of these tables and is in neither state turns the build red.
 *
 * ENFORCED, at last, by web-portal/test/portal-fence.test.ts — and enforced at
 * FUNCTION level, not file level. This list sat here as data with no check for
 * its whole first life, which is how `help.ts` could be listed as fenced while
 * two of its exported readers (the ticket THREAD) carried no fence at all: the
 * file said "authorScope" and the leak was one function along. The check now
 * walks the portal gateway's own door table through to each lib function behind
 * it and demands that function touch the caller's stamp. */
export const PORTAL_VISIBLE_READS: Record<string, { fence: string | null; why: string }> = {
  "workers/tenancy/src/lib/accounts.ts": {
    fence: "accountScopeClause",
    why: "the spine itself — every exported reader takes the caller's AccountScope.",
  },
  "workers/tenancy/src/lib/activity-read.ts": {
    fence: "accountActivityClause",
    why: "history rows NAME records; the row id is not a secret (the live channel broadcasts it). WHICH fence each (table, id) read carries is decided by PORTAL_ACTIVITY_FENCE below — deciding it from the account module's own tables is what left `help` open.",
  },
  "workers/content/src/lib/help.ts": {
    fence: "ticketFence",
    why: "a client raises tickets; the team-wide default handed them every other client's — the thread doors, one table along, had to be taught the same sentence, and the door that RAISES a ticket answered with the whole list until the check learned that a POST can be a read. It is called ticketFence and no longer authorScope because it no longer fences by AUTHOR: the owner ruled on 11 Aug 2026 that a contact sees their COMPANY's questions, so the ticket carries the account it was raised for and this is accountScopeClause over that column — the same fence as the accounts list, reading a ticket.",
  },
  "workers/content/src/lib/help-attachments.ts": {
    fence: "attachmentFence",
    why: "the files and links on a ticket (CHECKLIST 5.10), and the fence is the TICKET's fence one table along — `attachmentFence` wraps `ticketFence` as a subquery so it rides the same WHERE as the rows AND the count, exactly as `threadFence` does for a reply. It has to be here rather than merely be safe by accident: an attachment is the one thing on a ticket a CLIENT uploads, so it is the one place where the rows a caller may read and the rows a caller may write are being decided about the same table from two directions.",
  },
  "workers/content/src/lib/help-ratings.ts": {
    fence: "getTicket",
    why: "how we did on one ticket, according to the person we did it for (team migration 0067). The fence is the TICKET's, resolved through the fenced `getTicket` before anything is read or written — a rating is a PROPERTY of a ticket, so whether the ticket is theirs to ask about is the only question, and it is already answered by one fenced read (the same shape `stakeholders.ts` stands on). A ticket outside the fence answers 404 rather than 403, so 'not yours' never confirms one exists. One NARROWING rides on top of it for a portal caller and it is in the STATEMENT rather than applied to the rows afterwards: a client is answered with their own rows and nobody else's, because a colleague's private '1 out of 3' is a personal statement and not a fact about the ticket the way a reply is. Staff read the whole set — being able to read what a client said is the entire reason the fact is stored.",
  },
  "workers/content/src/lib/notify.ts": {
    fence: null,
    why: "it sends email and returns no rows to the caller: the only ids it resolves are the ticket's own raiser (read through the fence) and the mentions the route already refused from a client login, and the lookup joins team_members so an address outside the team can never be reached.",
  },
  "workers/content/src/lib/stakeholders.ts": {
    fence: "getTicket",
    why: "a stakeholder set is a PROPERTY of a ticket, so the fenced getTicket decides visibility first and an invisible ticket yields an empty set — otherwise the door names staff admins and another client's colleagues by ticket id alone.",
  },
  "workers/content/src/lib/todos.ts": {
    fence: "accountScopeClause",
    why: "a to-do is the ONE row in the work engine a client login both reads and writes, so this is the only file in that build carrying a fence rather than a flat refusal. Every exported reader takes the caller's AccountScope and every statement — including the completing UPDATE, which a source-scan case in workers/content/test/todos-tasks.test.ts holds there — ANDs it in. `clientSprints` lives here for the same reason: it is the client's own SHAPE of a sprint (a named block with dates and two counts), with nowhere to put a price and no story titles in it, so a shape that cannot carry the number is doing half the fencing.",
  },
  "workers/tenancy/src/lib/work-engine.ts": {
    fence: null,
    why: "it returns no rows — two aggregate SUMs (what has been sold to one account, and how many seconds we have logged against it) over the work engine's own tables, for an account id the CALLER has already resolved through the fence before calling. A SUM discloses no record, and the one figure a client may be shown from it (what they bought) is projected by the value door behind their own account's price-visibility switch — which, since the rate card was retired on 10 Sep 2026, is the ONLY thing that switch still governs. The seconds half never reaches a client at all: no door hands it to one, and the rate that used to make it meaningful (what an hour cost US) was retired the same day.",
  },
  "workers/tenancy/src/lib/processes.ts": {
    fence: "accountScopeClause",
    why: "the whole App → Process → Step chain, and the value drilled through it. Every table here carries `account_id` so the fence is the SAME clause the accounts list uses, with no join to forget — and every exported reader takes the caller's AccountScope, which the burglar suite (workers/tenancy/test/account-leak.test.ts) then tries the handle of. A map names how a client's own people work; another client's map is as far out of bounds as their account row.",
  },
  "workers/content/src/lib/deliverables-client.ts": {
    fence: "accountScopeClause",
    why: "what we handed over, as the CLIENT sees it. A file of its own, holding nothing else: the staff readers live in `deliverables.ts` and are reachable from no portal door, because this list is keyed by FILE and the one time it described a file rather than a function (`help.ts`) the leak was one function along. Two fences ride one clause here and neither is optional — `accountScopeClause` on the account the write copied off the app, AND `visible_to_client_at IS NOT NULL`, the owner's 18 Aug 2026 ruling that a deliverable is the client's only once somebody marks it so. A row on the right account that nobody shared is as absent as one belonging to somebody else, and the COUNT is taken over the same clause so the heading cannot advertise material the list withholds.",
  },
}

/** EVERY WRITE a CLIENT LOGIN can reach — door → the fence its HANDLER resolves
 * before it changes anything, or a reasoned exemption.
 *
 * The reads above were guarded first, and thoroughly. The writes were not: the
 * fence walk started `if (!door.startsWith("GET ")) continue`, and the closed-
 * door suite only ever proves that an UNNAMED door is refused. Between them,
 * adding `"POST /api/tenancy/accounts"` to the portal gateway's allow-list
 * turned the build green — one line, and a client could edit the agency's books.
 *
 * A write is fenced in a different PLACE from a read, which is why this is its
 * own table. A read carries the fence down into the SQL (`accountScopeClause`);
 * a write resolves the caller's AccountScope in the handler and refuses the
 * record — 404, never 403 — before a row is touched. So the check walks the
 * handler body, not the lib functions.
 *
 * Every non-GET door in PORTAL_DOORS must appear here, with a fence or a stated
 * reason. That is the point: opening a write to clients cannot be one line in a
 * routing table any more. It is a line here too, and someone has to write down
 * why it is safe.
 *
 * Enforced by web-portal/test/portal-fence.test.ts. */
export const PORTAL_VISIBLE_WRITES: Record<string, { fence: string | null; why: string }> = {
  // ── identity: nothing to fence, because nothing is owned yet ────────────────
  "POST /api/auth/email/start": {
    fence: null,
    why: "asks for a code to be emailed. It touches no account-owned row, and it answers the same way whoever the address belongs to — an account fence here would be an account oracle.",
  },
  "POST /api/auth/email/verify": {
    fence: null,
    why: "proves WHO the caller is; the account set they may stand in is resolved afterwards, from the invite, never from this body. Signing in never creates access (SCOPE ch.06).",
  },
  "POST /api/auth/profile": {
    fence: null,
    why: "writes the caller's own name and photo on the GLOBAL user row — their own record, reached through no id but their session's.",
  },
  "POST /api/auth/language": {
    fence: null,
    why: "writes ONE column on the caller's own global user row — which language they read kwapso in — reached through no id but their session's, exactly as the profile door above. There is no account in the question at all: a language is a fact about a reader, not about a company, so there is no fence for it to resolve and nothing another account could learn from it. The value it accepts is one of four the code declares (shared/i18n.ts), so the body cannot carry a surprise either.",
  },
  "POST /api/auth/logout": {
    fence: null,
    why: "ends the caller's own session; there is no record to be fenced from.",
  },

  // ── showing us what they mean, and saying yes ──────────────────────────────
  "POST /api/content/help/attachments": {
    fence: "callerScope",
    why: "a client attaches the screenshot of the thing that is wrong (CHECKLIST 5.10). The ticket is resolved through `getTicket` under the caller's own scope BEFORE a byte is stored — bytes in a bucket cannot be un-put — and a miss answers 404 rather than 403, so 'not yours' never confirms the ticket exists. The file lands under a ULID key in the shared media bucket, which is a capability URL: unguessable, and the fence is what decides who is ever told it.",
  },
  "POST /api/content/help/attachments/remove": {
    fence: "callerScope",
    why: "the same door in reverse, and the same resolution first. Deactivate-never-delete: the row keeps its audit block and the object stays in the bucket, so taking a file off is reversible in the only sense that matters — nothing is destroyed.",
  },

  "POST /api/content/help/rating": {
    fence: "callerScope",
    why: "the client says how we did (the owner, 6 Sep 2026: 'let's store sentiment (1-3) on the portal for how did we do it to see if client is happy'). The account the row is judged against comes from the guard corridor through `callerScope` and never from the body, and the ticket named by a caller-supplied id is resolved through the fenced `getTicket` before a row is written — a miss is a 404, so 'not yours' never confirms the ticket exists. TWO more rules ride the same door and neither is on the screen: it refuses anything that is not `resolved`, because 'how did we do' is a question in the past tense about work that is finished and asking it mid-flight measures impatience into the same column; and it INSERTs, never UPDATEs, so a later change of mind is a new row and the record of how we did at the time survives it. Gated on `help:read` rather than `help:edit` for the same reason the validate door is: `help:edit` is a right the seeded Client role does not hold, and a rating moves no status and edits nothing.",
  },

  // ── the client's own world ─────────────────────────────────────────────────
  "POST /api/tenancy/portal/switch-account": {
    fence: "accountScope",
    why: "flips the caller's OWN current-account pointer. The set they may stand in comes from the guard corridor, so the only thing the body can do is name one of their own companies or be refused.",
  },

  // ── support ────────────────────────────────────────────────────────────────
  "POST /api/content/help": {
    fence: null,
    why: "raises a NEW ticket. There is no existing record to be fenced away from — but the row it writes is stamped with the account the caller is STANDING IN, taken from the guard corridor and never from the body, because that stamp is what every later read of it is fenced by (and what a live ping names so their colleagues, and only their colleagues, hear it appear).",
  },
  "POST /api/content/help/reply": {
    fence: "accountScope",
    why: "appends to a ticket named by a caller-supplied id — so the fence decides whose ticket it is BEFORE a word is appended, and answers 404 rather than 403 so 'not yours' never confirms the ticket exists. A reply cannot be un-appended.",
  },

  "POST /api/content/help/update": {
    fence: "accountScope",
    why: "corrects a ticket named by a caller-supplied id — so the fence decides whose it is BEFORE a word changes, and two more rules ride the same UPDATE: it must still be UNLOCKED (nobody here has read it) and it must be THEIRS, because a contact now sees a colleague's question and being allowed to read one is not being allowed to rewrite it. SCOPE ch.07: the account owns the wording until the first staff touch.",
  },
  "POST /api/content/help/rank": {
    fence: "accountScope",
    why: "drags one of their company's requests into the order they want them in — SCOPE ch.07's 'a client may re-rank their own company's tickets'. Both NEIGHBOUR ids are resolved through the same fence, so a client cannot pin their ticket next to one they cannot see (which would be an oracle for whether an id exists, and a way to learn another company's ordering); and the LOCK rides the UPDATE, so the order stops being theirs the moment we pick it up. The right this needs — `help:edit` — is the reason the STATUS and ARCHIVE doors now refuse a portal caller outright: the same grant would otherwise have let a contact resolve their own request.",
  },
  "POST /api/content/todos/complete": {
    fence: "accountScope",
    why: "the client's own act, on a row we created and named their company on: they mark it done and attach the one file we asked for. The fence decides whose to-do it is before anything is written and answers 404 rather than 403, so 'not yours' never confirms it exists. The file is capped and parsed at the boundary through the same seam every upload in the base uses, and its key carries a random ULID segment because the gateways serve /media with no session.",
  },

  // ── the process map ────────────────────────────────────────────────────────
  "POST /api/tenancy/processes/comments": {
    fence: "accountScope",
    why: "comments on a map named by a caller-supplied id — so the fence decides whose map it is BEFORE a word is appended, and answers 404 rather than 403 so 'not yours' never confirms the map exists. It is the ONLY write in the process-map build a client login can reach: a comment is a conversation, never an edit, so it changes no duration, cuts no version and moves no savings figure. The one field that WOULD change what the portal shows — `explainsStepKey`, the staff explanation a regression must carry — is refused from a portal caller at the door.",
  },
}

/** THE ACTIVITY FEED'S OWN FENCE — for every table it will answer about, what a
 * CLIENT LOGIN may read of that table's history.
 *
 * Earned TWICE, the same way. The record scope reads history by (table, id) with
 * nothing on the WHERE but two caller-supplied values, so the fence has to be
 * decided by the TABLE. The first time, the deciding list was
 * `ACCOUNT_OWNED_TABLES` — what the accounts module owns — and `help` is not in
 * it, so a client login read another client's support history (the activity
 * sentence plus its before/after snippets) by naming a ticket id. Row ids are
 * not secret: the live channel broadcasts them.
 *
 * So the list is no longer "what the accounts module owns". It is EVERY table
 * the feed can be asked about, each with an answer:
 *   • "account" — fenced to the caller's own account world (accountActivityClause);
 *   • null      — a client login reads NOTHING of this table's history, and the
 *                 reason says why. That is the DEFAULT posture, not a gap: the
 *                 portal ships no activity feed at all (PORTAL_ACTIVITY_EXEMPT),
 *                 and silence is the same direction mayHearChange fails in.
 *
 * A table the feed can be asked about (ACTIVITY_GATE_MAP + the fixed-scope
 * aliases the reader names) that is missing here turns the build RED —
 * workers/tenancy/test/account-leak.test.ts. Adding a module to the gate map
 * without deciding this is exactly how `help` slipped through. */
export const PORTAL_ACTIVITY_FENCE: Record<string, { fence: "account" | null; why: string }> = {
  accounts: { fence: "account", why: "the row IS an account — theirs to read inside the fence" },
  account_links: { fence: "account", why: "a contact on an account they may stand in" },
  portal_users: { fence: "account", why: "a login granted on an account they may stand in" },
  help: {
    fence: null,
    why: "a ticket's history names the staff who moved it and quotes the problem statement — the client is shown the STATUS instead (PORTAL_ACTIVITY_EXEMPT says the same thing about the screen). THE LEAK: help sat outside the deciding list, so another client's support history came back by ticket id. STILL null after the 11 Aug 2026 widening: a contact now sees their whole company's TICKETS, which is a decision about the rows; their HISTORY is a different question, and its answer is the one SCOPE ch.06 gives — the portal never says which staff member is doing the work.",
  },
  knowledge_sources: {
    fence: null,
    why: "the knowledge base is the agency's own material — its process notes, its internal tickets, what it knows about each client — and a client login cannot reach a single door on it (every knowledge handler opens with refusePortalCaller). Its HISTORY would name what was filed under whom, which is a worse disclosure than the sources themselves: 'X filed \"the Delaval renewal\" under Delaval' tells a reader at another company that Delaval is a client. Silence, in the same fail-closed direction as everything else here.",
  },
  selectable_data: { fence: null, why: "the agency's dropdown vocabulary — app furniture, and none of it is the client's" },
  users: { fence: null, why: "a member's joins, role changes and removals — the agency's staff, never a client's business" },
  member_roles: { fence: null, why: "the agency's permission structure — knowing its shape helps only an attacker" },
  invite_logs: { fence: null, why: "who the agency invited and when — the agency's own hiring, by another name" },

  // THE PROCESS MAP'S SEVEN TABLES. The ROWS are the client's — a contact reads
  // their company's maps and the value drilled through them, fenced by
  // accountScopeClause on every statement. Their HISTORY is a different question,
  // and it has the answer SCOPE ch.06 gives every other feed on this side: the
  // portal shows work status and never which staff member is doing it. An
  // activity row here would say "Ana changed 'Approve the invoice' from 40
  // minutes to 8" — the client's own number, with our name on it, and the portal
  // ships no activity feed at all to put it in (PORTAL_ACTIVITY_EXEMPT).
  apps: { fence: null, why: "an app's history names the staff who recorded it and quotes what it costs US to run — the client sees the system, never our ledger about it" },
  processes: { fence: null, why: "a map's history names the staff who mapped and re-mapped it; the client is shown the map itself, which is the part that is theirs" },
  process_drafts: {
    fence: null,
    why: "a proposal is our own working — what a call suggested and what a person accepted or threw away. The client sees the map that resulted, never the eleven things a model guessed at. Every draft door refuses a portal caller outright; this is the second lock.",
  },
  waves: {
    fence: null,
    why: "a wave is what a client BOUGHT, and its history is our own selling and planning of it — who added which sprint, when the dates moved, what we switched off. The client sees the wave's name and its dates on their portal, which is the part that is theirs; the sentences about how it got that way are ours. Every wave door refuses a portal caller outright for the same reason (the module is `work`), so this fence is the second lock rather than the first.",
  },
  app_modules: { fence: null, why: "who renamed a section of their app, and when, is our record of our own work — the client picks the module on a ticket and never needs the history of how it got its name" },
  process_versions: { fence: null, why: "a cut names the staff member who cut it and the sprint it came from — the client sees the version and its date" },
  process_steps: { fence: null, why: "a step's history is our record of changing THEIR agreed number; the current number, and the saving from it, is what the portal shows" },
  process_comments: { fence: null, why: "the conversation itself is fenced and readable; its history would name the staff author of every line, which the ticket thread already withholds" },
  // THE CLIENT'S OWN ORGANISATION — departments, roles and tools. `null`, for
  // the same reason as the six above and one of its own.
  //
  // The ROWS are theirs and the portal shows them (the owner ticked all four in
  // round two: departments, the people against each role, their tools and what
  // those cost). Their HISTORY is our record of OUR work on their company, and
  // every line of it names a staff member — "Ana added the role Dispatch clerk",
  // "Ana switched a tool off" — which is exactly the sentence SCOPE ch.06 says
  // the portal never shows, and which the owner said again himself on 24 Aug
  // 2026: "Never show our staff names to the customer! We are all kwapso."
  //
  // The one of its own: a role's history carries WHAT AN HOUR COSTS THEM, and
  // those costs sit side by side across a company. Alaap's ruling on the rate
  // being visible turned on precisely that — "everybody who is a stakeholder
  // from the client side can see all the costs. They could just get to know each
  // other's salary… so it's not advisable." A feed of rate changes is that
  // disclosure with a timeline attached.
  client_departments: { fence: null, why: "our record of shaping their org chart — every line names the staff member who typed it, and the departments themselves are readable in the portal" },
  client_roles: { fence: null, why: "a role's history carries what an hour costs them, and those costs sit side by side across one company: a stakeholder reading the feed learns their colleagues' rates. The role and its people are shown; the trail of who set which number is not" },
  client_tools: { fence: null, why: "a tool's price history is our working note about their spend — the tool and its current price are shown, the record of us revising it is ours" },
  // WHAT WE HANDED OVER. `null` — and THE DAY THIS LINE ANTICIPATED HAS COME, so
  // it is worth saying what changed and what did not.
  //
  // It used to lean on the module's own doors: every deliverables handler opened
  // with refusePortalCaller, so a client reached no row here to have a history
  // of. That is no longer true. On 18 August 2026 the owner opened the shelf —
  // "the deliverables are for them! but only once we mark it as visible" — and a
  // client can now read their own company's SHARED rows through
  // `GET /api/content/portal/deliverables`.
  //
  // The old note ended: "If the shelf is ever opened to the portal, the ROWS are
  // the decision; this line is a separate one and stays `null` unless somebody
  // argues it down." Nobody has. The ROWS being theirs was never the argument for
  // showing them our record of CHANGING those rows: a history line reads "Ana
  // handed over the dispatch walkthrough" and then "Ana archived it", which names
  // the staff member doing the work (SCOPE ch.06) and shows the client us
  // changing our minds about what we gave them. Opening the shelf made this line
  // load-bearing rather than moot, which is a reason to keep it, not to soften it.
  deliverables: { fence: null, why: "a deliverable's history names the staff who filed, corrected, shared and archived it — the client is shown the material itself, which is the part that is theirs, and never our record of changing it (SCOPE ch.06). The rows ARE now reachable by a client login (the portal shelf, account-fenced and shared-only), which is what makes this line real rather than moot: `null` here is the difference between handing somebody a document and handing them our file about deciding to" },

  // THE WORK ENGINE. Not "a client may not see enough of this" — a client may
  // not see ANY of it, and the rows themselves are already refused at every door
  // (routes/stories.ts opens with refusePortalCaller). A story's history says
  // "Ana moved BERG-S0188 to in review", which is the staff member SCOPE ch.06
  // says the portal never names, attached to the work they are doing. What a
  // client sees of a story is a COUNT on their own ticket.
  stories: { fence: null, why: "a story's history names the staff member doing the work and what they were asked to change — the client sees a count of the work on their own request, never a title, an assignee or a date" },
  triage_duty: { fence: null, why: "the agency's own rota. Its rows say who was meant to be reading the client's questions in a given week, which is both a fact about our staff and a record of when we were slow — the two things SCOPE ch.06 and BUILD-1 §6 respectively keep off the client's side" },
  tasks: { fence: null, why: "our own internal admin — the quarterly VAT return, a domain renewal. A client login cannot reach a single door on the table, let alone its history" },
  todos: {
    fence: null,
    why: "a to-do's ROWS are the client's — they read theirs and complete them, fenced by accountScopeClause on every statement — but its HISTORY is ours: it names the staff member who asked for the thing and the one who withdrew it, which is the sentence SCOPE ch.06 keeps off the portal. The client is shown the to-do, its date and whether it is done, which is the part that is theirs; the portal ships no activity feed to put the rest in (PORTAL_ACTIVITY_EXEMPT).",
  },
  work_logs: { fence: null, why: "how long one of our people took over a piece of work, and who corrected the figure afterwards. It is the input to the agency's own margin, and the hours behind a price are never the client's to read — they see the VALUE the work produced (the savings drilled through their process map) and not what it cost us to produce it" },
  sprints: { fence: null, why: "a sprint's history names who priced it and what the price was before. The client is shown the sprint as a NAMED BLOCK WITH DATES because it is what they bought (BUILD-1 §7); the record of us changing our minds about it is ours" },
  // THE AGENCY'S OWN HOUSEKEEPING — four tables, one answer, and they are the
  // EASIEST entries in this table rather than the hardest. Everywhere else here
  // the question is genuinely difficult ("the rows are theirs but the history
  // names us"). Not here: the ROWS are not theirs either. A client login cannot
  // reach a single door on any of these three modules (every handler opens with
  // refusePortalCaller), so `null` is not a withholding — it is the same
  // sentence the door already said, repeated where the feed can hear it.
  brand_assets: { fence: null, why: "the agency's own brand material and who changed it — a client sees the work, never our library" },
  meeting_purposes: { fence: null, why: "why the agency meets and which department owns it — a description of our own organisation" },
  staff_profiles: { fence: null, why: "what a colleague is like and what they are bad at. The sharpest case of agency-only material in the app, and its HISTORY names both the subject and the person who wrote it down" },
  staff_certificates: { fence: null, why: "what our people are qualified in, and when a qualification was corrected — the agency's own credential register" },

  // MEETINGS. `null`, and it is the same sentence the module's doors already
  // speak: every meetings handler opens with refusePortalCaller, because the
  // NOTES are our record of a conversation — written for us, often ABOUT the
  // client rather than for them ("they are unhappy with the dispatch screen and
  // hinted at the renewal"). A history feed would say who wrote them and when
  // they were changed, which is a sharper disclosure than the meeting itself.
  meetings: { fence: null, why: "a meeting's history names the staff who arranged it and rewrote its notes — and the notes are the agency's own record of a conversation, often about the client rather than for them. A client login reaches no door on this module at all (every handler opens with refusePortalCaller), so silence here is the door's own sentence repeated where the feed can hear it" },

  // GOOGLE. `null` twice, and neither is a hard call: a client login cannot
  // reach a single door on this module (every handler opens with
  // refusePortalCaller — the clients get no assistant and no Google surface at
  // all), so silence here is the door's own sentence repeated where the feed can
  // hear it. The history is also the sharpest disclosure in the build if it ever
  // leaked: it names a colleague's own Google address, which folders of the
  // agency's Drive they opened to the assistant, and every time we sent mail or
  // booked something as them.
  google_connections: { fence: null, why: "a staff member's own Google account, and every act kwapso performed as them — whose mailbox, whose calendar, and when. Agency material about an agency person; a client has no door on it and no business in its history" },
  google_sources: { fence: null, why: "which of our own Drive folders and Chat spaces somebody opened to the assistant. Naming them would describe the shape of the agency's internal filing to an outsider, which is the same disclosure the knowledge base's own history is withheld for" },
}

/** R2 on the CLIENT surface — the reasoned exemption, not a quiet skip.
 *
 * Every record detail in the base exposes Overview + Activity (R2), because a
 * record's history is the thing that makes a shared workspace trustworthy. On
 * the portal that same feed is a disclosure: its rows are sentences like
 * "<name> moved this to in progress", and "the portal shows work status but
 * never which staff member is doing it" (SCOPE ch.06). The activity door is not
 * on the portal gateway's surface at all, so this is not a hidden tab — it is a
 * door that was never opened.
 *
 * Component → why it ships no Activity feed. Held true by
 * web-portal/test/rules.test.ts, which fails if a listed component grows one (an
 * exemption nobody checks is a skip with better manners) AND if a component is
 * listed here that no longer exists. */
export const PORTAL_ACTIVITY_EXEMPT: Record<string, string> = {
  "ticket-screen":
    "a ticket's history names the staff who moved it; the client is shown the STATUS instead, which is the part that is theirs to know",
  "company-screen":
    "an account's history names the staff who edited the record and shows the agency's own before/after values (status moves, commercial flags) — none of which is the client's to read",
}

/** R18 — which permission module gates each activity `relatedTable` a worker
 * writes. The team feed (the ONE cross-module read) subtracts the caller's denied
 * modules through this map; the generic record scope resolves through it too. A
 * table a worker writes that is neither here nor exempt turns the build red —
 * a table the feed cannot NAME is a table it cannot withhold. */
export const ACTIVITY_GATE_MAP: Record<string, string> = {
  // TWO TABLES LEFT THIS MAP ON 10 SEP 2026 — `internal_rates` and
  // `internal_role_rates`, the agency's own two cost cards, both on
  // `commercials`. The client retired them whole ("kill the whole internal rates
  // thing"), so no worker writes activity against either any more and a line for
  // a table nothing writes is a line the census would call rot. Their history
  // rows survive in `activity`; the tables they name do not.
  help: "help",
  selectable_data: "selectable_data",
  member_roles: "member_roles",
  users: "team_members",
  invite_logs: "team_members",
  accounts: "accounts",
  // WHO IS LINKED TO WHOM is the contacts module's own history, not the
  // account's. A role that may see a client but not its address book must not
  // read "Ana linked Marta to Bergman" out of the feed either — the sentence
  // names the person the right exists to withhold.
  account_links: "contacts",
  portal_users: "portal_users",
  knowledge_sources: "knowledge",
  // The map and the money. Five tables gate on `processes` because they are one
  // record from a reader's point of view — an app with maps inside it — and two
  // on `commercials`, which is the module a client login never holds.
  apps: "processes",
  // A MODULE is part of the app record, so it is read by whoever may read the
  // app — the same right, because "what sections does their system have" and
  // "what systems do they have" are one question asked at two depths.
  app_modules: "processes",
  processes: "processes",
  process_versions: "processes",
  process_steps: "processes",
  process_comments: "processes",
  // A PROPOSAL ABOUT A MAP is read by whoever may read the map. "Ana had a call
  // read for Bergman invoice approval: 11 steps proposed, none applied" is a
  // sentence about the process, and a role that may not see the process must not
  // read it out of the feed either.
  process_drafts: "processes",
  // THE CLIENT'S OWN ORGANISATION — who does the work, and what they use to do
  // it. Same module as the map, because that is the only reason any of it
  // exists: a role carries an hourly cost so a step's minutes can become money,
  // and a tool carries a price so a step that replaces it can be subtracted. A
  // person who may read a client's process map is exactly the person who may
  // read "Ana added the role Dispatch clerk" — the sentence is about the map.
  //
  // THE COST ITSELF IS A DIFFERENT QUESTION: what an hour costs the CLIENT is
  // theirs and rides with the map. What an hour cost US was `internal_rates`, on
  // `commercials`, which a client login never holds — retired on 10 Sep 2026
  // with the rest of the internal rates.
  // A WAVE is the package a client's sprints were sold inside — the same record
  // from a reader's point of view, so the same module. A client login holds
  // neither.
  waves: "work",
  client_departments: "processes",
  client_roles: "processes",
  client_tools: "processes",
  // WHAT WE HANDED OVER on an app. Its OWN module and not `processes`, which is
  // the whole point of it being a module: "Ana handed over the Payroll API
  // reference" names a deliverable, and a role that may read the app but not its
  // handover shelf must not read that sentence out of the feed either.
  deliverables: "deliverables",
  // Time gates on the same module as the work it is against — a row of hours is
  // not a separate kind of record from the story it belongs to, it is that
  // story's cost. A client login holds neither.
  work_logs: "work",
  // A TASK is our own admin, so it gates with the rest of the work engine. A
  // TO-DO is aimed at a client and is the one module in this build a client login
  // is meant to hold — so it gates on its own.
  tasks: "work",
  todos: "todos",
  // The rota is about TICKETS — whose week it is to read them — so its history
  // gates with the module the tickets themselves do.
  triage_duty: "help",
  // The work engine. A story and the sprint it sits in are one record from a
  // reader's point of view — a piece of work and the block it was sold inside —
  // so both gate on `work`, the module a client login never holds.
  stories: "work",
  sprints: "work",
  // A meeting gates on its OWN module — see shared/team-modules.ts for why the
  // notes are the thing being permissioned, and why `delivery` (the taxonomy of
  // why we meet) is not the same question.
  meetings: "meetings",
  // THE AGENCY'S OWN HOUSEKEEPING. Four tables, three modules — grouped the way
  // a reader meets them: two gate on `staff_profiles` because a person's profile
  // and their certificates are one record from the member page's point of view.
  brand_assets: "brand_assets",
  meeting_purposes: "delivery",
  staff_profiles: "staff_profiles",
  staff_certificates: "staff_profiles",
  // GOOGLE. Both tables gate on `google` — one connection and the folders and
  // spaces under it are one record from a reader's point of view, exactly as an
  // app and its maps are. The ACT module (google_mail) owns no table: it is a
  // switch, and what it permits is written into the connection's own history, so
  // a person reading "kwapso sent mail as Ana" needs the same right that lets
  // them see Ana has a connection at all.
  google_connections: "google",
  google_sources: "google",
}

/** R15 — reviewed DEAF exemptions: resources a worker publishes that reach NO
 * listener, each with its reason. Publishing to nobody is the silent half of the
 * stale-screen bug, so every exemption is a visible, conscious line. */
/** R14 — the GROWING collections: the ones that get bigger with ordinary use, so
 * a hard cap would eventually become a refusal to answer. Each must PAGE through
 * shared/workers/paging.ts (keyset cursor + exact total + hasMore) AND be reachable
 * past page one from the client. Every OTHER list may still cap — a bounded
 * collection (roles, members, dropdown values) doesn't need a cursor to be honest.
 * DATA, not a hand-list in a test: adding a growing module means adding a line here. */
export const GROWING_COLLECTIONS: Record<
  string,
  {
    lib: string
    fn: string
    routes: string
    rowsKey: string
    webKey: string
    listRecipe?: string
    /** WHERE PAGE TWO IS REACHED — the component holding THIS collection's own
     * `<LoadMore>`, relative to `web/`, and the string that must appear inside
     * that control's own props.
     *
     * Per-ENTRY because the check over it used to be per-BRANCH, and one branch
     * stood for three collections. It keyed on `!c.listRecipe`, which is true of
     * `recordActivity`, `activity` AND `workLogs`, and then asserted a
     * `<LoadMore listKey={activity.listKey}>` inside `activity-panel.tsx` — the
     * record feed's control, and nothing whatever to do with the team feed or the
     * work-log list. For those two the conjunct was a CONSTANT: deleting their
     * pagers outright left the build green, where the older, weaker-looking
     * sentence it replaced had gone red.
     *
     * `pagerKey` is usually the same string as `webKey`. On the record feed it is
     * not — that control reads `listKey={activity.listKey}`, a value the hook
     * hands it — and that difference is the reason this is named here rather than
     * inferred: the two halves of that pairing live in two files by construction,
     * so each has to be pointed at. */
    pagerFile: string
    pagerKey: string
    /** THE THIRD LINK, and only where the chain genuinely has three — 7 Sep 2026.
     *
     * `pagerKey` names the value the pager is handed. Usually that value is the
     * cache key itself, written in the pager's own file, and two links are the
     * whole chain. The TEAM feed stopped being two links today: its door moved
     * out of a tab and into the footer's `All activity ·` rail, so
     * `module-content.tsx` now hands the rail an `activityKey` VARIABLE that
     * `web/lib/use-screen-data.ts` composed — the literal `activity:team:` is
     * no longer written in the file that renders the pager.
     *
     * Naming this file is what stops the pin weakening into "some variable
     * reached the rail". With it, the check still walks the whole way: the
     * literal key is composed HERE, that variable reaches the pager THERE, and
     * neither half can be satisfied alone. Absent, a collection is the ordinary
     * two-link kind and nothing extra is asked of it. */
    keyBuiltIn?: string
    why: string
  }
> = {
  help: {
    lib: "workers/content/src/lib/help.ts",
    fn: "listTickets",
    routes: "workers/content/src/routes/help.ts",
    rowsKey: "tickets",
    listRecipe: "tickets.list",
    webKey: "helpKey(",
    pagerFile: "components/tickets/tickets-collection.tsx",
    pagerKey: "helpKey(",
    why: "tickets accumulate forever — a team that has raised 3,000 must still reach the oldest",
  },
  knowledge: {
    lib: "workers/content/src/lib/knowledge.ts",
    fn: "listSources",
    routes: "workers/content/src/routes/knowledge.ts",
    rowsKey: "sources",
    listRecipe: "knowledge.list",
    webKey: "knowledgeKey(",
    pagerFile: "components/deep-link/collection-content.tsx",
    pagerKey: "knowledgeKey(",
    why: "one source per ticket, per article, per account, plus every note anybody writes — the agency's own history is thousands of rows on day one and the sweep only ever adds",
  },
  accounts: {
    lib: "workers/tenancy/src/lib/accounts.ts",
    fn: "listAccounts",
    routes: "workers/tenancy/src/routes/accounts.ts",
    rowsKey: "accounts",
    listRecipe: "accounts.list",
    webKey: "accountsKey(",
    pagerFile: "components/deep-link/collection-content.tsx",
    pagerKey: "accountsKey(",
    why: "every company AND every person an agency works with is a row here — a contact list that only grows, so a ceiling would eventually become a refusal to answer",
  },
  activity: {
    lib: "workers/tenancy/src/lib/activity-read.ts",
    fn: "getActivity",
    routes: "workers/tenancy/src/routes/team.ts",
    rowsKey: "activity",
    webKey: "activity:team:",
    pagerFile: "components/deep-link/module-content.tsx",
    /* THE PAGER IS INSIDE THE RAIL NOW, so this names the value handed to it
       rather than the literal key, and `keyBuiltIn` below names where that
       literal still lives. The client retired the Activity tab on 7 Sep 2026
       ("kill all old activity tabs") and the feed moved into the slide-in the
       footer's Latest activity door opens — `<ActivityRail>`, which mounts the
       same `<ActivityPanel>` and therefore the same `<LoadMore>`. The substance
       of this line never changed: page two of the team's history is reachable.
       What changed is which file writes the key, which is why the pin grew a
       third link instead of simply moving. */
    pagerKey: "activityKey",
    keyBuiltIn: "web/lib/use-screen-data.ts",
    why: "the fastest-growing table in the base — EVERY mutation writes a row",
  },
  // The SAME door and the SAME rows, read through the generic (table, id) scope —
  // listed separately because "the server pages" and "the client can reach page
  // two" are different facts, and this half was the one missing: every record
  // detail badged the exact total (R16) over a feed frozen at its newest 50.
  recordActivity: {
    lib: "workers/tenancy/src/lib/activity-read.ts",
    fn: "getActivity",
    routes: "workers/tenancy/src/routes/team.ts",
    rowsKey: "activity",
    webKey: "useRecordActivity(",
    pagerFile: "components/records/activity-panel.tsx",
    pagerKey: "activity.listKey",
    why: "one record's slice of the same ever-growing feed — a long-running ticket outgrows a page on its own",
  },
  processes: {
    lib: "workers/tenancy/src/lib/processes.ts",
    fn: "listProcesses",
    routes: "workers/tenancy/src/routes/processes.ts",
    rowsKey: "processes",
    listRecipe: "processes.list",
    webKey: "processesKey(",
    pagerFile: "components/process/processes-screen.tsx",
    pagerKey: "processesKey(",
    why: "every app of every client grows maps, and every map is kept rather than replaced — a process is archived, never deleted, because the savings computed from its baseline have to stay checkable years later. An agency two years in has more of these than it has clients, and the oldest is the one a client is most likely to ask about",
  },
  workLogs: {
    lib: "workers/content/src/lib/work-logs.ts",
    fn: "listWorkLogs",
    routes: "workers/content/src/routes/work-logs.ts",
    rowsKey: "logs",
    webKey: "workLogsKey(",
    pagerFile: "components/work/time-panel.tsx",
    pagerKey: "workLogsKey(",
    why: "the fastest-growing row in the work engine — 2,940 arrived from two years of the previous system and the rate only goes up, because every piece of work produces several. A ceiling here would eventually be a refusal to show somebody their own week",
  },
  meetings: {
    lib: "workers/content/src/lib/meetings.ts",
    fn: "listMeetings",
    routes: "workers/content/src/routes/meetings.ts",
    rowsKey: "meetings",
    listRecipe: "meetings.list",
    webKey: "meetingsKey(",
    pagerFile: "components/meetings/meetings-screen.tsx",
    pagerKey: "meetingsKey(",
    why: "an EVENT, which is the shape this law names first: a meeting happens, is written up and is never curated away, because a cancelled call in March is still the answer to 'didn't we speak in March?'. Glide's own two years are 350 rows before this app has held a single conversation of its own, and the oldest is the one somebody digs for",
  },
  tasks: {
    lib: "workers/content/src/lib/tasks.ts",
    fn: "listTasks",
    routes: "workers/content/src/routes/todos.ts",
    rowsKey: "tasks",
    webKey: "tasksKey(",
    pagerFile: "components/work/tasks-screen.tsx",
    pagerKey: "tasksKey(",
    why: "the SAME mistake the to-do below made, in the file next door, and it survived the round that caught that one. `listTasks` carried a hard cap on the reasoning that admin 'shrinks as fast as it grows because the done ones fall out of the default view' — true of the default view, and false of three of the six this door offers: `completed` asks for exactly the rows that fall out, `all` asks for every row there has ever been, and `calendar` asks for every dated one. On those three a thousand rows was a list with an invisible end, under a badge (R16) reporting the true number, so the screen said 'at least a million' above a list of a thousand and offered no way to reach the rest. Not caught by anything, because GROWING_COLLECTIONS is DATA: a growing collection nobody adds is never asked to page, which is the one shape this law cannot detect for itself. The four-key priority sort is folded into one lexicographic string (TASK_SORTS) because a cursor names a position and a position in a four-key order needs all four keys in it",
  },
  todos: {
    lib: "workers/content/src/lib/todos.ts",
    fn: "listTodos",
    routes: "workers/content/src/routes/todos.ts",
    rowsKey: "todos",
    webKey: "todosKey(",
    pagerFile: "components/work/work-panels.tsx",
    pagerKey: "todosListKey(",
    why: "a to-do SHRINKS as fast as it grows while it is open, which is why this collection was capped for a year — and the moment the DONE pile is visible it stops being true, because a completed to-do is kept for ever. It has to be visible: `completeTodo` writes `file_url` and `completed_at` in the SAME UPDATE, so a to-do carries the document a client sent us if and ONLY if it is completed, and the open-only default meant the only rows that could hold a client's file were exactly the rows nobody could see, on either front door. NOT one list with both piles in it: the two views sort by different columns (due date ascending; completed descending), so each is its own ordering with its own cursor signature, and a cursor minted under one is refused by the other rather than silently skipping rows at the page boundary",
  },
  stories: {
    lib: "workers/content/src/lib/stories.ts",
    fn: "listStories",
    routes: "workers/content/src/routes/stories.ts",
    rowsKey: "stories",
    listRecipe: "stories.list",
    webKey: "storiesKey(",
    pagerFile: "components/work/stories-screen.tsx",
    pagerKey: "storiesKey(",
    why: "one piece of work per thing we do, kept forever — the two years arriving from Glide are 3,677 rows on day one, and a done story is never deleted because the savings and the margin computed from it have to stay checkable. SPRINTS are deliberately NOT here beside it: a sprint is a block of SOLD work, so that collection grows at the speed of contracts rather than of clicks and a hard ceiling is an honest answer",
  },
}

/** R14, THE SEARCH HALF — reviewed exceptions to "no screen re-narrows the rows
 * a find bar gave it", keyed EXACTLY as `web/test/paged-search.test.ts` names
 * them: `<file relative to the repo root>::<the call, whitespace collapsed>`.
 *
 * WHY THIS LIST EXISTS AT ALL, AND WHAT IT REPLACED. The census used to match
 * the LITERAL `rows.filter(`, so it was defeated by a newline: a chain broken
 * after `rows` walked straight past it. That is not a hypothetical. On
 * 2026-09-07 `web/components/tickets/tickets-collection.tsx` carried a paragraph saying
 * the chain must STAY broken across lines *because the matcher demanded it* —
 * a law bending the code it polices, and a passing suite resting on
 * whitespace. The matcher is whitespace-insensitive now, which caught that call
 * immediately, and this is where the call earns its keep in words instead.
 *
 * THE ONE THING A PIN HERE HAS TO CLAIM: that the `.filter(` does not DROP a
 * row from what the person can see. R16's defect is a screen showing fewer rows
 * than the exact server count above them. A PARTITION — every loaded row landing
 * in exactly one bucket, all buckets drawn — is not that, and no regex can tell
 * the two apart, which is precisely why the reason is written by a person.
 *
 * A RATCHET, like RAW_BODY_EXEMPT: an entry matching nothing in its file turns
 * the build red, so the list can only shrink. */
export const FIND_NARROWING_OK: Record<string, string> = {
  "web/components/tickets/tickets-collection.tsx::rows.filter((r) => r.status === stage)":
    "the Open tab's BOARD, and a partition rather than a narrowing: the columns are mapped off OPEN_TAB_STATUSES (`web/test/tab-facets.test.tsx` holds that), a loaded ticket has exactly one status, and every one of those statuses is drawn — so no card the page loaded is dropped from the board. The number beside each column stands down the moment anything is being asked (`count: narrowed ? undefined : counts?.[stage]`, with `narrowed={found.active}`), so the exact server count never sits over a bucketed page. The fifth column (Waiting) is a SECOND door read, not a slice of these rows, for the same reason.",
}

export const DEAF_EXEMPT: Record<string, string> = {
  help_threads:
    "a reply pings the parent help row too (op edit), whose deps now name the open conversation itself (`help-thread:<id>` + its total, web/lib/live-resources.ts) and whose portal listener drops the `portal:thread:` slice — so the thread updates live through the parent's ping, and this resource's own ping (whose id is the REPLY, which no cache is keyed by) stays deaf on purpose",
  agent_usage:
    "the quota badge rides every chat response and the usage dialog fetches on open — there is no standing cache a ping could refresh",
}

/** R20 — reviewed exemptions: the request-body fields a door reads WITHOUT a
 * runtime check, keyed `<worker src path>::<var>.<field>` exactly as the scan
 * names them, each with the reason it is safe there.
 *
 * The list is a RATCHET, not a parking bay. A line that is no longer an offender
 * turns the build RED, so validating a listed field FORCES its line out and the
 * list can only ever shrink. That is the difference between a reviewed exception
 * and a quiet permanent bypass — and it is why this file is the right place for
 * it: an exception nobody can find is a bypass with better manners.
 *
 * Every line here today belongs to `workers/mcp/`, which is the EXTERNAL machine
 * surface and owns its own boundary suites. */
export const RAW_BODY_EXEMPT: Record<string, string> = {
  "workers/mcp/src/routes/mcp.ts::rpc.id":
    "JSON-RPC 2.0 requires the request id be ECHOED BACK verbatim in the response envelope (`id` may be a string, a number or null by spec). It is never read as a value, never reaches a statement, and normalising it would break the protocol.",
  "workers/mcp/src/routes/mcp.ts::rpc.params":
    "the params OBJECT itself is only ever indexed (`rpc.params?.name`, coerced with String()) and handed to the tool catalogue, which validates each argument against the tool's own schema before it reaches a door. The field read here is the envelope, not a value.",
}

/** R18 — reviewed exemptions, pinned EXACTLY: tables whose activity every member
 * may see, each with its reason. A new relatedTable must join the gate map above
 * or earn a visible line here — never a silent bypass. */
export const ACTIVITY_TABLE_EXEMPT: Record<string, string> = {
  teams: "team metadata (name/logo) is member-wide — the team screen itself has no module gate",
  screens: "screen-recipe changes are app furniture every member renders; the rows carry no record content",
  import: "an import summary names only counts + the target module; the imported rows' own activity is gated by their module",
}

/** Worker test suites that enforce R1. A new mutating worker without a
 * publish-seam test is a gap — track it here. */
export const MUTATING_WORKERS = ["tenancy", "content", "data-ops"] as const

/** R2 / R8 — the components under `web/components` that are NOT record details,
 * though the census in `web/test/rules.test.ts` would otherwise read them as one.
 * Key = the file's basename, value = the reason, mandatory.
 *
 * THIS USED TO BE THE OTHER LIST. Until 18 Aug 2026 the registry held
 * `RECORD_DETAIL_COMPONENTS`, an INCLUSION list of the bespoke record details,
 * and R2 and R8 walked exactly the screens somebody had remembered to type into
 * it. That is a hole by construction, and it opened twice: `app-detail` and
 * `process-detail` were added on 17 Aug after a tester found faults on screens no
 * law had ever walked, and on 18 Aug `sprint-detail` and `story-detail` turned
 * out to have been missing the whole time — two record details with tabs and an
 * Activity panel that R2 and R8 had never once read, under a green build. Both
 * times the screen was correct-looking and the LAW was absent, which is the
 * failure that leaves no trace.
 *
 * So the census is DERIVED from the code now, exactly as R8 already derives which
 * collection a badge describes, and this list is the small reasoned residue that a
 * derivation always needs. It is a RATCHET like `RAW_BODY_EXEMPT`: an entry naming
 * a file the census would not have caught anyway turns the build red, so it can
 * only ever shrink.
 *
 * Empty today. Nothing under `web/components` is named `*-detail.tsx` or renders an
 * `<ActivityPanel>` without being a record detail — and the per-screen reasoning
 * that used to live in the old list has not been lost with it: every one of those
 * components opens with its own comment saying why it is host-composed rather than
 * a recipe, which is where a reader looks for it. */
export const RECORD_DETAIL_NOT: Record<string, string> = {
  /* EMPTIED 7 Sep 2026, and the emptying is the point rather than a loss.
   *
   * Its one entry was `module-content`, the RECIPE HOST — caught by a census
   * whose behavioural signal was "renders `<ActivityPanel>`", which that file
   * did from 2026-09-03 so the recipe-driven details would get the app's own
   * empty/loading/error copy instead of the kit's hardcoded English. It is not
   * a record detail and never was: it hands recipes to `ScreenRenderer`, and
   * the kit's `RecordDetail` draws the strip, so the bespoke half's demands
   * described a shape that file correctly does not have.
   *
   * The client retired the Activity tab, the census's behavioural signal moved
   * to `<RecordScreen>` (the app's own detail host), and `module-content`
   * renders none — so it is no longer caught and the exemption became a line
   * naming a file nobody was excusing. The rot check demanded its deletion,
   * which is exactly what that check is for. `module-content` remains held by
   * the SAME test's recipe half, by name, to one `withTabCounts(` per detail
   * recipe it renders.
   *
   * Kept as an empty map rather than deleted: the census still subtracts it,
   * and an exemption list that has to be re-created to be used again is one
   * somebody re-creates without its history. */
}

/** R2 — record details that draw ONE panel, and therefore no tab strip.
 *
 * A tab strip over a single panel carries no choice: it names the thing already
 * on screen. This list became necessary on 7 Sep 2026, when the client retired
 * the Activity tab ("kill all old activity tabs") and the one detail whose tabs
 * were exactly Overview + Activity was left holding a strip with one item.
 *
 * Each entry says why that screen has one panel — not "it has no tabs", which is
 * the observation, but what the record IS such that a second panel would be
 * invented to fill the strip. Rot-checked in `record-detail-tabs`: an entry
 * naming a screen the census does not catch, or one that has since grown a
 * `TabsView`, turns the build red. The list can only shrink. */
export const RECORD_TABS_SINGLE_PANEL: Record<string, string> = {
  "selectable-detail":
    "A DROPDOWN VALUE — a word, its colour or glyph, and whether it is active. There is no second thing about it: it owns no collection, nothing is filed against it, and its whole record fits the Overview panel it already draws. Its strip was Overview + Activity until 7 Sep 2026 and became one item when the Activity tab was retired; a strip was then removed rather than a second panel invented to justify one. Its history is still reachable, from the footer's Latest activity door like every other record's.",
}

/** R55 — tables that store a `ref` and have no KIND minting one for them.
 *
 * The census in `web/test/refs-match-the-formula.test.ts` reads the team schema
 * for every `ref` column and `TEAM_REF_TABLES` (shared/workers/refs.ts) for every
 * kind. A table in the first and not the second stores strings that no formula
 * describes, which is the entire fault R55 exists for — so it has to be here, in
 * writing, or the build is red.
 *
 * Rot-checked both ways and the list can only shrink: an entry for a table that
 * has since been given a kind fails as loudly as an unlisted one, because an
 * excuse that has stopped being true reads as a handled exception while
 * describing nothing. */
export const REF_TABLES_WITHOUT_A_KIND: Record<string, string> = {
  tasks:
    "A TASK IS THE AGENCY'S OWN ADMIN AND MINTS NOTHING. `createTask` " +
    "(workers/content/src/lib/tasks.ts) writes a literal NULL into this column and has since the " +
    "2026-08-31 ruling, which put a task in the same category as a process, a role or a dropdown " +
    "value — none of which carries a reference either. The column and its unique index are a " +
    "fossil of the scheme before that: 109 rows on staging still hold an old `<account>-K####` " +
    "string, minted by a counter that no longer exists and shown on no screen then or now (the " +
    "task doors take no `q`, and nothing renders `Task.ref`). " +
    "THEY ARE DELIBERATELY LEFT ALONE by migration 0068. There is no kind to carry them to, so " +
    "rewriting them would mean inventing a scheme the client never asked for; NULLing them would " +
    "be destroying data to make this law look tidier, and 0068's own header says a migration that " +
    "rewrites identifiers is close to irreversible. The day a task is given a kind, this entry has " +
    "to go and R55 covers the table with no further edit.",
}

/** R8 — reviewed bypasses: placement:"tab" sections that DON'T lead with a
 * collection, so they carry no count badge (and thus no countCacheKey). Each MUST
 * name its reason; every other tab section is forced to declare a countCacheKey. */
export const TAB_COUNT_EXCEPTIONS: Record<string, string> = {
  overview: "leads with team metadata (name, logo, audit) — not a collection, so no count.",
  import: "contextual per-target action reached from a button — not a collection tab.",
}

/** R8, the RECORD-DETAIL half: the tabs on one record's screen. A tab that
 * reveals a collection (a record's Activity feed, a ticket's conversation, its
 * stakeholders) MUST carry that collection's exact count; a tab that shows the
 * record ITSELF (an overview block, the article prose, the permission grid)
 * carries none — and says so HERE, once, with its reason. Keyed
 * `<recipe>.<tabKey>` for the engine details (BASE_RECIPES) and
 * `<component>.<tab value>` for the bespoke ones (RECORD_DETAIL_COMPONENTS), so
 * a team tab and a record tab that share the word "overview" can never bypass
 * each other. Separate from TAB_COUNT_EXCEPTIONS on purpose: these are two
 * different tab surfaces, and one flat namespace would let an exception written
 * for one silently excuse the other. */
export const RECORD_TAB_COUNT_EXCEPTIONS: Record<string, string> = {
  // Engine-recipe details (web/lib/screens.ts) — a `description` block is the
  // record's own fields, so there is no collection to count.
  "members.detail.overview": "one member's role, joined date and email — one record, not a collection.",
  "invites.detail.overview": "one invite's role, status and dates — one record, not a collection.",
  // Bespoke details (host-composed) — the panel is the record itself.
  //
  // `team.detail.overview` AND THE TWO `role-detail` LINES LEFT THIS MAP ON
  // 2026-09-09, and the reason is the same for all three: the tabs are gone
  // because the SCREENS are. The client's ruling deleted the team overview
  // outright ("This overview about the team should not even exist") and folded
  // every role's permission sheet onto one matrix in Settings › Team, so a role
  // no longer opens a page with tabs to badge. web/lib/pages.ts and
  // web/components/team/roles-matrix.tsx carry the whole of it.
  "selectable-detail.overview":
    "one dropdown value's own fields — its group, its word, whether it is active, whether it is protected (the row read \"one of the defaults\" until the client's 2026-09-10 rename; the flag has never pre-selected anything, it refuses a deactivation), and the four enrichments (mark, German label, description, standard days). One record, not a collection. It is the R2 MINIMUM on purpose: a dropdown value has no collection hanging off it at all, so Overview + Activity is the whole record and the second tab is the only one that can carry a number.",
  "help-detail.overview": "one ticket's type, source and audit block — one record, not a collection.",
  "account-detail.overview":
    "one company's own fields — its reference, its industry, its postal address, its language, where it sits, and the paragraph about it. One record, not a collection. Every collection tab beside it — contacts, children, apps, sprints, to-dos, rates, activity — carries a server count.",
  "account-detail.organisation":
    "THREE collections on one tab — the client's departments, their roles and their tools — so there is no single number a badge could carry. R16 badges ONE collection's exact count, and a total across three would be an arithmetic nobody asked for: 'this client has 11 things' answers no question. Each list carries its own heading, and a role row carries its own department and holder chips, which is where the counting actually happens. The tab exists at all because a role is what turns a process map's minutes into money — see the panel's own note.",
  "account-detail.impact":
    "what this client's apps have given back: the hours, their step-by-step derivation, and the same hours in money. It is one ARITHMETIC, not a set of rows — the steps under it are the workings of a single figure, so a count on the tab would number the sum's terms rather than anything a person asked for. It sat at the bottom of Overview until 19 Aug 2026, under the cover, eight fields and the About, which is where the headline number of the whole product had been living.",
  "account-detail.knowledge":
    "the knowledge base asked IN CONTEXT (12.1): a question box that already knows which client it is about, and the passages that answer it. Retrieval, not a collection — there is no set of rows to count.",
  "contact-detail.overview":
    "one person's own fields (their company, how to reach them, where they are, their language, their reference) — one record, not a collection. Its five collection tabs — companies, to-dos, tickets, meetings, portal login, activity — each carry a server count.",
  "knowledge-detail.source":
    "the source's own text — the exact words the assistant reads out of it, plus where they came from. One record's body, not a collection. (How many searchable pieces that text became is a FIELD on the Overview, not a tab: the pieces are derived from the text on this same panel, so a tab over them would be the same thing twice.)",
  // The agency's own housekeeping. Four engine-recipe details, each leading with
  // a `description` block of the record's own fields — so there is no collection
  // on the Overview tab to count, and its sibling Activity tab carries the exact
  // server total like every other record in the app.
  "brand.detail.overview": "one asset's category, description, file and audit block — one record, not a collection.",
  "purposes.detail.overview": "one meeting purpose's department, description and audit block — one record, not a collection.",
  "task-detail.overview":
    "one task's status, who has it, when it is due and the note under it — one record, not a collection. Its two sibling tabs, work logs and activity, each carry the exact server total like every other record in the app.",
  "meeting-detail.overview":
    "one meeting's client, purpose, when and where, and its audit block — one record, not a collection. Its sibling Activity tab carries the exact server total like every other record in the app.",
  "meeting-detail.notes":
    "the agenda we set and the notes we took — the two pieces of prose this module exists to keep. One record's body, not a collection.",
  // PINNED 18 Aug 2026, and the way it surfaced is the point. The tab's own
  // comment in meeting-detail.tsx says "the rule caught this rather than a
  // reviewer" — and the rule had never read the tab at all. R8's bespoke scan
  // allows 300 characters between a tab's `value:` and its `badge:`, and those six
  // lines of comment are longer than that, so the match simply did not happen. The
  // reasoning was written down in the one place no law reads. It is here now, and
  // the census strips comments before it matches so the window measures code.
  "meeting-detail.calendar":
    "the guest list mirrored from the calendar entry, which the calendar read CAPS — so its length is a ceiling, not a count (R16), and an invitation with sixty people on it would badge fifty. The tab lists them, and a list you can see the end of does not need a number on it. Shown only when the meeting is in a calendar at all.",
  "knowledge-detail.overview":
    "one source's kind, compartment, who may read it, how many pieces it was cut into and when it was last indexed — one record, not a collection.",
  // TWO VIEWS OF ONE COLLECTION, not two collections. The Steps tab already
  // carries the exact server count of the version on screen (`shownStepCount`),
  // and R16's whole sentence is "exactly once" — badging the switch would print
  // the same number twice on one screen, three lines apart, which is the fault
  // that law was written about rather than a way of obeying it.
  "process-detail.list":
    "the LIST view of a process's steps. It is a view switch inside the Steps tab, not a collection tab: the count belongs to the tab above it and is already shown there, and a number on both would be R16's own failure case (the same total, twice, on one screen).",
  "wave-detail.overview":
    "one package's own fields — whose it is, what it covers, when it runs, and how many sprints are in it. One record, not a collection. Its two sibling tabs, sprints and activity, each carry the exact server total. The dates on it are DERIVED from the sprints and stored, so they are a fact about the record rather than a count of anything.",
  "process-detail.flow":
    "the PICTURE of the same steps, drawn as a flowchart — the forks, the joins and the ways back that a list cannot show. Same collection, same count, same reason as `process-detail.list`: the Steps tab above already carries the exact server total for the version being shown, and repeating it on a view switch would number the same rows twice. It writes nothing, so there is not even a second thing to count.",
  "process-detail.compare":
    "the same steps beside ANOTHER version's, which is a subtraction rather than a collection. A count here would answer 'how many rows are in this comparison', which is not a question anybody asks of a before-and-after. Renamed from `process-detail.map` on 24 Aug 2026 when the switch grew a third view and the old word stopped saying which one it meant.",
  "app-detail.overview":
    "one system's own fields — whose it is, its stage, the four paragraphs of context, the four prose fields and the address, and its address. One record, not a collection. Its five collection tabs (sprints, stories, process maps, meetings, tickets) and its activity tab each carry a server count.",
  "app-detail.impact":
    "the hours this app gives back every month and what they are worth at the rate of the role that used to spend them (8.13). An arithmetic over the app's process maps, drilled process by process — the lines are the sum's own working, not a collection of records, and a badge over them would be counting the number of terms in an addition.",
  "app-detail.knowledge":
    "the knowledge base asked IN CONTEXT (8.9): a question box that already knows which system it is about, and the passages that answer it. Retrieval, not a collection — there is no set of rows to count, and a badge over it would be counting the whole base.",
  "process-detail.overview":
    "the map's own description — including the caveat saying whether its times have been agreed yet — plus its app, its current version, its baseline and its audit block. One record, not a collection. Its four siblings each carry a server count, and the Steps badge counts the VERSION being shown rather than always the current one.",
  // THE WORK ENGINE'S TWO RECORDS, pinned on 18 Aug 2026 — the day the census
  // stopped being a hand-kept list and read the code instead. Both screens had
  // carried tabs and an Activity panel since they were written, and neither R2 nor
  // R8 had ever walked either of them: they were simply not in the old
  // RECORD_DETAIL_COMPONENTS array. Nothing was wrong on the screens; the law was
  // absent, which is the failure that shows no colour at all.
  "sprint-detail.overview":
    "one block of sold work — what kind it is, when it runs, what it was sold for, and how much of the work inside it is done. One record, not a collection. Its two sibling tabs, stories and activity, each carry the exact server total.",
  "story-detail.overview":
    "one piece of work's own fields — its status, its kind, its reference, who has it, when the sprint it was sold inside is due, and the three pieces of prose somebody typed (the detail, what was done, what the client will be told). One record, not a collection. Its two sibling tabs, work logs and activity, each carry the exact server total.",
}

/** R4 — the form dialogs that MUST use FormShell. */
export const FORM_DIALOGS = [
  "help-form-dialog",
  "role-form-dialog",
  "invite-dialog",
  "team-edit-dialog",
  "selectable-form-dialog",
  "account-form-dialog",
  "contact-link-dialog",
  // portal-access-dialog left this list on 26 Aug 2026: superseded by
  // PortalAccessPanel (account-detail-panels.tsx) in the panel pivot and then
  // sat unmounted for weeks — a finished 121-line dialog no screen opened.
  "knowledge-form-dialog",
  // The third way into the knowledge base. Its draft is the interesting one:
  // what it persists is the TITLE and the FILING, never the file — a File cannot
  // go into session storage, and a form that pretended otherwise would silently
  // save a source with nothing behind it.
  "knowledge-upload-dialog",
  // Process maps and the numbers under them. The step form is the one that
  // matters most here: it collects the two figures every savings number in the
  // app is a subtraction between, so a draft lost to a mis-tap is an agreed
  // estimate somebody has to go and ask for again.
  "app-form-dialog",
  "process-form-dialog",
  "step-form-dialog",
  // The work engine. The story form is the one a person opens most often in a
  // day, so a draft lost to a mis-tap is the most expensive kind here; the
  // sprint form collects a PRICE, which is the other kind.
  "story-form-dialog",
  "sprint-form-dialog",
  // Logging time by hand. A draft matters here for a reason the others do not
  // have: the two moments are remembered, not looked up, and a person who loses
  // them to a mis-tap has to remember them again.
  "time-form-dialog",
  // The two nouns beside each other. The to-do form is the only one in the
  // agency app whose Save reaches into a customer's inbox, so it says so.
  "todo-form-dialog",
  "task-form-dialog",
  // Answering a ticket. It opens pre-filled from the draft each story's closing
  // note has been building, and pressing its button emails a customer — so
  // losing what somebody typed into it is the most expensive draft loss here.
  "resolve-dialog",
  // The agency's own housekeeping. The staff-profile form is the one that most
  // needs its draft kept: it is the longest form in the app and the hardest to
  // retype, because its answers are a conversation somebody had with a colleague
  // rather than facts they can look up again.
  // ONE dialog for the four internal RECORD kinds (a post, a brand asset, a
  // programme, a meeting purpose). They are the same form with different labels
  // — a name, a vocabulary field, some prose — so four files would be four
  // copies of one draft rule, one submit path and one busy state to keep in
  // step. The two staff forms are separate because they are genuinely different
  // shapes: one is about a person, the other about a piece of paper.
  "internal-record-dialog",
  "staff-profile-dialog",
  "certificate-form-dialog",
  // Naming a Drive folder or a Chat space for the assistant. Short, but it is
  // the form that asks the question the whole module turns on — private, or the
  // team's? — so it gets the same shell and the same kept draft as every other:
  // a half-typed answer to "who may read this" must not be lost to a mis-tap and
  // re-guessed.
  "google-source-dialog",
  // THE MONEY had a form here — `rate-form-dialog`, one label and one number,
  // serving all three rate cards because it knew no door, no table and no
  // audience. All three cards were retired on 10 Sep 2026 and the form went with
  // the last of them; there is no money FORM anywhere in this app now.
  // Writing a reply into somebody's own Gmail. It gets the draft rule for the
  // plainest reason of all: what is typed into it is a letter to a client, and
  // pressing its second button sends that letter out of the building.
  "mail-reply-dialog",
  // Arranging a meeting. Its draft matters for the same reason the time form's
  // does: the agenda is typed while somebody is still on the phone agreeing it,
  // and a mis-tap that loses it loses a conversation rather than a field.
  "meeting-form-dialog",
  // The agency's own details, on the Kwapso page. A separate dialog from
  // team-edit and the difference is the audience rather than the fields: one is
  // what the app calls itself in the rail, the other is what the company is
  // called on an invoice. Its draft earns its keep the way the staff profile's
  // does — a registered address and a pair of tax numbers are copied out of
  // somewhere else, and losing them to a mis-tap means going and finding them
  // again.
  "legal-details-dialog",
] as const

/** R29 — THE EMAIL CENSUS. Every message this product sends a person, and the one
 * question the owner asked about each of them: does it refer to a specific record?
 *
 * Keyed `<repo-relative file>::<function>`, and the KEYS ARE DERIVED, not typed:
 * `web/test/linked-emails.test.ts` finds every function in `workers/` that composes
 * a branded message and demands a line here for each. Add an email, the build goes
 * red until it is classified; delete one, the orphan entry goes red too.
 *
 * `refersToRecord: true` means the email is ABOUT something with a screen, so it
 * carries a button to it — built through shared/workers/record-link.ts, which
 * decides WHICH FRONT DOOR from the recipient. `link` names the destination for a
 * reader; the check reads the code, never this sentence.
 *
 * `false` is a real answer and it is written down, because "this one didn't need a
 * button" is exactly the sentence that gets said about the one that did. Four of
 * the five refusals here are refusals ON PURPOSE: a link a person cannot open, or
 * must not be taught to click, is worse than no link at all. */
export type EmailClassification =
  | { refersToRecord: true; link: string }
  | { refersToRecord: false; why: string }

export const EMAIL_CENSUS: Record<string, EmailClassification> = {
  /* ── auth: identity. Nothing here names a record, and nothing here gets a link ── */
  "workers/auth/src/lib/email.ts::sendLoginCode": {
    refersToRecord: false,
    why: "a six-digit code refers to the sign-in attempt in front of the person reading it and to nothing else — there is no record to open. It is also the one email that must NEVER carry a button: a sign-in mail with a link in it is the exact shape of the phishing mail people are told to watch for, and teaching our own users to click one is a security cost with no product gain.",
  },
  "workers/auth/src/lib/email.ts::sendEmailChangeCode": {
    refersToRecord: false,
    why: "the same code, for a different proof, sent TO AN ADDRESS NOBODY HAS CONFIRMED YET. It names no record; and until the code comes back, the recipient is a stranger who typed an address into a form, which is not somebody to send a link into the app to.",
  },
  "workers/auth/src/lib/email.ts::sendEmailChangedNotice": {
    refersToRecord: false,
    why: "a security notice to the OLD address, sent precisely because the person reading it may be the one who did NOT make the change. Their account is not a record with a screen, and a link into an app that address can no longer sign in to is a dead end — the action it asks for is to contact us, which is the one thing a button here could not do.",
  },

  /* ── tenancy: membership, invites, and the estate's own plumbing ── */
  "workers/tenancy/src/lib/invites.ts::createInvite": {
    refersToRecord: true,
    link: "invite → the in-app invites inbox (agency; the portal has none, and an invite is how a portal login comes into being in the first place)",
  },
  "workers/tenancy/src/lib/notify.ts::notifyRoleChanged": {
    refersToRecord: true,
    link: "member → their own membership in the team, for a STAFF recipient. A client login gets no button: the portal has no members screen, so the only link that could exist for them is an agency URL",
  },
  "workers/tenancy/src/lib/notify.ts::notifyRemoved": {
    refersToRecord: false,
    why: "it names a membership that has just been deactivated. Every link this base could build points at a screen the team they were removed from no longer lets them open, so a button would be a promise the app itself refuses one click later. The mail already names the only thing they can act on: ask an admin.",
  },
  "workers/tenancy/src/lib/notify.ts::notifyInviteRevoked": {
    refersToRecord: false,
    why: "the invite it names has been withdrawn, so the invites inbox the invite email points at would show them nothing. 'No action is needed' is the whole message, and a button under it would suggest otherwise.",
  },
  "workers/tenancy/src/lib/portal-welcome.ts::sendPortalWelcome": {
    refersToRecord: true,
    link: "portalHome → the client portal's own home, for a CLIENT recipient. It is the only email tenancy sends to somebody outside the agency, and the one destination in the map that is not a record: what it is about is the portal itself. The agency column is deliberately null — a colleague has no portal to be welcomed to, and a link to one would advertise a door they may not pass (R21). Opt-in at the moment of the grant, so what goes out is the agency's decision and not the software's.",
  },
  "workers/tenancy/src/lib/sharding.ts::alertNewAlarms": {
    refersToRecord: false,
    why: "a database crossing 80% is an operational record with no screen on EITHER front door — it lives in the core database's db_growth table, which no app screen reads. Its real destination is the runbook, which the footnote names (OPERATIONS.md, Growth watch), and inventing an admin screen to have somewhere to point at would be building a product out of an email.",
  },

  "workers/tenancy/src/lib/ops-alert.ts::sendOpsDigest": {
    refersToRecord: false,
    why: "the nightly ops digest names error SIGNATURES and teams near their AI allowance — neither is a record with a screen on either front door. `error_logs` is read through an owner-gated curl door (GET /api/data-ops/admin/errors) that no front-end code calls, and a team's allowance is a counter rather than a record. Its real destination is that door and the runbook, which the footnote names, exactly as the sibling growth alarm above points at OPERATIONS.md. Giving it a `ctaUrl` would mean inventing an admin screen so an email had somewhere to point, which is building a product out of a notification.",
  },

  /* ── content: the work itself, and the two emails a client ever receives ── */
  "workers/content/src/lib/notify.ts::notifyReplyAndMentions": {
    refersToRecord: true,
    link: "ticket → the ticket that was replied to, at the RECIPIENT's own front door (one send reaches staff and clients at once)",
  },
  "workers/content/src/lib/notify.ts::notifyTodoRaised": {
    refersToRecord: true,
    link: "todo → the portal home, where to-dos (now Input on screen) sit ('Awaiting your input'). The portal has no to-do detail screen and one is not invented here",
  },
  "workers/content/src/lib/notify.ts::sendTriageDigest": {
    refersToRecord: true,
    link: "ticketList → the team's Tickets list (agency). It is about many records, so it points at the list they are all in — and it is staff-only, which is what makes an agency URL the right one",
  },
  "workers/content/src/lib/notify.ts::notifyTicketResolved": {
    refersToRecord: true,
    link: "ticket → the answered ticket, in the client's portal",
  },
}

/** R40 — EVERY DOOR THAT STORES BYTES, AND WHERE A PERSON MEETS THEM AGAIN.
 *
 * The DATA half of `reachable-bytes`, and deliberately the smaller half. What a
 * machine cannot infer is the MAPPING — that the bytes `todos.ts` puts in the
 * bucket are the thing a person opens off `Todo.fileUrl` in `work-panels.tsx`.
 * Everything else is derived: the write census is read off disk against the
 * bucket bindings the wrangler configs declare, and whether `shownIn` actually
 * renders `field` is read off disk too. So an entry can lie about neither end.
 *
 * `writtenIn` is a repo-relative path that must still contain a byte-write.
 * `field` is `Type.property` — the property is what the render scan looks for.
 * `shownIn` is the front-door file that puts it in front of somebody.
 *
 * A DOOR MAY NEED TWO LINES. `staff.ts` is a generic upload endpoint: it stores
 * bytes and hands the URL back in its response, and the CALLER decides which
 * field it lands on. Two destinations, two lines, one write site — which is why
 * the census asks that every write site be CLAIMED rather than matched one-to-one. */
export const STORED_FILES: {
  writtenIn: string
  field: string
  shownIn: string
  why: string
}[] = [
  {
    writtenIn: "workers/auth/src/lib/profile.ts",
    field: "SessionUser.imageUrl",
    shownIn: "web/components/shell/profile-menu.tsx",
    why: "a member's own photo, on the avatar in the rail they see on every screen",
  },
  {
    writtenIn: "workers/tenancy/src/lib/teams.ts",
    field: "TeamSummary.logoUrl",
    shownIn: "web/components/shell/team-switcher.tsx",
    why: "the team's own logo, on the switcher at the top of the rail",
  },
  {
    writtenIn: "workers/tenancy/src/routes/accounts.ts",
    field: "Account.logoUrl",
    shownIn: "web/components/accounts/account-detail.tsx",
    why: "a client's mark, leading their record",
  },
  {
    writtenIn: "workers/tenancy/src/routes/accounts.ts",
    field: "Account.coverUrl",
    shownIn: "web/components/accounts/account-detail.tsx",
    why: "the wide image their record leads with — a second field on the same door",
  },
  {
    writtenIn: "workers/tenancy/src/routes/processes.ts",
    field: "AppRow.logoUrl",
    shownIn: "web/components/apps/app-tiles.tsx",
    why: "a system's mark, on every tile and every row that names it. The door is called `processes` because that is the permission module; the record it writes is an APP",
  },
  {
    writtenIn: "workers/content/src/routes/help.ts",
    field: "HelpAttachment.url",
    shownIn: "web/components/records/record-attachments.tsx",
    why: "what somebody attached to a ticket, on the ticket's Files and links tab. One panel serves both records since the fold; `tickets/help-attachments.tsx` is the ticket's door and copy, and passes no `fix`",
  },
  {
    writtenIn: "workers/content/src/routes/stories.ts",
    field: "StoryAttachment.url",
    shownIn: "web/components/records/record-attachments.tsx",
    why: "what a story shows for itself. Unrendered anywhere until 96ea8fe1 — the second of the three breaches this law exists for. Same panel as the ticket's; `work/story-attachments.tsx` is the story's door and copy",
  },
  {
    writtenIn: "workers/content/src/routes/todos.ts",
    field: "Todo.fileUrl",
    shownIn: "web/components/work/work-panels.tsx",
    why: "the document a client sent back through the portal. Shown as an unclickable filename until this law landed — the worst of the three, because a person outside the company was on one end of it",
  },
  {
    writtenIn: "workers/content/src/routes/todos.ts",
    field: "Task.fileUrl",
    shownIn: "web/components/work/task-detail.tsx",
    why: "the photo of the letter on a piece of our own admin. Write-only from the day the door shipped — the third breach. Same file as the to-do above because one route module owns both doors",
  },
  {
    writtenIn: "workers/content/src/routes/knowledge.ts",
    field: "KnowledgeItem.fileUrl",
    shownIn: "web/components/knowledge/knowledge-detail.tsx",
    why: "the material behind a source, on the source's own screen",
  },
  {
    writtenIn: "workers/content/src/routes/staff.ts",
    field: "StaffProfile.photoUrl",
    shownIn: "web/components/team/staff-panel.tsx",
    why: "a colleague's face on their profile. The door is a generic upload endpoint and this is one of the two fields its answer lands on",
  },
  {
    writtenIn: "workers/content/src/routes/staff.ts",
    field: "StaffCertificate.fileUrl",
    shownIn: "web/components/team/staff-panel.tsx",
    why: "the certificate itself, behind its title. The second destination of the same upload endpoint",
  },
  {
    writtenIn: "workers/content/src/routes/brand-assets.ts",
    field: "BrandAsset.fileUrl",
    shownIn: "web/components/deep-link/shape.tsx",
    why: "a logo or a typeface on the agency's own brand shelf, drawn as the row's mark by the screen recipe",
  },
  {
    writtenIn: "workers/content/src/routes/deliverables.ts",
    field: "Deliverable.url",
    shownIn: "web/components/apps/deliverables-panel.tsx",
    why: "what we handed over on an app, opened from the app's own shelf",
  },
]

/** R45 — every one of the 47 files under `shared/ui/compositions/` that this app
 * does not directly import, with why. Full reasoning for each lives in
 * COMPOSITION-MISMATCHES.md; this is the rot-checked pointer the build reads.
 * Four shapes of reason, and the sentence says which:
 *   · MISMATCH — a genuine structural disagreement, checked against the file's
 *     own required props and documented behaviour, not just its name.
 *   · REALIZED DIFFERENTLY — this app already does the identical job, either by
 *     composing other already-adopted kit parts under other names, or natively —
 *     importing this exact file would duplicate working code, not add to it.
 *   · GAP — the app has nothing serving this job at all; the sentence says
 *     whether that is permanent (a navigation/product model that rules it out)
 *     or a real, unscoped finding.
 *   · OWNER'S CALL — a genuine two-sided question, with a recommendation.
 * Rot-checked both ways: an entry whose file becomes a direct import is stale
 * (delete it), and a direct import with no matching entry and no exemption is a
 * law nobody decided about. */
export const COMPOSITION_EXEMPT: Record<string, string> = {
  "templates/stepper-hero.tsx":
    "OWNER'S CALL, reversed 31 Aug 2026. This app's own `HelpStatusStepper`/" +
    "`StoryStatusStepper` (web/components/) were the adopted wrapper, rendered " +
    "as a ticket/story header's `headerExtra` — removed outright, not relocated, " +
    "the moment the client's absolute ruling landed: 'chips is the last " +
    "component of headers, nothing may render after them, ever, no exceptions.' " +
    "A status track drawn below the chips row is exactly what that ruling " +
    "forbids, and status already reads from the chip itself (a coloured dot, " +
    "shared/status-tones.ts's own tone mapping) — a second, more detailed " +
    "status readout has no " +
    "header slot left to live in. Revisit only if the client asks for a " +
    "step-by-step status view somewhere OTHER than a record header.",
  "overlays/access-denied.tsx":
    "MISMATCH. The optional `grantor` prop is real (a peer's render probe upstream confirmed `grantor={null}` draws no self-service well), but the composition's non-optional premise — a Dialog laid over the actual requested screen, blurred and scrimmed behind it — has no real call site: the agency's denial (`web/components/deep-link/screen-bits.tsx`'s `NoAccess`) is an inline sentence inside the persistent `AppShell`/`ScreenShell`, with no page-behind to blur and no dialog anywhere in the pattern; the portal's (`web-portal/components/no-access.tsx`) is a total, whole-session denial with literally no screen behind it to render. Neither door has the 'one blocked module inside an otherwise-working app, with a real page still open behind it' scenario this file is built for.",
  "overlays/assistant.tsx":
    "MISMATCH, reasoning corrected 2026-08-31 (2026-08-29's pass had it backwards): this app's `AgentPanel` (web/components/assistant/agent-panel.tsx) is itself non-modal — now a `Popover`-anchored bubble, and already `modal={false}` on the prior `Sheet` primitive before that — because the 'screen trace' mechanism (agent-host.tsx's go()/runAction()) needs the underlying screen to stay interactive while the assistant is open. The kit's own overlays/assistant.tsx / CopilotOverlay still doesn't fit, for two reasons unrelated to modality: its own file header names it 'CONTRADICTION 1' (chapter 19 calls for a corner-anchored floating card, but what got built is a right-hand Sheet, copilot-overlay.tsx lines ~43-68), and its flat CopilotMessage model has no concept of this app's streamed text deltas, live tool-step rows, R23 citations, or staged file attachments (web/lib/use-agent-chat.tsx).",
  "overlays/bulk-edit.tsx":
    "OWNER'S CALL. `BulkEditScreen` IS the selection primitive (7 marks + select-all rendered on an open composition, confirmed by render probe) — it is not blocked on anything unbuilt, the way the first read wrongly assumed. What is unresolved is a product question: does any collection in this app want bulk mutation at all. RECOMMENDATION: not yet — no collection today performs a bulk write (every mutation is per-record, gated per-record), and standing up selection UI across 20+ collections for a capability nobody has asked for is the kind of unearned surface area the base's 'stay lean' rule warns against. Revisit if one specific collection (bulk-deactivating stale roles, bulk-tagging tickets) becomes a real, named ask.",
  "overlays/delete-confirmation.tsx":
    "MISMATCH, corrected on a deeper check than the 2026-08-29 pass ran. `DeleteConfirmationDialog`'s `confirmWord={null}` opt-out is real, but `recordNumber` is a REQUIRED prop baked into the title's own sentence assembly ('{verb} {recordNumber} — {recordTitle}?') — a numbered-record vocabulary this app's actual deactivate targets (roles, accounts, members, invites) do not have. And the composition's whole premise is IRREVERSIBLE deletion escalating to a typed-word gate for high-stakes cases; this app's own law is deactivate-never-delete (every one of its confirm dialogts, all hand-built on the kit's plain `AlertDialog`, guards a reversible action with a Reactivate path). `ArchiveConfirmationDialog`, the file's other export, was already confirmed a mismatch for its mandatory reason field and its 'Archived tab' concept this app doesn't have.",
  "overlays/export.tsx":
    "MISMATCH, re-checked by rendering: `columns` is not optional and the whole premise (scope choice + column picker + format choice) has no reduced mode — `ExportScreen` with no `formats`/`columns` still draws the scope radio. This app's actual export is a one-click `<a href>` honouring the current filter querystring server-side, a deliberately simpler shape.",
  "overlays/filter-builder.tsx":
    "MISMATCH, re-checked by rendering: `operators={[]}` still renders two comboboxes per row, same as a real operators list — the AND-chained, add/remove-row interaction model has no escape hatch, and this app's facets are single-valued, closed-vocabulary chips (`shared/web/screen-engine/filter-bar.tsx`) with no analog to a condition row at all.",
  "overlays/import-proposal.tsx":
    "MISMATCH, same root as `overlays/import.tsx` — this app's import is agentic, multi-file, multi-table with dependency ordering and FK resolution (AGENTIC-IMPORT.md); there is no manual per-column mapping UI anywhere to plug a proposal review step into.",
  "overlays/import.tsx":
    "MISMATCH. The five-step wizard (`IMPORT_STEPS`: upload → map → check → run → report) is the composition's entire premise, not a configurable subset — no prop skips the manual per-column mapping step this app's agentic import has no place for. The RUN/REPORT steps' visual shape (a live progress rail, a per-row failure list) is a real reusable primitive worth lifting standalone for this app's own commit step, but that is separate, unscoped work.",
  "overlays/quick-view.tsx":
    "GAP, permanent by current design. The app's real row activation (`shared/web/screen-engine/screen-renderer.tsx:683`) is Enter/Space → navigate straight to the full record, with no peek-without-navigating pattern anywhere. Adopting this means introducing a second, competing way to open a record — a navigation-model change, not a missing screen. Will not need this unless that model itself changes.",
  "screens/brand.tsx":
    "GAP, a real finding. Nobody has built a staff-facing page listing the app's own design tokens (colours, type, marks) for reference — the Brand library (`web/app/brand/`) is a client-asset collection of logos and swatches, a different concept entirely, already correctly adopted via the kit's `gallery`. Worth building only if staff actually ask 'what's our poppy hex' more than never; not urgent enough to justify scope on its own.",
  "screens/company-hub.tsx":
    "MISMATCH. `web/components/accounts/account-detail.tsx` already covers this job with a genuinely different anatomy: tabs (Overview/Contacts/work/Rates/Knowledge/Activity), the companies-vs-people split, portal-access rules, `MarginPanel` — none of which the composition's single-page header-figures-lists shape has a slot for.",
  "screens/home.tsx":
    "MISMATCH. The kit's home embeds one live ticket queue inline (`CollectionScreen`, per its own doc, \"a dashboard that cannot be opened into its records is a poster\"); this app's real `/home` (`web/components/screens/home-screen.tsx`) deliberately shows summary figures plus permission-gated link-out cards to six different collections — a different product decision about what a dashboard is for, not a missing prop.",
  "screens/invite-acceptance.tsx":
    "MISMATCH. The composition assumes an unauthenticated person clicking one emailed link, shown one invite, handed to onboarding with no account yet. This app's real flow (`web/components/team/invitations.tsx`) is the opposite on purpose: sign in first however you like, then see an INBOX of every pending invite for that address — a stated fix for 'I was invited but have no way to see it', not a rendering of the same screen.",
  "screens/link-sent.tsx":
    "MISMATCH. Built entirely around a magic link opened on a possibly different device, with a resend countdown and no code. This app's sign-in (`shared/web/use-email-sign-in.ts`) sends a 6-digit code typed on the same device in the same form — there is no separate device, no link, and no waiting-room screen at all.",
  "screens/not-found.tsx":
    "MISMATCH. `NotFoundScreen` is built for one record missing inside an otherwise-fine collection (its own header states this three times) — a record number chip, a real collection eyebrow/count and the collection's own header actions all stay drawn. This app's `<NotFound />` fires when a URL segment names no module at all, so there is no collection context to put in those slots. `screens/page-failure.tsx` is the composition that matches a real case here instead.",
  "screens/onboarding.tsx":
    "MISMATCH. The kit's 3-step tour (who you are / how it should look / what you work on) has no analog: this app's real onboarding (`web/app/onboarding/page.tsx`) is a deliberately single-step form wired to closed-team-creation business logic (`TEAM_CREATION_CLOSED`, agency-vs-client bootstrap branching) the composition has no concept of. STILL A MISMATCH after 2026-09-02, when the client's spine ruling put an appearance choice on that screen: what the composition's step 2 offers is now offered, but as one field in the single form rather than as a step — its `AppearanceOptionGroup`/`SpinePicture` cards are the SUB-PRIMITIVES this app already reaches (`shared/web/spine-section.tsx`), and it is the STEPPER around them, plus a third step for work this app assigns rather than asks about, that stays unadopted.",
  "screens/portal-boot.tsx":
    "MISMATCH. Its 'booting' register is the same static `SignInSplash` this app rejected for `screens/splash.tsx` (see that entry); its 'boot failed' register is the same real condition `screens/page-failure.tsx` already covers, already adopted on the more specific textual match for a whole-page failure.",
  "screens/portal-home.tsx":
    "REALIZED DIFFERENTLY — inherits `templates/portal-home.tsx`'s finding. This file is the route wrapper around that exact template; `web-portal/components/home-screen.tsx` already implements the identical 'savings figure + waiting/delivered' spec natively, so importing either would duplicate rather than add.",
  "screens/portal-impact.tsx":
    "MISMATCH. The kit's `/impact` is a flat progress-bars-plus-savings-figure report; this app's real `/impact` (`web-portal/components/impact-screen.tsx`) is an interactive App → Process → Step drill-down accordion with per-step regression flags, comments and conditional pricing — structure the composition has no slot for.",
  "screens/profile.tsx":
    "MISMATCH. This app's real profile screen (`web/components/screens/profile-screen.tsx`) shows a summary plus an `ActivityFeed` and edits through a separate popup dialog; the composition is an inline full-page required/optional form with its own commit bar — a different editing model, not a missing prop.",
  "screens/session-expired.tsx":
    "GAP, a real unscoped finding — not a permanent exemption. Nothing today persists a signed-out user's identity or a return destination: a 401 clears the session cache and redirects to a bare `/login` with no context (`web/lib/use-active-team.ts`), and there is no redirect-back mechanism anywhere in the login flow to restore to. Worth a scoped brief (identity storage + a redirect-back contract the whole login flow honours) when auth UX gets dedicated attention — real, unstarted plumbing on the one path where a half-built screen locks somebody out of their own account.",
  "screens/sign-in-portal.tsx":
    "OWNER'S CALL. Everything but one line fits cleanly (the two-step email/code flow, resend countdown, 'Wrong address?' back). The one line: `PortalLoginRoute` states a client portal never shows a social sign-in row, and this app's portal shows Google on purpose per SCOPE ch.06 ('signing in with Google never creates access; the invite does'). RECOMMENDATION: keep the app's Google row — SCOPE ch.06's reasoning is a real, already-shipped security stance, not an oversight, and the kit's law reads as a generic default rather than a considered exception for an invite-gated portal; if this still bothers the owner, the in-rule fix is a documented exception upstream in the kit's own law (the shape RADIUS_EXCEPTION already uses), not silently dropping a working feature.",
  "screens/sign-in.tsx":
    "MISMATCH. `SignInScreen`'s own doc header states its shape as T3A-3: one field, magic link, no code — the same assumption `screens/link-sent.tsx` already fails on, and the opposite of what this app's entire sign-in depends on. Its sibling export `AuthShell` has exactly three consumers in the kit (`link-sent.tsx`, `invite-acceptance.tsx`, `session-expired.tsx`), all three already recorded as a mismatch or an unbuilt gap above, so it has no live route to stand under regardless of its own merits.",
  "screens/splash.tsx":
    "MISMATCH. Both its registers point at `SignInSplash`, a static mark with 'NO ANIMATION... it hands over; it does not fade'. This app's real boot screen (`shared/web/mark-loader.tsx`) is a continuously looping, pre-hydration SVG animation plus a dated, owner-motivated hold-until-complete fix — adopting the static mark would be a visible regression against two documented, deliberate decisions, not a lateral swap.",
  "states/archive.tsx":
    "REALIZED, in substance — not a direct import. Of the composition's three separable laws (a consequence-stating band, quiet-ink archived rows, a Status/Updated → Archived-by/Archived column swap), the first is now a real `band` prop on the shared `CollectionFrame` engine seam, live and shipped on Tickets' Archived tab. The other two need each collection's own column definitions to know it is rendering the archived view — real, deliberately per-collection, unscoped work for the other 19 collections that carry an archive tab, not a batch item.",
  "states/empty-collection.tsx":
    "REALIZED, in substance — not a direct import. The composition's own `emptyBody` register (Headline + Text + up to two Buttons, no dashed placeholder) is a real seam now, `CollectionEmptyState` in `shared/web/screen-engine/collection-frame.tsx`, drawn by BOTH of the engine's genuinely-empty branches (kit-panel and legacy) and reused verbatim by every hand-rolled nested collection this app has (work-panels.tsx and its dozen siblings) — one register, not a fourth reinvention of 'a bare grey line'. 2026-09-01: it used to stop at an icon-only mango with no sentence and no second action, which is the client's own 'very wrong' screenshot; it now carries composition 27.21's exact two-button register — 'Add the first' (the one carved-out labelled mango) beside 'Import a list', the second only where a call site actually has a real import target for that record type. The rest of the composition (a figure strip of zero-reading stats, per-tab zero-badges) is still not adopted: `CollectionConfig` has no 'figures' or per-tab zero-badge concept, and inventing either is separate, unscoped scope.",
  "states/new-empty-record.tsx":
    "MISMATCH. There is no standalone screen to replace: every record-detail file (`sprint-detail.tsx`, `story-detail.tsx`, `help-detail.tsx`, and others) hand-rolls its own empty-copy into its own `CollectionFrame`/`ShapeStateBody` call. A real equivalent exists, just scattered across as many files as there are record types — not a gap, a different shape.",
  "states/no-results.tsx":
    "MISMATCH, a real but non-urgent one. The composition's register states the exact total count, the single narrowest-excluding facet, and a live would-show-if-cleared number for that one facet — genuinely richer than this app's plain sentence, but the middle claim requires the engine to answer a question it has never had to (re-running row selection per candidate facet, with real unresolved edge cases: ties, a facet excluding every row alone, a search term interacting with a facet). This app's existing 'Clear filters' button already works, so the plain sentence is not a dead end — plain-and-correct beats rich-and-speculative until a dedicated pass builds and tests the computation against real filtered data.",
  "templates/collection-screen.tsx":
    "REALIZED DIFFERENTLY — this file literally renders `MainScreen` internally, so it shares `templates/main-screen.tsx`'s finding: `ScreenShell` wrapping `CollectionFrame` in the exact `tone=\"bare\" inset={false}` shape this app's own engine already reached independently. The one open question the pair raises (a genuinely per-screen header vs. this app's in-body `CollectionHeading`) was decided not pursued — see `templates/main-screen.tsx`.",
  "templates/form-screen.tsx":
    "MISMATCH, on a sharper reason than the layout question. `surface=\"page\"` is confirmed (by render probe) to be a bare div, so the earlier dialog-vs-sheet objection is resolved — the remaining, real blocker is that the composition's actual value over `FormShell` is a required-fields-by-name summary sentence, a 'fields need attention' card and a changed-fields-by-name dirty band, none of which any of `FormShell`'s 32+ callers track today (every one disables Submit on an aggregate boolean, never a list of field names). Lighting that up is a real, scoped feature — instrumenting every field in every form with a name and an empty/dirty state — not a chrome swap behind one flag the way the already-adopted engine states were, because the state those adoptions needed already existed and this one does not.",
  "templates/import-flow.tsx":
    "MISMATCH, same root as the overlays import trio — a manual per-column mapping wizard this app's agentic, multi-table, FK-resolving import (AGENTIC-IMPORT.md) has no place for.",
  "templates/main-screen.tsx":
    "REALIZED DIFFERENTLY. Structure: `ScreenShell` wrapping `CollectionFrame` with `tone=\"bare\" inset={false}` — the exact shape this app's own engine (`shared/web/screen-engine/collection-frame.tsx`) already reached independently, confirmed correct by reading the kit's reference afterward. The one gap (`MainScreen`'s per-screen header vs. this app's `CollectionHeading` rendered in-body) was raised and explicitly decided not pursued: recomposing it is invisible to any adoption count either way, and widening `AppShell`'s generic header channel for a gain nobody could point at, mid-launch, was the wrong trade.",
  "templates/multi-step-form.tsx":
    "GAP, permanent. No wizard-style form exists anywhere in the app — every one of `FormShell`'s 32+ forms is single-step by design (one Dialog, one Submit). Confirmed independently by the kit's own component, which warns at runtime when no step depends on an earlier one — exactly this app's shape. Will not need this unless a future feature genuinely requires sequential, dependent steps.",
  "templates/portal-home.tsx":
    "REALIZED DIFFERENTLY. `web-portal/components/home-screen.tsx` already implements the identical spec (a savings figure, a waiting/delivered list, the scoped ambient field) natively, with its own components. Nothing here to adopt that isn't already built.",
  "templates/detail-screen.tsx":
    "REALIZED DIFFERENTLY. Read in full, this template is nothing but `ScreenShell` (header slot empty) wrapping `RecordChrome` — exactly what this app already assembles from the same, already-adopted parts under different file names: `AppShell` is now `ScreenShell`, and every record screen composes `RecordChrome` through the `RecordScreen` host seam. The one real difference — this app's persistent breadcrumb+timer header on record screens, where the template leaves that band empty — is a deliberate product choice (one header treatment everywhere), not a technical gap.",
  "templates/record-route.tsx":
    "REALIZED DIFFERENTLY. This template is nothing but `ScreenShell` (header empty) wrapping `RecordChrome`, additionally wiring stages into `StepperHero`'s hero slot — exactly what this app already assembles from the same, already-adopted parts (`AppShell`'s `ScreenShell`, `RecordChrome` via the `RecordScreen` host seam, `StepperHero` in the hero slot) under different file names. The one real difference — this app's persistent breadcrumb+timer header on record screens, where the template leaves that band empty — is a deliberate product choice (one header treatment everywhere), not a technical gap.",
  "templates/search-results.tsx":
    "GAP, a real finding. This app has no way to search across everything from anywhere — the only search-like control (`record-picker.tsx`) is a per-field relation picker scoped inside one form, not global search. Worth the owner's consideration as a genuinely useful, separately-scoped feature for a multi-module tool; not something to fold into a UI-adoption pass.",
  "templates/stat-strip.tsx":
    "REALIZED DIFFERENTLY. `pulse.tsx`'s `PulseBand` already draws its headline numbers through the kit's own `StatGrid` component directly — the exact primitive this composition is itself built on top of. The one thing this file adds beyond `StatGrid` is the optional per-tile `spark` mini-chart, and using it on these tiles is exactly the fusion `pulse.tsx`'s own law forbids ('aggregate into a big NUMBER or reach for a CHART, never fuse them') — the tiles that want a chart already draw one as a separate `BandCard`, by design.",
}
