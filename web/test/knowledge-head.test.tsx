// THE KNOWLEDGE HEAD — client feedback, 17 Sep 2026, verbatim: "I don't see
// this. Also, the title alignment of the buttons is completely wrong. Why?
// The gear should be on the very far right, and this 'Bring it in' should be
// changed to 'Sync'. Add a Mango button that says something like 'Ask' or
// 'Assistant', and this should open a new chat on the assistant. Also, it's
// missing the toolbar. Why? Make it like the dashboard, so that it has its
// own container background."
//
// FOUR PROOFS, off the real call site in collection-content.tsx — the same
// "read source off disk" technique web/test/knowledge-search-removed.test.tsx
// already uses for this exact screen, because the knowledge branch needs the
// whole `ModuleContentCtx` (a dozen queries, permissions, callbacks) to
// render at all, and a render-level proof would spend most of its weight on
// scaffolding rather than the four things she actually complained about:
//
//   1. HEAD ORDER — inside <CollectionHeading>'s own `action` prop (R84: the
//      mango button's only legal home), the mango "Ask" button comes first,
//      Sync second, the gear LAST — her own words, "the gear should be on
//      the very far right."
//   2. ASK CALLS THE NEW-CONVERSATION DOOR — its onClick calls
//      `openNewAgentTab()` (the tab-store "+"), `pickAgentTabScope(id,
//      "knowledge", …)` (skips the picker straight to her scope) and
//      `setAgentOpen(true)` (opens/focuses the panel).
//   3. THE TOOLBAR IS STILL THERE, MINUS SEARCH — <PagedFind> still carries
//      `search={false}` (K36) alongside `facets={` and `view={` — never
//      suppressed wholesale.
//   4. THE CONTAINER — <PagedFind> now carries a `wrap` that boxes the
//      toolbar and whichever body it draws (List or Shape) in one
//      `CollectionCard`, the identical call every other collection screen
//      makes (accounts/contacts/inputs/meetings/tickets), and the label is
//      "Sync" everywhere, not "Bring it in" (google-sync.tsx).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function readCollectionContent(): string {
  return readFileSync(join(ROOT, "web", "components", "deep-link", "collection-content.tsx"), "utf8")
}

function knowledgeHeadBlock(src: string): string {
  const moduleAt = src.indexOf('if (module === "knowledge")')
  expect(moduleAt, "the knowledge module's own branch").toBeGreaterThan(-1)
  const headingAt = src.indexOf("<CollectionHeading", moduleAt)
  expect(headingAt, "the knowledge screen's own <CollectionHeading>").toBeGreaterThan(-1)
  const askAt = src.indexOf("<AskTheAssistant", headingAt)
  expect(askAt, "the head ends where the inline ask box begins").toBeGreaterThan(headingAt)
  return src.slice(headingAt, askAt)
}

describe("the knowledge head (collection-content.tsx) — order", () => {
  it("is built on CollectionHeading, the one legal home for a mango button (R84)", () => {
    const head = knowledgeHeadBlock(readCollectionContent())
    expect(head.startsWith("<CollectionHeading")).toBe(true)
    expect(head, 'still names the section "knowledge"').toContain('sectionKey="knowledge"')
  })

  it('leads with the mango "Ask" button, then Sync, then the gear LAST', () => {
    const head = knowledgeHeadBlock(readCollectionContent())
    const askButtonAt = head.indexOf('variant="default"')
    const syncAt = head.indexOf("<GoogleSyncButton")
    const gearAt = head.indexOf("<ModuleSettingsGear")

    expect(askButtonAt, "the mango Ask button (variant=\"default\")").toBeGreaterThan(-1)
    expect(syncAt, "the Sync button").toBeGreaterThan(-1)
    expect(gearAt, "the settings gear").toBeGreaterThan(-1)

    expect(askButtonAt, "Ask leads").toBeLessThan(syncAt)
    expect(syncAt, "Sync sits between Ask and the gear").toBeLessThan(gearAt)

    // HER WORDS: "the gear should be on the very far right" — nothing else in
    // the head may follow it.
    const afterGear = head.slice(gearAt + "<ModuleSettingsGear".length)
    expect(afterGear, "no other button after the gear").not.toMatch(/<(Button|GoogleSyncButton)\b/)
  })

  it('the mango Ask button sits INSIDE CollectionHeading\'s own action prop, not beside it', () => {
    const head = knowledgeHeadBlock(readCollectionContent())
    const actionAt = head.indexOf("action={")
    const askButtonAt = head.indexOf('variant="default"')
    expect(actionAt, "CollectionHeading's action prop").toBeGreaterThan(-1)
    expect(askButtonAt, "the mango button sits after action={ opens").toBeGreaterThan(actionAt)
  })
})

describe('the mango "Ask" button — calls the new-conversation door', () => {
  it("calls openNewAgentTab, preselects the knowledge scope, then opens the panel", () => {
    const head = knowledgeHeadBlock(readCollectionContent())
    const onClickAt = head.indexOf("onClick={() => {")
    expect(onClickAt, "the Ask button's own onClick").toBeGreaterThan(-1)
    const onClickEnd = head.indexOf("}}", onClickAt)
    const body = head.slice(onClickAt, onClickEnd)

    // THE DOOR — web/lib/agent-conversation-tabs.ts's own "+": reuses the
    // newest unused draft or mints a fresh one, then activates it.
    expect(body, "opens (or reuses) a fresh conversation tab").toMatch(/openNewAgentTab\(\)/)
    // SCOPE, SKIPPING THE PICKER — her ask was answered directly rather than
    // leaving the reader to press "Knowledge base" in the picker themselves.
    expect(body, "preselects the knowledge scope").toMatch(/pickAgentTabScope\(\s*id\s*,\s*"knowledge"/)
    // OPENS AND FOCUSES — agent-panel.tsx's own open effect hands focus to
    // the composer the moment `open` flips true.
    expect(body, "opens the assistant panel").toMatch(/setAgentOpen\(true\)/)

    // ORDER: the tab must exist and be scoped before the panel opens on it.
    const openTabAt = body.indexOf("openNewAgentTab()")
    const scopeAt = body.indexOf("pickAgentTabScope(")
    const openPanelAt = body.indexOf("setAgentOpen(true)")
    expect(openTabAt).toBeLessThan(scopeAt)
    expect(scopeAt).toBeLessThan(openPanelAt)
  })

  it("imports the door from the two read-only files this lane may not edit", () => {
    const src = readCollectionContent()
    expect(src).toMatch(/import\s*\{\s*openNewAgentTab,\s*pickAgentTabScope\s*\}\s*from\s*"@\/lib\/agent-conversation-tabs"/)
    expect(src).toMatch(/import\s*\{\s*setAgentOpen\s*\}\s*from\s*"@\/lib\/agent-open"/)
  })
})

describe("the knowledge toolbar — present, search alone is off (K36)", () => {
  it("<PagedFind> still carries facets, sort, view and search={false} together", () => {
    const src = readCollectionContent()
    const at = src.indexOf("<PagedFind<KnowledgeSource>")
    expect(at).toBeGreaterThan(-1)
    const tag = src.slice(at, at + 1800)
    expect(tag).toContain("search={false}")
    expect(tag).toMatch(/\bfacets=\{/)
    expect(tag).toMatch(/\bview=\{/)
    expect(tag).toMatch(/\bsorts=\{/)
  })
})

describe("the knowledge container — one CollectionCard, like the dashboard (R67)", () => {
  it("<PagedFind> wraps its toolbar and body in CollectionCard, the same call every other collection makes", () => {
    const src = readCollectionContent()
    const at = src.indexOf("<PagedFind<KnowledgeSource>")
    const childrenAt = src.indexOf("{(found) => {", at)
    expect(at).toBeGreaterThan(-1)
    expect(childrenAt).toBeGreaterThan(at)
    const tag = src.slice(at, childrenAt)
    expect(tag, "the container this screen was missing").toMatch(
      /wrap=\{\(inner\)\s*=>\s*<CollectionCard>\{inner\}<\/CollectionCard>\}/
    )
  })

  it("imports CollectionCard, and no longer double-boxes through SectionWithCreate", () => {
    const src = readCollectionContent()
    expect(src).toMatch(/import\s*\{[^}]*CollectionCard[^}]*\}\s*from\s*"@\/components\/deep-link\/screen-bits"/)
    // The knowledge branch's own render callback: SectionWithCreate would be
    // a SECOND CollectionCard inside the one `wrap` now draws — the "broken
    // combination" screen-bits.tsx's own CollectionCard doc warns about.
    const moduleAt = src.indexOf('if (module === "knowledge")')
    const nextModuleAt = src.indexOf('if (module === "tickets")', moduleAt)
    const knowledgeBranch = src.slice(moduleAt, nextModuleAt)
    expect(knowledgeBranch, "no inner CollectionCard left in the knowledge branch").not.toMatch(/<SectionWithCreate/)
  })
})

describe("Sync — her word, everywhere the button appears (google-sync.tsx)", () => {
  it('the button label is "Sync"/"Syncing…", never "Bring it in"', () => {
    const src = readFileSync(join(ROOT, "web", "components", "knowledge", "google-sync.tsx"), "utf8")
    expect(src).toMatch(/t\("Sync"\)/)
    expect(src).toMatch(/t\("Syncing…"\)/)
    expect(src, 'her ruling: "this \'Bring it in\' should be changed to \'Sync\'"').not.toMatch(
      /\{syncing[^}]*\?\s*t\("Bringing it in…"\)\s*:\s*t\("Bring it in"\)\}/
    )
  })
})
