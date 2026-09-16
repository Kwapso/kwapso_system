// `tools/list` TRIMS BY THE CALLER'S LIVE ROLE — the same seam the agent's own
// catalogue trims with, reused rather than re-invented.
//
// Before 15 Sep 2026, `tools/list` on this surface handed every caller the
// WHOLE manifest regardless of role: a Viewer with no rights to remove a
// member, delete a role or archive an account still saw those tools named,
// described, and schema'd — paying to describe doors that were certain to
// refuse them, and offering an auto-approving client a menu wider than its
// token could ever use. `toolSpecs` (workers/data-ops/src/lib/tools.ts) had
// already solved exactly this for the agent's own catalogue: drop a tool
// whose declared WRITE gate (`TOOL_GATES`) the caller's rights sheet does not
// hold. `keptForRights` (@shared/workers/tool-gates) is that predicate pulled
// out so both surfaces share it — this file proves the MCP side actually
// calls it, the same way `heldRights` calls the real my-permissions door.
//
// Fails OPEN in both directions, exactly as `toolSpecs` does: no rights sheet
// (the read failed) keeps everything; a tool with no declared gate (every
// read, and `set_record_active`, which has no single gate across twenty-one
// doors) is never hidden by role.

import { describe, expect, it } from "vitest"

import { keptForRights } from "@shared/workers/tool-gates"
import { heldRights, MCP_TOOLS } from "../src/lib/tools"

/** What `routes/mcp.ts`'s `tools/list` case actually does, called directly so
 * this test is a unit on the real seam rather than a copy of it. */
const manifestFor = (held: Set<string> | undefined) => MCP_TOOLS.filter((t) => keptForRights(t.gate, held))

/** A fake TENANCY fetcher answering the my-permissions door with one caller's
 * whole rights sheet — `module: { read, create, update, delete }`. */
const tenancyAnswering = (permissions: Record<string, Record<string, boolean>>) =>
  ({ fetch: async () => new Response(JSON.stringify({ permissions })) }) as never

describe("tools/list trims by the caller's live role, via the shared seam", () => {
  it("heldRights reads the real my-permissions shape into a module:right set", async () => {
    const env = { TENANCY: tenancyAnswering({ team_members: { read: true, create: false, update: false, delete: false } }) }
    const held = await heldRights(env as never, "session=x", "trace-test")
    expect(held).toEqual(new Set(["team_members:read"]))
  })

  it("a failed rights read keeps the WHOLE manifest — fail open, never a silent shrink", async () => {
    const env = { TENANCY: { fetch: async () => new Response("nope", { status: 500 }) } }
    const held = await heldRights(env as never, "session=x", "trace-test")
    expect(held).toBeUndefined()
    expect(manifestFor(held).length).toBe(MCP_TOOLS.length)
  })

  it("a role with every right sees strictly more tools than one with almost none", async () => {
    const admin = new Set(
      Object.values(
        (await import("@shared/workers/tool-gates")).TOOL_GATES
      )
    )
    const limited = new Set(["help:read"])
    const adminManifest = manifestFor(admin)
    const limitedManifest = manifestFor(limited)
    expect(adminManifest.length).toBe(MCP_TOOLS.length)
    expect(limitedManifest.length).toBeLessThan(adminManifest.length)
  })

  it("a role missing team_members:delete never sees remove_member named at all", () => {
    const limited = new Set(["help:read"])
    const names = manifestFor(limited).map((t) => t.name)
    expect(names).not.toContain("remove_member")
    // A read carries no gate at all (TOOL_GATES maps writes only), so it is
    // never hidden by this filter — the same asymmetry toolSpecs accepts.
    expect(names).toContain("list_help_tickets")
  })

  it("a role holding team_members:delete sees remove_member", () => {
    const held = new Set(["team_members:delete"])
    expect(manifestFor(held).map((t) => t.name)).toContain("remove_member")
  })
})
