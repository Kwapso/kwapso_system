// CLIENT RULINGS, 18 Sep 2026, verbatim.
//
// 5. "assistant still has cetrain horixotnal scroll to it. kill taht."
// 6. "for assistant, only the "replies" should have the bacvkground. the
//    "actions" should sit without any container aorund them"
//
// MEASURED LIVE ON STAGING FIRST (Playwright, headless, logged in through the
// admin test-login door, driven by throwaway live-measurement scripts — not
// files this repo keeps), at 375/768/1280px, docked and floating, with
// a text reply, a citations disclosure, a tool-step run, a paused confirm and
// a markdown table:
//   · `document.scrollingElement.scrollWidth` never exceeded `clientWidth` in
//     any of those runs — the reply thread itself does not push the page.
//   · The one real gap found: the confirm panel's own payload lines
//     (`RunSteps`' `description` slot, shared/ui — can't hand-edit) carried no
//     wrap rule at all, so a value `describePayload` could not name (a raw
//     id) or had to clip at 160 characters with no whitespace to break on
//     would widen the panel exactly like an unbroken token in a reply used to
//     (agent-markdown.tsx's `PROSE_RHYTHM`, already fixed). Fixed at OUR seam
//     — `confirmStepsFrom` in web/lib/use-agent-chat.tsx — since the kit slot
//     itself is off-limits.
//   · The tool-step chip carried the SAME `bg-card` bubble as a real reply
//     (`getComputedStyle` on staging: both `rgb(247, 242, 235)`) — ruling 6's
//     bug, fixed at agent-panel.tsx's one message-rendering seam.
//
// jsdom cannot evaluate real Tailwind CSS (no stylesheet is generated for a
// test run — the same reason web/test/tab-strip-no-vertical-scroll.test.ts
// reads the KIT'S source for its fix rather than asserting a computed style),
// so this file proves the fix the same way that one does: read the actual
// class strings and data attributes off the file a browser really reads them
// from, plus one jsdom render for the one thing jsdom CAN prove — that a long
// token really lands in the DOM, inside an element carrying the wrap class.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"

import { AgentMarkdown } from "@/components/assistant/agent-markdown"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const ASSISTANT_DIR = join(ROOT, "web", "components", "assistant")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

const panelSrc = read("web/components/assistant/agent-panel.tsx")

describe("ruling 5 — no horizontal scroll in the assistant", () => {
  // THE PANE'S OWN NARROWEST FLOOR. The docked column fills the kit's aside
  // (`ASIDE_WIDTH`, 23.75rem — agent-panel.tsx's own comment on `PANEL_COLUMN`);
  // the floating popover's floor is wider still (26.25rem, `PanelFrame`). So
  // 23.75rem is the smallest this surface is ever asked to be, and a fixed
  // `min-w-[…]` past that number is a child asking to be wider than the pane
  // can ever guarantee it room for.
  const PANE_FLOOR_REM = 23.75

  /** A `min-w-[<n>rem]` (or `<n>px`, converted at 16px/rem) past the pane's
   * own floor, with its reason — the R-rule's own exception: a table or a
   * code block may be wider than the pane PROVIDED it scrolls inside its own
   * container rather than the panel. New entries need the same proof: the
   * literal value must sit inside an element that also carries its own
   * `overflow-x-auto`. Rot-checked below, so a value that moves or shrinks
   * back under the floor turns the build red for the ENTRY, not silently. */
  const MIN_WIDTH_EXEMPT: Record<string, { needle: string; reason: string }> = {
    "web/components/assistant/agent-markdown.tsx": {
      needle: 'min-w-[28rem] border-collapse text-left text-caption">',
      reason:
        "the markdown table's own floor, INSIDE the sibling wrapper's `overflow-x-auto` (agent-markdown.tsx's own long comment on `Block`) — the R-rule's one sanctioned case: a table may be wider than the pane because it scrolls in its own box, never the panel's.",
    },
  }

  it("no min-w-[…] in an assistant component is wider than the pane's own floor, except a table/code box that scrolls in its own container", () => {
    const files = sourceFiles(ASSISTANT_DIR, { extensions: [".tsx", ".ts"], relativeTo: ROOT }).map((f) => f.rel)

    const offenders: string[] = []
    const seenExempt = new Set<string>()
    for (const rel of files) {
      const src = read(rel)
      for (const m of src.matchAll(/min-w-\[([\d.]+)(rem|px)\]/g)) {
        const value = Number(m[1])
        const rem = m[2] === "px" ? value / 16 : value
        if (rem <= PANE_FLOOR_REM) continue
        const exempt = MIN_WIDTH_EXEMPT[rel]
        if (exempt && src.includes(exempt.needle)) {
          seenExempt.add(rel)
          continue
        }
        offenders.push(`${rel}: min-w-[${m[1]}${m[2]}] (${rem}rem > ${PANE_FLOOR_REM}rem pane floor)`)
      }
    }
    expect(
      offenders,
      `a fixed min-width here can force the pane wider than it is ever guaranteed to be. Wrap it in its own scrolling container (R-rule: only tables/code/diagrams may scroll sideways), or add it to MIN_WIDTH_EXEMPT with proof it self-scrolls:\n  ${offenders.join("\n  ")}`
    ).toEqual([])

    // The ratchet: an exemption that no longer matches anything is a record of
    // a bug that no longer exists, and it goes red so the fix takes the pin
    // with it — the same discipline RULES.md's own SCREEN_WIDTH_EXEMPT uses.
    const stale = Object.keys(MIN_WIDTH_EXEMPT).filter((f) => !seenExempt.has(f))
    expect(stale, `these MIN_WIDTH_EXEMPT entries matched nothing — delete them:\n  ${stale.join("\n  ")}`).toEqual([])
  })

  it("the reply thread (`[data-slot=agent-chat-turns]`) and the pane itself both carry overflow-x-hidden", () => {
    expect(
      panelSrc,
      "the AgentChat root (the pane) must carry a bare `overflow-x-hidden` class"
    ).toMatch(/"overflow-x-hidden",/)
    expect(
      panelSrc,
      "the thread wrapper must carry its own overflow-x-hidden override"
    ).toContain('"[&_[data-slot=agent-chat-turns]]:overflow-x-hidden"')
  })

  it("the confirm panel's own payload lines wrap an unbroken value (RunSteps' description slot has no wrap rule of its own)", () => {
    const src = read("web/lib/use-agent-chat.tsx")
    const dataDetails = src.match(/<span data-details className="([^"]*)">/)
    expect(dataDetails, "confirmStepsFrom must still build the data-details wrapper").not.toBeNull()
    expect(dataDetails?.[1]).toContain("break-words")
    expect(dataDetails?.[1]).toContain("[overflow-wrap:anywhere]")
  })

  it("a 400-char unbroken token renders inside a message with wrap classes (jsdom)", () => {
    const longToken = "a".repeat(400)
    const { container } = render(<AgentMarkdown text={longToken} />)
    // The token itself really reached the DOM — not clipped, not dropped.
    expect(container.textContent).toContain(longToken)
    // …inside the ONE element that carries the no-sideways-scroll rule
    // (agent-markdown.tsx's own PROSE_RHYTHM, applied to ArticleBody).
    const wrapped = container.querySelector('[class*="overflow-wrap:anywhere"]')
    expect(wrapped, "the prose register must carry [overflow-wrap:anywhere]").not.toBeNull()
    expect(wrapped?.textContent).toContain(longToken)
  })
})

describe("ruling 6 — a reply keeps its background, an action has none", () => {
  it("a tool-step row (an action) is marked data-agent-turn-kind=\"action\", on both its plain and its thinking-disclosure shape", () => {
    // Scoped to the `if (it.role === "tool")` branch, not the whole file — a
    // real reply must NEVER carry this marker, and this only proves the two
    // shapes a TOOL row can take both do.
    const start = panelSrc.indexOf('if (it.role === "tool")')
    const end = panelSrc.indexOf("// WHAT THIS TURN READ (Law R23)", start)
    expect(start, "agent-panel.tsx must still branch on tool rows here").toBeGreaterThan(-1)
    expect(end, "the tool-row branch must still end before the citation-mapping comment").toBeGreaterThan(start)
    const toolBranch = panelSrc.slice(start, end)
    const markers = toolBranch.match(/data-agent-turn-kind="action"/g) ?? []
    expect(
      markers.length,
      "both the plain tool-step span and the thinking Collapsible must carry the action marker"
    ).toBe(2)
  })

  it("the AgentChat className strips the bubble's fill and radius for an action turn, and ONLY for one — the padding (the 'same left inset') is untouched", () => {
    const stripBg = '[&_[data-slot=agent-chat-turn]:has([data-agent-turn-kind=action])>div>div:first-of-type]:bg-transparent'
    const stripRadius = '[&_[data-slot=agent-chat-turn]:has([data-agent-turn-kind=action])>div>div:first-of-type]:rounded-none'
    expect(panelSrc).toContain(stripBg)
    expect(panelSrc).toContain(stripRadius)
    // THE INSET SURVIVES: the same "first div inside a turn's own column div"
    // selector this file already uses for padding must still carry it,
    // unconditionally (not gated on :has()) — so an action's words start at
    // the identical x-position a reply's words do, per the ruling's own
    // "same left inset as the reply text".
    expect(panelSrc).toContain("[&_[data-slot=agent-chat-turn]>div>div:first-of-type]:px-3.5")
  })

  it("a real reply's own content (role user/assistant, not a tool row) is built with no action marker", () => {
    // `withSources`/`message.content` — the branch a REAL reply's content
    // takes — is built entirely below the tool-row `return`, i.e. it is
    // unreachable for a tool row and carries none of that row's markup.
    const replySection = panelSrc.slice(
      panelSrc.indexOf("// WHAT THIS TURN READ (Law R23)"),
      panelSrc.indexOf("streaming={chat.streamingReply}")
    )
    expect(replySection.length, "the reply-mapping section must still exist between these two anchors").toBeGreaterThan(0)
    expect(replySection).not.toContain("data-agent-turn-kind")
  })
})
