/* ============================================================================
   Badge — the status-coloured chip (59 direct call sites).

   DESIGN SOURCE
   design-mothership/specimens/kwapso-ui.css → `.kw-badge`
   design-mothership/specimens/_fragments/t11.css → `.kw-badge--inverse`,
   `.kw-badge--danger`, `.kw-tag--*` (chapter 11, chips and pills).

   THE LAW THIS FILE OBEYS
   · No border on any COLOURED pill — "colour is the whole treatment"
     (kit ruling 26). `variant="outline"` is the single uncoloured variant and
     is the only one that draws a hairline; it exists here because the
     commission requires it and because a Badge, unlike a Button, is not a
     control (see GAPS.md BDG-2).
   · Charcoal on every accent, both modes. `--destructive-foreground`,
     `--success-foreground` and `--primary-foreground` are all already
     charcoal. Trust them; never reach for white.
   · Mango (`--primary`) is a brand fill, never a status. It carries
     `variant="default"` — a count or a "3 new" — and never "warning" or
     "in build". It is OPT-IN: an unqualified <Badge> is quiet. Ruled
     2026-08-22 against verify/badge-default-comparison.html, because
     defaulting to mango put it on most rows of a list and broke the
     one-mango-per-view rule that the same kit states.
   · Radius is `--radius-pill`.
   · Separation is a FILL, never a border or a shadow — GAPS-RULINGS.md R-4c.
     `secondary`'s quiet fill is a rebindable custom property precisely so the
     one case where `--surface-quiet` reads too close to its ground (an
     ambient `--muted` field, not a card) has a real escape hatch: a caller
     rebinds `--badge-quiet-fill` to a darker quiet tone. It never reaches for
     an edge instead — this file draws no `border` anywhere but `outline`'s
     inset hairline, and that carve-out is `outline`'s alone (GAPS-REVIEW1A
     Q4), not a pattern to extend to `secondary`.
   · A count renders EMPTY, never "0" (kit `.kw-badge:empty { display:none }`).
     That is this component's empty state and its loading state both.
   · CH11 draws THREE pill geometries and this file now carries two of them:
     the 20-tall COUNTER (`size="counter"`, the default — today's geometry,
     untouched) and the 26-tall STATUS PILL / TAG (`size="pill"` —
     `--control-height-pill`, `padding: 6px 14px`, drawn label 12.5 folded to
     the badge step per the half-step rule in GAPS-FIDELITY-A L3: status text
     takes 12). Logged as GAPS-KIT-BC BDG-B1 with this exact addition written
     out; applied 2026-08-26 on the client's re-audit instruction.
   · THE STATE LIVES IN THE DOT (`dot` prop + `variant="status"`). CH11:
     "neutral fill, charcoal label, the state lives in the dot. Mango is the
     brand, never a status dot — 'in build' takes charcoal." The six dot
     tones are the six `--dot-*` tokens; ruling 04's portal three reuse them
     (With us → building, Your answer → review, Done → done).
   · THE STATUS FILL NEVER DROPS ITS NEUTRAL FOR ANY TONE — client ruling
     16 Sep 2026 ("go for the kit fix"), reversing ruling 26's dark clause.
     That clause put the ONE charcoal-dot pill ("in build" / "with us") on a
     mango fill in dark mode; the client's own law elsewhere is "mango is
     never on a status" (ch11), and the clause was the one place this file
     broke it. The compound variant is gone — `variant="status"` now resolves
     to `--pill-fill`/`--pill-label` for every `dotTone`, `building` included,
     in both palettes — and the two tokens that carried the exception
     (`--pill-fill-building`, `--pill-label-building`) are gone from
     tokens.css with it; nothing here reaches for them any more.
   · THE LEADING-MARK GAP IS UNIVERSAL, NOT A DOT-ONLY SPECIAL CASE — CLIENT
     RULING, 18 SEP 2026, VERBATIM: "on ticket list views, its missing the
     space between icon and name and the backgorund card. always, make it a
     rule, for everythng wether its a dot or an icno, for all chips / pills."
     `LEADING_MARK_GAP` (`gap-2`, `--space-2`, 8px — the SAME rung the status
     dot already spent; see the retired `GAP_WITH_DOT`'s own history, just
     above `badgeVariants`)
     now lives in `badgeVariants`' own BASE class list, not behind a `dot ?
     ... : undefined` ternary: a `gap` utility only ever draws space BETWEEN
     flex children, so a label-only badge (one child) pays nothing for it and
     any two-child badge — dot-led or icon-led, whichever mark it leads
     with — gets it for free. This closes the exact bug the ruling reports:
     the ticket-type chip (`web/components/tickets/tickets-collection.tsx`'s
     `type` column cell, and `shared/web/ticket-chips.tsx`'s own type chip)
     hands an icon element in as a plain CHILD beside the label text, never
     through the `dot` prop, so the old dot-only gap never applied to it.
     THE FILL WAS NEVER ACTUALLY MISSING — every variant already carries a
     real `bg-` declaration, `outline` included (`bg-transparent` is a
     DECLARED choice, not an absent one) — but the ruling's own second
     clause ("no variant may render bare text without a fill") is now a
     standing invariant `check-badge.mjs` pins structurally, not merely true
     today by accident. `icon`, a new prop below, gives an icon-led chip the
     same formal slot `dot` already has, so a call site never has to
     hand-roll an `<Icon/>` + `<span>` pair again — see `BadgeProps.icon`'s
     own doc.
   · THE ICON SLOT'S COLOUR IS FORCED, NOT LEFT TO THE CALL SITE — CLIENT
     RULING, 18 SEP 2026, over a screenshot of a ticket head: "type icon is
     still gray." `[icon-led-chip]`'s own `data-slot="badge-icon"` wrapper
     now carries `[&_svg]:text-foreground`, which outranks any colour class
     the caller's own SVG writes (CSS specificity, not source order — see the
     render site's own comment). "Charcoal on every accent" already named the
     LABEL; this closes the same law over the icon beside it.

   RENDERING CONTEXT
   No `"use client"`. No hook, no state, no browser API, no event handler.
   ========================================================================= */

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/** THE LEADING-MARK GAP — `--space-2` (8px), the SAME rung the status dot
 * always spent (formerly `GAP_WITH_DOT`, applied only when `dot` was truthy;
 * retired 18 Sep 2026, see this file's own header law for the ruling). Lives
 * in `badgeVariants`' own BASE class list below, unconditionally, rather than
 * behind a `dot ? … : undefined` ternary — a `gap` utility only ever spends
 * space BETWEEN flex children, so it is free on a label-only badge (one
 * child) and applies identically whether the second child is the `dot` span,
 * the new `icon` slot, or (should a future badge draw one) a face/avatar. One
 * rung, one name, one place it is spent — a dot-chip and an icon-chip can
 * never drift to two different gaps again. */
const LEADING_MARK_GAP = "gap-2";

const badgeVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center",
    "rounded-pill whitespace-nowrap",
    // `text-badge` is a real utility — tokens.css registers the three
    // kwapso-only steps in the @theme bridge, so one class sets size, leading
    // and tracking together. `leading-none` overrides the step's own leading,
    // which a fixed-height pill does not want.
    "text-badge leading-none font-medium",
    // Every number in a badge, a column or a KPI is tabular.
    "tabular-nums",
    // THE LEADING-MARK GAP, UNCONDITIONAL — see LEADING_MARK_GAP's own
    // comment above for why a base-class gap is safe on a one-child badge.
    LEADING_MARK_GAP,
  ],
  {
    variants: {
      size: {
        /** The counter — 20 min-width · 20 tall · 8 inline padding. */
        counter: "h-5 min-w-5 px-2",
        /**
         * The status pill and the tag — CH11's second geometry:
         * `--control-height-pill` (26) tall, 14 inline (`--space-3h`, the
         * drawn `padding: 6px 14px`).
         *
         * THE DOT-TO-LABEL GAP IS NOT HERE ANY MORE — see `LEADING_MARK_GAP`
         * above `badgeVariants`. It used to live on this size step alone,
         * which read as "a status pill always has the gap" and is exactly
         * backwards: the gap belongs to the LEADING MARK, not to the size.
         * `variant="status"` docs its own `dot` as "usually paired with …
         * `size="pill"`" — a call site that forgot the pairing (fourteen of
         * them, 17 Sep 2026 census) got `size="counter"`'s geometry with no
         * gap at all, the dot sitting flush against the word. Client, same
         * day, on the automations status chip: "Validated the colors, but
         * it's missing the space between the dot and the word. Fix that."
         * Moving the gap first onto the dot's own presence (17 Sep) and then
         * (18 Sep, second ruling) onto `badgeVariants`' own BASE class —
         * unconditional, not keyed on `dot` at all — fixes every existing
         * and future call site FOR FREE, dot-led or icon-led alike.
         */
        pill: "h-[var(--control-height-pill)] px-[var(--space-3h)]",
      },
      variant: {
        /** `.kw-badge--accent` — the brand fill, charcoal label. */
        default: "bg-primary text-primary-foreground",
        /**
         * `.kw-badge` base — the quiet counter.
         *
         * THE FILL IS A CUSTOM PROPERTY WITH A FALLBACK, NOT A BARE TOKEN —
         * see GAPS-RULINGS.md R-4c. `--surface-quiet` reads fine everywhere
         * this badge ships today (panel, card, page); the one case it does
         * NOT — measured, not assumed — is a quiet badge sitting on `--muted`
         * (tokens.css's own "inactive tabs, idle wells", an ambient field
         * rather than a card): 1.175 in dark, worse than the panel case
         * already logged in GAPS-CONTRAST.md Tier C. A caller who KNOWS a
         * badge sits on that ground rebinds `--badge-quiet-fill` locally to a
         * darker quiet tone — a FILL shift, same mechanism `tabs.tsx` TAB-C1
         * uses for the folder tab's two papers — never a border or a shadow.
         * Every existing call site is unaffected: with nothing rebound, this
         * resolves to exactly `--surface-quiet`, unchanged.
         *
         * THE LABEL IS `--foreground`, NOT `--ink-secondary` — CORRECTED
         * 18 SEP 2026, CLIENT RULING, VERBATIM: "why is chip ticket type
         * grey and not black? all text shhould be black." `text-ink-secondary`
         * was this variant's own quiet ink since before this file's own
         * "charcoal on every accent" law existed for the COLOURED variants,
         * and nobody had carried that law over to the one UNCOLOURED variant
         * that quietly kept a muted grey label instead. The fix is the same
         * shape every coloured variant already uses — the FILL carries the
         * tone (quiet, here), the LABEL is always ink — so `secondary` reads
         * `text-foreground` like every other variant in this file now does.
         */
        secondary: "bg-[var(--badge-quiet-fill,var(--surface-quiet))] text-foreground",
        /* The one uncoloured variant, and so the one that carries an edge.
           No `border` property — review 1A · fix 2 — so the edge is the
           artifact's own inset hairline. ch02's carve-out names fields,
           selection controls and same-tone card separation and does NOT name
           a badge; the pixels are unchanged from the previous drawing and the
           question of whether an uncoloured badge should carry any edge at
           all is logged in GAPS-REVIEW1A.md (Q4). */
        outline: "shadow-[var(--hairline)] bg-transparent text-foreground",
        /** `.kw-badge--danger` — poppy fill, CHARCOAL label. Not white on red. */
        destructive: "bg-destructive text-destructive-foreground",
        /** `.kw-tag--forest` — forest fill, charcoal label. Lifts on dark. */
        success: "bg-success text-success-foreground",
        /**
         * RULED 2026-09-02. `--warning` is the client's new orange
         * (`--kw-orange`, admitted the same day) and `--warning-foreground`
         * is charcoal on it, at 7.79:1 — the accent law, in both palettes,
         * with no dark half because the fill has none.
         *
         * Until that ruling this pair resolved to `--surface-quiet` /
         * `--ink-secondary`, which is EXACTLY what `secondary` above draws:
         * a warning chip and a quiet chip were the same pixels in both
         * palettes, in one component offering them as two variants. Poppy is
         * not involved and has not been since ruling 3B — `destructive`
         * means blocked, and it means only that. Closes GAPS.md BDG-1.
         */
        warning: "bg-warning text-warning-foreground",

        /* ---- Added, not required (commission §2 rule 3 permits additions).
           Both are drawn by the kit; without them a call site would hand-roll
           a fill and put a hex back into application code. ----------------- */

        /** `.kw-badge--inverse` — charcoal fill, off-beige label. Flips with the palette. */
        inverse: "bg-surface-inverse text-ink-on-inverse",
        /** `.kw-tag--sky` — the informational tone. Charcoal label, as every accent. */
        info: "bg-info text-ink-on-accent",
        /**
         * CH11's status pill ground — `--pill-fill` / `--pill-label`, the
         * neutral pair that flips with the palette. The state lives in the
         * `dot`; the fill never carries it. Usually paired with
         * `size="pill"`; the fill is legal at either size.
         */
        status: "bg-[var(--pill-fill)] text-[var(--pill-label)]",
      },
      /* The dot's tone, mirrored into cva so the two status special cases
         above can key on it. The dot itself is drawn in JSX below — a class
         cannot render an element. */
      dotTone: {
        shipped: "",
        building: "",
        review: "",
        blocked: "",
        archived: "",
        done: "",
        /* PRIORITY'S OWN FOUR (2026-09-15, tokens.css's own note beside
           `--dot-red`/`--dot-orange`/`--dot-purple`/`--dot-blue`). Additive,
           never a fifth compound variant: none of the four is `building`, so
           the dark-mode mango special case above is never reached by a
           priority chip — it stays scoped to `dotTone: "building"` alone. */
        red: "",
        orange: "",
        purple: "",
        blue: "",
      },
    },
    /* NO COMPOUND VARIANTS ANY MORE — RETIRED 18 SEP 2026, THE SAME RULING
       THAT FIXED `secondary`'s LABEL, ABOVE. This file used to carry exactly
       one: the Archived status pill's own label repainted to `--ink-tertiary`
       ("the one status whose words go quiet along with its dot"). The
       client's own new law — "all text shhould be black", read together with
       the file's already-standing "the state lives in the dot" rule — leaves
       no variant, archived included, permitted to dim its LABEL for tone;
       only the dot may. Deleted outright rather than left inert: this file's
       own standard for a retired rule is no dead body left for a future
       session to trip on (see the badge check's own regression guard). */
    defaultVariants: {
      /* RULED 2026-08-22, by looking at it side by side (verify/
         badge-default-comparison.html): an unqualified <Badge> is QUIET, not
         mango. The kit draws `.kw-badge--accent` in mango AND rules one mango
         per view; both are the kit, and defaulting to mango broke the second
         one — eight rows of a list came out with six mango chips and the
         colour stopped meaning anything.

         `variant="default"` is untouched and still mango. Mango is now
         opt-in, which is what "the pile you are working" needs it to be. */
      variant: "secondary",
      size: "counter",
    },
  },
);

/* GAP_WITH_DOT — RETIRED 18 SEP 2026, THE SAME RULING THAT GENERALISED IT.
   Used to read "The dot's own gap, --space-2 (8px) — spent ONLY when a `dot`
   renders" and lived here, applied conditionally at the render site below.
   `LEADING_MARK_GAP` (above `badgeVariants`, in the base class list) replaced
   it outright rather than sitting beside it — this file's own standard for a
   retired mechanism is no dead body left for a future session to trip on,
   the same standard the retired Archived-pill compound variant is held to
   a few hundred lines up. */

/** THE LINK UNDERLINE — 18 SEP 2026, CLIENT RULING, VERBATIM: "when its a
 * link make it underlined (for exmaple the app name)." Unlike
 * `BreadcrumbLink`'s own `.kw-link` idiom (`no-underline` at rest,
 * `hover:underline`) — right for a link sitting in a sentence, where an
 * always-on underline under every crumb would be noise — a badge is a
 * discrete pill with no surrounding prose to read it against, and the
 * client's own example is exactly that: an app-name CHIP that has to read as
 * a link at a glance, including on a touch device with no hover state to
 * reveal one. So this underline is ALWAYS ON, not hover-revealed, the moment
 * a badge counts as a link — `asChild` or `href`, see `BadgeProps`' own
 * doc — and `underline-offset-[0.1875rem]` is `BreadcrumbLink`'s own figure
 * (3px), reused rather than re-picked so a reader who has learned what an
 * underline offset means on one link component sees the identical rhythm on
 * this one. */
const LINK_UNDERLINE = "underline underline-offset-[0.1875rem]";

/** The ten dot tones — one per `--dot-*` token, and no mango (never a status).
 * The first six are a LIFECYCLE (shipped/building/review/blocked/archived/
 * done — App Stage, ticket and story status). The last four are a PRIORITY,
 * never a lifecycle (tokens.css's own note beside `--dot-red` explains the
 * split, and why the app's `PRIORITY_DOT_TONE` moved off the first six). */
const DOT_FILL = {
  shipped: "bg-[var(--dot-shipped)]",
  building: "bg-[var(--dot-building)]",
  review: "bg-[var(--dot-review)]",
  blocked: "bg-[var(--dot-blocked)]",
  archived: "bg-[var(--dot-archived)]",
  done: "bg-[var(--dot-done)]",
  red: "bg-[var(--dot-red)]",
  orange: "bg-[var(--dot-orange)]",
  purple: "bg-[var(--dot-purple)]",
  blue: "bg-[var(--dot-blue)]",
} as const;

export type BadgeDot = keyof typeof DOT_FILL;

/**
 * The kit's default abbreviation: 999 → "999", 1300 → "1.3k", 2_000_000 → "2m+".
 * Digits come from the runtime's own numeral system, and the two suffixes are
 * props, so Arabic, Urdu and Persian are a prop away rather than a fork.
 */
function abbreviate(value: number, thousandSuffix: string, millionSuffix: string): string {
  const n = Math.floor(value);
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}${millionSuffix}`;
  if (n >= 1_000) {
    const tenths = Math.floor(n / 100) / 10;
    return `${Number.isInteger(tenths) ? tenths : tenths.toFixed(1)}${thousandSuffix}`;
  }
  return String(n);
}

export interface BadgeProps
  extends React.ComponentPropsWithoutRef<"span">,
    Omit<VariantProps<typeof badgeVariants>, "dotTone"> {
  /**
   * Render the caller's own element instead of a `<span>` — an anchor,
   * almost always (a Next `<Link>` wrapping the badge, the same reason
   * `BreadcrumbLink`'s own `asChild` exists: nesting a `<Link>` inside an
   * `<a>` is invalid markup and breaks client-side routing). A badge given
   * `asChild` is treated as a LINK for `LINK_UNDERLINE`, below, whether or
   * not its child is actually an anchor — the prop is the caller's own
   * declaration of intent, the same way `href` is.
   *
   * THE CHILD MUST BE EXACTLY ONE ELEMENT THAT SPREADS ITS PROPS — Radix's
   * own `Slot` contract: the badge's classes, `data-slot`, `data-dot`, `href`
   * and ref are MERGED onto that element, so an app's own link component has
   * to pass what it does not name straight through to its anchor, or the
   * chip loses its `data-slot="badge"` and its fill. A `dot` or `icon` given
   * beside `asChild` lands INSIDE the child, before the label (the child IS
   * the badge; its leading mark belongs in it) — this is `Slottable` at
   * work, see the render's own comment. Until 18 Sep 2026 this prop threw
   * on every real call, because the render always spent three child slots
   * and `Slot` demanded one; `check-badge.mjs` section 6 now MOUNTS this
   * shape rather than reading the source for it, so a regression here is a
   * red check and never again a runtime throw the app finds first.
   */
  asChild?: boolean;
  /**
   * A badge that IS a link — `.kw-tag--app`, ruling 04's app-name chip, the
   * example the 18 Sep underline ruling names by name. Given `href` with no
   * `asChild`, the badge renders as a real `<a>` rather than a `<span>`; the
   * two props are never both required (an app router's own `<Link asChild>`
   * still passes `href` down to the `<a>` it wraps), only one of them is
   * ever REQUIRED for the badge to count as a link — see `LINK_UNDERLINE`.
   */
  href?: string;
  /**
   * CH11's 7px status dot (`--dot-status`), drawn before the label. The dot
   * names the state and the label says it in words — ruling 26, so a call
   * site should never pass `dot` without a text label. Ruling 04's portal
   * vocabulary reuses the same tones: With us → `building`,
   * Your answer → `review`, Done → `done`. Usually paired with
   * `variant="status"`; `size="pill"` is the taller geometry a status chip
   * usually wants, but the leading-mark gap (`LEADING_MARK_GAP`, in
   * `badgeVariants`' own base class list) no longer depends on it — a `dot`
   * at `size="counter"` still gets its 8px, and so does `icon`, below.
   */
  dot?: BadgeDot;
  /**
   * THE ICON-LED CHIP'S OWN SLOT — 18 SEP 2026, CLIENT RULING (the same one
   * `LEADING_MARK_GAP` answers): "for everythng wether its a dot or an
   * icno, for all chips / pills." A caller-drawn node (a Phosphor glyph from
   * `foundations/icons`, sized and coloured by the caller, exactly the shape
   * `typeDot`/`ticketTypeIconName` already hand in on the ticket-type chip
   * this ruling names) drawn before the label, the identical position `dot`
   * takes when both are absent. Rendering it through THIS prop — rather
   * than as a plain child beside the label text, the shape the ticket-type
   * chip used before this ruling — is what makes it a real Badge instead of
   * an ad-hoc `<Icon/>` + `<span>` pair: the leading-mark gap and the
   * variant's own fill both apply automatically, and a future icon-led chip
   * never has to remember to wire either by hand. `aria-hidden`, same as
   * `dot` — the label is still what says the state in words. Legal at
   * either `size`; if a call site also passes `dot`, both render (an
   * unusual pairing, not a forbidden one).
   */
  icon?: React.ReactNode;
  /**
   * A count, abbreviated by the kit's rule and rendered as the badge's label.
   * Zero or negative renders nothing at all — the kit never shows "0".
   * Ignored when `children` are given.
   */
  count?: number;
  /** Abbreviation suffix at 1 000. Translatable; the kit's English is "k". */
  thousandSuffix?: string;
  /** Abbreviation suffix at 1 000 000. Translatable; the kit's English is "m+". */
  millionSuffix?: string;
  /**
   * Replace the whole count formatter — the escape hatch for a locale whose
   * numerals or magnitude words the two suffixes cannot express.
   */
  formatCount?: (value: number) => string;
  /** Busy. Renders nothing: a count that has not arrived is not "0". */
  loading?: boolean;
  /**
   * Render nothing when there is no label. Default `true`, matching the kit's
   * `.kw-badge:empty { display: none }`. Set `false` to keep an empty pill as
   * a layout placeholder.
   */
  hideWhenEmpty?: boolean;
}

/**
 * A status-coloured chip.
 *
 * TEN STATES
 *  1. default        — variant fill + variant ink. A LINK badge (`asChild`
 *                      or `href`, see `BadgeProps`' own doc) also draws
 *                      `LINK_UNDERLINE` at every state, not only this one —
 *                      18 Sep 2026 ruling, "when its a link make it
 *                      underlined" — because it is what says "this pill is
 *                      a link" without a hover to reveal it.
 *  2. hover          — does not apply to a plain badge — it is a label, not
 *                      a control, and if a call site wraps one in a button
 *                      the button owns hover. A LINK badge is the one
 *                      exception: it is a real `<a>` (or the caller's own
 *                      anchor, via `asChild`), so the browser's ordinary
 *                      link hover applies to it same as any other anchor;
 *                      this file adds no hover state of its own on top.
 *  3. focus-visible  — does not apply to a plain badge, for the reason
 *                      state 2 gives; a LINK badge is focusable exactly
 *                      because it is a real anchor, and tokens.css §8 rings
 *                      it globally — this file still adds no ring of its
 *                      own.
 *  4. active/pressed — does not apply.
 *  5. disabled       — does not apply. A label cannot be disabled; an inactive
 *                      record uses `variant="secondary"`, which is a meaning,
 *                      not a state.
 *  6. loading        — `loading`: renders nothing. Kit law — a count renders
 *                      empty, never "0", when zero OR loading.
 *  7. empty          — no children and no positive count: renders nothing
 *                      (`hideWhenEmpty`, default true).
 *  8. error          — expressed as `variant="destructive"`. A badge has no
 *                      error state of its own; it IS the error's report.
 *  9. selected       — does not apply. The selectable chip is `filter-bar`'s,
 *                      which carries its own remove control.
 * 10. read-only      — always. A badge is never editable.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. Geometry is fixed (20 tall as a
 *  counter, 26 as a status pill or tag) in all three; the badge never wraps
 *  (`whitespace-nowrap`) and never truncates. A row that runs out of width is
 *  the parent's problem to wrap or scroll — a badge that shrank would stop
 *  being the same size as its neighbours.
 *
 * RTL — safe. `px-*` is padding-inline, the dot leads by flex order, and
 * nothing is positioned by side.
 */
const Badge = React.forwardRef<HTMLSpanElement | HTMLAnchorElement, BadgeProps>(
  (
    {
      className,
      /* Must match cva's defaultVariants above — a JS default in the
         destructure wins over cva, so the two have to agree or the ruling
         silently does not apply. */
      variant = "secondary",
      size = "counter",
      dot,
      icon,
      count,
      thousandSuffix = "k",
      millionSuffix = "m+",
      formatCount,
      loading = false,
      hideWhenEmpty = true,
      asChild = false,
      href,
      children,
      ...props
    },
    ref,
  ) => {
    // Loading and zero are the same picture: nothing.
    if (loading) return null;

    let label: React.ReactNode = children;

    if (label === undefined || label === null || label === "") {
      if (count !== undefined) {
        if (count <= 0) return null;
        label = formatCount
          ? formatCount(count)
          : abbreviate(count, thousandSuffix, millionSuffix);
      } else if (hideWhenEmpty) {
        return null;
      }
    }

    /* WHICH ELEMENT, AND WHETHER IT COUNTS AS A LINK — both read off the
       same two props. `asChild` wins the element choice when both are given
       (the app-router `<Link asChild>` shape `BadgeProps.href`'s own doc
       names); either one alone is enough to count as a link for
       `LINK_UNDERLINE`, because both are the caller's own declaration that
       this badge points somewhere. */
    const Comp: React.ElementType = asChild ? Slot : href !== undefined ? "a" : "span";
    const isLink = asChild || href !== undefined;

    return (
      <Comp
        ref={ref as React.Ref<HTMLAnchorElement>}
        data-slot="badge"
        data-dot={dot}
        {...(href !== undefined ? { href } : undefined)}
        className={cn(
          // THE LEADING-MARK GAP IS NO LONGER APPLIED HERE — it lives in
          // badgeVariants' own base class list now (LEADING_MARK_GAP), so
          // it draws whenever there are two children (dot-led or icon-led
          // alike) and costs nothing on a label-only badge. See this file's
          // own header law for the 18 Sep ruling.
          badgeVariants({ variant, size, dotTone: dot }),
          isLink ? LINK_UNDERLINE : undefined,
          className,
        )}
        {...props}
      >
        {icon ? (
          /* THE ICON-LED CHIP'S OWN SLOT — see BadgeProps.icon's own doc.
             aria-hidden for the same reason as the dot below: the icon never
             carries the meaning alone, the label says it in words. No forced
             SIZE — the caller's own node still picks its own `size-*` — but
             the COLOUR is forced now, and that reversal is the 18 Sep 2026
             ruling below.

             THE COLOUR USED TO BE LEFT TO THE CALL SITE ("sized and coloured
             at the call site") AND THAT WAS THE BUG. Her screenshot of a
             ticket head, same day as the grey-label report this file's own
             header already fixed: "type icon is still gray" — while the
             label beside it was already charcoal, because `shared/web/
             ticket-chips.tsx`'s own type chip hands this slot a Phosphor
             glyph with its OWN `text-muted-foreground` written at the call
             site (reproduced deliberately in `verify/badge/page.tsx`'s
             icon-led section, `text-muted-foreground` on every one of its
             four icons, so the defect stays visible rather than quietly
             fixed by deleting the repro). "Coloured at the call site" is
             exactly backwards for a chip whose whole law (this file's own
             header, "charcoal on every accent") is that the FILL carries the
             tone and everything drawn on it is ink — a caller should no more
             be able to grey this icon than to grey the label three lines
             down, and until this ruling it could.

             `[&_svg]:text-foreground` RATHER THAN A BARE `text-foreground`
             ON THIS SPAN, because a bare class here only sets the colour a
             child WITHOUT its own colour class would inherit — `currentColor`
             flows down, but an SVG that names its own utility (`text-muted-
             foreground`, above) sets `color` directly on itself, and a
             directly-set value always beats one merely inherited from an
             ancestor, however that ancestor's class is spelled. The bracket
             form instead compiles to a descendant selector — one class plus
             one element, `.badge-icon svg { color: … }` — which OUTRANKS the
             single class the caller wrote directly on the SVG in CSS
             specificity math regardless of source order, so it wins even
             against a call site that still passes `text-muted-foreground`
             (the read-only app repo's own call sites do, today, and cannot
             be edited from here — see `check-badge.mjs`'s own note). The
             identical rescue is already standing kit practice, not invented
             for this fix — `select.tsx` forces `[&_svg]:text-ink-secondary`
             the same way, `view-switch.tsx` documents the same pattern by
             name. No opacity utility is used for the same reason opacity was
             never right for the label: it dims the ink rather than
             replacing it, so a "muted" icon would still fail a contrast
             check the SAME ink at full strength already passes. */
          <span
            aria-hidden="true"
            data-slot="badge-icon"
            className="inline-flex shrink-0 items-center text-foreground [&_svg]:text-foreground"
          >
            {icon}
          </span>
        ) : null}
        {dot ? (
          /* `--dot-status` — the kit's one dot size (7). aria-hidden: the dot
             never carries the meaning alone (ruling 26); the label says it. */
          <span
            aria-hidden="true"
            /* NAMED so a future compound variant could repaint it without
               also catching anything a caller nests in `label` (7 Sep 2026).
               No compound variant reaches for it today — the one this file
               used to carry (the LABEL's own archived-tertiary repaint) was
               retired 18 Sep 2026, see `badgeVariants`' own comment — but the
               slot stays: it is what let that mechanism exist at all, and a
               future dot-only exception (unlike the retired label one) would
               still need it. */
            data-slot="badge-dot"
            className={cn("size-[var(--dot-status)] shrink-0 rounded-pill", DOT_FILL[dot])}
          />
        ) : null}
        {asChild ? (
          /* THE LABEL IS THE SLOT TARGET WHEN `asChild` — and only then.
             Radix `Slot` needs to find ONE element to merge this badge's
             props onto, and this render always writes three child
             expressions (icon, dot, label), two of which are `null` placeholders
             on a plain link chip. `React.Children.count` counts a `null` the
             same as an element (proved live 18 Sep 2026: `count([null, null,
             <a/>])` → 3), so without this wrapper `Slot` saw three children on
             EVERY `asChild` badge and threw "Slot failed to slot onto its
             children" — even with `icon` AND `dot` given, because three real
             elements are still not one. `Slottable` is Radix's own answer to
             exactly this shape (a Button with a leading glyph beside `asChild`
             children): `Slot` takes the element inside it as the target, and
             the siblings outside it — the icon and dot spans above — become
             that element's own leading children. So `<Badge asChild
             icon={g}><Link>App</Link></Badge>` renders `<a class="…badge…">
             <span data-slot="badge-icon">g</span>App</a>`: one anchor, the
             mark inside it, the label after. Wrapped ONLY under `asChild`,
             so the other 59 call sites pay no extra component layer, and a
             non-element `label` (a string, a `count`) under `asChild` still
             fails Radix's own contract loudly rather than being silently
             swallowed. Nobody in the app had ever called `<Badge asChild>`
             (the first real call site, `shared/web/ticket-chips.tsx`'s
             app-name chip, is what surfaced this), which is why
             `check-badge.mjs` section 6 now renders this path for real. */
          <Slottable>{label}</Slottable>
        ) : (
          label
        )}
      </Comp>
    );
  },
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
