### accounts + account_links + portal_users. KEEP (BUILT 2026-08-09, team migration `0007_customer_spine`). THE CUSTOMER SPINE
Purpose: every company and every person kwapso works with, in **one** table
(SCOPE ch.03 "People, one table"). There is no second people-table anywhere.

`accounts`: audit block + `account_type` (`entity` | `individual`, CHECKed),
`parent_account_id` (a **self-pointer**: a holding company's businesses, a
business's divisions, nesting is deep, but not unlimited; the two ceilings are
below), `name`, `email`, `phone`, `address`, `code`,
`currency`, `locale`, `timezone`, `commercials_visible`, `alt_names` (0083).
**`code` is a REFERENCE,
never an identifier**, staff assign it when work starts (BERG), it is unique-when-present
(a partial unique index, so two people can't mint the same one at the same
instant) and nullable, and every route addresses a row by its ULID `id`. Re-coding
an account therefore re-points nothing. **`alt_names` (0083, c-misspell) is a
JSON array of spellings a PERSON declared** — never a generated variant —
`rebuildNameIndex` (`workers/content/src/lib/knowledge.ts`) writes one
`knowledge_names` alias row per entry, read identically to `code`'s own alias:
exact match, no rarity gate. Empty (`'[]'`) means what it always meant: no
declared alternate spelling, the canonical name is the only one the router
knows. As of 11 Sep 2026 nothing in the app writes to this column at all — no
door reads it as a body field yet, so today it can only be set by a direct
data write; the write door and a screen to edit it are proposed, not built,
see the commit for the c-misspell ruling. **The loop guard is the write itself**: a
move rides a recursive `WITH … UPDATE … WHERE NOT EXISTS (ancestors)`, so two
admins re-parenting at the same instant cannot co-operate their way into a ring
(CONCURRENCY rule 1); zero rows changed is the refusal, reported as a plain 409.
**`status` is kept and means nothing (0042, 19 Aug 2026).** It held the commercial
lifecycle — prospect → client → past client — as free text behind a pick-or-TYPE
box, and it was a second answer to a question `deactivated_at` already answered:
is this account live? The two drifted exactly as a second source of truth does.
On the live data the day it was retired, 24 companies held FOUR spellings of two
ideas (`client` 13, `past client` 6, `active` 4, `active_client` 1 — the raw token
copied out of the form's own placeholder), all 106 contacts said `active`, which
is 106 rows carrying no information and one word printed on every row of the list,
and not one of the 130 accounts had ever been archived, so the mechanism that DOES
answer the question had never been used. One of the three seeded dropdown values
was literally `archived`, competing with the flag underneath it.

Nothing reads the column now — not the row type, the SELECT, the sort menu, the
door's filter, create, update, the audit diff, the CSV column, the two MCP tools
or either detail screen. It survives because it records what people typed while
the idea existed, which is the same reason nothing here is ever deleted, and the
same shape `meetings.status` already has (§ *meetings*). The `Account status`
dropdown group is DEACTIVATED by the migration rather than deleted, so it stops
being offered on the Dropdown values screen without losing its history.

**`account_manager_user_id` (0091, `0091_accounts_get_an_account_manager`, 14 Sep
2026)** — the STAFF MEMBER responsible for this account, the client's own
ruling verbatim: "who the account responsible or account manager is, like
someone from staff." Nullable, no backfill (nobody has been assigned yet on
every account that existed before this shipped), and NO SQL FOREIGN KEY — the
id it names is a `team_members`/`users` row, and those tables live in the
GLOBAL core database while `accounts` lives in this team's own, reached over
the REST door, so a cross-database REFERENCES constraint cannot be declared.
`knowledge_sources.owner_user_id` (0012) is the standing precedent for this
exact shape. Checked at the WRITE DOOR instead
(`workers/tenancy/src/routes/accounts.ts`, `requireStaffMember`): the id shape
first (R20, positional), then that it names a CURRENT `team_members` row of
THIS team that does NOT also hold a `portal_users` row — a client login is an
ordinary team member (grant → invite → accept), so membership alone cannot
tell a colleague apart from a client sitting in the same table, and the check
reads `portal_users` the same way `listMembers` computes `isClient`. Indexed
(`idx_accounts_manager`), plain and non-unique, the same shape as
`idx_accounts_parent` and the two assignee indexes on `stories`/`tasks`. On the
WIRE it is `accountManagerId`, the id only — the manager's FACE (name,
picture, R35) is resolved CLIENT-SIDE off the already-cached members list
(`web/lib/members.ts`'s `assignableMembers`), the same seam an assignee's face
already is, so a second network read is never spent on it (R56). `null` on
the way out to a client login (`toAccount`'s `ours` branch): a staffing
decision about them, the same reasoning `commercialsVisible` two lines up
carries — the portal has never offered a "who is my contact" feature this
would answer, so the conservative default withholds it. Not an import
`TargetDef` column (`workers/data-ops/src/lib/targets.ts`'s `accounts`
target): the same reasoning that target's own header already gives for
leaving out the parent account and `stories`' header gives for leaving out the
assignee — "ids in this app and names in a spreadsheet, and a wrong guess is
worse than a blank" — set afterward, on the record, by the person who knows.

**And already-there is not a move** (R17): `setAccountParent` compares the stored
row's `parent_account_id` first and returns `false` without writing at all, so a
repeat costs no history row and no live ping. The no-op predicate cannot ride the
UPDATE the way the archive toggle's does, because on this statement zero rows
changed already MEANS the ring refusal, and a no-op reported as "that would put
the account inside itself" is a sentence that isn't true. **Who moves one**: a
CONTACT is moved from her own record (the parent-account control on her Overview,
`web/components/accounts/contact-detail.tsx`) — people change jobs; a COMPANY is moved by
the assistant (`set_account_parent`) or an import column, because a company an
agency takes on is its own thing and its create/edit form deliberately never asks.

**The two ceilings on the tree, said out loud** (R14's premise is that every read
states its cap): the accounts table is the one self-nesting structure in the base,
so it is the one place a walk could run away with itself, and both walks stop.
**`MAX_ACCOUNT_DEPTH` (64, `shared/workers/limits.ts`)** bounds the loop guard's
climb when a record is re-parented: past 64 ancestors the walk can no longer PROVE
the move is ring-free, so it **refuses the move**, fails closed, never open. Far
deeper than any real org chart, and a refusal you would only ever meet by building
a chain nobody meant. **`SCOPE_HARD_CAP` (500, `shared/workers/account-scope.ts`)**
bounds the other direction: the reach walk that decides which accounts a client may
see stops at 500 rows. Past that the account set is wrong in the SAFE direction,
it stops early and grants LESS, never more. Both numbers are one-line changes, and
both are deliberately generous rather than tuned.

`account_links`: audit block + `account_id` (the company side),
`person_account_id` (the person's own account row), `relationship`,
`is_main_stakeholder`. This is what the parent pointer **cannot** say: a single
parent pointer holds one account, so a table beside it is what let Marta be
recorded as a contact of Bergman *and* of Delaval, one row per company. A partial
unique index on the active pair is the duplicate race guard. "Contact" is a role
word, not a table: it is this row.

**THE REASONING ABOVE STOPPED APPLYING ON 22 SEP 2026. IT IS NOT OVERRULED; ITS
PREMISE CHANGED.** Aurora's ruling that day: one person can only be at one
company. The cap `account_links` existed to avoid ("a single parent has room for
one") is now the rule itself, so the argument that made `account_links`
necessary has nothing left to defend: it was correct about what a single pointer
cannot express while more than one company was allowed, and once more than one
is not allowed there is no longer a gap for it to fill. The evidence behind the
ruling: on the live data exactly three people sit at two companies today, and
all three are test rows. The canonical example this document named, Marta at
Bergman *and* Delaval, is itself seed data
(`workers/tenancy/test/spine-harness.ts`) on `bergman.example` and
`delaval.example`, both reserved test domains (RFC 2606); no real contact is
affected. The fix is a SHAPE change, not a validation: the contacts table will
carry a single account column, so there is nowhere to put a second one and no
door has to remember the rule; a contact still belongs to a company, or to none
at all. That change, including retiring `account_links` and the reasoning above,
belongs to the session doing the table split, not this one.

`portal_users`: audit block + `account_id`, `user_id` (the GLOBAL users row),
`app_restriction`, and `current_account_id` (added by `0008`, below). **The login
switch, and independent of linking**: an individual can be linked with no login, a
freelancer can hold a login on their own parentless account.

> **`app_restriction` is CARRIED, NOT ENFORCED. Read this before you rely on it.**
> The column is written and read back honestly, and the guard corridor
> (`shared/workers/account-scope.ts`) puts it on the caller's stamp. Nothing acts
> on it. It is the per-person "only these named Apps" narrowing from SCOPE ch.03,
> and the Apps module that is the only thing able to honour it has not landed yet,
> so today a value in this column changes **nothing** about what a client can see:
> their fence is their account's world, whole. Treat a non-null value as a note of
> intent, never as a restriction in force, a field that looks like a security
> control and is not is worse than no field at all, which is why the guard
> corridor says so at the field itself and why it is said plainly here. The grant
> door accepts it (`POST` accounts → `appRestriction`) and the read hands it back;
> neither narrows anything. When the Apps module lands, enforcing it is the work. The audit block IS the grant
record (creator_* = who granted, deactivator_* = who revoked), so there is no
second `granted_by` column to keep in step. **Revoke deactivates, never deletes**,
login dies, every record stays, and a partial unique index on `user_id` where
active means at most ONE live grant per person, which is what pins a caller to
exactly one account set.

**How a login is handed out.** Staff never type an address: the grant door takes
a `personAccountId` (a contact of the account, or the account itself when it is a
person), reads THAT row's email through the fence, and matches it to the global
`users` row. Identity is resolved outside the fence, so the email it is resolved
by has to come from inside it, staff can only ever switch access on for people
already on their own books. The person must have signed in here at least once
(there is no client invite yet); both refusals name them and say what to do next.
`userId` is still accepted directly for a machine caller that already holds one.

**The guard corridor** (`shared/workers/account-scope.ts`) is the one place a
caller's account set is decided: session → person → account set, and every
account-scoped statement ANDs its clause into the WHERE (reads *and* writes, the
fence rides the statement, it is never a pre-check). Portal-ness is decided by the
PRESENCE of a portal_users row, never by its absence: a revoked row still makes
you a portal caller, pinned to the EMPTY set, rather than silently promoting a
former client to staff. Enforced by `workers/tenancy/test/account-leak.test.ts`,
which derives the account-scoped routes off disk and sends a burglar at each.

### portal_users.current_account_id. KEEP (BUILT 2026-08-10, team migration `0008_portal_current_account`), where a client is standing

One column, and the whole account switcher stands on it. A client login belongs to
one company at a time and switches between them (owner decision, 10 Aug 2026, the
same bargain the team switcher makes: you own the data, it simply isn't fetched
while you're standing somewhere else). `current_account_id` is that pointer and
nothing more: it **NARROWS** the fence to one of the companies the person already
belongs to, and it can never widen it, the guard corridor re-derives the roots
first and only then honours the pointer, so a value naming a company they have no
grant on is ignored, not obeyed.

`NULL` means "not chosen yet", which the corridor reads as their first company
(roots are id-ordered, so the fallback pick is the same on every request, a
switcher that moved you on refresh would be a bug you could not reproduce). That is
why the migration needs no backfill: every grant that existed before it keeps
working untouched.

**WITHOUT `0008` applied to a team's database, the account switcher breaks**: every
read of `portal_users` hits a missing column, so switching companies fails and a
person who acts for two of the agency's clients is stuck in whichever one comes
first. Roll it with `POST /api/tenancy/admin/migrate-teams` (x-admin-key) before
deploying the portal, same rule as every team-schema migration.

