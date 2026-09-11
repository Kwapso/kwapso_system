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

## Where each spelling came from — the owner's own words, not ours

`.plans/KB-EXAM.md` was drafted from four weeks of his real calendar and predates
this seed by hours. Both spellings are rows in it:

- **X17** — *"Tell me about the Paddle base client"* — the Paddlebase case.
- **X16** — *"Whats happening with Assecuranz (spelled Asekurans)"* — the
  Asekurans case. Its own expected-outcome column already reads *"Name index
  resolves misspelling"*, which is exactly the capability this seed makes real.

Neither was invented to justify the feature. (Traced by kb_CD.)

## The trap: an alias must be ONE token

`accountsNamedIn` confirms a match with `asked.has(alias)` against the question's
own tokenised words. **A multi-word alias can never match anything.** The first
seed carried `"Paddle base"` and `"Padel base"` and both were dead weight on
arrival — silently, because nothing fails when a row simply never matches. They
were removed in the same session. Single tokens only.

**And this is a gap in `rebuildNameIndex`, not only a seeding-time gotcha**
(kb_CD's point, and it is the right reading). Nothing refuses a multi-word
`alt_names` entry anywhere. It is written into `knowledge_names` as an ordinary
row that can structurally never match, and sits there dead for ever with nothing
telling anybody. Today that is survivable because the only writer is a person
typing SQL by hand. **The day a write door lets somebody type an alias free-hand,
that door owes two refusals, not one:** a multi-word entry, and a common word
(the `c-hijack` failure in miniature — an alias skips the rarity gate, so
"solutions" declared as an alias would narrow every question that used the word).
Carry both into whatever builds the `alt_names` write door.

## How the data reaches the router

`alt_names` is a column on `accounts`; the router reads `knowledge_names`.
`rebuildNameIndex` (knowledge.ts:2917) is what carries one into the other, and
seeding the column alone changes nothing until it runs.

**This paragraph said the wrong thing for an hour, and the correction is the
useful part.** It read: "runs unconditionally on every `POST
/api/content/knowledge/sync` — so the 15-minute cron picks a new spelling up
within one tick." The first half is true. The second does not follow, and kb_CD
said so: **the cron does not press that door.** The scheduled handler
(`workers/content/src/index.ts`) calls `sweepAll` and `revisitUnhealthySources`
directly and, until this was fixed, never touched the name index. So the only
tick that happens without a person was the one tick that did not rebuild it, and
a declared spelling would have sat in the column doing nothing until somebody
opened the app and pressed "bring it up to date".

Measured, which is how it was caught rather than argued: `knowledge_names` stayed
at **184 rows** across cron ticks after the seed, still carrying only
`padelbase`/`assecuranz` (each account's `code`) and neither new alias.

**Fixed** in `fix/kb-cron-rebuilds-names`: the scheduled sweep rebuilds the name
index in the same tick, and `name-index-rides-every-sweep.test.ts` asserts BOTH
entrances do — a source census rather than a mock, because what is at stake is
whether both call sites exist, and a stub would only prove that a handler we
wrote calls a function we wrote.

The failure has no symptom, which is why it needed a test rather than a watch: a
question about a misspelled client still ANSWERS. It just answers without
narrowing to the client the person named, which reads as an ordinary broad
answer.

## To undo

`UPDATE accounts SET alt_names = '[]' WHERE id IN (…)`, then one sync. The
column's default is `'[]'` and nothing else reads it.


## The prediction, written down BEFORE the check (kb_CD, 11 Sep)

Recorded here so the verification is a test and not a reading. Traced from
`deriveCompartment` (knowledge.ts:2596–2637), not guessed.

Ask: **"What is happening with Paddlebase?"**

- `reason` — *"The question names Padelbase, so I searched Padelbase's material
  and the agency's own."*
- `compartments` — `["account:01KZXBSQH1T9ZG4WZPF3YTE3NA", "agency"]`

**The load-bearing detail is that it must say `Padelbase`, not `Paddlebase`.**
Line 2621 reads `named[0].name`, and on an alias-row match `accountsNamedIn`
builds `{ id: c.ref_id, name: c.alias_of }` — `name` is the CANONICAL spelling,
always, never the alias text the question used. So the question says one thing
and the sentence the person reads says the spelling on their own account record.

**If the output names the ALIAS back, that is not a smaller version of the same
win — it is a different code path having fired** (most likely the vector arm's
"covers" advisory naming something in prose rather than the compartment
decision). Tell those apart; do not settle for "the sentence contains Padelbase
somewhere".

Same shape for **"What did we agree with Asekurans?"** — the reason must say
**Assecuranz**.
