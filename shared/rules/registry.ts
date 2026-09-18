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
    law: "Every screen showing a collection shows its count, exactly once: the NUMBER is a server COUNT(*) rendered through the ONE formatCount seam (floored abbreviation at every magnitude, zero/loading render nothing), counted EXACTLY up to TOTAL_COUNT_CAP (1,000,000) and reported as \"at least\" beyond it — through the one bounded seam shared/workers/count.ts, for every GROWING_COLLECTIONS total; a total that stopped early SAYS SO in the same object, because pagedJson DERIVES totalCapped from the total itself; a number that feeds a DECISION rather than a display (billable seconds, an export's completeness) stays EXACT and does not come through the capped path; the PLACE is a tab badge where the screen has a counted tab, else a CollectionHeading; the ARBITRATION is a React context (CountedTabs / CountedAbove) — a counted tab WINS and the heading stands down, decided per-permission at render, never by a prop; WHAT the number counts is the ROWS the collection lists, never the categories or groups they fall into — a tab over five automations badges 5, not '1 kind of thing'. Where R8 and R16 disagree about a number, R16 prevails (R8 owns WHICH collection a tab describes). Earned by: a 24,011-product catalogue advertising '1000' (a capped list's length), and the same '24k' shown twice on one screen.",
    why: "AMENDED 2026-09-15: the 'what it counts' clause above did not exist, and one badge used the gap — a module settings page's Choices tab counted GROUPS (categories) rather than VALUES, ruled that way on purpose the day before (client, 2026-09-14: 'show the total count for Automations and for Choice Components categories, not for the amount of choices'). A census of every tab badge in the app found it the lone exception to 'counts the rows the panel lists' — roughly 25 others already did. The owner reversed the 14 Sep ruling the next day, on seeing a badge read 1 over a panel listing 15 values: 'I would rather all badge counts show me the count of rows rather than types, so please change it.' Fixed at module-settings-screen.tsx's choiceValueCount, which stands down to no badge rather than a possibly-wrong one when its source (the same capped selectable/meeting_purposes reads the panel itself uses, R56, no second door) is still loading or came back at LIST_HARD_CAP — a wrong number is worse than no number. AMENDED 2026-08-14, and the amendment is narrower than 'allow an approximate count'. An unbounded COUNT(*) over a growing table was the one read in the product with no ceiling at all, on every page of every paged screen — while the exactness it bought above a thousand was precision the badge threw away immediately (24,011 and 24,499 both render '24k'). TWO OPTIONS WERE ARGUED. (b) keep the count exact and cache it briefly was the more obvious one and it LOST, for two reasons. First, a cache fights a mechanism that already exists: app-shell.tsx bumps the primed total sidecar by ±1 on every add/remove ping, so a 60-second server cache would be overwritten back to the stale value by the next list fetch — create a ticket and the badge goes 222 to 223, then jumps BACK to 222 for a minute, and a badge that moves backwards is worse than one that says 'at least'. Invalidation does not rescue it: the mutation runs in a different isolate from the one holding the cache, so cross-isolate invalidation costs a Durable Object round trip on every count read, which is MORE work than today. Second, the cache key would have to be the CALLER'S FENCE, not the collection — these counts vary with module rights (R18), the account fence, ticketFence, ownerClause — so keyed by collection it discloses one caller's count to another, and keyed correctly it fragments until the hit rate stops being the win. So (a), capped — at 1,000,000 rather than the 50,000 first proposed, because at 100,000 rows a badge reading '50k+' tells a manager LESS than '100k' does, and deliberately the SAME number as the search ceiling so the app has one place where counting stops rather than two. It can only ever do LESS work than before (the inner LIMIT stops a scan that previously ran to the end), which was the owner's condition, met by construction. Measured, not assumed: on 14 Aug 2026 the largest collection in the app is the activity feed at 2,253 rows, about 400x under the ceiling, so no screen renders differently today. Honest limitation: a bounded million-row scan is a CEILING, not a cheap query — a constant-time count needs a counter maintained by every write, named and not taken.",
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
    law: "EVERY COLOUR RESOLVES THROUGH A TOKEN. No screen in `web/`, `web-portal/` or `shared/` may name a Tailwind colour ramp (`amber-*`, `emerald-*`, `red-*`, `green-*`, `blue-*`, `slate-*`, `gray-*`, `zinc-*` …) or write a hex literal. What a colour MEANS has a token — `warning`, `success`, `destructive`, `muted`, `primary`, `chart-1` to `chart-5` — and a mark comes from the chart series (UI-RULEBOOK C6). The files that legitimately hold hexes are DATA in `PALETTE_LITERAL_OK`, each with its reason, and rot-checked so the list can only shrink.",
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
    law: "EVERY SWITCH ON THE PERMISSION MATRIX DECIDES SOMETHING. The matrix is a grid, so a module gets four boxes whether or not four decisions exist behind them — and a box that decides nothing is one an owner ticks, saves, and believes they granted by. The offered set is data (`MODULE_OFFERED_RIGHTS`, exceptions only, so it can only shrink), and the consulted set is DERIVED off the source: literal `requireRight`/`gated`/`gatedBody` pairs, the MCP `TOOL_GATES` strings, every module in `ACTIVITY_GATE_MAP` (which the record feed asks for `read` on) and every import `TARGETS` module (which the importer asks for `create` on). The check fails BOTH ways. Offered-but-unasked is theatre. Asked-but-unoffered is worse and is the half that matters: a door written against a right no role can be given refuses everybody, including the Admin role, which is locked and cannot be edited to fix it. Earned on 21 Aug 2026, when the owner asked what the twenty-three rows were for: fifteen of the eighty-eight boxes decided nothing, seven of them undocumented, and one whole module (`screens`) had four boxes and no door — its two doors gate on `teams:update`. Two more modules, `learning` and `marketing`, still held permission rows six weeks after the product purged them, because a purge deletes forward and migration 0021 had CROSS JOINed them onto every role.",
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
    law: "THE TOOLBAR, SEARCH INCLUDED, IS A DEFAULT — NEVER A PER-SCREEN CHOICE. Every collection/data-view screen draws its toolbar's search box UNLESS a named, reasoned entry says otherwise. Two censuses, off the disk, never a hand-list: every `BASE_RECIPES` entry (`web/lib/screens.ts`) whose recipe carries a `CollectionConfig` must have `searchable: true`, or be named in `TOOLBAR_EXEMPT`; and every `<ToolbarRow>` call site across `web/` and `web-portal/` (`web/components/deep-link/screen-bits.tsx`'s own bespoke toolbar, reached by a bounded collection with no recipe search to inherit) must pass a `search` prop, or be named in the same registry. Both directions are rot-checked: an exemption whose file no longer matches the condition it was pinned for fails the build, so the list can only shrink. THE THIRD CENSUS (ii-b, 4 Sep 2026) is the portal by ROOM rather than by toolbar — that front door draws no `<ToolbarRow>` at all, so for as long as (ii) was the whole law it reported green on the client's entire app by finding nothing to inspect. THE FOURTH CENSUS (iv, 11 Sep 2026) IS THE ONE THAT DOES NOT STAND ON A TOOLBAR, and it is here because all three above key on a TAG THE FIX ITSELF PUTS THERE: a recipe, a `<ToolbarRow>` call site, a `<CollectionHeading>`. A wall of records built by hand is invisible to every one of them BY CONSTRUCTION, which is how Settings \u203a Modules shipped twelve cards and no search box under a green build on 10 Sep 2026 \u2014 and how it became visible to census (ii) the NEXT day, when the client asked for the toolbar herself and the screen gained a `<ToolbarRow>`. A law you enter by being fixed is a law that could never have caught you. SO THE SUBJECT IS THE WALL: every component under `web/`, `web-portal/` or `shared/web/` that renders the kit's `CardGrid` or the kit's `List` over a `.map()` has DECLARED itself a wall or a register of records \u2014 those two parts exist for nothing else, the kit's own header calls `CardGrid` \"a wall of record cards\", and no comment can satisfy the predicate. IDENTIFIED BY IMPORT BINDING AND NEVER BY TAG NAME, read off the file's own import of `@shared/ui/components/card-grid/card-grid`, `@shared/ui/components/list/list` or `@shared/web/list-compat` (the app's own compat seam, which IS the kit's `List` one hop away and is how seven call sites reach it) \u2014 so Phosphor's `List` ICON and `agent-markdown.tsx`'s `const List = block.tag` are not walls, and a renamed import still is. THE ROOM IS THE COMPONENT: the nearest enclosing function with a Capitalised name, React's own statement of what a component is. A lowercase local helper climbs, and a `<section>` is emphatically NOT the boundary \u2014 `sprints-screen.tsx` groups one collection into five state sections that ONE toolbar narrows, so rooming by section would report the screen WITH the toolbar as the screen without one. SEARCHING IS FOUR SIGNALS, each grounded in something already held shut: `<ToolbarRow>` (census ii requires its `search` prop), `<PagedFind>` (draws an unconditional `<SearchInput>`, no per-caller way off), `<SearchInput>` (the kit's own control) and `useDoorSearch` (the portal's way of asking the DOOR, which R63 already derives its portal toolbar owners from). A GROWING WALL MAY NOT BE EXEMPTED AT ALL \u2014 `hasMore`/`loadMore`/`<LoadMore>` means the collection grows with use (R14), and the exemption this law allows is \"a search box over a handful of rows is a control that cannot do anything\", which is false the moment the handful is a page of something larger. The same refusal ii-b already makes for a paging portal room. EXEMPTIONS ARE KEYED `path#Component`, not per file: a file-keyed reason lets the NEXT wall added to that file inherit an argument written about a different collection, which is how a bounded room's exemption comes to cover a growing one. TWO THINGS ARE OUT BY SCOPE RATHER THAN BY EXEMPTION: `shared/web/list-compat.tsx`, which DECLARES the app's `List` (the same reason (ii) skips `web/components/deep-link/screen-bits.tsx`, which declares `<ToolbarRow>`), and `shared/web/screen-engine/`, the recipe engine, whose walls are every recipe's body at once \u2014 whether one of those collections searches is its own `CollectionConfig.searchable`, which census (i) holds entry by entry, and judging the engine here would ask one component to answer for every collection in the app. IT UNDER-REACHES ON PURPOSE, R67's direction: a hand-rolled `<ul>` is not caught \u2014 `web-portal/components/waiting-on-you.tsx` and the local `TeamPanel` on `web/components/screens/kwapso-screen.tsx` are real, growing registers this census cannot see \u2014 and no non-fuzzy predicate can, because the fuzzy one files a conversation thread and an activity feed as data views. It also asks the question of the COMPONENT, so `settings-screen.tsx` draws three walls in one and the Modules toolbar answers for the Team tab's two navigation lists as well; both are menus rather than records, so nothing is lost today, and it is written down rather than discovered later. A TRIPWIRE PULLS BOTH WAYS: the census must find walls at all, and at least one must PASS on its own search \u2014 a scan over nothing and a search predicate gone blind both report an app that needs six exemptions.",
    why: "The client's own words, correcting a narrower answer already given once: \"I don't care here. You're giving me specifics, and I told you that the toolbar, including the search, should be absolutely everywhere we have a data view or a collection view. Stop hardcoding this. Just write it as a rule.\" A recipe's `searchable` flag and a bespoke `<ToolbarRow search={…}>` prop were both ORDINARY optional fields before this law — nothing stopped a screen from omitting either, and two did, silently: Tasks' Calendar tab and Triage both drew a toolbar with a button and no search box at all, reasoned only in a code comment nothing read at build time (\"the calendar has no search of its own\"). Flipping the default is the only fix that cannot regress the same way twice — an opt-IN can always be forgotten by omission, which is exactly what happened; an opt-OUT has to be written down, named, and given a reason a reviewer can read, in the same shape R31/R32/R29 already use for their own reasoned exceptions. A collection genuinely and permanently empty of rows (`WaveFinder`'s and Sprints' own \"nothing to search yet\" fallback) is the one legitimate reason left, because a search box over zero rows is a control that cannot do anything — and that reason is now written down rather than assumed. SUPERSEDED IN PART, R50 (2026-09-03): that fallback shape — a bare `<ToolbarRow actions={…}>` reached only once the collection was empty — is exactly how a create button kept escaping this law's own two censuses, because both only ever asked whether `search` was present, never whether `actions` agreed with it. Both call sites now carry one `<ToolbarRow>` gated by R50's own required `empty` prop instead, and `TOOLBAR_EXEMPT` no longer names either.",
    checkId: "toolbar-shows-search",
    status: "enforced",
  },
  {
    id: "R49",
    dimension: "ui",
    law: "THE GAP BETWEEN A TOOLBAR ROW AND WHAT IT SITS ABOVE IS ONE NUMBER, PAID BY THE ROW ITSELF, NEVER A PER-SCREEN MARGIN. `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) pays `--toolbar-content-gap` (`web/app/globals.css`) as its own trailing margin, on its own root, so every call site gets it for free. No call site may ALSO wrap the row in a gapped flex column or space-y stack, and no call site may pass a competing `mb-*` in its own `className` — either is the same number being spent twice, which is how it grows past what it was meant to be. Checked as a census off the disk: `ToolbarRow`'s own definition must carry the token, and no `<ToolbarRow>` call site (or the variable a screen names `*[Tt]oolbar*` and renders in its place) may pass a hardcoded `mb-*` of its own, or sit in a BOX that spaces its own children apart — a `gap-*` on a flex column, or a `space-y-*` stack, which needs no flex at all — with something rendering after the row inside that box, unless named in `TOOLBAR_CONTENT_GAP_EXEMPT` with the real reason. THE SECOND CLAUSE WAS DEAD FOR ITS WHOLE LIFE AND WAS REBUILT ON 11 SEP 2026: it anchored its wrapper pattern to the END of a 400-character window and then tested the code BEFORE that wrapper against a whitespace-only pattern, so it returned null at all twenty-four call sites and a deliberate `gap-4` on a toolbar's own wrapper could not turn it red. The box is resolved properly now — a JSX tag census carrying `stripComments`'s own afterValue bit so a generic type argument is not counted as an opening tag, fragments walked THROUGH because they paint no box, and a COMPONENT wrapper followed to the element it puts its children in (`{children}`, else the element wearing the props spread). That last hop found the only real offender, `<TeamPanel>`'s `flex flex-col gap-4` under the members wall. A row that is the LAST child of its box is not an offence, because a column gap with no following sibling never reaches the content — which keeps `client-org-panel.tsx`'s deliberate heading-and-row pairs green instead of exempted. A row drawn at a component's OWN root is spaced by whoever renders that component and is out of a file census's reach; three call sites are in that shape and none sits in a gapped box.",
    why: "The client's own words, item 5 of the 2026-09-03 spacing round: \"tehre's wahy too much space between the toolbar and the contenta\" — confirmed on every screen she checked, not a detail-screen-only thing. It had drifted into five different numbers doing the identical job: a wrapping `flex flex-col gap-N` div (`gap-2`/`gap-3`/`gap-4`/`gap-6`, 7.5–22.5px), a `space-y-3`, and a `className=\"mb-4\"` passed straight to the row — fourteen call sites, four mechanisms, no shared owner. The exact shape `--tab-content-gap` already fixed for a tab strip and its panel (R48's neighbour law in spirit, same client session), read the other way round: the STRIP pays its own trailing space so a caller cannot forget it or invent a new number, and a margin on a sibling is the thing that drifts — this law spends the same `--space-5` `--tab-content-gap` already uses, because both are 'the gap between a control strip and the content under it' and a system with one rhythm does not mint a second number for the same sentence.",
    checkId: "toolbar-content-gap",
    status: "enforced",
  },
  {
    id: "R50",
    dimension: "ui",
    law: "NEVER TOOLBAR ON AN EMPTY COLLECTION — NOT EVEN THE CREATE BUTTON. R48 made the search box a default; this makes the WHOLE row answer one question together. `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) takes a required `empty` prop — true when the collection holds zero rows before any search or filter narrows it — and returns `null` unconditionally when it is true, before any other slot (search, filters, sort, view, or `actions`, the create button) is even considered. `<PagedFind>` (`web/components/records/paged-find.tsx`) takes the equivalent required `restingEmpty` prop for the same reason on the door-searched half of the app, suppressing its own search/filters/sort/match-count/actions row the identical way while a genuinely empty collection is not being searched. `<SectionWithCreate>`'s own header-drawn create button (`showCreateInHeader`) carries the same gate through an optional `empty` prop, for the one shape neither `folderTabs` nor `useKitPanel` already covers. Two censuses, off the disk: every `<ToolbarRow>` call site across `web/` and `web-portal/` must pass an `empty` prop DERIVED FROM THE COLLECTION'S OWN ROW COUNT, and every `<PagedFind>` call site must pass a `restingEmpty` prop the same way — a prop that is MISSING, or hardcoded to a bare `{true}`/`{false}` literal (the row answering the question with a constant rather than real data), must be named in `EMPTY_TOOLBAR_EXEMPT` with the real reason. Rot-checked both ways, so the list can only shrink. THE THIRD CENSUS, added 2026-09-10, is the same sentence one layer down: a section heading built from a `<div>` and an `<h2>` is not a `<ToolbarRow>` and was outside both censuses above BY CONSTRUCTION, so five sections drew a create button over a collection holding zero rows while the empty state below them already offered the first add. `AddButton` (the app's one create-button seam, same file) therefore takes its own optional `empty` prop and opens with `if (empty) return null` before it draws anything, exactly as the row does; and every `<AddButton>` call site across `web/`, `web-portal/` and `shared/web/` must either sit INSIDE a toolbar's own `actions`/`renderActions` slot — where the row has already answered the question and a second copy of the answer is a second thing to get wrong — or pass `empty`, derived from the collection's own row count and never a bare `{true}`/`{false}` literal, or be named in the same registry. `SectionWithCreate`'s header button is not censused: it is drawn inside the declaring file, where `showCreateInHeader` already carries `&& !empty`, and that conjunct is asserted directly as part of the central-guard clause. AMENDED 2026-09-11 \u2014 THE ROW MAY DRAW EXACTLY ONE THING WHEN EMPTY, AND IT IS THE SECTION'S OWN NAME. The client ruled that a settings section's title sits INSIDE its container, above the toolbar: \"ticket types should be on top of the searchbar inside the container without subtitle, make this. always\". `<ToolbarRow title>` is where that title is drawn \u2014 a STRING and never a node, so no call site can PLACE it, which is the same move R53 made for the sort control \u2014 and it has to be the row because the pinned band is the only thing inside the container a title can ride: drawn as the card's first child instead, it pushes the pinned box's top edge into the middle of the title block, where the box's `::before` cuts two page-coloured notches into the card's sides at rest (R63 part 3's own `band`, whose note names this exact day). SO THE EMPTY EXIT RETURNS `heading` RATHER THAN `null`, and `heading` is `title ? \u2026 : null` \u2014 seventeen of the eighteen call sites pass no title and are byte-for-byte unchanged. THE LAW'S SENTENCE IS UNTOUCHED: a title is not a toolbar. It is pressed by nobody, it offers nothing, and a section that loses its NAME at the exact moment its collection is empty is R67's Access-tokens finding (\"she was looking at the branch with nothing in it\") said about the heading instead of the register. THE PROXY GOT TIGHTER, NOT LOOSER. The clause asserted the literal `if (empty) return null`, which proved the shape only on the day somebody read it; it now asserts `if (empty) return heading`, that `heading` is declared exactly once as a conditional on `title`, and that nothing reads it before that declaration \u2014 so the empty exit is PROVABLY a title block or nothing, and can never come to carry a slot.",
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
    law: "A SECTION ON THE TEAM AREA'S STRIP HAS A DOOR, OR NAMES THE SCREEN THAT TOOK ITS PLACE — AND THAT SCREEN CARRIES ITS ACTS. R40 asks whether a stored file reaches a person; this asks the same question one layer up, about a CAPABILITY. `TEAM_SECTIONS` (`web/lib/pages.ts`) entries with `placement: \"tab\"` live only on the team area's own strip, and the app's one entrance to that area is the \"This team\" list on Settings › Team, which is DERIVED from that same table minus the keys its own filter subtracts. So a subtracted key has no door at all unless somebody built it one, and the law is that it must SAY where: a `SECTION_HOSTED_ELSEWHERE` line naming the file that carries that section's material. FOUR CLAUSES, every census off the disk and each end grounded in a different oracle so the check can never be a parser agreeing with itself. (i) THE OFFERED HALF IS REAL: the `adminSections` panel actually soft-navigates into `/t/<teamId>/<segment>`, so the subtraction cannot be checked against a door that has itself been deleted. (ii) EVERY SUBTRACTED TAB SECTION HAS AN ENTRY, and every entry names a key that is still both a tab section and subtracted — rot-checked both ways, so the list can only shrink and a stale line cannot excuse a live gap. (iii) THE NAMED FILE EXISTS. (iv) AND IT CARRIES THE SECTION'S ACTS: the acts are DERIVED from the recipes bound to that module in `web/lib/screens.ts` (`action:` ids), each act is resolved to the DOOR CLIENT CALL its own dispatcher makes in `web/lib/use-screen-actions.ts` (`tenancy.setMemberRole`, `tenancy.removeMember`, `tenancy.revokeInvite`, …), and the host file must make that same call. Nothing is hand-listed but the host filename: the sections come from the nav table, the subtraction from the screen's own filter literal, the acts from the recipes, and the proof of an act from the dispatcher's own source. (v) AND THE CONTEXTUAL HALF, WIDENED 11 SEP 2026. Clauses (i)-(iv) walk `placement: \"tab\"` rows only, so a section was noticed only when somebody SUBTRACTED it — and a `placement: \"contextual\"` row was never on the \"This team\" list to be subtracted from, so it could carry real capability with nothing linking to it under a permanently green build. `dropdowns` was moved tab -> contextual on 2026-09-01 and `ManageDropdownsLink` was repointed at `?tab=choices` the same day; from that moment nothing in the app opened `/t/<teamId>/dropdowns` — a screen with an import door, an export and a record split — and it sat unreachable for ten days. So a contextual section must be REACHED by a literal navigation under `web/` whose path ENDS at its segment (a backtick, a quote or a `?` after it), or it joins the same `SECTION_HOSTED_ELSEWHERE` registry, which is rot-checked against BOTH kinds of doorless section. A LINK CENSUS HERE AND NOT ON THE TAB HALF, and the difference is the argument: the objection above is that the one real tab door is written over a derived list where the segment is a variable, and a contextual section is never in that list. ENDING AT THE SEGMENT IS THE CLAUSE WITH THE TEETH — the 2026-09-09 census found exactly one link into the team area and it pointed at a member's RECORD, so a match on `/dropdowns/<id>` must not count as a door to `/dropdowns`. THE COST: only LITERAL paths are visible, so a contextual section reached by a computed segment reads as unreachable and needs a written line — a reviewer reading a claim instead of a build going quiet. Earned twice on the day it was written: the widening turned the build red on a second orphan nobody had filed, `processes`, whose collection screen is linked to by nothing at all. (vi) THE TAB STRIP ITSELF RETIRED, 2026-09-14 — a client screenshot of a standalone Members page still carrying its own tab strip (Members · Member roles · Invites), and the ruling that closed it: \"what is this? told you to kill it. Now this only lives on settings / team.\" `members`/`roles`/`invites` were the only rows that had EVER carried `placement: \"tab\"`, and the 2026-09-09 pass had already subtracted all three from the \"This team\" list days earlier — but subtracting a key from that list only ever took the ADDRESS off the list, never off the app, and the collection screens themselves kept resolving, strip and all, for anyone who still had a bookmark or the two legacy shims (`web/app/members/page.tsx`, `web/app/roles/page.tsx`). So this time the SCREENS went, not just the list row: all three moved to `placement: \"contextual\"`, `web/components/deep-link/module-content.tsx` sends every one of their addresses to Settings › Team instead of drawing a page, and clauses (i)-(iv) above are now permanently vacuous by construction — `web/test/rules.test.ts` proves that positively (every TEAM_SECTIONS row that ever carried `placement: \"tab\"` is asserted `\"contextual\"` by name) rather than trusting an empty set to mean the same thing an empty set always used to mean. Clause (v) is what actually holds the three now: none is reached by a literal ending at its segment, so all three carry a `SECTION_HOSTED_ELSEWHERE` line same as `processes` does.",
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
    law: "A TITLED SECTION \u2014 OR A TAB PANEL \u2014 STANDS ON PAPER; NOTHING IS DRAWN ON THE BARE PAGE GROUND. The FIRST subject is every `<section>` ELEMENT under `web/`, `web-portal/` or `shared/web/` \u2014 the source's own statement that this is a section of content. It was a `<section>` CARRYING A HEADING of its own (`<h1>`\u2026`<h4>`, the kit's `<Headline>`, or `<CollectionHeading>`) until amendment 4 (2026-09-11) dropped the heading requirement, because the client's fourth ruling DELETED two headings and under the old subject that would have taken both sections out of the law on the same commit that answered her \u2014 a heading was only ever a proxy for the `<section>` tag. A CONTAINER IS DERIVED, never listed: the paper family is read off the kit's own `shared/ui/foundations/tokens/tokens.css` \u2014 every `--surface-*` token, plus an alias MORE THAN ONE of them points at (which is `--card`, and is why `bg-card` counts and `bg-muted`, reached by `--surface-idle` alone, does not), MINUS `--surface-page`, which the kit defines as `var(--background)` and which IS the ground \u2014 AND MINUS EVERY FILL THAT RESOLVES TO THE GROUND'S OWN COLOUR IN EITHER PALETTE (amendment 1, 2026-09-11). The family used to subtract the ground by SPELLING, and four survivors are the page colour: in light `--card`, `--surface-raised`, `--surface-lift` and `--surface-selected` all resolve to #FFFEF9 and so does `--background`; `--surface-idle` and `--surface-record-footer` collide in dark at #141310. So a body painted `bg-card` and standing on the page was answering \"I am contained\" at CONTRAST 1.000 \u2014 the exact pairing this rule's own `why` cites as the bug it was written for. Values are resolved off `tokens.css` through its `var()` chains, per palette, with CSS COMMENTS STRIPPED FIRST because that file quotes declarations inside its own prose and an unstripped read fills the light map with sentences. BOTH palettes, not either: a container invisible in one theme is what this law exists to stop. This does not say `bg-card` is never a container \u2014 a raised card on soft paper is the kit's own \u00a72.6 pairing \u2014 it says `bg-card` cannot contain what stands on the PAGE, and by the time the set is consulted nothing above has painted. A section passes in exactly TWO shapes, and they are one sentence read from either end. Either the section IS the box \u2014 it or a JSX ancestor in its own file carries a paper fill, which is what `web/components/team/team-panel.tsx` does \u2014 or EVERY BODY it draws stands in one, which is what `CollectionFrame` does on every collection screen in the base: heading outside, content on paper. THE CLAUSE WITH THE TEETH IS \"every body\": containment is asked PER BRANCH, walking through fragments, ternaries, `&&` and `.map()`, so a section cannot pass on the strength of the one branch that happens to have a panel in it. FOUR THINGS ARE DELIBERATELY NOT CONTENT, each a decision rather than a convenience: the TITLE BLOCK (any child that itself carries the heading \u2014 a heading is not something that stands on anything, and the create button rides beside it); PROSE (`<p>`, `<span>`, `<small>`, `<em>`, `<strong>`, `<a>`, `<br>` \u2014 a sentence under a heading is part of the title block, and every settings section in the app is heading + sentence + control); an ACT (a lone `<Button>`, or a component that renders nothing but one \u2014 \"Show older\", \"Try again\"; a control is pressed, not read); and an OVERLAY (a component that reaches a portal, resolved transitively \u2014 `<AddLinkDialog>` is a `<FormShellDialog>` is a kit `<Sheet>` is a Radix portal, and stopping at the first hop reported a slide-in form as content lying on the page). Anything `hidden`/`sr-only` is skipped for the same reason. The census is a real syntax tree, not a regex over indentation, and it resolves what a component paints through the module-scope constants its own file declares (`Skeleton` \u2192 `skeletonVariants` \u2192 `cva(PULSE, \u2026)` \u2192 `bg-surface-quiet`) \u2014 BUT WHERE THAT FILL COMES FROM A `cva`, THE VARIANT THE CALL SITE SELECTS DECIDES (amendment 2, 2026-09-11). Reading a component's whole text counts every variant's classes whether or not anybody reaches for them, so `<CardGrid>` \u2014 whose `tone` DEFAULTS to `bare`, which paints nothing \u2014 answered \"I paint\" off the `panel` option declared two lines below it, and that call was the wall the client reported. The literal a site passes decides, else `defaultVariants`; a prop that is not a literal stays \"may paint\" if any option does, so the walk keeps under-reaching, and a `cva` the component does not actually call is never read. THE SECOND SUBJECT IS A TAB PANEL (amendment 3, 2026-09-11): every body a `renderPanel` returns, per branch. A tab panel is titled by its STRIP, so it carries no heading of its own and the first subject could never reach it \u2014 14 hosts and 70 bodies outside the law by construction, including the settings tabs two of the client's three rulings were about. It passes the same two ways: the `<TabsView>` MOUNT is boxed by an ancestor (11 of 14 are, because a record detail hands its whole strip to `RecordScreen`'s card; without the ancestor walk the clause reports 18 offenders and 14 are that container seen from inside), or every body stands on paper. Panel exemptions are keyed `path#tabValue` rather than per file, because one file's tabs are not one decision. Exceptions are data in `UNCONTAINED_SECTION_OK` with a reason each, rot-checked, so the list can only shrink. A blindness tripwire fails the build if the derived fill family, the file walk, or the heading census ever comes back empty, if no section passes at all, if the panel census finds no hosts or boxes all of them \u2014 and, for amendment 1, if the two palettes resolve `--background` to the same literal or the by-value subtraction stops dropping `--card`, because a resolver that has quietly stopped resolving returns the old family and passes exactly like a law that works. AMENDMENT 4 (2026-09-11) \u2014 PROSE IS CONTENT WHEN IT IS NOT INSIDE THE THING IT DESCRIBES, AND A SECTION DOES NOT LEAVE THIS LAW BY DELETING ITS TITLE. This is the first amendment that is not a hole being closed: it is THIS LAW'S OWN WRITTEN EXEMPTION, OVERRULED BY THE PERSON IT WAS WRITTEN FOR. The PROSE exclusion above used to read, in full, \"`<p>`, `<span>`, `<small>`, `<em>`, `<strong>`, `<a>`, `<br>`. A sentence directly under a heading is part of the title block. Every settings section in this app is heading + sentence + control, and boxing the sentence would be a different design, not this rule\" \u2014 a prediction about what the client wanted, made on her behalf, in a lane she was not in. On 2026-09-11, looking at the screen that exemption blessed, she ruled the opposite. So prose is exempt only where it is IN the title block (already skipped as a unit) or inside a body that paints (already skipped by the subtree walk); a sentence that is its OWN body, standing on the page ground BESIDE the box it describes, is content and fails. TWO TAGS SURVIVE, neither for being prose: `<br>` draws nothing readable, and `<a>` is an ACT \u2014 \"a control is pressed, not read\" is this law's own sentence about a lone `<Button>`, and catching the link beside the button would be the law disagreeing with itself about one decision. AND THE SUBJECT LOST ITS HEADING REQUIREMENT IN THE SAME AMENDMENT, which is the sharpest argument here for deriving a subject rather than picking one: her fix DELETED two headings, so under the old subject the very commit that answered her would have taken both sections out of the law. A law you leave by deleting your title rewards the wrong fix. The subject is now every `<section>` ELEMENT \u2014 the source's own statement that this is a section of content, which the heading was only ever a proxy for. WHAT THIS STILL CANNOT SEE, measured rather than assumed: the seven MODULE SETTINGS pages, which are the app's largest heading+sentence-on-the-ground surface and are outside for two independent reasons \u2014 their root is a `<div>`, and their words arrive as PROPS off the `MODULE_SETTINGS` table rather than as literals at the position that draws them. A variant that also judged prose inside the title block was written and measured the same day and is NOT here because the census came back byte-identical: every title block in this repo that pairs a heading with a sentence lives in a `<div>`-rooted component, so the clause would have enforced nothing, and a clause that measures zero is what this file's tripwire refuses. AMENDMENT 4 HAS ITS OWN TRIPWIRE, because both of its halves are SUBTRACTIONS from what used to be waved through and a subtraction that stops subtracting is invisible: at least one `<section>` with no heading must be in the census (else the widening admitted nothing and the two un-titled sections are outside the law again), and at least one bare body must be a readable sentence (else the narrowed exemption catches nothing and the law has silently reverted to the version she rejected, while passing). AMENDMENT 5 (2026-09-11) \u2014 A COMPONENT PAINTS WHAT ITS OWN ROOT PAINTS, AND THIS AMENDMENT EXISTS BECAUSE THIS LAW TURNED RED ON THE COMMIT THAT FIXED FOUR SCREENS. The client, a FIFTH time, over a screenshot of Settings \u203a Ticket settings: \"ticket types should be on top of the searchbar inside the container without subtitle, make this. always\" \u2014 the first of the five that says where a title GOES rather than only where it may not stand. THE ANSWER IS A CHOKEPOINT, NOT A SIXTH REPAIR, and it is the move amendment 4's own blind-spot note called for: the fourteen module settings sections are unreachable here because their root is a `<div>` and their words are PROPS, and reaching them means judging a component by the props it is handed \u2014 a different oracle with a real cost, and \"we fixed fourteen sections and nothing stops the fifteenth\" is the state that produced this week. So the title stopped being something a call site can PLACE. `<ToolbarRow title>` takes a STRING (never a node, the same move R53 made for the sort control) and draws it inside the pinned band; `shared/web/settings-section.tsx` owns the box AND the heading everywhere there is no toolbar; and `MODULE_SETTINGS` lost its `description` COLUMN with the sentences, so a fifteenth section has nowhere to declare a subtitle. A fault that cannot be written beats a census that catches it afterwards. WHAT THAT COST THIS LAW, AND WHAT THE AMENDMENT IS. `componentPaints` reads a component's own text and its own file's constants and deliberately does NOT follow what it RENDERS \u2014 the version that did was thrown away because `CollectionEmptyState` resolves a fill two files away and every uncontained zero register in the app came back green. The moment `ThemeSection`, `ScaleSection`, `SpineSection` and `LanguageSection` stood in a shared box instead of spelling `bg-surface-panel` themselves, Settings \u203a Appearance \u2014 which had passed since the day this law was written \u2014 reported as a bare `<div>` on the page ground. A law that reddens when four screens are fixed by one component is measuring the WRITING and not the SCREEN. SO THE WALK FOLLOWS ONE EDGE: the single element a component RETURNS, resolved the same way, transitively (`ThemeSection` \u2192 `SettingsSection` \u2192 `<section className=\"\u2026 bg-surface-panel \u2026\">`, three files, one edge each). THIS IS NOT THE THROWN-AWAY VERSION and the difference is in kind: that one followed every component a component renders, so a fill anywhere in the subtree answered for all of it; this follows the box the component IS, which is the box its caller is standing in too. `CollectionEmptyState` roots at a bare `<div data-slot=\"collection-empty-body\">` and still does not paint. EVERY return, not the last one \u2014 a component with an early `return <ErrorPanel/>` has more than one root and they are not interchangeable, which is this law's per-branch clause read one level down, keeping the same under-reaching direction. MEASURED: the root walk changed exactly ONE verdict in the whole census, the false one it was written for. ITS TRIPWIRE PULLS BOTH WAYS, because a widening fails invisibly in two directions: at least one component must be found to paint through its own root (else the amendment admitted nothing and the chokepoint has been unpicked), and `CollectionEmptyState` must NOT paint (else the thrown-away version is back and every uncontained zero register is green again). AND `UNCONTAINED_SECTION_OK` LOST SIX LINES ON THE SAME DAY THEY WERE WRITTEN \u2014 the three Appearance sections, both work-module sections and the portal's savings page, which had been a census \"awaiting ONE ruling\" and got one. The outlier (\"The section description: no, I want to keep it\", 2026-09-10) is OVERRULED by the two clearer \"no subtitle\" statements either side of it, the later one drawn on a screenshot; the reasoning is recorded at each deletion rather than only here. `impact-screen.tsx` is the one file the portal block has ever lost: its own source argued in writing that \"one fewer drawn line is worth having\" on the screen a client shows other people, that comment is KEPT verbatim beside the container it lost to, and what decided it is that a screen arguing itself out of a law in its own comment is the pattern all five rulings overturned somewhere else. AMENDMENT 6 (2026-09-14) — AN OVERLAY IS ONE OF THE KIT'S NAMED SCRIM-STANDING SURFACES, NOT \"RENDERS ANY PORTAL\", AND IT IS ASKED PER ROOT RATHER THAN OF ANY TAG THE TEXT MENTIONS. The OVERLAY exclusion above was defined as \"a component whose declaring file renders through a portal\", and every floating Radix primitive portals — a tooltip clears an overflow ancestor exactly the way a modal clears the page, for a different reason. An instrumented run of the file-wide test found 44 titled sections and 15 tab panels judged, with 20 skip decisions, of which nine excused a component that is plainly not an overlay: `<PagedFind>`, `<ScreenRenderer>`, `<TodosPanel>`, `<AppSavingsChart>`, `<MatchKind>`/`<StepKind>`, `<BrandPanel>`, `<ModuleAutomations>` and `<SettingsChoicesPanel>` — several of them because the OLD test read \"does this component's DECLARING FILE contain a portal anywhere\", so one modal declared anywhere in a multi-panel file (`kwapso-screen.tsx`, `settings-screen.tsx`) marked every OTHER component in that same file, whether or not it draws one. So the test is narrowed to a named family — `Sheet`/`SheetContent` and `AlertDialog`/`AlertDialogContent`, R59's own two shapes (\"a surface that COLLECTS presents as Sheet, a surface that ASKS a yes/no question is AlertDialog\"), plus bare `Dialog`/`DialogContent`, R59's third, discouraged-but-live centred shape — and asked of EVERY ROOT a component can return (amendment 5's own `rootElements`, reused, so a ternary's two arms are two roots), not of any tag its text merely mentions: `ScreenConfirm` (one root, an `AlertDialog`) still resolves true in two hops; `ScreenRenderer`, whose OTHER branches are a bare `<div>` and an ordinary `ScreenLayer`, no longer inherits its one confirm branch's verdict. POPOVER WAS TRIED AND MEASURED OUT: a first pass read R59's own tooltip sentence (\"every OTHER floating thing is `--popover` under `--shadow-overlay`\") as putting Popover in the family, and it regressed the law's own reference shape — `CollectionFrame`, named above as one of the two ways a section may stand, reaches for a `<Popover>` on its filter bar, and with Popover included `isOverlay(\"CollectionFrame\")` came back true, which is a worse failure than the one this amendment fixes. Popover is deliberately out, the same reasoning that already keeps `Select`/`Combobox`/`DropdownMenu`/`ContextMenu` out: each is a CONTROL whose trigger stands in the section's flow, already covered by the ACT exclusion. THE SKIP SET IS PINNED, in the test file (`OVERLAY_FAMILY_OK`), names rather than a bare count, rot-checked both ways, so a component that starts returning one of these tags is a reviewed addition rather than a silent skip. AMENDMENT 7 (2026-09-14) — A BARE IDENTIFIER IS AN UNRESOLVED BODY, NOT A ZERO ONE. The per-branch walk (`bodies()`) resolves a ternary, a `&&`, a `.map()` and a JSX literal, and nothing else — a bare `{children}`/`{body}`/`{content}` expression matched none of those branches and was silently dropped, so a chokepoint that forwards its caller's content without painting itself would report zero bodies, which reads as \"nothing to judge\" rather than \"the walk could not see in\". `shared/web/settings-section.tsx` draws exactly that shape and is unaffected today only because its own `<section>` carries `bg-surface-panel` directly, resolved by shape (a) before `bodies()` is ever reached — a fact the test's own header states rather than assumes. A bare identifier is now COUNTED, not pushed (a literal `<null>` finding would misdescribe what happened), pinned at zero against the real app and proved alive against an owned fixture, the same two-part discipline amendments 4 and 5 already use. THE CORRECTED CENSUS, RUN: three sections the widened family newly reaches. `web/components/accounts/contacts-by-company.tsx`'s per-company `<ScreenRenderer>` and `web/components/screens/kwapso-screen.tsx#brand`'s `BrandPanel` are named in `UNCONTAINED_SECTION_OK` with real reasons (the first is unreached dead code awaiting a wiring decision, not a styling one; the second matches its already-exempted `#team`/`#default` siblings on the same mid-change screen). `web-portal/components/impact-screen.tsx`'s `<AppSavingsChart>` is FIXED — wrapped in `bg-surface-panel`, the same tone the rest of that file already uses — rather than exempted under N6 (\"a block earns a container only with two or more rows/fields\"), because this exact file's own history already records the client overruling that argument once, in her own words: \"a screen that argues itself out of a law in its own comment is the pattern five rulings in three days have each overturned somewhere else\". AMENDMENT 8 (2026-09-14) — TWO BLIND SPOTS NAMED BY THE LANE THAT HAD TO WORK AROUND THEM: an import binding now resolves ONE HOP through the same file list this walk already reads, so a tag written under its alias (`KitCollectionFrame` for the kit's own `CollectionFrame`) is not read as painting nothing; and `componentPaints` no longer scans a component's whole function as one string — an early guard return (`if (cond) return …`, not the function's last statement) is cut before the scan, so an unrelated NoAccess/error/loading branch can no longer vouch for content it has nothing to do with, and the scan gained a same-file-IMPORT hop beside the same-file-constant one it already had, because `rootPaints` cannot follow a Fragment root or a `{children}`-forwarding wrapper (`module-automations.tsx`'s `ModuleAutomations`, `settings-choices-panel.tsx`'s `SettingsChoicesPanel`) the way it follows an ordinary single-root chain. AMENDMENT 9 (2026-09-15) — THE SIBLING renderPanel SHAPE, EARNED BY R77 MOVING THREE HOSTS OUT FROM UNDER THIS CENSUS THE SAME DAY IT SHIPPED. R77 (`tab-strips-pin`) rewrote `kwapso-screen.tsx`, `settings-screen.tsx` and `module-settings-screen.tsx`'s own `<TabsView renderPanel={…}>` JSX ATTRIBUTE into `renderFolderTabs(…)` beside a plain SIBLING `(function renderPanel(panel) {…})(…)` — so `STICKY_FOLDER_TABS` pins the strip without pinning the panel's own content along with it, which a `<TabsView>`-rooted `TabsContent` would have done. THE SECOND SUBJECT ABOVE FINDS A HOST BY THAT JSX ATTRIBUTE, so all three screens dropped out of the census the moment they adopted R77 — their `UNCONTAINED_SECTION_OK` lines were deleted as \"matching nothing\" rather than re-judged, and the panels underneath were never fixed. A green that measures nothing is worse than red, and it is this file's own recurring lesson wearing a new shape. SO A SECOND HOST SHAPE IS WALKED, FOUND BY POSITION RATHER THAN BY SPELLING: two JSX children of one element, in order — one that CALLS `renderFolderTabs(`, immediately followed by one that is an IMMEDIATELY-INVOKED function expression or arrow. An arrow IIFE carries no name to match, so adjacency is the whole test, and the named form all three screens actually write (`function renderPanel(panel) {…}`) matches the identical clause. THE MOUNT IS THE SHARED WRAPPER — the JSX parent of both siblings — rather than either sibling alone, the same role `<TabsView>` played for the attribute form: the position a caller would paint a fill on if this host were ever boxed at its own root. MEASURED AGAINST FALSE POSITIVES: `renderFolderTabs(` has three other call sites in the app (`tickets-collection.tsx`, `paged-find.tsx`, `deep-link/screen-bits.tsx`) and not one of them is followed by an IIFE, so the clause reaches exactly the three screens named above and nothing else, today. RE-JUDGED, NOT REASSUMED: the census ran again and found the identical three bare panels `kwapso-screen.tsx#team`/`#default`/`#brand` always had — restored in `UNCONTAINED_SECTION_OK` with the same reasons — while `settings-screen.tsx` and `module-settings-screen.tsx` both pass outright: their own panels resolve through the SAME chokepoints amendment 5 already taught this walk (`SettingsSection`, a kit `<Card>`, `<ToolbarRow>`'s own pinned band), so nothing needed exempting there. MEASURED: 12 attribute-form hosts before this amendment (11 boxed, 0 offenders) became 15 hosts after (11 boxed, 3 offenders, all on `kwapso-screen.tsx`) — the same three bodies this census has always reported for that screen, never a new finding. `judgePanelHost`, in the test file, is now the one function both host shapes call, so the two censuses cannot drift into two answers for one question.",
    why: "THE CLIENT, THREE TIMES IN THREE DAYS. THE SECOND TIME SHE ASKED FOR THE LAW; THE THIRD TIME SHE POINTED AT A SCREEN THE LAW COULD NOT SEE. 2026-09-09, over the Team tab: \"more members in each row, too much blank space. needs container!! nothing on top of white background, its a rule!\" 2026-09-10, over Settings \u203a Integrations: \"but give it a container. once again, nothing shoudl sit on the white, everything contained! (make this a law)\". \"Once again\" is the load-bearing word, exactly as it was in R50: the first ruling was answered at ONE screen (team-panel.tsx, which carries the measured tones), and a fix at one screen is how the same fault reaches the next tab. WHY IT IS NOT \"EVERY SCREEN'S ROOT IS A PANEL\". That version was written first and thrown away: it is either trivially true, or it forbids the shape the whole app already uses and she has already approved \u2014 a heading outside, the content on paper under it. Both shapes pass here. WHAT THE FIRST RUN FOUND, and it is the argument for the law: 22 uncontained sections across both front doors. Eleven were in the AGENCY app and every one of them was an inconsistency WITHIN a screen that already used paper \u2014 the zero register of three lists on the client's org chart, a stakeholder panel's zero, a meeting's calendar zero, the Google connections section's error and skeleton beside rows that DID stand on paper, the profile page's whole activity feed, a sprint board's hand-grouped rows, and the three Appearance option groups on the very tab she was looking at. That last one is the sharpest: the kit's option card is `Card`'s DEFAULT variant, and in LIGHT `--card`, `--background` and `--surface-raised` are all #FFFEF9 \u2014 so those cards measured contrast 1.000 against the page and were held up by a hairline, the identical pairing team-panel.tsx documents from the Team tab the day before. Nobody would have filed any of them as a bug, because a missing surface is only visible in the aggregate and nobody sees the aggregate. All eleven were fixed the same day. THE ELEVENTH FINDING IS THE ONE TO READ: `web/components/team/access-tokens.tsx` drew its ROWS on soft paper and its error, its skeleton and its zero on the page. A check asking \"does this section have a panel in it anywhere\" answers yes and describes the wrong screen \u2014 she was looking at the branch with nothing in it. That is why containment is asked per branch, and it is the difference between a law that catches her bug and one that reports success over it. The remaining nine are the whole CLIENT PORTAL, six files, and they are exempted rather than fixed because the portal is consistent with ITSELF: stacking titled sections on `portal-shell.tsx`'s unpainted `<main>` is its visual language, not six oversights, so giving it panels is a redesign of the client-facing app and belongs in a deliberate pass with her looking at it. Read `UNCONTAINED_SECTION_OK`, not this sentence. THE THIRD RULING, 2026-09-11: \"remember in settings modules card, needs container background.\" Settings \u203a Modules, a wall of `Card variant=\"raised\"` cells on the bare page \u2014 and the law was already written, already enforced, already GREEN over it. THREE INDEPENDENT HOLES HID ONE SCREEN, and closing any two of them would still have left it hidden. (i) THE SUBJECT: a `<section>` carrying a heading of its own, which a tab panel never does \u2014 it is titled by its strip. Every settings tab and every record sub-tab, 14 hosts and 70 bodies, was outside the law the day the law was written, and TWO OF HER THREE RULINGS WERE ABOUT A SETTINGS TAB. (ii) THE FAMILY: `--card` was a container by NAME, and in light `--card` IS `--background` (#FFFEF9), so a wall of raised cards on the page reported \"contained\" at CONTRAST 1.000 \u2014 the identical pairing this very paragraph already cited as the bug the law was written for. The law described the fault in prose and blessed it in code. (iii) THE PAINT TEST: it matched a component's whole text, and `CardGrid`'s `cva` declares a `panel` tone it only draws when asked \u2014 so `<CardGrid>` with no `tone`, which paints nothing at all, answered \"I paint\". Fixed at the screen with `tone=\"panel\"`, the kit's own answer, whose source states this exact failure: \"`panel` is for a wall standing on the PAGE, where a `--card` cell measures 1.000 against the page tone and would be held up by its shadow alone.\" MEASURED on the running stylesheet, both palettes: light panel #F7F2EB on page #FFFEF9 = 1.103 and raised card #FFFEF9 on panel = 1.103; dark panel #1C1B18 on page #141310 = 1.079 and card #26241F on panel = 1.111 \u2014 against the 1.000 it was shipping in light, where the bug lived, DARK HAVING MEASURED A PERFECTLY VISIBLE 1.198 THE WHOLE TIME. That asymmetry is why nobody caught it by looking. THE WIDENING'S OWN FIND, and the argument for having done it rather than fixing one screen a third time: `web/components/apps/apps-screen.tsx` draws its stage groups' `AppTiles` at `bg-card` on the page \u2014 the SAME 1.000, on a busier screen, and flat, because a tile is deliberately `motion-hover` rather than `motion-hover-lift` and has no shadow holding it up either. Nobody has reported it. It is written down rather than restyled because the lane that found it had Settings as its subject, which is the same reasoning the portal block below states. WHAT THE CENSUS DOES NOT SEE, written down rather than discovered later: it resolves components by NAME, so where two libraries share one (recharts' `Tooltip` and the kit's) it takes the first and under-reaches \u2014 and the same collision put TWO `TeamPanel`s in this repo, the kit-shaped container and a local one on the Kwapso screen \u2014 the portal's savings chart is a real uncontained section this walk lets through. Under-reaching is the deliberate direction: a false offender in a build gate is worse than a section the law stays quiet about. THE FOURTH RULING, 2026-09-11, AND IT IS NOT A GAP IN THE LAW \u2014 IT IS THE LAW, OVERRULED. Over a screenshot of Settings \u203a Integrations: \"i said nothing on white backgorund. remove this text Access tokens / Let an outside tool (an AI agent, a script, an automation) work in your team as you, capped by your role, in the team the token was made for. for google replicate the no tokens yet, sth like 'connect to google' and the button to do so. remove the text directly on white background.\" The fourth time she has said one sentence (Team tab, Integrations, Settings \u203a Modules, Integrations again), and the first time she has pointed at something this law EXPLICITLY ALLOWED rather than something it could not see. Three amendments landed the day before, each widening the subject, and every one of them left the reported sentence standing \u2014 because the PROSE exemption said it could. WHAT SHIPPED. Access tokens: the eyebrow and the sentence DELETED outright, her instruction and the right one \u2014 the contained register below already titles the section (\"No tokens yet.\") and already carries the one first-add, so they were a second title for one thing, floating; a section titled twice is not fixed by boxing the spare title. The create `+` came inside the panel with them, because a lone `+` over a box on the white is the same complaint one control along. Google: the eyebrow, the sentence and the connect-everything row are now ONE card drawing `CollectionEmptyState` \u2014 the neighbour's own register, not a second thing shaped like it \u2014 titled \"Connect to Google\", with the privacy promise and the one-approval fact inside it and \"Connect everything\" as its one act. Her own words were \"replicate the no tokens yet\", which is an instruction about a COMPONENT and was read as one. THE COST, AND IT IS PAID IN `UNCONTAINED_SECTION_OK` RATHER THAN HIDDEN: seven more files, all read as a census awaiting ONE ruling. Three are Settings \u203a Appearance, the same heading + sentence + contained-cards shape, HALF-FIXED on 2026-09-10 \u2014 that pass moved the option cards off `bg-card`'s contrast 1.000 and left the title block on the white, because the law said prose was not content. The other four are the work module and the portal, found by the dropped heading requirement rather than by the prose clause. AND SHE HAS RULED THE OTHER WAY, ONCE, ON 2026-09-10, about the module settings pages' own descriptions: \"The section description: no, I want to keep it.\" The two rulings reconcile \u2014 keep the words, stop leaving them on the white, which is a container and not a deletion \u2014 but which of the two she means for each screen is hers, so every one of them is written down and shown to her as a picture instead of guessed at by a lane whose subject was Integrations.",
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
  {
    id: "R70",
    dimension: "workflow",
    law: "EVERY AUTOMATION IS ON ITS MODULE'S SETTINGS PAGE, AND ONE THAT CANNOT BE SWITCHED SAYS WHY. The client's ruling, 2026-09-11, shown a census of the automatic behaviours in this product: \"include absolutely all of those in settings by module. I want no automation without visibility\" and \"so far i want visibility and on+off\". So every automatic behaviour is an entry in `AUTOMATIONS` (shared/automations.ts) naming the settings SEGMENT whose page carries its row, and every entry answers `switchable`. A `false` carries `helpText` — a reason a person READS on the page, under the place the switch would have been — because a row that is visible and inert with no explanation is the control-that-looks-like-it-works this repo has already shipped four times. AND THAT ROW WEARS THE DICTIONARY'S MARK BESIDE THE REASON (the client again, 2026-09-11, shown the list: \"like we have protected choices to have protected automations! Still have the visibility, but cannot change it\") — `GLOSSARY.protectedChoice`'s own word, drawn with the same kit part the CHOICES half of the same page draws it with, and the two render from ONE guard so the badge can never be left standing on its own. That last clause is not tidiness: the word promises something DIFFERENT on each half — a choice's protection comes off in one click, an automation's never comes off — and the sentence beside the badge is the only thing that says which promise a row is making. Word, part and guard are all derived off the two screens' own source, so a reworded term or a restyled Choices badge turns the automations half red instead of letting one page drift into two marks for one concept. Storage copies `screens` exactly: keyed by segment, opaque JSON, two audit blocks, no `deactivated_at`, a byte cap and a row cap enforced insert-only, a bounded ordered read, `teams:update`, `refusePortalCaller`, `publishChange`, `logActivity`, and a reasoned `TOOLLESS_DOORS` line — with ONE departure: the registry is shared, so the write door REFUSES a key that names no switchable automation. AN ABSENT ROW IS THE DEFAULT AND THE DEFAULT IS ON, so nothing migrates; and \"off\" is a VALUE (the word, compared positionally) while absence is nobody having been asked — the `OPS_DIGEST_OFF` discipline, so a deliberate silence and a forgotten config can never look alike. FOUR CENSUSES, every one derived off the disk and failing both ways: every branded send in `workers/` has a row (through `shared/rules/email-sites.ts`, R30's own derivation, extracted so two laws cannot disagree about what an email is); every `triggers.crons` entry in every `workers/*/wrangler.jsonc` has a row, and every row naming a schedule names a real one; every exported function of `AUTOMATION_OWN_FILES` — the files whose whole job is doing things by themselves — is claimed or excused in writing; and EVERY SWITCH IS CONSULTED, `switchable: true` matched against every `automationOff(\"…\")` read in worker source, both directions, because an offered switch nothing reads is the one failure a person cannot see. Every entry's `source` must still name code that exists, and every segment must be one `MODULE_SETTINGS` declares (which R61 in turn holds to a real `MODULE_PERMISSION` key).",
    why: "Thirty-three automatic behaviours were running in this product and a person using it could see two of them: the per-source switch on the knowledge base, and an opt-in tick at the moment a portal login is granted. Everything else — three ticket status flips, a stage trail, an edit lock, a nightly deletion, a fifteen-minute sweep of everybody's Google account, fourteen kinds of email — happened with nobody told and nothing to read. AND THE CENSUS IS THE DELIVERABLE, NOT THE SWITCHES: a hand-typed list of thirty-three rots, and the thirty-fourth, written next year, would ship invisible exactly as these did. So the rows a machine CAN derive are derived (sends, schedules, the files that exist only to act, the flag reads) and the honest gap is written down rather than papered over — a new silent state-change inside a file that also does ordinary work passes through no seam and appears in no configuration, and `AUTOMATION_OWN_FILES` is the strongest thing available to it: it catches the next flip, because the next flip goes where its three siblings are. THE FIRST RUN FOUND A LIVE BUG OF ITS OWN, in the sibling this law's storage discipline is copied from: `ALERT_TO` is the word \"off\" in both environments, `sendOpsDigest` understands it and `alertNewAlarms` beside it only ever checked for an EMPTY list — so the word survived the split as a one-element recipient list, the growth alarm tried to email an address called `off` every night, and the `if (!mailed) throw` at the foot of that function turned a normal night into a recorded cron failure on staging and production alike. One word, two meanings, one send broken, and it took writing down what \"off\" means to see it.",
    checkId: "automations-are-visible",
    status: "enforced",
  },
  {
    id: "R71",
    dimension: "ai",
    law: "A HUMAN-FACING LABEL SPEAKS THE APP'S WORD, NEVER THE ALIAS A TOOL DESCRIPTION OFFERED THE MODEL. `describe_module` and `query_records` accept a module by any of its aliases — their own description says so, in words: \"`help` reaches tickets\" — because CLAUDE.md's own \"don't finish the rename\" keeps `help` as the permission module, the table, the API path and the MCP tool names on purpose. Nothing stops the model reaching for exactly the word its tool description just offered it, and the agent's step chip / confirm panel built its label straight from that raw argument, so the alias printed VERBATIM on a screen the product has no section named after. Any `summarize()` in `shared/workers/tool-catalog.ts` that builds a label from a schema field spelled `module`, `table` or `targetTable` must route the value through `queryLabel` (which wraps query-grammar's own `canonicalModule`) before it reaches a sentence — never the raw argument.",
    why: "The owner's own report, 13 Sep 2026, reading the assistant's step chips on staging verbatim: \"See what help can be asked\", \"Look up help\", \"Count help by account\", \"Count help by app\". A person reads those, and the product has no help section — it has Tickets, and CLAUDE.md is explicit that the rename stops at the door: the module, the table, the API path and the tool names stay `help`, but nothing SPOKEN to a person may. The bug was not a typo — the tool's own description tells the model \"`help` reaches tickets\", so the model was following an instruction the catalogue itself gave it, and the label-building code echoed that instruction's own word back onto the screen. The fix reuses `canonicalModule`, the query engine's own answer to \"what did they actually mean\", rather than re-deriving a second map that could drift from the door's — the same reuse-a-seam discipline CLAUDE.md's planning ritual asks for. Checked by RUNNING every tool's `summarize()` with a poisoned alias, derived off the schema field NAME rather than a hand-list of the two tools that leaked, so a future module's `module`/`table`/`targetTable` argument is covered without anyone updating this law — the same shape R22's body-parity proof stands on (prove it by calling the function, not by reading it).",
    checkId: "agent-label-vocabulary",
    status: "enforced",
  },
  {
    id: "R72",
    dimension: "ui",
    law: "NO SUBTITLE UNDER A HEADING, UNLESS SHE ASKED. The client's ruling, 2026-09-14, over Settings › Modules' own intro sentence: \"In settings, modules: delete this. Generally, I don't like subtitles, so stop putting them unless I ask.\" The second sentence is the wider one and the one this law enforces — she had already said the narrower version twice the same week about two other screens (\"in ticket settings (or any other module) no subtilte\", 10 Sep; \"ticket types should be … without subtitle, make this. always\", 11 Sep), and both landed as one-screen fixes: `shared/web/settings-section.tsx` deleted the field outright, and `MODULE_SETTINGS` lost its `description` column with it. This is the third saying, about a fourth screen neither fix touched, and it is not about one screen any more — it is a DEFAULT for the whole app. A SUBTITLE IS, PRECISELY: a prose element (`<p>`, `<span>`, `<small>`, `<em>`, `<strong>` — R67's own `READABLE_PROSE` set, reused for the same reason R67 reused it: a real kit component is always Capitalised, so `<Text>`, `<CollectionEmptyState>`, `<NothingYet>` and every other genuine-content component are invisible to a lowercase-tag census by construction) standing as the immediate next SIGNIFICANT sibling of a heading (`<h1>`-`<h4>`, the kit's `<Headline>`) inside the same JSX children array — blank text and a `{/* comment */}` are transparent to the pair, the same move R67's own walk makes. THREE SHAPES ARE DELIBERATELY NOT A SUBTITLE: a form field's helper text (rendered through the kit's `Field`, which has no heading sibling to stand beside — a label, not a title); an empty state's explanation (`CollectionEmptyState`/`PortalEmpty`/`NothingYet`/`ShapeStateBody`, Capitalised, so already outside the census); and the reason a switched-off automation cannot be turned on, which R70 *requires* as `helpText` and which answers \"why can I not change this\" rather than \"what is this section for\". A REAL BLIND SPOT, WRITTEN DOWN: a heading a CHOKEPOINT COMPONENT draws for its caller (`SettingsSection`, `ToolbarRow`'s `title`, `CollectionHeading`) is invisible to the sibling census if a caller passes prose as that component's `children` — heading and prose then sit in two different JSX children arrays. Those three are held shut the narrower way instead: none may re-grow a prop shaped like a subtitle (`subtitle`/`description`/`subheading`/`caption`, matched as a declared TYPE member so a comment merely discussing the word does not trip it), which is the only door wide enough to let the blind spot matter — `shared/web/settings-section.tsx`'s own header states the argument this check imports: \"a section cannot declare a subtitle it has nowhere to put.\" `SUBTITLE_OK` (this file) is the way out `SUBTITLE_OK`'s own way out for the rest of the app — a reasoned, file-keyed line, rot-checked both ways so the list can only shrink, the same discipline `UNCONTAINED_SECTION_OK` (R67) and `HAND_ROLLED_OK` (the kit-motion check) already use. AMENDMENT 1 (2026-09-14, the same day, over the Modules card itself): the founding case passed this census on the day it was written — the card's name drew through the kit's `CardTitle`, which `HEADING` did not recognise, so the pair with the `<span>` beneath it never formed; the miss was on the heading side, not the prose side, and the prose was a bare `<span>` the original set already matched. `HEADING` gains `CardTitle` and `PROSE` gains `CardDescription`, both on the kit's own word for what each is (`shared/ui/components/card/card.tsx`: \"it is a heading\" / \"it is prose\") — nothing wider, and checked by hand against every call site of either in the app: the Modules card (fixed outright), `members-gallery.tsx` (structurally outside the pair — its `CardTitle` sits inside its own wrapper span, paired with a `Badge`, so the email line beneath is never `CardTitle`'s sibling), and `screen-renderer.tsx`'s generic `display: \"cards\"` branch, a real pair `SUBTITLE_OK`'d as unreached dead code rather than ruled on, because no recipe reached it that day. THAT BRANCH IS GONE, 2026-09-14 — deleted outright once the `SUBTITLE_OK` entry's own words (\"the honest fix is not a subtitle ruling, it is a dead-code one\") were finally acted on rather than merely believed; its exemption line went with it, the same census this amendment's own list can only shrink.",
    why: "R67 already polices a titled section, and the two laws share a census file and a house term (\"title block\") without being the same law. R67's subject is WHERE content stands: a sentence inside the title block is explicitly exempt from R67 (amendment 4's `carriesHeading` skip) because R67 has nothing to say about whether the sentence should exist, only about the ground it stands on if it does — a boxed subtitle passes R67 outright. This law's subject is whether the sentence exists at all, independent of containment; an unboxed subtitle fails both laws, and a BOXED one now fails only this one, which is the proof they are answering different questions rather than one question twice. R67's own header makes the same point from the other side, about the seven module settings pages it cannot reach: \"reaching them means judging a component by the PROPS it is handed rather than the JSX it writes, which is a different check with a different oracle.\" That is what this file does, and it is why the fix is a new law rather than a sixth amendment to R67. Getting the boundary right mattered more than catching every case: a census that flagged a field's helper text, an empty-state sentence or R70's required automation reason would be turned off within a day, so each of the three is excluded STRUCTURALLY — by tag name (a real component is Capitalised, a bare `<p>` is not) or by having no heading sibling at all — rather than by a growing list of exceptions somebody has to keep arguing for.",
    checkId: "no-default-subtitles",
    status: "enforced",
  },
  {
    id: "R73",
    dimension: "arch",
    law: "A DENY-LIST IS DATA IN THE REGISTRY, NEVER A CONST IN THE TEST THAT READS IT. This repo's own opening sentence, RULES.md line 13: \"Deny-lists (the reviewed exceptions for each law) live as DATA in the registry, so every exception is a visible, conscious line.\" A census off `web/test/**` and `web-portal/test/**` on 14 Sep 2026 found twenty exemption-shaped lists declared INSIDE the test files that read them — some at module scope, some nested inside a `describe`/`it` block — invisible to `shared/rules/registry.ts` and to anyone reading that opening sentence and believing it. Moved, each keeping its exact shape, entries and reasons, each test now importing its list from the registry instead. WHAT COUNTS AS ONE OF THESE, derived off what the census actually found rather than guessed at: a top-level (or per-test) `const` whose name ends `_OK` or `_EXEMPT` (`FOO_OK`, `FOO_EXEMPT`), or is one of the seven irregular names this base already uses for the same shape — `GONE_ON_PURPOSE`, `DEFERRED_UPLOAD_FORMS`, `PARKED`, `MAY_INJECT`, `BY_HAND`, `NOT_A_WORK_PICKER`, `NO_RECORD_BEHIND_IT`. A test file may reference any of those names only by IMPORTING it from `@shared/rules/registry` — a local `const` matching the shape is the fault, whatever value it holds, empty object included. Checked by a plain source scan over both test trees: no `const` declaration anywhere may carry one of these names, full stop, because a real import statement declares no `const` at all and the two are syntactically impossible to confuse. Proven by mutation, the same discipline every census here stands on: a throwaway `const FOO_OK = {}` dropped into any test file must turn this red, naming the file, before it is removed again.",
    why: "The keystone law (`registry-integrity`) already proves RULES.md and `RULES_REGISTRY` cannot drift from each other, but it only reads the TABLE — it has never asked whether the deny-lists the table's own opening sentence promises are actually registry DATA, and for twenty lists across this base they were not: a reviewer reading RULES.md's first paragraph and then `shared/rules/registry.ts` would find a smaller set of exemptions than the build actually enforces, because a fifth of them lived somewhere the promise never looked. Three of the twenty were already spoken of in RULES.md's own prose as if they were registry data (`GONE_ON_PURPOSE` in R58, `OBJECT_FIT_OK` in R60, `HAND_ROLLED_OK` in CLAUDE.md's planning ritual) while actually living in a test file each — the documentation had quietly gotten ahead of the code. And one of the twenty (`OVERLAY_FAMILY_OK`) carried its own comment, written the same day it was added, promising a later lane would move it here \"rather than half-migrating\" — a promise with no check behind it is exactly the shape that rots, because nothing but a person remembering enforces it. The pattern is derived rather than hand-typed for the reason every census in this base derives its subject: a hand-kept list of twenty names is itself the next place this fact goes stale, the moment a twenty-first exemption list is born inside a test file and nobody remembers to add its name here too.",
    checkId: "registry-backed-exemptions",
    status: "enforced",
  },
  {
    id: "R74",
    dimension: "ui",
    law: "IMPORT OPENS ITS OWN TAB — IT NEVER REDIRECTS THE ONE YOU WERE ALREADY IN. The client's ruling, testing Import, 2026-09-14, verbatim: \"make sure that it opens as a new solo tab on the breadcrumbs, because now it redirects. In the places where we have import, make sure that's what it does.\" Every \"Import CSV\" door, and the generic wizard link on Home, used to `softNavigate`/`go` the CURRENT workspace tab straight to `/t/<teamId>/import…`, so the collection she pressed it from vanished from the strip until she clicked Back — indistinguishable from a redirect. `openInNewTab` (`web/lib/nav.ts`) is the one seam: a SOLO tab is a trail of one, which `visitTrail` (`web/lib/workspace-tabs.ts`) already generalises to on its own terms, so this calls the model's existing single mutator with a one-entry trail instead of the crumb-derived one the shell builds for an ordinary navigation, then navigates. Checked as a CENSUS off the disk, positional like R20: every call to `go(`/`softNavigate(`/`openInNewTab(` whose argument is a template literal targeting the import wizard (`/t/<teamId>/import…`) must be the `openInNewTab(` one — the seam call is what the dispatch must sit inside, not a comment beside it or a wrapper somewhere upstream. `IMPORT_TAB_EXEMPT` is the reasoned, rot-checked way out for a target that is not this law's to fix (there is none today), and Home's own tile — reached through a shared `onItemClick` rather than a direct call, so it is invisible to the positional census — carries its own named clause proving the same guard by reading the file for it.",
    why: "THE MODEL ALREADY HAD THE CAPABILITY AND WAS MISLABELLING IT. `visitTrail`'s own doc block enumerates six decisions and never says a tab must come from a crumb — a one-entry trail was always a legal call, nobody had reason to make one until now. The harder half was the BUG under the surface: `buildCrumbs` (`web/components/deep-link/crumbs.ts`) built its one crumb for a leaf-with-no-`RECORD_FACE` module (import's `id` is a TARGET KEY, never a fetchable row) as an ANCESTOR link back to the bare collection, so the workspace-tab store recorded the WRONG address for the screen actually on screen and the strip could never match it against `currentPath` — falling back to the plain trail, which is the redirect she saw. Fixing the seam alone, without that one line in `crumbs.ts`, would have opened a tab the strip still couldn't find. `IMPORT_TARGET_LABEL` beside it exists for the same reason `RECORD_FACE` is data rather than a derivation: `brand`'s own `module` field is `brand_assets` and `purposes`'s is `delivery`, so guessing the tab's word from the target key would have mis-named two of five and drifted from R34's own word.",
    checkId: "import-opens-a-tab",
    status: "enforced",
  },
  {
    id: "R75",
    dimension: "ui",
    law: "THE OPTIONS A PERSON PICKS FROM ARE A→Z, IN THEIR OWN LANGUAGE — EVERYWHERE. The client's ruling, 2026-09-14, over Settings › Automations' own Module filter: \"In settings, automations, make sure that in the sort component, in the modules component, you sort it A to Z. This here, but everywhere in the app, make it a law.\" A CHOICE a control offers — a filter facet's options, a `<Select>`'s items, a picker's list — is not a collection row (those already carry their own sort control, R53); it is presented to the reader alphabetically, comparing the LABEL a person reads (never the stored value), locale-aware (`localeCompare(lang)`, the app's CURRENT language from `useLanguage()`, never the browser's). ONE SEAM CARRIES THE FIRST HALF FOR FREE: every `FilterFacet` in the app — declared options or derived from the rows — is rendered through `shared/web/screen-engine/filter-bar.tsx`'s own `optionsFor`, so wrapping its result once, at the one render chokepoint every facet on both front doors passes through, sorts the client's own named example (Settings › Automations' Module and Status filters) and every other facet, present and future, without a second line at any `filterFacets` declaration site. THE SECOND HALF has no single chokepoint — a hand-rolled `<Select>`/`SelectItem` list or a picker's `options` prop built by `.map()` over a plain array — so `sortedOptions()` (`shared/web/sorted-options.ts`) is called AT THE CONSUMPTION POINT, positionally: the array immediately feeding that `.map()` must itself be a `sortedOptions(...)` call (`sortedOptions(...).filter(...)` also counts — filtering after sorting keeps it sorted), or the file is named in `ORDERED_OPTIONS_OK` with the field it excuses. ONE NAMED BLIND SPOT, read directly rather than derived: `web/components/team/roles-matrix.tsx`'s own module rows (`moduleColumns`) build a kit-specific row config rather than a `<SelectItem>`, so the derived census cannot see it — it is asserted by name, the same move R74 makes for Home's own import tile. THE ONE ESCAPE HATCH IS DATA: `ORDERED_OPTIONS_OK` names a control whose list is not a naming vocabulary at all — a status PIPELINE, a size SCALE (`shared/web/scale-section.tsx`'s own Compact→Regular→Large, the client's literal example of the shape that must NOT sort), a step's place in a workflow somebody actually designed (`step-form-dialog.tsx`'s process-step pickers) — reasoned per entry, rot-checked both ways so the list can only shrink. A `CollectionConfig.sortOptions`/`COLLECTION_SORTS` menu (WHICH FIELD to sort a collection BY — \"Newest first\", \"Priority order\") is OUTSIDE this law's subject entirely, not a registry exemption from it: `web/lib/collection-sorts.ts`'s own header already argues the landing order is a deliberate design (dates newest-first, tickets' drag-rank first, matching SCOPE ch.07), and alphabetizing a sort-by menu answers a different question than the one she asked about the Module filter.",
    why: "THE SEAM WAS ALREADY HALF THERE. `shared/web/screen-engine/collection.ts`'s `facetOptions()` — the DERIVED-from-rows half of a `FilterFacet` — has sorted with `localeCompare` since before this law existed; what it lacked was the app's own current language (a bare `localeCompare()` collates by the BROWSER's locale, which can disagree with what the reader chose in Settings › Appearance) and it never ran at all for a DECLARED `options` array, which is exactly the shape of the client's own example — Automations' Module filter builds its options from `scope.modules`, a declared list, never the rows. Sorting once at `filter-bar.tsx`'s own render (rather than patching every `filterFacets` declaration across both front doors) means a facet declared tomorrow inherits the law for free, the same argument R53 already won for the sort control and R61 already won for a module's settings gear. THE EXCLUSION OF SORT-BY MENUS IS A JUDGEMENT CALL, WRITTEN DOWN RATHER THAN HIDDEN: her sentence names \"the sort component\" and \"the modules component\" in one breath, and a stricter reading would alphabetize `COLLECTION_SORTS` too. It was not, because that file's own header already carries a reasoned, dated design (dates newest-first because landing on oldest-first reads as broken; tickets' drag-rank first, SCOPE ch.07's own priority order) that a blanket alphabetical pass would silently overwrite — the automations screen she was looking at draws no `SortControl` at all (`sortable: false`; the table's own column headers are the sort control), so the concrete screen behind her ruling cannot have been asking for that menu to move. A later, explicit ruling on a `COLLECTION_SORTS` menu's own order should re-open this law's subject rather than be read into it from one ambiguous sentence.",
    checkId: "alphabetical-options",
    status: "enforced",
  },
  {
    id: "R76",
    dimension: "arch",
    law: "PROTECTED MEANS ACTIVE — THERE IS NO SUCH STATE AS \"ACTIVE, PROTECTED\". The client's ruling, 14 Sep 2026, over Choices' own status column: \"if it's protected, it's always active, so you don't need to put active protected, just protected.\" `is_default` (the column; the word a person reads is \"Protected\", unchanged since 2026-09-10 for the same reason CLAUDE.md records for `help`/Tickets — the human word moves, the identifier stays) and `deactivated_at` are not two independent flags a reader reconciles by hand: a protected row IS an active row, always, in both directions. TWO DOORS, ONE INVARIANT. `setSelectableActive` already refused to deactivate a protected, active value (409 `default_value`) before this ruling — that half stood. The gap was the OTHER order: deactivate a value first, while it is not yet protected, then protect it, and the row ended up protected AND inactive with neither door ever having refused either half. `setSelectableDefault` (`workers/tenancy/src/lib/selectable.ts`) closes it: protecting a value now REACTIVATES it in the same call, on the same idempotent UPDATE R17 already asks for — a single current-state predicate (`is_default <> ? OR (protecting AND still deactivated)`) rather than a second refusal a caller has to route around, because \"protected is always active\" reads as a fact the row keeps, not an error. Migration 0088 (`0088_a_pictograph_is_not_a_mark_and_protected_is_always_active`) backfills every row the old two-step gap could already have produced. THE DISPLAY FOLLOWS THE DOOR: `selectable-screen.tsx` and `settings-choices-panel.tsx` both render ONE word, `Protected`, standing in for the whole state, mutually exclusive against `Active`/`Inactive` — never a second, independent \"Protected: yes/no\" facet beside a Status facet that already offers \"Protected\" as one of its three values, which is exactly the state (\"Active\" + \"Protected: No\") the door can no longer produce.",
    why: "Checked against a REAL schema (`node:sqlite` + `TEAM_MIGRATIONS`, the same harness `selectable-doors.test.ts` uses) rather than a mocked `d1Query`, because both directions of this invariant are enforced in a hand-written SQL `UPDATE ... WHERE` predicate, and a mock would accept a broken predicate exactly as happily as a correct one — the same trap that file's own header names. `workers/tenancy/test/selectable-protected-active.test.ts` already exists and already proves both halves (refusing to deactivate a protected value, and reactivating one on protect, including clearing the deactivator audit columns); this law is that check's own account rather than a second one written beside it, which would be exactly the kind of duplicate seam CLAUDE.md's planning ritual asks a change to reuse instead of rebuild.",
    checkId: "protected-is-active",
    status: "enforced",
  },
  {
    id: "R77",
    dimension: "ui",
    law: "EVERY TAB STRIP THAT LABELS A SCREEN STAYS ON TOP WHEN THE SCREEN SCROLLS — NOT ONLY A COLLECTION'S. The client's ruling, 2026-09-15, over Settings: \"When I scroll down in settings, the tabs do not stay pinned at the top. Make sure you fix this here and everywhere else. Should be the same behavior when scrolling down: the tab should stay visible.\" R63 already pinned a COLLECTION's own tab strip (`STICKY_FOLDER_TABS`, through the one seam `renderFolderTabs`) and a RECORD's own inner strip (`STICKY_TABS`, record-chrome.tsx); this closes the third shape her own words name — a MAIN screen that draws a bare `<TabsView>` with its own `renderPanel`, never asking either seam for the class. `settings-screen.tsx` was exactly that: `<TabsView config={tabsConfig} value={tab} onValueChange={handleTabChange} renderPanel={…}>` in one `<Tabs>` root, so the strip scrolled away with everything under it. THE FIX IS THE SPLIT EVERY COLLECTION SCREEN ALREADY DRAWS, never a third class: the strip now renders through `renderFolderTabs` (the one place `STICKY_FOLDER_TABS` is spelled) as a SIBLING of its panel, not a `TabsContent` inside the same sticky root — applying `STICKY_FOLDER_TABS` to a `<Tabs>` root that also wraps its own panel content would pin the CONTENT along with the strip, which is worse than the bug it fixes, because `STICKY_FOLDER_TABS` (unlike `STICKY_TABS`) is not scoped to `[role=tablist]` alone. A STATIC CENSUS OFF THE DISK, `tab-strips-pin`, holds every `<TabsView` mount in `web/` and `web-portal/` to the two doors R63's own vocabulary already offers: either the mount is not literally `<TabsView` at all because it is reached through `renderFolderTabs` (a collection's or a main screen's own strip), or its `className` carries `STICKY_FOLDER_TABS` or `STICKY_TABS` literally (a record's own inner strip, or a strip that spells the same identifier by hand). Nothing else passes. `TAB_STRIP_PIN_EXEMPT` (`shared/rules/registry.ts`) is the reasoned, rot-checked way out for a `<TabsView>` that is not a screen's own labelling strip at all, keyed by the file's path relative to the repo root.",
    why: "Two shapes a stricter reading would have caught by mistake. A NESTED view switch — `work-panels.tsx`'s Open/Done pile filter, `process/steps-panel.tsx`'s List/Flow/Compare view, `process/draft-review.tsx`'s own two piles — already sits inside a panel a screen-level strip has pinned already (a record detail's `STICKY_TABS`, or a sheet that does not scroll independently at all), so pinning a second, inner strip a few rows below the first would stack two sticky bands in the same small space — the exact 'two pinned toolbars' failure R63 itself measured and refused for the collection toolbar, one level up the same tree. And `shell/team-section-nav.tsx`'s own strip NAVIGATES rather than labelling a panel underneath it (its own header: 'selecting one navigates (no panel content)') — there is no panel below it for the strip to stay above, so pinning it pins nothing. Both are excused through `TAB_STRIP_PIN_EXEMPT`, never through a filename pattern the test hand-derives, because R73 already settled that shape for every law in this file: a deny-list is data in the registry or it is not a deny-list. TWO MAIN SCREENS, `screens/kwapso-screen.tsx` and `screens/module-settings-screen.tsx`, drew the identical bare-`<TabsView>`-with-`renderPanel` shape `settings-screen.tsx` shipped with — a design-scale census written 2026-09-03 already named both as a known gap in prose (\"the kit's own gap to own\"). Both were fixed the same day this law shipped, 2026-09-15 (the client's own \"everywhere else\" read literally: an honest gap named in a registry is still a gap) — `kwapso-screen.tsx` split through `renderFolderTabs` the day after, `module-settings-screen.tsx` by the Choices lane the same day, told to make the identical split — and both lines came out of `TAB_STRIP_PIN_EXEMPT`, proving the 'the honest gap is written down rather than papered over' argument R70 and R63 both make: named gaps are worked down, not left to sit.",
    checkId: "tab-strips-pin",
    status: "enforced",
  },
  {
    id: "R78",
    dimension: "ui",
    law: "CALENDAR VIEWS CARRY NO SORT. The client's ruling, 2026-09-15, over the week design: \"Never put the sort in calendar components. Make this a law. Makes no sense.\" A reader looking at a month grid, a week board (Mon–Fri plus the folded weekend, `RecordWeek`) or a day-by-day agenda is not choosing an ORDER — the calendar frame (the date axis) already fixes one — so a sort control beside it offers a choice that does nothing, the identical \"dead UI\" argument `TOOLBAR_SORT_EXEMPT`'s own header already makes screen by screen (`sprints-screen.tsx#SprintsScreen`'s own entry there, among others) for a month grid or a queue. This turns that argument into a LAW rather than leaving it as N separate exemptions: \"calendar view, no sort\" is a fact about the SHAPE, not a decision each screen re-makes. ENFORCED CENTRALLY, at the one seam that already builds both controls (R53) — `<ToolbarRow>` (`web/components/deep-link/screen-bits.tsx`) draws no `<SortControl>` at all, regardless of what its `sort` prop is given, the moment its `view` slot's ACTIVE value (`view.value`, never the list of bodies a screen offers) is `\"calendar\"`, `\"week\"`, `\"agenda\"` or `\"timeline\"` (`NO_SORT_VIEW_VALUES`, the same file). No call site can opt back in by continuing to pass `sort` once its view lands on one of those four — the suppression lives in the row, not at eighteen call sites, which is the same move R53 itself made for the control's placement. A static census, `no-sort-in-calendar-views`, holds every OTHER file that independently builds a `<SortControl>`/`<ViewSwitch>` pair (R53's own `TOOLBAR_CONTROL_OWNERS` — the row is not the only file the kit lets draw these two controls) to the identical rule: a views array offering `calendar`/`week`/`agenda`/`timeline` there must suppress its own sort control on that view too, or the file is named in `NO_SORT_VIEW_EXEMPT` with the reason it is safe not to. AMENDED 2026-09-15, THE SAME DAY, FOR THE WAVES T3 RULING (\"for waves i choose t3\"): a time axis is time-ordered the identical way a date axis is, so `NO_SORT_VIEW_VALUES` gained `\"timeline\"` alongside the original three rather than Waves re-arguing the case as a fourth `TOOLBAR_SORT_EXEMPT` line. `web/components/work/wave-finder.tsx` (already a `TOOLBAR_CONTROL_OWNERS` hand-copy of this row, R53) reads the widened set directly to suppress its own sort control on Timeline and Calendar, keeping sort on List, where the rows genuinely have an order to offer.",
    checkId: "no-sort-in-calendar-views",
    status: "enforced",
  },
  {
    id: "R79",
    dimension: "ui",
    law: "STAFF IS PICKED FROM A PILL ROW, NEVER A DROPDOWN. The client's ruling, 15 Sep 2026, verbatim: \"On Add Task and generally absolutely everywhere where we are selecting staff, do the horizontal choices, not the dropdown. By default, in all of these where I'm selecting staff, always put the user preselected by default.\" ONE COMPONENT, `shared/web/staff-pill-picker.tsx`'s `StaffPillPicker`, on the same pill idiom `AppearancePillGroup` (`shared/web/appearance-pill-group.tsx`) already drew for Settings › Appearance: a bare `<button role=\"…\">` row, `rounded-pill` (R31), an inset hairline never a CSS border, the selected pill's own hairline strengthening rather than a second colour (R32). `role=\"radiogroup\"`/`role=\"radio\"` for a single pick (an assignee, an account manager, an app's lead), `role=\"group\"` + `aria-pressed` for many (an app's staff, a ticket's stakeholders), A→Z by name (R75's own seam, called once inside the component so no call site can forget), each pill wearing the person's own `RecordMark` (R35, round — a person in their own right, never a client/app square) and their FIRST NAME alone (a disambiguated name carries its email in parens, `assignableMembers`'s own dedup — the face beside the word is the disambiguator on a pill, not a longer string). Wraps to multiple lines, every pill its own real `<button>` (Tab order, Enter/Space, the kit's own focus ring) plus Left/Right/Up/Down roving focus along the row. A STAFF PICKER NEVER OFFERS NOBODY — the client's second ruling, 16 Sep 2026, verbatim: \"Kill the 'nobody' option for staff. If we leave it empty, it's not an option. Remove it from tasks and everywhere else. This 'nobody', just kill it.\" `allowNobody`/`nobodyLabel` are GONE from the single-mode props entirely, not merely unused — there is no click left inside this component that can reach an empty `value`; a caller cannot opt back in. `mode=\"multi\"` is unaffected: no pill pressed is not a \"Nobody\" option, it is nobody having been pressed yet, and stakeholders/staffed-on stay genuinely optional. THE SECOND HALF OF HER FIRST RULING — the signed-in user preselected by default on a NEW record — is a per-form correctness question this law does not itself prove (a census cannot read intent); it is wired at each call site instead: `TaskFormDialog`'s pre-existing `defaultAssigneeId`, and the same shape added to `StoryFormDialog` (`defaultAssigneeId`), `AccountFormDialog` (`defaultAccountManagerId`), and `AppFormDialog` (`defaultStaffUserId`, seeding both the staff row and the lead). An EDIT form keeps the stored value — except a stored value that is ITSELF empty (an old row written before this field existed, or before the 16 Sep 2026 ruling), where the same signed-in-user id is the fallback there too, because the killed \"Nobody\" pill left no other state for an edit to open on; `initial` wins only when it has something to win with. A STATIC CENSUS OFF THE DISK, `staff-pill-row` (`web/test/staff-pill-row.test.ts`), holds every `<Select` (the kit's own) and every `<RecordPicker` NOT carrying `layout=\"row\"` (its own chip-row layout already draws the identical bare-button pill row, so it was never a dropdown to begin with) to account: none may be fed a staff/member list, found by the same three seams `web/lib/members.ts` supplies one through (`useAssignableMembers`/`assignableMembers`/`staffedOn`, called directly inside the mount's own tag or bound to a local the file threads in) or a value typed `PickablePerson[]`. `STAFF_PILL_ROW_EXEMPT` is the reasoned, rot-checked way out, empty on the day this law shipped — every dropdown the inventory found (task/story assignee, the account manager field, an app's staff checklist and lead, a ticket's `HelpStakeholders` add control, `TriageStrip`'s on-duty pick) was converted rather than excused. `triage-queue.tsx`'s two \"who is picking this up?\" rows are OUTSIDE this law's population on the same reasoning as the `RecordPicker` carve-out above: `layout=\"row\"` there already, years before this law, drew the horizontal choices her ruling asks for — an action row that commits on click has no submit step to preselect INTO, which is also why neither of those two rows nor `TriageStrip`'s own duty pick take a default: every click there already IS the assignment, and a pill that looked pre-chosen would be a click that does nothing.",
    why: "TWO SHAPES DELIBERATELY LEFT ALONE, named so nobody rediscovers them as a gap. `record-picker.tsx`'s `layout=\"row\"` is not folded into `StaffPillPicker` even where it already carries a staff list (`triage-queue.tsx`'s two rows): it draws `role=\"group\"` unconditionally by its own design (buttons that ACT rather than a state a submit confirms) and has no radio/optional-Nobody shape, and an ACTION row that commits on the click has nothing for a default to preselect into — the click IS the commit. Folding it would have meant either weakening `StaffPillPicker`'s own radio semantics to match an action row, or leaving `triage-queue.tsx` half-migrated for no behavioural gain; the census excuses it structurally (the `layout=\"row\"` carve-out) rather than by name, so it never needs a `STAFF_PILL_ROW_EXEMPT` line to stay excused. `HelpStakeholders`' own picker went the other way: its old `RecordPicker` + separate Add button became a `StaffPillPicker` in `mode=\"multi\"` with `value={[]}` always — every addable pill click adds straight away (R54's ADD-ONLY rule already meant nothing here is ever un-clicked), which is a small behavioural simplification (one click instead of pick-then-press) earned by the conversion rather than merely ported.",
    checkId: "staff-pill-row",
    status: "enforced",
  },
  {
    id: "R80",
    dimension: "ui",
    law: "ROWS ARE A LIST, NEVER A BANDED TABLE. The client's ruling, 2026-09-15, verbatim: \"On accounts, I want the views to be gallery and list. I don't like this table anywhere, so anywhere in the app where you have it, replace it with list. I don't want to say this again.\" Earlier the same day, about Tasks: \"Just replicate the list component as we have it in tickets. It's already good there.\" `RecordTable` (`web/components/records/record-table.tsx`) is the one row-collection component every screen but Tickets' own bespoke `TicketRowsTable` draws through, and it drew TWO shapes: a bare `<Table>` and, by DEFAULT, that same table wrapped a second time in `overflow-hidden rounded-[var(--radius)] bg-surface-panel` — a grey, rounded, inset band sitting inside whatever card already held the toolbar above it. That second box was the defect the client is naming, not a legitimate variant: every real caller already sits inside ONE surface of its own (a `CollectionCard` from `<PagedFind>`'s `wrap`, or the kit's own `useKitPanel` collection panel — ruling J2, \"toolbar, rows, pager inside it, one surface\"), so the banded shape was always a doubly-nested, inset, narrower-reading table standing beside Tickets' flush, full-width one. `RecordTable` draws the bare shape UNCONDITIONALLY now — the branch that produced the band is DELETED, not defaulted, and the `frame` prop that used to select between the two accepts only the literal `\"bare\"` (never `\"panel\"` again), so no call site can even ask for the old look at compile time. A static census, `rows-are-a-list` (`web/test/rows-are-a-list.test.ts`), reads `record-table.tsx` off disk and fails if the banded fill (`bg-surface-panel` wrapping the table) ever reappears there, and separately walks every `<RecordTable` mount across `web/` for a `frame` prop carrying anything other than the literal `\"bare\"` — so a reintroduced `frame=\"panel\"` (or any other value) turns the build red before it ever reaches a screen. The WORD moves with the shape: a view switch that used to offer \"Table\" offers \"List\" instead, with the kit's list glyph beside it (`ListBullets`, the same icon Tickets' own view switch already draws), never the kit's plain table icon.",
    why: "Earned the same day as R78, over the same design pass, and it closes a gap that had already been PARTLY fixed and left that way. `<RecordTable>` had grown an opt-in `frame=\"bare\"` a few hours earlier, for exactly one caller (`tasks-screen.tsx`, client screenshot: \"the task list is not correctly aligned, it is missing some width\") — proof the second box was visible and wrong, patched for the one screen she happened to be looking at. Her later ruling, read literally (\"anywhere in the app where you have it\"), is the opposite of an opt-in: a component that defaults to the wrong shape and offers an escape hatch is a law with six ways around it, one per call site that forgets to ask. So the escape hatch is deleted along with the shape it escaped, rather than widened into six more `frame=\"bare\"` call sites — the only surface `RecordTable` draws now is the one Tickets' own `TicketRowsTable` proved out first, composed straight from the kit's own primitives with nothing wrapping them. The census holds both halves for the same reason R66's `optionalMark` clause does: a fixed component with one still-typeable old prop value is not a fixed law, and a call site that reintroduces the value is the regression this exists to catch before a screenshot does.",
    checkId: "rows-are-a-list",
    status: "enforced",
  },
  {
    id: "R81",
    dimension: "ui",
    law: "A FORM CARRIES NO HINTS. The client's ruling, 16 Sep 2026, verbatim: \"You put too many explanations and hints that are not necessary, especially on the forms, on the create and edit. Please, can you delete all of that? I will give you a few examples, but I want you to clean it everywhere. If we need hints, I will tell you explicitly, but by default, there are no explanations, just the choice, text, or the form components.\" Two examples, both `FieldConfig.helpText` sentences: \"The system this work is on. Everything below is narrowed by it.\" (the story form's App field) and \"A recording, a page, a document somebody can open.\" (the story form's and the review dialog's file field). A create/edit form shows the label and the control, nothing else — the label already says what a field is, and a person doing their own trade does not need a sentence under \"App\" explaining that an app is a system. TWO CENSUSES, over the same parsed walk `field-config-keys.test.ts` and R33's `wrapped-strings.test.ts` already stand on (`appFiles()`, scripts/lib/i18n-source.mjs): (1) no object literal SPREADING `...defaultFieldConfig` — the same positional signature `field-config-keys.test.ts` already reads — may set `helpText` to anything but the empty string; (2) no bare `<p>` in a file that renders a form (imports `FormShell`/`FormShellDialog`, R4's own marker) whose entire content is one static `{t(\"…\")}` sentence of three words or more, coloured `text-muted-foreground`. WHAT SURVIVES, on purpose: a validation/refusal message (`text-warning`/`text-destructive`, shown only on a bad state, never `text-muted-foreground`); a placeholder that is the field's own example value; a picker OPTION's own differentiating description (`Choice`'s `description` prop, an `EVENT_KINDS` entry — the choice's own words, telling two options apart, never an explanation of the field); and a field showing the record's own SETTLED VALUE where a control would otherwise be (`settledAppField`'s \"fact, not control\" pattern) — none of those are a hint about how to use the form, they are the form's own words or the form's own data, and the bare-`<p>` census's own \"exactly one static sentence, nothing else interpolated\" shape excludes every one of them by construction (a value display glues text to data and so has more than one child). `Text`/`helpText` on an AUTOMATIONS catalog row (R70, `automation-edit-sheet.tsx`) is a different fact entirely — WHY a protected row cannot be switched, not a field's help text — and sits outside both censuses: it never sets `FieldConfig.helpText` (it reads `a.helpText` off a catalog row) and it renders through `<Text>`, never `<p>`.",
    why: "TWO MECHANISMS BECAUSE THE CLIENT'S OWN TWO EXAMPLES WERE TWO SHAPES — a `helpText:` property and a bare paragraph — and a law that only caught one of them would have left the other free to grow back exactly the way it did the first time (forty-nine `helpText` hints and a dozen bare-`<p>` captions, found across both front doors, none of them added in one sitting). The `helpText` census is the robust half: a `FieldConfig` is a closed, typed shape (`field-config-keys.test.ts` already proved as much), so a non-empty string on it is unambiguous and the RED PROOF in `web/test/form-hints.test.ts` stands on it. The bare-`<p>` census is deliberately narrower than \"any explanatory-looking paragraph in a form\" would be — an unscoped version flagged loading states (\"Reading what's attached…\"), empty-collection facts (\"Nobody is on this account's books yet.\") and every settled-value display (`fixedApp.name`, \"Current role: X\") as if they were hints, which they are not: a status message and a stated fact are not an explanation of the field, and gutting them would have removed real information the ruling never asked to lose. Requiring the `<p>`'s ENTIRE content to be one static `t(...)` call is what tells the two apart without a hand-kept exemption list: a value display always glues a translated word to a piece of data (`{t(\"For\")} {fixedClient.name}`), which is more than one child, and a status/empty message earns its `text-warning`/`text-destructive` colour or is plainly a loading state — the census reads for the SHAPE a hint actually has, not a guess at its meaning. `FORM_HINT_OK` stayed empty through the inventory that earned this law: every hint found was either a straightforward `helpText` deletion, a bare paragraph with nothing else to say, or — on inspection — already one of the four kept shapes above.",
    checkId: "form-carries-no-hints",
    status: "enforced",
  },
  {
    id: "R82",
    dimension: "ui",
    law: "A TABLE ROW HOLDS AT MOST SIX COLUMNS — THE SEVENTH GOES SOMEWHERE ELSE, NEVER SQUEEZED ONTO THE END. The client's ruling, 16 Sep 2026, over the Waves List view: \"the right side of the container in waves is shape wrong.\" UI-RULEBOOK N1 already named the ceiling (\"at most … six in a table row … the fifth fact moves to a second line … it does not get squeezed onto the end\") and Tickets' own `TICKET_COLUMNS_DEFAULT` stays at four (five on the Closed tab) by deliberate, dated design — but the ceiling was prose, not a check, so it could be broken silently. `waveListColumns` (`web/components/work/waves-screen.tsx`) is exactly that: the same commit that gave the T3 timeline's left column the wave's own App (client, 16 Sep 2026, \"I want the name of the app\") also gave List a SEVENTH column for it — Wave · Account · App · Sprints · Start · End · Status — on a collection that was already at the six-column ceiling before the App fact existed. A seventh column does not overflow the frame (the kit's own `<Table>` self-scrolls on the inline axis inside its own container, R39's `overflow-x-auto` — never through the card around it), it SQUEEZES: every column loses width to make room for the one that just arrived, most visibly at the row's own right end, where Start/End/Status crowd together against the card's own inset — the shape she is naming. THE FIX IS N1's OWN PRESCRIPTION, not a narrower table: the App fact rides the Account cell's own second line, the identical primary-plus-muted-subline shape `record-timeline.tsx`'s own `TimelineRow.sublabel` already draws one column along, never a column of its own. A STATIC CENSUS, off the disk: every array literal in `web/`, `web-portal/` and `shared/web/` whose elements are ALL object literals carrying both a `key` and a `label` property — the shape `TableColumn` and nothing else needs both of — is a table's own column list, and its element count must be six or fewer, or the array's enclosing function is named in `TABLE_COLUMN_BUDGET_EXEMPT` with the real reason. OUT OF THIS CENSUS'S REACH BY CONSTRUCTION, stated rather than exempted: a RECIPE-DRIVEN column list built by `.map()` over a config array (`tasks-screen.tsx`'s and `stories-screen.tsx`'s own `tableRecipe.fields.map(…)`, `contacts-screen.tsx`'s `contactColumnHeaders`) is not a literal array of object literals at all — its own ceiling is the recipe's `fields` array, a question for whoever edits that config, not for a census reading TSX source.",
    why: "The kit's `Table` already answers the OVERFLOW question — its own container is `overflow-x-auto`, never `overflow: hidden`, so a wide table scrolls inside itself rather than spilling past the card around it (`shared/ui/components/table/table.tsx`'s own header: \"the container scrolls rather than hiding\"). That ruled out the obvious reading of \"shape wrong\" (a clipped right edge) and pointed at the other, quieter failure a column budget catches: a table that still FITS, by shrinking every column to make room for one more, reads as cramped rather than broken, and the client's own eye caught it before a scrollbar ever would have. N1 already had the sentence (\"it does not get squeezed onto the end\") and three worked examples — the language switcher, a 9-column table, two 8-fact rows — all fixed by 26 Aug 2026 and never enforced again once fixed, which is exactly how an eighth grew unnoticed six weeks later. The census reads by SHAPE (key + label, both required TableColumn fields, present together on every element) rather than by TypeScript's own type, because a build-time census has no type checker to ask and a positional signature is the same trade every other law in this file already makes.",
    checkId: "table-column-budget",
    status: "enforced",
  },
  {
    id: "R83",
    dimension: "ui",
    law: "A TAB STRIP AND WHAT IT LABELS SHARE ONE GAPLESS COLUMN — THE STRIP PAYS THE WHOLE DISTANCE, A CALLER NEVER PAYS IT TWICE. The client's ruling, 16 Sep 2026: \"reduce the spacing above ALL TOOLBARS. i want it exactly as its currently below, make it like that above.\" `<ToolbarRow>` already pays its own trailing gap to what sits below it, once, as its own baked-in `mb-[var(--toolbar-content-gap)]` (R49) — that is the BELOW number, `--toolbar-content-gap`, `--space-5`. The ABOVE number is the identical value, `--tab-content-gap` (`web/app/globals.css`'s own comment: \"one value, not a new one … the same '--space-5' both already spend\"), paid by the tab strip that sits above the toolbar as ITS OWN trailing `pb-[var(--tab-content-gap)]` (`STICKY_FOLDER_TABS`, `shared/web/screen-engine/tabs-view.tsx`) — so the two numbers were already equal in the token, and every screen but one spent each exactly once: `paged-find.tsx`, `tickets-collection.tsx`, `kwapso-screen.tsx`, `settings-screen.tsx` (twice), `module-settings-screen.tsx` and `screen-bits.tsx`'s own `SectionWithCreate` all wrap a `renderFolderTabs(…)` call and the card/panel it labels in a column carrying NO `gap-*` of its own — `paged-find.tsx`'s own comment states the rule in as many words: \"this column has nothing to say about it either way and must not grow a `gap-*` of its own — that would be a second opinion about one number.\" `waves-screen.tsx` was the one call site that disagreed: its `renderFolderTabs(…)` call and the `<CollectionCard>` beneath it sat directly inside the screen's own OUTER `flex flex-col gap-6` column, alongside the page heading — a PER-SCREEN WRAPPER spending a second, unrelated 24px on top of the strip's own 20px, above the toolbar and nowhere else, which is exactly why the ABOVE gap measured larger than the BELOW one despite the token being identical. Fixed by giving the strip and its card their own inner `flex w-full flex-col` (no `gap-*`), the same shape the other six call sites already draw, with the heading staying in the outer `gap-6` where a real, single gap belongs. A STATIC CENSUS, off the disk: every `renderFolderTabs(` call whose immediate JSX parent element (fragments walked through, the same transparency R49's own census gives them) carries a `gap-*` or `space-y-*` utility in its `className` is a caller paying the strip's own number a second time, unless the file is named in `TOOLBAR_LEAD_GAP_EXEMPT` with the real reason.",
    why: "The two tokens (`--tab-content-gap`, `--toolbar-content-gap`) were never the bug — both read `var(--space-5)` since R49 was written, and globals.css says so in its own header (\"one value, not a new one\"). The bug was a wrapper spending a SECOND number on top of the first, the identical shape R49 itself was written to stop (\"a call site that also wraps this row in a gapped column is paying the same gap twice\") — just one element higher in the tree, above the strip rather than below the row. `waves-screen.tsx`'s own comment named the reason it diverged: \"Waves is bespoke throughout, so this file calls the same exported helper directly rather than adopting the whole `SectionWithCreate` engine\" — reaching for the shared HELPER (`renderFolderTabs`) without also reaching for the shared WRAPPER SHAPE around it is exactly how one bespoke screen re-grew a gap six others had already agreed to stop paying. Checked as a census rather than left to the next screen's own care, because `SectionWithCreate`'s own comment already predicted the failure mode by name three lines above the code it describes: \"or the same number gets two owners again.\" AMENDED THE SAME DAY, 16 Sep 2026, MEASURED ON STAGING: \"every screen but one spent each exactly once\" was true of the CENSUS above (the wrapping `gap-*`/`space-y-*` check) and false of the SCREEN — that census only ever asked about a column wrapping `renderFolderTabs(…)`, and never asked what `<CollectionCard>`'s own `CardContent` spends after the strip's `pb-[var(--tab-content-gap)]`. Tasks (1600px) measured 52px above its toolbar against 20px below; Settings › Team › Members and Contacts (1280px) measured 44px above against 20px below — the card's own leading `p-4`/`lg:p-[var(--space-7)]` inset paying a second, unrelated 16-to-32px on top of the strip's correct 20, on every screen the wrapper census called clean. Fixed in `web/app/globals.css`: `.pinned-strip + [data-slot=\"card\"]` zeroes both the card's real `padding-top` on its `[data-slot=\"card-content\"]` and the R63 `--pinned-lead` custom property that reproduces it while the toolbar is stuck — the second half is load-bearing, because leaving `--pinned-lead` at the old 16/32 ladder while the real padding dropped to zero would pull a pinned toolbar UP PAST the card's own top edge, into the strip. Proved by `web/test/toolbar-lead-gap-card.test.tsx`: a real render of `renderFolderTabs` + `<CollectionCard>` shows the exact DOM adjacency (`.pinned-strip` immediately followed by `[data-slot=\"card\"]`, whose `[data-slot=\"card-content\"]` starts with `[data-slot=\"toolbar-row-pin\"]`) the new CSS rule depends on, and a census over `web/app/globals.css` proves the rule is there. AMENDED A SECOND TIME, 16 Sep 2026 EVENING, BY THE CLIENT'S OWN REACTION TO THE FLUSH-ZERO FIX: \"I'm not happy about this. It doesn't look good. Can we do an in-between with what it was and what it is now? Also, make sure it's the same on every page. I don't understand how task was 52 and setting and contacts were 44. It should be the fucking same everywhere.\" Flush-zero (above = below = 20px) proved the double-payment was gone, and was never itself the target — the LAW now is: above a toolbar = `--toolbar-lead-gap` (32px) on every screen; below = 20px (`--toolbar-content-gap`, untouched). One new token, `--toolbar-lead-gap: var(--space-7)` (`web/app/globals.css`, defined beside `--tab-content-gap`/`--toolbar-content-gap`) — 32px, the in-between she asked for, and the scale's OWN exact 32px step (`shared/ui/foundations/tokens/tokens.css`: \"p-8 is 32px, which is --space-7 here\"; `--space-6` is 24px, a card inset, not 32 — the number this token first reached for by name was the wrong one). The strip above a toolbar still pays `--tab-content-gap` (20px) as its own trailing padding; the card pays only what `--toolbar-lead-gap` has left, `calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` (12px), on both `[data-slot=\"card-content\"]`'s real `padding-top` and the R63 `--pinned-lead` property beside it — the same two-halves-together reasoning as the first amendment, now paying a remainder rather than zero. `web/test/toolbar-lead-gap-card.test.tsx` proves the token, the exact `calc()` on both properties, and — off the disk, never a hand-typed list — every `renderFolderTabs(` call site the rule actually reaches: `screen-bits.tsx`'s `SectionWithCreate`, `paged-find.tsx`'s `PagedFind` (through its own `wrap` prop, filled by real callers), `tickets-collection.tsx`, `waves-screen.tsx`, and `settings-screen.tsx`'s OUTER strip (whose Modules panel is a bare kit `Card`) — and confirms `kwapso-screen.tsx`, `module-settings-screen.tsx`, and `settings-screen.tsx`'s OWN NESTED Team/Roles strip correctly draw no card at all, so the rule reaches nothing there by design, not by omission.",
    checkId: "toolbar-lead-gap",
    status: "enforced",
  },
  {
    id: "R84",
    dimension: "ui",
    law: "MANGO LIVES ONLY IN THE TITLE COMPONENT; EVERY BUTTON OFF IT IS BLACK. The client's ruling, 16 Sep 2026 evening, verbatim: \"Let's revisit the rule of only one mango button per screen. Only mango buttons on the title level. Title means the title component on top. Only those can be mango, the others black.\" A NEW law, not an amendment — no numbered app law ever governed mango's POSITION; the only prior rule was the vendored kit's own §2.5 (\"Mango is a brand fill… The kit also rules one mango per view\", `shared/ui/docs/RULES.md`), echoed by hand in three code comments (`triage-queue.tsx`'s Undo — \"the kit rules one brand fill per view\"; `roles-matrix.tsx`'s \"New role\" — \"the kit rules one mango per view… this tab's one mango belongs to Invite\"; `members-gallery.tsx`'s \"+\" — \"THE ONE MANGO ON THIS TAB IS THE `+`, AND IT IS HERE\"). That rule capped the COUNT (one, anywhere on the view); this one restricts the POSITION (only inside the title), and a title-only mango is still at most one per view, so R84 NARROWS kit §2.5 rather than contradicting it. THE TITLE COMPONENT, named rather than assumed: on a COLLECTION screen it is `CollectionHeading` (`web/components/records/collection-heading.tsx` and `web-portal/components/collection-heading.tsx` — same name, same shape on both front doors: the display-m `<h1>`/`<h2>` plus its own `action` prop, \"the screen's own door\", deliberately not the toolbar's); on a bespoke RECORD DETAIL screen it is `RecordScreen`'s own `actions` prop (`web/components/records/record-chrome.tsx`, B1: \"at most one primary and one secondary button\" share the title's own row); on the five recipe-driven details that draw through the OTHER path (`team.detail`, `members.detail`, `invites.detail`, `brand.detail`, `purposes.detail`), it is the kit's own `RecordDetail`/`RecordChrome` (`shared/web/screen-engine/screen-renderer.tsx`). THE CHECK reads the source: a static AST census over every `.tsx` file in `web/`, `web-portal/` and `shared/web/` finds every JSX `<Button>` whose `variant` is the mango one — `variant=\"default\"` (the kit's own name for the brand fill: \"`.kw-btn--primary` — mango fill, charcoal label. The one brand fill\"), stated OR OMITTED, since `default` is `Button`'s own default variant — and walks its ancestors, including through a JSX attribute's own initializer (so a Button handed through `action={…}`/`actions={…}` still counts as inside): nested under `CollectionHeading`, `RecordScreen`, `RecordDetail` or `RecordChrome`, it passes; anywhere else it is an offender unless its enclosing function is named in `MANGO_OUTSIDE_TITLE_OK` with the real reason, rot-checked both ways. A `variant` that is a COMPUTED expression (`action.variant`, `TRIGGER_TONE[tone]`, a ternary) is out of reach by construction, stated rather than exempted — the same posture R82 takes on a recipe-built column list — a rule that reads source cannot resolve what only runs at render. AMENDED 18 Sep 2026, client ruling verbatim, \"edit button is never black (even when it's only one)\": the edit PEN specifically is quiet everywhere, never `inverse` and never mango even where it is the one button a title draws alone — `web/test/pencil-button-census.test.ts` reads every `<Button>` drawing a `PencilSimple` glyph under `web/components/` for exactly that.",
    why: "*Earned by:* a sweep finding 27 mango buttons outside a title, three of them shared seams worth more than the other twenty-four combined — `FormShell`'s own `SubmitButton` (every one of the ~38 forms R4 routes through it; its own comment called it \"the one mango control on the screen\"), `screen-bits.tsx`'s `AddButton` (UI-RULEBOOK B14's own words: \"the one mango control in a toolbar row\", eleven call sites), and `collection-frame.tsx`'s `createActionButton`/`CollectionEmptyState` (\"Add the first\", composition 27.21's own carve-out) — then twenty individual dialogs, sheets, list rows and forms across both front doors, every one switched to `variant=\"inverse\"`, the kit's own black (charcoal fill, off-beige label — already this app's convention for \"the black chip is always the ID\", `recordNumber`). Two are named in `MANGO_OUTSIDE_TITLE_OK` rather than fixed: `AgentPanel` and `AskTheAssistant` (`web/components/assistant/`), the assistant strip, owned by a different lane and left untouched here on purpose. `Badge`'s own default-mango convention (kit §2.5's other clause, \"for the pile you are actually working\") is untouched — this law reads `Button` only, the control the client's ruling named.",
    checkId: "mango-in-title-only",
    status: "enforced",
  },
  {
    id: "R85",
    dimension: "ui",
    law: "EVERY RAIL DESTINATION IS NAMED IN ONE WORD. The client's ruling, 17 Sep 2026, verbatim: \"Make it a rule that in the navigation bar, we only have one-word names. For example, 'Knowledge Base': reduce it to 'Knowledge'. We need an alternative for work logs. Propose me multiple.\" A DESTINATION is a link a person can click to land somewhere — every `NAV` entry that carries a real `group` (not `\"none\"`) and is not `inRail: false`, and every `TEAM_SECTIONS` row with `placement: \"sidebar\"` (`web/lib/pages.ts`) — the same two lists `app-shell.tsx`'s own `universal`/`sidebarPages` read to draw the rail, so the census asks the SAME source the rail does rather than keeping a second, driftable list. Its `title`, in English (`shared/i18n-strings.json` makes English the key R28 already stands on — a translation is not held to this word count, only the source string is), must be exactly one word: no space, no hyphen. The rail's THREE GROUP HEADINGS (`NAV_GROUP_LABELS`: \"My work\", \"Build\", \"Accounts\") are a different kind of label — they title a SECTION, never a place a click lands — and are named in `RAIL_LABEL_WORDS_OK` rather than measured, because whether the client's ruling reaches them at all is still open: her example and her one open question (\"an alternative for work logs\") were both about a DESTINATION, and a heading was never named. Every one of the three sat in the table, reason \"groups are headings, not destinations; awaiting her word\" — not because two of them (\"Build\", \"Accounts\") would fail the count anyway, but because the exemption was honest about WHY a group was untouched rather than silently passing a check that was never asked about it. ANSWERED THE SAME DAY: the client's ruling, 17 Sep 2026, verbatim: \"No, the rail group heading can have two words.\" The three group headings are exempt from the one-word count BY RULING now, not merely awaiting one — `RAIL_LABEL_WORDS_OK`'s own reason carries her words. RED THE DAY THIS LAW WAS WRITTEN: \"Knowledge base\" (the `knowledge` sidebar entry) and \"Work logs\" (the `time` sidebar entry) both carried two words. \"Knowledge base\" → \"Knowledge\" everywhere it is a user-facing label (R6/R34 — the glossary term, every `t(\"Knowledge base\")` call site, the translations), the route (`/knowledge`) and every identifier unchanged. \"Work logs\" had no client pick at first: the client asked to be shown alternatives rather than have one chosen silently for her (the base's own standing practice — never ask her to choose from prose), so the `time` entry shipped \"Hours\" as the recommendation while she decided, live so the law read green — then she named it, the same day, verbatim: \"The word for work logs is logs.\" The `time` entry now ships \"Logs\". \"Work logs\" itself is untouched everywhere else it is said — the glossary term and every record's own tab (story/task/meeting/ticket detail) — because only the RAIL destination is under this law; a tab label is not a destination by this law's own definition.",
    why: "The rail is up to six slots wide on a phone before the icon even earns its keep, and a two-word label is the one shape that reliably wraps or truncates there (`app-shell.tsx`'s own comment measured it: `min-w-0` on a `flex-1` slot at 375px leaves about 59px). The client's example names the exact defect (\"Knowledge Base\" wrapping to two lines) and her own fix (\"reduce it to 'Knowledge'\"), so the law is her sentence read back as a check rather than a designer's inference from it. \"Work logs\" is the harder half on purpose: picking a silent replacement is exactly what her own standing rule (never ask her to choose from prose, but never choose FOR her either without asking) argues against, so the law's own text carries the four alternatives beside the provisional pick, the same place a future reader — or she herself — would look to change it, rather than a decision buried in a chat log RULES.md itself warns rots the moment nobody reads it there again.",
    checkId: "rail-labels-one-word",
    status: "enforced",
  },
  {
    id: "R86",
    dimension: "ui",
    law: "IN ANY COLLECTION, THE ONE COLOURED CHIP IS THE RECORD'S STATUS. The client's ruling, 17 Sep 2026, verbatim: \"I have changed my mind regarding chips. In a database where there are different columns, the one that gets the chip with the color is always the status. This means that for tickets, we need to find icons for the ticket type and assign colors to the status.\" A list row, a board card or a record's own head chip row may colour exactly ONE categorical field — its STATUS (`shared/status-tones.ts`, `shared/app-stages.ts`, D17) — and every other categorical field (a type, a category) draws an ICON or plain text, never a colour. PRIORITY ON TASKS IS THE ONE ALREADY-RULED EXCEPTION (K19a, \"Priority has its own four colours, never App Stage's\") and is named rather than silently allowed. Tickets are this ruling's own worked example: `ticketTypeColour` (`web/lib/type-colours.ts`) drew a coloured dot for a ticket's TYPE on the list row, the board card, `TicketChips`, the type picker and the portal's own row since 2026-09-06 — retired everywhere a CHIP reads it, replaced by `ticketTypeIconName` (`shared/ticket-types.ts`), the identical closed-map, kebab-case, `iconComponent()`-resolved pattern `storyTypeIconName` (`shared/story-types.ts`) already stands for story type (K26). Four glyphs, verified against the kit's own generated exports: Issue → `Bug`, Question → `Question`, Extra → `PlusCircle`, Feedback → `ChatCircleText`. `ticketTypeColour` is NOT deleted — the tickets dashboard's own chart series (bars, legends, a relationship map's node colours) is the one reader left, because an AGGREGATE chart's series colour is a different domain from a record's own chip, never itself \"the chip with the color\" her ruling names. CHECKED as a source census, `status-owns-the-chip` (`web/test/status-owns-the-chip.test.ts`), over `shape.tsx` and the ticket collection/detail components her ruling's own worked example touched (plus `tasks-screen.tsx`, home of the one named exception): every `<Badge variant=\"status\" dot={…}>` and `<Swatch colour={…}>` is resolved through at most a few local `const` hops to what it actually names, and passes only when that resolves to something naming status, stage or waiting, or the file+function is named in `COLOURED_CHIP_OK` with the real reason (rot-checked both ways, so the list can only shrink) — an expression whose root traces to a function PARAMETER (the generic `ChoiceGroupHome.colour` seam no group has wired) is out of reach by construction, the same posture R84 takes for a computed `variant`.",
    checkId: "status-owns-the-chip",
    status: "enforced",
  },
  {
    id: "R87",
    dimension: "ui",
    law: "A TITLE FITS ONE LINE ON A MACBOOK AIR, AND EVERY TITLE-SHAPED FIELD IS CAPPED THERE. The client's ruling, 18 Sep 2026, verbatim: \"for all titles (main, details, all) i would like to limit the lnght to what would fit in 1 line in a laptiop. this menas a max charactes for titles in the forms (not sutting it) wdyt? and ow many cahracters would taht be? consider text size regualr and the monitor size of a macbook\" — and her pick, shown a side-by-side of three enforcement options: \"for title lenght. set this limit considering macbook air, enforce with e3.\" MEASURED, NOT GUESSED: the artifact \"Title Length\" canvas-measured how many characters of regular-weight text fit on ONE LINE, at MacBook Air width (1440×900), in the app's three one-line title steps — the record heading (64 characters), the collection heading (65), the list title cell (57) — and the narrowest of the three, rounded DOWN for a comfortable margin, is `TITLE_MAX_CHARS = 50` (`shared/types.ts`), ONE constant for all three rather than three separate ceilings, because one title moves between all three renderers (a ticket is a record head on its own screen and a list cell in Tickets, and a field that fits its narrowest home fits every home). \"ENFORCE WITH E3\" names the THIRD of three options the side-by-side offered: a HARD CAP in every form (the input's own `maxLength`, so the 51st character never types, plus a live \"N / 50\" counter through the kit `Field`'s own `count`/`countMax` — a NUMBER, not a sentence, so R81's ban on form hints does not catch it) PLUS an ELLIPSIS FALLBACK for a record that already exceeded the ceiling before it existed — never a retroactive rejection. TWO SEAMS, ONE CONSTANT, so the form and the door can never disagree about what \"too long\" means. THE FORM SEAM: every title-shaped FIELD CONFIG — a ticket's Title, a story's and a task's \"What needs doing\", a meeting's \"What it is about\", a wave's and a sprint's name, an app's \"What it's called\", an account's Name, a knowledge source's \"What is it called?\", and a to-do's (the glossary's Input) \"What we need from them\" — spreads `validation: { ...defaultFieldConfig.validation, maxLength: TITLE_MAX_CHARS }` and the input beside it carries the identical `maxLength={TITLE_MAX_CHARS}` and a `count`/`countMax` pair on its `<Field>`. Deliberately NOT counted as titles, and left alone: a dropdown VALUE (`selectable-form-dialog.tsx`'s `optionField` — a Choice, never a record with its own heading), a ROLE's name, a PROCESS's or a STEP's name (named records of their own, but not the ones her ruling's examples or the canvas measurement were taken against), and a PERSON's name (`contact-link-dialog.tsx`'s `ContactCreateDialog.nameField`, \"Marta Bergman\" — a person's name is not a title, and the file sits outside the owned `*-form-dialog.tsx` glob regardless). THE DOOR SEAM: every matching WRITE DOOR — `createTicket`/`updateTicket` (titleEn/titleDe), `createStory`/`updateStory`, `createSprint`/`updateSprint`, `createTask`/`updateTask`, the to-do door, `createMeeting`, `postCreateWave`/`postUpdateWave`, `postCreateApp`/`postUpdateApp`, `createAccount`/`updateAccount`, and every `createSource`/`postCreateKnowledge`/`postUploadKnowledgeFile`/`postUpdateKnowledge` title read — calls `requireText`/`optionalText` with `TITLE_MAX_CHARS` in place of `TEXT_LIMITS.short`, positionally (R20's own discipline, held to this one field on each door). THE RENDER SEAM: every ONE-LINE TITLE RENDERER truncates with an ellipsis and carries the full string as its `title` attribute, so a record whose title predates the ceiling is never rejected, only ever shown short — `clampRecordHeading` (`shared/web/record-heading.tsx`, read by both the bespoke `record-chrome.tsx` detail screens and every recipe-driven detail through `screen-renderer.tsx`) moved from a two-line `line-clamp-2` to a one-line `truncate`, which is a STRICTER bound serving both the 1 Sep 2026 missing-title problem (an arbitrarily long description standing in for one) and this ceiling; `CollectionHeading` (`web/components/records/collection-heading.tsx`) wraps its own text through the same helper; and `RecordTable`'s first column (`web/components/records/record-table.tsx`, \"the list title cell\" by this file's own convention) truncates through the identical helper whether or not a leading `RecordRef` chip is drawn beside it.",
    why: "Enforced twice over because a limit that only lives in the form is a limit a machine caller (an import, the MCP surface, a future integration) can walk straight past, and a limit that only lives in the door with no COUNTER is a person typing into a void until the 51st keystroke silently vanishes. CHECKED as a source census over the form field configs (every object literal spreading `...defaultFieldConfig` whose `label` matches a title field, walked the same way R81's hint census already walks `field-config-keys.test.ts`'s own parse) and over the door call sites (every `requireText`/`optionalText` call naming a title-shaped field, the same `appFiles()`/route-source walk R20's own positional census stands on), plus a render assertion that `clampRecordHeading` draws `.truncate` rather than `.line-clamp-2` and that `CollectionHeading`/`RecordTable` both import it.",
    checkId: "title-length",
    status: "enforced",
  },
]

/** R74 (`import-opens-a-tab`) — the reasoned, rot-checked way out for an
 * import-wizard navigation that does not go through `openInNewTab`
 * (`web/lib/nav.ts`), keyed by the file's path relative to `web/`. Empty is
 * the goal: every owned call site went through the seam the same change that
 * added this law, and the accounts collection's own two "Import CSV" sites
 * (`collection-content.tsx`) were removed outright by a separate lane the
 * same day rather than needing a line here. Checked both ways by
 * `web/test/import-opens-a-tab.test.ts`: a line naming a file that carries no
 * such dispatch any more has outlived its subject and fails the build, the
 * same discipline every other `_EXEMPT` table in this file is held to. */
export const IMPORT_TAB_EXEMPT: Record<string, string> = {}

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

/** R81 — A FORM CARRIES NO HINTS. Keyed by repo-relative path, and only a
 * path `web/test/form-hints.test.ts` actually reads. Rot-checked BOTH ways: a
 * line naming a file that carries no hint the census would otherwise catch
 * has outlived its subject and fails the build, so the list can only shrink.
 *
 * EMPTY, AND EMPTY IS THE GOAL — the client's ruling was blanket ("delete all
 * of that... clean it everywhere") and named no exception. The one shape this
 * table exists FOR, if it is ever needed, is her own second clause: a hint
 * that carries something the user cannot know otherwise (an irreversible
 * action's consequence) — and even that belongs in the CONFIRM dialog that
 * asks about the action, never in the create/edit form beside it. Adding a
 * line to make a red build green is the one use of this list that is never
 * correct: she has said, in the same sentence, that she will ask explicitly
 * when a hint is wanted back. */
export const FORM_HINT_OK: Record<string, string> = {
  "web/components/work/review-dialog.tsx":
    "\"Reading what's attached…\" is a LOADING indicator (the attachment list has not " +
    "answered yet, `shown === null`), not a hint — the same status shape \"Loading…\" " +
    "draws elsewhere in the app (agent-usage-dialog.tsx, agent-history-tab.tsx). The " +
    "census cannot tell a loading state from an explanation by shape alone; this line " +
    "makes the call by hand rather than teaching the check a third colour to special-case.",
}

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
    "The member's own full-screen profile (web/components/team/member-screen.tsx), at /t/<teamId>/members/<userId> — the client's own \"when clickingon card in team, open full screen the profile (we wil ad more to this)\", 2026-09-10, superseding the slide-in that shipped the day before. A card on Settings › Members' own gallery is a real anchor to it, and the profile is where their role is changed and they are removed from the team.",
  roles:
    "Settings › Roles, the roles matrix (web/components/team/roles-matrix.tsx) — every role's rights at once, the client's own \"All the roles together, I want to have an overview\"; a role is a COLUMN since 2026-09-10 (\"would it not make more sense taht the roles are the cokumns and the permissions the rows\"), and pressing its column head opens the role's slide-in, where it is edited and switched on or off. The retired roles LIST screen's \"Export CSV\" download (the one act that had no other home when that screen went, 2026-09-14) moved onto this same header, beside \"New role\".",
  invites:
    "Settings › Members, the Invites button on the members toolbar (web/components/team/members-gallery.tsx) — the client's own \"the invites, make it secondary button on the toolbar\", 2026-09-09. It expands the pending invites beside the wall, and each row can be revoked from there.",
  // THE THREE ABOVE MOVED FROM THE TAB HALF TO THIS ONE, 2026-09-14 — see R64's
  // own registry row, clause (vi). Until then they were TAB sections the
  // "This team" list subtracted; the client's ruling that day ("Team
  // management is reachable only from Settings › Team. The team area's own
  // standalone pages must go.") retired the collection SCREENS themselves,
  // which the subtraction alone had never done, so all three moved to
  // `placement: "contextual"` and now answer to clause (v) instead — none is
  // reached by a literal ending at its own segment, same as `processes`
  // below, so all three still need a line here.
  //
  // THE FIRST LINE THIS LIST EVER TOOK FROM THE CONTEXTUAL HALF, added 11 Sep
  // 2026 with clause (v). `processes`, below, was never on the "This team"
  // list at all — it is `placement: "contextual"`, and the widened census
  // found that no literal
  // navigation anywhere under web/ ends at `/processes`. It was orphaned by the
  // same blindness that let `dropdowns` sit unlinked for ten days, and it was
  // found the moment the law could see that shape.
  processes:
    "An app's own record, the Processes panel on its Maps tab (web/components/apps/app-detail.tsx) — a process map is always a map OF something, so the question is never \"show me every map\", it is \"how does this app work\". The panel lists that app's maps with their step and version counts and opens each one at /t/<teamId>/processes/<id>, which is the address the COLLECTION screen at /t/<teamId>/processes would have led to anyway. Apps is a first-class sidebar page, so the route in is two clicks from anywhere. The collection screen still resolves and still works; what it does not have, and has never had, is a link.",
  purposes:
    "Settings › Meetings › Choices, the meeting-types panel (web/components/screens/module-settings-screen.tsx) — 15 Sep 2026, Task C: the client's own ruling that a meeting's purpose \"is a choice component, so make sure you move it inside meetings, settings, choices\" and the RENAME the same sentence asked for (\"maybe just 'type'\"). That page's `meetings` segment now carries a `choices` section mounting `MeetingTypesPanel` (web/components/team/internal-screens.tsx), a RecordTable of Name/Department/Status with its own add dialog, reading the same `meeting_purposes` doors and cache key the old screen and the meeting form's own picker always did. THE MEETINGS SCREEN'S OWN BUTTON IS GONE OUTRIGHT NOW, 16 Sep 2026 — it briefly redirected here (relabelled \"Meeting types\") rather than opening the old collection at /t/<teamId>/purposes, and the client's own next ruling removed the shortcut entirely, verbatim: \"On the main meetings screen at the bottom, there are meeting types, but this should not be there because this is already on the meeting settings, so remove it from there.\" `MeetingsScreen` dropped `onPurposes`/`canReadPurposes`/`purposeCount` outright (web/components/meetings/meetings-screen.tsx's own header block carries the ruling in full); this page is now the section's ONLY door, not merely its preferred one. The old screen (`PurposesScreen`, internal-screens.tsx) still resolves and still works, kept on disk deliberately rather than torn out across the several shared deep-link files that wire it (module-content.tsx, collection-content.tsx, write-panels.tsx, route.ts, use-screen-data.ts, use-screen-actions.ts, live-resources.ts, agent-trace.ts — none of them owned by this lane); what it does not have, and never has had, is a link. Full account in the Task C lane report.",
  // SPRINTS — hosted inside Waves (ruling 15 Sep 2026). Unlike `processes` and
  // `purposes` above, the collection screen itself did NOT stay standing: the
  // client's own words were "killing the sprints main page completely", so
  // web/app/sprints/[[...rest]]/page.tsx (the top-level shell) is deleted,
  // "sprints" left TOP_LEVEL_MODULES (web/components/deep-link/route.ts), and
  // collection-content.tsx's own `module === "sprints"` branch is gone with
  // it — a typed /sprints or /t/<teamId>/sprints now falls through to
  // NotFound rather than quietly still drawing the killed screen.
  sprints:
    "A wave's own record, the Sprints tab (web/components/work/wave-detail.tsx) — hosted inside Waves per the client's own ruling, 2026-09-15: \"sprints go inside waves… killing the sprints main page completely and just keeping the waves one\". That tab lists the sprints already in the package and is the ONLY door that creates one (its \"Plan a sprint\" button, plus \"Put a sprint in this wave\" for moving one already on the books); a sprint opened from there lands at the nested address `/waves/<waveId>/sprints/<sprintId>`, so its crumb trail names the wave and then the sprint, never a generic \"Sprints\" rung (crumbs.ts's own nested-trail clause — proved by web/test/nested-routes.test.ts's \"a sprint opened from its wave\" case). The `sprints` MODULE is unchanged and still gated (Settings › Modules and the roles matrix still list it, MODULE_PERMISSION still maps the segment) — only its stand-alone collection screen is gone; its recipe (`sprintsListRecipe`, web/lib/screens.ts) declares no `actions:` of its own for this clause to demand of the host. `web/components/work/sprints-screen.tsx` stays on disk: its `createSprintFrom` export is still `app-detail.tsx`'s own door for starting a sprint from an app's record, which this lane does not own and cannot repoint, so the file could not be deleted outright the way a `GONE_ON_PURPOSE` line would need — a future lane that moves that export elsewhere can finish the deletion.",
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
  "web/components/records/record-week.tsx":
    "THE SAME DISAMBIGUATION STEP AS RECORD-CALENDAR.TSX ABOVE, ONE ROOM OVER — the day's own overflow, behind its '+N more' chip on the desktop grid (the mobile pager needs no dialog at all: it shows a day's every entry uncapped). It collects nothing, asks nothing, and is bounded by a single day's rows; the same referral to the client stands, and if she rules that everything non-warning slides in, this line goes with record-calendar.tsx's.",
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
  all_stories:
    "`all_tasks`'s own shape, one module along (client ruling, 15 Sep 2026, the Stories tab strip's Everyone's tab). Read the row as a sentence: 'this role may see everyone's stories'. It is a switch over a SIGHT, and the stories themselves are already in the corpus as the `story` kind — so there is nothing here to file that is not filed, and a source saying 'this role can see everyone's stories' would be a permission fact wearing a passage's clothes.",
  all_inputs:
    "`all_tasks`'s own shape, one module along (the Inputs screen, 15 Sep 2026). Read the row as a sentence: 'this role may see everyone's inputs'. It is a switch over a SIGHT, and the inputs themselves are already in the corpus as the `todo` kind — so there is nothing here to file that is not filed, and a source saying 'this role can see everyone's inputs' would be a permission fact wearing a passage's clothes.",
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
  //
  // RAISED 16 -> 19 in all three, same day, tracker `d-steps`: the
  // what-it-did line's two `t()` sentences (a knowledge answer's candidate
  // count, singular and plural) and the third for whether the reader
  // re-read the shortlist. The server's own `reason` sentence beside them is
  // NOT one of the three — it is data, not catalogued copy, and never
  // touches `t()` (see `WhatItDid` in web/components/assistant/agent-sources.tsx).
  // Same $0-spend reason as every entry above it.
  //
  // RAISED 19 -> 20 in all three, 11 Sep 2026, tracker `b-gmail`: one new
  // sentence in the knowledge form's "Who can use it" field, said only for a
  // mirrored source genuinely sitting at "private" — see the file's own
  // comment on why the control used to show a wrong state instead of this
  // sentence. Same $0-spend reason as every entry above it.
  //
  // RAISED 20 -> 23 in all three, 11 Sep 2026, c-hijack B / c-misspell's
  // write door (0085): the account form's two new field labels (declared
  // spellings, and the "may narrow alone" checkbox) and their placeholder
  // example. Same $0-spend reason as every entry above it — accepted debt,
  // not a regression to chase.
  //
  // RAISED 23 -> 26 in all three, same day, 0086: the boolean checkbox
  // became a tri-state control (the owner's correction — an ALLOW alone
  // cannot close an already-rare name, only a DENY can) — one field label
  // and three option words replaced the single checkbox sentence. Same
  // $0-spend reason as every entry above it.
  //
  // RAISED 26 -> 33 in all three, 12 Sep 2026: the knowledge create dialog's
  // three video-link states (owner's own words — "show me it's loading,
  // show me what kind of transcript it's extracting, and then tell me when
  // it's done") added seven new sentences (the loading label, the pre-submit
  // hint, the two word-count sentences, and the three kind words) — none
  // translated yet, accepted debt in the same change that added them,
  // exactly as R44 asks.
  //
  // RAISED 33 -> 34 in all three, same day: the hub's own review of this
  // branch found that "null-safe is not honest" — a bare video link whose
  // door reply carried neither `read` nor `refusedBecause` (a door that
  // hasn't landed the feature yet, or genuinely found nothing to say) was
  // falling through to the generic "assistant can now use it" toast, a
  // promise the source's empty body would not keep. One more sentence for
  // that third state, said plainly instead.
  //
  // RAISED 34 -> 37 in all three, same day: the owner's own ask ("I would
  // love to see the steps... show progress, where we are, and what's
  // happening") added the theatrical narration on the knowledge create
  // dialog's video-link save — two predicted steps and the honesty-timeout
  // sentence, three new sentences none translated yet, accepted debt in
  // the same change that added them.
  // RAISED 37 -> 39 in all three on 14 Sep 2026. Two sentences, and they are
  // the SAME sentence said in the one place a reader can act on it. The owner
  // opened a 142,429-character transcript, scrolled to the bottom, and found it
  // stopping mid-word — the screen only ever asked for the first 20,000, and
  // the notice saying so sat at the TOP of the tab, thousands of pixels above
  // the cut he actually hit. The cap is raised (200,000 now, which holds every
  // source in the base whole) and past it the cut speaks WHERE IT HAPPENS.
  // Accepted debt in the same change that added them, per this law's own
  // sanctioned move.
  // RAISED 39 -> 41 in all three on 14 Sep 2026: the assistant's thinking strip
  // ("Working it out" / "Rough notes, not the answer."), which streams the
  // model's own reasoning into a disclosure a person may open. Two sentences,
  // English-only until the next translation pass.
  //
  // RAISED 41 -> 55 in all three on 2026-09-15, and NONE of the 14 are this
  // lane's own — every string the Meetings tabs/views redesign added
  // ("Everyone's", "Time", "Attendees", "Meeting type", "Meeting types") is
  // hand-seeded in `shared/i18n-seed.ts` and contributes zero. Measured with
  // `node scripts/i18n-extract.mjs` against the working tree this change
  // landed in, which — per this law's own header — several other in-flight
  // lanes were also writing to: the Meeting purposes → Meeting types CRUD
  // screen's own new strings ("New meeting type", "No meeting types yet.",
  // "Search meeting types…", three "Couldn't …meeting type…" errors) and a
  // knowledge-base pass ("captions", "description", "transcript", "Reading
  // the link…" and a dozen more) neither belongs to this lane, and this pin
  // records their rise honestly rather than by reverting a step neither this
  // change nor theirs was told to take — same move the paragraph above this
  // one already made once.
  //
  // RAISED 55 -> 61 in all three, same day, a few minutes later, re-measured
  // against the same tree after other concurrent lanes kept writing to it —
  // this codebase's own working copy is shared live (multiple sessions on one
  // checkout), so a number pinned once and not re-read at the end of a change
  // is already wrong by the time anybody reviews it. Six more, still none of
  // them this lane's: "1 app", "Almost done…", "\"{name}\" looks like it
  // belongs to an account you already have on file." and three more of the
  // same shape as the first 14. Re-measure before trusting this pin as final.
  //
  // RAISED 61 -> 71 in all three, same day, re-measured once more at the end
  // of this lane's own verification pass (`node scripts/i18n-extract.mjs`,
  // then this pin re-read against it) — ten more concurrent additions
  // ("Activated \"{value}\"." among them), still none from the Meetings
  // tabs/views change this comment sits beside. THIS IS THE NUMBER AT THE
  // MOMENT THIS LANE FINISHED; whoever reviews next should re-run the
  // extractor once more before trusting it, per the two paragraphs above.
  // LOWERED 71 -> 55 in es/ca (de already read 55), 15 Sep 2026, re-measured
  // fresh off `shared/i18n-strings.json` + `overlay(CATALOGUE, SEED)` while
  // finishing the Tasks tabs/views redesign — this lane's own three new hand-
  // seeded strings ("Planned", "Whenever", "Do it now", shared/i18n-seed.ts)
  // answered themselves in all three languages and could only ever move this
  // number down, never up; the rest of the drop from 71 belongs to whichever
  // change measured 71 last.
  //
  // LOWERED 55 -> 52 -> 45 in all three, same day, by more concurrent
  // translations landing while this file stayed open in more than one
  // session at once — this checkout genuinely is being written to live by
  // several lanes finishing on 2026-09-15 at once. 45 is what
  // `node scripts/i18n-extract.mjs` + `overlay(CATALOGUE, SEED)` answered at
  // the moment the Meetings tabs/views lane's own verification pass finished;
  // re-measure before trusting it, the same caution every paragraph above
  // this one already gave.
  //
  // LOWERED 45 -> 0 in all three, 2026-09-15, the post-round cleanup lane's
  // own pass: the exact 45 strings `node scripts/i18n-extract.mjs` +
  // `overlay(CATALOGUE, SEED)` named as untranslated at the top of this
  // session — the knowledge-base narration steps ("Reading the link…",
  // "Making sense of what it says…", "Almost done…"), the source-card copy
  // ("1 app"/"{count} apps", "Not filed under an app", "Not indexed yet",
  // "Reached us through {count} people", "{title} (not in use)", "Edit
  // filing"), the account-matching sheet ("File this under {account}?" and
  // its sentences), the alt-spelling review options ("May narrow a search on
  // its own" and its two siblings), "New meeting type", "Tasks by priority"
  // and the rest of the 45 the paragraph above already named — were
  // hand-translated into `shared/i18n-seed.ts` (never here, per that file's
  // own header), vocabulary kept consistent with what the seed already used
  // elsewhere (Account → Kunde/cuenta/compte, source → Quelle/fuente/font,
  // passage → Abschnitt/pasaje/fragment). `Padelbase, Asekurans` — a
  // placeholder of two proper nouns — carries the same value in all three,
  // the correct answer for a name that does not translate. Re-ran
  // `npm run lang` (extract, then prune) after seeding, then recomputed the
  // untranslated set with the check's own predicate (`coverage()`,
  // shared/i18n.ts): zero left in de, es and ca. 0 is the true count as of
  // this change, not a target chosen in advance — the pin falls exactly as
  // far as the count behind it does, per this law's own sentence, and no
  // further caution is owed the next reader beyond re-measuring before
  // trusting any pin in a checkout several lanes still write to.
  de: 0,
  es: 0,
  ca: 0,
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
  "components/gantt":
    "unreached as of 2026-09-15, and by a deletion this time: Waves' own Timeline (`waves-screen.tsx`) was its only caller, and the client's T3 ruling that day (\"for waves i choose t3\") replaced it with a bespoke, host-composed grid (`web/components/records/record-timeline.tsx`) instead — the kit's own CH27.26 laws for this component (a six-period ceiling with a stepper, the grid dropped for one row per lane below 720, five fixed tones with no neutral one) are load-bearing for the composition they were written for and do not fit a continuous week window with prev/next/today and phone scroll-snap, and giving `Gantt` a sixth, neutral tone for a wave's own gap segment is a kit change outside this round's authorised scope. Reaches back the day a screen genuinely wants CH27.26's own shape (a lane per app/account/member, six periods, a stepper) rather than this one.",
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
  "shared/automations.ts": {
    kinds: ["property"],
    via: ["t(a.title)", "t(a.description)", "t(a.helpText)"],
    why: "THE AUTOMATION REGISTRY (R70, client 2026-09-11: *\"I want no automation without visibility\"*). The same shape as `MODULE_SETTINGS` one entry down, and a copy table for the same reason: each row's `title`, `description` and `helpText` sit beside its `key`, its `segment` and the `<file>::<function>` it names — which are names of CODE and are never translated — so the words cannot be split off into a `t(...)` at the constant without splitting the row that holds them, and `t` is a hook a module-level table could not call anyway. All three are read through `t` in `web/components/screens/module-automations.tsx`, which is the one screen that draws them. `helpText` IS THE REASON AN AUTOMATION CANNOT BE SWITCHED OFF, and the property name is load-bearing rather than stylistic: it is one of the seven positions `scripts/lib/i18n-source.mjs` reads as copy, and `why` — the name every other registry in this file uses — is not one. A reason a person must READ has to be a sentence the catalogue can see, or it ships in English to somebody who chose German, which is R28's own failure committed in the one place this data is trying to be honest. The file is also imported by three WORKERS, which changes nothing here: a worker reads `key` and `switchable` and never a sentence.",
  },
  "web/components/screens/module-settings-screen.tsx": {
    kinds: ["property"],
    via: ["t(page.title)", "t(section.title)"],
    why: "MODULE_SETTINGS — the same shape as every copy table above, and the reason it is one is the client's own ruling of 2026-09-09 (*\"a lot of them are specific to the module\"*): a module's settings page is DATA, so that the second module is an entry in a list rather than a screen somebody writes. A page's `title` and each section's `title`/`description` sit beside the `segment` the URL is built from and the `types` the vocabulary is keyed on, which are names of data and are never translated — so the words cannot be split off into a `t(...)` at the constant without splitting the row that holds them, and `t` is a hook a module-level table could not call anyway. Every one of the three is read through `t` on the way to the screen (`t(page.title)`, `t(section.title)`, `t(section.description)`), and the gear reads the page title through `t` a second time for its own tooltip and accessible name. THE PAGE'S OWN `description` WAS THE FOURTH until 2026-09-10, when the client ruled *\"in ticket settings (or any other module) no subtitle\"* and the field was deleted rather than left unread — a column nothing renders is a sentence translated into three languages on every build for nobody, which is R28 calling it an orphan and this entry claiming it is translated where it is read.",
  },
  "web/components/shell/new-tab-screen.tsx": {
    kinds: ["property"],
    via: ["t(m.title)"],
    why: "MODULES — the new tab's own six-item scope-chip row, the same shape as `APP_SORTS`/`DELIVERABLE_SORTS` above: a module-level table so the scope chips and the six search doors share one declaration order (this file's own header), with `title` sitting beside the `key` each door switch is keyed on, which is a name of code and is never translated. `t` is a hook that table could not call at declaration, so the words are translated on the way to the screen instead, both places a chip's word is drawn (`<Badge>{t(m.title)}</Badge>` in the scope row, and the same `t(m.title)` again as the results section's own group caption).",
  },
  "web-portal/components/portal-shell.tsx": {
    kinds: ["property"],
    via: ["t(label)"],
    why: "DESTINATIONS — the portal's own bottom nav bar, the same shape as the agency's `web/lib/pages.ts` two entries up: a module-level table so the five tabs and the five routes they switch on share one declaration (this file's own header explains the fixed order and the five-tab ceiling), with `label` sitting beside the `href` each `<Link>` is built from and the `icon` component reference, neither of which is a sentence. `t` is a hook the table could not call at declaration, so `DESTINATIONS.map` destructures `label` and reads it through `t(label)` as it draws each tab.",
  },
  "web-portal/components/ticket-row.tsx": {
    kinds: ["property"],
    via: ["t(status.label)"],
    why: "STATUS_WORDS — the portal's own six-state vocabulary for a ticket's status chip, a client-facing rewording of the agency's internal stage names (this file's own header explains why: \"Scheduled\" is our word, \"Booked in\" is theirs). Keyed by the door's own status value, with `label` sitting beside the `variant` `<Badge>` needs, which is a token name and never a sentence — so the words cannot be split off into a `t(...)` at the module-level constant, and `TicketRow` reads the one row it needs through `t(status.label)`.",
  },
  "web/components/accounts/contacts-screen.tsx": {
    kinds: ["field-label"],
    via: ["translateFields"],
    why: "CONTACT_COLUMNS/PORTAL_COLUMN — this file's own header already says it: the host's own table columns, spread on after `resolveRecipe` has translated the recipe, so they are translated the same way, by `translateFields(columns, t)` (`web/lib/screens.ts`, the identical seam `web/lib/screens.ts`'s own entry above names) at the point the recipe is built for the table.",
  },
  "web/components/accounts/inputs-screen.tsx": {
    kinds: ["property", "field-label"],
    via: ["t(tab.label)", "translateFields"],
    why: "TWO TABLES, the same two shapes named elsewhere in this file: `INPUT_TABS` (the three tabs — Waiting/Overdue/Received) is read through `t(tab.label)` as the strip is drawn; `INPUT_COLUMNS` is the host's own table columns, translated the same way as `contacts-screen.tsx` one entry up, through `translateFields(INPUT_COLUMNS, t)` on the way to the table recipe.",
  },
  "web/components/knowledge/google-connections.tsx": {
    kinds: ["property"],
    via: ["t(SERVICE_COPY[service].label)", "t(SERVICE_COPY[service].scope, BRAND)"],
    why: "SERVICE_COPY — the four Google services (Drive/Gmail/Calendar/Chat) and the one privacy sentence each earns (this file's own header: \"a privacy sentence that is 99% true is worse than a longer one that is true\"). `label` sits beside nothing codey — it is a copy table because the four rows share one shape a screen renders identically, keyed by `GoogleService`, which is a name of data. Both fields are read through `t` where the row is drawn.",
  },
  "web/components/knowledge/google-scope-dialog.tsx": {
    kinds: ["property"],
    via: [
      "t(m.title)",
      "t(m.description, BRAND)",
      "t(EVENT_KINDS[kind].title)",
      "t(EVENT_KINDS[kind].description)",
    ],
    why: "TWO COPY TABLES. `MODES` (gmail/calendar × everything/only) is read through `t(m.title)`/`t(m.description, BRAND)` as the dialog's own two radio cards are drawn. `EVENT_KINDS` — \"Google's six kinds of calendar entry, in words a person recognises\" (this file's own header) — is keyed by `GoogleEventType`, Google's own API value, which is never translated, and its `title`/`description` are read through `t` beside each kind's own checkbox.",
  },
  "web/components/knowledge/google-source-dialog.tsx": {
    kinds: ["property"],
    via: ["t(k.title)", "t(k.description)", "t(s.title)", "t(s.description)"],
    why: "TWO COPY TABLES, same shape as google-scope-dialog.tsx above. `KINDS` (folder/file — \"the two shapes a Drive share can take\") is read through `t(k.title)`/`t(k.description)`. `SHELVES` (private/team — who can read a shared source) is read through `t(s.title)`/`t(s.description)`; this file's own comment on `SHELVES` already explains why title and description are catalogued together rather than one translated and one not.",
  },
  "web/components/team/internal-record-dialog.tsx": {
    kinds: ["property"],
    via: ["t(f.placeholder)", "config={{ ...defaultFieldConfig, label: f.label }}"],
    why: "SIX FIELD-DEFINITION TABLES (brandAssetFields, deliverableFields, and four more below them) — one `InternalField[]` per internal record kind, kept beside the form rather than at each call site because \"the CREATE panel and the EDIT panel for one record kind have to offer the same fields, and two lists that must match are one list\" (this file's own header). Each field's `placeholder` is read through `t(f.placeholder)` at the input. Each field's `label` is NOT read at the declaration — it rides into a FRESH object built at render (`config={{ ...defaultFieldConfig, label: f.label, required: !!f.required }}`), which is the positional field-config exemption R33's own law text describes, one level removed: the declaration array is plain data, and the object that actually spreads `defaultFieldConfig` is the one `<Field>` builds from it.",
  },
  "web/components/work/stories-screen.tsx": {
    kinds: ["property", "field-label"],
    via: ["t(tab.label)", "translateFields"],
    why: "TWO TABLES, the same two shapes as inputs-screen.tsx above. `STORY_TABS`/`EVERYONE_TAB` (Now/Planned/Backlog/Completed, plus the permission-gated fifth) are read through `t(tab.label)` as the strip is drawn. The table columns are translated through `translateFields(columns, t)` on the way to each view's own recipe, the same seam `web/lib/screens.ts`'s own entry above names.",
  },
  "web/components/work/tasks-screen.tsx": {
    kinds: ["property", "field-label"],
    via: ["t(tab.label)", "translateFields"],
    why: "TWO TABLES, the identical shape as stories-screen.tsx above — the two screens share the \"mine\" tab strip pattern (this file's own header: \"three tabs, plus a fourth for whoever may see everyone's\"). `TASK_TABS` is read through `t(tab.label)`; `TASK_COLUMNS`/`EVERYONE_COLUMNS` are translated through `translateFields(columns, t)` on the way to each view's own recipe.",
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
 *   • "locked" is NOT here, and it was WEIGHED on 2026-09-11 rather than
 *     skipped. That is the day `Protected` stopped being a word about Choices
 *     alone and became the word for any row a person can see and cannot switch
 *     off, automations included (the client: *"like we have protected choices
 *     to have protected automations"*), which is exactly the moment a competing
 *     word earns a second look — and "Locked" is the one the glossary's own
 *     entry records itself rejecting. It still fails the bar, and the app says
 *     so out loud: "Locked" and "Locked by policy" are ALREADY two catalogued
 *     sentences, and they are the roles matrix saying that a POLICY holds a
 *     permission box shut for a role (`web/components/team/roles-matrix.tsx`,
 *     the kit's own `permission-matrix` wording) — a different thing, in a
 *     module with no protected rows in it. Banning the word would flag those on
 *     day one and buy an exemption line for a sentence nobody wrote wrongly.
 *     The word that would need banning is the word the app already needs.
 *
 *     AND NOTHING IS COMPETING TODAY: the two screens that draw this concept
 *     both say `Protected`, derived from the one glossary entry and checked by
 *     R70 on the automations half. A deny-list line is for a word somebody
 *     WOULD write instead, and the shape of this concept's misuse is not a
 *     synonym — it is the badge drifting apart from the sentence that says
 *     which of its two promises a row is making, which is a POSITIONAL fault a
 *     word list cannot see and R70 reads off the screen's own source.
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
  // `{ word: "see", term: "permission" }` STOOD HERE, 14 Sep 2026, for a few
  // hours. The client's ruling was real (11 Sep 2026: the permissions matrix
  // column reads "Read", not "See") and the fix at the one screen it was about
  // — `roles-matrix.tsx`'s `capabilities()` — was real and stays. But banning
  // the WORD needed twenty-one `GLOSSARY_SYNONYM_OK` exemptions for ordinary
  // English the moment R34's check ran over the whole catalogue: "can't see
  // the team", "see everything", Google's own OAuth copy. R34's own doctrine
  // is the reason to revert rather than keep excusing — "a word earns a line
  // only when it can mean nothing else here" — and "edit" is already excluded
  // from this list for exactly that reason (see its own note above). Twenty-one
  // exemptions is the law telling us the word does not qualify: "see" is
  // ordinary, correctly-used English on all twenty-one of the sentences that
  // needed excusing, the EFFECT of a right rather than a competing label for
  // it, the same shape "edit" already survives under. The ruling itself is
  // unchanged and is protected the narrow way instead — a targeted assertion
  // in `web/test/roles-matrix-boxes.test.tsx` that the read-right column's
  // label is literally `t("Read")`, never `t("See")` — because a client's
  // ruling about ONE column's label is not evidence that a common English verb
  // has stopped meaning anything else in a whole product's copy.
]

/** R33 — the sentences that keep a banned word, and why. Rot-checked in both
 * directions: an entry naming a sentence the app no longer says goes red, and so
 * does one whose sentence no longer contains the word it was excused for. An
 * exemption that has stopped being needed is a record of an argument nobody is
 * having any more.
 *
 * EMPTY IS THE RIGHT ANSWER. The first five words the app was saying were
 * changed rather than excused, because each was a straight swap for the term
 * the dictionary already had — the table exists only for the case that is
 * not, a sentence where the banned word is genuinely the right one. `see` was
 * added and reverted the SAME DAY, 14 Sep 2026, and is the clearest
 * demonstration of why the table stayed empty for the other four: banning it
 * (in favour of `permission`'s own "read, create, update, or delete") needed
 * TWENTY-ONE entries here the moment R34's check ran over the whole
 * catalogue — "you can't see the team", "see everything", Google's own OAuth
 * copy — every one of them ordinary, correctly-used English, the EFFECT of a
 * right rather than a competing label for it, the same shape "edit" already
 * survives under with NO exemptions at all. Twenty-one lines in this table for
 * one banned word is not a list of reasoned exceptions, it is the law telling
 * you the word does not qualify — `GLOSSARY_SYNONYMS`' own doctrine, "a word
 * earns a line only when it can mean nothing else here". So `see` came off
 * `GLOSSARY_SYNONYMS` (its own note there says why) and every one of these
 * twenty-one lines came off with it, rather than being kept as a wall of
 * permissions nobody needed. The client's actual ruling — the roles matrix's
 * read-right column reads "Read", not "See" — is unchanged and is protected
 * the narrow way that earns no line here: a targeted assertion in
 * `web/test/roles-matrix-boxes.test.tsx` that the column's label is literally
 * `t("Read")`. */
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
 *     that file has no `search` prop, or (census ii-b) a portal collection
 *     screen draws no search field of its own.
 *   · A `path#Component` KEY (census iv, added 2026-09-11) — that COMPONENT
 *     draws the kit's `CardGrid` or the kit's `List` over a `.map()`, which is
 *     a wall or a register of records, and draws no search anywhere in itself.
 *     Keyed per component rather than per file ON PURPOSE: a file-keyed reason
 *     would let the next wall added to that file inherit an argument written
 *     about a different collection, which is how a bounded room's exemption
 *     comes to cover a growing one. A component that PAGES cannot be exempted
 *     here at all — see census iv in `web/test/rules.test.ts`.
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
  // ── THE WALLS AND REGISTERS (R48 census iv, added 11 Sep 2026). Six
  // components draw the kit's `CardGrid` or its `List` over a `.map()` and
  // search nothing. None of them pages — a wall that does may not be exempted
  // at all — and none of them is a collection of records a person would go
  // looking through: two are menus, one is a day in a dialog, and three are
  // bounded by something outside the screen (a person's own invites, one
  // company's contacts, one client's contracts).
  "web/components/screens/home-screen.tsx#FirstSteps":
    "NOT RECORDS — three onboarding ACTS, declared in this component and filtered by what the reader may create: add the first account, bring a spreadsheet in, raise the first ticket. They are drawn as a list because each is a link with a sentence under it. The block renders nothing at all the moment the team has anything on the go (`pulseIsQuiet`), so at most three rows, and only ever while there is nothing here to search.",
  "web/components/screens/home-screen.tsx#HomeScreen":
    "A NAVIGATION MENU. Eight fixed destinations — the six module screens this reader may read, plus Team and Settings — declared as two arrays in this component. Searching it would search the app's own furniture; every one of the eight leads to a collection that searches its own rows, which is where somebody looking for a record is going.",
  "web/components/records/record-calendar.tsx#DayRows":
    "BOUNDED BY ONE DAY, AND DRAWN IN A DIALOG. This is what \"+N more\" on a calendar square opens into — everything falling on that one day, over the month grid. It cannot grow past a day's entries, the reader reached it by pointing at the day, and the collection it is a slice of is narrowed by the calendar host's own toolbar one level up.",
  "web/components/records/record-week.tsx#RecordWeek":
    "THE IDENTICAL SHAPE, ONE ROOM OVER. `RecordWeek`'s own overflow dialog draws the same bounded, one-day `<List>` `record-calendar.tsx#DayRows` draws above — reached only by pointing at a day's own \"+N more\" chip, narrowed to that one day's entries (never more than a handful, since it only exists once the day's cards already overflowed the grid's own cap), and the week itself is already narrowed by whatever toolbar the host screen draws one level up. Not split into its own named component the way `DayRows` is, because the list is the whole of the dialog's body and nothing else in the file shares it.",
  "web/components/team/invitations.tsx#InvitationsPanel":
    "BOUNDED BY THE INVITES WAITING FOR ONE PERSON — the teams that have asked THIS reader to join, read whole and accepted one button at a time. It is not a collection anybody browses: a row leaves the moment it is accepted, and the panel is also mounted on the teamless onboarding screen, where the whole point is that there is nothing else on the page yet.",
  "web-portal/components/company-screen.tsx#CompanyScreen":
    "THE SAME ROOM AND THE SAME REASON this file's own path-keyed line below already carries for census ii-b: bounded by the account itself — the company's own record and the handful of people at it, unpaged, and it cannot grow past the people at one client. TWO KEYS RATHER THAN ONE because the two censuses ask different questions of it (ii-b: a portal collection screen drawing no search FIELD; iv: a component drawing the kit's `List` over a `.map()`), and one key answering for both is a reason a reviewer could not tell had gone stale on one of them.",
  "web-portal/components/delivery-block.tsx#DeliveryBlock":
    "BOUNDED BY CONTRACT — \"What you bought\", the blocks of work sold to the accounts this client may see. `clientSprints` (`workers/content/src/lib/todos.ts`) reads them whole under the R14 hard cap and states the ground in writing: \"a sprint is a contract, so a client has a handful.\" The block renders nothing until there is at least one. THIS ENTRY DIES THE DAY IT PAGES: census iv refuses an exemption to any wall carrying `hasMore`/`loadMore`, so putting this list behind a cursor fails the build until it also gets a search box — the same ratchet `deliverables-screen.tsx` carries below.",

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
    "paged (R14) — its search box is the host's own <PagedFind>, drawn in web/components/knowledge/knowledge-screen.tsx (moved out of collection-content.tsx's pure module switch, 17 Sep 2026, K2 by kind — the same move accounts/contacts/tickets already made), which renders a real SearchInput again — client ruling, 17 Sep 2026: \"Also add the search to the toolbar. It's missing.\" REVERSES B0296/T3659 (16 Sep 2026), which had this call site pass `search={false}` and this entry stand for zero search boxes on the screen; that shape is gone, and this entry now names the SAME structural reason every other paged recipe carries — the recipe's own in-memory search (`searchable: !paged`, screens.ts) sees only the loaded page, so the real box lives in the host's <PagedFind> instead, same reason as tickets.list.",
  "contacts.list":
    "paged (R14) — its search box is the host's own <PagedFind> in contacts-screen.tsx, which always renders a SearchInput. Same reason as tickets.list.",
  "inputs.list":
    "paged (R14) — its search box is the host's own <PagedFind> in web/components/accounts/inputs-screen.tsx, which always renders a SearchInput. Same reason as tickets.list.",
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
  "web/lib/use-screen-data.ts::useScreenData::listFetch.stories":
    "`listFetch.tasks`'s own shape, one collection along (client ruling, 15 Sep 2026, the Stories tab strip): `storiesQ` is the untouched, everyday backlog (`storiesKey(teamId)`, still read by breadcrumbs, cross-links and the module settings gear exactly as before this pass); `storiesViewQ` is whichever of the five tabs (`now`/`planned`/`backlog`/`completed`/`all`) the Stories screen is actually showing (`storiesKey(teamId, storyView)`). A story moving from Now to Completed leaves one list and joins another the same way a ticked task does, so collapsing the two reads would reintroduce the identical R38 failure `listFetch.tasks`'s own line names.",
}

/** R72 — THE FILES THAT STILL DRAW A SUBTITLE UNDER A HEADING, and the reason
 * each does. Sits beside R67's own exemption table on purpose — same house
 * pattern (file-keyed, rot-checked both ways) — and is a DIFFERENT law: R67
 * asks where a titled section's content stands, this asks whether a sentence
 * under its heading should exist at all. See web/test/no-default-subtitles.test.ts
 * for the full argument and the reused `READABLE_PROSE`/`HEADING` sets.
 *
 * COORDINATION NOTE for whoever lands an R67 amendment for tabbed sections
 * around the same time as this table: this block and R71's test file are new
 * additions right above R67's own `UNCONTAINED_SECTION_OK` table below — if
 * both land together, keep both tables and both `export const` blocks; there
 * is nothing here for an R67 tab-panel change to actually conflict with,
 * since R71's own census walks JSX siblings directly and does not read
 * R67's tab dispatch at all. Flagged so a merge treats this as an addition
 * beside R67, never as a competing edit to it. */
export const SUBTITLE_OK: Record<string, string> = {
  // THE "shared/web/screen-engine/screen-renderer.tsx" ENTRY THAT STOOD HERE
  // IS GONE, 2026-09-14 — deleted along with the dead code it excused rather
  // than left to rot the moment the branch disappeared. It said the honest
  // fix was deletion, not a subtitle ruling: `display: "cards"` was declared
  // by exactly one recipe (`knowledgeListRecipe`, web/lib/screens.ts), and
  // `collection-content.tsx`'s `module === "knowledge"` branch routed that
  // module to `KnowledgeSourceCard` before `ScreenRenderer` was ever reached,
  // so the branch rendered to no live screen. The branch is deleted
  // (screen-renderer.tsx); this line would otherwise have gone stale the
  // instant the file it named stopped containing a `CardTitle`/`CardDescription`
  // pair for the rot check to find, which is precisely the shape this
  // registry's own "the list can only shrink" discipline exists to catch.
  "web/components/screens/kwapso-screen.tsx":
    "the agency's own team-area header, `<Headline as=\"h1\">{team.name}</Headline>` followed by " +
    "\"Who we are: our material, our team, and the details that go on a contract.\" R67's own " +
    "UNCONTAINED_SECTION_OK carries two live entries for this exact file (`#team`, `#default`), both " +
    "reasoned \"this screen is the agency's own housekeeping and is mid-change in another lane\" — the " +
    "same reason applies here rather than restyling a screen another lane is actively editing.",
  "web/components/apps/app-detail.tsx":
    "a REFUSAL screen, not a titled section: `<Headline as=\"h1\">{app.name}</Headline>` followed by " +
    "\"You're not on this app, so its page is closed. Ask an admin to add you to the team on it.\" The " +
    "sentence answers \"why can I not see this\", the same job R70 requires `helpText` to do for a " +
    "switched-off automation — it is excluded there by being a Capitalised component and cannot be here, " +
    "because the whole screen IS the refusal and has no heading that isn't also the refusal's own subject.",
  "web/app/onboarding/page.tsx":
    "a pre-team auth flow, not a titled section on paper: the \"wrong door\" screen names the worker's own " +
    "refusal reason under its heading (\"the worker's own sentence, not a second copy written here\", this " +
    "file's own comment), and the profile-setup screen's sentence is the instruction for the form directly " +
    "below it — the inline equivalent of a dialog's FormShell `subtitle` (R4's own locked title/subtitle · " +
    "separator · fields · separator · action shape), which this law does not reach for the same reason R4 " +
    "is untouched: a dialog's subtitle explains what the ACTION does and is a different job from a section " +
    "explaining what it contains. Onboarding is a full-page form wearing the identical shape inline.",
  "web/components/screens/home-screen.tsx":
    "\"Start here\", the pulse block's own heading, followed by \"Nothing's on the go right now. Any one of " +
    "these is a good place to start.\" — gated on `pulseIsQuiet` (the whole block `return`s null otherwise), " +
    "so this is R62's empty-state register in spirit: the sentence explains why the three acts below it " +
    "exist, not what a permanent section is for, and it is only ever on screen when there is nothing else " +
    "to show. Written as an exemption rather than routed through `CollectionEmptyState` because this is not " +
    "a collection's zero row count, it is a team's whole pulse reading quiet.",

  // ── THE CLIENT PORTAL, FIVE FILES, ONE RULING SHORT ─────────────────────
  //
  // She ruled on Settings › Modules, on the AGENCY app. `web-portal/` is the
  // second front door and, unlike R67's own agency screens, none of these
  // five is mid-change, refused, or gated on an empty state — each is a
  // permanent page-title-plus-sentence, the exact shape she is describing.
  // But R67's own portal block already made this call once, about the SAME
  // shape ("the portal is consistent with itself, so panelling it is a
  // REDESIGN, not a repair"), and this law is not the place to make a
  // five-screen portal-wide call on her behalf a second time. Filed as a
  // census AWAITING HER RULING, the way R67's own portal block was filed
  // before it was answered — not hidden in a report, because a report does
  // not fail a build the day one of these is quietly "fixed" the wrong way.
  "web-portal/components/home-screen.tsx":
    "the greeting `<h1>` followed by \"This is everything we're doing for {company}\" / \"This is your " +
    "work with us.\" — a genuine descriptive subtitle, the shape this law exists to remove, filed as a " +
    "portal debt rather than deleted unilaterally: see the block comment above this line.",
  "web-portal/components/company-screen.tsx":
    "the account-name `<h1>` followed by \"What we hold for you. If any of it is wrong, tell us and we'll " +
    "fix it.\" — same shape, same reason: a portal debt awaiting her ruling, not an agency screen she has " +
    "actually seen this sentence on.",
  "web-portal/components/impact-screen.tsx":
    "\"What this has been worth\" followed by \"Time your team gets back, every month, and where every " +
    "hour of it comes from.\" R67's OWN account of this file is the sharpest argument for why R67 and R71 " +
    "are different laws: this heading+sentence pair is now CONTAINED (R67's portal block: \"impact-screen." +
    "tsx is the one file the portal block has ever lost\" — its own comment argued \"one fewer drawn line " +
    "is worth having\" on the screen a client shows other people, and was overruled on paper-standing " +
    "grounds, not on whether the sentence should exist). Passing R67 and failing R71 is not a contradiction " +
    "between them, it is the proof they ask different questions. Filed as a portal debt for the same reason " +
    "as its two neighbours above.",
  "web-portal/components/no-access.tsx":
    "\"You're signed in\" followed by why nothing shows for this email and what to do about it — a REFUSAL " +
    "screen (the same shape as `app-detail.tsx` above), not a titled section explaining itself. Filed here " +
    "rather than argued away because the heading IS the refusal's own headline, and a census that has to " +
    "read intent to skip a file is a census nobody can trust; the reason is written instead.",
  "web-portal/components/sign-in.tsx":
    "\"Sign in\" followed by which of two live instructions the current auth `step` needs (\"We'll email " +
    "you a six-digit code…\" / \"Enter the code we sent to {email}.\") — a pre-auth flow's own instruction " +
    "for the form directly below it, the same inline-FormShell-subtitle shape `onboarding/page.tsx` above " +
    "already covers, on the portal's own sign-in screen rather than the agency's.",
}

/** R67 — THE FILES THAT STILL DRAW A TITLED SECTION ON THE BARE PAGE GROUND,
 * and the reason each does.
 *
 * TWO KEY SHAPES SINCE 2026-09-11, because the law grew a second subject. A
 * bare `path` is a titled `<section>`. A `path#value` is ONE TAB PANEL — the
 * `value` the strip draws, read off the panel's own dispatch. Per tab rather
 * than per file on purpose: `settings-screen.tsx` holds the tab the client's
 * third ruling was about and another tab being retired in a different lane, and
 * a file-level key would have let the second excuse the first. That is this
 * law's own "passes on the strength of the branch that happens to have a panel
 * in it" failure, moved up a level from a branch to a tab.
 *
 * Rot-checked: an entry whose sections are all contained now fails the build,
 * so the list can only shrink. Each line names what would have to change, not
 * merely that it has not.
 *
 * A line here is a debt, not a design. The law's own header
 * (web/test/sections-stand-on-paper.test.ts) has the client's three rulings and
 * the definition; this is the arrears against them. */
export const UNCONTAINED_SECTION_OK: Record<string, string> = {
  // THE FORMER `web/components/apps/apps-screen.tsx` LINE (below, until
  // 2026-09-15) DESCRIBED `<section><h2>{stage}</h2><AppTiles/></section>` —
  // the Apps screen's stage-grouped tiles, drawn straight on the page. Both
  // the grouping and `AppTiles` are gone: the client's 15 Sep 2026 ruling
  // ("gallery … board by stage") replaced Tiles/List with Gallery (a flat
  // `CardGrid`, no per-stage `<h2>`) and Board (the kit's own `Kanban`,
  // which stands on no section of this law's subject at all — a board
  // column is not a titled `<section>`). Deleted rather than left with a
  // stale line, the same rot-check this table's own header describes.
  //
  // THE THREE `kwapso-screen.tsx#team` / `#default` / `#brand` LINES WERE
  // DELETED FOR ONE DAY, 2026-09-15, THEN RESTORED THE SAME DAY BY AMENDMENT
  // 9. R77 (`tab-strips-pin`) had rewritten this screen's `<TabsView
  // renderPanel={…}>` JSX ATTRIBUTE into `renderFolderTabs(…)` beside a plain
  // sibling `(function renderPanel(panel) {…})(…)` IIFE — the split every
  // collection screen already draws, so the strip pins without pinning the
  // panel's own content along with it. R67's census found a panel host by
  // matching that JSX ATTRIBUTE ONLY, the shape its own header named ("every
  // body a `renderPanel` returns"), so it could no longer find a `<TabsView>`
  // mount on this file at all — the rot-check saw a line naming a subject it
  // could not reach and demanded it be deleted, which is exactly right for a
  // census that genuinely cannot see a screen any more. THE PANELS WERE NEVER
  // FIXED; the census went blind to them, which is worse than red. Amendment
  // 9 (this file's header) taught the walk the sibling shape — a JSX child
  // that CALLS `renderFolderTabs(` immediately followed by a sibling that is
  // an invoked function expression or arrow, found by POSITION rather than by
  // spelling — and the census re-judged this file and found the identical
  // three bare panels it always had. Nothing about the screen changed between
  // the deletion and the restoration; only whether R67 could see it.
  "web/components/screens/kwapso-screen.tsx#team":
    "the agency's own team tab: `TeamPanel` (the LOCAL one, not `web/components/team/team-panel.tsx` — two " +
    "components share the name) returns a bare `<ul className=\"divide-border flex flex-col divide-y\">` of " +
    "members straight onto the page, and its error and skeleton branches with it. The sibling `BrandPanel` does " +
    "NOT already paint — that was this table's own stale claim before 2026-09-14, never true of the component " +
    "and only ever true of R67's old, file-wide `isOverlay` (see the `#brand` line below for the mechanism). " +
    "All three panels on this strip are bare. Left because this screen is the agency's own housekeeping and is " +
    "mid-change in another lane.",
  "web/components/screens/kwapso-screen.tsx#default":
    "the same screen's fall-through Overview panel: an `OverviewList` on the page ground. `OverviewList` draws " +
    "no ground of its own BY RULING — the client rejected a nested card inside a record's panel (\"no nested " +
    "card at all, the fact list's text sits directly on the panel\") — so on every record detail it is correct, " +
    "because `RecordScreen` hands the whole strip to a card. This screen is not a record detail and hands it " +
    "nothing, so the one component is right in eleven places and bare here. The fix is this screen's mount, " +
    "not that component.",
  "web/components/screens/kwapso-screen.tsx#brand":
    "the agency's own brand-library tab, `BrandPanel`, returns a bare header row plus either " +
    "`<CollectionEmptyState>` or a bare `<ul className=\"divide-border flex flex-col divide-y\">` of recent " +
    "assets straight onto the page, and its error and skeleton branches with it — the identical shape as its " +
    "`#team` and `#default` siblings above. It was never actually an overlay; the OLD `isOverlay` tested \"does " +
    "this component's DECLARING FILE contain a portal anywhere\", and `kwapso-screen.tsx` is one file holding " +
    "several panels, so any modal declared anywhere else in it (an invite dialog, a role picker) marked every " +
    "OTHER component in the same file — `BrandPanel` included — as standing on a scrim it never draws. The " +
    "narrowed, per-root `isOverlay` (amendment 6) no longer makes that mistake, and this is the panel it had " +
    "been hiding. Left, like its two siblings, because this screen is the agency's own housekeeping and is " +
    "mid-change in another lane — three bare panels get one fix at the mount, not three separate patches ahead " +
    "of it.",

  // ── THE `contacts-by-company.tsx` LINE STOOD HERE (added 2026-09-14 by
  // amendment 6, above), and it said in writing what should happen to it: "the
  // honest fix here is not a container, it is a wiring decision — either
  // `ContactsByCompany` is wired back in ... or it is deleted with
  // `UI-GAPS.md #24` closed as abandoned — and it is not this law's call to
  // make either one silently." `web/test/orphan-components.test.ts`'s own
  // census had missed the component entirely — its "test" root let the
  // component's own dedicated spec file (`web/test/contacts-by-company.test.tsx`)
  // count as a "mount", which is not evidence the app renders it — and once
  // that blind spot was fixed (14 Sep 2026, dropping "test" from the census
  // roots) the component came back a genuine, unparked orphan: nothing in
  // web/app, web/components, web/lib or shared/web imports it, and the
  // contacts-screen.tsx comment that had kept it around ("the obvious second
  // view if she wants one back") was never entered into `PARKED`, the one
  // mechanism this base uses to keep an unreached file alive on purpose. So
  // the wiring decision this entry deferred is made: deleted, with UI-GAPS.md
  // #24 closed as abandoned. This is the rot-check doing exactly what it is
  // for — an entry whose file is gone cannot be left standing.

  // THE `settings-screen.tsx#choices` LINE STOOD HERE, and it said in writing
  // what happened to it: "this tab is being RETIRED in the lane rolling module
  // settings out across the app … If the tab survives, this line becomes the
  // one-line fix its Modules twin already had." It did not survive — the Choices
  // tab went on 11 Sep 2026 with the whole-vocabulary screen behind it — so the
  // exemption is deleted rather than fixed, which is the outcome an exemption
  // that names its own expiry is meant to have. R67's rot-check is what required
  // the deletion in the same change: an entry matching nothing turns the build
  // red, so a retired screen cannot leave a reassuring line behind it.

  // ── THE 2026-09-11 AMENDMENT-4 CENSUS: A SENTENCE ON THE WHITE ────────────
  //
  // THE CLIENT, A FOURTH TIME, over Settings › Integrations: "i said nothing on
  // white backgorund. remove this text Access tokens / Let an outside tool (an
  // AI agent, a script, an automation) work in your team as you, capped by your
  // role, in the team the token was made for. for google replicate the no
  // tokens yet, sth like "connect to google" and the button to do so. remove
  // the text directly on white background."
  //
  // That ruling overruled R67's OWN WRITTEN EXEMPTION — prose was "deliberately
  // not content" because "boxing the sentence would be a different design, not
  // this rule" — so the law was narrowed rather than the screen patched, and
  // the subject lost its heading requirement in the same amendment (her fix
  // DELETED two headings, which under the old subject would have taken both
  // sections out of the law on the commit that answered her). Integrations
  // itself is FIXED, not exempted: the eyebrow and the sentence are gone from
  // Access tokens, and Google now draws the neighbour's own
  // `CollectionEmptyState` on soft paper.
  //
  // THE LINES BELOW ARE WHAT THE AMENDMENT FOUND EVERYWHERE ELSE, and they are
  // debts awaiting ONE ruling rather than repairs this lane may make. She ruled
  // the OTHER WAY the day before, 2026-09-10, about the module settings pages'
  // own section descriptions: "The section description: no, I want to keep it."
  // Keep the words and stop leaving them on the white are reconcilable — that
  // is a container, not a deletion — but WHICH she means for each screen is
  // hers, and she is being shown a picture of all of them. Written here rather
  // than in a report because a report does not fail a build the day one of them
  // is quietly "fixed" in the wrong direction.
  // ALL SIX OF THOSE LINES ARE GONE, 11 SEP 2026, BECAUSE SHE RULED. The
  // census above was written "awaiting ONE ruling" and it got one the same day,
  // over a screenshot of Settings › Ticket settings:
  //
  //   "ticket types should be on top of the searchbar inside the container
  //    without subtitle, make this. always"
  //
  // …together with the sentence that settled every judgement call in it: "from
  // now on you decide on everything."
  //
  // SO THE OUTLIER WAS OVERRULED RATHER THAN OBEYED. The block above hung on
  // "The section description: no, I want to keep it" (2026-09-10) and made
  // every screen wait for her. She has now said "no subtitle" twice — that
  // same 2026-09-10 ("in ticket settings (or any other module) no subtilte")
  // and again on 2026-09-11, over a picture — against once the other way, in
  // between. Two clearer statements and a screenshot beat one, and the
  // reasoning is written where each deletion happened rather than only here.
  //
  // WHAT SHIPPED, AND WHY THE LIST IS EMPTY RATHER THAN SHORTER:
  //
  //   · `shared/web/theme-section.tsx`, `scale-section.tsx`,
  //     `spine-section.tsx` (and `language-section.tsx`, which was never on
  //     this list because its own prose happened to sit inside its panel) all
  //     draw through `shared/web/settings-section.tsx` now — ONE component that
  //     owns the box AND the heading, so the title is inside the paper by
  //     construction and a call site has no position to put one anywhere else.
  //     The half-fix of 2026-09-10 is finished: that pass moved the option
  //     cards off `bg-card`'s contrast 1.000 and left the title block on the
  //     white, because the law said prose was not content.
  //   · `web/components/work/time-panel.tsx` — both sections. Neither was the
  //     reported shape (there is no title block in either), so each takes the
  //     box as a STRIP: the running-timer buttons and the runaway prompts on
  //     one sheet, and the "3h 20m logged" line with the prompts beside it on
  //     another, above the `<PagedFind>` that keeps its own.
  //   · `web/components/work/tasks-screen.tsx` — the whole summary strip takes
  //     paper. The tempting fix was to read `KpiProgress`'s label as a title
  //     and the caption as a subtitle; the bar is a MEASUREMENT and the caption
  //     says who the number counts, so neither is a title block and the strip
  //     is one unit on one sheet.
  //   · `web-portal/components/impact-screen.tsx` — see the portal block
  //     below, which it has now LEFT.
  //
  // AND THE SEVEN MODULE SETTINGS PAGES NEVER REACHED THIS LIST, because they
  // were never in R67's subject: their root is a `<div>` and their words are
  // props. They are fixed all the same, at the chokepoint rather than at the
  // fourteen sections — `<ToolbarRow title>` for the seven vocabulary sections
  // and `<SettingsSection>` for the seven Automations ones — and the
  // `description` COLUMN was deleted from `MODULE_SETTINGS` with the sentences,
  // so there is nowhere left to declare a subtitle. R67's law text carries the
  // argument for why that is a better answer here than widening the census to
  // judge a component by the props it is handed.

  // ── THE CLIENT PORTAL, SIX FILES ─────────────────────────────────────────
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
  //
  // IT WAS SEVEN FOR ONE DAY — see the note where the seventh used to be.
  "web-portal/components/company-screen.tsx":
    "two sections on the client's own company page — their details (`DescriptionList`) and the people we work with (`List`) — both drawn straight on the page ground.",
  "web-portal/components/delivery-block.tsx":
    "what the client bought: the loading skeleton and the `List` of delivery blocks under it both stand on the page ground; nothing in this section ever paints.",
  "web-portal/components/home-screen.tsx":
    "the portal home's ticket section — its rows sit in a bare `<div>` on the page. Its zero (`PortalEmpty`) and its error (`ErrorPanel`) do paint, so this section changes shape between states exactly as Access tokens did on the agency side.",
  // `impact-screen.tsx` STOOD HERE FOR ONE DAY and is the one file this block
  // has ever lost. It was added on 2026-09-11 by amendment 4 and removed the
  // same day, because the client handed this round's judgements over ("from now
  // on you decide on everything") and the call went against the file's own
  // argument. Its source made the portal's whole case in one comment — "not a
  // form of two or more fields, so it never earned a container (N6) … on the
  // screen a client is most likely to show somebody else, one fewer drawn line
  // is worth having" — and that comment is KEPT, verbatim, beside the container
  // it lost to, as the record of what was traded away. What decided it: a
  // screen that argues itself out of a law in its own comment is the pattern
  // five rulings in three days have each overturned somewhere else, and every
  // one of those screens had a local reason that was true. ONE rule with no
  // local exceptions is what she has been buying all week. The cost is one more
  // drawn line on the client's savings page, and it is a real cost.
  //
  // THE OTHER SIX STAY, and the reasoning above is unchanged for them: they are
  // the portal's own visual language rather than six oversights, and reversing
  // it is a redesign of the client-facing app. The difference is that
  // `impact-screen.tsx` was not one of those six — it was a seventh, found by a
  // widening, whose own file was arguing the case rather than inheriting it.
  "web-portal/components/sent-to-us.tsx":
    "what the client has already sent us: the skeleton, the search row and the done pile are all on the page ground.",
  "web-portal/components/ticket-attachments.tsx":
    "a ticket's attachments on the client's side — the skeleton and the drop target are on the page ground; the file rows themselves paint.",
  "web-portal/components/waiting-on-you.tsx":
    "the loading skeleton for what is awaiting the client's input. Its error and its rows both paint, so this is the loading state alone — the section jumps onto paper the moment the read lands.",
  // ── `ticket-stages.tsx` (17 Sep 2026) — BARE BY NAMED REFERENCE, NOT BY
  // OVERSIGHT. The stage ladder moved onto the ticket record's `headerExtra`
  // (help-detail.tsx), above the tab strip, on the client's ruling to put it
  // "on top of the tabs" — and a first pass gave it its own `bg-card` box,
  // reading R67 as the default it is. She then pointed at a SIBLING placement
  // and overrode that default for this one control specifically, same day:
  // "In Tasks, the Today's Task Progress view should have no container
  // behind it, and this is exactly the position for reference that I want
  // the ticket progress to be." `web/components/work/tasks-screen.tsx`'s own
  // progress strip is the reference named — see that file's entry below,
  // filed the same day for the same words, once that lane's own change
  // lands.
  "web/components/tickets/ticket-stages.tsx":
    "the stage ladder, drawn on `RecordScreen`'s `headerExtra` above the ticket's tab strip. No fill by her own instruction, quoted above — not a container nobody got round to adding. Its error state (the retry sentence) is the same bare section, on purpose: the copy explains a failure, not an absence, and there is nothing else in this component to wrap it in that isn't the same bare ground.",
  // THE REFERENCE `ticket-stages.tsx`'s OWN ENTRY NAMES, LANDED — the client's
  // ruling, quoted in full above: "In Tasks, the Today's Task Progress view
  // should have no container behind it, and this is exactly the position for
  // reference that I want the ticket progress to be." This is the position:
  // the "Today's tasks" strip, between the heading and the tab strip, on every
  // Tasks tab. It used to carry `bg-surface-panel` (R67's own default) —
  // deleted along with the padding it justified, so the section is now text
  // and the progress bar only, standing on the same bare page ground the tab
  // strip below it already sits on.
  "web/components/work/tasks-screen.tsx":
    "the \"Today's tasks\" progress strip — a `<section>` with no heading of its own (named by `aria-label`, the same shape `sections-stand-on-paper.test.ts`'s amendment 4 already admits). `KpiProgress` and the caption beneath it are drawn directly on the page: no fill, no radius, no inset. Neither reads as a title block being moved out of a container — the bar is a MEASUREMENT and the caption says WHO the number counts, exactly the reasoning this file's own header already carried before the container itself was removed.",
}

// ── R67, WIDENED — A COLLECTION NESTED IN A RECORD-DETAIL TAB NEEDS ITS OWN
//    CARD; THE RECORD'S OWN OUTER CHROME IS NOT THE SAME SURFACE ───────────
//
// Client feedback, 17 Sep 2026, over an app's Tickets tab, verbatim: "I
// noticed that when I go into the tickets tab inside an app, there is still
// the space between the point and the type missing, and also they are
// missing the background card. Make sure that you apply rules, not just
// specific hard-coded fixes, to all the feedback I'm giving you."
//
// R67's own panel census (amendment 3, `sections-stand-on-paper.test.ts`)
// already walks every `<TabsView renderPanel={…}>` host — INCLUDING the
// eleven record details (`STICKY_TABS`, `record-chrome.tsx`) — but shape (a)
// ("the mount is boxed by an ancestor") passes every one of them on the
// strength of ONE shared box: `RecordScreen` hands its whole `TabsView` to
// the kit's `RecordDetail`, which draws ONE outer `Card` around whatever
// `panel` is (`web/components/records/overview-list.tsx`'s own header: "the
// kit still draws the ONE outer Card around the panel — that OUTER seam
// stands"). That box is right for a plain fact list — `OverviewList`'s own
// history is the client REJECTING a second, nested card around one ("no
// nested card at all… container inside a container") — and it is NOT the
// same surface the app's own COLLECTIONS stand on: `SprintsPanel`/`AppsPanel`
// (`CollectionFrame useKitPanel`) and the main Tickets/Accounts/Apps screens
// (`<PagedFind wrap={…}>`) each draw their OWN nested `bg-surface-panel`
// card INSIDE whatever they are already standing in, unchallenged — the
// established pattern this law is naming, not inventing. So a collection
// hung off a record's tab that skips that nested card (the app's own Tickets
// tab, `AppTicketsPanel` via `PagedPanelBody`, no `wrap`) sat on the SAME
// outer record card every OTHER tab shares, with nothing of its own — which
// reads as "missing the background card" exactly because its neighbours have
// one and it does not.
//
// THE FIX IS THE SEAM, NOT THE SCREEN: `PagedPanelBody` (`web/components/
// work/work-panels.tsx`) now always wraps its `<PagedFind>` in `CollectionCard`
// (`web/components/deep-link/screen-bits.tsx`), so every panel built from it —
// Stories, Maps (`ProcessesPanel`), App meetings, App tickets (both the app's
// own Tickets tab AND the account's, since both mount the same
// `AppTicketsTab`), and To-dos — gets the identical nested card
// `SprintsPanel`/`AppsPanel` already draw. `DeliverablesPanel` drew its own
// `<ToolbarRow>` over a bare grid of `bg-card` tiles (a wall of cards on the
// page ground, R67's own named failure shape) and is fixed the same way, by
// hand, at the one call site.
//
// THE CENSUS: `web/test/sections-stand-on-paper.test.ts` re-walks
// every `STICKY_TABS` `renderPanel` host R67's own amendment 3 already finds,
// this time WITHOUT the ancestor short-circuit, and asks the per-body
// question of every branch that is shaped like a COLLECTION (references
// `ToolbarRow`/`PagedFind`/`CollectionFrame`/`RecordTable`/`Table`,
// transitively through the same file — a plain `OverviewList`/
// `AskTheAssistant` panel is out of this narrower census's population by the
// same reasoning that keeps a lone act or an overlay out of R67 itself).
// Keyed `file#tabValue`, same grain as `UNCONTAINED_SECTION_OK`, and
// rot-checked the same way: a key nothing flags any more must be deleted.
//
// A key here for a file OUTSIDE this lane's ownership
// (`web/components/accounts/contact-detail.tsx`, `work/task-detail.tsx`,
// `meetings/meeting-detail.tsx`, `process/process-detail.tsx`,
// `knowledge/knowledge-detail.tsx` — five more `STICKY_TABS` hosts this
// census reaches) is left for the lane that owns that screen to fix or
// reason about; this lane's brief is the record-detail PANEL wrappers listed
// in its own brief, not those five files' bodies.
export const RECORD_DETAIL_COLLECTION_OK: Record<string, string> = {
  // `web/components/apps/app-detail.tsx#knowledge` — the app record's
  // Knowledge tab, `<KnowledgeScreen scope={{ kind: "app", … }} />`
  // (web/components/knowledge/knowledge-screen.tsx). A FALSE POSITIVE, not an
  // uncontained collection: both the "app" and "team" scope branches call the
  // SAME hoisted `renderGallery()` (the file's own header explains why it is
  // one function, not two copies of the JSX — `web/test/knowledge-head.test.tsx`
  // reads the source and requires `<CollectionHeading>` to precede
  // `<PagedFind>` TEXTUALLY, which only holds if it is written once), and
  // `renderGallery()`'s one `<PagedFind>` tree already carries
  // `wrap={(inner) => <CollectionCard>{inner}</CollectionCard>}` — the exact
  // seam this census asks for, on the app scope exactly as on the team scope.
  // The census cannot see it: `if (scope.kind === "app") return (…)` is
  // structurally indistinguishable from a loading/error guard (an `if` with
  // no `else`, whose `then` is a bare `return`), so `realRoots` strips it and
  // asks only the trailing `team`-branch return whether it paints — and that
  // return's own body calls `renderGallery()`, a plain `CallExpression` whose
  // callee body the AST walk never inlines. Two structural blind spots
  // (guard-return stripping + a call site standing in for its callee) meeting
  // on one component, neither a real gap in the screen: staging shows the
  // same nested card on the app's Knowledge tab as on the team-wide Knowledge
  // page. Delete this line if `renderGallery()` is ever inlined into both
  // branches (it should not be — see the file's own header for why).
  "web/components/apps/app-detail.tsx#knowledge":
    "<KnowledgeScreen scope={{ kind: \"app\" }}> already stands on the shared renderGallery()'s <PagedFind wrap={…}> → CollectionCard, identically to the team-scope Knowledge page; the census's guard-return heuristic strips the app branch and never sees the wrap because it sits behind a hoisted function call, not inline JSX.",
}

// ── A HAND-ROLLED STATUS DOT NEVER SHIPS ────────────────────────────────────
//
// Client feedback, 17 Sep 2026, over an app's Tickets tab, verbatim: "I
// noticed that when I go into the tickets tab inside an app, there is still
// the space between the point and the type missing, and also they are
// missing the background card." At the start of this session the component
// drawing the gapless dot was `AppTicketsPanel`'s own Type column
// (`web/components/work/work-panels.tsx`): a `<Badge variant="secondary"
// size="pill">` with NO `dot` prop, holding a hand-placed `<Swatch
// colour={ticketTypeColour(ticket.helpType)} />` as an ordinary child — so
// `badge.tsx`'s own `GAP_WITH_DOT` (the kit v1.2.102 fix, spent the moment
// `dot` is passed) was never reached. The identical shape stood at three
// more call sites reachable from a ticket
// (`web/components/tickets/tickets-collection.tsx`'s own Type column,
// `triage-queue.tsx`'s sitting tally, `shared/web/ticket-chips.tsx`'s
// `typeDot`), all four confirmed by reading the source before any fix
// landed.
//
// A CONCURRENT LANE RETIRED THE UNDERLYING DOT THE SAME SESSION: R86 ("in
// any collection, the one coloured chip is the record's status") moved a
// ticket's TYPE from a coloured `Swatch` to an icon (`ticketTypeIconName`)
// across every one of those four files, which is a stronger fix than a gap
// patch — there is no longer a dot on that column at all. This registry
// entry, and `web/test/hand-rolled-status-dot.test.ts`, are the forward
// guard: the RULE ("a status is drawn ONLY through `<Badge dot={tone}>`,
// never a hand-placed dot span") outlives the one bug it was written about,
// so the next hand-rolled dot — on STATUS itself, a priority chip, a portal
// status chip — is still caught. Empty on the day this law shipped: the
// census found nothing left to excuse.
export const HAND_ROLLED_DOT_OK: Record<string, string> = {}

export const EMPTY_TOOLBAR_EXEMPT: Record<string, string> = {
  "web/components/accounts/account-detail-panels.tsx":
    "ContactsPanel's <ToolbarRow> carries `empty={false}` — the one collection in the app with TWO first-adds rather than one (\"Add contact\", linking a person already on the books, and \"New contact\", making one), and `CollectionEmptyState` only ever carries a single labelled `onCreate` — it cannot offer both, so the row's own two icon buttons have to stay reachable on an empty contacts list exactly as they do on a populated one.",
  "web/components/accounts/contact-panels.tsx":
    "all three <ToolbarRow> call sites (Companies/Tickets/Meetings, one person's read-only summary panels) carry `empty={false}` — each is reached only PAST that panel's own early `X.length === 0` return, so the row can never actually be empty by the time it renders; the literal records that guarantee rather than hides it.",
  "web/components/tickets/tickets-collection.tsx":
    "The `raiseTicket` <AddButton> is a NODE built once (`const raiseTicket = canCreateTicket ? <AddButton…/> : null`) and handed to the `actions` slot of every body this screen has, so the row it lands in has already returned null on an empty collection — it is a toolbar action written one line further up, and the census reads position rather than data flow. (Until W3, 15 Sep 2026, this entry also covered TriageQueue's own `<ToolbarRow empty={false}>` — see the `triage-queue.tsx` entry below, split out when the component moved to its own file unchanged.)",
  "web/components/tickets/triage-queue.tsx":
    "TriageQueue's <ToolbarRow> carries `empty={false}` — reached only past two earlier returns (`!view.yours`, `view.waiting.length === 0`), so the queue is guaranteed non-empty by the time this row renders; the literal records that guarantee rather than hides it. Pin moved from `tickets-collection.tsx` (W3, 15 Sep 2026) — the TriageQueue component this describes was split out unchanged.",
  "web/components/process/steps-panel.tsx":
    "TWO different first-adds on one collection, which is Contacts' exemption above in a different module: \"Add step\" types what somebody heard, and `<ReadACall>` beside it has the app propose the steps off a meeting and walk the person through them. `CollectionEmptyState` carries a single labelled `onCreate` and cannot offer both, so both stay reachable on an empty step list exactly as they are on a populated one.",
  "web/components/team/roles-matrix.tsx":
    "the grid's own <ToolbarRow> carries `empty={false}` — the rows it narrows are the team's own MODULE CATALOGUE (`TEAM_MODULES`, read off the first role sheet), which is fixed furniture for a live team rather than data it empties out. R50's question is whether the RAW row list, before search, ever holds zero rows, and for a fixed catalogue the honest answer is always no; the toolbar's search can narrow the visible rows to zero, which is a different, filtered zero the matrix's own `emptyTitle`/`emptyDescription` pair already tells apart from a true empty state.",
  "web/components/tickets/help-detail.tsx":
    "two <AddButton>s carry `empty={false}` — Related stories' and Work logs' own title-row \"+\" (client ruling, 18 Sep 2026: an icon-only create button on each panel's own title, replacing the plain text button each already drew unconditionally). Neither sits inside a `<ToolbarRow>`; each is the ONE way to add a story or log time from this record, so it stays reachable at zero rows exactly as the text button it replaced always was — a ticket with no related stories yet is the ordinary case a person presses this to fix, not an empty collection the create action should hide from.",
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
  // DELETED 2026-09-15 — `web/components/work/tasks-screen.tsx#TasksScreen`.
  // The entry argued the Table view ordered by its own column headers and
  // none of the three tabs' views had a second question a sort control could
  // answer. The client's same-day follow-up ruling disagreed with the first
  // half directly: "add the sort to the toolbar and add sort by task priority
  // and deadline... make sure you remove it from the headers." The screen now
  // passes `sort` (Priority/Deadline, R53's structured config) and no column
  // carries a `sort` key of its own — Board and Calendar still have no second
  // question (the grouping and the day are each their own order), which is
  // why the exemption's OTHER two-thirds is simply gone rather than narrowed.
  // DELETED 2026-09-11 — `members-gallery.tsx#MembersGallery`. It argued that
  // "a sort picker offering a single option over a bounded, alphabetical wall
  // is a control that answers nothing", and the client ruled the opposite for
  // the identical shape one tab over on 2026-09-10: *"sort by - name"* on
  // Settings › Modules, a bounded alphabetical wall of twelve cards. The
  // entry's own argument is answered by the control — `SortControl` draws a
  // DIRECTION button beside the field unless a caller passes
  // `showDirection: false`, and `ToolbarRow` never does — so one field is a
  // real choice between A→Z and Z→A. The gallery now passes `sort`.
  "web/components/apps/stakeholders-panel.tsx#StakeholdersPanel":
    "NOT ONE LIST. It draws two named groups — Ours and Theirs — each with the lead/main contact pinned at the top, so the grouping and that pin ARE the order; one search box narrows both (\"who is on this, on either side\" is one question). There is no single sequence for a sort control to act on, and applying one per group would order two lists from one chip.",
  "web/components/work/work-logs-panel.tsx#WorkLogsPanel":
    "TIME IS READ IN TIME ORDER, and this list PAGES (`<LoadMore>`, R14). A browser-side reorder would put the fifty entries currently in hand into a new sequence and present it as the order of the whole log, which is exactly the defect `frameSortOptions` refuses for every paged collection in the engine. If this ever earns a sort it belongs on the door, as a `<PagedFind>` `sorts` option, not here.",
  "web/components/team/access-tokens.tsx#TokenCallLog":
    "THE SAME SHAPE AS WorkLogsPanel ONE ROW UP: a call log is READ IN CALL ORDER (newest first) and PAGES (`<LoadMore>`, R14, db/core `mcp_call_log`). A browser-side reorder of the loaded page would present a shuffled window as the order of a token's whole history — the audit trail this table exists for is specifically WHEN something happened, in sequence. If this ever earns a sort it belongs on the door, as a query parameter, not here.",
  "web/components/accounts/contact-panels.tsx#ContactTicketsPanel":
    "A PAGE-ONE SUMMARY OF A PAGED LIST (`<LoadMore>`, R14) on somebody's record — the whole ticket collection has its own screen, with its own door-backed search, filters and sort. Same reason as WorkLogsPanel above: ordering the loaded page and calling it the order of the list is the lie R14 exists to stop.",
  // DELETED 17 SEP 2026 — `web/components/tickets/tickets-dashboard.tsx#TicketsDashboard`.
  // The entry argued a dashboard has no row order to offer, over a
  // `<ToolbarRow>` that carried a search box and two facets and needed a
  // reason for the one slot it left unfilled. The client's ruling the same
  // day removed the whole row: "Remove the toolbar from the tickets
  // dashboard." There is no `<ToolbarRow>` left on this component for the
  // census to find missing a `sort` prop, so the entry matches nothing —
  // deleted rather than left standing, the same rot-check every other table
  // here is held to.
  "web/components/work/sprints-screen.tsx#SprintsScreen":
    "THE BESPOKE ROW SERVES TWO BODIES THAT ARE NOT FLAT LISTS — Overview, which groups sprints under their own state headings, and Calendar, a month grid. A sort chip would either fight the grouping or reorder squares by something other than the date they sit on. The third tab, \"All sprints\", is a flat list drawn by the recipe engine, and it gets its picker from `frameSortOptions` off its own columns — which is why this screen looks sorted where it is a list and unsorted where it is not.",
  // DELETED 17 SEP 2026 — `web/components/team/roles-matrix.tsx#RolesMatrix`.
  // The entry argued the rows are `TEAM_MODULES`'s own fixed order and there
  // is "no second, equally valid sequence... that a reader would ask this
  // grid for instead". The client's own screenshot of this exact toolbar
  // disagreed the same day: "in the toolbar, I want to be able to sort by
  // Module Name." The screen now passes `sort` (Module name, A→Z / Z→A,
  // `SortControl`'s own direction button) over the module catalogue's
  // translated labels, applied before the search filter narrows the same
  // list — see `sortDir`/`orderedModules` in that file.
}

/** R78 — reviewed exceptions, keyed the same way `TOOLBAR_SORT_EXEMPT` above
 * is (by the file that independently builds its own `<SortControl>`/
 * `<ViewSwitch>` pair, from R53's own `TOOLBAR_CONTROL_OWNERS` list — never
 * `<ToolbarRow>` itself, which is R78's own seam and therefore not an
 * exemption from it). A file lands here when it offers a calendar/week/
 * agenda view AND cannot honestly suppress its own sort control on that view
 * — narrow on purpose, the same "not 'we did not get round to it'" bar
 * `TOOLBAR_SORT_EXEMPT`'s own header sets. Empty on the day this law shipped:
 * every `TOOLBAR_CONTROL_OWNERS` file that currently offers one of the three
 * values (none do, 2026-09-15) routes through `<ToolbarRow>` already. Rot-
 * checked in both directions by `no-sort-in-calendar-views`. */
export const NO_SORT_VIEW_EXEMPT: Record<string, string> = {}

/** R29's own extension, 17 Sep 2026 — the client, verbatim, over the fixed
 * 23.75rem assistant column: "there is a certain horizontal scroll. Kill
 * that. There should be no horizontal scroll." `min-w-max` is a FLOOR: it
 * tells the element its own min-content is its floor, uncapped, so it cannot
 * shrink the way an ordinary flex item can — and if nothing between it and
 * the page gives it its own horizontal scrollbar, that floor is the page's to
 * absorb. That is what R29's `overflow-x: clip` root guard exists to catch
 * only AFTER the fact, at the document edge, with no clue which row did it.
 * This check finds the row instead: every `min-w-max` in `web/components`
 * must carry `overflow-x-auto` on itself or a nearby ancestor within the same
 * file, so a screen that CAN widen its body is caught at the row that would
 * do it, not chased at the symptom. (`flex-nowrap` alone is deliberately NOT
 * walked here — see the check's own comment, `web/test/rules.test.ts`, for
 * why it is not the same signal and would have reported two correct, already-
 * shipped rows as offenders.) Rot-checked in both directions, the same
 * ratchet `SCREEN_WIDTH_EXEMPT` uses: a listed file the scan no longer
 * matches must drop its entry. Empty on the day this law shipped — the one
 * `min-w-max` in `web/components` today (`record-timeline.tsx`) already
 * scrolls inside its own container. */
export const SCROLL_FLOOR_EXEMPT: Record<string, string> = {}

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
  all_stories:
    "not a table — the module is a SWITCH over whose stories a list answers about (client ruling, 15 Sep 2026, the Stories tab strip's Everyone's tab). The rows themselves are `stories`, which the work engine's own target already imports; giving this module a second target would be two ways to load one table, and the second one would be the one nobody keeps in step. The same shape as `all_tasks`, one spine along.",
  all_inputs:
    "not a table — the module is a SWITCH over whose accounts' inputs a list answers about (the Inputs screen, 15 Sep 2026). The rows themselves are `todos`, and `todos`/`inputs` is ITS OWN exemption below (a to-do is a request that emails a client, never a bulk write). Giving this module a target of its own would be two ways to load one table, the same shape as `all_tasks`, one spine along.",
  knowledge:
    "a source is either TYPED here — and indexed in the same call, because the owner asked for instant syncing, which costs one embedding per chunk — or MIRRORED from a row the app already owns and kept in step by the sweep. A CSV would be a third way in with the first one's cost and neither one's upkeep: the importer writes row by row through the module's own gated create door, so a 5,000-row file would be 5,000 chunkings and 5,000 model calls inside one request, against a €50/month ceiling. The in-rule answer to 'we have a spreadsheet of process notes' is to point the sweep at where they already live, or to import them into the module they belong to and let the mirror do it.",
  processes:
    "a process map's numbers are AGREED estimates — a time a client and a staff member settled together, in front of each other, about the client's own work. Every savings figure in the app is a subtraction of two of them, so a CSV would import estimates nobody agreed and produce figures nobody can defend, which is the exact failure this module exists to prevent. A map is authored a step at a time, with the person whose work it describes.",
  // KEYED `inputs` SINCE 15 SEP 2026 — the permission module renamed from
  // `todos` (team migration 0096, shared/team-modules.ts); the reasoning
  // below is unchanged, only the box it is filed under.
  inputs:
    "a to-do is a REQUEST WE MAKE OF A CLIENT, and raising one emails them. It is one of only two things in the whole product that reaches a client's inbox (BUILD-1 §7), and an import is the one shape of write that produces hundreds at once — a spreadsheet of forty rows would be forty emails into somebody's morning, from our own verified sender, before anybody had read the file back. The write it would replace is a title and a date typed while you are already talking to them. Stories ARE importable, for the opposite reason: nothing about a story leaves the building.",
  staff_profiles:
    "the table names a PERSON — by their member id, which is the one thing a spreadsheet cannot supply. A CSV column of names or email addresses would have to be resolved to members, and resolving it wrongly files somebody's personality profile against the wrong colleague. That is the same reason team_members is exempt, arriving from the other direction: a file cannot say who somebody is. A profile is written on the member's own page, where the question never comes up. A second table used to sit here, `staff_certificates`, exempt for the identical reason — the certificate module was killed whole on 14 Sep 2026 and dropped by team migration 0090.",
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
    why: "the client says how we did (the owner, 6 Sep 2026: 'let's store sentiment (1-3) on the portal for how did we do it to see if client is happy'). The account the row is judged against comes from the guard corridor through `callerScope` and never from the body, and the ticket named by a caller-supplied id is resolved through the fenced `getTicket` before a row is written — a miss is a 404, so 'not yours' never confirms the ticket exists. TWO more rules ride the same door and neither is on the screen: it refuses anything that is not `resolved`, because 'how did we do' is a question in the past tense about work that is finished and asking it mid-flight measures impatience into the same column; and it INSERTs, never UPDATEs, so a later change of mind is a new row and the record of how we did at the time survives it. Gated on `help:read` rather than `help:update` for the same reason the validate door is: `help:update` is a right the seeded Client role does not hold, and a rating moves no status and edits nothing.",
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
    why: "drags one of their company's requests into the order they want them in — SCOPE ch.07's 'a client may re-rank their own company's tickets'. Both NEIGHBOUR ids are resolved through the same fence, so a client cannot pin their ticket next to one they cannot see (which would be an oracle for whether an id exists, and a way to learn another company's ordering); and the LOCK rides the UPDATE, so the order stops being theirs the moment we pick it up. The right this needs — `help:update` — is the reason the STATUS and ARCHIVE doors now refuse a portal caller outright: the same grant would otherwise have let a contact resolve their own request.",
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
  // THE AGENCY'S OWN HOUSEKEEPING — three tables, one answer, and they are the
  // EASIEST entries in this table rather than the hardest. Everywhere else here
  // the question is genuinely difficult ("the rows are theirs but the history
  // names us"). Not here: the ROWS are not theirs either. A client login cannot
  // reach a single door on any of these three modules (every handler opens with
  // refusePortalCaller), so `null` is not a withholding — it is the same
  // sentence the door already said, repeated where the feed can hear it.
  // A fourth table, `staff_certificates`, stood here until the certificate
  // module was killed whole on 14 Sep 2026 ("kill the whole certificate module
  // everywhere") and dropped by team migration 0090.
  brand_assets: { fence: null, why: "the agency's own brand material and who changed it — a client sees the work, never our library" },
  meeting_purposes: { fence: null, why: "why the agency meets and which department owns it — a description of our own organisation" },
  staff_profiles: { fence: null, why: "what a colleague is like and what they are bad at. The sharpest case of agency-only material in the app, and its HISTORY names both the subject and the person who wrote it down" },

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
  // RENAMED `todos` → `inputs` 15 SEP 2026 (team migration 0096). The TABLE
  // (this map's own key) is unchanged; the permission box a reader of this
  // history needs moved with the door.
  todos: "inputs",
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
  // THE AGENCY'S OWN HOUSEKEEPING. Three tables, three modules. A fourth table,
  // `staff_certificates`, gated on `staff_profiles` here too — a person's
  // profile and their certificates were one record from the member page's
  // point of view — until the certificate module was killed whole on
  // 14 Sep 2026 and dropped by team migration 0090.
  brand_assets: "brand_assets",
  meeting_purposes: "delivery",
  staff_profiles: "staff_profiles",
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
    // MOVED, 17 Sep 2026 (K2 by kind) — the knowledge branch split out of
    // collection-content.tsx's pure module switch into its own component
    // (knowledge-screen.tsx), the same move accounts/contacts/tickets/tasks/
    // processes/stories/waves already made, because the kind-tab strip's own
    // R16 badges need a live sidecar read only a real component can hold.
    pagerFile: "components/knowledge/knowledge-screen.tsx",
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
    // MOVED 14 SEP 2026, the same move `knowledge` never needed to make and
    // `accounts` now has: the gallery/table view toggle is a piece of state
    // the deep-link switch cannot hold (it is deliberately pure, no hooks —
    // collection-content.tsx's own header), so the accounts main screen is
    // its own component now (`accounts-screen.tsx`), the same shape Contacts
    // already took one module before it. Its own `<LoadMore listKey={found.listKey
    // ?? accountsKey(teamId)}>` is the real pager this line still proves.
    pagerFile: "components/accounts/accounts-screen.tsx",
    pagerKey: "accountsKey(",
    why: "every company AND every person an agency works with is a row here — a contact list that only grows, so a ceiling would eventually become a refusal to answer",
  },
  mcpCallLog: {
    lib: "workers/mcp/src/lib/call-log.ts",
    fn: "listCalls",
    routes: "workers/mcp/src/routes/tokens.ts",
    rowsKey: "calls",
    webKey: "mcpCallsKey(",
    pagerFile: "components/team/access-tokens.tsx",
    pagerKey: "mcpCallsKey(",
    why: "every MCP call leaves one row — a busy integration adds hundreds a day and the table only ever grows, so a hard cap would eventually hide a token's own recent calls from the person trying to audit them",
  },
  // THE TEAM-WIDE `scope=team` ENTRY USED TO LIVE HERE, and it was already a
  // ghost by the time `member-screen.tsx` moved onto the generic (table, id)
  // path (14 Sep 2026, this file's `RECORD_TABS_SINGLE_PANEL` note). The
  // client retired `team.detail` — the one screen that ever showed the
  // team-wide feed — on 2026-09-09 ("This overview about the team should not
  // even exist"), which left this entry's `webKey: "activity:team:"` pinned
  // to a literal `web/lib/use-screen-data.ts` had not composed since that
  // date, and its `pagerFile`/`pagerKey` satisfied only by coincidence: the
  // SAME `activityKey` variable also carried the MEMBER'S OWN `scope=user`
  // key, the one call site that was actually still reachable, so the pin
  // stayed green for the wrong reason for six days. Deleting the last live
  // reader of that variable (member-screen.tsx's own move, and the dead
  // `activityScope`/`activityKey`/`activityQ`/`activityTotal`/
  // `activityFetchPage` block it left behind in use-screen-data.ts) is what
  // surfaced it: nothing in `web/` has been able to reach page two of the
  // team's own feed since 2026-09-09, because nothing has been able to reach
  // page ONE of it either. `getActivity`'s `scope=team` branch (activity-
  // read.ts) still exists server-side — R14's first clause (a LIMIT on every
  // list/search read) is unconditional and does not need a GROWING_COLLECTIONS
  // row to pass — this only removes the now-false claim that a WEB screen can
  // still page it.
  //
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
    // NO `listRecipe` ANY MORE, 15 Sep 2026 — `tasks`'s own shape, two rows up:
    // the Stories tab strip replaced the generic `<PagedFind>` + `ScreenRenderer`
    // list with a `tasks-screen.tsx`-style toolbar (search/sort run over
    // whichever tab's loaded page is showing, never a door-side facet dialled
    // in), so this collection no longer renders through the recipe-engine's
    // generic list screen at all — `listRecipe`'s own doc says that field marks
    // exactly that rendering path, and Stories left it the same day Tasks did.
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
    "the Open tab's BOARD, and a partition rather than a narrowing: the columns are mapped off OPEN_TAB_STATUSES (`web/test/tab-facets.test.tsx` holds that), a loaded ticket has exactly one status, and every one of those statuses is drawn — so no card the page loaded is dropped from the board. The number beside each column stands down the moment anything is being asked (`count: narrowed ? undefined : counts?.[stage]`, with `narrowed={found.active}`), so the exact server count never sits over a bucketed page. The fifth column (Waiting) is a SECOND door read, not a slice of these rows, for the same reason. Also covers the identical call in `AllBoard`, the same file, added 17 Sep 2026 for the All tab's own board — same partition, over HELP_STATUSES instead of the narrower four.",
  "web/components/work/work-panels.tsx::rows.filter((r) => r.status === stage)":
    "the app record's own ticket BOARD (`AppTicketsBoard`, 17 Sep 2026: \"In Tickets inside the app, I want a board view by status\") — a partition of the same bounded per-app page the List body already reads (`content.help({ appId })`, R14's ordinary hard cap), one column per HELP_STATUSES entry, every loaded ticket landing in exactly one. No column is handed a `count` at all (there is no per-app equivalent of the top-level screen's team-wide `byStatus` read to hand it), so there is no exact server number for a bucketed page to sit under and contradict — the cards ARE the board's whole claim, the same fallback OpenBoard/AllBoard themselves take the moment their own toolbar is narrowed.",
  "web/components/work/work-panels.tsx::rows.filter((r) => r.status === \"new\")":
    "the app record's own ticket QUEUE (`AppTicketsPanel`'s `renderBody`, 17 Sep 2026: \"I also want the queue view for triaging\") — a genuine narrowing, not a partition, over the SAME bounded per-app page the List body already reads. Safe because nothing on this screen shows an exact count that this view could then contradict: the app's `ticketsTotal` badge (read one level up, on the record's own tab strip) counts the WHOLE ticket collection and is never claimed to be \"how many are new\", and the queue itself shows no count of its own, only the filtered rows. The client's own words license the bounded read: \"if the door already returns a page, group client-side for the board with the same bounded read the list uses\" carries over to the queue, the list's other alternate body.",
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
  automations: "which of the software's own automatic behaviours this team has switched off — the row names a settings SEGMENT, not a record, and the page it describes is open to any member (R70)",
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
  /* `selectable-detail` WAS THE ONE ENTRY, AND THE SCREEN IS GONE — 11 Sep 2026.
   *
   * A dropdown value's own record page (`/t/<teamId>/dropdowns/<id>`) was
   * retired with the whole-vocabulary screen that was its ONLY door, at the
   * client's ruling that ended Settings › Choices. A value is edited in place on
   * its module's settings page now, and what that record page alone carried —
   * the audit block and the value's own history — is read in the team's activity
   * feed, which covers `selectable_data` like any other table
   * (`ACTIVITY_GATE_MAP`). */
  "member-screen":
    "the client's ruling, 2026-09-14, over the member's own detail page — " +
    "\"chip on top of title\", \"an image… I want to be able to see it\", " +
    "\"remove the tabs\", \"put the footer where it belongs\" — moved this " +
    "screen onto `<RecordScreen>` (the same bespoke host a Contact or a " +
    "Ticket draws through, for the chip-above-title slot the generic engine " +
    "has none of), which is what makes this file visible to this census for " +
    "the first time. It draws no `<TabsView>` on purpose: the member's whole " +
    "record — the first panel (`member-head.tsx`) and the person's own " +
    "profile (`staff-panel.tsx`) — is ONE body, and a one-tab strip over it " +
    "would be chrome that names the thing already on screen (this law's own " +
    "reasoning for `selectable-detail`, above, before that screen was retired " +
    "outright). Putting both inside `<RecordScreen>`'s one `children` is also " +
    "what fixed the footer: it used to sit between the old three-field " +
    "Overview block and the profile section bolted on beside it; now it is " +
    "the true last thing on the page, same as Contact's and Ticket's.",
  "help-detail":
    "the client's ruling, 17 Sep 2026, verbatim: \"I want to see, on one " +
    "single screen with no tabs, the content of tickets: the stages, the " +
    "kind of conversation with the customer, related stories, work logs, " +
    "stakeholders. We currently, in our legacy system, have it on one page, " +
    "and it's very practical. We don't want to change that\" — and her pick " +
    "over the decision page (https://claude.ai/artifact/34udsj1HpzcojN15Sq97tt), " +
    "\"For ticket 1 page, I choose to implement it v1.\" The five things she " +
    "named are drawn AT ONCE, never behind a click: the stage ladder rides " +
    "`headerExtra` (the kit's own hero region, above wherever the body " +
    "begins — a tab strip stood there until this same ruling), and the body " +
    "itself is `TicketDetailBody` (web/components/tickets/ticket-detail-body.tsx) " +
    "— one two-column layout, not a strip choosing between four things a " +
    "reader used to click through one at a time. Files moved to the ⋯ menu " +
    "(a sheet until 18 Sep 2026, when the client retired it outright — " +
    "\"kill this whole files & links … button. those are visible in the " +
    "conversation itself\" — and the panel moved a second time, inline into " +
    "`TicketConversationPanel`'s own tray) and Activity stays exactly where " +
    "the 7 Sep 2026 ruling put it, off the footer's own eyebrow — neither " +
    "was named on the page, so neither earns a spot on it. " +
    "`web/test/ticket-stages-above-tabs.test.tsx` and " +
    "`web/test/ticket-detail-no-tabs.test.tsx` prove the shape from the " +
    "render: the ladder sits above the body in DOM order, and no `tablist` " +
    "renders anywhere on the screen. AMENDED 18 Sep 2026, client ruling " +
    "verbatim, \"the ticket detail is completely wrong in terms of " +
    "containers … remove the 'overall' container, make each thing its own " +
    "container, like tickets dashboard\": `<RecordScreen>` now carries " +
    "`panelVisible={false}` (record-chrome.tsx's own amendment) and " +
    "`TicketDetailBody` renders as its SIBLING rather than its `children` — " +
    "still no `tablist`, and still one bespoke body, just no second `Card` " +
    "wrapping it.",
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
  // `selectable-detail.overview` STOOD HERE and went with the screen on
  // 11 Sep 2026 — see RECORD_TABS_SINGLE_PANEL above for the whole account.
  // `help-detail.overview` STOOD HERE TOO, and went the same way on
  // 17 Sep 2026: the whole tab strip it named a tab on is gone
  // (RECORD_TABS_SINGLE_PANEL["help-detail"] carries the ruling), and its
  // own facts moved into the Stakeholders panel rather than staying a tab.
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
  // `app-detail.knowledge` STOOD HERE and left this map on 17 Sep 2026, the day
  // the client ruled the Knowledge tab should "replicate what we have in the
  // general knowledge [...] a gallery with all the knowledge we have about
  // this". It is a real, app-filtered collection now (`SourceFilters.appId`,
  // workers/content/src/lib/knowledge.ts), so it carries an exact server total
  // the same way its five collection siblings on this record already do
  // (`shared/record-counts.ts`'s new `knowledge-app` entry) — the old
  // reasoning ("retrieval, not a collection") describes the ask box this tab
  // no longer is.
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
  // step. A second staff form, `certificate-form-dialog`, stood beside the
  // profile form below until the certificate module was killed whole on
  // 14 Sep 2026 and the dialog deleted with it.
  "internal-record-dialog",
  "staff-profile-dialog",
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
    why: "a colleague's face on their profile. The door is a generic upload endpoint; a second destination, StaffCertificate.fileUrl, sat here until the certificate module was killed whole on 14 Sep 2026 and dropped by team migration 0090",
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
    "REALIZED DIFFERENTLY, revised 17 Sep 2026. This app no longer has a profile screen of its own to compare against the composition — the client's own ruling retired it outright ('this page should not exist… it should lead me to the same page that I arrive at when I go to Settings, Members, and I click on one member'). The signed-in person's identity now renders through `web/components/team/member-screen.tsx`, the SAME generic member-record detail every other teammate's row opens, by their id (R38), never a page whose whole subject is always 'me'. The composition's premise — a screen that is always about the current user — has no slot left to fill; adopting it would mean building back the second, bespoke identity screen the ruling removed.",
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

// ═════════════════════════════════════════════════════════════════════════════
// MOVED FROM TEST FILES, 14 Sep 2026 — RULES.md line 13 made true.
//
// These twenty deny-lists used to be declared INSIDE the test files that read
// them: invisible to this file, invisible to anyone reading RULES.md's claim
// that "deny-lists ... live as DATA in the registry ... every exception is a
// visible, conscious line". A census off `web/test/**` and `web-portal/test/**`
// found them (`registry-backed-exemptions.test.ts` is the check that now keeps
// the census honest — every exemption-shaped const in a test file must be an
// IMPORT off this module, not a local declaration). Each keeps its exact shape,
// entries and reasons; each test now imports its list from here. Grouped near
// the law or census each serves.
// ═════════════════════════════════════════════════════════════════════════════

// ── R58 (named-paths) ───────────────────────────────────────────────────────

/** R58 — a path our own words name on purpose, knowing it is not there.
 * `web/test/named-paths.test.ts` walks every `.md` this repo writes and every
 * text file of our own source for a path shaped like `root/segment/file.ext`,
 * and demands it resolve on disk — a document or a comment naming a GUARD that
 * is not there reassures a reader who checks, which is the dangerous shape.
 * Rot-checked twice: a path that comes back, or one nothing names any more,
 * turns the build red, so the list can only shrink. */
export const GONE_ON_PURPOSE: Record<string, string> = {
  "web/components/screens/profile-screen.tsx":
    "the standalone /profile screen, retired 17 Sep 2026 at the client's own ruling ('I go to the nav bar, on my name, and to my profile. This page should not exist. It should lead me to the same page that I arrive at when I go to Settings, Members, and I click on one member.'). The nav bar's own name (profile-menu.tsx) now opens the signed-in person's own team-scoped member record (member-screen.tsx) by id, the same screen a card on Settings › Members opens for anybody else. UI-RULEBOOK.md's L26 entry and its N8 width census both name this path precisely BECAUSE it is gone — L26 is the retirement record itself, and N8's table is measured history of a cap that no longer exists anywhere, this file included.",
  "web/lib/app-stage-icon.tsx":
    "the small resolver that turned `AppStage.icon` into a real Phosphor glyph, deleted 16 Sep 2026 the same day it shipped — the client's correction of migration 0097's misread moved the icon vocabulary to Sprint type (`web/lib/sprint-type-icon.tsx`) and put App stage's own pill back on a coloured dot, so nothing resolves an `AppStage` icon any more. Team migration 0097's own header (workers/tenancy/src/team-schema/migrations.ts, both the original paragraph and the correction appended beside it) and UI-RULEBOOK.md K28 both name this path precisely BECAUSE it is gone — the correction cannot be told without naming the file it retired.",
  "web/components/choices/selectable-screen.tsx":
    "the module-settings-page-scoped Choices editor (grouped lists + chip walls, `SelectableScope`), retired 15 Sep 2026 when Task B unified it with the general Choices tab's own editor — both now read through `SettingsChoicesPanel`'s `scope` prop (`web/components/screens/settings-choices-panel.tsx`, a `RecordTable`). module-settings-screen.tsx's own header and settings-choices-panel.tsx's own header both name this path precisely BECAUSE it is gone, the same reason role-detail.tsx stays named below; UI-RULEBOOK.md K7 and COMPOSITION-MISMATCHES.md's own virtualization entry are historical measurements of the file while it still drew the screen.",
  "workers/tenancy/src/lib/internal-money.ts":
    "the file R24 was built around: the agency's own two cost cards and the margin, in ONE file nothing a client login could reach imported. RULES.md's R24 row, CLAUDE.md, the registry's law text, the retirement record in rules.test.ts, money.test.ts's retired margin block, BUILD-A-MODULE.md and team migration 0031's annotation all name it, and every one of those sentences is ABOUT its deletion — the law's structural half cannot be explained without naming the thing that was structural",
  "web/components/money/internal-rate-card.tsx":
    "the internal rate card screen, which also carried the role rate card. CONTROL-SWAP-LANES.md's lane manifest is a snapshot of the files that lane was handed and is left as counted, and a lane report in .session-notes/lanes/ measures its first-run copy — both are records of a moment, and rewriting a snapshot to match today is how a snapshot stops being evidence",
  "web/components/money/margin-panel.tsx":
    "the \"what this account leaves us\" figure on a client's Rates tab, the margin's only consumer, which could not survive the loss of its input. Named in a lane report that measured its empty-state copy — the same snapshot argument as the card above",
  "web/components/team/role-detail.tsx":
    "the per-role screen the client deleted on 2026-09-09 (\"I want to see the roles much differently… all the roles together\"). Every role's sheet is one grid on Settings › Team now (roles-matrix.tsx), and half a dozen comments — module-content.tsx's `roles` branch, the roles matrix's own header, web/lib/pages.ts, R36's screen clause in rules.test.ts — name this path precisely BECAUSE it is gone, which is what makes each of those sentences readable",
  "web/lib/use-live-refetch.ts":
    "R15's retired half. RULES.md, CACHING.md and the registry all say this hook was deleted when paging moved to cursors over the shared store — naming it is the whole point of the sentence",
  "web/lib/live-bus.ts":
    "CACHING.md, one sentence on from the hook above: the bus 'outlived its only subscriber and is now gone too'",
  "web/components/condensed-title.tsx":
    "the registry's R46 note on the kit's `useIsVisible`: its one caller in the app, removed when the client asked for the compressed title bar to go",
  "web/components/knowledge-ask.tsx":
    "CONTROL-SWAP-LANES.md's lane A manifest — a snapshot of the files that lane was handed, left as counted and annotated at the top of the file",
  "shared/web/screen-engine/range-facet.tsx":
    "CONTROL-SWAP-LANES.md's lane C manifest, same snapshot: it went when the filter row became the design kit's",
  "shared/web/screen-engine/searchable-facet.tsx":
    "CONTROL-SWAP-LANES.md's lane C manifest, same snapshot and the same commit",
  "web-portal/components/auth-artwork.tsx":
    "UI-GAPS.md row 23 records the file's own deletion — it says 'is deleted', which is the fact the row exists to carry",
  "shared/ui/lib/recipe.ts":
    "SCREEN-ENGINE-PLAN.md says the recipe type 'was' here while the engine lived in the library, and where it is now",
  "shared/ui/styles.css":
    "UI-CONVENTIONS.md says in so many words 'There is no shared/ui/styles.css'; OPERATIONS.md dates the vendoring that ended it, library-map.md is the superseded swap key that mapped its tokens, and both apps' globals.css and shared/brand.ts name it in the same past tense",
  "shared/web/brand-theme.tsx":
    "the `<style>` tag that stood six mango tokens in front of the old library's teal preset. RESKIN-REPORT.md records the end of it — 'the theme IS the kwapso palette now, so BrandTheme is gone' — and design/library-map.md, which carries a SUPERSEDED banner of its own, names the file twice as the middle layer of the three-deep chain that swap removed. Found only when the docs census learned to read markdown that lives outside documents/",
  "web/components/temp/auth-card.tsx":
    "the temp/ folder went when the kit shipped its own sign-in composition; `web/components/shell/auth-card.tsx`'s header says what it 'was'",
  "web/components/temp/code-input.tsx":
    "the same folder, named by the portal's own compile fence as the file whose planned deletion would once have broken the other app",
  "workers/auth/test/session-read-seam.test.ts":
    "`web/test/one-cookie-name.test.ts` records the two suites it was merged out of, on 6 Sep 2026 — the names are the record",
  "web/components/help-status-stepper.tsx":
    "COMPOSITION-MISMATCHES.md and NEEDS-A-SPEC.md both name it to say it is GONE: the client's 31 Aug 2026 ruling that nothing renders after the chips row put a status track below them out of bounds, and this wrapper was removed rather than relocated on 1 Sep 2026. Both entries were kept, not deleted, because the composition question survives the component",
  "web/components/story-status-stepper.tsx":
    "the other half of the same removal, named in the same two sentences for the same reason",
  "web/lib/api.ts":
    "the agency client became a directory; `workers/gateway/test/agency-door.test.ts` explains that it walks the directory precisely because it 'used to be' this one file",
  "scripts/icon-art.mjs":
    "the stage that stood lucide's glyphs in front of the kit's icon-name placeholders until v1.0.8 shipped 1,383 drawn glyphs. `scripts/sync-design.mjs` names it in the comment that replaced the call — 'is deleted rather than left switched off' — which is the sentence that tells the next reader the art stage is not merely disabled somewhere they have not looked",
  // ── CONTACTSBYCOMPANY, deleted 14 Sep 2026 as unreached dead code (Part 3b
  // of the same pass that made this whole table registry data): R67's own
  // `UNCONTAINED_SECTION_OK` history, UI-GAPS.md #24 and
  // `web/test/orphan-components.test.ts`'s own header (explaining the census
  // fix that finally caught it) all name the file precisely BECAUSE it is
  // gone.
  "web/components/accounts/contacts-by-company.tsx":
    "the grouped-by-company Contacts arrangement, host-composed from ScreenRenderer + a <section> per group. R67's law text (amendment 7) records the day it was JUDGED as an uncontained section and found unreached; UI-GAPS.md #24 records it as the closed-app-side-abandoned feature; web/lib/screens.ts, web/components/accounts/contacts-screen.tsx and web/components/deep-link/shape.tsx each explain, in their own comments, what they used to point at",
  "web/test/contacts-by-company.test.tsx":
    "the deleted component's own dedicated spec file — deleted with it. Named in web/test/orphan-components.test.ts's own header as the reason the census missed the component in the first place: the file's import let the component's own test count as a 'mount', which is not evidence the app renders it",
  "web/components/team/certificate-form-dialog.tsx":
    "the certificate record's form dialog, deleted whole with the certificate module on 14 Sep 2026 at the client's ruling — \"kill the whole certificate module everywhere\". Team migration 0090's own comment names this exact path to say what it deleted alongside the table, the same shape 0078's role-detail entry above uses; DATA-MODEL.md's staff_profiles section names it in the same past tense",
  "web/app/sprints/[[...rest]]/page.tsx":
    "the top-level Sprints main page's own shell, deleted 15 Sep 2026 with its sidebar row at the client's ruling — \"killing the sprints main page completely and just keeping the waves one on top of the build section on the sidebar\". A sprint is reached nested under its wave now (`/waves/<waveId>/sprints/<sprintId>`, web/components/work/wave-detail.tsx), which needs no top-level shell of its own — the nested address resolves under web/app/waves' catch-all. web/components/deep-link/route.ts's own TOP_LEVEL_MODULES comment and SECTION_HOSTED_ELSEWHERE's `sprints` line (this file) both name this exact path to say what it deleted, the same shape the certificate dialog entry above uses",
}

// ── dates-are-formatted ─────────────────────────────────────────────────────

/** The genuine exceptions to "every date a person reads goes through
 * shared/web/format.ts" — a `dateTime:` key feeding the DOM's own machine-
 * readable `<time dateTime>` attribute (paired with a separately formatted
 * field for the words a person sees), or a long-month/weekday-alone formatter
 * shared/web/format.ts does not carry.
 *
 * REKEYED 15 Sep 2026, "path:line" → "path: expression". The `work-panels.tsx`
 * entry below drifted THREE times in one night under this key's old shape —
 * :1500 → :1513 when a lane added a block above it, then stale again at :1512
 * when another lane shortened a comment above it — turning the build red on
 * an edit that never touched the offending line, and costing a re-pin each
 * time. A line number names a position in the FILE; every edit above it moves
 * it. The key is now the file plus the offending line's own text (comment
 * stripped, whitespace collapsed to one space) — the exact text
 * `web/test/dates-are-formatted.test.ts` matched to call the line an offence,
 * so the key only moves when that code itself changes, never when something
 * merely lands above it. Rot-checked BOTH ways: an entry whose expression no
 * longer matches anything is as much a failure as an unlisted offender. */
export const RAW_DATE_EXEMPT: Record<string, string> = {
  "web/components/meetings/meetings-screen.tsx: dateTime: m.startsAt,":
    "same shape as use-record-activity.ts's and shape.tsx's own `dateTime: " +
    "a.createdAt` above — feeds the kit's `Agenda`'s own `<time dateTime>` " +
    "attribute (`AgendaItem.dateTime`, shared/ui/components/agenda/agenda.tsx: " +
    "\"the machine-readable instant, for <time datetime>\") — machine-readable, " +
    "never text a person reads. The line right above it, `time: " +
    "formatTime(m.startsAt, lang)`, is the one that is.",
  'web/components/records/record-calendar.tsx: return month.toLocaleDateString(lang, { month: "long", year: "numeric" })':
    "the month heading needs the reader's own LONG month name + year — " +
    "shared/web/format.ts has no formatter for that shape (formatMonth is " +
    "the short-month AXIS one) — so it calls Intl directly, with the real " +
    "`lang` (this line used to pass `undefined`, which is the bug R1 of this " +
    "pass fixed).",
  'web/components/records/record-calendar.tsx: new Date(1970, 0, 5 + i).toLocaleDateString(lang, { weekday: "short" })':
    "the weekday headings need the reader's own weekday names alone, and no " +
    "formatter in shared/web/format.ts produces that shape either — Intl " +
    "directly, with the real `lang` (also used to pass `undefined`).",
  'web/components/records/record-week.tsx: new Date(1970, 0, 5 + i).toLocaleDateString(lang, { weekday: "short" })':
    "the same weekday-name-alone shape record-calendar.tsx's own identical " +
    "line above is pinned for (weekdayShortLabels, this file's own copy of " +
    "that helper, since it is not exported) — shared/web/format.ts has no " +
    "formatter for a bare weekday, so Intl directly, with the real `lang`.",
  'web/components/records/record-week.tsx: const start = monday.toLocaleDateString(lang, { month: "short", day: "numeric" })':
    "the week range title (\"Sep 14–20, 2026\") needs a short month + day with " +
    "no year on the START side — shared/web/format.ts has no formatter for " +
    "that shape (formatMonth is the short-month AXIS one, formatDate always " +
    "carries a year) — Intl directly, with the real `lang`, the identical " +
    "reasoning record-calendar.tsx's own monthLabel is pinned for above.",
  "web/components/records/record-week.tsx: const end = sunday.toLocaleDateString(":
    "the week range title's END side — same call as the START side above, " +
    "conditionally short-month-and-day or day-alone depending on whether the " +
    "week crosses a month boundary, which is why the arguments are on the " +
    "next two lines rather than inline: no formatter in shared/web/format.ts " +
    "produces either shape.",
  'web/components/records/record-week.tsx: const year = sunday.toLocaleDateString(lang, { year: "numeric" })':
    "the week range title's own trailing year, read off Sunday (not Monday) " +
    "so a week that crosses a New Year states the year the week ENDS in — " +
    "shared/web/format.ts has no bare-year formatter either.",
  "web/lib/use-record-activity.ts: dateTime: a.createdAt,":
    "`dateTime: a.createdAt` feeds the kit's `<time dateTime>` attribute " +
    "(ActivityFeed's own `dateTime` field) — machine-readable, never text a " +
    "person reads. The line right above it, `timestamp: formatRelative(...)`, " +
    "is the one that is. (Re-pinned from :139 on 7 Sep 2026, when R54 put the " +
    "actor's trim and its reasoning above this line, to :167 on 8 Sep " +
    "2026 when the main × feat/ui-ux merge put the scope fields above it, " +
    "and to :186 on 14 Sep 2026, when R35/R60's avatar fix (the client's " +
    "\"we see the avatars of the people\" ruling) gave the row an `avatarSrc` " +
    "field — a `safeSrc(...)` call and its own comment — between `initials` " +
    "and this line, nineteen lines net.)",
  "web/components/deep-link/shape.tsx: dateTime: a.createdAt,":
    "same shape as use-record-activity.ts's `dateTime: a.createdAt` — " +
    "beside its own already-formatted `timestamp: formatRelative(...)`, one " +
    "line up, for the same `<time dateTime>` attribute. (Re-pinned from :83 " +
    "on 7 Sep 2026, when `shapeActivity` gained a named return type, and to :90 on 9 Sep 2026 when `TeamMeta` left the import block with the deleted team-overview shaper — " +
    "`ActivityFeedRow` — and the import and its note landed above this line; " +
    "and to :96 the same day, when the contacts TABLE landed and `REF_LEADS_NAME` " +
    "joined the import block above it with the note saying why the class is " +
    "shared rather than respelled; and to :94 on 10 Sep 2026, when kb_F deleted " +
    "the knowledge section's two dead exports (`knowledgeFiledUnder`, " +
    "`shapeKnowledgeList` — superseded by `KnowledgeSourceCard`) and their " +
    "now-unused `Icon`/`IconName`/`KnowledgeSource` imports two lines above " +
    "this one; to :100 on 14 Sep 2026, when the system-wide Choices tab's " +
    "own shaper (`shapeChoicesTable`) landed five single-line imports and a " +
    "`SelectableValue` type import above this one, six lines net; to :105 " +
    "later the same day, when R35/R60's avatar fix gave this row an " +
    "`avatarSrc` field — a `safeSrc(...)` call and its own comment — between " +
    "`initials` and this line, five lines net; and to :106 later the same day " +
    "again, when the member detail redesign (chip above title, the picture, " +
    "no tab strip — `web/components/team/member-screen.tsx`'s own header) " +
    "deleted `shapeMemberDetail` from above this line, in this same file — " +
    "the recipe engine no longer draws that record's head, so the shaper that " +
    "fed it went too — and the twelve deleted lines landed one net line " +
    "SHORTER than this comment expected, because the blank line the function " +
    "left behind stayed. One line net.)",
  "web/components/work/work-panels.tsx: dateTime: todo.completedAt ?? undefined,":
    "`dateTime: todo.completedAt ?? undefined` for a to-do's checklist row, " +
    "beside its own already-formatted `when: todo.completedAt ? t(\"done " +
    "{date}\", ...)` one line up — the `<time dateTime>` attribute again, not " +
    "text. (Re-pinned from :1479 on 7 Sep 2026: the row's label above it grew " +
    "from a `ref · title` string into the black reference chip beside the " +
    "title, which is thirteen lines of JSX where there was one; from " +
    ":1492 to :1494 the same day, when R54 gave the row's actor its trim; " +
    "back to :1491 the same day again, when the ticket panel above lost its " +
    "`marks` prop and the `<RecordMark>` it drew — three lines net; and to " +
    ":1500 on 9 Sep 2026, when R62 folded this file's two zero states into one " +
    "`CollectionEmptyState` call and its note, nine lines net, landed above; " +
    "to :1513 on 15 Sep 2026 when the Waiting on clients row's label became a " +
    "conditional OpenLink for to-dos raised on a ticket, thirteen lines of JSX " +
    "added above this line — and stale again within the same night, to :1512, " +
    "when a second lane shortened a comment above it. Three re-pins in one " +
    "night on the same line is what moved this whole list off `path:line` " +
    "onto the expression key above: the code this entry actually pins is " +
    "this `dateTime:` assignment, not whatever line it happens to sit on.)",
}

// ── stored-html (the one injection seam) ───────────────────────────────────

/** The ONLY places either front door may hand a string to the browser as
 * markup. Data, not judgement in code — every entry is a visible line with the
 * reason it is safe, the same shape rich-text.test.ts's NOT_USER_TYPED uses.
 * Anything else is an offender, whatever it claims to have sanitised on the
 * way in. */
export const MAY_INJECT: Record<string, string> = {
  "shared/web/rich-text-view.tsx":
    "THE seam. Both branches produce known-safe HTML: sanitizeRichHtml (parse detached → allow-list) for a body with tags, toHtml (escape-first markdown) for one without.",
  "web/components/assistant/agent-markdown.tsx":
    "the assistant's own reply, through the same escape-first toHtml — the text is escaped before any markup is added, so its output is safe by construction",
  "shared/web/theme-provider.tsx":
    "the pre-paint theme boot script — a module constant written in this repo (apply localStorage's stored data-theme before first paint, the design kit's own prescribed snippet). No value from a request or a row reaches it.",
  "shared/web/mark-runtime.tsx":
    "two module constants (the mark's CSS and its animator script) written in this repo — no value from a request or a row reaches them",
  "shared/web/mark-loader.tsx":
    "the mark's own markup, a module constant built from module constants (shared/web/splash.ts → splashInner). It is server-rendered on purpose: an empty box in the exported HTML is a blank screen until the bundle lands.",
}

// ── forms-forward-everything ────────────────────────────────────────────────

/** PAYLOADS THAT ARE BUILT BY HAND ON PURPOSE, each with the reason.
 *
 * These four name every field their form declares TODAY — they are the shape
 * the bug came out of, not the bug. Each also TRANSFORMS on the way through
 * (`values.sprintId || undefined`, a null for a cleared picker), so a blind
 * spread would change what reaches the door rather than tidy it.
 *
 * The list is rot-checked: an entry whose payload starts spreading, or
 * whose call disappears, turns the build red. It can only shrink. */
export const BY_HAND: Record<string, string> = {
  "process-detail.tsx → addStep":
    "the step form answers three shape questions (a split, an arm, a loop) that become four different fields, and the mapping is the point of the handler",
  "process-detail.tsx → updateStep":
    "the same mapping in reverse, plus `position`, which is DERIVED from the shape rather than sent by the form",
  "stories-screen.tsx → createStory":
    "empty string means 'not chosen' on this form and `undefined` means 'leave it' at the door — the conversion is deliberate and cannot be spread",
  "story-detail.tsx → updateStory":
    "the same conversion on the edit half",
}

// ── one-black-chip (the one reference mark) ─────────────────────────────────

/** EVERY SURFACE THAT LEGITIMATELY BUILDS A BLACK CHIP OF ITS OWN, with the
 * reason it is not a record's reference. One line, and it should stay that
 * way. */
export const INVERSE_BADGE_OK: Record<string, string> = {
  "web/components/process/process-map.tsx":
    "NOT A REFERENCE. The two badges there are a LEGEND KEY — the short code " +
    "(`A`, `B`) standing in front of each side's label on a comparison bar, " +
    "paired with a `secondary` badge for the other side so the two sides read " +
    "as opposites. It is charcoal because it is the loud half of a pair, not " +
    "because it names a record; nothing on that map has a `ref` at all.",
}

/** A slot typed `string` (a picker option's label, a `recordLabel`, a
 * `CalendarEntry.title`, a React list key) where a black chip genuinely cannot
 * go, so the reference is glued in front of the name instead — keyed by WHAT
 * THE LINE SAYS rather than by "path:line", because a pin that only moves
 * whenever an unrelated line is added above it does not identify a call site.
 * A `contains` fragment matching more than one site in its file is refused: one
 * reviewed exemption must not silently cover a second site nobody looked at. */
export interface RefAsString {
  file: string
  contains: string
  why: string
}

export const REF_AS_STRING_OK: RefAsString[] = [
  {
    file: "web/lib/picker-sources.ts",
    contains: "label: t.ref ?",
    why:
      "`PickerOption.label` is typed `string` (web/components/records/record-picker.tsx) " +
      "— the picker draws the record's FACE from `picture`/`mark`/`swatch` and " +
      "its name from this one field. A ticket option leads with its number " +
      "because that is what somebody types to find it. (feat/ui-ux grew the " +
      "line above this one so an account option routes through the one " +
      "`accountOption` seam — the kind of edit that used to re-pin this entry " +
      "and now does nothing to it.)",
  },
  {
    file: "web/lib/picker-sources.ts",
    contains: "label: s.ref ?",
    why: "same slot, a story option — see the ticket one above.",
  },
  {
    file: "web/components/work/stories-screen.tsx",
    contains: "label: t.ref ?",
    why:
      "the ticket picker on the story form, building the same `PickerOption.label` " +
      "the two lines in picker-sources.ts build.",
  },
  {
    file: "web/components/tickets/help-detail.tsx",
    contains: "recordLabel={[ticket.ref",
    why:
      "`WorkLogsPanel.recordLabel` is typed `string` — it names the record a time " +
      "entry is being logged against, inside sentences and a dialog title, not on " +
      "a row of its own.",
  },
  {
    file: "web/components/tickets/help-detail.tsx",
    contains: "label: [ticket.ref",
    why:
      "`fixedTicket.label` on the story form dialog — the same `PickerOption` " +
      "string slot as picker-sources.ts, for the ticket the form is pinned to.",
  },
  {
    file: "web/components/work/story-detail.tsx",
    contains: "recordLabel={story.ref ?",
    why: "`WorkLogsPanel.recordLabel` again, for a story — see help-detail.tsx above.",
  },
  {
    file: "web/components/work/sprints-screen.tsx",
    contains: "title: s.ref ?",
    why:
      "`CalendarEntry.title` is typed `string`, and a month grid is the one place " +
      "the chip would be wrong even if the slot allowed it: a day cell is a few " +
      "characters wide and a lozenge in it is furniture, not information.",
  },
  {
    file: "web-portal/components/delivery-block.tsx",
    contains: "s.ref ?? s.name",
    why:
      "A REACT LIST KEY (`id:`), never rendered — the client reads `s.name` and " +
      "the dates on that row. Kept as the key because a sprint's reference is the " +
      "stablest thing about it.",
  },
  {
    file: "web/components/shell/new-tab-screen.tsx",
    contains: "label: row.ref ?",
    why:
      "`ResultRow.label` is typed `string` — the same slot feeds `RecordMark`'s " +
      "`name` prop (which needs a plain string to derive the initial mark) and " +
      "the `<Text>` beside it, for six different door reads sharing one row " +
      "shape (tickets, accounts, stories, apps, contacts, knowledge). A search " +
      "hit reads its number the way the picker options above already do.",
  },
]

// ── source-scan (the law machinery's own guard) ─────────────────────────────

/** WHO MAY STRIP A COMMENT BY HAND. Two shapes, both reasoned rather than
 * assumed. Most entries are a CSS case: CSS's block-comment syntax has no
 * line comment counterpart, so running the TypeScript stripper over a token
 * value would delete a `//` that CSS reads as part of a URL. The newest
 * entry (17 Sep 2026, kit v1.2.111) is a different shape — a VENDORED KIT
 * `.mjs` RULE SCRIPT, meant to run standalone under plain `node` with no
 * build step and no dependency on this app's own `shared/rules/strip-
 * comments.mjs`, the same reason `scripts/*.mjs` used to re-type these
 * regexes before 7 Sep 2026 (this file's own `source-scan.test.ts` header)
 * — except a kit script may never import an APP module at all, so it cannot
 * be pointed at the shared stripper the way an app script was. Everything
 * else that used to do this has been moved onto the shared `stripComments`. */
export const HAND_ROLLED_STRIPPER_OK: Record<string, string> = {
  "web/test/theme-tokens.test.ts":
    "strips a CSS comment out of a CSS custom property's VALUE, read from tokens.css. Not TypeScript: `//` is not a comment in CSS, it is the middle of a url(), so the shared stripper is the wrong tool here and would silently eat one",
  "shared/ui/foundations/tokens/token-model.mjs":
    "the VENDORED KIT's token reader, and the same CSS case the entry above was written for: it walks `tokens.css`, where `//` is not a comment but the middle of a `url()`, so the shared TypeScript stripper is the wrong tool and would silently eat one. `shared/ui/` is a dependency this repo may not hand-edit at all — `web/test/vendored-kit.test.ts` recomputes its content hash — so this can only ever be fixed upstream, and a kit sync that moves it will turn this line red exactly as the last one did",
  "shared/ui/foundations/tokens/check-contrast.mjs":
    "the kit's contrast law, reading the same `tokens.css` through the same CSS rules as the reader above. It is the check that found three surfaces painting themselves onto themselves on 7-8 Sep 2026; it cannot import a TypeScript stripper from an app that vendors it, and the CSS case is not what that stripper is for",
  "shared/ui/foundations/rules/check-overflow-axis.mjs":
    "the kit's OWN overflow-axis law (17 Sep 2026, kit v1.2.111), scanning .tsx source for a class rather than a CSS token — not the CSS case the three entries above share. It declares its own `stripComments` (same name, same two regexes) because it is a standalone script the kit ships to run under plain `node`, the identical shape `scripts/*.mjs` used to take before 7 Sep 2026 — except a kit file may not import an app module at all (`shared/ui/` is a pinned dependency this repo may not hand-edit; `web/test/vendored-kit.test.ts` recomputes its content hash), so it can never be pointed at `shared/rules/strip-comments.mjs` the way an app script was. Fixable only upstream, in Kwapso/kwapso-ui-ux; a kit sync that moves or removes this file turns this line red exactly as the token-model.mjs one above did once",
  "shared/ui/components/badge/check-badge.mjs":
    "the kit's OWN badge law (18 Sep 2026, kit v1.2.116), pinning the client's ticket-type-chip-is-grey and linked-badge-has-no-underline report against regression. Same shape as check-overflow-axis.mjs directly above: a standalone script the kit ships to run under plain `node` with no build step, reading badge.tsx's own variant block with an inline `.replace(/\\/\\*[\\s\\S]*?\\*\\//g, \"\")` to strip a doc comment before pattern-matching it, because a kit file may not import an app module at all (`shared/ui/` is a pinned dependency this repo may not hand-edit; `web/test/vendored-kit.test.ts` recomputes its content hash) and so can never be pointed at `shared/rules/strip-comments.mjs`. Fixable only upstream, in Kwapso/kwapso-ui-ux; a kit sync that moves or removes this file turns this line red the same way the two entries above would",
}

/** WHERE A RAW CONTROL BYTE IS ALLOWED TO SIT, and why. `grep` classifies a
 * file holding one as BINARY and skips it in silence — indistinguishable from
 * an honest zero matches — so a raw byte makes a file invisible to the exact
 * tool a person reaches for. Rot-checked both ways, so a file that no longer
 * holds one turns this red and the line is deleted.
 *
 * EMPTY, AND IT GOT THERE THE WAY AN EXEMPTION IS SUPPOSED TO. It opened with
 * one entry, for the vendored kit's `use-remembered-view.ts`, and the reason
 * named the condition under which the line would disappear: the kit is a
 * pinned dependency this repo may not hand-edit, so the fix could only be made
 * upstream and a sync would clear it. That happened, the same day, in kit
 * v1.2.74. An exemption whose reason cannot be read as an instruction is a
 * permanent one. */
export const CONTROL_BYTE_OK: Record<string, string> = {}

// ── R28 (catalogued-strings) ────────────────────────────────────────────────

/** R28 — a file the translation walk does not reach and that says something a
 * person reads anyway. `appFiles()` is the front doors' own import closure, so
 * a file the walk cannot see is a reasoned line here rather than a silent gap.
 * A ratchet: an entry that no longer offends turns the build red, so it can
 * only shrink. */
export const UNWALKED_OK: Record<string, string> = {
  "shared/workers/query-grammar.ts":
    "the machine query grammar — what a MODEL may ask a module, and the words in it are FIELD NAMES and the other names a field answers to ('reference' for `ref`, 'name' for `title`), not copy. Nothing here reaches a screen: no front door imports it, the two doors that read it live on the tenancy worker, and its only human-facing prose is the one-line module summaries a MODEL reads in describe_module. Translating a field name would break the filter it names. The extractor is right that a quoted word sits in a position it watches; it is wrong about who reads it.",
  "shared/workers/record-link.ts":
    "R30's email button labels — 'Open the ticket', 'Open your requests'. A WORKER composes them into a message, for the recipient's own front door, and no front door imports this file. They are held by R30, not by a screen, and the pipeline that would translate them is the worker's per-request translator rather than the build-time catalogue. Widening R28 to reach them would put the email census under a law written about screens.",
}

// ── detail-error-states ─────────────────────────────────────────────────────

/** THE ONE WAY OUT, and it carries the condition that deletes it.
 *
 * `knowledge/knowledge-detail.tsx` is the third instance of exactly this bug —
 * same two queries, same missing term, same permanent skeleton as
 * meeting-detail. It is NOT fixed here because a separate session owns the
 * knowledge base right now and the owner asked for it to be left alone;
 * editing this file from two places at once is how a merge eats somebody's
 * work.
 *
 * DELETE THIS ENTRY, and fix the screen, the moment that session's work lands.
 * Rot-checked both ways: an entry naming a file that no longer exists fails,
 * and an entry naming a screen that has since been fixed fails too — so it
 * cannot quietly outlive its reason. */
export const ERROR_STATE_EXEMPT: Record<string, string> = {
  "knowledge/knowledge-detail.tsx":
    "A parallel session owns the knowledge base (owner's instruction, 2026-09-10), " +
    "so this screen is not edited from here. Same bug as meeting-detail had: " +
    "sourcesQ.error is asked, oneQ.error is not, and a failed by-id read holds the " +
    "loading skeleton for ever. Delete this line and fix the guard once that " +
    "session has landed.",
}

// ── R60 (image-fills) ───────────────────────────────────────────────────────

/** R60 — THE ONE FIT THIS APP KEEPS, and the reason has to survive re-reading
 * because the client's ruling ("everywhere for images: do fill, not fit!") has
 * no exceptions clause in it. Rot-checked: a line whose file no longer holds a
 * non-`cover` fit turns the build red, so this list can only shrink and can
 * never become a place a `contain` hides. */
export const OBJECT_FIT_OK: Record<string, string> = {
  "shared/web/attachment-preview.tsx":
    "The kit's media well showing a FILE somebody attached to a ticket — a " +
    "screenshot of the thing that is broken, a scan, a photograph of a screen. " +
    "Every other picture this law governs is a MARK: a logo, a face, a brand " +
    "lockup, standing FOR a record whose name is written beside it, where a crop " +
    "costs the edges of an identity the word already carries. This one IS the " +
    "content, with no word beside it saying what was lost. The well is 16/9 and " +
    "an attachment is not: a portrait screenshot cropped to it shows a band from " +
    "the middle and hides the error message at the top, which is the reason the " +
    "file was attached — and nothing on screen tells the reader that happened, " +
    "because a crop looks exactly like a picture that was always that shape. " +
    "The preview also OPENS the file, so containing it costs nothing a person " +
    "cannot get past in one press. Flagged for the client rather than assumed: " +
    "her ruling was made over marks in select components and filters, and this " +
    "is the one site in the app it does not obviously describe. Delete this line " +
    "the day she says it does.",
}

// ── dead-exports ────────────────────────────────────────────────────────────

/** Exported values that nothing names, each with the decision that keeps it.
 * Rot-checked both ways: an entry whose export has gained a user, or whose
 * export no longer exists, turns the build red — so the list can only
 * shrink. */
export const DEAD_EXPORT_OK: Record<string, string> = {
  "web/components/tickets/mail-reply-dialog.tsx::MailReplyDialog":
    "the file is PARKED in web/test/orphan-components.test.ts (now `PARKED`, this module) with the decision that parks " +
    "it — it is the only place either front end holds a Gmail draft id, kept for the day a " +
    "screen opens it. An unmounted file has an unimported export by construction; this line " +
    "is that same decision seen from one level down, and both go together or neither does.",
  "shared/rules/registry.ts::DEAD_EXPORT_OK":
    "this census's own structural blind spot, not a real orphan. `web/test/dead-exports.test.ts` " +
    "excludes ITSELF from the `others` corpus on purpose — its own placeholder no-such-export " +
    "string (its positive control, proving the matcher can still see a dead export at all) would " +
    "otherwise match itself and silently break that control. `DEAD_EXPORT_OK` moved out of that file and into " +
    "this registry, 14 Sep 2026 (RULES.md line 13's promise made true), and dead-exports.test.ts is " +
    "the ONLY file that imports it — so the one file legitimately reading it is also the one file " +
    "this census refuses to count as a reader. This is exactly the shape this file's own header " +
    "names as sanctioned: \"a registry read only by the law that enforces it\" (RULES_REGISTRY, " +
    "STORED_FILES, PALETTE_LITERAL_OK…). Delete this line only if the census's own self-exclusion " +
    "is ever removed.",
}

// ── ancestors-have-names (breadcrumb faces) ─────────────────────────────────

/** Segments that never carry a record id, with the reason each. Data, and
 * rot-checked below, so the list can only shrink. */
export const NO_RECORD_BEHIND_IT: Record<string, string> = {
  time: "the work-log collection. A log is read on the record it was booked against, never at /time/<id>.",
  import: "the CSV importer — a workflow, not a collection. Nothing under it has an id.",
  brand: "brand assets open in a panel on the section itself rather than at an address of their own.",
  purposes: "meeting purposes are edited in place on their section, like dropdown values.",
  inputs: "a to-do has no detail screen of its own (TodosPanel's own header, work-panels.tsx) — it opens the ticket it was raised on, if any, never a record at its own address. The Inputs screen (Task C, 15 Sep 2026) is a bare list for exactly this reason.",
}

// ── assignable-members ──────────────────────────────────────────────────────

/**
 * The screens that read the members list and are NOT asking "who can do this
 * work". A client login is a member: the screens that MANAGE members have to
 * show them, or nobody could see a grant, change a role, or take one away.
 * Every one is a visible line with a reason; anything else must go through the
 * one seam.
 */
export const NOT_A_WORK_PICKER: Record<string, string> = {
  "screens/kwapso-screen.tsx":
    "the team roster on the agency's own record — a list of who is here, not a list of who can be given something",
  "work/work-panels.tsx":
    "reads the members list once, in AppTicketsPanel, only to resolve a ticket's editor/resolver AVATAR (`memberAvatar`, a `.find()` by userId) — a lookup by id, never turned into an option list. This file offers nobody a member to PICK. (The to-do form's own new 'Assigned to' field, migration 0103, is a different picker entirely — the account's own CONTACT, off `contactOptions`, never the team members list this census watches.)",
  "tickets/tickets-collection.tsx":
    "the top-level ticket list's own `membersQ` (R35, client ruling 18 Sep 2026: 'on column raised by i am missing the avatar') — read only so `TicketRowsTable`'s `memberFace(members, w.raiserId)` can resolve a staff raiser's picture, a `.find()` by userId exactly like `work-panels.tsx`'s AVATAR lookup above. Never turned into an option list; nothing on this screen lets a person pick a member from it.",
}

// ── orphan-components ───────────────────────────────────────────────────────

/** Components that are unmounted ON PURPOSE, each with the decision that parks
 * it. Rot-checked below: a line whose file has gained an importer (or lost its
 * file) turns the build red, so the list records real decisions only. */
export const PARKED: Record<string, string> = {
  "tickets/mail-reply-dialog":
    "the only place either front end ever holds a Gmail draft id. Parked, not dead: " +
    "the reachable-screens exemption for POST /google/gmail/trash names this file as " +
    "where a person's own 'bin it' belongs the day a screen opens it — delete this " +
    "line and the dialog together with that one.",
  "choices/manage-dropdowns-link":
    "the gated 'Manage choices' signpost under a dropdown field. Its one remaining " +
    "call site — the ticket form's Type row — was retired 17 Sep 2026 at the " +
    "client's own ruling ('remove the manage choices under type and replace these " +
    "colors with the icons for each type', see help-form-dialog.tsx and " +
    "web/test/help-form-dialog-type-icons.test.tsx), which leaves it unmounted " +
    "everywhere. Parked, not dead: the mechanism (a permission-gated jump from a " +
    "vocabulary field to that field's own module settings page, via " +
    "`moduleSettingsPage()`) is still the right shape for the next dropdown field " +
    "that wants one — delete this line and the file together the day nothing ever " +
    "mounts it again, or a caller reappears and this line comes out on its own " +
    "(the rot check below catches that).",
  "tickets/help-attachments":
    "the ticket's whole-file-list panel (`HelpAttachmentsPanel`, over " +
    "`records/record-attachments.tsx`). Mounted inline inside the Conversation " +
    "card's own tray for one day, 18 Sep 2026, at the client's ruling ('kill this " +
    "whole files & links … button. those are visible in the conversation itself'), " +
    "then pulled the SAME DAY reading the deployed tray back, verbatim: 'wtf is " +
    "his files inside the ocnversation lol thats not what i meant, i meant that " +
    "each message can have images or files, check in the kit because we already " +
    "biult the ui for that.' Parked, not dead: what she asked for is each MESSAGE " +
    "carrying its own attachments through the kit's `TicketThread` " +
    "(`ThreadMessage.attachments`/`media`, shared/ui/components/ticket-thread/" +
    "ticket-thread.tsx), which needs a door change first — `help_attachments` " +
    "(workers/tenancy/src/team-schema/migrations.ts) is keyed by `help_id` only, " +
    "with no column to join a file to the one reply it was sent on. " +
    "help-detail.tsx's own header carries the full account and the exact " +
    "migration this needs. Delete this line and the file together only once " +
    "something reaches it again with a real reader, never by re-adding the same " +
    "ticket-wide tray this ruling removed.",
}

// ── R41 (picked-files-are-sent) ─────────────────────────────────────────────

/** R41 — the dialogs that hold a picked file until submit because the record
 * they belong to does not exist yet, each with the maker whose id they need
 * back. DATA, and it is the one hand-written thing in this law — everything
 * about whether a call site is correct is derived from it. Rot-checked: a
 * component that stops deferring loses its line. */
export const DEFERRED_UPLOAD_FORMS: { component: string; maker: string; why: string }[] = [
  {
    component: "StoryFormDialog",
    maker: "createStoryFrom",
    why: "a story's attachments are addressed by story id, which does not exist until the create door answers — so the picked files wait for the id the submit hands back",
  },
]

// ── R1 (publish-seam) ───────────────────────────────────────────────────────

/** R1 — the one worker CLAUDE.md and CACHING.md rule 5 already name as the
 * reviewed exception to "every worker that publishes has a publish-seam
 * suite": auth publishes on the per-user identity channel, not a team
 * resource, so there is no ROUTES-table mutation set for a seam test to
 * walk. */
export const AUTH_PUBLISH_EXEMPT: Record<string, string> = {
  auth: "publishes on the per-user identity channel, not a team resource — no ROUTES mutation set to walk (CACHING.md rule 5)",
}

// ── motion-is-the-kits ──────────────────────────────────────────────────────

/** Hand-rolled Tailwind transitions pinned in place of the kit's own
 * `motion-*` vocabulary, with the reason each. Rot-checked: a pin whose file no
 * longer carries a transition turns this red, so the list can only shrink.
 *
 * EMPTY, and that is the point. It has now emptied TWICE, both times because
 * the hand-rolled thing was replaced by a kit part rather than because anybody
 * came looking for the pin: `record-chrome.tsx`'s collapsing sticky header
 * (2026-08-27, once the kit shipped `RecordChrome`) and
 * `agent-markdown.tsx`'s link transition (2026-09-13, once the assistant's
 * prose and `ArticleBody`'s were unified onto one renderer). */
export const HAND_ROLLED_OK: Record<string, string> = {
  "shared/web/appearance-tab-preview.tsx":
    "The Appearance panel's live preview animates its fake title's `font-size` " +
    "in step with the heading-cap slider (`transition-[font-size] duration-200`), " +
    "so a reader sees the cap move rather than jump. None of the four named " +
    "shapes fits a resizing property tied to a live prop rather than a hover, a " +
    "row or a route: `motion-hover` transitions colour/border/fill/stroke only, " +
    "never `font-size`, and there is no fifth 'a value scrubbed live' class in " +
    "the kit's vocabulary to reach for instead. The preview's OWN ground colour " +
    "swap two lines above this one is not pinned here — it is a genuine fill " +
    "swap and now reads `motion-hover`.",
}

// ── tab-shape (rules.test.ts) ───────────────────────────────────────────────

/** "There can never be 2 rows of tabs … just never" — the client's ruling, no
 * exceptions clause. EMPTY ON PURPOSE: tickets-collection.tsx was the one
 * screen that ever stacked two `<TabsView>` strips, and it was redesigned to
 * one strip (the old All-tickets/Archived strip became the "Archived" filter
 * in COLLECTION_FILTERS) rather than given an inner strip to satisfy this list.
 * An entry here again means somebody has re-accepted the stacked-strip cost
 * with their eyes open — which, after this ruling, means asking the client
 * first. */
export const TWO_STRIPS_OK: Record<string, string> = {}

// ── R67 (sections-stand-on-paper) ───────────────────────────────────────────

/** R67 amendment 6 — the named family of overlay surfaces `isOverlay` treats as
 * "not content standing on the page", asked per ROOT a component can return
 * rather than of any tag its text merely mentions. Names rather than a bare
 * count, rot-checked both ways: a component that starts returning one of these
 * tags is a reviewed addition rather than a silent skip, and a name
 * `isOverlay` no longer agrees with is stale and must be deleted — the same
 * rot-check `UNCONTAINED_SECTION_OK` already uses. */
export const OVERLAY_FAMILY_OK: Record<string, string> = {
  Sheet: "the kit's own slide-in surface — the family's direct base case, R59's form shape.",
  AlertDialog: "the kit's own centred yes/no surface — the family's direct base case, R59's warning shape.",
  FormShellDialog:
    "shared/web/form-shell.tsx — the app's one form-dialog seam. Its only root is the kit's `Sheet`, " +
    "unconditionally (R59's own history: it moved ~35 forms off `Dialog` onto `Sheet` on 2026-08-31).",
  AddLinkDialog: "web-portal/components/add-link-dialog.tsx — a portal ticket's link-adding form; its only root is `FormShellDialog`.",
  GoogleScopeDialog: "web/components/knowledge/google-scope-dialog.tsx — the Google-scope picking form; its only root is `FormShellDialog`.",
  TimeFormDialog: "web/components/work/time-form-dialog.tsx — the work module's time-entry form; its only root is `FormShellDialog`.",
  // THE `ScreenConfirm` LINE STOOD HERE and went 14 Sep 2026, in the same
  // change that deleted `web/components/accounts/contacts-by-company.tsx`
  // (Part 3b of the pass that moved this whole table into the registry).
  // `isOverlay("ScreenConfirm")` was only ever reached, during a real census
  // run, through `isOverlay("ScreenRenderer")` resolving its own branches —
  // and `ContactsByCompany`'s `<section><h2>…</h2><ScreenRenderer .../></section>`
  // was the one titled section in the whole app with a RAW, unwrapped
  // `<ScreenRenderer>` as a body's root tag; every other call site
  // (module-content.tsx, apps-screen.tsx, …) wraps it in a container
  // component first, so `isOverlay` is asked of THAT wrapper's name instead
  // and never recurses into `ScreenRenderer`/`ScreenConfirm` at all. Deleting
  // the one file that asked the question removed the only path that reached
  // this name, and the rot-check caught it the moment the file went — the
  // same "an entry whose condition is no longer true fails the build" that
  // every other list in this registry is held to.
}

/** R75 — THE ONE ESCAPE HATCH FOR "THE OPTIONS A PERSON PICKS FROM ARE A→Z".
 * A control whose list is not a naming vocabulary at all — a scale, a
 * frequency, a step's place in a workflow somebody actually designed — reads
 * a name off the array it maps into a `<SelectItem>`/`options` prop, keyed
 * `path#name`. `web/test/alphabetical-options.test.ts` rot-checks both ways:
 * an entry naming a site that now opens with `sortedOptions(` has outlived
 * its subject and fails, the same discipline every other `_OK` table here is
 * held to — so the list can only shrink. */
export const ORDERED_OPTIONS_OK: Record<string, string> = {
  "web/components/process/step-form-dialog.tsx#PERIODS":
    "shared/workers/savings.ts's PERIODS is an ascending TIME SCALE (day, week, month, year) — the client's own named " +
    "example of what must not sort (\"a size scale Compact→Regular→Large\"), one unit along. Reading day→week→month→year " +
    "left to right is how a person checks the scale makes sense; A→Z would read day, month, week, year.",
  "web/components/process/step-form-dialog.tsx#armHeads":
    "a process step's SIBLINGS, in the order the `peers` prop hands them in (this file's own `armHeads` derivation " +
    "off it, step-form-dialog.tsx) — a workflow " +
    "sequence somebody is placing a new step relative to, not a naming vocabulary. Alphabetizing would separate a " +
    "step from its neighbours in the exact list meant to let a person reason about what comes before what.",
  "web/components/process/step-form-dialog.tsx#peers":
    "the same list as `armHeads` above, read for the other two questions this form asks (which step it can split from, " +
    "and which step a loop returns to) — same array, same reason: a step's map-order neighbours, not a name list.",
  "web/components/apps/app-form-dialog.tsx#stages":
    "useAppStages() reads the team's own `selectable_data` rows for the `appStage` group — a client lifecycle PIPELINE " +
    "(the same drag-ordered vocabulary R70/Choices already treats as protected order, not a plain word list) — and " +
    "falls back to the code's own APP_STAGES only when a team has set none. Either way the order is the stage " +
    "sequence: the client's ruling, 16 Sep 2026 (\"not started, audit, plan, build, validation, refinements and " +
    "enhancement, in that order\"), stored as `selectable_data.position` (team migration 0097) and mirrored in " +
    "`APP_STAGES`' own array order (shared/app-stages.ts). Feeds this file's own AppearancePillGroup stage row " +
    "(16 Sep 2026, the day's first pass; the pill row shape stayed through the same day's correction, which moved " +
    "the ICON to Sprint type and put App stage's status back on HOLD — `shared/app-stages.ts`'s own current header) " +
    "— same array, same reason.",
  "web/components/work/sprint-form-dialog.tsx#sprintTypes":
    "useSprintTypes() reads the team's own `selectable_data` rows for \"Sprint type\" — the same team-ordered " +
    "vocabulary class as app stages above, not a naming list a reader searches by word. The client's ruling, " +
    "16 Sep 2026 (\"not started, audit, plan, build, validation, refinements and enhancement, in that order\"), " +
    "first read onto App stage (migration 0097) and corrected the same day onto THIS vocabulary (migration 0098, " +
    "shared/sprint-types.ts) — stored as `selectable_data.position`. Feeds this file's own AppearancePillGroup " +
    "type row (icons, no colours, the same correction), not the RecordPicker it replaced.",
  "web/components/work/story-form-dialog.tsx#storyTypes":
    "stories-screen.tsx's own `storyTypes` reads the team's `selectable_data` rows for \"Story type\" — the same " +
    "team-ordered vocabulary class as app stages and sprint types, passed down as a prop.",
  "web/components/process/steps-panel.tsx#versions":
    "a process map's own REVISION HISTORY (\"Version 1\", \"Version 2\", …) — an ordered SEQUENCE by `versionNo`, " +
    "not a name a reader searches by word. Alphabetical would also break numerically (\"Version 10\" before \"Version 2\").",
}

/** R75'S OTHER ESCAPE HATCH — the `FilterFacet` sibling of `ORDERED_OPTIONS_OK`
 * above. `useFilterBar` (shared/web/screen-engine/filter-bar.tsx) alphabetizes
 * every facet's options by default (R75's "first half" seam); a facet may opt
 * out by setting `FilterFacet.ordered = true` (config.ts), and that flag is
 * read only alongside a reasoned line here, keyed `path#field` the same way
 * `ORDERED_OPTIONS_OK` keys `path#subject` — a boolean nobody has to justify in
 * writing is a silent exception, the exact shape R75 exists to close.
 *
 * A SEPARATE TABLE FROM `ORDERED_OPTIONS_OK`, not a shared one, because the
 * two escape hatches are found two different ways: a picker's is DERIVED off
 * disk (the `.map()` → `<SelectItem>`/`options=` census, `alphabetical-
 * options.test.ts`), so an entry with no matching site goes stale and fails
 * the build both ways; a facet's `ordered` flag is a RUNTIME read inside one
 * function, with no static census reaching it, so this table is reviewed by
 * eye rather than rot-checked — read the list, not this sentence, before
 * trusting an entry is still live. */
export const FACET_ORDER_OK: Record<string, string> = {
  "web/components/apps/apps-screen.tsx#stage":
    "the Stage facet reads `stageOptions`, built from `APP_STAGES` (shared/app-stages.ts) — the same client " +
    "lifecycle PIPELINE `app-form-dialog.tsx#stages` above is registered for, the client's ruling 16 Sep 2026 " +
    "(\"not started, audit, plan, build, validation, refinements and enhancement, in that order\"), stored as " +
    "`selectable_data.position` (team migration 0097). The Board's own columns (`boardColumns`) already draw this " +
    "vocabulary in order without touching `useFilterBar` at all (this file's own header explains why); the Stage " +
    "FILTER facet reaches the same array through the one seam every facet in the app shares, so it needs the flag " +
    "the Board never did.",
  "web/components/work/wave-finder.tsx#sprintType":
    "the Sprint type facet reads `sprintTypes` (`useSprintTypes`, sprint-form-dialog.tsx) — the team's own " +
    "`selectable_data.position`-ordered vocabulary (team migration 0098), the client's ruling 16 Sep 2026 " +
    "(\"not started, audit, plan, build, validation, refinements and enhancement, in that order\"), first read " +
    "onto App stage and corrected the same day onto Sprint type — the identical class `apps-screen.tsx#stage` " +
    "above is registered for, one vocabulary along.",
}

// ── R77 (tab-strips-pin) ────────────────────────────────────────────────────

/** R77 — a `<TabsView>` mount that is not a screen's own labelling strip, so
 * pinning it is either wrong (it would stack a second sticky band inside one
 * a screen-level strip already pinned) or meaningless (it navigates instead
 * of labelling a panel), keyed by the file's path relative to the repo root.
 * Rot-checked both ways, the same discipline every other `_EXEMPT` table in
 * this file is held to: a line naming a file the census does not reach
 * excuses nothing and fails, and a line naming a file that now goes through
 * `renderFolderTabs` or carries `STICKY_FOLDER_TABS`/`STICKY_TABS` itself has
 * outlived its subject and fails too — so the list can only shrink.
 *
 * FOUR ENTRIES, ONE REASON: each is a small, NESTED view switch (a
 * two-or-three-way filter or view toggle) inside a panel a screen-level strip
 * has already pinned, or a route switcher with no panel to stay above at all
 * — never a screen's own labelling strip. `work/work-panels.tsx`,
 * `process/steps-panel.tsx` and `process/draft-review.tsx` sit inside a panel
 * a screen-level strip already pinned, or that never scrolls independently at
 * all — pinning a second strip there would land two sticky bands in the same
 * small space, the "two pinned toolbars" failure R63 itself measured and
 * refused one level up the same tree. `shell/team-section-nav.tsx` NAVIGATES
 * rather than labelling a panel underneath it (its own header: "selecting one
 * navigates (no panel content)"), so there is no panel for a pin to stay
 * above.
 *
 * THE TWO NAMED, DATED GAPS THIS TABLE ONCE HELD ARE BOTH CLOSED.
 * `screens/kwapso-screen.tsx` and `screens/module-settings-screen.tsx` both
 * drew the identical bare `<TabsView renderPanel={…}>` shape
 * `settings-screen.tsx` shipped with before this law — a design-scale census
 * written 2026-09-03 already named both in prose ("the kit's own gap to
 * own"). Both were split through `renderFolderTabs` the same way, one day
 * apart (`kwapso-screen.tsx` 2026-09-15, `module-settings-screen.tsx` by the
 * Choices lane the same day), and both lines came out — the client's
 * "everywhere else" read literally: a gap named honestly in a registry is
 * still a gap, and the table's whole job is to keep shrinking rather than to
 * make a comfortable place for one to sit. */
export const TAB_STRIP_PIN_EXEMPT: Record<string, string> = {
  "web/components/work/work-panels.tsx":
    "TodosPanel's own Open/Done pile filter — a two-way NESTED view switch inside a panel a screen-level strip " +
    "(a record detail's STICKY_TABS, or a sheet that never scrolls on its own) has already pinned, never a " +
    "screen's own labelling strip. Pinning it too would stack a second sticky band a few rows under the first.",
  "web/components/process/steps-panel.tsx":
    "the Steps panel's own List/Flow/Compare VIEW SWITCH, nested inside a process record's already-pinned strip " +
    "(its own comment: \"nested rather than beside it\") — the same class of NOT-a-screen's-own-strip as work-panels.tsx above.",
  "web/components/process/draft-review.tsx":
    "an import draft review's own Open/Done pile switch, inside a sheet that does not scroll independently — " +
    "the same class of nested view switch as work-panels.tsx and steps-panel.tsx above, never a screen's own strip.",
  "web/components/shell/team-section-nav.tsx":
    "the team area's own section switcher — its own header says it outright, \"selecting one navigates (no panel " +
    "content)\". A strip that NAVIGATES rather than labelling a panel underneath it has no panel for a pin to stay above.",
}

// ── R79 (staff-pill-row) ────────────────────────────────────────────────────

/** R79 — a `<Select>`/non-row `<RecordPicker>` mount the census still finds
 * fed a staff/member list, keyed by the file's path relative to the repo
 * root. Rot-checked both ways: a line naming a file the census does not
 * reach excuses nothing and fails, and a line naming a mount that has since
 * been converted to `StaffPillPicker` (or moved to `layout="row"`) has
 * outlived its subject and fails too — so the list can only shrink.
 *
 * EMPTY ON THE DAY THIS LAW SHIPPED (15 Sep 2026): every dropdown the
 * inventory found — task/story assignee, the account manager field, an
 * app's staff checklist and lead, a ticket's `HelpStakeholders` add
 * control, `TriageStrip`'s on-duty pick — was converted rather than
 * excused. If this table ever gains a line, it is a real, reasoned
 * exception, never a placeholder for "do this later". */
export const STAFF_PILL_ROW_EXEMPT: Record<string, string> = {}

// ── R82 (table-column-budget) ───────────────────────────────────────────────

/** R82 — a literal `TableColumn[]`-shaped array (every element carries both
 * `key` and `label`) with more than six entries, keyed
 * `${file path relative to repo root}#${enclosing function name}`. Rot-checked
 * both ways: a line naming a function the census does not find, or one whose
 * array has since shrunk to six or fewer, has outlived its subject and fails
 * too — so the list can only shrink.
 *
 * EMPTY ON THE DAY THIS LAW SHIPPED (16 Sep 2026): the one table this census
 * found over the ceiling — Waves' own `waveListColumns` — was fixed rather
 * than excused (the App fact moved onto the Account cell's own second line).
 * If this table ever gains a line, it is a real, reasoned exception, never a
 * placeholder for "do this later". */
export const TABLE_COLUMN_BUDGET_EXEMPT: Record<string, string> = {}

// ── R83 (toolbar-lead-gap) ──────────────────────────────────────────────────

/** R83 — a `renderFolderTabs(` call whose immediate JSX parent still carries
 * a `gap-*`/`space-y-*` utility, keyed by the file's path relative to the
 * repo root. Rot-checked both ways: a line naming a file the census no longer
 * finds double-spending the gap has outlived its subject and fails too — so
 * the list can only shrink.
 *
 * EMPTY ON THE DAY THIS LAW SHIPPED (16 Sep 2026): the one call site this
 * census found paying the strip's own gap twice — `waves-screen.tsx` — was
 * fixed rather than excused (the strip and its card moved into their own
 * gapless inner column, matching every other call site). If this table ever
 * gains a line, it is a real, reasoned exception, never a placeholder for
 * "do this later". */
export const TOOLBAR_LEAD_GAP_EXEMPT: Record<string, string> = {}

// ── R84 (mango-in-title-only) ───────────────────────────────────────────────

/** R84 — a `<Button>` whose `variant` is the mango one (`"default"`, stated or
 * OMITTED) and that is NOT nested under `CollectionHeading`, `RecordScreen`,
 * `RecordDetail` or `RecordChrome`, keyed
 * `${file path relative to repo root}#${enclosing function name}`. Rot-checked
 * both ways: a line naming a function the census does not find, or one whose
 * button has since moved inside a title component or lost its mango variant,
 * has outlived its subject and fails too — so the list can only shrink.
 *
 * TWO LINES HELD HERE ON THE DAY THIS LAW SHIPPED (16 Sep 2026), both the
 * assistant strip — `AgentPanel`'s "Go ahead" (`agent_confirm`'s own action
 * row) and `AskTheAssistant`'s "Ask" — were left mango on purpose because the
 * lane that shipped R84 does not own `web/components/assistant/`. The
 * documentation-and-sweep lane that DOES own those two files switched both to
 * `variant="inverse"` the same day and cleared this table: every mango button
 * the census found outside a title component is now fixed, none excused.
 *
 * ONE LINE HELD HERE SINCE (18 Sep 2026), the client's own ruling on the new
 * tab page: "on new page where to, make the button mango." `new-tab-screen.tsx`
 * has no `CollectionHeading`/`RecordScreen` at all — its `Headline` ("Where
 * to?") is bare text, not one of the four title components this law reads —
 * so there is no title slot to move the button INTO; the search row beside
 * the headline is, on this screen, the only act the page offers at all, which
 * is the same "one primary act, title-adjacent" shape the law protects
 * everywhere else. Named here rather than silently reclassifying the search
 * row as a fifth title component, which would widen `TITLE_TAGS` for every
 * OTHER screen too. */
export const MANGO_OUTSIDE_TITLE_OK: Record<string, string> = {
  "web/components/shell/new-tab-screen.tsx#NewTabScreen":
    "Client ruling, 18 Sep 2026, verbatim: \"on new page where to, make the button mango.\" The page has no CollectionHeading/RecordScreen/RecordDetail/RecordChrome to host it — the search bar's own Go button is the page's one and only act.",
}

// ── R85 (rail-labels-one-word) ──────────────────────────────────────────────

/** R85 — the rail's own GROUP headings (`NAV_GROUP_LABELS` in
 * `web/lib/pages.ts`), keyed by their `NavGroup` id, named here rather than
 * measured against the one-word count. A group heading titles a SECTION, not
 * a place a click lands, and the client's ruling was about DESTINATIONS —
 * her own example ("Knowledge Base") and her one open question ("an
 * alternative for work logs") both named a destination, never a heading — so
 * whether the rule reaches "My work" too is genuinely undecided at first,
 * rather than a breach quietly let through — and then she answered it, the
 * same day: *"No, the rail group heading can have two words."* (17 Sep
 * 2026). All three groups sit here, not only "My work" (the one that would
 * actually fail the count): the reason is "why a group is untouched", not
 * "which ones need excusing", so the table stays honest even for "Build" and
 * "Accounts", which already read as one word. Rot-checked against
 * `NAV_GROUP_ORDER`: a key naming a group that no longer exists has
 * outlived its subject and fails too. */
export const RAIL_LABEL_WORDS_OK: Record<string, string> = {
  "my-work": "the client's ruling, 17 Sep 2026, verbatim: \"No, the rail group heading can have two words.\"",
  build: "the client's ruling, 17 Sep 2026, verbatim: \"No, the rail group heading can have two words.\"",
  accounts: "the client's ruling, 17 Sep 2026, verbatim: \"No, the rail group heading can have two words.\"",
}

// ── R86 (status-owns-the-chip) ──────────────────────────────────────────────

/** R86 — a `<Badge variant="status" dot={…}>` / `<Swatch colour={…}>` the
 * census resolved to something naming neither status, stage nor waiting,
 * keyed `${file path relative to repo root}#${enclosing function name}`.
 * Rot-checked both ways: a line naming a function the census does not find,
 * or one whose chip has since gone (an icon, plain text, or a real status
 * seam), has outlived its subject and fails too — so the list can only
 * shrink.
 *
 * ONE ENTRY ON THE DAY THIS LAW SHIPPED (17 Sep 2026): the task PRIORITY dot,
 * `PriorityChip` (`web/components/work/tasks-screen.tsx`) — `PRIORITY_DOT_
 * TONE[level]` names PRIORITY, not status, and it is coloured on purpose:
 * K19a ("Priority has its own four colours, never App Stage's") already
 * ruled it, the one categorical field besides status this app colours by
 * design. Every ticket-type colour the same sweep found — the list row, the
 * board card, `TicketChips`, both type pickers and the portal's own row —
 * was converted to `ticketTypeIconName` rather than excused. */
export const COLOURED_CHIP_OK: Record<string, string> = {
  "web/components/work/tasks-screen.tsx#PriorityChip":
    "the task priority dot, `PRIORITY_DOT_TONE[level]` — priority, not status, and already ruled a colour on tasks " +
    "(K19a, \"Priority has its own four colours, never App Stage's\"), the one categorical field besides status " +
    "this app colours on purpose.",
  "web/components/deep-link/shape.tsx#shapeAccountsList":
    "an account's own live/archived state IS its status — the glossary's own words, \"an account has none [no " +
    "status]: it is live, or it is archived\" — rewired 17 Sep 2026 (\"account active green dot\") off a filled " +
    "success/secondary pill onto `variant=\"status\" dot={a.active ? \"shipped\" : \"archived\"}`. The census's " +
    "own ALLOWED regex reads for the words status/stage/waiting in the resolved expression text and `a.active` " +
    "spells none of them, even though the field it reads is exactly R86's subject.",
  "web/components/deep-link/shape.tsx#shapeContactsTable":
    "the identical status dot one function up (shapeAccountsList, same file), for a contact's own live/archived " +
    "state — added 17 Sep 2026 (\"contact live green\"). Same reason: `a.active` is the record's STATUS and the " +
    "census's word-in-the-expression regex has no way to read that from the variable's own name.",
}

/* ════════════════════════════════════════════════════════════════════════
   EVERY CHIP/PILL IS THE KIT'S Badge — client ruling, 18 Sep 2026, verbatim:
   "on ticket list views, its missing the space between icon and name and
   the backgorund card. always, make it a rule, for everythng wether its a
   dot or an icno, for all chips / pills." `web/test/chips-are-badges.test.ts`
   censuses two shapes: an ad-hoc `<span>`/`<div>` pill that never reaches
   for Badge at all, and a real `<Badge>` whose icon rides a plain JSX child
   instead of its own `icon` prop (badge.tsx's own header names this second
   shape as the bug the ruling was written about). Every call site the 18 Sep
   sweep found — the ticket TYPE cell (`tickets-collection.tsx`,
   `work-panels.tsx`, `triage-queue.tsx`), `shared/web/ticket-chips.tsx`'s
   own type chip, the story type chip (`stories-screen.tsx`'s `storyType
   Chip`), the sprint type chip (`sprint-detail.tsx`, `wave-detail.tsx`) and
   the deliverable "Client can see this" chip (`deliverables-panel.tsx`) —
   was converted rather than excused, so this list opens EMPTY. A reasoned
   entry here is for a NON-CHIP the census cannot tell apart from a chip by
   shape alone (a selection control, a toolbar pill), never for a chip that
   is merely inconvenient to convert — the same posture COLOURED_CHIP_OK,
   directly above, already takes for its own law. */
export const CHIP_BADGE_EXEMPT: Record<string, string> = {}

/* ════════════════════════════════════════════════════════════════════════
   A FOOTER IS AT THE BOTTOM — client ruling, 18 Sep 2026, verbatim, twice
   the same session, the second time naming it a law outright: "ticket page:
   the footer is not on the footer position!! fix that!" and, reviewing the
   same page again an hour and a half later, "but the footer is in the worng
   position, above al cointent! dhoudl be at the bottom (this is a law for
   footer)." See UI-RULEBOOK.md D21 for the full account.
   `web/test/footer-is-last.test.ts` censuses every `<CardFooter>` and every
   `<ReplyComposer>` (the one component this app calls a "composer" today)
   against its nearest enclosing card-shaped JSX element, and fails the
   moment either one is not that element's own last rendered child. Every
   call site the census can see today — `TicketConversationPanel`
   (`web/components/tickets/ticket-detail-body.tsx`) — was already fixed the
   day this law was written, so this list opens EMPTY. A reasoned entry here
   is for a footer that genuinely is not a screen's own bottom-most element
   (a card nested inside a larger scrolling region, say), never for one that
   is merely inconvenient to move. */
export const FOOTER_IS_LAST_EXEMPT: Record<string, string> = {}
