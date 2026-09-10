# LANE kb_F — the screens. Follow these steps in order.

You are **kb_F**, a build lane on the kwapso knowledge-base rebuild. An Opus **hub**
session owns the plan, merges, and runs the gate. You build. You report. The hub
merges. Do not merge to `main` yourself.

**YOU MAY NOT SPAWN AGENTS. EVER.** No Agent tool, no workflows, no subagents. If
the work looks too big, stop and report instead.

**Do not run anything that calls an AI model. Your cost is $0.** If you think a step
needs one, stop and ask the hub.

---

## STEP 1 — set up. Run these exactly.

```
cd /Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa
git fetch origin
git worktree add .worktrees/kb-f -b feat/kb-screens origin/main
cd .worktrees/kb-f
npm install
npm run check
```

`npm run check` must print exit 0. **Check it with `echo "EXIT=$?"` on its own line
— do not grep the output.** A suite that fails to LOAD prints no failures and still
exits 1. If it is not 0, stop and tell the hub; do not start work on a red base.

**Every folder you create lives inside this project.** Your worktree is
`.worktrees/kb-f`. Scratch files go under the project. Never write to the Desktop or
to `~/`.

## STEP 2 — read these four things, in this order, before writing code.

1. `documents/DATA-MODEL.md` — the knowledge section. Written today. It describes
   every column you are about to render and **marks which ones nothing writes yet.**
2. `documents/UI-CONVENTIONS.md` — how screens are built here.
3. `web/components/README.md` — which folder a component belongs in.
4. `CLAUDE.md` — the Laws. Section 3 below lists the ones that will bite you.

## STEP 3 — build `f-row`. This is your main item.

**What exists now:** a source row shows a title and a kind.

**What it must show:** compartment · app · sharing · pieces · sightings · last
modified. **The first three must be editable.**

Where each value comes from — all of these landed on `main` in the last few hours:

| On screen | Column / table | Watch out for |
|---|---|---|
| compartment | `knowledge_sources.accounts` (JSON array) | it is an ARRAY. A source can concern several accounts. Not a string. |
| app | `knowledge_sources.apps` (JSON array) | same — array, not one id |
| sharing | `shared_with` = `private` · `agency` · `agency+client` | **also read `owner_user_id` and `visible_to_app_id`. THERE ARE THREE VISIBILITY SETTINGS, NOT TWO: private (an owner), app (`visible_to_app_id`, riding `app_staff`), team (neither).** A two-state toggle here is wrong. |
| pieces | `knowledge_sources.chunk_count` | **A CARD HAS ZERO ON PURPOSE.** See the warning below. |
| sightings | `knowledge_sightings`, count rows for the source | a row with `gone_at` set has ENDED — do not count it as live |
| last modified | `COALESCE(updated_at, created_at)` | the list already sorts by this |

### THE ONE THING MOST LIKELY TO GO WRONG

**A source with `generated_only = 1` is a CARD. It has ZERO chunks BY DESIGN.**
That is **132 accounts, 112 sprints, 28 apps, 60 tasks, 28 apps and 7 stories** on
today's data. Findable, never quotable.

So: **do not render "0 pieces" as an error, an empty state, or a warning.** It is
the correct value. Show it plainly, or show a short label meaning "this is a record
card". Ask the hub which wording before inventing one — the glossary rules the word.

### COLUMNS THAT EXIST AND THAT NOTHING WRITES YET

`relevancy_date`, `team_visible`, `identity_key`, `shared_with`, `context_line`,
`speaker`, `said_at`. DATA-MODEL.md marks each one. **A screen rendering one of
these will look broken on staging and it will not be your bug.** Read the doc before
you conclude you have one. Render them as empty, never as an error.

## STEP 4 — build `f-kit`. Small, do it second.

1. Read `shared/ui/VERSION.json`. It currently says tag `v1.2.75`, synced
   `2026-09-10`, with a content `hash`.
2. Check whether a newer tag exists upstream:
   `git ls-remote --tags https://github.com/Kwapso/kwapso-ui-ux | awk -F/ '{print $NF}' | grep -v '\^{}' | sort -V | tail -5`
   **Use `sort -V`. Never `sort` or `tail` alone** — ASCII order puts `v1.2.9` above
   `v1.2.10` and you will read the wrong tag as latest.
3. If `v1.2.75` IS the latest: report that, and that `web/test/vendored-kit.test.ts`
   is green. Done.
4. If a newer tag exists: **do not hand-edit anything under `shared/ui/`.** It is a
   pinned dependency and a hand-edit turns the build red by content hash. The only
   correct way to update is `node scripts/sync-design.mjs`. **Run it, then run
   `npm run check`, and if anything goes red, STOP and report** — a kit bump can
   move many components at once and that is a hub decision, not yours.

## STEP 5 — the laws that will turn your build red

Check each one against what you wrote, before you commit:

- **R29** — ONE page container. `web/components/shell/app-shell.tsx` owns it. Never
  put `mx-auto` + `w-full` + `max-w-*` on the same line in your own component.
- **R31** — two radii only: `rounded-[var(--radius)]` for a box, `rounded-pill` for
  a pill. No third. (`rounded-select` exists for checkboxes only.)
- **R32** — every colour through a token. **No Tailwind colour ramp** (`text-red-500`)
  and **no hex literal**. Use `warning`, `success`, `destructive`, `chart-1`…
- **R39** — the kit supplies every control, glyph and toast. Import from
  `@shared/ui/components/…` and `@shared/ui/foundations/icons`. Never `lucide`,
  never `sonner` directly.
- **R35** — anywhere a RECORD appears, it carries that record's own face.
- **R48 / R50 / R53 / R63** — if you draw a collection toolbar: it uses `<ToolbarRow>`,
  it takes a required `empty` prop and **draws nothing at all when the collection is
  empty — not even a create button**, its sort and view are configs not nodes, and
  it stays pinned on scroll.
- **R28 / R33** — every user-visible English sentence must be inside `t("…")` AND in
  `shared/i18n-strings.json`. **Run `npm run lang` before you commit.** Write whole
  sentences with a `{hole}`, never fragments — `t("of")` is translated nowhere.
- **R34** — use the glossary's word (`shared/glossary.ts`). Never invent a synonym.
- **R59** — a form or picker SLIDES IN (`Sheet`). Only a yes/no warning is centred.
- **R60** — an image FILLS its box: `object-cover`, never `object-contain`.
- **R37** — an in-app link uses `<InAppLink>`, never a bare `<a href="/t/…">`.

## STEP 6 — how to test

1. **Write the failing test first.** Run it. **Confirm it fails for the RIGHT
   reason** — read the failure message, do not just see red.
2. **Render the screen with EMPTY data as well as populated.** The populated case
   passes anyway; the empty one is where bugs live.
3. **Test the case you think your code MISSES**, not the one you built it for.
   Tonight one lane caught a real bug in its own fix by testing the POSITIVE case
   after only having tested the negative one.
4. `npm run check`, then `echo "EXIT=$?"`. It must be 0.

## STEP 7 — report and stop

Push your branch. Then message the hub session (title contains `planner` or `hub`,
cwd `/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa`) using
`mcp__ccd_session_mgmt__send_message`, with:

- branch name and sha
- the `npm run check` EXIT CODE (the number)
- what you built
- **any number you measured, with the population it is over** ("132 of 3,933", not
  "most")
- anything you refused to guess at, and why
- what blocks you

**If a hub instruction contradicts what the code actually says, the code wins —
say so in your report.** Lanes have overturned the hub five times tonight and were
right every time. Do not work around a contradiction silently.
