# The exam — draft from four weeks of calendar (13 Aug – 10 Sep 2026)

Drafted by reading 84 calendar events (titles, dates, attendees), then writing each
question the way a person would ASK, never the way a meeting was TITLED. Where a client
or system name is unavoidable it is used as a person would say it, including the owner's
own misspellings. Personal events were used only to write fence and refusal rows.

**Not yet done, and Lane E must do it after the re-index:** key every row to the source
id(s) that answer it. Until then a row is graded by hand. Grading is deterministic
(is the keyed source in the shortlist); no model judges.

Tags: `para` paraphrase · `exact` reference/number · `count` needs a tool · `latest`
recency · `multi` two sources joined · `person` about a colleague/contact · `de` German ·
`fence` permission · `absent` must refuse · `hijack` ordinary word that is also a name ·
`route` should read a live record · `synth` across many sources.

Levels: **E** easy (one source, direct) · **M** medium (paraphrase, no title) ·
**H** hard (joins, time, cross-project) · **X** adversarial.

---

## The owner's eight (mandatory, verbatim)

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| O1 | How does a chemist get reimbursed for a jab? | para | FluClinic redemption/payout material (API guide, process map, sprint notes) |
| O2 | What did we agree with Asekurans about the extraction transcript? | para, de-name | Assecuranz extraction-script meeting, 2 Sep |
| O3 | What are the latest 10 to 15 rules on the HOGO HORST matching? | latest, synth | HORST matching meetings 13 Aug, 25–26 Aug; HOGO chat |
| O4 | What was the latest bug with flu clinic? | latest | Most recent FluClinic sync/fix (10 Sep parallel workflows) |
| O5 | What is happening with Paddlebase? | latest, synth | Padelbase syncs 1–9 Sep |
| O6 | How many days in advance can trainers book trainings? | exact | Padelbase workflow/ticket material |
| O7 | How many apps does Paddlebase have? | count, route | App records tool, not passages |
| O8 | How does the knowledge base work in the Kwapso system? | para | The app's own seeded documentation |

---

## E · Easy — one source, asked plainly

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| E1 | What was decided about changing the Stripe webhook for the flu vouchers? | para | FluClinic Stripe webhook meeting, 25 Aug |
| E2 | Did the Stripe integration pass QC? | para | FluClinic Stripe QC, 27 Aug |
| E3 | What did the September sprint for HOGO include? | para | HOGO September sprint, 27 Aug |
| E4 | What was discussed at the Platinum kick-off? | para | Platinum kick-off, 1 Sep |
| E5 | What is in the Platinum scope and build plan? | para | Platinum scope + build plan, 7 Sep |
| E6 | What cost-saving measures were deployed for HOGO? | para | HOGO cost-saving deploy, 4 Sep |
| E7 | What is the WFC workflow being ported for Padelbase? | para | Padelbase WFC porting, 9 Sep |
| E8 | What went wrong with the parallel workflows at FluClinic? | para | FluClinic parallel workflows fix, 10 Sep |
| E9 | What is the process for taking on a new insurance client? | para | Assecuranz process map |
| E10 | What did the quarterly goal-setting produce? | para | Quarterly goal setting, 28 Aug |
| E11 | What feedback did the team give on the CPAA? | para | CPAA feedback, 19 Aug |
| E12 | What are the speed-related tickets for HOGO about? | para | HOGO speed tickets, 18 Aug |
| E13 | What was the client-selectable data discussion for the flu clinic? | para | FluClinic client selectable data, 18 Aug |
| E14 | What does the Rest-o sync with Claude cover? | para | Rest-o Claude sync, 17 Aug |

## M · Medium — the same facts without the words the documents use

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| M1 | Who is responsible for organising the monthly get-together? | para | Team Assembly, 19 Aug |
| M2 | What did the team agree about horsepower and specialisation? | para | Week recap, 14 Aug |
| M3 | How do we decide whether a step in a process is worth automating? | para | kwapso processes meeting, 26 Aug; process chat |
| M4 | What did people say about spacing and components in our UI kit? | para | CPAA feedback; UI/UX email thread |
| M5 | How do we plan to make candidate CV uploads faster for the recruiting client? | para | HOGO CV upload optimisation, 1–2 Sep |
| M6 | What is the matching score threshold we tested for the recruiter? | para, exact | HORST matching test run, 25 Aug |
| M7 | What did the errors in the recruiter's matching system turn out to be? | para | HORST errors, 13 Aug |
| M8 | What does the flu clinic do in phases two and three? | para | FluClinic phase 2/3 sync, 14 Aug |
| M9 | What was agreed with the pharmacy client about which fields they can pick themselves? | para | FluClinic client selectable data |
| M10 | What did the two people from the outside strategy session want from us? | para, person | Strategy session w kwapso, 25 Aug |
| M11 | What did the internal system review find? | para | System internal review, 27 Aug |
| M12 | What were the open points after the Platinum next-steps call? | para, latest | Platinum sync + next steps, 9 Sep |
| M13 | How did the joint FC2Y and HOGO sync go? | para | Team FC2Y + HOGO sync, 1 Sep / 24 Aug |
| M14 | What was the cross-check between us and the flu clinic about? | para | FC2Y cross check, 10 Sep |
| M15 | What did the Padelbase ticket discussion decide? | para | Padelbase ticket discussion, 1 Sep |
| M16 | Which tasks were reviewed for the flu clinic this week? | para, latest | FluClinic review of tasks, 8 Sep |
| M17 | What was set up for Claude to talk to GlideOS? | para | GlideOS MCP setup, 24 Aug |
| M18 | What did we discuss in the Jourfix? | para | Jourfix, 4 Sep |
| M19 | What is ticket #1636 about, and where does it stand? | exact | Real Kwapso ticket, ref T1644: "Ticket #1636 - Customer signature not visible", resolved |
| M20 | What happened in the last flu-clinic sprint of August? | para, latest | Aug sprint final, 21 Aug |

## H · Hard — joins, time, and more than one project

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| H1 | Across all clients, what did we ship in the first week of September? | synth, latest | Week planning 31 Aug + recap 4 Sep + client syncs |
| H2 | What changed between the Stripe webhook plan and what was actually tested the next day? | multi | 25 Aug plan vs 26 Aug test |
| H3 | Which client meetings did Aurora attend in the last two weeks, and what did she commit to? | person, synth, count | Calendar + transcripts (fence: only what the asker may read) |
| H4 | What did Ishita say about HORST matching, and did it match what Chilavert found in the flu clinic tests? | multi, person | HORST meetings + FluClinic QC |
| H5 | What has Platinum asked for that we have not yet scoped? | multi, latest | Kick-off vs scope plan vs next steps |
| H6 | Compare the week-planning on 31 August with the recap on 4 September: what slipped? | multi, latest | Both transcripts |
| H7 | Which HOGO problems from mid-August were still open at the September sprint? | multi, latest | 13–18 Aug HOGO + 27 Aug sprint |
| H8 | What did we tell Padelbase we would review, and did we? | multi | Padelbase syncs 2–4 Sep + review 8 Sep |
| H9 | How did the flu clinic's sprint numbering go from 3 to final, and what was each about? | synth | Aug sprint 3, 3.5, 3.75, 4, pre-final, final |
| H10 | What are the recurring themes in the week recaps this month? | synth | Four recaps |
| H11 | What did the quarterly goals say, and which of them did the Jourfix a week later touch? | multi | 28 Aug + 4 Sep |
| H12 | Who worked on both HOGO and the flu clinic in the same week? | person, count, route | Calendar attendees / work logs |
| H13 | What did we decide about the recruiter's maths, over the two sessions? | multi | HOGO x Claude math pt 1 + pt 2 |
| H14 | What is the newest thing we know about Padelbase's workflows? | latest | 9 Sep porting |
| H15 | Which decisions were made on 25 August across all clients? | synth, exact | Five meetings that day |

## X · Adversarial — the ones that used to break it

| # | Question | Tags | Expected behaviour |
|---|---|---|---|
| X1 | What solutions have we proposed for data import? | hijack | Must NOT narrow to “VU Solutions”; answers from HOGO/Assecuranz import material |
| X2 | Which parts of the product are green and ready to ship? | hijack | Must NOT narrow to “re-green”; answers or refuses honestly |
| X3 | What has Markus been working on? | hijack, person | Resolves Markus as a person or refuses; never quotes an account stub |
| X4 | What did we agree about the Singapore office lease? | absent | Refuse |
| X5 | What is our parental leave policy? | absent | Refuse |
| X6 | What is the capital of France? | absent | Refuse |
| X7 | What did the external penetration test conclude? | absent | Refuse |
| X8 | When is pickleball this week? | fence | Owner asking: may answer from his private calendar. Aurora asking: refuse (private-shelf event) |
| X9 | What did Alaap discuss at dinner on the 14th? | fence, absent | Refuse for everyone — private event, no transcript |
| X10 | How many open tickets does HOGO have right now? | count, route | Exact number from the ticket tool, list as receipt |
| X11 | Which client has the most tickets? | count, route | Tool path, never passages |
| X12 | How many meetings did we have with the flu clinic in August? | count, route | Meeting records, exact |
| X13 | What is Alex's full name? | person, exact | Person record |
| X14 | Who is Chilavert and what does he work on? | person, synth | Person record + his meetings |
| X15 | Is Paras from the flu clinic opening new tickets? | person, route, hijack | Resolve Paras → contact; ticket tool; if no such person, say so |
| X16 | Whats happening with Assecuranz (spelled Asekurans) | para, de-name | Name index resolves misspelling |
| X17 | Tell me about the Paddle base client | para | Resolves “Padelbase” |
| X18 | What did we agree in the week recap? | para | Answers — but no duplicate passage from the same meeting twice |
| X19 | Summarise the Team Assembly | para | Answers from the transcript, not from six future calendar placeholders |
| X20 | What are the recurring complaints across our clients? | synth | Answers from tickets/meetings or says the base cannot support the generalisation — never refuse outright with 400 tickets present |

## DE · German — half the material is German

| # | Question | Tags | Should be answered by |
|---|---|---|---|
| D1 | Wie läuft der Prozess für die Schadensmeldung ab? | de, para | Assecuranz damage process |
| D2 | Was wurde über die Vollmacht besprochen? | de | Assecuranz chat / process |
| D3 | Was haben wir mit Assecuranz zum Extraktions-Skript vereinbart? | de, para | 2 Sep meeting |
| D4 | Wie werden Gutscheine an eine Apotheke ausgegeben? | de, para | FluClinic voucher process (answer in app language) |
| D5 | Was ist der aktuelle Stand bei Platinum? | de, latest | Platinum 9 Sep |
| D6 | Wie viele offene Tickets hat HOGO? | de, count, route | Ticket tool |
| D7 | Wer organisiert das monatliche Teamtreffen? | de, para | Team Assembly |
| D8 | Was wurde beim Kick-off mit dem neuen Kunden besprochen? | de, para | Platinum kick-off |
| D9 | Gibt es eine Regelung zur Elternzeit? | de, absent | Refuse |
| D10 | Was ist die Hauptstadt von Frankreich? | de, absent | Refuse |

---

**Counts:** owner 8 · easy 14 · medium 20 · hard 15 · adversarial 20 · German 10 = **87 rows**.
Refusal rows: X4–X7, X9, D9, D10 (+ X8 for a non-owner) — must score 100%.

**Owner approval:** strike any row, add any question you have actually asked, and mark
the ten rows that must pass no matter what. Lane E keys the source ids after re-index and
the first full run sets the baseline.
