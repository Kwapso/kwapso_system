// THE KNOWLEDGE GALLERY AND ITS CARD — client ruling, 17 Sep 2026, verbatim:
// "On the knowledge base, I want the cards smaller, so I want to see at
// least four in one row. Also, the edit button is deleted from the card. It
// should just be on the detail page."
//
// THREE PROOFS, off the real source (the same "read source off disk"
// technique web/test/knowledge-head.test.tsx already uses for this screen,
// because the knowledge branch needs the whole ModuleContentCtx to render):
//
//   1. THE GRID RULE — the wall reuses the SAME fluid column idiom (and the
//      SAME 12rem token) the accounts and members galleries already measured,
//      rather than a fixed ladder or an invented width, and that rule really
//      does clear four columns at a 1280-and-up content width, three at
//      tablet, one or two on a phone.
//   2. NO EDIT BUTTON IN THE CARD — neither the call site nor the component
//      itself carries an edit affordance any more.
//   3. THE DETAIL PAGE STILL OFFERS EDIT — the one place the client asked
//      editing to live now.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function read(rel: string): string {
  return readFileSync(join(ROOT, ...rel.split("/")), "utf8")
}

/** THE WHOLE FILE IS THE BRANCH NOW, 17 Sep 2026 (K2 by kind) — the knowledge
 * collection split out of collection-content.tsx's pure module switch into
 * its own component, knowledge-screen.tsx, the same move accounts/contacts/
 * tickets/tasks/processes/stories/waves already made. Kept as a named helper
 * (rather than inlining `read(...)` at each call site below) so a future
 * reader sees the same "this is the branch" framing the other proofs in this
 * file already use. */
function knowledgeCollectionBranch(src: string): string {
  return src
}

/** THE SAME MATH A CSS `repeat(auto-fit, minmax(min(MIN, 100%), 1fr))` grid
 * resolves to for a container this wide, at this gap: how many MIN-or-wider
 * cells fit, each stretching to fill the remainder. This is the arithmetic
 * `accounts-screen.tsx`'s own `GALLERY_MIN_CARD` header already reasons in
 * (measured pixels, not a live layout engine — jsdom draws no grid), reused
 * here to prove the column COUNT rather than merely the token's spelling. */
function fluidColumns(containerPx: number, minPx: number, gapPx: number): number {
  return Math.max(1, Math.floor((containerPx + gapPx) / (minPx + gapPx)))
}

describe("the knowledge gallery grid — fluid, reusing the wall's own 12rem token", () => {
  it("KNOWLEDGE_CARD_MIN is the SAME 12rem the accounts and members walls already measured, not an invented width", () => {
    const src = read("web/components/knowledge/knowledge-screen.tsx")
    const constAt = src.indexOf("const KNOWLEDGE_CARD_MIN")
    expect(constAt, "the knowledge gallery's own card-floor constant").toBeGreaterThan(-1)
    const line = src.slice(constAt, src.indexOf("\n", constAt))
    expect(line).toMatch(/=\s*"12rem"/)

    const accounts = read("web/components/accounts/accounts-screen.tsx")
    const accountsConstAt = accounts.indexOf("const GALLERY_MIN_CARD")
    expect(accountsConstAt, "the accounts wall's own measured floor").toBeGreaterThan(-1)
    expect(accounts.slice(accountsConstAt, accounts.indexOf("\n", accountsConstAt))).toMatch(/=\s*"12rem"/)

    const members = read("web/components/team/members-gallery.tsx")
    const membersConstAt = members.indexOf("const MIN_CARD")
    expect(membersConstAt, "the members wall's own measured floor").toBeGreaterThan(-1)
    expect(members.slice(membersConstAt, members.indexOf("\n", membersConstAt))).toMatch(/=\s*"12rem"/)
  })

  it("the wall itself is <CardGrid fluid minItemWidth={KNOWLEDGE_CARD_MIN}> — never the fixed column ladder", () => {
    const branch = knowledgeCollectionBranch(read("web/components/knowledge/knowledge-screen.tsx"))
    const gridAt = branch.indexOf("<CardGrid")
    expect(gridAt, "the knowledge gallery's own <CardGrid>").toBeGreaterThan(-1)
    const gridEnd = branch.indexOf(">", gridAt)
    const tag = branch.slice(gridAt, gridEnd)
    expect(tag, "fluid, the kit's own repeat(auto-fit, minmax(…)) — not the fixed columns={} ladder").toMatch(/\bfluid\b/)
    expect(tag, "the SAME token the accounts/members walls measured").toMatch(/minItemWidth=\{KNOWLEDGE_CARD_MIN\}/)
    expect(tag, "never a fixed columns count alongside fluid").not.toMatch(/\bcolumns=/)
  })

  // THE ARITHMETIC ITSELF — CardGrid's default gap is `gap-3` (--space-3,
  // 0.75rem = 12px at the kit's 16px authoring root; tokens.css), and the
  // 12rem floor is 192px at that same root. A container narrower than the
  // real one only UNDERSTATES the column count, so each width below is a
  // conservative (not generous) stand-in for the real content column at
  // that viewport, after the rail (`RAIL_WIDTH`, screen-shell.tsx, 13rem)
  // and the card's own insets are spent:
  //   ≥1280 viewport → ≥900px of grid width left over
  //   tablet (~768)  → ~700px
  //   phone (~390)   → ~360px, and a wide phone (~428) → ~400px
  const MIN_PX = 192 // 12rem
  const GAP_PX = 12 // gap-3 / --space-3

  it("clears at least four columns at the 1280-and-up content width", () => {
    expect(fluidColumns(900, MIN_PX, GAP_PX)).toBeGreaterThanOrEqual(4)
  })

  it("settles at three columns at a tablet width", () => {
    expect(fluidColumns(700, MIN_PX, GAP_PX)).toBe(3)
  })

  it("settles at one or two columns on a phone", () => {
    expect(fluidColumns(360, MIN_PX, GAP_PX)).toBeGreaterThanOrEqual(1)
    expect(fluidColumns(360, MIN_PX, GAP_PX)).toBeLessThanOrEqual(2)
    expect(fluidColumns(400, MIN_PX, GAP_PX)).toBeGreaterThanOrEqual(1)
    expect(fluidColumns(400, MIN_PX, GAP_PX)).toBeLessThanOrEqual(2)
  })
})

describe('the edit button is gone from the card — client: "the edit button is deleted from the card"', () => {
  it("the call site passes no onEditFiling/canEdit to KnowledgeSourceCard any more", () => {
    const branch = knowledgeCollectionBranch(read("web/components/knowledge/knowledge-screen.tsx"))
    const at = branch.indexOf("<KnowledgeSourceCard")
    expect(at, "the knowledge gallery's own card call site").toBeGreaterThan(-1)
    const end = branch.indexOf("/>", at)
    const tag = branch.slice(at, end)
    expect(tag).not.toMatch(/onEditFiling/)
    expect(tag).not.toMatch(/\bcanEdit\b/)
    expect(tag).not.toMatch(/accountNames/)
  })

  it("KnowledgeSourceCard's own signature and body declare no onEditFiling/canEdit prop and draw no PencilSimple", () => {
    const src = read("web/components/knowledge/knowledge-source-card.tsx")
    // Scoped to the component's signature-through-JSX, not the file's own
    // header comment, which still NAMES the retired prop in prose to explain
    // where its behaviour went — that history is not the same claim as "this
    // prop still exists on the component".
    const fnAt = src.indexOf("export function KnowledgeSourceCard(")
    expect(fnAt, "the component's own declaration").toBeGreaterThan(-1)
    const body = src.slice(fnAt)
    expect(body).not.toMatch(/onEditFiling/)
    expect(body).not.toMatch(/\bcanEdit\b/)
    expect(body).not.toMatch(/PencilSimple/)
    expect(body, 'the "Edit filing" accessible name is gone with the control').not.toMatch(/Edit filing/)
    // No import of the icon the pencil used either — a dead import would be
    // the tell that the control was hidden rather than removed.
    expect(src).not.toMatch(/import\s*\{[^}]*PencilSimple[^}]*\}/)
  })
})

describe('the detail page still offers edit — "It should just be on the detail page"', () => {
  it("KnowledgeDetailScreen's own title carries an icon-only Edit button, gated on knowledge:update", () => {
    const src = read("web/components/knowledge/knowledge-detail.tsx")
    const actionsAt = src.indexOf("actions={")
    expect(actionsAt, "RecordScreen's own actions slot").toBeGreaterThan(-1)
    const block = src.slice(actionsAt, src.indexOf("activity={", actionsAt))
    expect(block, "gated the same right the card's old pencil was").toMatch(/canEdit\s*&&/)
    // AMENDED 18 Sep 2026 — R84's amendment ("edit button is never black
    // (even when it's only one)"): the hand-rolled `<Button variant=
    // "secondary" size="icon" aria-label={t("Edit")}>` became the shared
    // `<EditPenButton onClick={…} label={t("Edit")} />` (shared/web/edit-
    // pen-button.tsx) — same gate, same click, same accessible name, now
    // named `label` rather than `aria-label` at this call site (the
    // component sets `aria-label` internally, from that prop).
    expect(block).toMatch(/EditPenButton/)
    expect(block).toMatch(/label=\{t\("Edit"\)\}/)
    expect(block).toMatch(/onClick=\{\(\)\s*=>\s*setEditingOpen\(true\)\}/)
  })

  it("opens the same KnowledgeFormDialog that used to write compartment and sharing from the card's pencil", () => {
    const src = read("web/components/knowledge/knowledge-detail.tsx")
    expect(src).toMatch(/<KnowledgeFormDialog/)
    const dialogAt = src.indexOf("<KnowledgeFormDialog")
    const dialogBlock = src.slice(dialogAt, src.indexOf("/>", src.indexOf("onSubmit={saveDetails}", dialogAt)))
    expect(dialogBlock, "open state is the Edit button's own setEditingOpen").toMatch(/open=\{editingOpen\}/)
    // The same two fields the card's pencil used to write, still writable here.
    expect(dialogBlock).toMatch(/accountOptions=/)
    expect(src).toMatch(/visibility:\s*values\.visibility/)
    expect(src).toMatch(/accountId:\s*values\.accountId/)
  })
})
