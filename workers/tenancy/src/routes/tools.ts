// THE DOOR BEHIND `describe_tool` — the other half of a one-line summary.
//
// Every tool in `SHARED_TOOLS` used to carry its whole explanation in the
// manifest: the history, the reasoning, the worked examples, the sentences a
// caller needs once and then never again. An MCP client loads all of that before
// its user has typed a word, and on 2026-09-08 that was 85,621 characters of
// prose — the reason the owner's own Claude stopped behaving the day he
// connected it. So the summaries were cut to one line and the rest moved onto
// `detail`, which no manifest carries and this door hands back on request.
//
// WHY IT LIVES ON TENANCY, beside `describe_module` — which is the same shape
// one subject along: describe_module says what a MODULE has, this says what a
// TOOL means, and both answer a machine that is deciding what to call next. It
// is also the only choice a shared tool has: `SharedTool.binding` is TENANCY or
// CONTENT, so a door on data-ops (where the agent's own catalogue lives) could
// not be reached from the MCP surface at all without widening that type.
//
// WHAT IT GRANTS: nothing. The catalogue is source code — no row, no record,
// nothing belonging to a team — so there is no module right to demand, and
// demanding `agent:read` would hide the manual from exactly the MCP developer
// who has no assistant rights and every reason to read it. `refusePortalCaller`
// still closes it on a client login (R21): the agency's tool catalogue names its
// internal doors, and a client login is an ordinary team member at the other
// hostname.

import { fail, json } from "@shared/workers/http"
import { refusePortalCaller } from "@shared/workers/account-scope"
import { teamContext } from "@shared/workers/gating"
import { queryText } from "@shared/workers/validate"
import { SHARED_TOOLS } from "@shared/workers/tool-catalog"
import type { Env } from "../env"

/** HOW MANY NEAR NAMES A REFUSAL OFFERS (R14: a hard cap, and a small one). It
 * is a correction a model can act on in the same breath, not a catalogue — the
 * caller is already holding every name, because the manifest is what sent it
 * here. `unknownModule` in query.ts makes the same trade for the same reason. */
const NEAR_CAP = 5

/**
 * GET /api/tenancy/tools/describe — one tool's full instructions.
 *
 * `tool` is the name off the manifest, and it is required: a caller reaching
 * this door already holds every name, so "list them all" would be a second copy
 * of the thing that was too big in the first place.
 *
 * Answers `summary` (the one line the manifest carries) and `detail` (everything
 * that used to be in it). A tool short enough never to have been trimmed has no
 * `detail` and says so with `trimmed` false, rather than repeating itself.
 */
export async function getToolDescribe(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await teamContext(request, env)
  await refusePortalCaller(cfg, guard)
  const name = queryText(new URL(request.url).searchParams.get("tool"), "Tool")
  if (!name) return fail(400, "invalid_input", "A tool name is required.")

  const found = SHARED_TOOLS.find((t) => t.name === name || t.mcpName === name)
  if (!found) {
    // Named, not just refused: a model handed "there is nothing called that"
    // asks the same question again, and a model handed the nearest three names
    // corrects itself in the same turn.
    const near = SHARED_TOOLS.map((t) => t.name)
      .filter((n) => n.includes(name) || name.includes(n.split("_")[0]))
      .slice(0, NEAR_CAP)
    return fail(
      400,
      "unknown_tool",
      `There is no tool called "${name}" in the shared catalogue.` +
        (near.length ? ` Did you mean ${near.join(", ")}?` : "")
    )
  }

  return json({
    tool: found.name,
    summary: found.summary,
    trimmed: !!found.detail,
    ...(found.detail ? { detail: found.detail } : {}),
  })
}
