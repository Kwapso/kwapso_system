# REPORT — the English/German exam pair (A-M1 / A-D7): what actually happened

**Lane:** kb_B2. **Branch:** `investigate/kb-english-german`, off `origin/main` — no code changed; `git diff origin/main` is empty for this branch.
**Method:** real `retrieve()`, real Vectorize (staging), real bge-m3 embeddings, real D1, `compose` never invoked. Instrumented `retrieve()` with temporary diagnostics, ran both questions, captured output, reverted before this note was written.

Two exam rows ask the same real-world question about the same source and disagree:

```
A-M1  "Who is responsible for organising the monthly get-together?"   REFUSED   (found: false)
A-D7  "Wer organisiert das monatliche Teamtreffen?"                    ANSWERED  (cited "🧡 Team Assembly")
```

The hub's hypothesis going in: German's `teamtreffen` is one compound token carrying the whole concept; English splits it into `get`/`together`, and the term floor treats the two term lists differently. **Measured and refuted** — the mechanism was never in reach of that theory.

## What actually decided it

```
A-M1  top1=0.44392  floor=0.5  role=overruling  vector.hits=0  lexical.hits=0  termFloor=4  → fused.length=0 → REFUSED
A-D7  top1=0.50351  floor=0.5  role=beside      vector.hits=2  lexical.hits=0  termFloor=3  → fused.length=2 → ANSWERED
```

`lexical.hits = 0` for **both** questions. The word arm never returned a single chunk for either one, so `termFloor`, term dilution, and the specific tokens in each question's term list could not have caused anything — they never got a turn. The entire divergence is the vector arm, and it turns on a difference of **0.0596** in cosine similarity between two questions asking the same thing in two languages.

The source chunk both questions are fighting over is written in **English** ("remote team bonding sessions were established via monthly rotations… Remote team assembly strategy…"). The German question scored *higher* against this English text (0.5035) than the English question did against the same text (0.4439). This is bge-m3's cross-lingual embedding geometry, not tokenisation, not stopwords, not the lexical arm. Neither the hub nor this lane can explain *why* the model judges the German phrasing closer — flagged as an open, unexplained fact rather than a guessed one.

## Finding 1 — the floor is a cliff, not a slope

`MIN_VECTOR_SCORE = 0.5` decides `found` outright once the lexical arm is silent (the `overruling`/`blind` roles read `role !== "beside"` off `vector.length`, which is itself `hits.filter(h => h.score >= floor)`). There is no partial credit and no second look: a question scoring 0.4964 and one scoring 0.5036 get *opposite, total* outcomes — one a full citation, the other a flat refusal — for a difference too small to mean anything semantically.

`termFloor`'s own header (knowledge.ts, the `LexicalRole` block) already measured the shape of this on `kb-bench.mjs`'s 20 questions: the 16 answerable ones "top 0.502", the 4 refused ones "top 0.471". A-D7 (0.5035) sits barely inside the answerable band by less than the width of that gap; A-M1 (0.4439) sits well below even the refused band's own ceiling. So this particular pair is not "German wins" — it is one question landing a hair on the right side of a threshold that treats "just above" and "comfortably above" identically, and "just below" and "nowhere close" identically. Worth the owner knowing as a **property of the design** — every either/or decision built on a single continuous score has this shape somewhere — not a bug to patch reactively on one pair.

**Not fixed. Not proposing a fix.** A softer floor, a second band, or a reader-rescue path (already being built by kb_E, separately, off this same finding) are all real options; picking one is a ruling, not a measurement.

## Finding 2 — no German stopword list exists at all

`workers/content/src/lib/knowledge-text.ts`'s `STOPWORDS` (~90 words: "the a an and or but if then…") is English-only. There is no second list for German, or for any other language. Confirmed by reading the source, not inferred.

**This did not cause A-M1/A-D7's divergence** — the lexical arm never fired for either question, so no stopword list, English or German, had anything to filter that mattered here. Say that plainly rather than let the finding imply more than it measured.

**The condition under which it WOULD start to bite:** any question whose lexical arm actually engages (role `beside` with an exact term, or `overruling`/`blind` where the vector arm is silent and the word match has to carry the answer alone) and whose German phrasing survives tokenisation with a function word like `das`, `wer`, `die`, `und`, `ist`… still counted as a "term". Every one of those inflates the term list `termFloor` divides its proportional share out of, exactly the mechanism the hub's original hypothesis described — just not the mechanism that fired in this pair. Half this team's material is German; a future German question that DOES reach the lexical arm — most likely one whose vector score falls short and role becomes `overruling`, the strictest floor, where every point of term-list dilution costs the most — is where this asymmetry would show up for real. Worth a bench question built specifically to reach that arm before it is found live.

**Not fixed. Not proposing a fix.** Whether the answer is a German stopword list, a shared multilingual one, or something else is a design decision this note does not make.

## What this measurement changed

The exam does not run the reader (`grep -n "read:" scripts/kb-exam-run.mjs` — nothing). A-M1 at 0.444 is exactly the shape the reader (BUILD-5 §5-6) exists to rescue: a question sitting under the hard floor that a second, cheap look could still answer correctly. Every exam number produced so far was measured with that feature switched off. kb_E is building a reader-mode run of the exam off this finding.
