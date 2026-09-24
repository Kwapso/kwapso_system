# Apps

## What it is

An **App** is a system we build for an account, the thing with its own
address — one client goal can need two apps (`shared/glossary.ts`). Apps owns
the top of the App → Process → Step chain (the App → **Process** side is
`documents/modules/process.md`'s to describe): who is on it (our own staff and
the client's own **stakeholders**), what it shows for itself (its **files**,
its logo, its **modules** — the sections of the built software, distinct from
a process), what we handed the client (its **deliverables**), and what it
gives back in money terms — a figure only the agency itself may see in full.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Apps | list (bounded, recipe `apps.list`) | `/apps` (sidebar, "Build" group) |
| App detail | detail (bespoke, `app-detail.tsx`) | `/apps/<id>`, or nested under an account (`/accounts/<id>/apps/<id>`) |
| Stakeholders | tab on App detail (`stakeholders-panel.tsx`) | tab |
| Modules | tab on App detail (`modules-panel.tsx`) | tab |
| Deliverables | tab on App detail (`deliverables-panel.tsx`) | tab |
| Files | tab on App detail (`app-attachments.tsx`) | tab |
| App money | panel on App detail, agency-only (`app-money-panel.tsx`) | panel |

## Doors

Apps, app modules and the money door are served by `workers/tenancy`
(`workers/tenancy/src/routes/processes.ts` for the app/module rows,
`workers/tenancy/src/routes/money.ts` for the money door). Deliverables live
in `workers/content` instead (`workers/content/src/routes/deliverables.ts`) —
verified against both workers' `ROUTES` tables; an app's own record and what
was handed over on it are served by two different workers.

| Route | Does |
|---|---|
| `GET /api/tenancy/apps` | list, account-fenced (`processes:read`) |
| `POST /api/tenancy/apps` | create (`processes:create`, refuses a portal caller) |
| `POST /api/tenancy/apps/update` | edit (`processes:update`, refuses a portal caller) |
| `POST /api/tenancy/apps/active` | deactivate / reactivate (`processes:delete`, refuses a portal caller) |
| `GET /api/tenancy/apps/attachments` | an app's Files tab, account-fenced (`processes:read`) |
| `POST /api/tenancy/apps/attachments` | attach a file (`processes:create`, refuses a portal caller for the write) |
| `GET /api/tenancy/app-modules` | an app's sections (`processes:read`) |
| `POST /api/tenancy/app-modules` | add one (`processes:create`, refuses a portal caller) |
| `GET /api/tenancy/app-money` | what one app gives back, priced in full (`commercials:read`, refuses a portal caller) |
| `GET /api/content/deliverables` | what we handed over (`deliverables:read`) |
| `POST /api/content/deliverables` | file one (`deliverables:create`) |
| `POST /api/content/deliverables/visibility` | show/hide from the client (`deliverables:update`) |
| `GET /api/content/portal/deliverables` | the client's own shelf, shared-only (`deliverables:read`, portal door) |

## Business rules

- An app's account is written once at creation; there is no move-app door, because moving one would silently republish a whole map, its savings and its conversation into somebody else's portal — `unenforced` (a deliberate absence, not a checked invariant — there is no door to test against).
- Every table in the process map (`apps`, `processes`, `process_versions`, `process_steps`, `app_modules`, `app_attachments`) carries a denormalised `account_id`, fenced by `accountScope`, and every account-fenced function in `workers/tenancy/src/lib/processes.ts` that fences a table carrying `app_id` also fences by app — a static census over that file's own source — `workers/tenancy/test/app-fence-census.test.ts`.
- `portal_users.app_restriction` narrows one client contact to named apps inside their own company, and every door that answers "what does this app restriction apply to" is checked, not merely trusted — `workers/tenancy/test/app-restriction-is-real.test.ts`.
- Creating, updating, deactivating an app, adding/editing/deactivating an app module, and writing an app's own files all refuse a client login outright at the door (`refusePortalCaller`) — a map and the system it describes are the agency's own authored record — `R21`.
- **What one app gives back, priced in full (`GET /api/tenancy/app-money`) is agency-only and structurally distinct from what a client's own value door (`GET /api/tenancy/impact`) hands back** — same subtraction, but the client's own door nulls prices on any app whose account has price visibility switched off, so a number that comes out of the agency-only door is one a particular client may be forbidden to see — `R24` (outbound half only; the inbound half of R24 was retired 10 Sep 2026 per `shared/rules/registry.ts`).
- A conversation that has already read a withheld money figure this turn may not then call a door that writes where a client reads — refused at the step, before the door runs — `R24`, `workers/data-ops/test/money-taint.test.ts`.
- The money door's response is spelled out field by field (`appId`, `savedSecondsPerMonth`, `moneyCentsPerMonth`, `unpricedProcesses`, `lines`, `caption`) rather than spread, so a tool description's promise about it is checkable — `R27`.
- Any screen rendering the app-money figure shows the `caption` the payload carries, or the shared `SAVINGS_CAPTION` fallback, word for word — never assembled by the screen itself — `R25`, `web/components/apps/app-money-panel.tsx`.
- `GET /api/tenancy/app-money` and its sibling money doors are derived from a named set of functions (`MONEY_READERS` in `shared/workers/money-taint.ts`) that must equal the tenancy `ROUTES` exactly — `workers/data-ops/test/money-taint.test.ts`.
- The money door and MCP: one `tools/call` has no turn to taint, so the machine surface refuses the money door outright rather than reusing the in-context predicate — `R24`.
- An app carries a reference number with the "A" prefix, minted once through the one shared formula — `R55` (`shared/workers/refs.ts`'s `TEAM_REF_KINDS.app`).
- Apps is a bounded collection (page one is the whole collection); it does not page and carries no `listCollection({ paged: true })` config, unlike `accounts`/`processes`/`todos` — `R14` (`apps` is absent from `GROWING_COLLECTIONS` in `shared/rules/registry.ts`, and its list recipe in `web/lib/screens.ts` is unpaged).
- An app's team lead must be one of the people staffed on that app: the write door throws a `GuardError` ("The team lead has to be one of the people on this app.") when `leadUserId` is not in the wanted staff set (`workers/tenancy/src/lib/processes.ts`, `setAppStaff`) — `unenforced` by a named test (no test file in this repo asserts this refusal message; the check exists only in door code).
- **The "Main stakeholder" picker on the app form is deliberately scoped OUT of R92** (main excludes secondary): it is a "main chosen FROM its own secondary list" shape, where the main is meant to be a *member* of the ticked stakeholders rather than excluded from them — named explicitly in `web/test/main-excludes-secondary.test.ts`'s own header comment — `unenforced` by R92 on purpose (a scoping decision documented in the test file, not a gap in it).
- The app's own Lead/staff pair (`leadUserId` main, `staffUserIds` secondary) sits outside R92's own field vocabulary (`staffUserIds` does not match the census's `SECONDARY_FIELD` regex, which looks for `loop`/`stakeholder`/`reviewer`/`member`) — `unenforced`, and a plausible future candidate: widening the census's field list would bring this pair into scope.
- An app's logo is stored as an R2 path and never a data URL; the write door refuses anything but png/jpeg/webp, closing off an SVG (a script on the app's own origin) — `workers/tenancy/test/app-logo.test.ts`.
- An app's logo (`AppRow.logoUrl`) reaches a person on `web/components/apps/app-tiles.tsx`; its own Files-tab attachments (`AppAttachment.url`) reach a person on `web/components/records/record-attachments.tsx` — `R40`.
- A deliverable's client visibility is its own door (`POST /api/content/deliverables/visibility`), never a field folded into `/update` — a deliberate, separate act from editing the deliverable itself — `unenforced` beyond the door-shape itself (no test asserts the *reason* for the split, only that the door exists and is gated `deliverables:update`).
- A deliverable's own file (`Deliverable.url`) reaches a person through the portal's own shelf (`GET /api/content/portal/deliverables`) — `R40`.
- Whose history a reader may see on an app, an app module, a process or a process version resolves through the same `processes` module the app's own list gates on; a process's or an app's history names the staff who mapped and quotes what it costs us to run — the client is shown the map, never the ledger about it — `R18` (`ACTIVITY_GATE_MAP` in `shared/rules/registry.ts`).
- Every non-GET apps/app-modules/deliverables route opens with a permission gate before touching the database — `R10`, `workers/tenancy/test/gating-seam.test.ts` and `workers/content/test/gating-seam.test.ts`.
- Every apps/app-modules/deliverables mutation calls `publishChange`, patching the changed row — `R1`, `workers/tenancy/test/publish-seam.test.ts` and `workers/content/test/publish-seam.test.ts`.
- Every request body field on an app/module/deliverable write is read through `requireText`/`optionalText`, never destructured raw — `R20`.
- An app's `name` field is capped at `TITLE_MAX_CHARS` on both the form and the write door — `R87`.

## Edge cases

- **`portal_users.app_restriction` has no enforcing screen yet on the client-visible side.** `app-restriction-is-real.test.ts` proves the doors that narrow BY it behave correctly where they are wired, but a value in the column is still a note of intent rather than a guaranteed narrowing everywhere an app could be read (`documents/DATA-MODEL.md`).
- **An app is only ever a square (one image column).** Unlike an account (logo + cover), an app's logo is the only image slot — deliberate, per the column's own header comment, not an oversight.
- **A "process" and a "module" look similar and answer different questions.** A process is a way of working inside an app (the account's world, versioned, what every saving is drilled through); a module is a division of the built software (Settings, Documents, Tasks). A ticket's `module_id` must belong to the app its own `app_id` names, checked at the door.

## Open issues

- **Deliverables' business-rule enforcement is thin beyond gating.** The visibility switch, the upload door and the portal shelf are each gated and published correctly, but no test in this repo asserts, for example, that turning visibility off actually removes a row from an already-open portal session rather than merely the next fetch — a candidate for a future `R15` live-listener check specific to `deliverables`.
- **The app-form "Main stakeholder" / "staff Lead" pair split is intentional but easy to misread as a gap.** Both are excluded from R92's census on purpose (see Business rules above); a future reviewer widening R92's field vocabulary should re-read `web/test/main-excludes-secondary.test.ts`'s own header before assuming the Lead/staff pair was missed by accident.
