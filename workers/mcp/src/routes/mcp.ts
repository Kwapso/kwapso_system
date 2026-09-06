// THE MCP DOOR — one JSON-RPC endpoint, and the protocol bits that only it uses.
//
// Lifted out of index.ts on 6 Sep 2026 so this worker has the same shape as
// every other one: a declarative ROUTES table in index.ts, handlers as exported
// async functions under routes/. The move is what lets the SHARED seam scanner
// read this surface — `indexFunctions` walks routes/ and indexes
// `export async function`, so while these lived as `case` arms round a private
// switch, mcp could only be checked by a hand-rolled regex of its own. Nothing
// here changed but the file it sits in and the `export` keyword.

import { fail, json } from "@shared/workers/http"
import { GuardError } from "@shared/workers/gating"
import { callerHasBudget, TOO_FAST } from "@shared/workers/rate-limit"
import { requestId } from "@shared/workers/trace"
import { brand } from "@shared/brand"

import type { Env } from "../env"
import { verifyToken } from "../lib/tokens"
import { sessionCookieFor } from "../lib/bridge"
import { forwardTool, getMcpTool, MCP_TOOLS } from "../lib/tools"

const PROTOCOL_VERSION = "2025-06-18"

/* ------------------------------- JSON-RPC bits ------------------------------- */

type RpcRequest = { jsonrpc?: string; id?: number | string | null; method?: string; params?: Record<string, unknown> }

const rpcResult = (id: number | string | null, result: unknown) =>
  json({ jsonrpc: "2.0", id, result })
const rpcError = (id: number | string | null, code: number, message: string) =>
  json({ jsonrpc: "2.0", id, error: { code, message } })

/** One MCP request: verify the bearer token, dispatch the method. Stateless —
 * no server-held MCP session; every request re-verifies the token (so a revoke
 * bites immediately) and rides a cached-or-fresh team-pinned session cookie. */
export async function handleMcp(request: Request, env: Env): Promise<Response> {
  const bearer = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!bearer)
    return fail(401, "no_token", "Send a personal access token: Authorization: Bearer <token>.")
  const token = await verifyToken(env, bearer)

  // THE MACHINE SURFACE'S OWN CEILING, spent per TOKEN OWNER and separately from
  // their budget inside the app (rate-limit.ts). It sits here because this is where
  // the caller becomes known, exactly as `teamContext` is that point for the app —
  // and it is worth having on top of the per-worker budgets behind it, because one
  // JSON-RPC call can become several forwarded door calls: refusing the loop at the
  // front is cheaper than refusing each of its consequences.
  if (!(await callerHasBudget(env, token.user_id, "machine")))
    throw new GuardError(429, "too_many_requests", TOO_FAST)

  const rpc = (await request.json().catch(() => null)) as RpcRequest | null
  if (!rpc || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string")
    return rpcError(null, -32600, "Expected a JSON-RPC 2.0 request.")
  const id = rpc.id ?? null

  switch (rpc.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: `${brand.name}-mcp`, version: "1.0.0" }, // brand-derived; kwapso's value unchanged
        instructions:
          "kwapso's machine surface. Every tool acts AS the token's owner, capped by their live role, inside the token's pinned team only. AI-costed tools (plan_import, agent_chat) draw from the team's assistant quota.",
      })
    case "notifications/initialized":
      return new Response(null, { status: 202 })
    case "ping":
      return rpcResult(id, {})
    case "tools/list":
      return rpcResult(id, {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      })
    case "tools/call": {
      const name = String(rpc.params?.name ?? "")
      const tool = getMcpTool(name)
      if (!tool) return rpcError(id, -32602, `No such tool: ${name}.`)
      const input = (rpc.params?.arguments ?? {}) as Record<string, unknown>
      const trace = requestId(request)
      const cookie = await sessionCookieFor(env, token, trace)
      const out = await forwardTool(env, tool, input, cookie, trace)
      return rpcResult(id, {
        content: [{ type: "text", text: out.text }],
        isError: !out.ok,
      })
    }
    default:
      return rpcError(id, -32601, `Unknown method: ${rpc.method}.`)
  }
}
