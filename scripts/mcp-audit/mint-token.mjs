// Mint a staging MCP token for a manual quality/measurement pass over the
// catalogue — the setup step behind MCP.md's own "get a token" instructions,
// scripted so it never prints the secret. Signs in as the real agency admin
// (alaap@kwapso.com) via the staging-only test-login door, makes sure the
// session is pinned to the Kwapso team, and creates a personal access token.
//
// The SECRET is written to an OUT-OF-REPO file (see TOKEN_PATH below) —
// never printed, never logged, never inside this worktree. Revoke it when
// you're done: node scripts/mcp-audit/revoke-token.mjs
import { writeFileSync, chmodSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { makeApi, timedFetch } from "../lib/api.mjs"
import { testLoginKey, NO_KEY_MESSAGE } from "../lib/test-login-key.mjs"
import { FRONT_DOORS } from "../lib/front-doors.mjs"
import { TOKEN_PATH } from "./token-path.mjs"

const BASE = FRONT_DOORS.staging.agency
const ADMIN_EMAIL = "alaap@kwapso.com"

const api = makeApi(BASE)
const TEST_LOGIN_KEY = testLoginKey()
if (!TEST_LOGIN_KEY) {
  console.error(NO_KEY_MESSAGE)
  process.exit(1)
}

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

const cookie = await signIn(ADMIN_EMAIL)
console.log(`signed in as ${ADMIN_EMAIL}`)

const activeBefore = await api("/api/tenancy/active", {}, cookie)
console.log("current team:", activeBefore.body?.team?.name, activeBefore.body?.team?.id)

if (activeBefore.body?.team?.name !== "Kwapso") {
  const teams = await api("/api/tenancy/teams", {}, cookie)
  const kwapso = (teams.body?.teams ?? []).find((t) => t.name === "Kwapso")
  if (!kwapso) throw new Error(`no "Kwapso" team in this admin's team list: ${JSON.stringify(teams.body)}`)
  const switched = await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: kwapso.id }) }, cookie)
  console.log("switched to Kwapso:", switched.ok, kwapso.id)
} else {
  console.log("already on the Kwapso team")
}

const active = await api("/api/tenancy/active", {}, cookie)
console.log("active team now:", active.body?.team?.name, active.body?.team?.id, "role:", active.body?.role?.title)

const created = await api(
  "/api/mcp/tokens",
  { method: "POST", body: JSON.stringify({ label: `MCP quality audit — ${new Date().toISOString().slice(0, 10)} (temporary)` }) },
  cookie
)
if (!created.ok || !created.body?.secret) throw new Error(`token creation failed: ${JSON.stringify({ status: created.status, body: created.body })}`)

mkdirSync(dirname(TOKEN_PATH), { recursive: true })
writeFileSync(TOKEN_PATH, created.body.secret, { encoding: "utf8" })
chmodSync(TOKEN_PATH, 0o600)
console.log(`token minted: id=${created.body.token.id} team=${created.body.token.teamId} expires=${created.body.token.expiresAt}`)
console.log(`secret written to ${TOKEN_PATH} (chmod 600, out of repo) — not printed`)
console.log(`revoke it when done: node scripts/mcp-audit/revoke-token.mjs`)
