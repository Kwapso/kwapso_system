// READING A TEAM'S AUTOMATION SWITCHES — the one place a worker asks whether an
// automation may run. The registry (what exists, what may be switched, and why
// not) is `shared/automations.ts`; this is only the trip to the team's database.
//
// ── WHERE THE FLAG IS READ, AND WHAT IT COSTS ───────────────────────────────
//
// NOWHERE A PERSON IS WAITING, which is the whole reason the registry calls
// only some of these switchable. Every `switchable: true` entry today is one of
// three shapes, and none of them is on the path back to a browser:
//
//   · a SEND that already rides `afterResponse` (`shared/workers/parallel.ts`)
//     — the ticket reply, the resolution, the to-do. The response has gone
//     before the send function is entered, so the read below happens in
//     `waitUntil` and the person is already reading their screen.
//   · a CRON — the morning digest, the knowledge sweep, the Google pass, the
//     retirement pass. There is no response to be on the path of.
//   · a rare ADMINISTRATIVE send that is awaited on purpose because the screen
//     reports whether it went (a role change, a removal, a withdrawn invite).
//     Those handlers already make several database trips and happen a handful
//     of times a month; one bounded `SELECT` by primary key is inside the noise.
//
// AND NOT MEMOISED, deliberately. A module-level cache in a Worker is per
// ISOLATE and shared between concurrent requests from different teams — the
// same trap `env` sets, which is why the dispatchers build a per-request copy
// rather than writing to `env` (workers/*/src/index.ts, parallel.ts). A switch
// cached that way would eventually answer one team's question with another
// team's answer, and the failure would be silent and rare, which is the worst
// pair. One call, one trip, on a path nobody is waiting on.
//
// EVERY FAILURE MEANS ON. A team that cannot be asked has not switched anything
// off — an automation silenced because a database trip failed is a silence
// nobody chose, which is the fault this whole design exists to keep visible.

import { isAutomationOff } from "../automations"
import { d1Query, type D1Rest } from "./d1-rest"

/** The stored blob for one settings segment, parsed — or `{}` when this team has
 * never been asked about that module (an absent row IS the default, and the
 * default is on).
 *
 * R14: one row, by PRIMARY KEY, `LIMIT 1`. The table is keyed by segment, so
 * this can return at most one row by construction and the limit is belt as well
 * as braces. */
export async function readAutomationSettings(
  cfg: D1Rest,
  databaseId: string,
  segment: string
): Promise<Record<string, unknown>> {
  let rows: { settings: string }[] = []
  try {
    rows = await d1Query<{ settings: string }>(
      cfg,
      databaseId,
      // R14 hard cap — one row, and `module` is the primary key.
      "SELECT settings FROM automations WHERE module = ? LIMIT 1",
      [segment]
    )
  } catch (e) {
    // EVERY FAILURE MEANS ON — the header's sentence, made true here rather than
    // only asserted there. THE CASE THIS IS REALLY FOR is a team whose
    // `automations` table does not exist yet: migrations are rolled between the
    // tenancy deploy and the content one (OPERATIONS.md's deploy order), so
    // there is a window in which this worker asks a question the schema cannot
    // answer — and a team that has never been asked has switched nothing off.
    //
    // NOT SWALLOWED, SAID OUT LOUD. A read that fails is recorded on the console
    // beside the tick's own id, and every caller of this sits inside work that is
    // already wrapped by its own recorder (R12). What must not happen is the
    // OPPOSITE default: an automation silenced because a database trip failed is
    // a silence nobody chose, which is the exact fault this whole feature exists
    // to make visible.
    console.error("automation switches could not be read, every automation stays ON:", segment, e)
    return {}
  }
  const raw = rows[0]?.settings
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    // A blob this app's own door cannot have written. The honest answer is the
    // DEFAULT, not a silence: see the header.
    return {}
  }
}

/** HAS THIS TEAM SWITCHED THIS AUTOMATION OFF — the one question a consulting
 * site asks, and the only shape R70's census recognises.
 *
 * The key carries its own segment (`tickets.reply-email`), so a caller names one
 * thing rather than two and cannot look a ticket switch up on the meetings row.
 * The comparison itself is `isAutomationOff` in `shared/automations.ts`: the
 * stored value must BE the word `off`, never merely be truthy (R20's rule about
 * a value read off something you did not write, applied one layer in). */
export async function automationOff(
  cfg: D1Rest,
  databaseId: string,
  key: string
): Promise<boolean> {
  const segment = key.slice(0, key.indexOf("."))
  if (!segment) return false
  const settings = await readAutomationSettings(cfg, databaseId, segment)
  return isAutomationOff(settings, key)
}
