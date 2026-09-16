// Where the audit token's secret lives, shared by mint-token.mjs (writer),
// mcp-call.mjs (reader) and revoke-token.mjs (reader) so there is exactly one
// answer. Always out of the repo: `MCP_AUDIT_TOKEN_PATH` overrides it (a
// worktree-isolated scratch dir is a good choice when running measurement
// subagents that must not be able to `ls` their way to it from this tree).
import { tmpdir } from "node:os"
import { join } from "node:path"

export const TOKEN_PATH = process.env.MCP_AUDIT_TOKEN_PATH || join(tmpdir(), "kwapso-mcp-audit-token.secret")
