### team_ref_counters + ref_aliases. BUILT (per-team, team migrations `0059`, `0068`)
**`ref_counters` IS GONE** — one row per (`account_id`, `kind`), dropped whole by
`0060_the_last_holdout_gets_a_name`. This section described it in the present
tense until 7 Sep 2026, which is the smaller half of the same rot R55 was written
for; the bigger half is below.

**`team_ref_counters`** is the replacement: one row per `kind`, no `account_id` in
the key, because the team's own database already IS the tenant boundary. The
client ruled on 2026-08-31 that a reference is TEAM-wide with no account code in
the string — `T0412`, `B0188`, `S0012`, `M0009`, `A0003`, `W0001`, `I0007` — and
`shared/workers/refs.ts` carries the whole argument for why (a cross-account
triage queue prints two unrelated `T0001`s with nothing to tell them apart).
Allocation is still a SINGLE statement, `INSERT … ON CONFLICT DO UPDATE …
RETURNING`, so two people raising a ticket in the same second are serialised by
the database rather than both reading the same number (CONCURRENCY.md rule 1: the
counter rides the write). `kind` is the letter: `T` ticket, `B` story, `S` sprint,
`M` meeting, `A` app, `W` wave, `I` input. `tasks` has a `ref` column and mints
nothing — see `REF_TABLES_WITHOUT_A_KIND` in the registry for why that is a
decision rather than an omission.

**`ref_aliases`** is what a record USED to be called: `(entity_table, alias)`
unique, plus `row_id`, `kind`, `replaced_by`, `retired_at` and `source` (the
migration that retired it). Rows accumulate, so a record renumbered twice has two.

It exists because the 2026-08-31 ruling changed the MINT and rewrote no stored
row. Every reference already on the books kept the old `<account>-<letters><digits>`
shape — 1,896 tickets, 275 stories, 100 sprints, 45 meetings and 1 input on
staging — and the client spent six days reading `VU Solutions-T1183` off her own
screens. `0068_the_reference_keeps_its_old_name` carries them all to the formula,
preserving each number where the number is free and reissuing where two accounts
had both minted it, and keeps the old string here so a number quoted in an email
last year still finds the record. That was her own ruling when shown the choice:
"alias yes". Every door that searches a reference ORs in `refAliasMatchSql`, and
the sprint list — whose door takes no `q` at all — carries the names on the row as
`refWas` so the browser's own matcher can find them. R55 is the law that stops the
data and the formula coming apart again.

