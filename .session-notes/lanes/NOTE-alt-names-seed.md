# The two declared spellings — what was seeded, and why each one

**Seeded by the hub on staging, 11 Sep 2026.** `accounts.alt_names` (migration
0083) is the c-misspell tracker row. The column shipped empty; this is the data.

| Account | id | `alt_names` |
|---|---|---|
| Padelbase | `01KZXBSQH1T9ZG4WZPF3YTE3NA` | `["Paddlebase"]` |
| Assecuranz | `01KZXBT4JDV1NCVRE3PH8SG1KH` | `["Asekurans","Assekuranz","Assecuranza"]` |

## Why these spellings

**Paddlebase** is the owner's own spelling, from his own eight test questions:
*"what is happening with Paddlebase?"* The account is **Padelbase** — padel, the
racket sport, one `d` and one `l`. "Paddlebase" is not a typo a distance metric
would catch near it; it is a person confidently spelling an English word they
know (*paddle*) in place of a Spanish one they do not. That is the whole case for
a DECLARED alias over a fuzzy one, and `rebuildNameIndex`'s own header makes it.

**Asekurans** is the same shape in the other direction: **Assecuranz** is German,
and a phonetic speller reaches for `Asekurans`. `Assekuranz` (the ordinary German
spelling of the common noun) and `Assecuranza` (the Italian) are the two other
stable spellings of that one word. All three are declared, none generated.

## The trap: an alias must be ONE token

`accountsNamedIn` confirms a match with `asked.has(alias)` against the question's
own tokenised words. **A multi-word alias can never match anything.** The first
seed carried `"Paddle base"` and `"Padel base"` and both were dead weight on
arrival — silently, because nothing fails when a row simply never matches. They
were removed in the same session. Single tokens only.

## How the data reaches the router

`alt_names` is a column on `accounts`; the router reads `knowledge_names`.
`rebuildNameIndex` (knowledge.ts:2917) is what carries one into the other, and it
runs **unconditionally on every `POST /api/content/knowledge/sync`** — so the
15-minute cron picks a new spelling up within one tick. Seeding the column alone
changes nothing until that runs. Verified at seed time: `knowledge_names` held
184 rows carrying `padelbase`/`assecuranz` (from each account's `code`) and not
yet the new aliases.

## To undo

`UPDATE accounts SET alt_names = '[]' WHERE id IN (…)`, then one sync. The
column's default is `'[]'` and nothing else reads it.
