// HOW RARE IS THIS WORD IN THE TEAM'S OWN MATERIAL — shared between two
// callers that both have to answer it about an account-name TOKEN:
// workers/content's `accountsNamedIn` (may a collapsed single-token name
// narrow a search on its own, c-hijack A) and workers/tenancy's account
// write door (may a declared `alt_names` spelling be accepted without a
// person also declaring `name_narrows_alone`, c-hijack B). Extracted rather
// than duplicated, because a rarity ceiling reused by hand in two workers is
// exactly the shape `ACCOUNT_TOKEN_MAX_CHUNKS`'s own history warns about —
// see its comment below for the measured distribution and why one ceiling
// cannot close every case.
//
// UNFENCED (whole-team chunk count over FTS5), because both callers ask this
// BEFORE the compartment is known — narrowing to a compartment is the very
// question the rarity check feeds into.
import { d1Query, type D1Rest } from "./d1-rest"
import type { MemberGuard } from "./gating"

/** Measured against every one of the 26 staging accounts whose canonical name
 * collapses to a single surviving token (c-hijack, 11 Sep 2026):
 *
 *     0  Natalya · Sadia · Sandra (person accounts, no material yet)
 *     1  bergman   ← Bergman S.A.        — an ordinary surname, HIJACKS
 *     2  klaus, 5 manuel, 7 markus (person accounts)
 *    35  green     ← re-green            — an ordinary word, HIJACKS
 *    56  pickl     ← Pickl               — UNCERTAIN
 *    72  demo      ← DEMO                — an ordinary word, HIJACKS
 *    79  solutions ← VU Solutions        — an ordinary word, HIJACKS (KB-AUDIT §4.2)
 *   106  larissa   ← Larissa Grün        — a rare surname, safe
 *   115  aws       ← aWs                 — a common tech acronym, LIKELY HIJACKS
 *   115  nareyka   ← Björn Nareyka       — a rare surname, safe
 *   116+ looom, safety4you, 196+, PLATINUM, fluclinic, assecuranz,
 *        amstella, padelbase, kwapso, confia, hogo, alaap — brand names and
 *        real client names, all safe, up to 4,860 (the owner's own name)
 *
 * — no single ceiling separates every hijack from every safe name. Set to
 * close the three proven cases (green, demo, solutions — all ≥35) while
 * preserving every person-account name measured (≤7). Bergman (1) and
 * "aws"/"platinum"-shaped ties with safe names are named, tracked residuals
 * a rarity ceiling alone cannot close — that is what `name_narrows_alone`
 * (0085, c-hijack B) is for: a person declaring the word safe for THIS
 * account, bypassing the ceiling exactly as a `code` already does. */
export const ACCOUNT_TOKEN_MAX_CHUNKS = 30

export async function isRareAccountToken(cfg: D1Rest, guard: MemberGuard, term: string): Promise<boolean> {
  const rows = await d1Query<{ n: number }>(
    cfg,
    guard.databaseId,
    "SELECT COUNT(*) AS n FROM knowledge_chunks_fts WHERE knowledge_chunks_fts MATCH ?",
    [`"${term}"`]
  )
  return (rows[0]?.n ?? 0) <= ACCOUNT_TOKEN_MAX_CHUNKS
}
