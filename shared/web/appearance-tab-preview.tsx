"use client"

// THE APPEARANCE PREVIEW — a miniature of the WHOLE APP FRAME, not a picture
// of "a screen". Replaces this file's own earlier draft (below, kept as
// history) at the client's ruling.
//
// THE RULING, 17 SEP 2026, VERBATIM (the same session as the "taller, more
// populated" pass this file used to describe as current): "Good, the
// language part. However, I'm not happy with the pre-visualization. Please
// create an artifact with multiple options and include the whole settings
// page…" — and her pick, over the side-by-side artifact: "appearance p1" =
// "Miniature of this very page". Three words that reset the brief:
//
//   MINIATURE OF *THIS VERY PAGE* — not a generic specimen screen standing
//   for "the app" in the abstract (the retired draft's Card/Badge/List
//   picture, three placeholder rows with status dots), but the actual frame
//   Settings › Appearance sits inside RIGHT NOW: the rail with its real
//   groups and destinations, the top workspace strip with the pinned "+" and
//   the open tab, and the content card holding Settings' own tab strip and
//   the Appearance panel itself.
//
// REUSE, NOT REPAINT — AND WHERE THAT RAN INTO TWO WALLS.
//
//   WALL 1, THE REAL SHELL. `web/components/shell/app-shell.tsx` (2,200+
//   lines) is not a presentational component — mounting it opens a live
//   realtime socket for the active team (`useRealtime`) and the signed-in
//   user's own channel (`useUserRealtime`), reads `ActiveTeam` session
//   context this preview has none of, drives real History-API navigation
//   (`softNavigate`), owns the open-workspace-tab store, and fires a
//   background Google catch-up fetch on mount. Mounting it here to draw a
//   static picture would mean paying every one of those side effects — real
//   sockets, real fetches — for a thumbnail, which is exactly what "stay
//   lean" (CLAUDE.md's first prime directive) refuses.
//
//   WALL 2, EVEN THE KIT'S OWN `Rail`. `shared/ui/compositions/templates/
//   rail.tsx` needs no team/session context and looked like the honest
//   answer to "through the same components the app uses" — until its own
//   rows turned out to be REAL `<a>`/`<button>` elements with real
//   `onClick` handlers and a disclosure `useState` for group collapse. This
//   file already carries the law that forecloses that (see "WHY THE TAB
//   STRIP AND THE TITLE ACTION ARE NOT THE KIT'S OWN `<Tabs>` AND `<Button>`"
//   below): a real, keyboard-focusable control inside a node whose whole
//   contract is `role="img"` — "this is a picture, read my label and stop"
//   — is the identical accessibility fault this file already refused for
//   Radix tabs and a live `<Button>`. Mounting the real `Rail` would commit
//   it a third time, in the one part of the picture the client just asked
//   to be MORE real.
//
//   WALL 3, THE REGISTRY ITSELF. Even without a component in the way, this
//   file cannot import the DATA — `web/lib/pages.ts`'s `NAV` / `TEAM_SECTIONS`
//   — either. `web-portal/tsconfig.json` states outright: "the portal reaches
//   its own tree and shared/ — and NOTHING else… a front door that compiled
//   out of the other front door's source had an undeclared dependency on it."
//   `shared/web/` is in BOTH `web/tsconfig.json`'s program and
//   `web-portal/tsconfig.json`'s (the identical `../shared/**/*.tsx` glob), so
//   an import of `@/lib/pages` here resolves against the PORTAL's own `@/*`
//   alias too under its own typecheck — which points at `web-portal/lib`, not
//   `web/lib` — and breaks that program even though `AppearancePanel` is not
//   mounted in the portal today (confirmed: no `web-portal` file references
//   either component). A lane that owns exactly two files in `shared/web/`
//   has no business opening that boundary for a settings picture.
//
// SO: A FAITHFUL PRESENTATIONAL COPY, IN THIS FILE, OF REAL WORDS — never a
// live `Rail`, never an import of `web/lib/pages.ts`. `RAIL_GROUPS` and
// `SETTINGS_TABS` below are TRANSCRIBED, verbatim and in file order, from the
// live registries — the exact `grep` that produced them is in each table's
// own comment, dated, so the next reader can re-run it rather than trust this
// sentence. This is the same shape as `GROUND` further down (already
// transcribed from the kit's own `APPEARANCE_PREVIEW_GROUND` for the same
// "cannot import the source" reason) and the same shape every other
// reasoned, rot-checked exemption in this codebase takes: `web/test/
// settings-appearance.test.tsx` lives inside `web/`'s OWN program, so IT can
// import `@/lib/pages` freely and asserts these two tables against the live
// source on every run — a peer session renaming "Hours" to "Logs" (which
// happened mid-build of this very change; see the note on `RAIL_GROUPS`)
// fails that test instead of rotting here silently.
//
// NOT ONE NEW STRING. Every word transcribed below — every rail group
// heading, every destination title, every Settings tab label, "Settings"
// itself — is already `t(...)`-wrapped somewhere the app walks (`app-
// shell.tsx`'s own `railGroups`/`universal` map, `settings-screen.tsx`'s own
// `tabsConfig` and its page `<Headline>`). R28's catalogue is a SET of
// strings, not a set of call sites, so calling `t("Waves")` a second time
// from here adds no row to `shared/i18n-strings.json` — confirmed by reading
// each string's existing call site above, not assumed.
//
// THE FIXED-ASPECT, SCALED FRAME. The rail + top strip + content card below
// are authored on a FIXED 1280×800 design canvas (`DESIGN_WIDTH`/
// `DESIGN_HEIGHT`, exactly 16:10) in literal pixels — never `rem` — because
// `rem` inside a `transform: scale()`'d subtree still resolves against the
// REAL document's root font-size (the signed-in user's own chosen Size,
// `applyScale`), which has nothing to do with the miniature's own layout and
// would make the picture's proportions drift with a setting this preview
// does not otherwise represent. `usePreviewScale` (below) measures the outer
// box's own rendered width via `ResizeObserver` (guarded exactly the way the
// kit's own `Clamp` guards it — `typeof ResizeObserver === "undefined"`,
// shared/ui/components/clamp/clamp.tsx) and derives `scale = width /
// DESIGN_WIDTH`; the design frame is transformed by that scale from its
// top-left corner, which is what makes a 1280px canvas fill a ~380px sticky
// column exactly, and re-measures on every resize of that column.
//
// THE OUTER BOX CARRIES `data-theme` NOW, ON TOP OF THE TOKEN OVERRIDE BELOW
// — NOT INSTEAD OF IT. `previewTokens` (below) is still how the picture
// actually PAINTS the pending theme (see this file's older header, kept
// below, for why: `tokens.css` binds dark mode at `:root[data-theme="dark"]`
// specifically, so a `data-theme` on a non-root wrapper cascades nothing).
// `data-theme={theme}` is added here as the ruling's own stated shape — "the
// draft's theme is applied to the thumbnail's subtree only (`data-theme` on
// the box and the spine token override)" — and as a plain, cheap assertion
// point: a test can read `box.getAttribute("data-theme")` against
// `document.documentElement.getAttribute("data-theme")` without reaching
// into the token machinery to prove the split holds.
//
// `pointer-events: none` IS NEW TOO. Nothing in here was ever meant to be
// clickable (every row is `aria-hidden`, the whole box is `role="img"`), but
// nothing said so in CSS either — a stray hover ring or a browser
// autofill affordance on a form ancestor could otherwise land on this
// picture. Stated now, structurally, rather than left to the accident of
// nothing inside currently being focusable.
//
// ──────────────────────────────────────────────────────────────────────────
// THE PREVIOUS RULING'S OWN HEADER, KEPT — the reasoning below (taller, not a
// container-inside-a-container, the `role="img"` contract, why theme can be
// previewed with no document mutation, the `GROUND` transcription) is
// UNCHANGED by this pass and still governs the parts of this file it
// describes.
//
// THE RULING, 2026-09-17 (EARLIER THE SAME DAY): "I want the preview on
// Settings > Appearance to be slightly taller. Currently, it's a container
// inside a container, so that's not accurate. Try to represent more of the
// real look of the app and include more elements inside, not just one kind
// of card." Two things survive verbatim from that pass:
//
//   1. TALLER. `APPEARANCE_PREVIEW_MIN_HEIGHT` below — 22rem, up from the
//      kit picture's 17rem — is UNCHANGED: a floor under the new fixed-aspect
//      box, not replaced by it (a very narrow sticky column would otherwise
//      shrink the 16:10 frame below a legible height).
//   2. NOT A CONTAINER INSIDE A CONTAINER. Still true, sharper now: the ONE
//      floating `<Card>` below stands for `ScreenShell`'s own card (the
//      single raised surface every main screen draws on), and nothing
//      painted inside it — the rail, the tab strips, the mini Appearance
//      panel — is a second nested surface.
//
// The THIRD clause of that ruling — "include more elements … not just one
// kind of card" — is superseded by the sharper instruction this header
// opens with: more elements was the right direction and "a miniature of
// this very page" is the specific shape it turned out to mean. The generic
// three-row list with status dots and a count badge that pass used to draw
// is gone; every element below now names something real on Settings ›
// Appearance itself rather than standing in for "a collection, generically".
//
// WHY THE TAB STRIP AND THE TITLE ACTION ARE NOT THE KIT'S OWN `<Tabs>` AND
// `<Button>`. This whole picture carries `role="img"` — one accessible name
// for the composite, the same contract the kit's own `AppearancePreview`
// already used. Mounting REAL Radix tab triggers or a real, focusable
// `<button>` inside an `img`-rolen node is a genuine accessibility fault
// (assistive tech cannot reliably reach — or usefully act on — a control
// buried inside a node that has told it "this is a picture, read my label
// and stop"), so every tab strip below (workspace AND Settings') is drawn
// with plain, inert `<span>`s carrying the kit's own type and hairline
// tokens. `Card` is mounted for real (no `interactive` prop, nothing inside
// it is a control), so nothing about it contradicts the `role="img"`
// contract.
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

import * as React from "react"

import { Card } from "@shared/ui/components/card/card"
import { Plus } from "@shared/ui/foundations/icons"
import { cn } from "@shared/ui/lib/utils"

import { type Spine } from "../spine"
import { useLanguage } from "./language"

/** The height token this file names for the ruling's own "name the height
 * token you chose" — 22rem, up from the kit picture's 17rem (v1.2.79's own
 * floor). Unchanged by the fixed-aspect pass above: a FLOOR under the
 * 16:10 box, never a cap — the column this sits in has no fixed height, so
 * nothing here clips on an ordinary column width. */
export const APPEARANCE_PREVIEW_MIN_HEIGHT = "min-h-[22rem]"

/** The design canvas every pixel below is authored on, and the ratio the
 * ruling asked for (16:10). Literal `px`, never `rem` — see this file's own
 * header, "THE FIXED-ASPECT, SCALED FRAME". */
const DESIGN_WIDTH = 1280
const DESIGN_HEIGHT = 800

/**
 * Measures the outer preview box's own rendered width and returns the ratio
 * to scale the fixed `DESIGN_WIDTH` canvas down to it — `[ref, scale]`, the
 * ref goes on the box being measured. Guarded for `ResizeObserver` exactly
 * the way the kit's own `Clamp` guards it (`typeof ResizeObserver ===
 * "undefined"`, shared/ui/components/clamp/clamp.tsx): a browser (or a test
 * environment) with none simply keeps the initial guess and never throws.
 *
 * THE INITIAL GUESS IS NOT 1. A scale of 1 would render the full 1280px
 * canvas at native size for one frame before the effect corrects it — a
 * visible flash of an oversized picture blowing out of its sticky column.
 * 0.3 approximates the common case (a ~380px sticky column at the `lg`
 * breakpoint this preview normally renders in) closely enough that the
 * correction, when it lands, is a small step rather than a lurch; it is
 * replaced with a real measurement on mount and on every resize after that.
 */
function usePreviewScale(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0.3)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const width = el.clientWidth
      if (width > 0) setScale(width / DESIGN_WIDTH)
    }
    measure()

    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, scale]
}

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
 * row moved with. Still read off the `scale` prop the panel already passes
 * (`previewScaleStep(pendingScale)`), unchanged by this pass. */
const TITLE_SIZE: Record<"compact" | "default" | "large", number> = {
  compact: 13,
  default: 15,
  large: 17,
}

/** Redefine the handful of tokens every real kit part below reads
 * (`Card`'s own `--card`, `--popover`, `--foreground`, `--surface-panel`,
 * `--secondary*`, `--muted-foreground`, `--border`) to the PENDING theme's
 * values, scoped to one wrapper div — see this file's own header, "WHY
 * THEME CAN BE PREVIEWED WITHOUT DOCUMENT-LEVEL SUPPORT". Every value is a
 * `var(--kw-*)` reference or a `color-mix()` over one, never a hex or an
 * rgba literal. */
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

/**
 * THE RAIL'S REAL GROUPS AND DESTINATIONS — transcribed, in file order,
 * verbatim from `web/lib/pages.ts` on 2026-09-17 by:
 *
 *   grep -n 'placement: "sidebar"' web/lib/pages.ts
 *   sed -n '/export const NAV_GROUP_ORDER/,/^}/p;/export const NAV_GROUP_LABELS/,/^}/p' web/lib/pages.ts
 *
 * NAV_GROUP_ORDER is `["my-work", "build", "accounts"]`; each group below
 * lists its `placement: "sidebar"` destinations in the FILE'S OWN order.
 * Home ("Welcome") carries `inRail: false` in that file — it is reached
 * through the brand mark, not a rail row — so it is correctly ABSENT here
 * too, not an omission.
 *
 * A LIVE RE-RUN CAUGHT THE FIRST DRAFT MID-BUILD: this table's `time` row
 * read "Hours" from an early grep and "Logs" from a second one taken minutes
 * later — a peer session (this repo's own working agreement: "peer sessions
 * share the repo") renamed it while this file was being written. "Logs" is
 * the value the final grep returned and the value below; `web/test/
 * settings-appearance.test.tsx`'s own rot-check re-derives this table from
 * the live source on every run, so the NEXT rename fails a test instead of
 * drifting here unnoticed. See this file's own header, "WALL 3, THE
 * REGISTRY ITSELF", for why the table is transcribed rather than imported.
 */
export const RAIL_GROUPS: readonly { heading: string; items: readonly string[] }[] = [
  { heading: "My work", items: ["Tasks", "Meetings", "Knowledge", "Logs"] },
  { heading: "Build", items: ["Waves", "Apps", "Stories"] },
  { heading: "Accounts", items: ["Accounts", "Tickets", "Contacts", "Inputs"] },
]

/**
 * THE SETTINGS SCREEN'S OWN TAB STRIP — transcribed, in order, from
 * `web/components/screens/settings-screen.tsx`'s own `tabsConfig.tabs` on
 * 2026-09-17 (`grep -n 'value: "' web/components/screens/settings-screen.tsx`).
 * "Appearance" leads because it is the outer tab this preview itself always
 * renders inside — the miniature is drawn FROM that tab, so it is always the
 * active one in the picture, never a guess.
 */
export const SETTINGS_TABS: readonly string[] = [
  "Appearance",
  "Members",
  "Roles",
  "Integrations",
  "Modules",
  "Automations",
  "Choices",
]

/**
 * THE MINI APPEARANCE PANEL'S OWN FOUR SECTIONS, IN ORDER — Language · Size
 * · Appearance · Background, `appearance-panel.tsx`'s own order (see that
 * file's header, "ONE CONTAINER, FOUR SECTIONS"). Each micro-label is
 * transcribed from its real section file (`language-section.tsx`,
 * `scale-section.tsx`, `theme-section.tsx`, `spine-section.tsx`), which all
 * already draw a bare micro-label over a row of pills with no box of their
 * own — the same bare shape this picture draws them in, at design scale.
 */
const MINI_PANEL_SECTIONS: readonly string[] = ["Language", "Size", "Appearance", "Background"]

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
 * A small, live picture of the WHOLE APP FRAME this very tab sits inside:
 * the rail (real groups, real destinations), the workspace top strip (the
 * open "Settings" tab and the pinned "+"), and one floating card holding
 * Settings' own tab strip and a miniature of the Appearance panel itself —
 * pure and prop-driven, so a caller can re-render it on every control press
 * with nothing stale.
 */
export function AppearanceTabPreview({ theme, spine, scale = "default" }: AppearanceTabPreviewProps) {
  const { t } = useLanguage()
  const ground = GROUND[spine][theme]
  const titleSize = TITLE_SIZE[scale]
  const tokens = previewTokens(theme)
  const [frameRef, previewScale] = usePreviewScale()

  const settingsLabel = t("Settings")

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={t("A small picture of the app, reflecting your chosen settings")}
      data-theme={theme}
      className={cn(
        "relative w-full overflow-hidden rounded-[var(--radius)] motion-hover pointer-events-none",
        "aspect-[16/10]",
        APPEARANCE_PREVIEW_MIN_HEIGHT
      )}
      style={{ background: ground }}
    >
      {/* THE DESIGN FRAME — a fixed 1280×800 canvas, scaled down to the box's
          own measured width. See this file's own header, "THE FIXED-ASPECT,
          SCALED FRAME". */}
      <div
        aria-hidden="true"
        data-slot="preview-frame"
        className="absolute left-0 top-0 flex"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${previewScale})`,
          transformOrigin: "top left",
          ...tokens,
        }}
      >
        {/* THE RAIL — real groups, real destinations (see `RAIL_GROUPS`
            above), lying on the ground and painting nothing of its own — the
            same convention the kit's own `Rail` and `screen-shell.tsx`
            state. Plain inert text, never the kit's own live `Rail` — see
            this file's own header, "WALL 2, EVEN THE KIT'S OWN `Rail`". */}
        <div data-slot="preview-rail" className="flex w-[210px] shrink-0 flex-col gap-[18px] px-[16px] py-[20px]">
          {RAIL_GROUPS.map((group) => (
            <div key={group.heading} data-slot="preview-rail-group" className="flex flex-col gap-[6px]">
              <span
                className="text-[9px] font-[var(--font-weight-medium)] uppercase tracking-[0.08em]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {t(group.heading)}
              </span>
              {group.items.map((item) => (
                <span
                  key={item}
                  data-slot="preview-rail-item"
                  className="truncate text-[11px]"
                  style={{ color: "var(--foreground)" }}
                >
                  {t(item)}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[10px] p-[14px]">
          {/* THE WORKSPACE TOP STRIP — the open "Settings" tab (this very
              page) and the pinned "+", the client's own two nouns
              ("the top strip with the pinned '+' and open tabs"). Never the
              kit's own live `BreadcrumbFolders` — same reasoning as the
              rail: a real tab strip is a set of real, focusable controls. */}
          <div data-slot="preview-tabs" className="flex shrink-0 items-center gap-[8px] px-[2px]">
            <span
              data-slot="preview-tab"
              data-active=""
              className="shadow-[inset_0_-2px_0_0_var(--foreground)] pb-[4px] text-[11px] font-[var(--font-weight-medium)]"
              style={{ color: "var(--foreground)" }}
            >
              {settingsLabel}
            </span>
            <span
              data-slot="preview-tab-new"
              className="flex items-center justify-center rounded-pill px-[6px] py-[2px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Plus aria-hidden="true" className="size-[10px]" />
            </span>
          </div>

          {/* THE FLOATING CARD — the one raised thing on this ground,
              standing for `ScreenShell`'s own card; nothing painted inside
              it is a second nested box (R67's own "not a card inside a
              card"). Holds Settings' own title, its own tab strip, and a
              miniature of the Appearance panel — this very page. */}
          <Card className="flex flex-1 flex-col gap-[10px] overflow-hidden p-[14px]">
            <span
              className="truncate font-[var(--font-weight-medium)] transition-[font-size] duration-200"
              style={{ fontSize: `${titleSize}px`, color: "var(--foreground)" }}
            >
              {settingsLabel}
            </span>

            {/* SETTINGS' OWN TAB STRIP — see `SETTINGS_TABS` above.
                "Appearance" leads and is the one always drawn active: this
                picture is always rendered FROM that tab. */}
            <div data-slot="preview-settings-tabs" className="flex shrink-0 flex-wrap items-center gap-[14px]">
              {SETTINGS_TABS.map((label, index) => {
                const active = index === 0
                return (
                  <span
                    key={label}
                    data-slot="preview-settings-tab"
                    data-active={active ? "" : undefined}
                    className={cn(
                      "pb-[3px] text-[10px]",
                      active
                        ? "shadow-[inset_0_-2px_0_0_var(--foreground)] font-[var(--font-weight-medium)]"
                        : undefined
                    )}
                    style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
                  >
                    {t(label)}
                  </span>
                )
              })}
            </div>

            {/* THE MINI APPEARANCE PANEL — Language · Size · Appearance ·
                Background, `appearance-panel.tsx`'s own order, each a bare
                micro-label over a short row of pills — the same shape their
                real section files draw (no box of their own; see
                `MINI_PANEL_SECTIONS` above), never a nested card. */}
            <div data-slot="preview-appearance-panel" className="flex flex-1 flex-col justify-around gap-[8px]">
              {MINI_PANEL_SECTIONS.map((label, sectionIndex) => (
                <div key={label} className="flex flex-col gap-[6px]">
                  <span
                    className="text-[8px] font-[var(--font-weight-medium)] uppercase tracking-[0.08em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t(label)}
                  </span>
                  <div className="flex gap-[6px]">
                    {[0, 1, 2].map((pillIndex) => (
                      <span
                        key={pillIndex}
                        data-slot="preview-pill"
                        className="h-[14px] w-[46px] rounded-pill"
                        style={{
                          background: pillIndex === sectionIndex % 3 ? "var(--foreground)" : "var(--surface-panel)",
                          opacity: pillIndex === sectionIndex % 3 ? 1 : 0.6,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
