// THE APP RECORD'S OWN KNOWLEDGE TAB — client ruling, 17 Sep 2026, verbatim:
// "In the Knowledge tab, replicate what we have in the general knowledge.
// This should just be a gallery with all the knowledge we have about this,
// with a toolbar that I can search and filter, blah, blah, blah, and a
// button to ask about this. This should open a conversation with the
// assistant only about this app."
//
// FOUR PROOFS, off the real call sites — the same "read source off disk"
// technique this screen's own sibling tests (knowledge-head.test.tsx,
// knowledge-kind-tabs.test.tsx) already use, for the same reason: a render
// would need the whole app-detail scaffolding (a signed-in team, an app row,
// every sibling panel's own props) to mount at all, spending most of its
// weight on plumbing rather than the four things her ruling actually asked
// for.
//
//   1. THE APP TAB RENDERS THE SHARED GALLERY, SCOPED. app-detail.tsx no
//      longer mounts <AskTheAssistant> on its Knowledge tab — it mounts
//      <KnowledgeScreen scope={{ kind: "app", ... }}>, the SAME component the
//      general Knowledge screen renders with scope "team" — one seam, no
//      second gallery.
//   2. THE DOOR CALL CARRIES THE APP ID. The app scope's own resting read
//      (knowledge-screen.tsx) asks `contentApi.knowledge({ appId })`, and the
//      door itself (workers/content/src/routes/knowledge.ts) parses and
//      forwards `appId` into `SourceFilters` (workers/content/src/lib/
//      knowledge.ts).
//   3. ASK OPENS A NEW CONVERSATION IN THE APP'S OWN SCOPE. The app scope's
//      Ask button calls the same three-call sequence the general screen's
//      does (openNewAgentTab → pickAgentTabScope → setAgentOpen), but with
//      "app" and the app's own id, never "knowledge".
//   4. THE SCOPE EXISTS END TO END. "app" is a real `AgentTabScope`
//      (web/lib/agent-conversation-tabs.ts), and the conversation's first
//      message carries the app's id so the model can pass `appId` straight to
//      `ask_knowledge` (agent-panel.tsx's own send-time prefix).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8")
}

describe("the app record's Knowledge tab mounts the shared gallery, scoped to the app", () => {
  it("app-detail.tsx renders <KnowledgeScreen scope={{ kind: \"app\", ... }}>, not AskTheAssistant", () => {
    const src = read("web", "components", "apps", "app-detail.tsx")
    expect(src, "the old ask-box mount is gone").not.toMatch(/<AskTheAssistant\b/)
    expect(src).not.toMatch(/from "@\/components\/assistant\/ask-the-assistant"/)
    expect(src, "imports the shared gallery component").toMatch(
      /import\s*\{\s*KnowledgeScreen\s*\}\s*from\s*"@\/components\/knowledge\/knowledge-screen"/
    )
    const at = src.indexOf('if (panel.value === "knowledge")')
    expect(at, "the knowledge panel branch").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 700)
    expect(tag, "mounts the shared component").toMatch(/<KnowledgeScreen\b/)
    expect(tag, 'scoped "app", not "team"').toMatch(/kind:\s*"app"/)
    expect(tag, "carries this record's own id").toMatch(/appId(?:,|\s*:\s*appId)/)
    expect(tag, "and this record's own name, for the empty state and the Ask conversation's label").toMatch(
      /appName:\s*app\.name/
    )
  })

  it("the Knowledge tab's own badge is a real count now, not the old ask-box exemption", () => {
    const src = read("web", "components", "apps", "app-detail.tsx")
    const at = src.indexOf('value: "knowledge"')
    expect(at, "the knowledge tab's own config line").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 200)
    expect(tag, "R16: an exact server total, the same sidecar seam every sibling tab already uses").toMatch(
      /badge:\s*formatCount\(knowledgeTotal\)/
    )
  })
})

describe("the app scope's own read carries the app id (R14, R16)", () => {
  it("knowledge-screen.tsx asks the door for `appId`, over the sliceKey seam every app-record collection uses", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    expect(src, "the app scope's own resting read").toMatch(
      /contentApi\.knowledge\(\{\s*appId:\s*isApp \? scope\.appId : ""\s*\}\)/
    )
    expect(src, "the same sliceKey seam sprints/stories/tickets/meetings/deliverables already use for this app").toMatch(
      /sliceKey\("knowledge-app",\s*scope\.appId\)/
    )
    // fixed={{ appId }} is what makes every SEARCHED/SORTED/FILTERED page ask
    // the same narrowed question too — not only the resting read.
    expect(src, "the paged find's own fixed narrowing").toMatch(/fixed=\{isApp \? \{ appId: scope\.appId \}/)
  })

  it("the door parses and filters by `appId` (workers/content)", () => {
    const route = read("workers", "content", "src", "routes", "knowledge.ts")
    expect(route, "the query is read at the boundary (R20)").toMatch(
      /appId:\s*queryText\(url\.searchParams\.get\("appId"\),\s*"App"\)/
    )
    const lib = read("workers", "content", "src", "lib", "knowledge.ts")
    expect(lib, "SourceFilters carries it").toMatch(/appId\?:\s*string/)
    expect(lib, "the WHERE clause narrows by it").toMatch(/if \(filter\.appId\)/)
  })

  it("the list_knowledge_sources and ask_knowledge tools expose and forward it too (R19/R22)", () => {
    const catalog = read("shared", "workers", "tool-catalog.ts")
    const listAt = catalog.indexOf('name: "list_knowledge_sources"')
    const askAt = catalog.indexOf('name: "ask_knowledge"')
    expect(listAt, "list_knowledge_sources").toBeGreaterThan(-1)
    expect(askAt, "ask_knowledge").toBeGreaterThan(-1)
    // The tool's own DETAIL prose is huge (both of these are the longest
    // descriptions in the catalogue), so `schema:`/`buildQuery:` are found by
    // name rather than by a fixed-size window from the tool's own `name:`.
    const listSchemaAt = catalog.indexOf("schema: obj(", listAt)
    const askSchemaAt = catalog.indexOf("schema: obj(", askAt)
    const listTag = catalog.slice(listSchemaAt, listSchemaAt + 900)
    const askTag = catalog.slice(askSchemaAt, askSchemaAt + 900)
    expect(listTag, "list_knowledge_sources' schema").toMatch(/appId:\s*S/)
    expect(listTag, "list_knowledge_sources' buildQuery forwards it").toMatch(/"appId"/)
    expect(askTag, "ask_knowledge's schema").toMatch(/appId:\s*S/)
    expect(askTag, "ask_knowledge's buildQuery forwards it").toMatch(/appId=\$\{encodeURIComponent/)
  })
})

describe('the "app" agent scope opens a NEW conversation, never "knowledge"', () => {
  it('"app" is a real AgentTabScope', () => {
    const src = read("web", "lib", "agent-conversation-tabs.ts")
    expect(src).toMatch(/export type AgentTabScope = "record" \| "knowledge" \| "everything" \| "app"/)
    expect(src, "carries a structured id, unlike \"record\"'s name-only shape").toMatch(/scopeId\?:\s*string/)
  })

  it("the app tab's Ask button calls openNewAgentTab → pickAgentTabScope(id, \"app\", …) → setAgentOpen, in that order", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const fnAt = src.indexOf("function openAskConversation()")
    expect(fnAt, "the shared opener").toBeGreaterThan(-1)
    const fnEnd = src.indexOf("\n  }", fnAt)
    const body = src.slice(fnAt, fnEnd)
    expect(body, "scopes to this app, by id and by name").toMatch(
      /pickAgentTabScope\(id,\s*"app",\s*scope\.appName,\s*scope\.appName,\s*scope\.appId\)/
    )
    const openAt = body.indexOf("openNewAgentTab()")
    const scopeAt = body.indexOf('pickAgentTabScope(id, "app"')
    const panelAt = body.indexOf("setAgentOpen(true)")
    expect(openAt).toBeGreaterThan(-1)
    expect(scopeAt).toBeGreaterThan(openAt)
    expect(panelAt).toBeGreaterThan(scopeAt)
  })

  it("the app scope's own button reads variant=\"inverse\" (R84 — it is not the record's own title component)", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const appReturnAt = src.indexOf('if (scope.kind === "app")')
    const teamReturnAt = src.indexOf("<CountedAbove")
    expect(appReturnAt).toBeGreaterThan(-1)
    expect(teamReturnAt).toBeGreaterThan(appReturnAt)
    const appBlock = src.slice(appReturnAt, teamReturnAt)
    expect(appBlock, "never mango outside the record's own title component").toMatch(
      /variant="inverse"[\s\S]{0,80}onClick=\{openAskConversation\}/
    )
  })

  it("the first message carries the app's id so the model can pass it straight to ask_knowledge", () => {
    const src = read("web", "components", "assistant", "agent-panel.tsx")
    expect(src, "app scope's own prefix").toMatch(/tab\.scope === "app"/)
    expect(src, "names the app id, unlike record scope's name-only prefix").toMatch(/tab\.scopeId/)
  })
})
