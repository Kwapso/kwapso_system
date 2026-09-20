// THE GLOSSARY'S OWN DEFINITION PREVIEW: the one piece of glossary-specific
// logic left after the tab stopped drawing its own dl/dt/dd rows.
//
// Aurora, on the Glossary tab's rows, verbatim, 21 Sep 2026: "But why did you
// invent this new design? Why don't you use the kind of square card, same as
// in all?" The tab used to draw its own list markup here (a definition list,
// R80's own reasoning against `KnowledgeSourceCard`'s grid at the time), and
// now maps its words through that exact same card and `<CardGrid>`
// (knowledge-screen.tsx), the identical wall the Knowledge screen's "All" tab
// already draws, so there is no bespoke row left to own. What survives is the
// one computation the card itself cannot do without: turning a word's own
// list row into a one-line, plain-text preview of its definition.
//
// THE LIST DOOR'S OWN ROW NEVER CARRIES `body`: `shared/types.ts`'s own
// `KnowledgeSource` doc says so ("on a LIST this is always null"), and
// `workers/content/src/lib/knowledge.ts`'s `LIST_COLS` reads `NULL AS body`
// off the row for exactly that reason. What a list row carries instead is
// `summary`, and for a glossary word specifically, that summary is
// `buildSummary({ noun: "glossary word", title, accountName: null, detail:
// body })` (`workers/content/src/lib/knowledge.ts`'s own `createGlossaryWord`
// / update path), whose fixed opening (`buildSummary`,
// workers/content/src/lib/knowledge-summary.ts) is always
// "`${title}, a glossary word.`" followed by as much of the word's own
// definition as fits, e.g. "Ready, a glossary word. Every story is closed,
// but nobody's told the client yet." This is that same fixed opening,
// reproduced rather than imported (a worker-side string, not a shared seam),
// so the preview can cut it off the front and read the definition that is
// actually left.

import { looksLikeHtml, richTextPlain } from "@shared/web/rich-text"

const DEFINITION_PREVIEW_MAX_CHARS = 140

function glossarySummaryPrefix(title: string): string {
  return `${title}, a glossary word.`
}

/** THE DEFINITION TEXT ITSELF: the body when a caller happens to have one
 * (a detail read, or a future list column that starts carrying it), else the
 * summary with the word's own "<title>, a glossary word." opening stripped,
 * which is what every list row (the overview tab included) actually has. */
function definitionSource(source: { title: string; summary: string | null; body: string | null }): string {
  if (source.body) return source.body
  const summary = source.summary ?? ""
  const prefix = glossarySummaryPrefix(source.title)
  return summary.startsWith(prefix) ? summary.slice(prefix.length).trim() : summary
}

/** One plain-text preview line: the card's own body text, in place of the
 * "Last edited" meta line every other `KnowledgeSourceCard` draws
 * (`preview` prop, knowledge-source-card.tsx). The Textarea this tab's own
 * form uses never emits markup, but `body` is typed against every knowledge
 * kind, some of which DO carry rich-text HTML, so this strips it through the
 * one shared seam list/card previews already use (`richTextPlain`,
 * shared/web/rich-text.ts) rather than trusting the source. Cut at the first
 * line break or ~140 characters, whichever comes first, and (R87's own rule
 * for a clipped title, read here for a clipped body) never silently: an
 * ellipsis marks every cut that left something out. */
export function definitionPreview(source: { title: string; summary: string | null; body: string | null }): string {
  const raw = definitionSource(source)
  if (!raw) return ""
  const html = looksLikeHtml(raw)
  const flat = html ? richTextPlain(raw) : raw
  const firstLine = (html ? flat : (flat.split(/\r?\n/)[0] ?? "")).replace(/\s+/g, " ").trim()
  const hasMoreLines = !html && flat.split(/\r?\n/).length > 1 && firstLine.length > 0
  if (firstLine.length > DEFINITION_PREVIEW_MAX_CHARS) {
    return `${firstLine.slice(0, DEFINITION_PREVIEW_MAX_CHARS).trimEnd()}…`
  }
  return hasMoreLines ? `${firstLine}…` : firstLine
}
