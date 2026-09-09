# Concurrency, the race-safety ruleset (LOCKED 2026-06-17)

How the Kwapso System (and every app on this base) stays correct when two people act at the
**same instant**. The trap: a check and the write that depends on it run as
separate steps, so two requests both pass the check and both write, e.g. two
admins demoted at once leaving the team with **zero** admins.

## The rule

A write that protects an **invariant** (a count, a balance, "keep ≥1 admin",
stock-on-hand, a uniqueness rule) must be made race-safe by ONE of:

1. **Atomic conditional SQL**, re-check the invariant *inside* the write's
   `WHERE`, then treat "0 rows changed" as "refused". D1/SQLite runs a single
   statement atomically and serializes writes per database, so two concurrent
   statements can't both win. **This is the default**, no extra moving parts.
   - Example: the last-admin rule. `removeMember` / `changeMemberRole`
     (`workers/tenancy/src/lib/members.ts`) keep a friendly pre-check for the
     fast path, then the actual `UPDATE … WHERE … (SELECT COUNT(*) admins) > 1`
     is the authority; `meta.changes === 0` → reject.

2. **A unique index**, for *uniqueness* invariants, let the database reject the
   duplicate. Use a partial index when only some rows are constrained.
   - Example: at most one **pending** invite per (team, email),
     `db/core/0006_invite_pending_unique.sql`; `createInvite` catches the
     violation and reports it kindly.

3. **A per-entity Durable Object** (serialized read-modify-write). ONLY for
   **hot, multi-step, contended** entities where many writers hammer one thing
   (an inventory cell, a ledger account, a booking slot). The DO handles its
   requests one at a time; apply the *operation* inside it ("decrement by 2")
   and persist before you ack. Reserved for genuine hot counters, most writes
   don't need it.

## What is NOT a lock

The **realtime `TeamChannel` Durable Object is pub/sub only**, it broadcasts
row-level "X changed" pings and holds no data. This is true for **both** channel
scopes (`team:<id>` and the per-user `user:<id>`): neither is in any write path
and neither serializes anything. Each is just **gated** at connect time the same
way the API is, a `team:` socket requires active membership of THAT team, a
`user:` socket must be your OWN id, but a gate is an auth check, not a lock.
Don't reach for a DO just because a write touches shared data: plain D1 rows +
(1) or (2) above cover almost everything (team name, member list, roles…). A DO
instance is for the rare contended hot entity.

## Picking the tool
- Single-statement invariant (count/floor) → **atomic conditional SQL** (1).
- "No duplicates" → **unique / partial-unique index** (2).
- Hot multi-step counter under heavy concurrent load → **Durable Object** (3).
- **A retryable multi-row operation that must run at most once** (an import, a batch
  job) → **claim it atomically first** (a variant of 1). Flip a status field with a
  conditional UPDATE (`SET status='running' WHERE id=? AND status='planned' RETURNING
  id`) *before* doing the work; only the request that wins the flip proceeds, so a retry
  or a double-click can't run it twice and duplicate every row. A crash mid-run leaves it
  `running` (safe, no duplicates); re-create to retry. Guarded for the CSV importer by
  `workers/data-ops/test/import-idempotency.test.ts`. **The rule: a write a client can
  retry must be idempotent.**

## Two people editing the same record: LAST SAVE WINS (ruled 2026-09-07)

The owner's ruling, verbatim: *"I would just assume everything happens
sequentially. If somebody just saves or clicks submit on an edit screen for the
same record that I'm currently editing, I would technically hit the save button
1 or 2 seconds after them. Sequentially, I propagate the latest change, and that
is what should be reflected."*

So there is **no lock, no merge and no prompt on a record edit**, and that is a
decision rather than an omission. What happens concretely, with a form open on a
record a colleague saves:

- their save lands as a row-level live patch (`patchRow`, the R1/R15 seam), so
  the ROW on screen moves to theirs — the collection, the badge, the detail all
  show their version;
- the FORM does not move. `useFormDraft` (R7) seeds from `initial` only on the
  inactive→active edge and never while the form is open, so a new `initial` off
  a patched row cannot reach the values you are typing;
- nothing warns and nothing asks. When you save, the record becomes your draft,
  whole — which is the ruling: the later save is the one that stands.

**This is an invariant, not an emergent property.** It falls out of one
`initialRef` inside `useFormDraft`, so an innocent
`useEffect(() => setValues(initial), [initial])` added to any one dialog would
overwrite somebody's typing with their colleague's and break nothing else.
`web/test/last-save-wins.test.tsx` holds it through a real dialog over a real
cached read (store → host → dialog → form), with the ROW as its canary — a store
that never patched at all would otherwise pass.

**When last-save-wins is the wrong answer, use a real tool from the list above.**
It is right for a record somebody OWNS the editing of (a role's description, a
ticket's fields) and wrong for a counter, a balance or an allocation, where two
saves must both be reflected rather than one replacing the other. Those are the
atomic-UPDATE and Durable-Object cases, not this one.

## While a write is in flight
Serialized or not, the user should never see a dead UI, show feedback
(button spinner + disabled, optimistic update, toast). See the **Loading &
feedback** section of [CACHING.md](CACHING.md).

See [ARCHITECTURE.md](ARCHITECTURE.md) for the Durable-Object code-vs-runtime
model that powers tool (3).

## The attempt limit is atomic (login codes)
A "5 tries" limit written as *read the count, then check, then increment* is
**burstable**: under concurrency N wrong guesses all read `attempts = 4` and each
gets a free try. The fix (LAW-adjacent, B3) is to make the check and the increment
**one statement**, consume a slot in the same UPDATE that enforces the cap, and
read the changed-row count back:

```sql
UPDATE login_codes SET attempts = attempts + 1
 WHERE id = ? AND attempts < ? AND consumed_at IS NULL
```

Zero rows changed = the cap is spent (a correct code consumes a slot too, then
succeeds, the cap counts *tries*, not failures). The login flow and the
email-change flow both use this shape (`workers/auth/src/index.ts`,
`lib/email-change.ts`). Same principle as the never-negative credit decrement
(`WHERE balance > 0`) and the last-admin guard: the invariant rides the WHERE, so
the database enforces it atomically instead of the application racing itself.
