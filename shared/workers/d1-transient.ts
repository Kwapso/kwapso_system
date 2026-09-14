// ONE SIGNATURE FOR A DATABASE THAT WILL BE FINE IN A MOMENT.
//
// Cloudflare D1 has three ways of saying the same thing — "this call failed for
// a reason that is ours, not yours, and asking again works" — and on 14 Sep
// 2026 the third of them ended a turn the assistant was twenty-eight steps
// into. Read off the staging error store, verbatim:
//
//     internal error; reference = abc123                       (REST door, 7500-in-a-200)
//     D1_ERROR: internal error; reference = vf4c1              (native binding)
//     D1_ERROR: Internal error in D1 DB storage caused object to be reset; reference = h8l1…
//
// The REST door (d1-rest.ts) had retried the first wording since 17 Aug 2026
// and matched it ANCHORED to the start of the message, so the `D1_ERROR: `
// prefix the native binding adds — and the capital I of the third — walked
// past it. The native binding (`env.DB`, the core database: quota, credits,
// the usage log) had no retry at all. So the one seam both doors ask, and the
// one retry the native path did not have.
//
// WHAT IS NOT HERE, on purpose: "no such column", "no such table", a UNIQUE
// violation, bad SQL. Those are OUR mistake, retrying them is three mistakes,
// and the message is the only discriminator — D1 answers code 7500 for all of
// it (d1-rest.ts's own note measured that).
const D1_TRANSIENT = /(^|:\s*)internal error\b|D1 DB storage caused object to be reset/i

export function isD1Transient(e: unknown): boolean {
  return D1_TRANSIENT.test(e instanceof Error ? e.message : String(e))
}

/** Attempts on the NATIVE binding, pauses of 250 ms then 500 ms — the same
 *  shape the REST door uses. Three, because a storage object being reset is
 *  over in well under a second and a fourth try has never been needed there. */
export const D1_NATIVE_ATTEMPTS = 3

/** Run one statement (or one small read) again when D1 says it will be fine in
 *  a moment; re-throw anything else untouched, at once.
 *
 *  ON A WRITE THIS IS A JUDGEMENT, made once and written down: a retry after a
 *  write that DID commit but failed to answer would apply it twice. On the
 *  credit path that is one free unit charged twice, bounded and cheap; the
 *  alternative — the failure this was written for — was a turn that had already
 *  spent twenty-four units dying with nothing to show. A statement that must
 *  never apply twice does not go through this. */
export async function retryTransient<T>(work: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let attempt = 0; attempt < D1_NATIVE_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 250 * attempt))
    try {
      return await work()
    } catch (e) {
      if (!isD1Transient(e)) throw e
      last = e
    }
  }
  throw last
}
