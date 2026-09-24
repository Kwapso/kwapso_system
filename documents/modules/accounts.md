# Accounts

## What it is

Accounts is the customer spine: **every company and every person kwapso works
with, in one table** (`shared/glossary.ts`'s `account` / `company` / `contact`
entries). An **Account** is a company or a person — both live in the same
list, told apart by `account_type`. A **Contact** is a person who belongs to
one company, or to none at all (the same `accounts` row, linked to a company
via `account_links`). **Portal access** is the login that lets someone at an
account see their own work in the client portal — granting or revoking it
never touches the person's or the account's own record. **Inputs** are what
we need from a client: each one sits in their portal with a due date, and
raising one emails them.

## Screens

| Screen | Kind | Route / deep link |
|---|---|---|
| Accounts | list (paged) | `/accounts` (sidebar, top-level; also `/t/<teamId>/accounts`) |
| Account detail | detail (bespoke, `account-detail.tsx`) | `/accounts/<id>` (companies/contacts/all filter strip) |
| Accounts dashboard | bespoke (`accounts-dashboard.tsx`) | tab on the Accounts screen |
| Contacts | list (shares the Accounts door, filtered to individuals) | `/contacts` (sidebar) |
| Contact detail | detail (bespoke, `contact-detail.tsx`) | `/accounts/<id>` (a contact is an `accounts` row) |
| Inputs | list (paged, recipe `inputs.list`) | `/inputs` (sidebar, third page of the Accounts group) |
| Portal logins | panel on account detail (`client-org-panel.tsx`) | tab on Account detail |

## Doors

Accounts, contacts and portal logins are served by `workers/tenancy`
(`workers/tenancy/src/routes/accounts.ts`). Inputs (the `todos` table) are
served by `workers/content` (`workers/content/src/routes/todos.ts`) — verified
by grep against both workers' `ROUTES` tables; nothing about the module name
predicts which worker owns it.

| Route | Does |
|---|---|
| `GET /api/tenancy/accounts` | list, paged (`accounts:read`) |
| `GET /api/tenancy/accounts/detail` | one account + its people + its logins (`accounts:read`) |
| `GET /api/tenancy/accounts/dashboard` | the Dashboard tab's grouped reads (`accounts:read`) |
| `POST /api/tenancy/accounts` | create (`accounts:create`) |
| `POST /api/tenancy/accounts/update` | edit an account's own fields (`accounts:update`) |
| `POST /api/tenancy/accounts/parent` | move under another account, loop-refused (`accounts:update`) |
| `POST /api/tenancy/accounts/active` | deactivate / reactivate (`accounts:delete`) |
| `POST /api/tenancy/accounts/archived` | archive / unarchive (`accounts:delete`) |
| `POST /api/tenancy/accounts/links` | link a person to a company (`contacts:create`, refuses a portal caller) |
| `POST /api/tenancy/accounts/links/active` | unlink / relink (`contacts:delete`, refuses a portal caller) |
| `GET /api/tenancy/portal-users` | who can log in (`portal_users:read`) |
| `POST /api/tenancy/portal-users` | grant a login (`portal_users:create`) |
| `POST /api/tenancy/portal-users/active` | revoke / restore a login (`portal_users:delete`) |
| `GET /api/content/todos` | list a team's inputs, paged (`inputs:read`) |
| `POST /api/content/todos` | raise one, emails the client (`inputs:create`, refuses a portal caller) |
| `POST /api/content/todos/complete` | the client marks it done, with a file (`inputs:update`) |
| `POST /api/content/todos/cancel` | withdraw one, never deleted (`inputs:delete`, refuses a portal caller) |

## Business rules

- An account is either a company or a person: `account_type` is a real `CHECK` constraint (`entity` \| `individual`) — a DB `CHECK` constraint (`documents/DATA-MODEL.md` § *accounts + account_links + portal_users*).
- An account's short `code` is unique whenever set, but nullable — a partial unique index, so two people cannot mint the same code at the same instant — a DB `UNIQUE` (partial) index.
- Re-parenting an account cannot create a cycle: the loop guard climbs the ancestor chain and refuses past `MAX_ACCOUNT_DEPTH` (64, `shared/workers/limits.ts`), fails closed — `workers/tenancy/test/accounts.test.ts` ("refuses a link that would close a loop — at any depth").
- Moving an account to the parent it already sits under changes nothing and publishes nothing — the idempotent no-op predicate reads the stored row before writing — `R17`.
- Deactivating or reactivating an account a second time (same target state) moves zero rows: no duplicate history line, no live ping — `R17`.
- Archiving is a distinct, stronger state from deactivation (never deletes; the row, its people and its history all survive) — `workers/tenancy/test/accounts.test.ts` ("an archived account keeps its children and its links — never deleted").
- Linking the same person to the same company twice, or a self-link, is refused — a partial unique index on the active `(account_id, person_account_id)` pair — `workers/tenancy/test/accounts.test.ts` ("refuses the same person twice on the same company, and self-links").
- Linking or unlinking a contact, and re-parenting an account, always refuse a client (portal) login outright — the address book is agency material, never opened at the portal's own gateway — `R21`.
- A client login can never reach `accounts`, `contacts`, `portal_users` or `inputs` doors from the agency origin except through its own account fence — enforced by `workers/tenancy/test/account-leak.test.ts`, which derives every account-scoped route off disk and sends a burglar at each — `R21`.
- Every statement touching `accounts`, `account_links` or `portal_users` lives in exactly one file (`workers/tenancy/src/lib/accounts.ts`) — a walk of `lib/` and `routes/` fails the build if one appears anywhere else — `workers/tenancy/test/account-leak.test.ts`.
- At most one live portal login per person: a partial unique index on `user_id` where the grant is active — a DB `UNIQUE` (partial) index (`documents/DATA-MODEL.md` § *accounts + account_links + portal_users*).
- Granting a login never lets staff type an address: identity is resolved from the linked contact's own account row, inside the fence, never accepted as free text — `unenforced` (a product policy, not a crisp machine check beyond the id-shape validation `R20` already gives the body field).
- Every non-GET account, contact and portal-login route opens with `requireRight`/`gatedBody` before touching the database — `R10`, `workers/tenancy/test/gating-seam.test.ts`.
- Every account/contact/portal-login mutation calls `publishChange` after its write, patching the changed row rather than triggering a refetch — `R1`, `workers/tenancy/test/publish-seam.test.ts`.
- Every request body field (name, account type, parent id, account manager id, link ids) is read through `requireText`/`optionalText`, never destructured raw — `R20`.
- An account's `name` field is capped at `TITLE_MAX_CHARS` on both the form and the write door, and any longer pre-existing name truncates with an ellipsis on a one-line render — `R87`.
- `account_manager_user_id` must name a current team member of this team who does not also hold a `portal_users` row (a colleague, not a client sitting in the same table) — checked positionally at the write door (`requireStaffMember`) — `workers/tenancy/test/account-manager.test.ts`.
- An account's own logo and cover images are read back through `Account.logoUrl`/`Account.coverUrl` and rendered on `web/components/accounts/account-detail.tsx` — `R40` (`shared/rules/registry.ts`'s `STORED_FILES`).
- Accounts is a growing collection and is read PAGED with a hard, stated cap, never as one unbounded SELECT — `R14` (`GROWING_COLLECTIONS` in `shared/rules/registry.ts` names `accounts`).
- Contacts reuses the Accounts list door filtered to individuals rather than opening a second one — one door, one cache key (`accounts-individual`) — `R56`.
- An input (to-do) always names an account; a to-do with no client is refused at the door — `todos.account_id` is `NOT NULL`, a DB `NOT NULL` constraint (`documents/DATA-MODEL.md` § *todos + tasks*).
- Raising an input emails the client's people; it is one of only two writes in the whole product that reach a customer's inbox — `workers/content/test/todos-tasks.test.ts` ("always belongs to one, carries their reference, and emails their people").
- Only the client themselves (or staff) can complete an input, and completing one twice is quiet, not a duplicate — `workers/content/test/todos-tasks.test.ts` ("is completed by the client themselves, once"); the write's fence rides the completing `UPDATE` itself, not only the read in front of it (`workers/content/test/todos-tasks.test.ts`, "the fence rides the WRITE, not only the read in front of it").
- A client at one company can never see or complete another company's input — `workers/content/test/todos-tasks.test.ts` ("a client at ANOTHER company cannot see it or complete it").
- Withdrawing (cancelling) an input never deletes the row, it only leaves the client's own list — `workers/content/test/todos-tasks.test.ts` ("withdrawing one keeps the row and takes it off their list").
- A file a client attaches while completing an input is stored only after the record is fenced — no `/media` object is written before the row it hangs on is confirmed theirs — `workers/content/test/todos-tasks.test.ts` ("no /media object is stored before the record it hangs on is fenced").
- An input's own file reaches a person through `Todo.fileUrl`, rendered on `web/components/work/work-panels.tsx` — `R40`.
- An input carries a reference number with the "I" prefix, minted once through the one shared formula and never hand-built — `R55` (`shared/workers/refs.ts`'s `TEAM_REF_KINDS.input`).
- Inputs is a growing collection and pages rather than reading unbounded — `R14` (`GROWING_COLLECTIONS` names `todos`, the table `inputs` renamed onto in the UI).
- Whose history a reader may see on an account, a contact link, a portal login or an input is resolved from the same module the record's own list gates on (`accounts`, `contacts`, `portal_users`, `inputs`) — `R18` (`ACTIVITY_GATE_MAP` in `shared/rules/registry.ts`).
- Contacts' own permission module offers only `read`, `create` and `delete` — editing a contact's fields is `accounts:update`, not a fourth `contacts` box, so the roles matrix never draws a box that decides nothing — `R36` (`MODULE_OFFERED_RIGHTS.contacts` in `shared/team-modules.ts`).
- A colleague who may read an account manager's identity is shown their face (avatar + name) resolved client-side off the already-cached members list, never a second network read — `R56`.

## Edge cases

- **The account depth and reach ceilings are deliberately generous, not tuned.** `MAX_ACCOUNT_DEPTH` (64) bounds the loop guard; `SCOPE_HARD_CAP` (500, `shared/workers/account-scope.ts`) bounds how far the account-reach walk climbs before it stops early and grants *less*, never more (`documents/DATA-MODEL.md`).
- **`accounts.status` is kept and means nothing.** It held a commercial lifecycle as free text and drifted from the real `deactivated_at`/`archived_at` flags; nothing reads it any more, but the column and its seeded dropdown values survive because nothing here is ever deleted.
- **`account_restriction`-style narrowing is carried, not enforced.** `portal_users.app_restriction` is written and read back honestly, but nothing acts on it yet: a value in that column changes nothing about what a client can see today (`documents/DATA-MODEL.md`).
- **`alt_names` has no write door or screen yet.** The column exists (a JSON array of a person's own declared spellings) and is read by the knowledge base's alias index, but nothing in the app writes to it — it can only be set by a direct data write today.

## Open issues

- **One person, one company — the shape has not moved yet.** Aurora's 22 Sep 2026 ruling retires the premise behind `account_links` (a contact used to be linkable to more than one company); the fix is a table-split (a single account column on contacts) that has not shipped. `workers/tenancy/test/accounts.test.ts` still tests and passes the old multi-company shape ("lets one person be a contact of two companies") — a reader should expect that test, not this doc, to be the one that moves first.
- **Portal-side app restriction has no enforcing module yet.** The Apps module is what would honour `portal_users.app_restriction`; until it does, the field is a note of intent that any reviewer could mistake for a real security boundary (`documents/DATA-MODEL.md` says so explicitly).
