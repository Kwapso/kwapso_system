// WHOLE CENTS → WHAT A PERSON WOULD SAY. One line, one seam, both front ends.
//
// It exists because money used to render in three places on the agency's own
// side — a sprint's price, an account's rate card and our own internal rate card
// — and three copies of `(cents / 100).toLocaleString(…)` is three chances for
// one screen to show 1,250.5 where its neighbour shows 1,250.50. Both rate cards
// were retired on 10 Sep 2026 and the seam is worth keeping for the reason it
// was worth having: what is left still renders on a sprint, on a client's own
// role and tool prices, and on the portal's value screen.
//
// PURE, AND ABOUT NOTHING. It takes a number and a currency word; it knows no
// table, no door and no audience. That is what made it safe to share across the
// R24 fence while that fence existed: the law that kept our own cost away from a
// client login was about which files reached one library, and a function that
// formats an integer reaches nothing. What it must never grow is a rate, a
// default, or a subtraction — the moment it knows what the number MEANS, it
// stops being a formatter.

/** Two decimal places always, thousands grouped, the currency after it when the
 * row carries one. `1250` → "12.50"; `1250` + "EUR" → "12.50 EUR".
 *
 * Two places even on a round figure, because a column of rates where some rows
 * say "60" and others "62.50" is a column nobody can scan. */
export function moneyText(cents: number, currency?: string | null): string {
  const amount = (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency ? `${amount} ${currency}` : amount
}

/** `rateText(cents, currency)` — "45.00 EUR an hour" — stood here, with the "an
 * hour" written once so the two rate cards could never say the same number two
 * different ways. Both cards were retired on 10 Sep 2026 and it lost its last
 * caller with them. Left as a note rather than as an export: a formatter nothing
 * formats is a seam with no seam in it, and the sentence it protected against —
 * two screens describing one rate differently — needs two screens to be worth
 * protecting. */
