// THE AUTOMATION SWITCH STORE — a team's answer to "which of the things this
// software does by itself should it stop doing".
//
// A COPY OF `screens-config.ts` BESIDE IT, deliberately and nearly line for
// line: keyed by module, one JSON column, two audit blocks, a byte cap AND a row
// cap enforced insert-only, a bounded ordered read, `teams:edit` on the write,
// `refusePortalCaller` on both halves, `publishChange`, `logActivity`. The
// recipe store is the shape this base already trusts for per-team configuration
// that no worker has an opinion about, and inventing a second shape for the
// second one would be two things to learn instead of one.
//
// ONE DEPARTURE, AND IT IS THE WHOLE OF WHAT IS NEW HERE. `setScreenOverride`
// accepts ANY key, because the web app owns the `ScreenRecipe` shape and a
// worker cannot honestly check one. This door does the opposite: the automation
// registry is SHARED (`shared/automations.ts`), so the key space is closed, and
// a key that names no switchable automation is REFUSED rather than stored. That
// is the `OPS_DIGEST_OFF` discipline as a door rather than as a comment — "off"
// is a value somebody chose, and a preference about nothing is a fault, so the
// two can never be written into the same column and later read back as one.
//
// AND AN ABSENT ROW IS THE DEFAULT. Switching an automation back ON removes its
// key; a row whose last key is removed is left holding `{}`, which reads
// identically to no row at all (`readAutomationSettings`). Nothing is seeded,
// nothing is migrated, and a team that has never opened this page behaves
// tomorrow exactly as it does today.
//
// NOT ON THE AGENT AND NOT ON MCP, for `screens`' own reason one turn stronger.
// Authoring configuration is not a machine's job — but more than that, this door
// decides whether the software TELLS SOMEBODY SOMETHING. A model that could
// silence the ticket emails could make its own next mistake quiet, and the
// person who would have been told is the person who would have caught it. The
// decision is recorded where the machine surface's other decisions are
// (`TOOLLESS_DOORS`, workers/mcp/test/filter-parity.test.ts).

import { AUTOMATION_OFF, AUTOMATIONS } from "@shared/automations"
import { logActivity, type Actor } from "@shared/workers/activity"
import { d1ExecScript, d1Query, sqlString, type D1Rest } from "@shared/workers/d1-rest"
import { GuardError, type MemberGuard } from "./permissions"

/** A stored blob is one word per switched-off automation, so the real ceiling is
 * a few hundred bytes. This is the same belt-and-braces cap `screens` puts on a
 * recipe: the column is written by a door and read on a settings page, and a
 * bound nobody can exceed by accident is cheaper than finding out. */
const MAX_SETTINGS_BYTES = 8 * 1024

/** How many segments one team may hold a row for.
 *
 * Unlike `screens`, this one CAN be checked against a list — every legal key
 * names an entry in the shared registry — so the honest ceiling is "as many
 * segments as the registry has, with room to grow". The cap still exists because
 * the read below is bounded by it and a bounded read needs a number, not because
 * anything could realistically approach it. */
const MAX_AUTOMATION_MODULES = 50

/** Every settings segment this team has switched something off on:
 * `{ segment: settingsJSON }`. The page merges these over the registry's own
 * defaults (absent means on). */
export async function getAutomationSettings(
  cfg: D1Rest,
  guard: MemberGuard
): Promise<Record<string, string>> {
  const rows = await d1Query<{ module: string; settings: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap — the same shape and the same reasoning as the recipe store
    // one file over. Ordered so a team at the ceiling gets the same segments
    // back on every request rather than an arbitrary subset.
    `SELECT module, settings FROM automations ORDER BY module LIMIT ${MAX_AUTOMATION_MODULES}`
  )
  const out: Record<string, string> = {}
  for (const r of rows) out[r.module] = r.settings
  return out
}

/** Switch one automation off, or back on.
 *
 * `on` is the caller's answer and it arrives already type-checked at the route
 * (R20 is positional: `body.on === true` / `=== false`, never a truthiness
 * guard). Off writes the one word; on DELETES the key, so the store only ever
 * holds deliberate silences. */
export async function setAutomation(
  cfg: D1Rest,
  guard: MemberGuard,
  actor: Actor,
  key: string,
  on: boolean
): Promise<void> {
  // THE CLOSED KEY SPACE, and the two refusals are different sentences on
  // purpose. A key naming nothing is somebody's typo or a stale client; a key
  // naming an automation the registry says cannot be switched is somebody
  // trying to turn off the sign-in code, and being told why is the answer.
  const entry = AUTOMATIONS.find((a) => a.key === key)
  if (!entry) throw new GuardError(400, "unknown_automation", "There's no automation by that name.")
  if (!entry.switchable)
    throw new GuardError(
      400,
      "automation_not_switchable",
      "That automation can't be switched off. Its settings page says why."
    )

  const segment = entry.segment
  const rows = await d1Query<{ settings: string }>(
    cfg,
    guard.databaseId,
    // R14 hard cap — one row, `module` is the primary key.
    "SELECT settings FROM automations WHERE module = ? LIMIT 1",
    [segment]
  )
  const existing = rows[0]
  let settings: Record<string, unknown> = {}
  if (existing) {
    try {
      const parsed: unknown = JSON.parse(existing.settings)
      if (typeof parsed === "object" && parsed !== null) settings = parsed as Record<string, unknown>
    } catch {
      // A blob no door of ours can have written. Start from the DEFAULT rather
      // than from a guess — every automation on, then this one's answer applied.
      settings = {}
    }
  }
  if (on) delete settings[key]
  else settings[key] = AUTOMATION_OFF

  const json = JSON.stringify(settings)
  if (json.length > MAX_SETTINGS_BYTES)
    throw new GuardError(400, "settings_too_large", "That module has too many settings stored.")

  // CAP THE TABLE, not just the row — `screens`' own argument. An update to an
  // existing segment changes no row count; a segment with no row yet is a new
  // row, and new rows are what the ceiling is for.
  if (!existing) {
    const counted = await d1Query<{ n: number }>(
      cfg,
      guard.databaseId,
      "SELECT COUNT(*) AS n FROM automations"
    )
    if ((counted[0]?.n ?? 0) >= MAX_AUTOMATION_MODULES)
      throw new GuardError(
        400,
        "too_many_automation_modules",
        `This team already holds automation settings for ${MAX_AUTOMATION_MODULES} modules, which is the limit.`
      )
  }

  const now = new Date().toISOString()
  await d1ExecScript(
    cfg,
    guard.databaseId,
    `INSERT INTO automations (module, settings, created_at, creator_id, creator_email, creator_name)
VALUES (${sqlString(segment)}, ${sqlString(json)}, ${sqlString(now)}, ${sqlString(actor.id)}, ${sqlString(actor.email)}, ${sqlString(actor.name)})
ON CONFLICT(module) DO UPDATE SET
  settings = excluded.settings, updated_at = ${sqlString(now)},
  editor_id = ${sqlString(actor.id)}, editor_email = ${sqlString(actor.email)}, editor_name = ${sqlString(actor.name)};`
  )
  await logActivity(cfg, guard.databaseId, actor, {
    // SWITCHING ONE OFF AND BACK ON ARE TWO DIFFERENT SENTENCES IN THE TRAIL,
    // because "who stopped the resolution emails, and when" is the question
    // somebody asks three weeks later when a client says they heard nothing.
    type: on ? "Automation switched on" : "Automation switched off",
    description: `${actor.name} switched ${on ? "on" : "off"} the ${key} automation`,
    relatedTable: "automations",
    relatedRowId: segment,
  })
}
