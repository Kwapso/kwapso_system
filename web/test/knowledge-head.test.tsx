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

    // HER WORDS: "the gear should be on the very far right" — nothing else
    // VISIBLE in the head may follow it. Below `sm` (M2/mobile audit cause 6)
    // Sync and the gear also draw a second time, hidden until opened, inside
    // a phone-only `<DropdownMenu>` overflow that itself sits after the
    // visible pair — so the "nothing after" check stops at that menu's own
    // opening tag rather than at the end of the head.
    const dropdownAt = head.indexOf("<DropdownMenu>", gearAt)
    const afterGear = head.slice(
      gearAt + "<ModuleSettingsGear".length,
      dropdownAt === -1 ? undefined : dropdownAt
    )
    expect(
      afterGear,
      "no other button after the gear, before the phone-only overflow menu"
    ).not.toMatch(/<(Button|GoogleSyncButton)\b/)
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
    const src = readKnowledgeScreen()
    // SHARED WITH THE APP SCOPE'S OWN ASK BUTTON (17 Sep 2026) — both press
    // the identical door, so the call lives ONCE, in `openAskConversation`,
    // rather than being copied into two `onClick`s that could drift. The head
    // block's own button reads `onClick={openAskConversation}`.
    const head = knowledgeHeadBlock(src)
    expect(head, "the head's own Ask button calls the shared opener").toMatch(
      /onClick=\{openAskConversation\}/
    )

    const fnAt = src.indexOf("function openAskConversation()")
    expect(fnAt, "the shared opener is a real function in this file").toBeGreaterThan(-1)
    const fnEnd = src.indexOf("\n  }", fnAt)
    const body = src.slice(fnAt, fnEnd)

    // THE DOOR — web/lib/agent-conversation-tabs.ts's own "+": reuses the
    // newest unused draft or mints a fresh one, then activates it.
    expect(body, "opens (or reuses) a fresh conversation tab").toMatch(/openNewAgentTab\(\)/)
    // SCOPE, SKIPPING THE PICKER — her ask was answered directly rather than
    // leaving the reader to press "Knowledge" in the picker themselves.
    expect(body, "preselects the knowledge scope").toMatch(/pickAgentTabScope\(id,\s*"knowledge"/)
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
    // 2200, NOT 1800 — 22 Sep 2026, the account scope widened `fixed=` from a
    // single-line ternary into a three-way one (team/app/account), pushing
    // every later prop further from the tag's own start.
    const tag = src.slice(at, at + 2200)
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

// ============================================================================
// SYNC BUTTON SIZE — Aurora, 21 Sep 2026, verbatim: "on knowelegde, the syn
// button its to small. unify with law." The knowledge toolbar's other two
// actions never opt into a smaller control: the mango Ask button
// (knowledge-screen.tsx) names no `size` at all, and the settings gear
// (`ModuleSettingsGear`, module-settings-screen.tsx) names `size="icon"` —
// both the kit's own `--control-height-button` (40px), through the kit's
// `size` prop and nothing else. The Sync button used to be the one button in
// that row naming `size="sm"` (32px, `--control-height-dense`), through the
// kit Button prop rather than a custom class, so this is a source-scan
// pinning the button's own height, not a render assertion (google-sync.tsx
// needs a dozen props to mount that this suite does not carry).
// ============================================================================
describe("the Sync button matches its knowledge-toolbar siblings' height", () => {
  const src = readFileSync(join(ROOT, "web", "components", "knowledge", "google-sync.tsx"), "utf8")

  function syncButtonTag(source: string): string {
    const at = source.indexOf('<Button variant="secondary" disabled={syncing}')
    expect(at, "the Sync button's own opening tag").toBeGreaterThan(-1)
    const end = source.indexOf(">", at)
    return source.slice(at, end + 1)
  }

  it("names no size prop — the kit's default control height, same as the mango Ask button beside it", () => {
    const tag = syncButtonTag(src)
    expect(tag, "no size prop at all: the kit's default is the standing 40px height").not.toMatch(/\bsize=/)
  })

  it('never regresses to size="sm" (--control-height-dense, 32px) anywhere on this button', () => {
    expect(src, 'her ruling: "the syn button its to small"').not.toMatch(/<Button variant="secondary" disabled=\{syncing\}[^>]*size="sm"/)
  })

  it("carries no custom height/padding class — the kit's own size prop is the whole fix", () => {
    const tag = syncButtonTag(src)
    expect(tag).not.toMatch(/\bh-\[/)
    expect(tag).not.toMatch(/\bpx-\d/)
  })

  it("its icon is size-4, the same step the Ask and gear icons use", () => {
    const iconAt = src.indexOf("<ArrowsClockwise")
    expect(iconAt, "the sync icon").toBeGreaterThan(-1)
    const iconTag = src.slice(iconAt, src.indexOf(">", iconAt) + 1)
    expect(iconTag).toMatch(/className="size-4"/)
  })
})

// ============================================================================
// THE "NOT BROUGHT IN YET" HINT — Aurora, 21 Sep 2026, verbatim: "move the
// hint not broght in yet." It already rendered in the control's own status
// slot, the same one the "Last brought in …" line takes once a sync has run
// — R72's own point, that a control's helper text belongs to the control and
// not to a heading, is why it stays there rather than moving into
// CollectionHeading's own title line. What read as a stray toolbar caption
// was the size: `text-xs` beside the button's own `text-sm` label. Both the
// pre-sync and post-sync lines of that one slot now read `text-sm`,
// unstyled apart from that, from `text-xs` (K56, documents/UI-RULEBOOK.md).
// ============================================================================
describe('the "Not brought in yet" hint stays in the control\'s own status slot, restyled off text-xs', () => {
  const src = readFileSync(join(ROOT, "web", "components", "knowledge", "google-sync.tsx"), "utf8")

  it('shares one ternary with the "Last brought in" line — the slot a sync fills once it has run', () => {
    const lastRunAt = src.indexOf(': lastRun ? (')
    const notYetAt = src.indexOf('t("Not brought in yet")')
    expect(lastRunAt, "the lastRun branch").toBeGreaterThan(-1)
    expect(notYetAt, "the not-yet-synced fallback").toBeGreaterThan(lastRunAt)
    // Nothing else sits between the two branches: one ternary, four arms
    // (syncing / failing / lastRun / not yet), not a second element added
    // beside the button. Two <span opens fall in this slice — the lastRun
    // span's own opening tag, then the fallback span's opening tag (the
    // slice ends inside it, at the text it wraps).
    const between = src.slice(lastRunAt, notYetAt)
    expect(between.match(/<span/g)?.length, "just the lastRun span, then the fallback span opening").toBe(2)
  })

  it("is styled like the synced line, not text-xs", () => {
    const notYetAt = src.indexOf('t("Not brought in yet")')
    const tagStart = src.lastIndexOf("<span", notYetAt)
    const tag = src.slice(tagStart, src.indexOf(">", tagStart) + 1)
    expect(tag).toMatch(/className="text-muted-foreground text-sm"/)
    expect(tag).not.toMatch(/text-xs/)
  })

  it('the "Last brought in" line it shares the slot with reads the same step', () => {
    const lastRunSpanAt = src.indexOf("<span", src.indexOf(': lastRun ? ('))
    const tag = src.slice(lastRunSpanAt, src.indexOf(">", lastRunSpanAt) + 1)
    expect(tag).toMatch(/className="text-muted-foreground text-sm"/)
    expect(tag).not.toMatch(/text-xs/)
  })
})
