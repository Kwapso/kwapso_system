# BRIEF — lane `dead-end` · branch `fix/dead-end-95` · worktree `~/kwapso-lanes/dead-end`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it.

## Goal
`dead_end_review` from 90 to ≥95, measured fresh with its SKILL.md. Start from
`.session-notes/reviews/4-tidiness-measured.md` §2. The reviewer wrote "the whole review cannot
exceed 93 today" for two reasons; both are yours to test, and the kit dependency has moved.

## Crit 1 = 67, weight 16
- **The one real finding: three Google read doors have no human path, no machine path and no
  declaration** — `GET /api/content/google/gmail/message`, `…/calendar/event/transcript`,
  `…/chat/spaces` (15 points, +2.4). Give each a real path: the screen action that should
  call it, or an agent/MCP tool on both machine surfaces (R43 parity, R19/R22/R27 for the
  tool), or — if nothing needs it — delete it and its tests. Read `workers/content` to see
  which is true; the knowledge base's Google lane is the likely caller.
- **Six routes correct by design, charged as minors** (`/internal/mcp-session`,
  `/api/content/health`, `/api/content/google/callback`, three owner-key admin doors). Read the
  SKILL.md for what a DECLARATION is under this rubric; if a rot-checked registry (like
  `NO_CONTROL` in crit 7) satisfies it, declare them there with the reason each cannot have a
  UI. If the rubric still charges them at the minor band, say so with the rubric's own words.
- `TypeMark` dead export, `web/components/record-chrome.tsx:307` — minutes.

## Crit 2 = 80: the permission matrix draws four boxes for eight modules that offer fewer
The kit is now **v1.2.63** and its `PermissionModule` (`shared/ui/components/permission-
matrix/permission-matrix.tsx`) carries `held`, `locked`, `visible` — still no per-module
subset of rights. The `upstream` lane is building `rights?: readonly string[]` on the kit;
you cannot use it until Aurora merges and tags. So: build the app side against R36's data
(`MODULE_OFFERED_RIGHTS`) so it is ready to hand the subset to the kit in one line, and in the
meantime use what v1.2.63 offers honestly (`locked` with a reason is NOT "not offered" —
do not lie). State in the report exactly what the score is with and without the kit change.

## Crit 9: expired / revoked / over-limit screens were never walked in a browser (10/30)
Walk them in the Browser pane against staging (an expired invite link, a revoked token, a
team over its AI allowance, a deactivated member signing in) and fix every dead end — a
screen with no way back is the whole review's subject.

## Do not
Touch `shared/ui/`. Deploy. Spend neurons (an over-limit screen can be reached by setting the
allowance in core, not by spending it). Change UI beyond removing a dead end.

## Report
The criteria table at your tip, with crit 2 stated both ways; what each Google door became
and why; the walk (screen → what was wrong → what it does now).
