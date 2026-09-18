# MCP blackbox — cleanup

Run this after the test is over. It archives the two BLACKBOX records the
tester created (tasks 8/9) and shuts the sandbox down. Nothing here is a
delete — the deactivate-not-delete rule holds, so this is reversible.

**RUN 4 — the real narrow-role run — is complete and DONE end to end.**
The tester ran 13:12–13:19 IST inside the `kwapso_cpaa` checkout, calling
the staging `/mcp` door directly over HTTP with the sandbox token (48
`mcp_call_log` rows under it, including the setup session's own earlier
live probes of tasks 13-20). Answers: `~/Desktop/kwapso-mcp-blackbox/answers.md`
(the tester's own working folder, outside this repo — not in this
worktree or the primary checkout).

**Token revoked 2026-09-18T07:52:04Z UTC (~13:22 IST)**, through the
app's own revoke door (`POST /api/mcp/tokens/revoke`, signed in as the
token's owner, the same test-login flow `setup.mjs` uses) — token id
`01M2S9B44A9Y1VRFRX74YMVBJ5`. **The Keychain item
`mcp-blackbox-token-kwapso` was deliberately LEFT IN PLACE** this time
(unlike the run-1 cleanup below) so nothing else that reads it breaks;
it now holds a secret for a revoked token, which is inert but not
misleading — `security find-generic-password -s mcp-blackbox-token-kwapso -w`
still returns a value, it just no longer authenticates anywhere.

**The worktree `.worktrees/mcp-blackbox` has been removed from disk**
(`git worktree remove`, no branch deleted) — this branch is edited from
a freshly re-added worktree at the same path when needed, and removed
again afterward, so a stray `answers.md`/`tasks.md` copy never sits
where a tester session inside the primary checkout could read it.

**Dead local MCP connector.** The owner's `~/.claude.json` holds a
LOCAL-SCOPE entry named `machine-tester`, scoped to
`~/Desktop/kwapso-mcp-blackbox` (the tester's working folder), pointing
at the now-revoked token. It is dead and can be removed by running, from
that folder:

```bash
claude mcp remove machine-tester
```

Only the owner can do this (this session doesn't reach his `~/.claude.json`
or his desktop app's connector list). Leaving it is harmless — a revoked
token just gets `401`s — but it is the thing to strip before pointing
that same folder at a NEXT sandbox token, so a fresh run doesn't
accidentally inherit a stale connector under the same name.

**The wrong-token finding from the FIRST tester run (run 3, 16 tool
calls) is now resolved**: that run's calls landed on
`alaap@kwapso.com`'s own standing Admin token because more than one MCP
connector was apparently reachable and nothing forced a check. Run 4
fixed this by having the tester call the staging `/mcp` door directly
over HTTP with the narrow token, inside this checkout, rather than
through a desktop-app connector that could point at the wrong thing.

Fill in `<ticket-id>` and `<todo-id>` from the tester's `answers.md` (or
look them up: `list_help_tickets({"q":"BLACKBOX-1"})` /
`query_records({"module":"todos", "where":[{"field":"title","op":"eq","value":"BLACKBOX-2"}]})`).

Fixed ids from setup, for reference:

- team: `01KZWXFD86N0K3RZRBHKMKRWYS` ("Kwapso")
- role: `01M2N1JJNPDF7KB7XA1T6KH9BF` ("Machine tester")
- machine-tester member (token owner): `01M2N0N8GFQ042H68AQFWAVR88`
  (`delivered+mcp-blackbox@resend.dev`)
- token id (run 4, revoked 2026-09-18T07:52:04Z): `01M2S9B44A9Y1VRFRX74YMVBJ5`
  (or list the owner's tokens — `GET /api/mcp/tokens` as that user — for
  the current one; every id this sandbox has ever minted is revoked as
  of this writing)
- test account used for the writes: "PLATINUM" (`01KZXBTAJXJXE3J1GYX7MFYYXB`)

**Steps 1/2 below need a LIVE token** — the run-4 token is revoked, so
mint a fresh one first (`node scripts/mcp-blackbox/setup.mjs`) if you
want to actually archive/cancel the BLACKBOX-1/BLACKBOX-2 records from
this run. Not done as part of this cleanup pass — the planner asked
specifically not to touch the "Machine tester" role or its rights right
now (a scorer may still want to read them as-is), and step 2's technique
below temporarily widens `inputs:delete` on that exact role.

The earlier dry-run sandbox on the Smoke team (see `dry-run/README.md`) is
already torn down: both of its tokens
(`01M2N0RF3Z63N569K1CRQH1PYJ`, `01M2N0NSDWD6JJRHKPPH0R0WP2`) were revoked
when this sandbox moved to the Kwapso team. Its role and member were left
in place on the Smoke team (harmless scratch data, same team the smoke
suites already churn) — nothing further to do there unless you want it
gone too.

## 1. Archive the ticket (the sandbox token can do this on its own — `help:update`)

```
tools/call archive_help_ticket {"id": "<ticket-id>", "archived": true}
```

## 2. Cancel the to-do

The sandbox role deliberately holds no delete right, so `cancel_todo` isn't
on its catalogue. Grant it once, use it, take it back — never leave the
sandbox more powerful than the test needed it to be.

```bash
# as the admin (alaap@kwapso.com), via the same test-login flow setup.mjs uses
POST /api/tenancy/roles/permissions
  { "roleId": "01M2N1JJNPDF7KB7XA1T6KH9BF", "value": { …same matrix as setup.mjs, but "inputs": { "read": true, "create": true, "update": true, "delete": true } } }
```

Then, with the sandbox token:

```
tools/call cancel_todo {"id": "<todo-id>"}
```

Then restore the role to its original shape (delete back to `false` on
`inputs`) — or just re-run `node scripts/mcp-blackbox/setup.mjs`, which
always resets the matrix to the narrow one.

## 3. Revoke the token

**Already done for run 4** (`01M2S9B44A9Y1VRFRX74YMVBJ5`, revoked
2026-09-18T07:52:04Z — see the note at the top). Kept below as the
general recipe for the NEXT run. Revoking is scoped to the token's
OWNER, not the admin — sign the machine-tester account in the same way
`setup.mjs` does (the staging test-login door) and call:

```
POST /api/mcp/tokens/revoke
  { "id": "<current live token id>" }
```

Then drop it from the Keychain — **skipped this time on the planner's
instruction** (keep the item so nothing else that reads it breaks; it's
inert once the token behind it is revoked):

```bash
security delete-generic-password -s mcp-blackbox-token-kwapso
```

## 4. Tear the sandbox down (optional — only if nobody will run this test again)

```
POST /api/tenancy/roles/active   { "roleId": "01M2N1JJNPDF7KB7XA1T6KH9BF", "active": false }
POST /api/tenancy/members/remove { "userId": "01M2N0N8GFQ042H68AQFWAVR88" }
```

If another mystery-shopper run is likely, skip step 4 — `setup.mjs` is
idempotent and will find and reuse the same role, member and (a fresh)
token next time.
