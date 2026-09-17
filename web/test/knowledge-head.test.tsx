// THE KNOWLEDGE HEAD — client feedback, 17 Sep 2026, verbatim: "I don't see
// this. Also, the title alignment of the buttons is completely wrong. Why?
// The gear should be on the very far right, and this 'Bring it in' should be
// changed to 'Sync'. Add a Mango button that says something like 'Ask' or
// 'Assistant', and this should open a new chat on the assistant. Also, it's
// missing the toolbar. Why? Make it like the dashboard, so that it has its
// own container background."
//
// READS knowledge-screen.tsx, NOT collection-content.tsx — the knowledge
// branch moved into its own component the same day (K2 by kind, the same
// ruling this file's own sibling, knowledge-kind-tabs.test.tsx, proves): the
// kind-tab strip's own R16 badges need a live sidecar read only a real
// component can hold hooks for, the identical reason accounts/contacts/
// tickets/tasks/processes/stories/waves already live in their own files
// rather than as a branch of collection-content.tsx's deliberately pure
// switch. collection-content.tsx now just calls <KnowledgeScreen ... /> —
// nothing this file checks lives there any more.
//
// FOUR PROOFS, off the real call site — the same "read source off disk"
// technique web/test/knowledge-search-restored.test.tsx already uses for
// this exact screen, because the knowledge branch needs a dozen props to
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
//   3. THE TOOLBAR IS STILL THERE, SEARCH INCLUDED AGAIN — <PagedFind> carries
//      a real `placeholder=` alongside `facets={` and `view={`; client ruling,
//      17 Sep 2026: "Also add the search to the toolbar. It's missing." —
//      reversing K36's own `search={false}`, never suppressed wholesale
//      either way.
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

function readKnowledgeScreen(): string {
  return readFileSync(join(ROOT, "web", "components", "knowledge", "knowledge-screen.tsx"), "utf8")
}

function knowledgeHeadBlock(src: string): string {
  const headingAt = src.indexOf("<CollectionHeading")
  expect(headingAt, "the knowledge screen's own <CollectionHeading>").toBeGreaterThan(-1)
  // THE HEAD ENDS WHERE THE LIST'S OWN <PagedFind> BEGINS — the inline
  // AskTheAssistant box that used to mark this boundary is gone outright
  // (client, 17 Sep 2026: "remove the whole modal 'Ask a question'"), so the
  // next real element after the heading is the toolbar/list itself.
  const listAt = src.indexOf("<PagedFind<KnowledgeSource>", headingAt)
  expect(listAt, "the head ends where the list's own <PagedFind> begins").toBeGreaterThan(headingAt)
  return src.slice(headingAt, listAt)
}

describe("the knowledge head (knowledge-screen.tsx) — order", () => {
  it("is built on CollectionHeading, the one legal home for a mango button (R84)", () => {
    const head = knowledgeHeadBlock(readKnowledgeScreen())
    expect(head.startsWith("<CollectionHeading")).toBe(true)
    expect(head, 'still names the section "knowledge"').toContain('sectionKey="knowledge"')
  })

  it('leads with the mango "Ask" button, then Sync, then the gear LAST', () => {
    const head = knowledgeHeadBlock(readKnowledgeScreen())
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
    const head = knowledgeHeadBlock(readKnowledgeScreen())
    const actionAt = head.indexOf("action={")
    const askButtonAt = head.indexOf('variant="default"')
    expect(actionAt, "CollectionHeading's action prop").toBeGreaterThan(-1)
    expect(askButtonAt, "the mango button sits after action={ opens").toBeGreaterThan(actionAt)
  })
})

describe('the mango "Ask" button — calls the new-conversation door', () => {
  it("calls openNewAgentTab, preselects the knowledge scope, then opens the panel", () => {
    const head = knowledgeHeadBlock(readKnowledgeScreen())
    const onClickAt = head.indexOf("onClick={() => {")
    expect(onClickAt, "the Ask button's own onClick").toBeGreaterThan(-1)
    const onClickEnd = head.indexOf("}}", onClickAt)
    const body = head.slice(onClickAt, onClickEnd)

    // THE DOOR — web/lib/agent-conversation-tabs.ts's own "+": reuses the
    // newest unused draft or mints a fresh one, then activates it.
    expect(body, "opens (or reuses) a fresh conversation tab").toMatch(/openNewAgentTab\(\)/)
    // SCOPE, SKIPPING THE PICKER — her ask was answered directly rather than
    // leaving the reader to press "Knowledge" in the picker themselves.
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
    const src = readKnowledgeScreen()
    expect(src).toMatch(/import\s*\{\s*openNewAgentTab,\s*pickAgentTabScope\s*\}\s*from\s*"@\/lib\/agent-conversation-tabs"/)
    expect(src).toMatch(/import\s*\{\s*setAgentOpen\s*\}\s*from\s*"@\/lib\/agent-open"/)
  })
})

describe("the knowledge toolbar — present, search included again (17 Sep 2026, reverses K36)", () => {
  it("<PagedFind> carries facets, sort, view and a real placeholder together — never search={false}", () => {
    const src = readKnowledgeScreen()
    const at = src.indexOf("<PagedFind<KnowledgeSource>")
    expect(at).toBeGreaterThan(-1)
    const tag = src.slice(at, at + 1800)
    expect(tag, "her ruling: \"Also add the search to the toolbar. It's missing.\"").not.toContain("search={false}")
    expect(tag).toMatch(/placeholder=\{t\(/)
    expect(tag).toMatch(/\bfacets=\{/)
    expect(tag).toMatch(/\bview=\{/)
    expect(tag).toMatch(/\bsorts=\{/)
  })
})

describe("the modal 'Ask a question' box is gone (client, 17 Sep 2026)", () => {
  it("does not mount AskTheAssistant on the knowledge screen any more", () => {
    const src = readKnowledgeScreen()
    expect(src, "\"remove the whole modal 'Ask a question'\"").not.toMatch(/<AskTheAssistant\s*\/>/)
    expect(src).not.toMatch(/from "@\/components\/assistant\/ask-the-assistant"/)
  })
})

describe("the knowledge container — one CollectionCard, like the dashboard (R67)", () => {
  it("<PagedFind> wraps its toolbar and body in CollectionCard, the same call every other collection makes", () => {
    const src = readKnowledgeScreen()
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
    const src = readKnowledgeScreen()
    expect(src).toMatch(/import\s*\{[^}]*CollectionCard[^}]*\}\s*from\s*"@\/components\/deep-link\/screen-bits"/)
    // The whole file is the knowledge branch now, so one check covers what
    // used to need a module-boundary slice: SectionWithCreate would be a
    // SECOND CollectionCard inside the one `wrap` already draws — the
    // "broken combination" screen-bits.tsx's own CollectionCard doc warns
    // about.
    expect(src, "no inner CollectionCard left in the knowledge screen").not.toMatch(/<SectionWithCreate/)
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
