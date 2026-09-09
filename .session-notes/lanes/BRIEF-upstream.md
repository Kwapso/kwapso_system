# BRIEF — lane `upstream` · the design kit `Kwapso/kwapso-ui-ux` · four branches

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first (its rules on secrets,
the Desktop, neurons and reporting apply). This lane works in the KIT's repo, not the app's.

## Setup
`git clone https://alaap-kwapso@github.com/Kwapso/kwapso-ui-ux.git
/Users/alaap_kanchwala_apple/kwapso-lanes/kit-upstream-work` (the username in the URL selects
the right stored credential; do not add a token). Latest tag v1.2.63. Read `docs/RULES.md`,
`docs/PATTERN.md`, `docs/BUILD-A-COMPONENT.md`, `CHANGELOG.md` and `manifest.json` — this is
Aurora's house and **PATTERN.md outranks BUILD-A-COMPONENT**. Match her style exactly: the
measured-contrast tables, the "why this is a reversal and not a fix" register, tokens only,
no hex, a CHANGELOG entry per change, tests beside the component.

## The owner's ruling
"You also said you want to make some changes upstream. Feel free to do all of that." — and
the standing rule: **never merge into her repo.** Push branches; the design lead merges and
tags. No PR (no `gh`); the planner hands her the compare links. Do not tag.

## Four branches, one change each
1. **`feat/dialog-presentation`** — `DialogContent` gains `presentation?: "responsive" |
   "overlay" | "sheet" | "fullscreen"` (responsive = bottom sheet on a phone, centred card on
   a desktop). The consuming app holds its last R39 exemption for exactly this
   (`shared/web/screen-engine/screen-renderer.tsx`, registry `UI_PACKAGE_EXEMPT`); the day
   this ships that line is deleted. Radix is the kit's own dependency; build on the primitive
   the kit's Dialog and Sheet already use.
2. **`feat/article-body-quote-register`** — the manifest's `notDelivered` entry "A
   non-editorial quote register on ArticleBody" has the recommendation written out: a second
   register selected by a prop, sans at the body step, quiet ink, marked by a rule; editorial
   pull-quote stays the default. Close the manifest entry in the same branch.
3. **`feat/calendar-more-click`** — `CalendarView`'s "+N more" (`formatMoreEvents`) is text
   with no gesture; add `onSelectMore?: (day, hidden) => void` so it becomes a real `<button>`
   when a handler is given, like `onSelectEvent` already does.
4. **`feat/permission-matrix-offered-rights`** — `PermissionModule.rights?: readonly string[]`:
   a module may offer a SUBSET of the matrix's capabilities; an unoffered cell draws no
   control (an em-dash, aria-labelled), is not toggleable and is not counted. The consuming
   app's law R36 (`MODULE_OFFERED_RIGHTS`) needs it: fifteen of eighty-eight boxes decided
   nothing.

Each: `npm ci`, the kit's own check green (whatever its `package.json` names), a CHANGELOG
entry in her register, `git push -u origin <branch>`.

## Report
Per branch: the commit, the compare URL
(`https://github.com/Kwapso/kwapso-ui-ux/compare/main...<branch>`), a one-paragraph PR body
in her voice the owner can paste, and the kit check's exit code unpiped.
