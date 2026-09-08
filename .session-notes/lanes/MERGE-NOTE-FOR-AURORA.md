# What happened to feat/ui-ux

**8 Sep 2026. `feat/ui-ux` is merged into `main` and pushed. Your branch is not
gone and nothing was rewritten — both merges are true merge commits with your
tips as parents, so `git log` still shows all 58 of your commits under their own
messages, and `git blame` still points at you.**

- `1019548b` merges `513b96d3` (your 57 commits) into `9330de93` (main's 92).
- `cb506f7a` merges `da06bbc1`, the kit-conformance commit you pushed while the
  first merge was being resolved.
- `origin/main` is at `cb506f7a`. `npm run check` exits 0.
- The design kit went **v1.2.69 → v1.2.70**, one tag past yours.

Everything below is a decision somebody took on your behalf, with the reason, so
you can disagree with any of it on the evidence rather than on my summary.

---

## 1 · The one thing you most need to know: your law numbers won, main's moved

Both branches minted an **R52, an R53 and an R54**. Six different laws under
three numbers, and they cannot coexist — `registry-integrity` forbids a duplicate
id, and the two families live in one array.

**Yours keep their numbers.** R52 `record-title-treatment`, R53
`toolbar-slot-set`, R54 `staff-names-are-first-names`, R55
`refs-match-the-formula` are untouched, and so is every one of the 148 places
across 39 files where your code comments name them.

**Main's three moved up:**

| was | is now | check |
|---|---|---|
| R52 | **R56** | `one-door-per-unit` — a component asks a door once |
| R53 | **R57** | `component-folders` — `web/components` is one folder per module or kind |
| R54 | **R58** | `named-paths` — a path this repo names must resolve on disk |

**Why that way round and not the other.** The registry already had a precedent
for exactly this argument, written when this repo's numbering collided with
brimba's at seven ids: *"Renumbering our seven would rewrite 847 references…
The harm is not to a build; it is to a PERSON who reads 'R24' and cannot tell
which book it came from."* The cure it chose was the smaller rewrite. Counted
here: your four laws are named at **148 sites in 39 files**, most of them code
comments where a wrong number is invisible to every check; main's three at
**14**. So main's moved.

The cost is that some commit messages on both sides are now stale — main's
`test(rules): R52 — a component asks a door once` describes R56, and your
`fix(uniform): … and R52 keeps it that way` still describes R52 and is fine. A
commit message is a record of a moment and was the one thing that could not be
rewritten. The whole argument is written into `shared/rules/registry.ts` beside
`LAW_ID_ORIGIN`, so nobody rediscovers it.

---

## 2 · Where main's rule was taken over yours

Four places. Three are structural and one is a real visual difference you may
want to reverse.

### 2.1 `scripts/sync-design.mjs` — your URL change is reverted

You removed the `alaap-kwapso@` identity from the kit's clone URL, with a good
reason written in the header: a username in the URL forces git to look one
credential up, and when the keychain has nothing filed under it, git falls
through to a password prompt that cannot be answered on a path with no terminal.
That failure was real.

**On this machine the plain URL is worse, and it was measured both ways in the
same minute:** `https://github.com/Kwapso/kwapso-ui-ux.git` lets the machine's
default credential answer, that account cannot see the repository, and the clone
returns `Repository not found` — a 404 that reads like a deleted repo. The
identity URL cloned v1.2.70 on the first attempt. So the identity is back.

**Both findings are kept in the file's header**, and the header now says what the
fault actually is: an unfiled keychain entry, not the username. If it prompts
again, file the `alaap-kwapso` credential rather than removing the identity —
removing it swaps a loud failure for a misleading one.

### 2.2 The attachments panels — main's dedup kept, your change ported

Main refactored `help-attachments.tsx` (298 lines) and `story-attachments.tsx`
(432 lines) into **one** `web/components/records/record-attachments.tsx` behind
two thin wrappers. You had taught both flat files to trim a colleague's name to
their first name — your R54 — in the same week.

Main's structure stands (it is the lean answer and R57 needs the files
foldered), **and your change is ported into the one panel**: `AttachmentRow`
grew an optional `addedByIsClient`, and the row renders
`a.addedByIsClient ? a.addedByName : staffNameFromSnapshot(a.addedByName)`.
That is exactly your two behaviours in one expression — a ticket's files come
from both sides and the row says which; a story's are always ours, so the field
is absent and the trim always applies. Read
`web/components/records/record-attachments.tsx:91` and `:360`.

### 2.3 `meeting-detail.tsx` — `EmptyLine` became `CollectionEmptyState`

**This is the one that is a real visual difference, and it was not a considered
choice — it was git's.** The line

```tsx
<EmptyLine concept="members">{t("Nobody else is on the invitation.")}</EmptyLine>
```

is what your branch draws. Main's first-run lane replaced it with
`<CollectionEmptyState title={…} />`. You never touched that line, so the textual
merge took main's, and the import block was resolved to agree with the body.

If the concept glyph mattered there, put it back — it is one line and no law
objects. Flagged because nobody decided it.

### 2.4 `record-chrome.tsx` — the `RecordMark` import went

Main's lean lane deleted the seven-line `RecordMark` wrapper. Your side kept
importing it while adding `RecordRef` and `RECORD_TITLE_TREATMENT`. Nothing in
the merged file renders `RecordMark` any more (it survives only in comments), so
the import is gone and your two additions stayed.

---

## 3 · Decisions taken on your behalf where main had no opinion

- **`triage-reply-dialog.tsx` is deleted**, honouring your *"the queue stops
  offering two ways out"*. Main's only change to it was the fold rename, and
  nothing imports it.

- **Four of your new components moved into module folders** (R57 — the fold
  landed on main after you branched). No basename changed:
  `activity-rail.tsx` → `records/`, and `reply-composer.tsx`,
  `ticket-stages.tsx`, `tickets-dashboard.tsx` → `tickets/`. Every import,
  literal path and prose reference to them was rewritten with them.

- **Six of your exports lost the `export` keyword**, and one was deleted. Main
  added a `dead-exports` law after you branched and it had never run against
  your code: `workingMsBetween`, `REF_PAD`, `HELP_DASHBOARD_PREFIX`,
  `ticketTypeRank`, `RATING_SCORES` are used only inside their own files, so
  they are file-private now. `REF_TABLE_BY_KIND` (`shared/workers/refs.ts`) was
  unused inside its own file too and is gone — if you meant it for something,
  it is two lines to bring back.

- **Your ticket board got a `TWO_READS_ONE_DOOR` line.** Main's R56 says a
  component asks a door once; your `TicketsCollection` reads `listFetch.helpFacet`
  under two keys, and it is right — `facetQ` is whichever stage tab is open and
  `waitingQ` is the Open board's Waiting column, null-keyed unless the board is
  open, sharing its key with the Waiting TAB so the two can never disagree.
  Collapsing them would make the column count page one instead of the door's
  total. The reason is written into the registry entry, in those terms.

- **The kit is at v1.2.70, not your v1.2.69.** The brief asked for the newest tag
  both sides can share and v1.2.70 existed. It brings `edge-panel`, `sankey`, a
  `--scrim` token, and `foundations/rules/` — which your `da06bbc1` then adopted,
  so the deferral I had written into `KIT_COMPONENT_EXEMPT` was deleted the same
  day, which is the condition its own text named for deleting it.

- **One border of main's was dropped.** `shared/web/live-status.tsx` is main's
  file, so your conformance sweep never saw it, and it drew
  `border-warning/40 border`. Removed rather than translated to an inset
  shadow, because the app had already answered this shape twice:
  `wave-detail.tsx`'s warning strip and `import-screen.tsx`'s error rows are the
  same tinted notice with no outline at all.

---

## 4 · Documents your ruling had reached, and six places it had not

*"Kill all old activity tabs"* had landed in RULES.md's R2 row and in the check
itself — and **six documents were still teaching a newcomer to build the tab you
retired**, including one code example. All six now say what the app does:

| file | what it said |
|---|---|
| `shared/rules/registry.ts` | R2's own one-line `law:` still read *"exposes Overview + Activity tabs"* |
| `CLAUDE.md` | the same sentence, in the Laws list a new agent reads first |
| `documents/BUILD-A-MODULE.md` | four places, including *"Layer 5 … Overview + Activity tabs"* and a "shortest template" claim about `knowledge-detail.tsx` that no longer described it |
| `documents/BASE-MANUAL.md` | the golden-path step |
| `documents/UI-CONVENTIONS.md` | a **code example** with `{ key: "activity", block: { kind: "activity" } }` — a recipe shape the engine no longer draws |
| `documents/LAW-RECONCILIATION.md` | the R2 summary row |

`ROADMAP.md` and `SCREEN-ENGINE-PLAN.md` were left alone: both declare
themselves history.

Also updated: `documents/MCP.md`'s door census (277 → 279 doors, 62 reasons),
`documents/UI-GAPS.md` row 32 (your fix stands; main had only re-pathed it), the
`R1–R55`/`R1–R54` ceilings in README and the three `.plans` files (now R1–R58),
and CLAUDE.md's component counts (148 → 152, `appFiles()` 337 → 349).

---

## 5 · What is still yours to decide

1. **246 untranslated strings, pinned rather than paid.** `TRANSLATION_CEILING`
   is 246 in de, es and ca — re-measured against the merged catalogue, not
   guessed: untranslated-ness is a UNION, so neither main's 217 nor your 240 was
   the merged number, and +6 over yours is main's residue that your branch had
   not already paid. **Nothing here is new copy this merge wrote.** It was not
   cleared inside the merge because 738 entries would bury the 290-file diff
   they rode in on, and every one of them is a sentence somebody should be able
   to read in the commit that introduces it. The arithmetic and that reason are
   both written into the registry. It can only ever fall.

2. **`meeting-detail.tsx`'s empty line** — §2.3 above. One line, your call.

3. **Four kit branches are still unmerged, and NONE of them is redundant.** All
   four sit at v1.2.64 + one commit in `~/kwapso-lanes/kit-upstream-work`, and
   v1.2.70 does not contain any of them — checked by content, not by ancestry:

   | branch | the API it adds | in v1.2.70? |
   |---|---|---|
   | `feat/permission-matrix-offered-rights` | `rights` on `PermissionModule` | no — `permission-matrix.tsx` is **byte-identical** to v1.2.64 |
   | `feat/article-body-quote-register` | second quote register | no — `article-body.tsx` byte-identical |
   | `feat/calendar-more-click` | `onSelectMore` | no — `calendar-view.tsx` byte-identical |
   | `feat/dialog-presentation` | `presentation` prop | no — `dialog.tsx` moved 5 lines between v1.2.64 and v1.2.70 and every one of them is the `--scrim` token; `presentation` and `placement` appear **0 times** |

   **All four rebase onto v1.2.70 with one conflict each, and it is `CHANGELOG.md`
   every time** — the usual both-added-an-entry-at-the-top clash. Every source
   file auto-merges, `components/dialog/dialog.tsx` included. Verified with
   `git merge-tree --write-tree --merge-base=v1.2.64 v1.2.70 <branch>`.

   Three of the four have live consumers in the app already: `PermissionModule`
   (1 site — the matrix R36 is about), `CalendarView` (8), `ArticleBody` (16).
   `onSelectMore` has 0 sites for the reason the branch exists.

4. **The R2 summary wording is mine, not yours.** I wrote the registry's one-line
   `law:` and CLAUDE.md's bullet from your RULES.md row. If they say it wrong,
   they are two edits.

---

## 6 · The rest of the merge, in one paragraph

47 conflicts in the first merge and 2 in the second. **Almost all of the first
were one shape**: main folded `web/components` into fifteen module and kind
folders on 7 Sep, your branch predates that, so your files arrive at the old flat
paths. Git followed the renames for **283 of the 290 files you touched** — the
other seven are the four moved components, the two attachments panels and the
deleted dialog, all named above. Nineteen conflict hunks were pure fold and were
resolved mechanically, by a rule that could prove main had changed nothing else
in the hunk (`fold(base) == ours` ⇒ take yours, with the paths folded). Two
audits ran afterwards, one in each direction, comparing every file each branch
touched against the merged tree: **no change of yours and no change of main's was
silently dropped.**

`npm run check`, exit 0, per workspace: auth 224 · tenancy 982 · content 1174 ·
data-ops 422 · mcp 599 · realtime 90 · gateway 100 · portal-gateway 49 · web
1204 (2 skipped) · web-portal 96. Laws in the registry: 59.
