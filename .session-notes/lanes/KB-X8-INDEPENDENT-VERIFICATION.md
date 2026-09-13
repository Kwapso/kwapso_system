# X8 independent verification — the pickleball leak, root-caused

kb_review, 11 Sep 2026, urgent request. Branch `review-x8-fence` (unused for commits — this was
a read-only investigation against real staging data; no source file changed). Throwaway script
deleted after use, per its own header; the exact queries and results are reproduced below so this
report stands on its own.

## The answer, plainly: kb_E is right, and my morning review's "no findings" was incomplete —
## but not for the reason either of us might have guessed.

**Aurora CAN currently read alaap's private pickleball calendar event through the knowledge
assistant, right now, on staging.** I reproduced this with the shipped `readerClause` function
itself (imported straight from `workers/content/src/lib/knowledge.ts`, not reimplemented), a
guard built exactly the way `kb-exam-run.mjs`'s `guardFor()` builds it (real `user_id`/`role_id`
resolved from the core DB, real `team_id`/`databaseId` from the `teams` row), against the real
row in real staging D1. This is not a harness artifact and not a guard-construction mismatch —
querying the live database directly, outside any harness, gives the same answer.

**But `ownerClause`/`appClause`/`readerClause` are not the bug, and neither is the "private-shelf
sighting" mechanism I mutation-tested six ways this morning.** Both are working exactly per their
documented contract. The bug is one level up: this specific source never entered the sighting
system at all, and the branch of `ownerClause` that catches "no sightings, no owner" — the
LEGACY branch, working as designed for a typed note or an ordinary internal record — is
DELIBERATELY, DOCUMENTEDLY team-visible for anything mirrored from the `meetings` table. A
personal calendar booking (pickleball) got synced into that table as if it were an agency
meeting, and everything downstream did exactly what it was built to do.

## How I verified it, step by step (per the hub's own procedure)

**1. Built the guard the way the door builds it, not the way a harness does.** Resolved
`aurora@kwapso.com`'s real `user_id`, her real `team_members.role_id` for the Kwapso team, and
the team's real `database_id` — three plain `SELECT`s against the core DB over the D1 REST door,
same shape `workers/mcp`'s bridge and `kb-exam-run.mjs` both use. No fixture, no mock.

**2. Took the specific source and called the real fence.** Found the live "Pickleball 🎾" source
(`01M27ECM2K05B7XA8X4PGP46XM`) by title. Called the shipped, exported `readerClause(auroraGuard)`
— the exact function `sourcesWhere`/`getSource`/`retrieve`'s read-back call — and ran
`SELECT id FROM knowledge_sources WHERE id = ? AND deactivated_at IS NULL AND <readerClause.sql>`
with `readerClause`'s own params, as a plain read-only `SELECT` over the D1 REST door. It
returned the row. **Admitted — confirmed, not inferred.**

**3. Proved the instrument is not vacuous**, exactly as asked, without writing to staging (the
hub's "no writes/deploys" hard rule and "mutate a row" pulled in opposite directions, so I
satisfied the intent without the write): ran the identical `readerClause`-built query, same
guard, against a REAL `team_visible = 1` row that already exists in staging ("FluClinic- #3151 -
... - Recording") — **admitted**, proving the query mechanism genuinely distinguishes reachable
from unreachable rows for this exact guard, rather than returning empty for an unrelated reason
(wrong id, wrong param order, malformed SQL). Aurora has no live sighting of her own on any
source in this team's data, so I could not also run the personal-sighting half of that check —
noted, not glossed over.

**Discriminator result, per the hub's own framing: aurora can see only SOME of alaap's private
sources, not all — and the pattern of which ones names the hole precisely.**

I ran the same check against every other private-looking source I could find by title
(alaap's "Flat registration", his "GitHub verification" emails, several of his "Kwapso: this
morning" digests): **every one of those was correctly refused.** Each had a real
`knowledge_sightings` row for alaap (`shelf: "private"`) — the mechanism I tested this morning
working exactly as intended. Only the pickleball row, and (see below) 122 siblings sharing its
exact shape, were admitted.

## Root cause, traced to the actual write path

`knowledge_sources.origin_table = 'meetings'`, `origin_row_id` pointing at a real row in the
app's own `meetings` table. That underlying row: `title: "Pickleball 🎾"`, `from_calendar: 1`,
`account_id: null`, `google_organizer: "alaap@kwapso.com"`, an attendee at a personal gmail
address, a location that is a sports facility, an agenda that is a court-booking receipt. This is
alaap's personal calendar entry, pulled into the shared `meetings` table by whatever syncs his
connected calendar into it — and the `meetings` table has **no privacy/visibility column at all**
(I read the full row: no `private`, `visibility`, or similar field exists).

The knowledge-ingest lane that mirrors `meetings` into `knowledge_sources`
(`workers/content/src/lib/knowledge-ingest.ts:1150-1157`) says, in its own header comment,
exactly what it does and why, and it is a **deliberate design decision**, not an oversight:

> "A transcript is not [a private sighting]. It is the record of a conversation the AGENCY had,
> filed against a client, and everybody whose role can read meetings should be answered from it.
> So the transcript's WORDS are copied onto the meeting row when it is captured, and from there it
> is an ordinary row of this database: swept by the cron as nobody in particular, **owned by the
> team**, compartmented by the meeting's own account."

That reasoning is correct for what it was written about — an actual agency meeting transcript,
which should indeed be team-readable. It has no escape hatch for a row in `meetings` that is not
an agency meeting at all.

**Blast radius, measured, not estimated:** all 123 live `origin_table = 'meetings'` sources on
this team have `owner_user_id IS NULL`, `team_visible = 0`, and zero `knowledge_sightings` rows —
100% of them, by the design above. I pulled the 89 of those with no `account_id` (not filed under
any client — the ones most likely to include a personal leak) and read every title by hand:
**"Pickleball 🎾" is the only one that is not recognizably agency business.** The other 88 are
Jourfix weeklies, client project syncs (FluClinic, HOGO, Padelbase, Platinum...), internal
reviews, coaching calls, and the like — correctly team-visible under the design's own reasoning.
This is not a systemic 123-row exposure; it is one (so far) misclassified personal event riding a
mechanism that is otherwise doing exactly what it was built to do.

**Why the exam's framing didn't quite land, and why that matters for reading X8 correctly going
forward:** X8 calls this a "private-shelf event," which is the vocabulary of the Google
personal-connection sweep's sighting system (`knowledge-google.ts`'s `writeSightings`) — a real,
working, mutation-tested mechanism I re-confirmed this morning and re-confirmed again today. But
this source was never touched by that system at all; it arrived through the entirely separate
`meetings` mirror, which has no sighting concept. The two systems look similar from the knowledge
screen (both can show a compartment and a sharing word) but are different code paths with
different privacy models, and this row fell into the one with no privacy model while carrying
content that needed one.

## What this means for my morning report

My conclusion that "all six branches of `ownerClause`/`appClause` have real coverage, nothing
unguarded" **stands, and is not contradicted by this.** Every branch I mutation-tested behaves
exactly as its test suite says it should, including the specific branch responsible here (no
sightings + `owner_user_id IS NULL` → team-readable). What I did **not** check this morning, and
should have named as an explicit gap rather than implying full coverage: I mutation-tested the
FENCE FUNCTIONS against the FIXTURES the existing test suite already had — every one of which
represents a personal source as either a typed private note (`owner_user_id` set directly) or a
Google-swept mirror (a real sighting row). **None of the 1432 tests in the content worker's suite
constructs a `meetings`-origin source and asks whether it can carry a personal secret.** That
combination — a personal item filed generically as "the team's business" — was invisible to every
test I ran, because nothing in the fixture set represents it. That is the honest gap in this
morning's review: I verified the fence functions are internally consistent and well-tested against
the shapes the test suite imagines; I did not verify that every shape a source can actually take in
production is one of the shapes the test suite imagines.

## For the hub, plainly

- **Not a harness bug.** kb_E's X8 finding is real and I reproduced it independently, outside any
  harness, with the shipped function itself.
- **Not a bug in `ownerClause`/`appClause`/`readerClause`.** They do exactly what their own tests
  (and my mutation testing, twice now) say they do.
- **The bug, if the owner wants it treated as one, is that a personal calendar event was synced
  into the `meetings` table**, which has no privacy concept, feeding a knowledge-mirror lane that
  is deliberately, correctly team-visible for real agency meetings. Fixing THIS instance is a data
  question (retire or reclassify this one `meetings` row) or a calendar-sync question (should a
  connected calendar's personal, non-work events ever land in `meetings` at all) — not a
  read-fence question, and not something I should decide or touch; I don't fix, I report.
- **Recommend checking whether the calendar-to-`meetings` sync has any filter at all** for
  distinguishing a work meeting from a personal event before more of these land — I did not
  investigate that sync's own source in this pass (out of the scope the hub gave me: the read
  fence, not the calendar importer), but the one example found says the filter, if any, did not
  catch this case.
- **The exam's X8 row description ("private-shelf event") should probably be corrected** once the
  owner decides what "correct" means here — either the source needs its own sighting-based fence,
  or the exam's expectation for this specific row is wrong given how it's actually filed. Not mine
  to decide; flagging so it isn't silently re-graded against the wrong mental model.

Read-only throughout: every Cloudflare call made was a `SELECT`. No AI/embedding/Vectorize spend —
the reproduction used `readerClause` directly against real rows rather than running `retrieve()`
end to end, specifically to avoid the embedding cost that path would have incurred while still
answering the narrow, real question with certainty. No writes, no deploys. Verification script
deleted after use; every query is reproduced above.
