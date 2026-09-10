// THE CATALOGUE IS A BILL, NOT A MENU.
//
// 191 tool definitions are ~109 KB of the ~130 KB preamble re-sent on every model
// turn, so each tool costs about $5 a month at the owner's stated volume before
// it is ever called (prompt-cache.test.ts derives it). Describing
// `remove_member` to a Viewer is money spent on a door that will refuse them.
//
// `toolSpecs(held)` drops what a role could never call. It changes no permission
// — every tool still runs through the real gated door AS the user, and the door
// is still the authority — so the only thing that can go wrong here is the
// assistant losing an ability it should have had. These lock the two directions
// that would cause it, both of which fail OPEN.

import { describe, expect, it } from "vitest"

import { QUERY_MODULES } from "@shared/workers/query-grammar"
import { SHARED_TOOLS } from "@shared/workers/tool-catalog"
import { TOOL_GATES } from "@shared/workers/tool-gates"
import { REPLACED_BY_QUERY, toolSpecs } from "../src/lib/tools"
// The same census R19/R22/R27 stand on (workers/mcp/test/door-census.ts),
// reused rather than re-scanned — a second scan of the same source is exactly
// the drift this repo's own header warns about.
import { DOORS, doorParams, fnBody, moduleLibSources, routesSource, type Door } from "../../mcp/test/door-census"

const names = (held?: ReadonlySet<string>) => new Set(toolSpecs(held).map((t) => t.name))

describe("the tools the GRAMMAR replaced are gone from this surface, and only those", () => {
  // `query_records` asks any module a question, so a tool whose whole job was
  // "give me this collection, narrowed by these three words" became a second way
  // of saying something the grammar says better — and a second way is not free
  // where every definition is re-sent on every model step.
  //
  // The bar for a line in REPLACED_BY_QUERY is that the grammar is a STRICT
  // SUPERSET of that door's own narrowing. These hold the two halves of it: the
  // name must still be a real shared read, and the module must still be one the
  // grammar can actually be asked about — so a line cannot outlive the
  // capability that replaced it, which is how a diet turns into a gap.
  it("every replaced tool is still a real shared READ", () => {
    for (const name of Object.keys(REPLACED_BY_QUERY)) {
      const shared = SHARED_TOOLS.find((t) => t.name === name)
      expect(shared, `${name} is listed as replaced but is no longer a shared tool — delete the line`).toBeDefined()
      expect(shared!.method, `${name} is a write; the grammar replaces reads only`).toBe("GET")
    }
  })

  it("every reason names a module the grammar can be asked about", () => {
    for (const [name, why] of Object.entries(REPLACED_BY_QUERY)) {
      expect(why.length, `${name} needs a reason someone can disagree with`).toBeGreaterThan(40)
      const named = Object.keys(QUERY_MODULES).filter((m) => why.includes(`\`${m}\``))
      expect(
        named.length,
        `${name}'s reason must name the query module that replaced it, in backticks — it says: ${why}`
      ).toBe(1)
    }
  })

  it("…and none of them is still offered to the model", () => {
    const offered = new Set(toolSpecs().map((t) => t.name))
    for (const name of Object.keys(REPLACED_BY_QUERY))
      expect(offered.has(name), `${name} is listed as replaced but is still in the catalogue`).toBe(false)
    // The replacement itself must be there, or the diet is just a loss.
    expect(offered.has("query_records")).toBe(true)
    expect(offered.has("describe_module")).toBe(true)
  })
})

/** THE STRICT-SUPERSET BAR, CHECKED — the sentence at the top of
 * `REPLACED_BY_QUERY` in tools.ts states it and nothing before this enforced
 * it: "every parameter it parses maps to a declared field". The tests above
 * prove the module NAME is real and the tool is gone; neither ever asked
 * whether the grammar can actually SAY what the door's own `q` search says.
 *
 * `q` is the case that matters, because it is the one filter these doors
 * spread across SEVERAL columns rather than one. Deleting the `guests` field
 * this fold was built to add left every other check in this file green — the
 * name is still real, the module is still named, the tool is still gone — so
 * the gap it closes was provable only by reading the door's OWN source for
 * which columns its `q` really touches. That is what this does, the same way
 * R19 derives a tool's obligations: off disk, never hand-listed.
 *
 * TWO HOPS, not one. A door's handler does not build its own WHERE clause —
 * `getMeetings` calls `listMeetings`, and `listMeetings` calls `whereFor`,
 * which is where the LIKE clause actually lives (`getAccounts` →
 * `listAccounts` → `accountsWhere`, `getApps` → `listApps` → `appsWhere`, the
 * same shape three times). One hop would read the door's own handler and find
 * nothing; this follows calls into the module's lib source until the trail
 * goes cold. */
function reachableLibBodies(door: Door): string {
  const libSrcs = moduleLibSources(door)
  const calledNames = (src: string) => [...new Set([...src.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g)].map((m) => m[1]))]
  const bodies: string[] = []
  const seen = new Set<string>()
  let frontier = calledNames(fnBody(routesSource(door), door.handler))
  // Bounded rather than fully recursive: the real call chains here are two
  // hops deep, and a bound stops a false match (a name that happens to
  // collide with an unrelated function elsewhere) from wandering forever.
  for (let hop = 0; hop < 4 && frontier.length; hop++) {
    const next: string[] = []
    for (const name of frontier) {
      if (seen.has(name)) continue
      seen.add(name)
      const src = libSrcs.find((s) => fnBody(s, name))
      if (!src) continue
      const body = fnBody(src, name)
      bodies.push(body)
      next.push(...calledNames(body))
    }
    frontier = next
  }
  return bodies.join("\n")
}

/** Every column a LIKE clause compares — `LOWER(m.title) LIKE ?`, `p.name LIKE
 * ?`, bare `name LIKE ?` all included, because the three folded doors that
 * take `q` spell it three different ways (meetings lower-folds and aliases,
 * processes aliases without folding, accounts does neither). */
function likeColumns(src: string): string[] {
  return [
    ...new Set(
      [...src.matchAll(/(?:LOWER\()?(?:[a-zA-Z_]\w*\.)?([a-zA-Z_]\w*)\)?\s*LIKE\s*\?/g)].map((m) => m[1])
    ),
  ]
}

describe("the strict-superset bar: a folded door's own `q` search, read off its source", () => {
  const withQ = Object.entries(REPLACED_BY_QUERY).flatMap(([toolName, why]) => {
    const shared = SHARED_TOOLS.find((t) => t.name === toolName)
    const door = shared && DOORS.find((d) => d.method === shared.method && d.path === shared.path)
    if (!door || !doorParams(door).includes("q")) return []
    const modName = Object.keys(QUERY_MODULES).find((m) => why.includes(`\`${m}\``))
    return modName ? [{ toolName, door, modName }] : []
  })

  it("finds the doors this half of the law actually governs (must not go blind)", () => {
    // Pinned so a future refactor that renames a handler silently drops a door
    // out of the census is a failing count, not a check that quietly checks
    // nothing. Grows only when a new folded tool takes a `q`.
    //
    // `list_apps` IS NOT HERE, and it is a gap in `doorParams` rather than in
    // this check or in the grammar: `getApps` (workers/tenancy/src/routes/
    // processes.ts) reads `const params = new URL(request.url).searchParams`
    // and then `params.get("q")` — `doorParams`'s own regex looks for the
    // literal text `searchParams.get(`, so a door that names the variable
    // anything else is invisible to it, exactly as `getAppModules` two
    // handlers below it is. Checked by hand instead: `appsWhere`
    // (workers/tenancy/src/lib/processes.ts) is `name LIKE ? ESCAPE '\\'`
    // alone, and `QUERY_MODULES.apps` already declares `name` — no capability
    // loss, just an oracle that cannot see this one door. Flagged separately
    // rather than patched here, because `doorParams` is R19/R22/R27's shared
    // oracle and widening it belongs in its own reviewed change, not folded
    // silently into a fix for a different law.
    //
    // `list_meetings` WAS HERE until 9 Sep 2026 and is not any more, because it
    // is no longer folded: the meetings door grew a `view=mine` — an identity
    // predicate over the guest list with a fenced `creator_id` fallback — that
    // the grammar cannot say, so the strict-superset bar stopped holding and the
    // tool went back on the agent's catalogue (tools.ts's `REPLACED_BY_QUERY`
    // header argues it at length). This census is derived from that map, so the
    // name leaving is the correct consequence and not a check going blind: the
    // `guests` field it earned stays declared on `QUERY_MODULES.meetings`, where
    // `q`, `staleCheck` and every ordinary `contains` still use it.
    expect(withQ.map((w) => w.toolName)).toEqual(expect.arrayContaining(["list_accounts", "list_processes"]))
  })

  for (const { toolName, door, modName } of withQ) {
    it(`${toolName}'s "q" reaches every column the grammar can express on \`${modName}\``, () => {
      const cols = likeColumns(reachableLibBodies(door))
      expect(
        cols.length,
        `${toolName}'s door takes "q" but no LIKE clause turned up within four calls of its handler — ` +
          `the scan's own reach needs widening before this check means anything for it`
      ).toBeGreaterThan(0)
      const declared = new Set(QUERY_MODULES[modName].fields.map((f) => f.column))
      const missing = cols.filter((c) => !declared.has(c))
      expect(
        missing,
        `${toolName}'s "q" reaches column(s) ${missing.join(", ")} on \`${modName}\` that the grammar has ` +
          `no field for — folding this tool into query_records without one is exactly the capability loss ` +
          `this check exists to catch (declare the missing field, or take the tool back out of REPLACED_BY_QUERY)`
      ).toEqual([])
    })
  }
})

/* ────────── THE OTHER HALF OF THE BAR: A DERIVED VIEW IS NOT A FILTER ────────
 *
 * `REPLACED_BY_QUERY`'s own sentence has always had TWO clauses: "every
 * parameter it parses maps to a declared field, AND it offers no derived view
 * (`scope=mine`, `view=overdue`, `when=current`) that a filter cannot express".
 * The `q` check above is the first clause. Nothing checked the second, and on
 * 9 Sep 2026 that cost exactly what it was written to prevent.
 *
 * WHAT HAPPENED. The meetings door grew a fourth view, `view=mine` — the
 * client's ruling, "i was in the room": a LIKE against the mirrored Google guest
 * list for the CALLER's own address, with a fenced `creator_id` fallback for
 * rows that carry no guest list. It is an identity predicate joined by OR to a
 * conjunction, and `ParsedQuery.where` is a flat AND of clauses whose only OR is
 * one op across several fields — so the grammar could not say it, `query_records`
 * stopped being a strict superset of that door, and the agent silently lost
 * "which meetings was I in". Every check in this file stayed green: the name was
 * still a real shared GET, the module was still nameable, the tool was still
 * gone, and `q` still reached only declared columns. The fold's own comment went
 * on asserting a superset that had stopped being true.
 *
 * WHY A DERIVED VIEW IS THE THING TO CATCH, rather than this one value. A view
 * is a NAMED SET decided inside a door's own source. Its meaning is not on the
 * wire and its membership can GROW without anybody touching the grammar, the
 * catalogue or this file — which makes "is this fold still a superset?" a
 * question re-asked by nobody. A field comparison cannot rot that way: the
 * grammar either declares the field or refuses the filter, out loud.
 *
 * SO: a folded door may offer no derived view, unless the value carries a
 * written line here. The table is EMPTY today and that is the honest state —
 * `list_meetings` was the only folded door that ever had one, and it is folded
 * no longer. A line is how somebody argues one back in, the way `guests` was
 * argued in: named value, named reason, and rot-checked so it cannot outlive the
 * door that made it true. */
const DERIVED_VIEWS_OK: Record<string, string> = {}

/** The values a door's own source compares its `view`/`scope` filter against —
 * `filter.view === "week"`, `filter.scope !== "mine"` — read out of the same
 * four-hop reach `likeColumns` uses, because a door's views live in the same
 * `whereFor`-shaped helper its LIKE clauses do. */
function derivedViews(src: string): string[] {
  return [...new Set([...src.matchAll(/\.(?:view|scope)\s*(?:===|!==)\s*"([^"]+)"/g)].map((m) => m[1]))]
}

describe("the strict-superset bar: a folded door offers no derived view", () => {
  const folded = Object.keys(REPLACED_BY_QUERY).flatMap((toolName) => {
    const shared = SHARED_TOOLS.find((t) => t.name === toolName)
    const door = shared && DOORS.find((d) => d.method === shared.method && d.path === shared.path)
    return door ? [{ toolName, door }] : []
  })

  /** THE ORACLE, PROVED AGAINST THE DOOR THAT EARNED THIS CHECK — and the reason
   * an empty `DERIVED_VIEWS_OK` is not a check that measures nothing.
   *
   * Every assertion below is "no folded door has a view", which an extractor
   * that had quietly stopped matching would also satisfy, for ever, in silence.
   * So the extractor is aimed at the meetings door — no longer folded, and the
   * one door in the estate known to carry four views — and required to see all
   * four INCLUDING the one that broke the fold. A refactor that renames
   * `whereFor`, moves the views out of it, or changes how a view is compared
   * fails HERE, loudly, instead of turning the rule above into a formality. */
  it("the extractor can still see a door's views (must not go blind)", () => {
    const meetings = SHARED_TOOLS.find((t) => t.name === "list_meetings")
    const door = meetings && DOORS.find((d) => d.method === meetings.method && d.path === meetings.path)
    expect(door, "list_meetings has no door in the census — re-point this oracle").toBeDefined()
    expect(derivedViews(reachableLibBodies(door!)).sort()).toEqual(["all", "mine", "upcoming", "week"])
  })

  for (const { toolName, door } of folded) {
    it(`${toolName} is folded, so its door names no set of its own`, () => {
      const unexplained = derivedViews(reachableLibBodies(door)).filter(
        (v) => !DERIVED_VIEWS_OK[`${toolName}:${v}`]
      )
      expect(
        unexplained,
        `${toolName}'s door decides "${unexplained.join('", "')}" in its own source, so its tool offers a set ` +
          `the query grammar cannot be asked for. A named set can GROW without the grammar hearing about it — ` +
          `which is how \`view=mine\` silently narrowed this fold. Widen the grammar and write the value into ` +
          `DERIVED_VIEWS_OK with the argument, or take the tool back out of REPLACED_BY_QUERY.`
      ).toEqual([])
    })
  }

  it("no line in DERIVED_VIEWS_OK outlives the door that earned it", () => {
    const live = new Set(folded.flatMap(({ toolName, door }) => derivedViews(reachableLibBodies(door)).map((v) => `${toolName}:${v}`)))
    const stale = Object.keys(DERIVED_VIEWS_OK).filter((k) => !live.has(k))
    expect(
      stale,
      `these excuses name a view no folded door offers any more: ${stale.join(", ")}. The list only shrinks.`
    ).toEqual([])
  })

  it("every excuse is an argument somebody can disagree with", () => {
    for (const [k, why] of Object.entries(DERIVED_VIEWS_OK))
      expect(why.length, `${k} needs a reason, not a note`).toBeGreaterThan(40)
  })
})

describe("toolSpecs — fewer tools, never fewer than the door allows", () => {
  it("no argument means the whole catalogue, exactly as before", () => {
    // The shape of the fail-open promise. A permissions read that throws hands
    // `undefined` here, and that must be indistinguishable from the behaviour
    // that shipped before any of this existed.
    const all = toolSpecs()
    expect(all.length).toBeGreaterThan(150)
    expect(new Set(all.map((t) => t.name)).size, "duplicate tool names in the catalogue").toBe(all.length)
  })

  /** THE BILL HAS A CEILING, AND UNTIL NOW IT DID NOT.
   *
   * Every assertion above this one is a FLOOR — "more than 150 tools", "the
   * filter removed something". Not one of them could ever fail because the
   * catalogue got bigger, which is the only direction that costs money: the
   * whole preamble is re-sent on every step of every turn, up to MAX_STEPS = 12.
   *
   * Measured 2026-09-05 with `node scripts/measure-preamble.mjs`, which makes no
   * model call: 165 tools, 107,064 characters of tool JSON, 132,528 with the
   * system prompt = ~34,672 tokens. At kimi-k2.6's published $0.950/M that is
   * $0.0329 of input per step, and COSTS.md turns it into $0.1093 for a typical
   * three-step turn.
   *
   * THE BUDGETS BELOW ARE ABOUT 12% ABOVE TODAY. That is deliberate headroom for
   * ordinary work and far too little for a module's worth of new tools, which is
   * the event this is for: the next big catalogue addition should arrive as a
   * decision somebody makes with the price in front of them, not as a number
   * nobody looked at. Raising them is fine — raising them WITHOUT re-reading
   * COSTS.md § 2 is what this makes impossible. */
  it("the catalogue stays inside its stated budget", () => {
    const chars = JSON.stringify(toolSpecs()).length
    const PREAMBLE_TOOL_BUDGET = 120_000
    expect(
      chars,
      `the tool catalogue is ${chars.toLocaleString()} chars, past the ${PREAMBLE_TOOL_BUDGET.toLocaleString()} budget. ` +
        `Every character here is re-sent on every model step of every turn. Run ` +
        `\`node scripts/measure-preamble.mjs\`, re-do COSTS.md § 2, and raise this on purpose or trim.`
    ).toBeLessThanOrEqual(PREAMBLE_TOOL_BUDGET)
  })

  /** …AND THE HALF THE RIGHTS TRIM CANNOT REACH.
   *
   * `toolSpecs(held)` keeps a tool with no declared gate, fail-open and
   * deliberately (tools.ts says why). So an UNGATED tool is sent to every caller
   * whatever their role, and the ungated set is the floor the RIGHTS trim can
   * never go below. Measured the same day: 52 of 165, which is 63,659 characters
   * — half the preamble, paid for by a caller holding no rights at all.
   *
   * THAT FLOOR IS NO LONGER THE BILL, and the distinction matters when reading
   * this number. Since the two-stage catalogue (2026-09-06) a step sends the
   * CORE tools plus an index of names, so the ungated count is what a caller may
   * reach rather than what is re-sent every step. It is still worth ratcheting:
   * an ungated tool is one nobody has classified, and the rights trim is what
   * keeps a caller from being shown a door that would refuse them.
   *
   * A ratchet DOWNWARD. R36's `offered-rights` is already pushing this number
   * down by making an unoffered right a build failure; this stops it climbing
   * back while nobody is looking, which is the only way it ever moved. */
  it("the ungated set — sent to everybody, whatever their rights — does not grow", () => {
    const ungated = toolSpecs(new Set<string>())
    // 52 → 53 on 2026-09-06, and this is the one kind of increase the ratchet is
    // meant to allow: `load_tools` carries no gate because it touches no door.
    // It reads this repo's own catalogue and returns DESCRIPTIONS — no row, no
    // record, nothing belonging to a team — and every tool it hands over still
    // runs through its own gated door as the caller. There is no right it could
    // sensibly demand.
    //
    // It also pays for itself several hundred times over, which is why raising
    // the ceiling for it is not the failure the ceiling exists to catch: it is
    // the tool that stops the other 159 being sent at all. Same day, same
    // script (`node scripts/measure-preamble.mjs`): a step went from 133,505
    // characters to 40,334 — 34,928 tokens to 10,552, a 69.8% cut — and the
    // number this ceiling guards is the one that got 677 characters bigger.
    // 53 → 54 on 2026-09-08, for the same shape of reason and a smaller one:
    // `describe_tool` reads the catalogue's own `detail` — source code, no row,
    // no record — so there is no right it could sensibly demand, and it exists
    // because the summaries it stands behind were cut from 69,892 characters to
    // 19,494. It costs 133 characters and gives back 50,359.
    //
    // 54 → 55 on 2026-09-09, and this one is a RESTORATION rather than a new
    // tool: `list_meetings` came off `REPLACED_BY_QUERY` because the meetings
    // door grew a `view=mine` the query grammar cannot express, so
    // `query_records` is no longer a strict superset of it. It is a READ, and
    // reads carry no `TOOL_GATES` line by design ("Reads carry no hint — they
    // just need the module's read right"), so restoring it necessarily moves
    // this number. The door still gates on `meetings:read` and still refuses a
    // portal caller; nothing here grants anything. Under the two-stage
    // catalogue what it costs a step is its NAME in the index, not its
    // definition.
    const UNGATED_CEILING = 55
    expect(
      ungated.map((t) => t.name).sort(),
      `${ungated.length} tools carry no declared gate (ceiling ${UNGATED_CEILING}), so every caller is sent all of them ` +
        `whatever their role. Declare a gate in TOOL_GATES, or raise this ceiling with the reason written down.`
    ).toHaveLength(UNGATED_CEILING)
  })

  it("an empty sheet still offers every UNGATED tool, and no gated one", () => {
    // A role with nothing at all. Everything TOOL_GATES classifies disappears;
    // everything it does not is kept, because an undeclared gate means "nobody
    // has classified this", never "nobody may call it".
    const nothing = names(new Set<string>())
    for (const n of nothing)
      expect(TOOL_GATES[n], `"${n}" survived an empty rights sheet but declares a gate`).toBeUndefined()
    const all = names()
    expect(nothing.size, "an empty sheet removed nothing — the filter is not wired").toBeLessThan(all.size)
    expect(nothing.size, "an empty sheet removed everything — an ungated tool was dropped").toBeGreaterThan(0)
  })

  it("a right held keeps exactly the tools that ask for it", () => {
    const held = new Set(["accounts:create"])
    const kept = names(held)
    const wanted = Object.entries(TOOL_GATES)
      .filter(([, g]) => g === "accounts:create")
      .map(([n]) => n)
    expect(wanted.length, "no tool gates on accounts:create any more — re-point this test").toBeGreaterThan(0)
    for (const n of wanted) expect(kept.has(n), `holding accounts:create must keep "${n}"`).toBe(true)
    // …and it does NOT leak a neighbouring right on the same module.
    for (const [n, g] of Object.entries(TOOL_GATES))
      if (g === "accounts:delete") expect(kept.has(n), `"${n}" needs accounts:delete and was kept`).toBe(false)
  })

  it("every right in the sheet gives back the whole catalogue", () => {
    // An owner loses nothing. If this ever fails, some tool's gate string is not
    // a right any role can hold — which is R36's `offered-rights` fault seen
    // from the other end, and it would silently retire a working tool.
    const everything = new Set(Object.values(TOOL_GATES))
    expect(names(everything).size).toBe(names().size)
  })

  it("the filter is the ONLY thing that shrinks it — no name is invented", () => {
    const all = names()
    for (const n of names(new Set(Object.values(TOOL_GATES))))
      expect(all.has(n), `"${n}" appeared only when rights were passed`).toBe(true)
  })
})

/* ───────────────── THE SUMMARY IS ONE LINE, AND NOTHING WAS LOST ─────────────
 *
 * The diet above drops tools a role could never call. This is the other half of
 * the same bill and it is paid by every caller, whatever their rights: the words
 * themselves. A `tools/list` on the MCP surface carried 85,621 characters of
 * description on 2026-09-08 — loaded before the user has typed anything, on a
 * surface that has no two-stage catalogue to defer it — and the owner connecting
 * his own Claude to it is how that stopped being an abstract number.
 *
 * So a summary is ONE LINE and the rest of the sentence is on `detail`, which no
 * manifest carries and `describe_tool` hands back on request. The two checks
 * below are the two ways that can rot, and they are different failures:
 *
 *   · a summary that grows back — the whole saving, undone one PR at a time by
 *     people each adding one reasonable paragraph;
 *   · a summary trimmed by DELETING rather than moving — which is the dangerous
 *     one, because it reads exactly like the other and nobody notices for weeks.
 *     A trimmed tool must have a detail, and the detail must still name every
 *     identifier the summary does, so the short line can never promise a
 *     contract the long one has stopped explaining.
 *
 * What neither can prove is that the ONE LINE kept the right sentence. That is
 * judgement, it was made tool by tool, and R27 (`described-contracts`) is what
 * stops it inventing a name — it reads summary and detail together for exactly
 * this reason.
 */
describe("a tool summary is one line, and its detail keeps what the line dropped", () => {
  /** Characters, not words: this is a bill measured in tokens. ~110 is the
   * target and this is the refusal, sized so an ordinary sentence fits and a
   * paragraph does not. Every summary in the catalogue is under it today. */
  const SUMMARY_CEILING = 160

  it("no summary is longer than one line", () => {
    const over = SHARED_TOOLS.filter((t) => t.summary.length > SUMMARY_CEILING).map(
      (t) => `${t.name} (${t.summary.length})`
    )
    expect(
      over,
      `a tool summary is ONE LINE, at most ${SUMMARY_CEILING} characters — every manifest on both machine surfaces ` +
        `carries it before anybody has asked for anything. Move the rest to \`detail\`, which \`describe_tool\` serves: ${over.join(", ")}`
    ).toEqual([])
  })

  it("the catalogue as a whole stays under its budget", () => {
    // A ratchet, not a target: it can fall and must never rise. 69,892 chars
    // before the trim, 19,494 after — this is that number with a little room,
    // so a new tool costs nothing to add and a re-inflated one is caught long
    // before the manifest is a problem again.
    const CATALOGUE_CEILING = 22_000
    const total = SHARED_TOOLS.reduce((n, t) => n + t.summary.length, 0)
    expect(
      total,
      `the shared catalogue's summaries total ${total} characters (ceiling ${CATALOGUE_CEILING}). ` +
        `That is what every MCP client loads before its user types a word.`
    ).toBeLessThanOrEqual(CATALOGUE_CEILING)
  })

  it("a trimmed summary MOVED its prose — it did not delete it", () => {
    // WHAT THIS CAN AND CANNOT PROVE, said plainly. `detail` holds the summary
    // as it stood before the trim, verbatim — but no test can read the version
    // that was replaced, so "verbatim" is not the property enforced here. What
    // IS enforced is the half that rots: a summary may not name something its
    // own detail never explains, because `describe_tool` is the only place a
    // caller can go and ask.
    //
    // A DECLARED ARGUMENT IS EXEMPT, and that exemption is the check's shape,
    // not a hole in it. The schema travels beside the description in every
    // manifest, so `id` is already explained where the caller is standing; the
    // one-liners routinely backtick an argument the old prose spelled plainly
    // ("by id"), and failing those would only teach people to un-backtick. What
    // is left is the class that matters: a RESPONSE field, a status value, a
    // flag — a word the caller can find nowhere but the prose.
    const identifiers = (text: string) => [...new Set([...text.matchAll(/`([A-Za-z][A-Za-z0-9_]*)`/g)].map((m) => m[1]))]
    const orphans: string[] = []
    let checked = 0
    for (const t of SHARED_TOOLS) {
      if (!t.detail) continue
      checked++
      const args = new Set(Object.keys((t.schema as { properties?: Record<string, unknown> }).properties ?? {}))
      for (const word of identifiers(t.summary)) {
        if (args.has(word)) continue
        // Whole word, backticked or not: the old prose often named a field in
        // ordinary sentences, and it explained it just as well there.
        if (!new RegExp(`\\b${word}\\b`).test(t.detail)) orphans.push(`${t.name}: \`${word}\``)
      }
    }
    // Tripwire: a catalogue with no details at all would pass the loop above in
    // silence, which is exactly the state this check exists to forbid.
    expect(checked, "no tool carries a `detail` — the prose was deleted, not moved").toBeGreaterThan(100)
    expect(
      orphans,
      `a summary names an identifier its own \`detail\` never mentions, so \`describe_tool\` cannot explain it: ${orphans.join(", ")}`
    ).toEqual([])
  })

  it("the prose that left the manifest is still on disk, all of it", () => {
    // THE HOLE THIS CLOSES, found by mutation on 8 Sep 2026 and not by reading:
    // deleting one tool's `detail` outright — leaving its one-line summary in
    // place, so the manifest looks identical and `describe_tool` answers with
    // nothing — passed every other check in this file. The move-proof above
    // SKIPS a tool with no detail, which is exactly the tool a deletion makes.
    //
    // So the two numbers are pinned. Not derivable from anything: "was this
    // summary trimmed?" is a fact about the version that was replaced, and no
    // test can read that. A pin is the honest instrument, and it is the same
    // shape as UNGATED_CEILING above — it moves when somebody decides it
    // should, in a commit that says why, and never by accident.
    const detailed = SHARED_TOOLS.filter((t) => t.detail)
    const DETAILED_TOOLS = 126
    const DETAIL_CHARS_FLOOR = 67_000
    expect(
      detailed.map((t) => t.name),
      `${detailed.length} tools carry a \`detail\` (pinned at ${DETAILED_TOOLS}). A tool that LOSES one has had its ` +
        `prose deleted rather than moved, and its one-line summary is now the only thing anybody can read. ` +
        `A tool that GAINS one is fine — move the pin in the same commit.`
    ).toHaveLength(DETAILED_TOOLS)
    const chars = detailed.reduce((n, t) => n + (t.detail as string).length, 0)
    expect(
      chars,
      `the details hold ${chars} characters of prose (floor ${DETAIL_CHARS_FLOOR}). This is what left the manifest ` +
        `on 8 Sep 2026 and it is not spare — a detail gutted to a sentence keeps the count above and loses the words.`
    ).toBeGreaterThanOrEqual(DETAIL_CHARS_FLOOR)
  })

  it("the long ones are the ones that were trimmed", () => {
    // A detail on a tool whose summary was always short is duplication, not a
    // move: `update_role` says "Rename or re-describe a team role (by id)" and
    // there is nothing behind it to fetch. Keeps the list honest about which
    // tools have a second half worth asking for.
    const pointless = SHARED_TOOLS.filter((t) => t.detail && t.detail.length <= t.summary.length).map((t) => t.name)
    expect(pointless, `a \`detail\` no longer than its summary is a copy, not a move: ${pointless.join(", ")}`).toEqual([])
  })
})
