"use client"

// THE APPEARANCE PREVIEW — a taller, more populated miniature of the shell
// itself, replacing the kit's `AppearancePreview` (`shared/ui/compositions/
// screens/settings.tsx`) on this one tab.
//
// THE RULING, 2026-09-17: "I want the preview on Settings > Appearance to be
// slightly taller. Currently, it's a container inside a container, so
// that's not accurate. Try to represent more of the real look of the app
// and include more elements inside, not just one kind of card." Three
// things in one sentence:
//
//   1. TALLER. `APPEARANCE_PREVIEW_MIN_HEIGHT` below — 22rem, up from the
//      kit picture's 17rem — the height token this file names for the
//      report the brief asked for.
//   2. NOT A CONTAINER INSIDE A CONTAINER. The kit picture drew ground →
//      floating card → soft panel → row, three nested boxes standing
//      inside `AppearancePanel`'s own `SettingsSection` (a fourth). This
//      file draws ground → ONE floating `<Card>` holding a title row, a
//      toolbar bar and a `<List>` — the list's own rows are NOT a second
//      nested surface (R67's own "not a card inside a card": `<List
//      variant="panel">` draws hairline-separated rows inside the card's
//      own padding, never a second painted box).
//   3. MORE OF THE REAL LOOK, MORE KINDS OF ELEMENT. Not just one kind of
//      card: a rail strip, a two-tab strip, a card with a title and a
//      toolbar row, a list of three rows carrying a status dot each and a
//      count badge on one of them, and one mango title action — the exact
//      list the brief itemised, each one a real kit part (`Card`, `Badge`,
//      `List`) rather than a hand-drawn box standing in for it, so a future
//      kit restyle (a new radius, a new shadow, a new hover) reaches this
//      picture automatically the same way it reaches the real screen.
//
// WHY THE TAB STRIP AND THE TITLE ACTION ARE NOT THE KIT'S OWN `<Tabs>` AND
// `<Button>`. This whole picture carries `role="img"` — one accessible name
// for the composite, the same contract the kit's own `AppearancePreview`
// already used. Mounting REAL Radix tab triggers or a real, focusable
// `<button>` inside an `img`-rolen node is a genuine accessibility fault
// (assistive tech cannot reliably reach — or usefully act on — a control
// buried inside a node that has told it "this is a picture, read my label
// and stop"), so the tab strip is drawn with plain, inert `<span>`s carrying
// the kit's own type and hairline tokens, and the title action reuses the
// kit's own `buttonVariants()` class function on a `<span aria-hidden>`
// rather than a live `<Button>` — the kit's STYLE, not a live control that
// has nothing to do once pressed. `Card`, `Badge` and `List` are mounted for
// real: none of the three is interactive here (no `interactive` prop on
// `Card`, no `onRowSelect` on `List`, and `Badge` is a label, never a
// control — see each component's own header), so nothing about them
// contradicts the `role="img"` contract.
//
// WHY THEME CAN BE PREVIEWED WITHOUT DOCUMENT-LEVEL SUPPORT. The kit's own
// `AppearancePreview` states the constraint plainly: dark-mode tokens bind at
// `:root[data-theme="dark"]`, so a scoped descendant has no selector that
// says "be dark" while the document stays in the SAVED theme — which is
// exactly the situation here (the pending draft may read differently from
// what is actually applied). CSS custom properties do not have that
// problem: `var(--pill-fill)` (say) is resolved against `--pill-fill`'s
// cascaded value AT THE ELEMENT THAT USES IT, so redefining `--card`,
// `--foreground`, `--surface-panel` and friends on ONE wrapper div — using
// only the theme-invariant raw `--kw-*` tokens tokens.css already exposes
// (`--kw-off-beige`, `--kw-soft-paper`, `--kw-charcoal`, `--kw-unlit-*`),
// never a hex literal (R32 forbids one in this file's own directory) — makes
// every real kit part mounted inside that div read the PENDING theme
// correctly, with no document mutation and nothing sent anywhere. `--muted-
// foreground` and `--border` are derived the same way, through `color-mix()`
// off the same two ink tokens rather than a second literal.
//
// SPINE, SEPARATELY: `[data-spine="…"]` binds on ANY element (tokens.css
// §7b — `SpineSwatch` in `appearance-pill-group.tsx` already relies on
// exactly this), so the ground wash below is coloured off the SAME small,
// token-only table the kit's own preview used, transcribed here because the
// kit file is vendored and pinned (`shared/ui/VERSION.json`) and cannot be
// hand-edited to grow the extra elements this ruling asks for.
//
// THE KIT'S OWN `palette` LAW (`shared/ui/foundations/rules/`, run through
// `web/test/kit-conformance.test.ts`) FLAGS `GROUND` AND `previewTokens`
// BELOW, AND BOTH ARE EXEMPTED, REASONED, IN `web/test/kit-conformance.json`
// — a reader hitting a red `npm run check` over a `var(--kw-*)` reference
// here should read that entry rather than "fix" it by deleting the table:
// the exemption names the real fix (a kit-side theme-preview primitive) and
// this file is rebuilt on it, and this comment deleted with it, the day
// that primitive ships.
//
// LOREM, ON PURPOSE, SAME REASONING THE KIT'S OWN PREVIEW GIVES FOR ITS OWN
// SPECIMEN ROW: a picture of the SHAPE a screen takes, not of anyone's real
// data, and language-neutral so it never reads as a bug beside the language
// switcher one control away. Unlike the kit file, this one is NOT exempt
// from the app's translation walk (`shared/ui/` is; `shared/web/` is not),
// so every word below is a real, wrapped `t(…)` call — the seed
// (`shared/i18n-seed.ts`) carries the Lorem Ipsum words UNCHANGED across
// German, Spanish and Catalan, the same convention any translated product
// uses for placeholder Latin, and the one real sentence (the accessible
// name) is properly translated.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { buttonVariants } from "@shared/ui/components/button/button"
import { Card } from "@shared/ui/components/card/card"
import { List, type ListRow } from "@shared/ui/components/list/list"
import { Plus } from "@shared/ui/foundations/icons"
import { cn } from "@shared/ui/lib/utils"

import { type Spine } from "../spine"
import { useLanguage } from "./language"

/** The height token this file names for the ruling's own "name the height
 * token you chose" — 22rem, up from the kit picture's 17rem (v1.2.79's own
 * floor, grown once already for three specimen rows; this preview holds a
 * tab strip, a title row, a toolbar bar and a three-row list, so it earns a
 * second step). A floor, not a cap: the column this sits in has no fixed
 * height, so nothing here clips. */
export const APPEARANCE_PREVIEW_MIN_HEIGHT = "min-h-[22rem]"

/** Ground per spine, per resolved theme — the identical pair the kit's own
 * `APPEARANCE_PREVIEW_GROUND` resolves to, transcribed as `var(--kw-*)`
 * references (never the hex literals the kit file carries; R32 forbids one
 * here) because that file cannot be hand-edited to grow the rest of this
 * picture. */
const GROUND: Record<Spine, { light: string; dark: string }> = {
  ink: { light: "var(--kw-charcoal)", dark: "var(--kw-unlit-panel)" },
  paper: { light: "var(--kw-soft-paper)", dark: "var(--kw-unlit-quiet)" },
  mango: { light: "var(--kw-mango)", dark: "var(--kw-mango)" },
}

/** The card's own title/body scale — the same two sizes the kit's specimen
 * row moved with, read one step smaller because this frame now spends most
 * of its height on the list rather than on one row. */
const TITLE_SIZE: Record<"compact" | "default" | "large", number> = {
  compact: 13,
  default: 15,
  large: 17,
}

/** Redefine the handful of tokens every real kit part below reads
 * (`Card`/`Badge`/`List`'s own `--card`, `--popover`, `--foreground`,
 * `--surface-panel`, `--secondary*`, `--muted-foreground`, `--border`) to
 * the PENDING theme's values, scoped to one wrapper div — see this file's
 * own header, "WHY THEME CAN BE PREVIEWED WITHOUT DOCUMENT-LEVEL SUPPORT".
 * Every value is a `var(--kw-*)` reference or a `color-mix()` over one,
 * never a hex or an rgba literal. */
function previewTokens(theme: "light" | "dark"): React.CSSProperties {
  const ink = theme === "dark" ? "var(--kw-off-beige)" : "var(--kw-charcoal)"
  const card = theme === "dark" ? "var(--kw-unlit-raised)" : "var(--kw-off-beige)"
  const panel = theme === "dark" ? "var(--kw-unlit-panel)" : "var(--kw-soft-paper)"
  const secondary = theme === "dark" ? "var(--kw-unlit-secondary)" : "var(--kw-soft-paper)"
  const borderPct = theme === "dark" ? 12 : 8
  return {
    "--card": card,
    "--popover": card,
    "--foreground": ink,
    "--surface-panel": panel,
    "--secondary": secondary,
    "--secondary-foreground": ink,
    "--muted-foreground": `color-mix(in srgb, ${ink} 55%, transparent)`,
    "--border": `color-mix(in srgb, ${ink} ${borderPct}%, transparent)`,
  } as React.CSSProperties
}

export interface AppearanceTabPreviewProps {
  /** Already resolved — never "system". The panel's own `ThemeSection`
   * resolves "system" once, the same way the kit picture always required. */
  theme: "light" | "dark"
  /** The ground the whole frame stands on. */
  spine: Spine
  /** Moves the card's title text only, the same mechanic the kit picture
   * demonstrated. */
  scale?: "compact" | "default" | "large"
}

/**
 * A small, live picture of the shell itself: the rail, a two-tab strip, one
 * floating card (a title row, a toolbar bar, a three-row list), and one
 * mango title action — pure and prop-driven, so a caller can re-render it on
 * every control press with nothing stale.
 */
export function AppearanceTabPreview({ theme, spine, scale = "default" }: AppearanceTabPreviewProps) {
  const { t } = useLanguage()
  const ground = GROUND[spine][theme]
  const titleSize = TITLE_SIZE[scale]
  const tokens = previewTokens(theme)

  const lorem = t("Lorem")
  const ipsum = t("Ipsum")
  const dolor = t("Dolor")
  const texture = t("Lorem ipsum dolor sit amet")

  const rows: ListRow[] = [
    { title: lorem, description: texture, action: <Badge variant="status" dot="shipped">{lorem}</Badge> },
    { title: ipsum, description: texture, action: <Badge variant="status" dot="review">{ipsum}</Badge> },
    {
      title: dolor,
      description: texture,
      count: 3,
      action: <Badge variant="status" dot="blocked">{dolor}</Badge>,
    },
  ]

  return (
    <div
      role="img"
      aria-label={t("A small picture of the app, reflecting your chosen settings")}
      className={cn(
        "flex w-full overflow-hidden rounded-[var(--radius)] motion-hover",
        APPEARANCE_PREVIEW_MIN_HEIGHT
      )}
      style={{ background: ground }}
    >
      {/* THE RAIL — lies on the ground and paints nothing of its own, the
          same convention the kit's own preview and `screen-shell.tsx` state. */}
      <span data-slot="preview-rail" className="w-[2.875rem] shrink-0 min-[45rem]:w-[3.375rem]" aria-hidden="true" />
      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-2 p-3" style={tokens}>
        {/* THE TAB STRIP — two inert tabs. See this file's own header for why
            these are plain spans rather than the kit's live `<Tabs>`. */}
        <div data-slot="preview-tabs" className="flex shrink-0 items-center gap-4 px-1">
          <span
            data-slot="preview-tab"
            className="shadow-[inset_0_-2px_0_0_var(--foreground)] pb-1 text-xs font-[var(--font-weight-medium)]"
            style={{ color: "var(--foreground)" }}
          >
            {lorem}
          </span>
          <span data-slot="preview-tab" className="pb-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {ipsum}
          </span>
        </div>
        {/* THE FLOATING CARD — the one raised thing on this ground; nothing
            painted inside it is a second nested box (R67's own "not a card
            inside a card"). */}
        <Card className="flex flex-1 flex-col gap-2 p-3">
          {/* THE TITLE ROW — a fake record name and the one mango title
              action, R84's own shape (a mango control belongs only in a
              screen's title component) drawn here as a picture of it. */}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span
              className="truncate font-[var(--font-weight-medium)] transition-[font-size] duration-200"
              style={{ fontSize: `${titleSize}px`, color: "var(--foreground)" }}
            >
              {t("Lorem ipsum dolor")}
            </span>
            <span
              data-slot="preview-title-action"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "pointer-events-none h-6 shrink-0 px-2")}
            >
              <Plus className="size-3" aria-hidden="true" />
            </span>
          </div>
          {/* THE TOOLBAR ROW — a bare bar standing for the search/filter row
              every collection draws above its body (R48). */}
          <div
            data-slot="preview-toolbar"
            className="h-6 w-full shrink-0 rounded-pill"
            style={{ background: "var(--surface-panel)" }}
          />
          {/* THE LIST — three rows, each with its own status dot; the third
              also carries a count badge, so both "a status dot" and "a
              badge" are on screen at once. */}
          <List
            label={t("A small picture of the app, reflecting your chosen settings")}
            variant="panel"
            density="compact"
            rows={rows}
            className="flex-1"
          />
        </Card>
      </div>
    </div>
  )
}
