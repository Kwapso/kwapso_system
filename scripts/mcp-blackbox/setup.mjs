// MCP BLACKBOX SANDBOX SETUP — builds the role, the member and the token a
// mystery-shopper tester will connect with. Run once against staging by
// whoever prepares the test; the tester never sees this file.
//
// Signs in through the app's own doors (POST /api/tenancy/roles/permissions,
// /api/tenancy/invites, …) — never a direct database write. Mints the token
// exactly as scripts/smoke-mcp.mjs does, and stores the secret in the
// Keychain rather than printing it: a mystery-shopper task list is read by a
// stranger, and a script whose own output leaks the secret would defeat the
// point of putting it in the Keychain at all.
//
// PARAMETERISED BY TEAM (2026-09-16, planner's ruling): the first pass built
// this on staging's scratch "Smoke team" (3 tickets), which cannot reproduce
// the owner's actual complaint — slow, error-prone runs and reply sizes big
// enough to crash a chat, against the real Kwapso team's 2,047 tickets / 112
// sprints / 134 accounts. So the admin login and the target team are both
// overridable, defaulting to the real Kwapso team on staging. Re-running
// this against a different team re-uses the same role TITLE and member
// EMAIL (both are per-team rows, never shared), and re-mints a fresh token
// into the same Keychain item — the old team's token is a separate row this
// script does not touch; revoke it yourself if the sandbox is moving for
// good (see .session-notes/mcp-blackbox/cleanup.md).
//
//   node scripts/mcp-blackbox/setup.mjs
//   BLACKBOX_ADMIN_EMAIL=… BLACKBOX_TEAM_ID=… node scripts/mcp-blackbox/setup.mjs
//
// Exits non-zero on failure. Prints the Keychain item name and the token's
// id/teamId/role on success — never the secret itself.

import { execFileSync } from "node:child_process"

import { makeApi } from "../lib/api.mjs"
import { testLoginKey, NO_KEY_MESSAGE } from "../lib/test-login-key.mjs"
import { FRONT_DOORS } from "../lib/front-doors.mjs"

const BASE = process.env.SMOKE_BASE || FRONT_DOORS.staging.agency
// The real Kwapso team on staging, and its own admin — not the smoke-suite
// scratch team, which is too small to measure anything against (see header).
const ADMIN_EMAIL = process.env.BLACKBOX_ADMIN_EMAIL || "alaap@kwapso.com"
const EXPECTED_TEAM_ID = process.env.BLACKBOX_TEAM_ID || "01KZWXFD86N0K3RZRBHKMKRWYS"
const OWNER_EMAIL = "delivered+mcp-blackbox@resend.dev" // dedicated machine-owner login for THIS sandbox only
const ROLE_TITLE = "Machine tester"
const KEYCHAIN_SERVICE = "mcp-blackbox-token-kwapso"

const api = makeApi(BASE)

const TEST_LOGIN_KEY = testLoginKey()
if (!TEST_LOGIN_KEY) {
  console.log(NO_KEY_MESSAGE)
  process.exit(1)
}

function stop(why, detail = "") {
  console.log(`FAIL ${why}${detail ? ` — ${JSON.stringify(detail)}` : ""}`)
  process.exit(1)
}

async function signIn(email) {
  const start = await api("/api/auth/admin/test-login", {
    method: "POST",
    headers: { "x-admin-key": TEST_LOGIN_KEY },
    body: JSON.stringify({ email }),
  })
  const code = start.body?.code
  if (typeof code !== "string") stop(`could not mint a login code for ${email}`, start.body)
  const verify = await fetch(`${BASE}/api/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  })
  const cookie = (verify.headers.get("set-cookie") ?? "").split(";")[0]
  if (!/^(__Host-)?kwapso_session=/.test(cookie)) stop(`sign-in failed for ${email}`, `status ${verify.status}`)
  await api("/api/auth/profile", { method: "POST", body: JSON.stringify({ firstName: "Blackbox", lastName: "Tester" }) }, cookie)
  return cookie
}

console.log(`— signing in (${BASE})`)
const adminCookie = await signIn(ADMIN_EMAIL)
await api("/api/tenancy/bootstrap", { method: "POST" }, adminCookie)
const adminActive = await api("/api/tenancy/active", {}, adminCookie)
const TEAM = adminActive.body?.team
if (!TEAM?.id) stop("admin has no ready team", adminActive.body)
if (TEAM.id !== EXPECTED_TEAM_ID)
  stop(`${ADMIN_EMAIL} is standing in ${TEAM.name} (${TEAM.id}), not the expected team ${EXPECTED_TEAM_ID}`, adminActive.body)
if (adminActive.body?.role?.title !== "Admin") stop(`${ADMIN_EMAIL} is not Admin on ${TEAM.name}`, adminActive.body?.role)
console.log(`  team: ${TEAM.name} (${TEAM.id})`)

const ownerCookie = await signIn(OWNER_EMAIL)
await api("/api/tenancy/bootstrap", { method: "POST" }, ownerCookie)

/* ------------------------------------------------------------------------ *
 * The role — read everywhere, create+update on help / inputs (todos) / work
 * (tasks) only, no delete, no team_members, no member_roles, no agent.
 * ------------------------------------------------------------------------ */

console.log("— the role")

const TEAM_MODULES = [
  "teams", "team_members", "member_roles", "accounts", "contacts", "portal_users",
  "help", "knowledge", "selectable_data", "agent", "processes", "deliverables",
  "commercials", "work", "all_tasks", "all_stories", "inputs", "all_inputs",
  "meetings", "brand_assets", "delivery", "staff_profiles", "google", "google_mail",
]
// help = tickets, inputs = the module the app now calls "todos" permission-wise,
// work = tasks (and stories/sprints, which share the one module row).
const WRITE_MODULES = new Set(["help", "inputs", "work"])

const matrix = Object.fromEntries(
  TEAM_MODULES.map((m) => [
    m,
    { read: true, create: WRITE_MODULES.has(m), update: WRITE_MODULES.has(m), delete: false },
  ])
)
// No team access, no rights spend, no role/member management, no agent budget.
matrix.team_members = { read: true, create: false, update: false, delete: false }
matrix.member_roles = { read: true, create: false, update: false, delete: false }
matrix.agent = { read: false, create: false, update: false, delete: false }

const rolesBefore = await api("/api/tenancy/roles", {}, adminCookie)
let role = (rolesBefore.body?.roles ?? []).find((r) => r.title === ROLE_TITLE)
if (!role) {
  const created = await api(
    "/api/tenancy/roles",
    { method: "POST", body: JSON.stringify({ title: ROLE_TITLE, description: "Held by the mystery-shopper MCP sandbox account (.session-notes/mcp-blackbox). Rights are reset on every setup run." }) },
    adminCookie
  )
  role = (created.body?.roles ?? []).find((r) => r.title === ROLE_TITLE)
}
if (!role?.id) stop("could not find or create the role", rolesBefore.body)
if (role.active === false)
  await api("/api/tenancy/roles/active", { method: "POST", body: JSON.stringify({ roleId: role.id, active: true }) }, adminCookie)

const permSet = await api("/api/tenancy/roles/permissions", { method: "POST", body: JSON.stringify({ roleId: role.id, value: matrix }) }, adminCookie)
if (!permSet.ok) stop("could not set the role's rights", permSet.body)
console.log(`  role: ${ROLE_TITLE} (${role.id}) — read everywhere, create+update on help/inputs/work only`)

/* ------------------------------------------------------------------------ *
 * The dedicated member
 * ------------------------------------------------------------------------ */

console.log("— the member")

const membersNow = await api("/api/tenancy/members", {}, adminCookie)
let owner = (membersNow.body?.members ?? []).find((m) => m.email === OWNER_EMAIL)
if (!owner) {
  const invited = await api("/api/tenancy/invites", { method: "POST", body: JSON.stringify({ email: OWNER_EMAIL, roleId: role.id }) }, adminCookie)
  if (!invited.ok) stop("could not invite the machine-tester account", invited.body)
  const received = await api("/api/tenancy/invitations", {}, ownerCookie)
  const mine = (received.body?.invitations ?? []).find((i) => i.teamId === TEAM.id)
  if (!mine?.id) stop("the machine-tester account never received the invite", received.body)
  const accepted = await api("/api/tenancy/invitations/accept", { method: "POST", body: JSON.stringify({ inviteId: mine.id }) }, ownerCookie)
  if (!accepted.ok) stop("could not accept the invite", accepted.body)
  owner = (await api("/api/tenancy/members", {}, adminCookie)).body?.members?.find((m) => m.email === OWNER_EMAIL)
} else if (owner.roleId !== role.id) {
  const moved = await api("/api/tenancy/members/role", { method: "POST", body: JSON.stringify({ userId: owner.userId, roleId: role.id }) }, adminCookie)
  if (!moved.ok) stop("could not move the machine-tester account onto the role", moved.body)
}
if (!owner?.userId) stop("the machine-tester account is not a member of the team")
console.log(`  member: ${OWNER_EMAIL} (${owner.userId}) on ${ROLE_TITLE}`)

/* ------------------------------------------------------------------------ *
 * The token — minted by the member, pinned to this team, secret → Keychain
 * ------------------------------------------------------------------------ */

console.log("— the token")

const switched = await api("/api/tenancy/switch-team", { method: "POST", body: JSON.stringify({ teamId: TEAM.id }) }, ownerCookie)
if (switched.body?.team?.id !== TEAM.id) stop("machine-tester account could not stand in the sandbox team", switched.body)

const created = await api("/api/mcp/tokens", { method: "POST", body: JSON.stringify({ label: "MCP blackbox sandbox" }) }, ownerCookie)
const secret = created.body?.secret
const tokenId = created.body?.token?.id
if (typeof secret !== "string" || !/^kwapso_mcp_[0-9a-f]{64}$/.test(secret)) stop("token mint failed", { status: created.status })

execFileSync("security", ["add-generic-password", "-a", process.env.USER ?? "kwapso", "-s", KEYCHAIN_SERVICE, "-w", secret, "-U"], { stdio: "ignore" })

console.log(`  token minted, secret stored in the Keychain as "${KEYCHAIN_SERVICE}"`)
console.log(`  token id: ${tokenId}, teamId: ${TEAM.id}, role: ${ROLE_TITLE}`)
console.log("\nSandbox ready. Fetch the secret for the tester with:")
console.log(`  security find-generic-password -s ${KEYCHAIN_SERVICE} -w`)
