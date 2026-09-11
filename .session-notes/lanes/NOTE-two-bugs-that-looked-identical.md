# A-X9: two refusal bugs that presented identically, and only one is fixed

**12 Sep 2026.** The exam's refusal ceiling is **6/7**, not 7/7, and the reason is
worth writing down properly because two different faults produced the same
symptom all night: *the base answers a question it holds nothing about.*

## The one that IS fixed — a scoring fault

```
"What is the capital of France?"          top-1 0.335
"What did the penetration test conclude?"  (same shape)
```

Both best matches were genuine noise. `READER_HALLUCINATION_FLOOR` was 0.3, so
both entered the reader's pool; the moment the reader became a model that
finishes its replies, it was handed twelve unrelated passages and picked one.
Raising the floor to **0.4** drained exactly that band and fixed both — the
second one for free, nobody asked for it.

## The one that is NOT — a judgment fault

```
"What did Alaap discuss at dinner on the 14th?"   top-1 0.466
cites: Padelbase: Review - 2026/09/11
```

**No floor can fix this, and here is the proof:**

```
A-M1  0.444   must be RESCUED   (the row the reader exists for)
A-X9  0.466   must REFUSE
strict floor  0.500
```

**A-X9 scores HIGHER than the row that must pass.** Any floor that refuses X9
kills M1. More data points will not change that; the instrument is wrong.

**What it actually is.** `dinner` appears in **ZERO chunks** of the entire
corpus. `alaap` appears in **4,976**. So the retrieved passage is a REAL passage
about the RIGHT PERSON on approximately the RIGHT DAY — it is simply not about a
dinner, because no dinner is recorded anywhere. The reader was asked "is this
about Alaap, around then?" and correctly answered yes.

## The attempt that missed, and why it is not being retried

One instruction was added to `readerSystemPrompt()`
(`fix/kb-reader-same-person-same-day` @ `45333077`, **not merged**):

> A passage is NOT evidence merely because it names the same person as the
> question or falls on the same date. If the question asks about a specific
> EVENT — a meeting, a dinner, a call — the passage must be about THAT event,
> not about the same people on the same day.

Measured, one attempt, three rows: **A-M1 still rescued, A-X6 still refuses,
A-X9 unchanged — same passage, word for word.** So it cost nothing and bought
nothing measurable.

**It was agreed IN ADVANCE that a miss would not be re-worded.** A prompt tuned
in three passes against three rows is a prompt fitted to noise, and the branch is
left unmerged for the same reason: shipping it would mean shipping a change whose
only evidence is that it did not break anything.

## What I thought would close it — MEASURED, AND IT IS WRONG

The idea written here first was: **a content word from the question that appears
in ZERO chunks.** "dinner" is not a rare word, it is an ABSENT one, and absence
is a different fact from rarity — one FTS count, no spend.

**It would have broken a question that works.** Measured against the live corpus
before anybody built it:

```
A-X9  "…discuss at dinner on the 14th?"     dinner=0                    would refuse ✓
A-O2  "…agree with Asekurans…?"             asekurans=0 (a known name)  excludable ✓
A-O1  "How does a chemist get reimbursed?"  chemist=0  reimbursed=0     would REFUSE ✗
```

**A-O1 is one of the owner's own eight, and it was proved working four hours
earlier** — it answers out of the voucher material, which never uses the words
"chemist" or "reimbursed" at all. It says "pharmacy" and "voucher".

That is not a flaw in the rule's implementation. **It is the rule contradicting
the thing semantic search is FOR.** A question that shares no words with the
material it should find is the paraphrase case — the entire reason the reader
exists, and the exact category (`para`, 23/28) this rebuild spent the day
fixing. A zero-count rule would refuse the best answers this base gives.

The known-name exclusion rescues A-O2 and does nothing for A-O1, because
"chemist" is not a name and never will be.

**So: no cheap fix. A-X9 stays open, and the next person should NOT start here.**
The honest shape of the remaining problem is that the retrieved passage is REAL,
about the RIGHT PERSON, on approximately the RIGHT DAY, and the only thing wrong
with it is that no dinner happened — which is a fact about the world that
nothing in the corpus records, because corpora record what DID happen.

Anyone picking this up should start by asking whether that is a retrieval
problem at all, rather than a question the writer should be answering with "I
can see what Alaap was doing around the 14th, but nothing here mentions a
dinner" — which is the `d-thin` behaviour the base already has, and already
does well.
