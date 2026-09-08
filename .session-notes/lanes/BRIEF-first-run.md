# BRIEF — lane `first-run` · branch `fix/first-run-95` · worktree `~/kwapso-lanes/first-run`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`first_run_review` as high as it honestly goes (now 92; the arithmetic caps it at ~94 under two
owner rulings — see below), PLUS two owner-approved UI changes that are yours. Start from
`.session-notes/reviews/8-fresh-eyes-remeasure.md` §1 (the ten-criterion table).

## 1 · Empty states — the owner's ruling, verbatim
"Yes, there should be empty states for everything. I'm sure the UI/UX kit has it."
- The known one: **Sprints' Overview tab — the tab a new team lands on — draws a bare
  `EmptyLine`** (`web/components/sprints-screen.tsx:547`): title, no sentence, nothing to
  press. Give it what the other sixteen collections got on 5 Sep: the shared
  `CollectionEmptyState` (the app's seam, drawn through the kit's `CollectionFrame`) with a
  sentence and a first act (create a sprint). Crit 2 goes 15/17 → 17/17; crit 10's "one
  finding, unfixed" closes.
- Then **everything**: census every screen, tab, panel and nested list on BOTH front doors
  (`web/`, `web-portal/`) that can render with zero rows — host-composed tabs that bypass the
  engine are where these hide — and make each say what to do next through the same seam. R50
  (no toolbar on an empty collection) and R48 stay green. New English sentences: extract and
  raise `TRANSLATION_CEILING` per LANE-COMMON; never translate.
- Re-verify the probe's ten "unguarded" files (crit 6 held at 0.95 because nobody re-opened
  them) and close crit 3's residual minor.

## 2 · Last-save-wins — the owner's ruling, verbatim
"I would just assume everything happens sequentially. If somebody just saves or clicks submit
on an edit screen for the same record that I'm currently editing, I would technically hit the
save button 1 or 2 seconds after them. Sequentially, I propagate the latest change, and that is
what should be reflected." Find where a live row patch (`patchRow` / the live-sync seam in
`shared/web/` and `web/lib/`) meets a form draft being edited (R7). Implement exactly that: a
live patch on a record you are editing does not overwrite your draft; your save replaces the
row; nothing prompts. Write down what the previous behaviour was (the planner tells the owner).
Test it (a draft open, a patch arrives, the draft survives; save → the row is the draft).

## 3 · The walk
Re-walk with a fresh account only if you can do it **without leaving a team and a database
behind** — the 6 Sep walk littered one (`.session-notes/lanes/empty-walk-record.md`). If the
walk must create a team, delete its core rows and its D1 database at the end (`cf-exec`, and
prove the account's D1 list is unchanged before/after). Never touch a database whose name is
not the one you created; nine on this account belong to other companies.

## The two caps you must NOT try to lift
Crit 4's "0/20 waits on a person" (team creation is closed by the owner) and crit 9's sample
data (20/100; the owner dropped sample data). Both are his rulings; the planner has asked him
once more. Unless the planner tells you he changed his mind, leave them and state the ceiling.

## Report
The ten-row table at your tip; the empty-state census (screen → what it now says → first act);
the before-behaviour of the live-edit conflict; the walk's D1 list before/after.
