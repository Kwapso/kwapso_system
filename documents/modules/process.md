# Process

## What it is

A **Process** is a way of working inside an app, the steps someone takes to
get one job done (`shared/glossary.ts`). Process owns the App → Process →
**Step** chain and its **versions** (a process as it was at one moment; the
**baseline** is version 1, how the work was done before kwapso touched
anything). Every **saving** the product reports — time a step no longer
takes — is the baseline minus the latest version, times how often it runs; a
**regression** is a step that now takes longer than the baseline, shown with
our own explanation beside it. A process is reached from the app it belongs
to, never from its own nav entry.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Processes | list (bespoke via recipe `processes.list`, contextual) | `/t/<teamId>/processes` (no rail entry; reached from an app's own screen) |
| Process detail | detail (bespoke, `process-detail.tsx`) | `/t/<teamId>/processes/<id>` |
| Flowchart | panel on process detail (`process-flowchart.tsx`) | panel |
| Steps | panel on process detail (`steps-panel.tsx`) | panel |
| Draft review | dialog (`draft-review.tsx`, `DraftReviewDialog`) | opened from process detail, over a proposed extraction |
| Read a call | panel (`read-a-call.tsx`) | opened from process detail, to extract a draft from a held meeting |
| Impact | panel (`impact-panel.tsx`), also mounted on Account detail | panel |

## Doors

Process maps, versions, steps, drafts and the client's own organisation
(client departments/roles/tools, which price a step's minutes) are served by
`workers/tenancy` (`workers/tenancy/src/routes/processes.ts` and
`workers/tenancy/src/routes/process-drafts.ts`) — the same worker as Apps,
confirmed by grep against `workers/tenancy/src/index.ts`'s `ROUTES` table;
nothing about process maps lives in `workers/content`.

| Route | Does |
|---|---|
| `GET /api/tenancy/processes` | list, paged, account-fenced (`processes:read`) |
| `GET /api/tenancy/processes/detail` | one process + its steps by version (`processes:read`) |
| `POST /api/tenancy/processes` | create, writes version 1 (the baseline) (`processes:create`, refuses a portal caller) |
| `POST /api/tenancy/processes/update` | edit (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/processes/active` | deactivate / reactivate (`processes:delete`, refuses a portal caller) |
| `POST /api/tenancy/processes/steps` | add a step to the newest version (`processes:create`, refuses a portal caller) |
| `POST /api/tenancy/processes/steps/update` | edit a step in the newest version (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/processes/steps/remove` | mark a step stopped, keeps its history (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/processes/steps/delete` | hard-delete a just-added step (`processes:delete`, refuses a portal caller) |
| `POST /api/tenancy/processes/versions` | cut a new version by hand (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/processes/audit-date` | set the date a version was audited (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/processes/link` / `/unlink` | connect / disconnect two maps (`processes:update`, refuses a portal caller) |
| `GET /api/tenancy/processes/drafts` / `/detail` | a proposed extraction (`processes:read`) |
| `POST /api/tenancy/processes/drafts` | propose one from a call or pasted text (`processes:create`, refuses a portal caller) |
| `POST /api/tenancy/processes/drafts/apply` | a person reviews and confirms (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/processes/drafts/discard` | reject the proposal (`processes:update`, refuses a portal caller) |
| `GET /api/tenancy/processes/comments` | the map's own conversation (`processes:read`, open to a client) |
| `POST /api/tenancy/processes/comments` | add to it (`processes:create`, open to a client — one of the client's six portal acts) |
| `GET /api/tenancy/impact` | the client's own value door, prices redacted by visibility (`processes:read`) |

## Business rules

- Cutting a second version for the same process at the same number is impossible: a `UNIQUE` index on `(process_id, version_no)` refuses the second of two quick presses — a DB `UNIQUE` constraint; the loser is answered `alreadyCut: true` rather than an error — `documents/DATA-MODEL.md` § *apps + processes + process_versions + process_steps + process_comments*.
- Only the newest version's steps can be written; the predicate rides the `UPDATE` itself on every step write (add/update/remove/delete), so a version cut mid-request cannot leave a stale check true and the write wrong — `workers/tenancy/test/process-versions.test.ts` ("an older version cannot be changed").
- Removing a step from the current version never deletes its row: it is carried forward with its frequency intact and its time at zero (`removed_at`), because a removed step is the largest saving there is and dropping it would report none — `workers/tenancy/test/process-versions.test.ts` ("keeps a removed step in the comparison, with the whole of its time saved").
- Removing a step that was never in an agreed (cut) version can be hard-deleted outright, row and history together — the one true delete door in this base — `workers/tenancy/test/process-versions.test.ts` ("a just-added step deletes completely — the row and its history").
- Deleting an already-deleted step is quiet: `null`, no second history line — `R17`, `workers/tenancy/test/process-versions.test.ts` ("deleting it twice is quiet — null, no second history line (R17)").
- A step already cut into an agreed version refuses a hard delete and says to switch it off (deactivate) instead — `workers/tenancy/test/process-versions.test.ts` ("a step cut into an agreed version refuses, and says to switch it off").
- A loop's own target step refuses deletion while the loop still points at it, and only deletes once the loop is gone — `workers/tenancy/test/process-versions.test.ts` ("a loop's target refuses while the loop stands, and deletes once it is gone").
- The map's own figure (a process's savings) is computed from the same seam the client-facing value door (`GET /api/tenancy/impact`) uses — one arithmetic, never two — `workers/tenancy/test/process-versions.test.ts` ("is the same number the value screen computes, from the same seam").
- Every screen showing a process's saving carries the exact `SAVINGS_CAPTION` — `R25`, `workers/tenancy/test/process-versions.test.ts` ("carries the caption the figure must be quoted with").
- A draft (a proposed extraction) never writes to `process_steps` on creation — the proposal lives entirely in its own `payload` JSON until a person reviews it — `workers/tenancy/test/process-drafts.test.ts` ("creating a draft writes NOTHING to process_steps").
- Applying a draft writes only the steps a reviewer actually accepted; a rejected step is nowhere in the map — `workers/tenancy/test/process-drafts.test.ts` ("only the accepted steps land, and the rejected one is nowhere").
- Applying a draft twice does not double the steps, and discarding twice moves nothing on the second press — `R17`-shaped idempotence, `workers/tenancy/test/process-drafts.test.ts` ("applying twice does not double the steps", "discarding writes nothing to the map, and the second press moves nothing").
- A second call against an already-mapped process proposes CHANGES to the existing steps (matched by `step_key`) rather than a second map — `workers/tenancy/test/process-drafts.test.ts` ("a revision edits the step it names instead of adding another").
- A duration the extraction call did not settle is stored as a question, never overwrites one already agreed — `workers/tenancy/test/process-drafts.test.ts` ("a duration the call did not settle is a QUESTION, and never overwrites one that was agreed").
- A draft proposing a revision to a step that has since moved to an older version is skipped, never forced through — `workers/tenancy/test/process-drafts.test.ts` ("a revision whose step has moved to an older version is SKIPPED, never forced").
- A draft is fenced to the process's own client; a draft on another client's process is refused, and the context handed to the extraction model is read under the caller's own fence — `workers/tenancy/test/process-drafts.test.ts` ("a draft on another client's process is refused", "the context handed to the model is read under the caller's own fence").
- A model's own malformed answer never becomes a guess: an unresolved name matches nothing rather than nearly something, a duration in the wrong shape becomes zero, and a non-JSON answer is an empty proposal — never a partial, silently-wrong one — `workers/tenancy/test/process-drafts.test.ts`.
- A step edited by hand while a draft sits unapplied is left untouched by that draft — `workers/tenancy/test/process-drafts.test.ts` ("a step added by hand while a draft sits unapplied is untouched by it").
- Applying a draft is always a person reviewing and confirming — draft doors are deliberately off the machine (MCP) surface — `documents/DATA-MODEL.md` § *process_drafts*; `documents/MCP.md`'s `TOOLLESS_DOORS`.
- Every process-authoring write (create/update/deactivate a process, add/edit/remove/delete a step, cut a version, link/unlink maps, propose/apply/discard a draft) refuses a client login outright at the door — `R21`.
- The map's own conversation (`process_comments`) and the client's own value door (`GET /api/tenancy/impact`) are the two deliberate exceptions that resolve the account fence instead of refusing a portal caller — one of the client's own six portal acts (`documents/DATA-MODEL.md` § *apps + processes…*).
- A comment's `explainsStepKey` (the staff explanation a regression must carry before the portal shows it) is refused when the caller is a client login, even on the one portal-writable door in the module — `workers/tenancy/src/routes/processes.ts`'s `postProcessComment` (positional body check); `unenforced` by a named test in this repo (no test file asserts the refusal specifically).
- Whose history a reader may see on a process, its versions, its steps, its comments or a draft resolves through the same `processes` module the map's own read gates on — `R18` (`ACTIVITY_GATE_MAP` in `shared/rules/registry.ts`).
- Processes has no reference-number kind of its own: it is absent from `shared/workers/refs.ts`'s `TEAM_REF_KINDS` — a process is addressed by its process id and its app's own "A"-prefixed reference, never a standalone process reference — `unenforced` in the sense that nothing refuses a future reference on the table; it is a design absence, verifiable by reading `TEAM_REF_KINDS` itself.
- Processes is a growing collection and reads paged with a stated cap, never unbounded — `R14` (`GROWING_COLLECTIONS` names `processes` in `shared/rules/registry.ts`).
- Every non-GET process/draft route opens with a permission gate before touching the database — `R10`, `workers/tenancy/test/gating-seam.test.ts`.
- Every process/draft mutation calls `publishChange`, patching the changed row — `R1`, `workers/tenancy/test/publish-seam.test.ts`.
- Every request body field on a process/step/draft write is read through `requireText`/`optionalText`, never destructured raw — `R20`.
- A process's `name` field is capped at `TITLE_MAX_CHARS` on both the form and the write door — `R87`.

## Edge cases

- **A process reached by its own direct URL still opens, even though the rail entry is gone.** `/t/<team>/processes/<id>` is `placement: "contextual"` in `web/lib/pages.ts`, not removed — only the standalone nav link was retired, per the owner's ruling that a process is reached from its own app.
- **A step's whole shape is frozen per calendar day, not per edit.** `process_step_revisions` freezes one description of a step per `effective_on` date; a second edit on the same day is a correction to that day's row, not a second day of history (`documents/DATA-MODEL.md` § *process_step_revisions*).
- **Connecting two maps (`process_links`) is deliberately loose.** It alters no duration and no saving on either side, so the door does not gate it the way an edit to the numbers is gated; disconnecting hard-deletes the row because the connection is a statement, not a record.

## Open issues

- **The step-locked-to-newest-version predicate is proven for four of the five step writes by name (add/update/remove/delete), but `removeStep`'s own header notes it did not carry the check until 2026-08-17** — a reader relying on an older mental model of this door should re-verify against current source rather than this doc, since the predicate's own history shows it arrived late once already.
- **No test in this repo asserts that a draft's model-extraction step is itself rate-limited or capped independently of the team's assistant quota** — worth checking against `documents/COSTS.md` before assuming the AI-quota accounting alone bounds it.
