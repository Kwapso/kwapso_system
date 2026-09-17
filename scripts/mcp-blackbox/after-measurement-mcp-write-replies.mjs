// AFTER-MEASUREMENT for feat/mcp-write-replies — run ONLY once the merged main
// this branch landed on has been shipped to staging.
//
// Reproduces the exact two calls the mystery-shopper's black-box run made
// (create_help_ticket, then update_help_ticket) against the SAME live door,
// through the same route a real outside tool takes — POST /mcp with a Bearer
// token, no service bindings, no shortcuts — and measures the reply the same
// way score.mjs does: Buffer.byteLength of the tool result's own `content[0].text`
// (the door's real JSON, not the JSON-RPC envelope around it).
//
// Signs in as alaap@kwapso.com (the real Kwapso team, same scale — 2,073+
// tickets — the mystery-shopper's 65,167 / 65,178 byte numbers were measured
// against) rather than a fresh sandbox team, because the whole point is an
// apples-to-apples comparison against those numbers, not a fixture's. Mints its
// OWN fresh, narrowly-labelled token rather than touching any standing one, and
// cleans up after itself: archives the ticket it created, revokes the token it
// minted. Prints the token label + id but never the secret.
//
//   node scripts/mcp-blackbox/after-measurement-mcp-write-replies.mjs
//   (TEST_LOGIN_KEY from the environment, or the Keychain entry
//   "test-login-key-kwapso" — see scripts/lib/test-login-key.mjs)

import { makeApi, makeRpc, timedFetch } from "../lib/api.mjs"
import { testLoginKey, NO_KEY_MESSAGE } from "../lib/test-login-key.mjs"
import { FRONT_DOORS } from "../lib/front-doors.mjs"

const BASE = process.env.SMOKE_BASE || FRONT_DOORS.staging.agency
const ADMIN_EMAIL = "alaap@kwapso.com" // the real Kwapso team — see this file's header for why

const TEST_LOGIN_KEY = testLoginKey()
if (!TEST_LOGIN_KEY) {
  console.log(NO_KEY_MESSAGE)
  process.exit(1)
}

const api = makeApi(BASE)
const rpc = makeRpc(BASE)

async function signIn(email) {
  const start = await api("/api/auth/admin/test-login", {
    method: "POST",
    headers: { "x-admin-key": TEST_LOGIN_KEY },
    body: JSON.stringify({ email }),
  })
  const code = start.body?.code
  if (typeof code !== "string") throw new Error(`could not mint a login code for ${email}: ${JSON.stringify(start.body)}`)
  const verify = await timedFetch(`${BASE}/api/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  })
  const cookie = (verify.headers.get("set-cookie") ?? "").split(";")[0]
  if (!/^(__Host-)?kwapso_session=/.test(cookie)) throw new Error(`sign-in failed for ${email}: status ${verify.status}`)
  return cookie
}

async function callTool(bearer, name, args = {}) {
  const { status, body } = await rpc(bearer, "tools/call", { name, arguments: args })
  const text = body?.result?.content?.[0]?.text ?? ""
  let data = null
  try {
    data = JSON.parse(text)
  } catch {}
  return { status, isError: body?.result?.isError === true, text, data, rpcError: body?.error ?? null }
}

async function main() {
  console.log(`base: ${BASE}`)
  const cookie = await signIn(ADMIN_EMAIL)
  const active = await api("/api/tenancy/active", {}, cookie)
  const team = active.body?.team
  console.log(`signed in as ${ADMIN_EMAIL} — team ${team?.name} (${team?.id})`)
  if (team?.name !== "Kwapso")
    console.log(`WARNING: expected the real Kwapso team, got "${team?.name}" — numbers will not compare to the mystery-shopper's`)

  const created = await api(
    "/api/mcp/tokens",
    { method: "POST", body: JSON.stringify({ label: "mcp-write-replies after-measurement" }) },
    cookie
  )
  const SECRET = created.body?.secret
  const tokenId = created.body?.token?.id
  if (!SECRET || !tokenId) throw new Error(`could not mint a token: status ${created.res.status}`)
  console.log(`token minted: id ${tokenId} (secret withheld)`)

  try {
    const create = await callTool(SECRET, "create_help_ticket", {
      description:
        "BYTESIZE-CHECK: mcp-write-replies after-measurement — safe to archive, created by after-measurement-mcp-write-replies.mjs",
    })
    if (create.status !== 200 || create.isError) throw new Error(`create_help_ticket failed: ${JSON.stringify(create)}`)
    const ticketId = create.data?.id
    if (!ticketId) throw new Error(`create_help_ticket answered with no id: ${create.text.slice(0, 300)}`)
    const createBytes = Buffer.byteLength(create.text)

    const update = await callTool(SECRET, "update_help_ticket", {
      id: ticketId,
      description:
        "BYTESIZE-CHECK: mcp-write-replies after-measurement — updated, safe to archive, created by after-measurement-mcp-write-replies.mjs",
    })
    if (update.status !== 200 || update.isError) throw new Error(`update_help_ticket failed: ${JSON.stringify(update)}`)
    const updateBytes = Buffer.byteLength(update.text)

    console.log(
      JSON.stringify(
        {
          before: { createBytes: 65167, updateBytes: 65178, source: "mystery-shopper run, findings.md" },
          after: { createBytes, updateBytes, ticketId, ref: create.data?.ref },
        },
        null,
        2
      )
    )

    // CLEANUP — archive the ticket this run raised.
    const archived = await callTool(SECRET, "archive_help_ticket", { id: ticketId, archived: true })
    console.log(`cleanup: archived ${ticketId} — ${archived.status === 200 && !archived.isError ? "ok" : "FAILED, archive by hand"}`)
  } finally {
    // CLEANUP — revoke the token this run minted, whatever happened above.
    const revoked = await api("/api/mcp/tokens/revoke", { method: "POST", body: JSON.stringify({ id: tokenId }) }, cookie)
    console.log(`cleanup: revoked token ${tokenId} — ${revoked.ok ? "ok" : "FAILED, revoke by hand"}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
