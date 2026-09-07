"use client"

// Display a user-authored BODY safely, whichever of the two formats it is in.
//
// The library Notes editor emits HTML; bodies from the legacy Glide catalogue are
// markdown. One column holds both, with no flag to read (rich-text.ts
// `looksLikeHtml` explains why the test is "does it contain a tag"), so this
// component picks the pipeline — and there is exactly ONE of each:
//
//   HTML     → sanitizeRichHtml: parse in a detached document → strict allowlist
//              → escaped text. Unchanged; this is the path it has always taken.
//   markdown → toHtml (markdown-html.ts), the SAME converter the assistant's
//              replies go through. Escape-first, so its output is safe by
//              construction for the same reason the agent panel can inject it.
//
// Both branches produce known-safe HTML, which is what the one injection below is
// allowed to be. Neither is a second renderer and neither is a second markdown
// pipeline — that was the whole point.

import * as React from "react"

import { ArticleBody } from "@shared/ui/components/article-body/article-body"
import { toHtml } from "@shared/web/markdown-html"
import { looksLikeHtml, sanitizeRichHtml } from "@shared/web/rich-text"

/* THE QUOTED-REPLY OVERRIDE — DELETE THIS THE DAY THE KIT SHIPS A QUOTE
 * REGISTER, AND ADOPT HERS.
 *
 * This is the ONLY thing this file still decides for itself, and it exists for
 * exactly one reason: `ArticleBody` draws every `blockquote` as chapter 13's
 * PULL-QUOTE — the one serif in the system, h3 step, 24px, `my-[var(--space-8)]`,
 * "one per page" by editorial rule. This app's blockquotes are not editorial.
 * They are ordinary quoted replies a person typed inside a ticket or a meeting
 * note, several to a page, and the pull-quote treatment on those would be
 * WRONG rather than merely different.
 *
 * The kit has no second register and no opt-out — the treatment is
 * unconditional descendant CSS on ArticleBody's root — and its law-book does
 * not rule on quotes at all. Inventing one here, or upstream, would be putting
 * our drawing in front of the designer as if it were hers.
 *
 * SO THE GAP IS LOGGED UPSTREAM, NOT GUESSED. Kit `manifest.json` →
 * `notDelivered`, entry **"A non-editorial quote register on ArticleBody"**
 * (kit v1.2.11), with a recommendation, beside the four already there.
 *
 * WHEN THAT ENTRY IS CLOSED AND THE KIT SHIPS THE REGISTER:
 *   1. delete this constant and the `className` that applies it below;
 *   2. pass the kit's own quote variant instead;
 *   3. delete nothing else — every other prose rule here is already the kit's.
 * It is safe to delete the day step 2 is possible, and it should be deleted
 * then rather than kept "in case", because an override whose reason has quietly
 * stopped being true is indistinguishable from a permanent app opinion.
 *
 * The values below are what these 14 screens have always drawn, deliberately:
 * this override changes nothing the owner is looking at, it only holds the line
 * while the kit decides.
 *
 * `family-name:` IS LOAD-BEARING, NOT DECORATION. `font-*` is Tailwind's
 * prefix for THREE different properties (family, weight, style), so a bare
 * arbitrary value — `font-[var(--font-sans)]` — is ambiguous and Tailwind
 * resolves it as font-WEIGHT, emitting `font-weight: var(--font-sans)`: a
 * string handed to a numeric property, which is invalid and dropped, so the
 * class did nothing. The type hint tells it which property is meant, the
 * same way `text-[length:var(--text-3xl)]` (typography.tsx's own comment)
 * disambiguates size from colour. Verified by compiling this exact class
 * through the app's own Tailwind (4.3.0) and reading the emitted rule:
 * unhinted it is `font-weight: var(--font-sans)`; hinted it is
 * `font-family: var(--font-sans)`. Caught auditing the client's "should be
 * Sans" report — this override had never once applied. */
const QUOTED_REPLY_UNTIL_THE_KIT_RULES = [
  "[&_blockquote]:font-[family-name:var(--font-sans)] [&_blockquote]:tracking-normal",
  "[&_blockquote]:text-sm [&_blockquote]:text-muted-foreground",
  "[&_blockquote]:my-[var(--space-3)] [&_blockquote]:border-l-2",
  "[&_blockquote]:border-border [&_blockquote]:ps-3",
].join(" ")

/* KEPT AS AN EXPORT, NARROWED IN MEANING. `agent-markdown.tsx` renders the
 * assistant's replies through the same words; it takes the quote override and
 * nothing else, because ArticleBody now supplies the prose. */
export const PROSE = QUOTED_REPLY_UNTIL_THE_KIT_RULES

/* PROSE ON AN INVERSE FILL — DELETE THIS THE DAY THE KIT SHIPS AN INVERSE
 * REGISTER FOR `ArticleBody`, AND ADOPT HERS.
 *
 * The second thing this file decides for itself, and the same species as the
 * quote override above: an `ArticleBody` that lands somewhere its author did
 * not draw it for.
 *
 * WHAT GOES WRONG. `ArticleBody` PAINTS ITS OWN INK. Its variant base is
 * `["min-w-0 text-ink-secondary", …]` and every register under it names an
 * absolute ink too — `[&_a]`, `[&_:is(strong,b)]`, `[&_:is(h2,h3,h4)]` and
 * `[&_dt]` all resolve to `--foreground`. Every one of those is correct on
 * paper and wrong on the charcoal fill, because none of them inherits: a
 * message bubble sets `bg-surface-inverse text-ink-on-inverse`, and the
 * ArticleBody INSIDE it immediately overrides that inherited ink with an ink
 * chosen for a different ground. Measured on the ticket's own thread: body
 * prose rendered #4A4946 on #1A1918, a contrast ratio of 1.95:1 — under the
 * 4.5:1 floor by a factor of two, and the "text colour is wrong" the client
 * reported. Bold and links are worse still: #1A1918 on #1A1918 is 1.0:1,
 * invisible rather than merely dim, and nobody had noticed because the reply
 * that was photographed happened to be plain.
 *
 * WHY THE FIX IS A CALL SITE'S CLASS AND NOT A GLOBAL RULE. The kit already
 * owns the mechanism for "everything inside an inverse surface flips": it
 * rebinds `--focus` under `.bg-surface-inverse *` in tokens.css §8, precisely
 * so no component has to know. Rebinding the INK tokens the same way would fix
 * this everywhere at once — and it would also repaint every dark panel, every
 * inverse button and every spine in both front doors, which is the design
 * system's decision to take and not an app's. So the app states the narrow
 * truth at the one place it is true (a rich-text body inside a `mine` bubble)
 * and the gap is logged upstream instead of guessed at.
 *
 * WHAT IS NOT COVERED, SAID OUT LOUD. An `<hr>` inside a bubble stays
 * `--hair-strong` (a charcoal wash) on charcoal and is invisible. The kit
 * exports no `--color-hair-strong-inverse`, so there is no NAMED utility for
 * it, and R32's answer to a missing token is to ask for the token rather than
 * to reach for an arbitrary one. It is in the same upstream ask. `code` and
 * `pre` need nothing: they carry `bg-surface-quiet`, a light fill, so their
 * dark ink is already right wherever they land.
 *
 * WHEN THE KIT SHIPS THE REGISTER: delete this constant and every use of it,
 * and pass the kit's own inverse variant instead. */
export const ON_INVERSE_UNTIL_THE_KIT_RULES = [
  "text-ink-on-inverse",
  "[&_:is(h2,h3,h4)]:text-ink-on-inverse [&_dt]:text-ink-on-inverse",
  "[&_a]:text-ink-on-inverse [&_:is(strong,b)]:text-ink-on-inverse",
  "[&_blockquote]:text-ink-on-inverse-secondary",
].join(" ")

export function RichText({
  html,
  className,
}: {
  html: string | null | undefined
  className?: string
}) {
  const safe = React.useMemo(
    () => (looksLikeHtml(html) ? sanitizeRichHtml(html) : toHtml(html ?? "")),
    [html]
  )
  if (!safe) return null
  /* THE PROSE IS THE KIT'S — `ArticleBody`, the same part its own screens draw
   * with. `size="compact"` is its 14/1.45 step, which is what these panels have
   * always used; `as="div"` because a ticket reply is not an <article>; and the
   * HTML is INJECTED rather than wrapped, because every rule that spaces this
   * prose is a direct-child selector and one wrapper div would leave the root
   * with a single child and silently kill the vertical rhythm (kit v1.2.11
   * made the injection possible; before it, the prop was typed and threw). */
  return (
    <ArticleBody
      as="div"
      size="compact"
      className={`${QUOTED_REPLY_UNTIL_THE_KIT_RULES} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
