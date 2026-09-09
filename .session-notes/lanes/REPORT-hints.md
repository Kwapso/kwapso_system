# REPORT — fix/field-hints-reach-the-screen

Worktree: `~/kwapso-lanes/hints`
Branch: `fix/field-hints-reach-the-screen`, pushed to `origin`
Commits (measured at, and pushed as, HEAD):
- `05139e48` — fix(forms): field hints reach the screen (the rename + translations)
- `4b957130` — test(forms): close the hole a 49th hint: would fall into (the ceiling update + the new rule test)

Precondition: origin/main was at `96a8f829` (confirmed via `git fetch` + `git rev-parse origin/main` before starting). Not a resumed lane — the worktree did not exist before this session.

## The census

`grep -rn "hint:" web/ web-portal/ shared/ --include="*.ts" --include="*.tsx"` (plus a forced `grep -a` pass and a `file` check on every tracked `.ts`/`.tsx` in those trees, to rule out the control-byte trap the brief warned about — nothing in scope carried one) found 53 lines. Of those:

- 3 are out of scope: `shared/rules/registry.ts` (the comment describing this exact defect), `shared/workers/d1-rest.ts` (an unrelated `hint` in a different context), `shared/ui/compositions/screens/session-expired.tsx` (vendored kit, never touched).
- 6 are a **different, real prop** — `PickerOption.hint` (`web/components/records/record-picker.tsx:201`), the second line drawn under a picker row (an email, a code, a relationship). Left untouched: `web/lib/picker-sources.ts:48,116,117`, `web/components/process/steps-panel.tsx:174`, `web/components/tickets/help-form-dialog.tsx:625`, `web/components/work/sprint-form-dialog.tsx:289`.
- **44 are genuine `FieldConfig`s** setting `hint:`, across 14 files. This is the number I actually found and converted — see "the brief said 48" below for why it disagrees with the prompt.

Every one of the 44 was read in full, in its file, against the surrounding code and comments, before renaming — not switched on sight. `shared/web/field.tsx` was read to confirm the mechanism: `translateFieldConfig` reads `config.helpText`, translates it, and forwards it to the kit `Field` as `help`; `hint` was never read by anything, so every one of the 44 sentences had been dead code since the day it was written.

### The brief said 48; the true count is 44

The task prompt and `shared/rules/registry.ts`'s own comment both say "FORTY-EIGHT MORE LIKE IT". I censused the source directly (see above) and got 44, twice, with two different grep strategies (`hint:` and a broader `\bhint\b` sweep to catch any shorthand `{ hint, ... }` — none exists). Per LANE-COMMON's rule to trust the source over a probe, I'm reporting the number I actually found rather than reconciling to 48. I don't know where "48" came from; it may be an earlier, less careful count that didn't separate the 6 `PickerOption.hint` sightings from the genuine `FieldConfig` ones (44 + 6 = 50, still not 48 either — I can't reconstruct it). If the owner wants me to re-verify against a different heuristic, the two `grep` commands above reproduce my count exactly.

### One sentence was stale — fixed before translating

`web/components/work/story-form-dialog.tsx`'s `typeField` hint read *"Editable on the Dropdown values screen."* The screen was renamed **Choices** on 2026-09-01 (`shared/glossary.ts`'s own `dropdownValues` entry, `web/lib/pages.ts:260`, `web/components/screens/settings-screen.tsx:196`); "Dropdown values" now appears only in code comments as the historical name. Changed to *"Editable on the Choices screen."* before extraction, so R34 (glossary word usage) isn't violated the moment the sentence starts rendering.

### Two sentences fact-checked against the door, not just the comments

`web/components/apps/app-form-dialog.tsx`'s `staffField` ("Our team. Only they and an admin open this app's page.") and `leadField` ("The one who marks work on this app done.") make specific permission claims. I had a subagent verify them against `workers/tenancy/src/lib/processes.ts` and `workers/content/src/lib/stories.ts`:

- **leadField: TRUE**, exactly. `refuseDoneByAnybodyElse` throws `not_team_lead` unless the caller is the app's `leadUserId`.
- **staffField: TRUE, with a real but minor omission.** `canOpen = admin || staffedIds.has(caller) || staff.length === 0` — an app with **nobody staffed yet is openable by anyone** with read rights, not just staff+admin. I judged this not worth rewording: the hint is describing the consequence of staffing the app (what the form field in front of the person is *for*), not documenting the permission model exhaustively, and the edge case only applies before anyone has been staffed at all. Flagging it here rather than silently deciding.

The other 42 were verified by reading the surrounding code/comments in the same file (every one of these forms carries extensive inline reasoning specific to the field), not spot-checked separately.

## Every sentence, changed or not

All 44 kept their meaning; only the one above was reworded. No sentence was deleted — none was stale enough to warrant it. Full list of the 44 (file, field, final English) is in the diff; the two commits' bodies summarize the shape.

## Translation

`node scripts/i18n-extract.mjs` → 43 distinct new English strings (44 sentences − 1 duplicate: "A recording, a page, a document somebody can open." is shared verbatim by `story-form-dialog.tsx`'s `fileField` and `review-dialog.tsx`'s `linkField`).

Translated by hand into `de`/`es`/`ca` in `shared/i18n-seed.ts` — never `scripts/i18n-translate.mjs`, per the owner's 8 Sep 2026 ruling. Register matched to the existing catalogue: German formal *Sie*, Spanish/Catalan informal imperative, reusing established vocabulary (`Ticket`→ca `tiquet` in running prose, `App` lowercase in Spanish/Catalan sentences, "Conversation"/"by email" wording lifted verbatim from `resolve-dialog.tsx`'s own subtitle, which says almost the same thing as the new hint on the same form). Also translated `"Choices"` itself (see below) and the one field converted before this session (`"The system this work is on. Everything below is narrowed by it."`), both of which were already extracted and untranslated.

## The ceiling: the brief's "217" is stale — real number was 246, now 244

The brief and `TRANSLATION_CEILING`'s own top comment say "217 in de/es/ca today." That was **main's** number before a documented merge: `shared/rules/registry.ts`'s own history records "MERGED 8 Sep 2026, main × feat/ui-ux, and RAISED 240 -> 246 in all three" — main read 217, feat/ui-ux read 240, and the merged, re-measured true count came back 246. The actual pinned value in the file, right now, is `246` for all three languages, not 217 — I read it directly rather than trusting the prose (`grep -n "^  de:\|^  es:\|^  ca:" shared/rules/registry.ts`).

| language | before (measured, not the brief's stale 217) | after | why |
|---|---|---|---|
| de | 246 | 244 | −2 (see below) |
| es | 246 | 244 | −2 |
| ca | 246 | 244 | −2 |

The 43 new field-hint strings are **net +0**: they're brand-new extractions (never counted in 246 at all, since the extractor only just saw them), and every one of the 43 is translated in the same commit it's catalogued in. The **−2** is two already-catalogued, already-untranslated sentences I happened to translate along the way, unrelated to the field-hint defect itself:

1. `"The system this work is on. Everything below is narrowed by it."` — the one field converted alone on 8 Sep 2026 (before this session) to measure this exact defect class; it was extracted then but nobody had translated it yet.
2. `"Choices"` — the Settings tab's own name, extracted since the 2026-09-01 rename but never translated. I ran into it because fixing the stale "Dropdown values screen" sentence (above) meant translating the tab name it now points to.

Verified with the real test, not a hand-rolled recount: `cd web && npx vitest run test/translation-ceiling.test.ts` — red at first (`244 untranslated, UNDER the pinned ceiling of 246`, before I touched the registry), green after I lowered the pin to 244.

## Closing the hole

`web/test/field-config-keys.test.ts` (new). Derives `FieldConfig`'s allowed keys off `shared/web/screen-engine/config.ts`'s own interface declaration (not hand-listed — the interface growing a field never requires editing this test), walks the app's full import closure (`appFiles()`, the same walk R28/R33 stand on) for every object literal that spreads a field config (the identical signature `wrapped-strings.test.ts`'s `isFieldConfigWord` already uses for R33), and asserts every key it sets is one `FieldConfig` actually declares.

**Mutation-proved**, not just written and left: reverted `resolve-dialog.tsx`'s `helpText:` back to `hint:`, ran the test, watched it fail with the exact offending file:line (`web/components/tickets/resolve-dialog.tsx:37 sets "hint", which FieldConfig has no such key`), then restored it and confirmed green again.

Two floor assertions guard against a silent blind check (the class of bug `config-vars.test.ts` and `wrapped-strings.test.ts` both name in their own comments): the interface read must find at least 7 keys (it found exactly the 7 real ones: `label`, `helpText`, `required`, `disabled`, `validation`, `visible`, `visibilityRules`), and the census must find at least 40 field-config objects (it finds well over that).

## What I could NOT do, and why

**The bonus** ("the ceiling is 217 [sic, 246] because 246 catalogued strings have no translation at all — translate those too, toward zero, and say how far you got"): I got it to 244 as a side effect of the primary fix, not as a deliberate push into the remaining debt. I did not attempt the other ~244 untranslated strings — that's the registry's own "next reviewed translation pass," a large, open-ended task unrelated to this defect, and I judged it out of scope for a lane whose brief is specifically about the `hint:`/`helpText:` class. Flagging honestly rather than padding the number.

## UI/UX and business logic — nothing changed except copy becoming visible

No control, layout, permission, or behaviour changed. The only user-visible effect: 43 explanatory sentences that were silently dropped before now render under their fields (in English, German, Spanish and Catalan), and one of those 43 was reworded from a stale screen name to the current one ("Dropdown values" → "Choices"). The owner should know that 43 new sentences are now live on screen where none were visible before — worth a look before shipping, since none of them have been seen by a user or proofread by anyone but me.

## `npm run check`, unpiped

```
npm run check > /tmp/gate.log 2>&1; echo EXIT=$?
EXIT=0
```

Per-workspace `Test Files` / `Tests` (itemised, not summed in my head):

| workspace | Test Files | Tests |
|---|---|---|
| auth | 21 passed | 224 passed |
| tenancy | 75 passed | 982 passed |
| content | 90 passed, 1 skipped (91) | 1171 passed, 3 skipped (1174) |
| data-ops | 40 passed | 422 passed |
| mcp | 13 passed | 599 passed |
| realtime | 5 passed | 90 passed |
| gateway | 11 passed | 100 passed |
| portal-gateway | 2 passed | 49 passed |
| web | 143 passed | 1204 passed, 8 skipped (1212) |
| portal-web | 12 passed | 96 passed |

Ran a second time after staging every change (registry.ts + the new test file were already present in the working tree for this run — nothing changed between this green run and the commit).

## Files touched

- 14 form-dialog files: `hint:` → `helpText:` (44 renames), one text correction (story-form-dialog.tsx)
- `shared/i18n-strings.json` — regenerated by the extractor (43 new entries)
- `shared/i18n-seed.ts` — 45 new translated entries (43 new field hints + `"Choices"` + the one pre-existing field)
- `shared/rules/registry.ts` — `TRANSLATION_CEILING` 246 → 244, with the arithmetic written down
- `web/test/field-config-keys.test.ts` — new, the closing rule test

Left in place per LANE-COMMON: the worktree stays at `~/kwapso-lanes/hints` for the planner to remove after merging.
