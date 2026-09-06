// HOW A FAILURE IS IDENTIFIED ACROSS TWO NIGHTS — and now across two workers.
//
// A signature is the worker plus the first 80 characters of the message. Not the
// `place`, which carries record ids on the cron rows and would make every team's
// copy of one outage a different failure; not the whole message, for the same
// reason. Measured against the live store, 2026-09-05: 5,086 rows collapse to
// 109 distinct messages, so the prefix is already doing the discriminating and
// 80 characters is comfortably inside the shortest of them.
//
// WHY IT LIVES IN shared/ NOW. It was written in tenancy's nightly digest, which
// was the only thing that needed it. data-ops' error store needs the identical
// answer to resolve a whole class of failure at once — and the two must agree
// exactly, or the digest reports a signature the resolve door cannot find. That
// is the same reasoning that moved the AI allowance here when a second worker
// started spending it: a second copy would be a second definition with the same
// name, and the first person to notice would be the one whose "resolve all"
// silently left rows behind.

/** The prefix length a signature keeps. Beyond it, two failures that differ only
 * in a long tail are the same failure for reporting purposes. */
export const SIGNATURE_PREFIX = 80

/** The SQL half — grouping happens in the database, because that is what bounds
 * the rows read. Exported as a string so the digest and the resolve door build
 * the same expression rather than two that look alike. */
export const SIGNATURE_SQL = `source || ' · ' || substr(message, 1, ${SIGNATURE_PREFIX})`

/** …AND THE HALF SQLITE CANNOT DO.
 *
 * Grouping on the message prefix is right and it is not enough, because plenty
 * of failures carry an ID INSIDE the first eighty characters. Measured against
 * the live store on 2026-09-05:
 *
 *     content · Error: D1_ERROR: internal error; reference = vf4c1
 *     content · Error: D1_ERROR: internal error; reference = p333t
 *     content · Error: D1_ERROR: internal error; reference = oa3pj
 *     …three more
 *
 * One fault. Six "new signatures", six lines in the mail every night it recurred,
 * and six rows nobody could resolve together. SQLite has no REGEXP, so the
 * grouping stays in the database and the FOLDING happens here, over the handful
 * of groups that came back.
 *
 * The rule is narrow on purpose: a run of four or more characters that mixes
 * LETTERS AND DIGITS is an identifier, not a word — no English word looks like
 * that — and a run of two or more digits is a count or an id. Ordinary prose
 * survives untouched, which is what keeps two genuinely different failures from
 * collapsing into one. */
export function foldSignature(sig: string): string {
  return sig
    .replace(/\b(?=[a-z]*\d)(?=\d*[a-z])[a-z0-9]{4,}\b/gi, "#")
    .replace(/\d{2,}/g, "#")
    .replace(/#(?:[\s:_-]*#)+/g, "#")
}

/** One row's folded signature, from the two columns it is built out of. The one
 * place a row becomes a signature, so the digest that REPORTS one and the door
 * that RESOLVES one can never disagree about which rows belong together. */
export function signatureOf(row: { source: string; message: string }): string {
  return foldSignature(`${row.source} · ${row.message.slice(0, SIGNATURE_PREFIX)}`)
}
