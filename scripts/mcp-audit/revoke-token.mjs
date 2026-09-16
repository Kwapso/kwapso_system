// Revoke the token mint-token.mjs made, and remove its secret from disk.
// Signs in as the same admin to call the revoke door with a real session —
// the bearer token itself cannot revoke its own row (token management is a
// human action from the app, never available to a bearer token; see
// workers/mcp/src/routes/tokens.ts requireUser).
import { existsSync, readFileSync, rmSync } from "node:fs"
import { makeApi, timedFetch } from "../lib/api.mjs"
import { testLoginKey, NO_KEY_MESSAGE } from "../lib/test-login-key.mjs"
import { FRONT_DOORS } from "../lib/front-doors.mjs"
import { TOKEN_PATH } from "./token-path.mjs"

if (!existsSync(TOKEN_PATH)) {
  console.log(`no token secret at ${TOKEN_PATH} — nothing to revoke (already done?)`)
  process.exit(0)
}

const BASE = FRONT_DOORS.staging.agency
const ADMIN_EMAIL = "alaap@kwapso.com"
const api = makeApi(BASE)
const TEST_LOGIN_KEY = testLoginKey()
if (!TEST_LOGIN_KEY) {
  console.error(NO_KEY_MESSAGE)
  process.exit(1)
}

const start = await api("/api/auth/admin/test-login", {
  method: "POST",
  headers: { "x-admin-key": TEST_LOGIN_KEY },
  body: JSON.stringify({ email: ADMIN_EMAIL }),
})
const code = start.body?.code
if (typeof code !== "string") throw new Error(`could not mint a login code: ${JSON.stringify(start.body)}`)
const verify = await timedFetch(`${BASE}/api/auth/email/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: ADMIN_EMAIL, code }),
})
const cookie = (verify.headers.get("set-cookie") ?? "").split(";")[0]
if (!/^(__Host-)?kwapso_session=/.test(cookie)) throw new Error(`sign-in failed: status ${verify.status}`)

const secret = readFileSync(TOKEN_PATH, "utf8").trim()
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))
const hashPrefix = [...new Uint8Array(digest)].slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join("")

const list = await api("/api/mcp/tokens", {}, cookie)
const rows = list.body?.tokens ?? []
// Find OUR row by label prefix (the secret's own hash isn't returned by the
// list door, by design — token_hash never leaves the server), then revoke
// the newest matching, unrevoked one.
const mine = rows
  .filter((t) => typeof t.label === "string" && t.label.startsWith("MCP quality audit") && !t.revokedAt)
  .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0]
if (!mine) {
  console.log("no matching live audit token found in the list — check Settings > Access tokens by hand")
} else {
  const revoked = await api("/api/mcp/tokens/revoke", { method: "POST", body: JSON.stringify({ id: mine.id }) }, cookie)
  console.log(`revoked token ${mine.id} (${mine.label}):`, revoked.ok)
}

rmSync(TOKEN_PATH)
console.log(`removed ${TOKEN_PATH} [hash prefix ${hashPrefix}… for cross-check, not the secret]`)
