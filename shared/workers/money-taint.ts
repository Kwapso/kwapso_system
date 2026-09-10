// A WITHHELD NUMBER CANNOT LEAVE THE ROOM IT WAS READ IN — R24, WHAT IS LEFT OF IT.
//
// ── WHAT THIS LAW USED TO BE, AND WHY HALF OF IT WENT ────────────────────────
//
// R24 had two halves. The INBOUND half was a fact about the import graph: what
// our own hour cost (`internal_rates`) and the margin computed from it lived in
// one file, nothing a client login could reach imported it, and the build went
// red if anything ever did. It was structural on purpose — "a condition can be
// inverted and a permission can be granted, an import cannot be forgotten".
//
// The client retired that feature whole on 10 Sep 2026: "kill the whole internal
// rates thing. will develop this in the future much much more but for now i
// iwanna wipe it clean". The tables, the doors, the six tools and the file all
// went, and the inbound half went with them, because after the removal there is
// no structurally-fenced number left in this base to be about. Every money
// figure that still reaches a client reaches them because a CONDITION let it
// through, and a law whose whole doctrine is "not conditional" cannot be
// re-pointed at one. RULES.md's R24 row records that retirement.
//
// ── AND THE SENTENCE ABOVE WAS CORRECTED AN HOUR LATER ───────────────────────
//
// It first enumerated what survives: "the account rate card, a sprint's sold
// price, the savings priced off the client's own role rates". The client then
// retired the ACCOUNT RATE CARD too — "the whole account rates also killed it" —
// so the first item on that list stopped existing, `lib/rates.ts` went the way
// `internal-money.ts` had, and team migration 0074 drops `account_rates`.
//
// The DOCTRINE was unaffected, which is exactly why the enumeration had to be
// fixed rather than left: a law's stated reason that has quietly stopped being
// true is the failure this file is otherwise written against. What the
// conditions are, said once and precisely, so the next reader can check them:
//
//   · A SPRINT'S SOLD PRICE reaches a client through `GET /api/tenancy/impact`
//     as `prices.soldCents`, behind `accounts.commercials_visible`. Since the
//     rate card went, THIS IS THE ONLY FIGURE THAT SWITCH GOVERNS.
//   · A STEP'S ROLE RATE (`process_steps.role_cents_per_hour`, what the CLIENT'S
//     own person costs THEM) reaches a client on the same door, withheld on the
//     ROW from a portal caller who is not that app's main stakeholder.
//   · AN APP'S RUNNING COST (`apps.tool_cost_cents_per_month`, what it costs US)
//     is nulled on the row for any portal scope, and for a staff caller without
//     the right. That is the closest thing left to a structural fence and it is
//     still a predicate on a row, not a fact about the import graph.
//
// ── AND WHY THIS HALF DID NOT GO ─────────────────────────────────────────────
//
// The OUTBOUND half never depended on the import graph, and it still has a real
// subject: `GET /api/tenancy/app-money`.
//
// That door hands back what one app gives back a month — the hours, and those
// hours priced by the client's own role rates frozen onto each step of the map.
// It is the SAME subtraction the client's own value door makes, handed over
// UNREDACTED: `GET /api/tenancy/impact` nulls the prices on any app whose
// account has price visibility switched off, and this door does not. So a figure
// that reaches this door is a figure a particular client may be forbidden to
// see, and the switch that forbids it is per account.
//
// THE CHAIN IS UNCHANGED, only the number in it. A client login raises a ticket
// through the portal (`POST /api/content/help` is on the portal's own allow-list
// and the seeded Client role holds `help:create`) with up to 20,000 characters
// of their own prose. That prose is read by the model the next time anybody here
// asks the assistant a question that touches tickets. So the attacker writes the
// plan and we deliver it: read what the app gives back, then reply with the
// figure. `reply_help_ticket` is a write gated on `help:read`, the lowest bar in
// the catalogue, and its confirm predicate fires only when the reply @mentions
// somebody — so a reply with no mentions opens no panel at all, and
// `notifyReplyAndMentions` emails the raiser a preview of the body.
//
// The only thing that would otherwise stand there is a sentence in a tool
// description. R24's own text already said why that is not enough, and the
// sentence survives its own law: a prose instruction to a language model is the
// least structural defence available, and it is being asked to hold against
// prose written by the person it is protecting the number from.
//
// SO: IF A CONVERSATION HAS READ A WITHHELD FIGURE, IT MAY NOT THEN WRITE TO A
// DOOR THE CLIENT'S OWN BROWSER OPENS. Per turn, refused at the step, before the
// door is called. Not a confirm panel — the owner considered and rejected making
// staff click through one on ordinary work — and not a scan of the outgoing text
// either, because "does this paragraph contain a price" is a judgement and this
// has to be a fact.
//
// ── THE DOOR LIST NARROWED; IT DID NOT MOVE ──────────────────────────────────
//
// This list held six paths and now holds one. Every one of the five that left
// was a door that stopped existing, and NOTHING WAS ADDED. That matters more
// than it looks: the two obvious candidates for widening it were both refused,
// each by this file's own reasoning read back at it.
//
//   • THE ACCOUNT RATE CARD (`/api/tenancy/rates`) was the same shape of
//     argument and was REFUSED, hours before the client retired it: the card door
//     handed over the audit block, the retired lines and the whole card, where
//     the value door projected only the live ones behind the switch. It was left
//     off because a staff member reading a client's rate card and then replying
//     to that client's own ticket is ORDINARY WORK, and this file already says
//     what happens to a control that fires on ordinary work: people route around
//     it. The card is gone now, so the reasoning is kept for its SHAPE rather
//     than its subject — the next candidate for this list will look exactly like
//     it did.
//   • WIDENING TO "ANY WRITE WHOSE ROW A CLIENT LATER READS" is still
//     `PORTAL_VISIBLE_READS`' territory and still a bigger law than this one.
//
// ── WHAT IS DERIVED, AND THE ONE THING THAT IS NOT ANY MORE ──────────────────
//
//   THE DOORS were derived from a FILE — the tenancy routes whose handlers
//   called an export of `internal-money.ts`. That file is gone, and
//   `appMoneyBack` moved to `lib/processes.ts`, which has forty exports and is
//   mostly not money. So the oracle narrowed from a file to a NAMED SET OF
//   FUNCTIONS, `MONEY_READERS` below. Say it plainly: that is weaker. A function
//   added to this list is a decision somebody makes, where an import was a fact
//   somebody could not forget. What is still derived — and still rot-checked on
//   every build by `money-taint-outbound` in web/test/rules.test.ts — is the
//   DOORS: the walk reads tenancy's own ROUTES table and every handler's own
//   source, and the pin below must equal what it finds exactly.
//
//   THE CLIENT-READABLE DOORS are still the non-GET entries of `PORTAL_DOORS` in
//   workers/portal-gateway/src/index.ts. The allow-list is the definition of what
//   a client's browser may call, so it is the oracle rather than anything
//   invented here.
//
//   THE TOOLS are still derived from the doors AT RUNTIME, off the catalogue
//   itself. A second tool on `/api/tenancy/app-money` taints a conversation from
//   the moment it is written, with nothing edited here.
//
// WHY THE DOOR PINS ARE COPIES AT ALL. The worker cannot read the tenancy lib or
// the portal gateway at runtime — they are other workers' private source, in
// other bundles. So the runtime carries the answer and the build proves it,
// which is the shape `PALETTE_LITERAL_OK` and `STORED_FILES` already use here:
// data, rot-checked against its own oracle, in both directions.
//
// ── WHAT THIS DELIBERATELY DOES NOT COVER ────────────────────────────────────
//
// Named here because a defence whose edges are not written down gets mistaken
// for a wall:
//
//   • ACROSS TURNS. The taint is per-turn, which is the owner's decision and the
//     right one: a thread-wide taint would refuse a ticket reply for the rest of
//     a conversation's life because somebody asked about an app's value once, and
//     a control that fires on ordinary work is a control people route around.
//     Tool RESULTS are not replayed across turns (`replayable` in agent.ts keeps
//     user + assistant text only), so the figure does not survive on its own —
//     but a model that said the number out loud in its own prose leaves that
//     prose in the history. Read the honest sentence as: this closes the
//     one-turn chain, which is the shape an injected instruction has to take.
//   • A WRITE ON AN AGENCY-ONLY DOOR WHOSE ROW A CLIENT LATER READS. The oracle
//     is the doors a client's browser opens, not a data-flow analysis of every
//     table a portal GET can reach.
//     THE TWO THAT MATTER TODAY BOTH STOP AT A PANEL, WHICH IS WHY THIS IS AN
//     EDGE AND NOT A SECOND HOLE — checked, not assumed, on 5 Sep 2026:
//     `resolve_help_ticket` is `confirm: true` outright (it emails the client an
//     answer in the agency's name, and its own comment says there is no
//     un-sending it), and a deliverable is written unconfirmed but reaches
//     nobody until `set_deliverable_visibility` is called with `visible: true`,
//     which confirms on exactly that input. So a person reads the words before
//     the client can. If either of those confirms is ever relaxed, this edge
//     becomes a hole and the oracle has to widen.
//   • WHETHER THE MODEL WOULD HAVE COMPLIED AT ALL. Unproven, and deliberately:
//     nobody has spent an API call to find out. The structural gap was
//     confirmed by reading; the exploitability was not.
//
// ── THE MACHINE SURFACE IS COVERED, BUT NOT BY THIS ──────────────────────────
//
// It was not covered at all when this file was written, and the omission was
// invisible precisely because this section did not mention it: `refusesOutbound
// Money` had two call sites, both in workers/data-ops, and ZERO in workers/mcp —
// while the money read and `reply_help_ticket` were both on the machine surface
// and the injected-ticket chain ran end to end there with nothing in the way.
//
// THE AGENT'S FIX COULD NOT BE PORTED, and that is the part worth keeping. An
// MCP `tools/call` is one HTTP request carrying a bearer token: no turn, no
// conversation, no prior tool list. `moneyIsInContext` over a single call is
// ALWAYS false, so this predicate copied onto that surface would have been a
// check that passed with the hole fully open — a green build over the exact bug
// it was added for.
//
// So MCP refuses a money DOOR outright, at its one forward choke point
// (`forwardTool`, workers/mcp/src/lib/tools.ts), asked of the door the call will
// actually open rather than of the tool's name. Same predicate — `readsInternal
// Money`, from this file — different sentence: not "not in this turn" but "not
// on this surface at all". The precedent is that surface's own twenty-one Google
// tools (MCP.md §3): a leaked personal access token's blast radius must not
// include a mailbox, and it must not include a price a client's own screen
// withholds either. The way through is `agent_chat`, which lands back on the
// agent, where there is a turn and this file applies.
//
// A CONSEQUENCE WORTH SAYING OUT LOUD: the two surfaces now defend the same
// sentence with two different mechanisms, so a THIRD machine surface would
// inherit neither by default. Whoever builds one reads this paragraph and picks
// the shape that fits what that surface can actually see.

import { SHARED_TOOLS } from "./tool-catalog"

/** THE FUNCTIONS THAT HAND BACK A FIGURE A CLIENT'S OWN SCREEN MAY WITHHOLD.
 *
 * The oracle the doors below are derived FROM, and the one thing in this file
 * that is a decision rather than a fact — see the header. `appMoneyBack`
 * (workers/tenancy/src/lib/processes.ts) rolls up `listSavings` and hands over
 * every price on it; the client's own value door nulls the prices on any app
 * whose account has price visibility switched off. Same arithmetic, one of them
 * unredacted.
 *
 * A NAME ADDED HERE MUST BE A READER OF A WITHHELD FIGURE, not merely of money.
 * The account rate card was money and was deliberately NOT here; the header says
 * why at length, and keeps saying it now that the card itself is gone, because
 * the argument is about the SHAPE of a candidate rather than about that one. */
export const MONEY_READERS: readonly string[] = ["appMoneyBack"]

/** THE DOORS THAT HAND BACK ONE OF THOSE FIGURES.
 *
 * Every tenancy route whose handler calls one of `MONEY_READERS`. Paths only: a
 * WRITE here would be on the list too, because a caller setting one of these is
 * a caller who already has the number.
 *
 * DERIVED, NOT DECIDED. Re-derived off disk on every build from tenancy's own
 * ROUTES table and each handler's own source, and this pin must equal it
 * exactly. It held six paths until 10 Sep 2026; five of them were doors that
 * stopped existing when the client retired the internal rates, and nothing was
 * added in their place. The four `/api/tenancy/rates*` doors that went with the
 * account rate card an hour later were never on this list — see the header for
 * why they were refused before they were retired. */
export const INTERNAL_MONEY_DOORS: readonly string[] = ["/api/tenancy/app-money"]

/** THE DOORS A CLIENT'S OWN BROWSER OPENS AND WRITES THROUGH.
 *
 * The non-GET half of the client portal's `PORTAL_DOORS` allow-list, verbatim.
 * A row written through one of these is a row on the client's side of the wire
 * by definition — the portal is the thing that opens it.
 *
 * The auth doors carry no agent tool today and are on the list anyway: this is a
 * MIRROR of the allow-list, and an editorial subtraction is the thing that stops
 * being true later. DERIVED and rot-checked, like the list above. */
export const CLIENT_READABLE_WRITE_DOORS: readonly string[] = [
  "POST /api/auth/email/start",
  "POST /api/auth/email/verify",
  "POST /api/auth/profile",
  "POST /api/auth/language",
  "POST /api/auth/logout",
  "POST /api/tenancy/portal/switch-account",
  "POST /api/content/help",
  "POST /api/content/help/reply",
  "POST /api/content/help/update",
  "POST /api/content/help/rank",
  "POST /api/content/help/attachments",
  "POST /api/content/help/attachments/remove",
  // `POST /api/content/help/validate` was here — the client's own "yes, go
  // ahead". It left the portal's allow-list on 7 Sep 2026 with the
  // `awaiting_validation` stage it moved tickets out of (shared/types.ts,
  // `HELP_STATUSES`), and this mirror follows it rather than leading it: the
  // allow-list is the oracle, and R24-outbound's rot-check is what made the
  // drift visible the moment the door went.
  // HOW WE DID, from the person we did it for (team migration 0067). On the list
  // because the mirror is the whole point and an editorial subtraction is the
  // thing that stops being true later — though this one is the least likely door
  // in the base to carry an agency figure out: it writes a number between one
  // and three and, optionally, words a CLIENT typed.
  "POST /api/content/help/rating",
  "POST /api/content/todos/complete",
  "POST /api/tenancy/processes/comments",
]

/** The wiring of one door, as much of it as either question needs. Structural on
 * purpose: the agent's `AgentTool` and the catalogue's `SharedTool` are two
 * projections of the same endpoint, and both satisfy this without either
 * importing the other. */
export type DoorFacts = { method: string; path: string; write: boolean }

/** Does this door hand back a figure the client's own screen may withhold? */
export function readsInternalMoney(door: Pick<DoorFacts, "path">): boolean {
  return INTERNAL_MONEY_DOORS.includes(door.path)
}

/** Does this door write where a client can read it? A read is never outbound —
 * it puts nothing anywhere — so `write` is half the question. */
export function writesWhereClientsRead(door: DoorFacts): boolean {
  return door.write && CLIENT_READABLE_WRITE_DOORS.includes(`${door.method} ${door.path}`)
}

/** THE MONEY TOOLS, DERIVED FROM THE DOORS AT LOAD TIME.
 *
 * This is the half that cannot rot: the names are read off the shipped catalogue
 * rather than typed, so a second tool on `/api/tenancy/app-money` taints a
 * conversation from the moment it is written. Only a brand-new money DOOR needs
 * a line above, and the build asks for it. */
export const INTERNAL_MONEY_TOOLS: ReadonlySet<string> = new Set(
  SHARED_TOOLS.filter((t) => readsInternalMoney(t)).map((t) => t.name)
)

/** HAS A WITHHELD FIGURE ENTERED THIS CONVERSATION? The argument is the tool
 * names the turn has already run — which is what the model has in front of it,
 * read off the same messages the model is reading.
 *
 * A REFUSED money read taints too, and that is deliberate rather than sloppy:
 * the caller asked for the figure, and a control that has to work out whether
 * the door actually answered is a control with a branch in it. Fail safe; the
 * cost is one extra refusal in a turn that was already going wrong. */
export function moneyIsInContext(toolNames: readonly (string | null | undefined)[]): boolean {
  return toolNames.some((n) => !!n && INTERNAL_MONEY_TOOLS.has(n))
}

/** THE WHOLE DECISION, IN ONE PLACE, PURE — so the law can RUN it rather than
 * read it. True means: this call would put an internal number on a surface the
 * client reads, and must be refused before the door is opened. */
export function refusesOutboundMoney(
  door: DoorFacts,
  toolNamesSoFar: readonly (string | null | undefined)[]
): boolean {
  return writesWhereClientsRead(door) && moneyIsInContext(toolNamesSoFar)
}
