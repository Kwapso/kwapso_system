// Config routes — the screen-engine recipe store. Serve a team's per-screen
// overrides (any member: they drive what the member sees; each screen's DATA is
// still permission-checked at its own endpoint), and set one (team-admin).
//
// NOT agent-callable, and not on the MCP either — this comment used to say the
// write was, while it sat on neither catalogue. Authoring a recipe changes what
// every person on the team sees, and the only way to judge one is to look at the
// screen it draws; a machine client has no screen. The decision is recorded where
// the machine surface's other decisions are (TOOLLESS_DOORS in the R19 census).

import { refusePortalCaller } from "@shared/workers/account-scope"
import { fail, json } from "@shared/workers/http"
import { publishChange } from "@shared/workers/realtime"
import { getAutomationSettings, setAutomation } from "../lib/automations-config"
import { getScreenOverrides, setScreenOverride } from "../lib/screens-config"
import { gatedBody } from "@shared/workers/route"
import { requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { teamContext } from "../context"
import type { Env } from "../env"

export async function getScreens(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await teamContext(request, env)
  // "Any member" means any member of the AGENCY. A recipe describes an agency
  // screen — which modules it shows, which columns, which tabs — and the client
  // portal draws none of them (it has its own screens and this door is not on
  // its surface). A client login is an ordinary member, so the refusal has to be
  // here rather than on the other gateway's allow-list.
  await refusePortalCaller(cfg, guard)
  return json({ screens: await getScreenOverrides(cfg, guard) })
}

export async function postScreen(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<{ module?: string; recipe?: unknown }>(
    request, env, "teams", "edit"
  )
  // R21 AT THE DOOR, ON THE WRITE HALF TOO. Every READ door on this module already
  // refuses a client login; not one WRITE door did, so the refusal existed on the
  // module and was missing on exactly the half that changes things. It held only
  // because the shipped Client role happens not to carry the right — and R21's own
  // sentence is that the decision belongs at the door, precisely so it does not
  // depend on how carefully a role was built.
  await refusePortalCaller(cfg, guard)
  const module = requireText(body.module, "Module", TEXT_LIMITS.short)
  if (typeof body.recipe === "undefined")
    return fail(400, "invalid_input", "module and recipe are required.")
  const recipeJson =
    typeof body.recipe === "string" ? body.recipe : JSON.stringify(body.recipe)
  await setScreenOverride(cfg, guard, actor, module, recipeJson)
  await publishChange(env, guard.teamId, "screens", module)
  return json({ screens: await getScreenOverrides(cfg, guard) })
}

/* ───────────────────────── the automation switches ─────────────────────────
 *
 * The client's ruling, 2026-09-11: *"include absolutely all of those in settings
 * by module. I want no automation without visibility."* / *"so far i want
 * visibility and on+off."* The registry of WHAT exists is `shared/automations.ts`
 * and it ships in the code, the same way the base recipes do; these two doors
 * carry only this team's overrides of it — which is to say, only the ones it has
 * deliberately switched OFF.
 *
 * THE READ IS OPEN TO ANY MEMBER and the write is `teams:edit`, exactly as the
 * recipe store above it. Her ruling is VISIBILITY, so the answer to "what does
 * this software do without me asking" cannot itself be behind the right to
 * change it — and the page already refuses a reader the module's own gate
 * refuses (`visibleModuleSettings`, R61). */
export async function getAutomations(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await teamContext(request, env)
  // R21 AT THE DOOR. What the agency's software does by itself is the agency's
  // own business, and a client login is an ordinary team member at the other
  // hostname — so the refusal has to be here, not on the portal's allow-list.
  await refusePortalCaller(cfg, guard)
  return json({ automations: await getAutomationSettings(cfg, guard) })
}

export async function postAutomation(request: Request, env: Env): Promise<Response> {
  const { actor, cfg, guard, body } = await gatedBody<{ key?: string; on?: unknown }>(
    request, env, "teams", "edit"
  )
  await refusePortalCaller(cfg, guard)
  const key = requireText(body.key, "Automation", TEXT_LIMITS.short)
  // R20, POSITIONALLY. `on` is read as a LITERAL COMPARISON and never as a
  // truthiness guard: `if (body.on)` would read the string "false" as on, and
  // a missing field as off, which is the one mistake this door cannot make —
  // a silence nobody asked for is exactly what the whole feature exists to
  // prevent. Both branches are spelled, so an absent or mistyped field is a
  // 400 rather than a guess.
  if (body.on !== true && body.on !== false)
    return fail(400, "invalid_input", "on must be true or false.")
  await setAutomation(cfg, guard, actor, key, body.on === true)
  // R1 — the settings page is live like every other screen, so a second admin
  // watching it sees the switch move rather than a stale answer.
  await publishChange(env, guard.teamId, "automations", key)
  return json({ automations: await getAutomationSettings(cfg, guard) })
}
