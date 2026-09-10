// THE MONEY ROUTES — what one app gave back, and nothing else any more.
//
// ONE DOOR, AND IT REFUSES A CLIENT LOGIN. A reader can check the rule by
// counting `refusePortalCaller` against the number of handlers, exactly as they
// could when there were five.
//
// ── WHY THE FILE IS NOW ONE HANDLER LONG, IN TWO STEPS ───────────────────────
//
// Until 10 Sep 2026 this file also served the agency's OWN two cost cards and
// the margin computed from them — seven doors — and, until later the same day,
// the ACCOUNT RATE CARD: four doors on `account_rates`, what a client is
// charged per hour by kind of work.
//
// The client retired both, an hour apart. First: "kill the whole internal rates
// thing. will develop this in the future much much more but for now i iwanna
// wipe it clean". Then, of the half that was left: "the whole account rates also
// killed it". Law R24's structural half went with the first ruling (RULES.md
// records why); `lib/internal-money.ts` and `lib/rates.ts` are both gone, and
// team migration 0078 drops `account_rates` the way 0077 dropped the other two.
//
// ── WHY THIS FILE STAYS, RATHER THAN FOLDING INTO routes/processes.ts ────────
//
// The old reason for the split — "the account rate card is a commercial
// agreement rather than a process fact" — died with the card, so the question
// was asked again rather than assumed.
//
// It stays because of what R24-outbound now stands on. `shared/workers/
// money-taint.ts` derives the doors that hand back a withheld figure from a
// NAMED SET OF FUNCTIONS (`MONEY_READERS`) rather than from a file, and says
// plainly that this is weaker than the import it replaced — the reason it had to
// narrow was that `appMoneyBack` moved into `lib/processes.ts`, "which has forty
// exports and is mostly not money". Moving the DOOR in after it would repeat
// that same dilution one layer up: the base's one remaining money route would
// sit among thirty process routes, and the next reader looking for "where is the
// money served" would have nowhere to look. A file called money.ts holding the
// only money door is a more accurate name today than it was yesterday.

import { json } from "@shared/workers/http"
import { queryText, requireText, TEXT_LIMITS } from "@shared/workers/validate"
import { gated } from "@shared/workers/route"
import { refusePortalCaller } from "@shared/workers/account-scope"
import { appMoneyBack } from "../lib/processes"
import type { Env } from "../env"

// ── what one app gave back ─────────────────────────────────────────────────
//
// What used to sit here beside it: the ROLE rate card — `GET`/`POST
// /api/tenancy/role-rates`, what an hour of one of OUR roles was worth — retired
// with the rest of the internal rates on 10 Sep 2026, already read by nothing
// since 25 Aug; and the ACCOUNT rate card's four doors, retired the same day at
// the client's second ruling.

/** GET /api/tenancy/app-money?appId= — the hours one app gives back and what
 * they are worth (8.13).
 *
 * AGENCY-ONLY, and it is the visibility SWITCH that makes it so. Both halves are
 * `listSavings`' own arithmetic, priced by the client's own role rates frozen
 * onto each step — but this door hands them over whole, where the client's own
 * value door (`GET /api/tenancy/impact`) withholds the prices on any app their
 * account's price visibility is off for. Same subtraction, one of them
 * unredacted; so this one refuses a portal caller and the portal gateway does
 * not open it. */
export async function getAppMoney(request: Request, env: Env): Promise<Response> {
  const { cfg, guard } = await gated(request, env, "commercials", "read")
  const scope = await refusePortalCaller(cfg, guard)
  const appId = requireText(queryText(new URL(request.url).searchParams.get("appId"), "App"), "App", TEXT_LIMITS.short)
  const money = await appMoneyBack(cfg, guard, scope, appId)
  // SPELLED OUT rather than spread, and that is R27 rather than fussiness: the
  // contract a tool description promises is derived from the literal a door
  // returns, so `return json(theObject)` is a door whose response nothing can
  // read. Naming the six fields here is what makes the promise checkable.
  return json({
    appId: money.appId,
    savedSecondsPerMonth: money.savedSecondsPerMonth,
    moneyCentsPerMonth: money.moneyCentsPerMonth,
    unpricedProcesses: money.unpricedProcesses,
    lines: money.lines,
    caption: money.caption,
  })
}
