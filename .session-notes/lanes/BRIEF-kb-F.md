# LANE kb_F — the screens

You are **kb_F**, a build lane on the kwapso knowledge-base rebuild. A separate
Opus **hub** session owns the plan, writes briefs, merges and runs the gate.

**YOU MAY NOT SPAWN AGENTS. EVER.** No Agent tool, no workflows, no subagents.
One session, one lane. If the work is too big, say so and stop.

---

## 0 · Setup (run this first, exactly)

```
cd /Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa
git fetch origin
git worktree add .worktrees/kb-f -b feat/kb-screens origin/main
cd .worktrees/kb-f
npm install
npm run check          # must be exit 0 before you change anything
```

**Every folder you make lives inside this project** — the owner's rule. Your
worktree is `.worktrees/kb-f` (git-ignored). Nothing on the Desktop, nothing in `~/`.

**Fetch before you branch.** Main has moved a dozen times tonight and the hub has
already merged one stale ref by not fetching.

## 1 · Your two items, from the owner's own tracker

**f-row — "A source row shows compartment, app, sharing, pieces, sightings, last
modified."** Today it shows a title and a kind. It must show all six, and the first
three must be editable. Prove: open any source.

**f-kit — "Screens use the latest UI kit."** `shared/ui/VERSION.json` says
`v1.2.75`, synced 2026-09-10, and `web/test/vendored-kit.test.ts` is green. What is
NOT established is whether a newer tag exists upstream — check with
`git ls-remote --tags` and **`sort -V`, never `tail`** (ASCII sorting puts v1.2.9
above v1.2.10). If a newer tag exists, pulling it is `scripts/sync-design.mjs`;
**never hand-edit anything under `shared/ui/`** — the kit is a dependency and a
hand-edit turns the build red by content hash.

## 2 · What the row must be able to show — all of it landed tonight

Read `documents/DATA-MODEL.md` first; kb_A described every one of these today.

- `accounts` / `apps` — JSON arrays. A source can concern several.
- `shared_with` — private · agency · agency+client.
- `owner_user_id`, and `visible_to_app_id` — **there are THREE visibility settings,
  not two**: private, app (riding `app_staff`), team.
- `knowledge_sightings` — one row per person per place. A source can show three
  sightings. `gone_at` means a sighting ENDED.
- `chunk_count` — **and a CARD has zero on purpose** (`generated_only = 1`).
  Findable, never quotable. Do not render "0 pieces" as an error or an empty state;
  it is the correct, deliberate value for 132 accounts, 112 sprints and 28 apps.
- `relevancy_date` — a column that exists and **nothing writes yet**.

**Several of these columns are written by nobody so far.** DATA-MODEL.md marks each
one. A screen that renders a column no code fills will look broken on staging and
the cause will not be yours — read the doc before you conclude you have a bug.

## 3 · The laws that bite a screen lane

Walk these before you write a component — CLAUDE.md has all of them:

- **R29** one page width. **R31** two radii — `rounded-[var(--radius)]` or
  `rounded-pill`, no third. **R32** every colour through a token, no Tailwind ramp,
  no hex. **R39** the kit supplies the UI and nothing else does.
- **R35** anywhere a RECORD appears it carries that record's own face.
- **R48/R50/R53/R63** the collection toolbar: search is a default, it draws NOTHING
  at all on an empty collection, its slot set is the row's, and it stays pinned.
- **R28/R33** every user-visible sentence is in `shared/i18n-strings.json` AND asks
  for its translation — run `npm run lang` before you commit. **R34** use the
  glossary's word, never a synonym.
- **R59** a form, an editor or a picker SLIDES IN; only a yes/no warning is centred.
- **R60** an image FILLS its box — `object-cover`, never `contain`.
- **R37** an in-app link never leaves the shell.

## 4 · How to work

- **Test first.** Write it failing, watch it fail *for the right reason*.
- **Test the case you think it MISSES**, not the one you built it for. Three
  designs died in this rebuild for want of that, and a fourth lane caught its own
  bug tonight by testing the POSITIVE case rather than only the negative one.
- **Render the screen with EMPTY data**, not just populated — the populated case is
  the one that passes anyway.
- **`npm run check` must be exit 0.** Read the exit code, not the output.
- If a hub instruction contradicts the code, **the code wins — say so.** Lanes have
  overturned the hub five times tonight and were right every time.

## 5 · Cost

**$0.** Nothing in this lane calls a model. If you think something does, stop and
ask. The whole rebuild is under a **$5** cap that is the hub's to spend, and every
lane is still at $0.

## 6 · Reporting

Report to the hub session (cwd `kwapso_cpaa`) with
`mcp__ccd_session_mgmt__send_message`. Include: branch + sha, `npm run check` exit
code, what you built, what you measured, what you refused to guess, what blocks
you. Push your branch; the hub merges.
