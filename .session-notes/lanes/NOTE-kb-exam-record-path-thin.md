# NOTE — the exam barely tests the record-tool path

**Lane** `kb_E` · branch `fix/kb-exam-keys` · 2026-09-11.

The union (`.plans/KB-EXAM-UNION.md`, 100 rows) is almost entirely meeting-transcript-keyed.
Three rows *look* like they answer from a ticket/account/sprint/app record and don't:

- **A-O6**, **A-M15** — question says "ticket discussion," but the detail resolves to a
  *meeting transcript* titled that (Padelbase: Ticket discussion, 1 Sep). Not a ticket lookup.
- **A-M19** — its own detail disclaims the "ticket record" mention as a non-competing source;
  the row is a `gap`, keyed to the meeting's own (absent) transcript.

**What actually is route/record-tool** — tagged `count` in the union, which `classifyByTags`
sends straight to disposition `tool` regardless of any other tag:

| id | asks for |
|---|---|
| A-O7 | app records count (Paddlebase) |
| A-X10 | open-tickets count (HOGO) |
| A-X11 | which client has the most tickets |
| A-X12 | meeting-records count (FluClinic, August) |
| A-D6 | open-tickets count, German |
| A-H12 | who worked both HOGO + FluClinic (route + fence) |
| A-H3 | Aurora's meetings + commitments (`count`, no `route`; fence) |

Seven rows, and every one is disposition `tool` — `grade()` returns `{scored:false}` for
`tool`/`struck`, so **none of these are scored by `kb-exam.mjs`/`kb-exam-run.mjs` at all**,
now or after the rebuild. They're "mandatory but elsewhere graded" per the exam's own
classification, but nothing in this repo currently names *what* elsewhere grades them.

Net: the record-tool door (tickets/accounts/apps/meetings-as-a-list) has a 7-row presence in
the exam and zero rows actually scoring it. If that door regresses, this exam is silent about
it.
