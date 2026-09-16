# MCP blackbox — cleanup

Run this after the test is over. It archives the two BLACKBOX records the
tester created (tasks 8/9) and shuts the sandbox down. Nothing here is a
delete — the deactivate-not-delete rule holds, so this is reversible.

**Step 3 (revoke) is already DONE, by the scorer.** Token
`01M2N1JV4Y23M64E6W7SRG6662` is revoked and the Keychain item
`mcp-blackbox-token-kwapso` has been deleted — confirmed again 2026-09-16
(nothing live remains under it). Steps 1/2 (archive the BLACKBOX ticket,
cancel the BLACKBOX to-do) are still open if they weren't done separately.

**Why the tester's run didn't test the narrow role at all**: the scorer
found (`mcp_call_log`) that the tester's 16 calls ran under
`alaap@kwapso.com`'s own standing Admin token, not this sandbox token —
whichever MCP connector the tester session had configured pointed at the
owner's personal token, not the one this sandbox minted. **A real
narrow-role run needs a fresh tester session whose only MCP connector
carries a freshly-minted sandbox token** — `setup.mjs` can mint that
token again any time, but only the owner can point a tester session's
connector at it (this session doesn't configure the desktop app's MCP
connectors, and cannot mint the connection on the tester's behalf).

Fill in `<ticket-id>` and `<todo-id>` from the tester's `answers.md` (or
look them up: `list_help_tickets({"q":"BLACKBOX-1"})` /
`query_records({"module":"todos", "where":[{"field":"title","op":"eq","value":"BLACKBOX-2"}]})`).

Fixed ids from setup, for reference:

- team: `01KZWXFD86N0K3RZRBHKMKRWYS` ("Kwapso")
- role: `01M2N1JJNPDF7KB7XA1T6KH9BF` ("Machine tester")
- machine-tester member (token owner): `01M2N0N8GFQ042H68AQFWAVR88`
  (`delivered+mcp-blackbox@resend.dev`)
- token id: `01M2N1JV4Y23M64E6W7SRG6662` (or list the owner's tokens —
  `GET /api/mcp/tokens` as that user — if this id was lost)
- test account used for the writes: "PLATINUM" (`01KZXBTAJXJXE3J1GYX7MFYYXB`)

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

**Already done for this run** (see the note at the top). Kept below for
the next run. Revoking is scoped to the token's OWNER, not the admin — sign the machine-
tester account in the same way `setup.mjs` does (the staging test-login
door) and call:

```
POST /api/mcp/tokens/revoke
  { "id": "01M2N1JV4Y23M64E6W7SRG6662" }
```

Then drop it from the Keychain:

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
