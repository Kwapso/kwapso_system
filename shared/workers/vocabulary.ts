// A CLOSED DROPDOWN, ENFORCED AT THE WRITE DOOR.
//
// `selectable_data` holds a team's own words, and a record stores the WORD
// itself (`shared/selectable-homes.ts`'s own header says why the id was not
// chosen). That leaves exactly one way for a vocabulary to stop being one: a
// door that writes the column without ever asking whether the word is in the
// group. Every drift this product has had is that sentence — "Request" beside
// "request", "Insurance" beside "Insurance Broker", "Österreich" beside
// "Austria" — and none of them is visible on the screen that caused it,
// because a text input accepting text is not a bug anybody can see.
//
// TWO ANSWERS, AND A FIELD GETS ONE OF THEM.
//
//   · PICK-OR-CREATE — `ensureSelectableValue` (workers/content/src/lib/
//     vocabulary.ts) adds the missing word, for a field the team has ruled
//     open-ended (a marketing channel, a brand asset category). A record write
//     must not fail over a label that simply does not exist yet.
//   · REFUSE — this file, for a field the team has ruled a CLOSED list. Story
//     type and story category were the first two (team migration 0094); an
//     account's country and industry are the next (0120, Aurora's 23 Sep 2026
//     ruling, "make it a drop down, adjustable on settings").
//
// WHY IT LIVES IN `shared/workers/` AND NOT BESIDE ITS FIRST CALLER. It was
// declared in the content worker's own `lib/vocabulary.ts`, which is the right
// home for a helper with one worker's callers and the wrong one the moment a
// SECOND worker needs it: accounts is tenancy's, and a worker cannot import
// another worker's lib. The choice was this move or a second copy, and a second
// copy of a rule is a second place for it to stop being the same rule — the
// exact argument `ensureSelectableValue`'s own header already makes about the
// five copies it replaced. The content worker's file re-exports this one, so
// no call site there changed.

import { d1Query, type D1Rest } from "./d1-rest"
import { GuardError, type MemberGuard } from "./gating"

/**
 * REFUSE a value that is not a currently ACTIVE dropdown value in `group`.
 *
 * A DEACTIVATED ROW IS NOT AN OPTION, and that is the point rather than an
 * oversight: retiring a word on the Choices screen is a decision, and a door
 * that accepted it anyway would quietly undo it. What the door must NOT do is
 * make that decision retroactive — a record already holding a retired word is
 * not a record anybody has to relabel before they may correct its phone
 * number. That is the CALLER's clause, not this function's: an update compares
 * the incoming value with the stored one and only asks here when it CHANGED
 * (`updateAccount`, workers/tenancy/src/lib/accounts.ts, is the worked
 * example).
 *
 * A blank value is nothing to check — clearing a field is always allowed, and
 * every caller here treats absent, null and "" the same way its own patch
 * semantics already do.
 */
export async function requireActiveSelectableValue(
  cfg: D1Rest,
  guard: MemberGuard,
  group: string,
  value: string,
  what: string
): Promise<void> {
  const rows = await d1Query<{ id: string }>(
    cfg,
    guard.databaseId,
    "SELECT id FROM selectable_data WHERE type = ? AND value = ? AND deactivated_at IS NULL",
    [group, value]
  )
  if (!rows[0])
    throw new GuardError(400, "invalid_input", `${what} isn't one of the team's current options.`)
}
