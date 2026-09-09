// THE TEAM TAB'S GROUND — one container, two sections, so they cannot disagree.
//
// ── THE CLIENT'S RULE, VERBATIM, 2026-09-09 ─────────────────────────────────
//
//   "more members in each row, too much blank space. needs container!! nothing
//    on top of white background, its a rule!"
//
// She is stating a LAW, not asking for a box round one gallery: nothing sits
// directly on the page ground. The kit already has that law written down and
// this app already broke it on this exact tab.
//
// ── WHAT WAS ACTUALLY ON SCREEN, AND WHY IT LOOKED LIKE "BLANK SPACE" ───────
//
// `members-gallery.tsx`'s own header claimed the wall "sits inside
// `CollectionCard`, which is a `--surface-panel` box". It did not, and had not
// since the tab was rebuilt: both sections rendered a bare `<section>` straight
// onto `<body className="bg-background">`, and the member cells were
// `Card variant="raised"` — `bg-card`.
//
// In LIGHT, `--background`, `--card`, `--surface-raised` and `--popover` are
// ALL `#FFFEF9`. So every member card measured CONTRAST 1.000 against the page
// and was held up by `--shadow-rest` alone. `shared/ui/docs/RULES.md` §2.6 has
// that exact pairing in its table of the two BAD rows —
//
//     | `bg-background` | `<Card variant="raised">` | off-beige on off-beige · shadow only |
//
// — and the reason it survived every static check is stated there too: "it was
// found by looking at [the rendered page], not by reading a file." Which is
// what the client just did. Her "too much blank space" and her "needs
// container" are one fault, not two.
//
// ── THE ANSWER IS THE ONE THE REST OF THE APP ALREADY USES ──────────────────
//
// A card takes THE OTHER PAPER TONE from the band it stands in (§2.6). There
// are two tones and no third: off-beige `--background` is the page, soft paper
// `--surface-panel` is the panel. So a section on this page is a soft-paper
// panel, and a card inside it is `raised` (off-beige). That is what
// `CollectionFrame` does for every collection screen in the app — an off-beige
// frame with a `--surface-panel` panel inside holding the toolbar and the rows
// — and its own source states the numbers this container reproduces:
// "Measured against the panel at #F7F2EB: 1.103 light, 1.111 dark."
//
// MEASURED HERE, on the running page, both palettes (2026-09-09):
//
//     light   panel #F7F2EB on page #FFFEF9      1.103
//     light   raised card #FFFEF9 on panel       1.103
//     dark    panel #1C1B18 on page #141310      1.079
//     dark    raised card #26241F on panel       1.111
//
// against the 1.000 both sections were shipping in light.
//
// The inset is `p-6 lg:p-[var(--space-7)]` — the same 24/32 step
// `collectionPanelVariants` and `CardGrid`'s own `tone="panel"` spend, so a
// team panel and a collection panel are the same box and not two nearly-equal
// ones.

import * as React from "react"

import { cn } from "@shared/ui/lib/utils"

export function TeamPanel({
  children,
  className,
  /**
   * DROP THE GROUND BELOW 45rem — the roles section, and ONLY because the
   * kit's own `PermissionMatrix` forces it.
   *
   * Above 45rem that component draws a bare `<Table>` with no ground of its
   * own, which is exactly what a panel is for. BELOW 45rem it swaps to
   * `data-slot="permission-matrix-narrow"`, a stack of per-module cards each
   * hard-coded `rounded-[var(--radius)] bg-surface-panel p-4` — soft paper,
   * with no `tone` prop to say otherwise. Put a soft-paper panel behind those
   * and every module card measures 1.000 in both palettes: the identical fault
   * this container exists to fix, moved one breakpoint down.
   *
   * There is no third tone to reach for. Soft paper must stand on off-beige,
   * so the kit's narrow matrix can ONLY stand on the page — and it is not
   * standing on nothing while it does: below 45rem every module is already
   * inside its own container, which is the client's rule satisfied by the kit
   * rather than by us. The switch is written at `45rem` because that is the
   * literal breakpoint `permission-matrix.tsx` swaps its two renders at
   * (`min-[45rem]:hidden`); the two must never drift apart.
   *
   * THE UPSTREAM ASK, so this prop can be deleted rather than reworded:
   * `PermissionMatrix` needs the `tone: "panel" | "bare"` that `CardGrid`
   * already has, applied to its narrow render, so a caller can say "you are
   * already on soft paper". Then both sections take the plain container and
   * this flag goes.
   *
   * The token side needs nothing. `--btn-secondary-fill` is rebound by the
   * GROUND (tokens.css: `.bg-surface-panel { --btn-secondary-fill:
   * var(--surface-raised) }`), and a variant-prefixed class does not match that
   * selector — but `:root`'s own base value is `var(--card)`, and
   * `--surface-raised` IS `var(--card)`. Same colour either way, so the
   * secondary controls inside (the reactivate chips) are off-beige on soft
   * paper at every width, which is what ruling 01 asks for.
   */
  narrowGround = true,
}: {
  children: React.ReactNode
  className?: string
  narrowGround?: boolean
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-[var(--radius)]",
        narrowGround
          ? "bg-surface-panel p-6 lg:p-[var(--space-7)]"
          : "min-[45rem]:bg-surface-panel min-[45rem]:p-6 lg:p-[var(--space-7)]",
        className
      )}
    >
      {children}
    </section>
  )
}
