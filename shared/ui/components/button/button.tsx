/* ============================================================================
   Button — the most-called control in the system (150 direct call sites).

   DESIGN SOURCE
   design-mothership/specimens/kwapso-ui.css → `.kw-btn` and its variants.
   Not shadcn. Where the two disagree, the kwapso specimen wins.

   THE LAW THIS FILE OBEYS
   · A button carries NO border in any state. No outline, no hairline, no
     stroke. A secondary button is a FILLED button in the other paper tone
     (`--btn-secondary-fill`). This is why `variant="outline"` does not exist
     here and does exist on Badge.
   · Focus is ONE global rule (tokens.css §8, a bare `:focus-visible`). This
     file defines no ring and never writes `outline: none`.
   · Disabled is a fill and an ink (`--btn-disabled-fill` /
     `--btn-disabled-label`), never an opacity.
   · Hover is a named token (`--btn-*-hover`), never an opacity.
   · Charcoal on every accent, both modes — `--destructive-foreground` is
     already charcoal. Trust it.
   · Radius is `--radius-pill`. There is no other radius on a button.

   RENDERING CONTEXT
   No `"use client"`. This module holds no hook, no state, no browser API and
   attaches no event handler of its own, so it renders in a Server Component
   unchanged. A call site that passes `onClick` is the client boundary, as it
   already was.
   ========================================================================= */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/* ----------------------------------------------------------------------------
   Disabled skin — ONE treatment, shared by every variant.

   Review 1A · fix 1: "one single disabled treatment shared by every variant.
   All variants look the same when disabled, styled off the default pair
   `--btn-disabled-fill` / `--btn-disabled-label`. Delete every per-variant
   disabled skin." ch08 draws one disabled button and names one state, and
   ch02 gives the quiet fill one job: "cancel buttons, disabled wells".

   This file used to carry TWO skins — a fill for the boxed variants and a
   bare ink-only skin for `ghost` and `link`, on the reasoning that those two
   have no box. They do: every variant here is the same 40-tall pill, and the
   fill is what says "not now". The second skin is deleted.

   Applied in JS, not as a `disabled:` utility. Deliberate: `disabled:bg-x`
   and `hover:bg-y` carry identical CSS specificity, so which one wins is
   decided by stylesheet order, which is not something a component may depend
   on. Composing the skin in JS and letting `cn`'s tailwind-merge drop the
   losing class makes the outcome deterministic.
   ------------------------------------------------------------------------- */
const DISABLED = [
  "cursor-not-allowed",
  "bg-[var(--btn-disabled-fill)]",
  "text-[var(--btn-disabled-label)]",
  /* `text` and `link` carry a rule under the label. It goes: "all variants
     look the same when disabled", and an underline is a second signal on a
     control that has nothing left to signal. */
  "no-underline",

  /* ---- AND THE STATES, PINNED — 2026-09-24 -------------------------------
     THIS IS WHERE THE `enabled:` GUARD USED TO LIVE, and moving it here is the
     same argument the paragraph above already makes, applied to the half it
     did not cover.

     Every variant wrote `enabled:hover:bg-[…]`, and the guard worked. What it
     also did was make the class UNBEATABLE by a call site. tailwind-merge only
     resolves two classes it recognises as one group, and `enabled:hover:bg-`
     and `hover:bg-` are different prefixes, so both survive the merge; then
     `:enabled:hover` carries one more pseudo-class than `:hover` and wins on
     specificity whatever the emission order. MEASURED with this repo's own
     tailwind-merge:

       twMerge("enabled:hover:bg-[var(--btn-secondary-hover)]",
               "hover:bg-[color-mix(in_srgb,currentColor_24%,transparent)]")
         -> "enabled:hover:bg-[var(--btn-secondary-hover)] hover:bg-[color-mix(…)]"
       twMerge("hover:bg-[var(--btn-secondary-hover)]",
               "hover:bg-[color-mix(in_srgb,currentColor_24%,transparent)]")
         -> "hover:bg-[color-mix(…)]"

     PATTERN.md §1 promises "the caller's className goes last so a call site
     can always win", and `lib/utils.ts` exists to keep that promise. For a
     colour in a state it was not being kept. THE BUG THAT FOUND IT: the
     consuming app's live-status toast (`shared/web/live-status.tsx`) paints a
     `bg-surface-inverse text-ink-on-inverse` pill and gives its Refresh button
     a wash keyed to `currentColor`, so fill and ink can never come apart —
     `bg-[color-mix(…currentColor 14%…)] text-current
     hover:bg-[color-mix(…currentColor 24%…)]`. At rest that works. On hover
     the caller's class lost, the button took `--btn-secondary-hover` — a fill
     chosen for a PAGE ground — and the label stayed the toast's ink:

         dark    #454239 fill under #1A1918 ink    1.748
         light   #F1ECE4 fill under #FFFEF9 ink    1.165

     Aurora saw the dark one: "when button color is black, text should be
     white (i saw this on the refresh button in dark mode when hover)".

     SO THE GUARD MOVES INSTEAD OF THE HOVER. The variants now write a plain
     `hover:`/`active:`, which a call site's own `hover:` merges with and wins.
     The guard becomes a `disabled:`-prefixed PIN, in two places that agree:

       · here, pointing at the disabled fill, emitted after the variant and
         before `className`, so `cn` resolves it by MERGE (same prefix, same
         group, later wins) rather than by specificity — the determinism this
         section's opening paragraph is entirely about; and
       · once per variant in the table below, pointing at that variant's OWN
         REST fill, which is what a non-reacting control looks like when this
         skin is not in play.

     THE SECOND ONE IS NOT BELT-AND-BRACES. `buttonVariants` is worn directly,
     without this component, by six others — `ticket-thread.tsx:818` renders a
     bare `<button disabled>` wearing `variant: "default"` — and those never
     receive this array at all. Under the old spelling `:enabled` suppressed
     their hover; under a plain `hover:` it would not, and a disabled Save
     button would light up mango under the pointer. The per-variant pin is what
     replaces the guard FOR THEM. It names the rest fill rather than the
     disabled one for a second reason: `loading` also puts `disabled` on the
     element, and this file's rule is that "Loading is not disabled-looking: it
     keeps its fill" — a pin to the disabled fill would have greyed a loading
     button the moment a pointer crossed it.

     AND IT FIXES SOMETHING THE KIT HAD ALREADY WRITTEN DOWN TWICE. `:enabled`
     matches form elements ONLY, so on an `<a>` or a Radix action the hover
     never arrived at all — `pagination.tsx` says "`enabled:hover:*` never
     matches AT ALL", `rail.tsx` says "`buttonVariants` silently loses its hover
     with nothing to see in review". Both are true of the old spelling and
     neither is true of this one. */
  "disabled:hover:bg-[var(--btn-disabled-fill)]",
  "disabled:hover:text-[var(--btn-disabled-label)]",
  "disabled:hover:no-underline",
  "disabled:active:bg-[var(--btn-disabled-fill)] disabled:active:translate-y-0",
].join(" ");

const buttonVariants = cva(
  [
    // Reset + shape. `border-0` is stated, not assumed: a button carries no
    // border in any state and a global reset elsewhere must not reintroduce one.
    "inline-flex shrink-0 items-center justify-center gap-2 border-0",
    "cursor-pointer rounded-pill whitespace-nowrap select-none",

    // Type. `text-sm` resolves to `--text-sm` (14/300-tier control label) via
    // Tailwind's own name; the weight token is not in the @theme bridge, so it
    // arrives as an arbitrary value.
    "text-sm leading-none font-[var(--font-weight-medium)]",

    // Motion. tokens.css already sets Tailwind's default duration and easing,
    // but both are restated so the component does not depend on import order.
    "transition-[background-color,color,text-decoration-color,transform]",
    "duration-[var(--duration-colour)] ease-kwapso",

    // Icon slot — any SVG child sits at `--icon-button` and never shrinks.
    "[&_svg]:pointer-events-none [&_svg]:size-[var(--icon-button)] [&_svg]:shrink-0",

    // Pressed: the kit drops the button one hairline and kills its shadow. 1px is an
    // optical nudge, one of the two values tokens.css allows off the scale;
    // written in rem so it never becomes a px in a component.
    "active:translate-y-[0.0625rem]",
    "disabled:active:translate-y-0",
  ],
  {
    variants: {
      variant: {
        /** `.kw-btn--primary` — mango fill, charcoal label. The one brand fill. */
        default: [
          "bg-[var(--btn-primary-fill)] text-[var(--btn-primary-label)]",
          "hover:bg-[var(--btn-primary-hover)]",
          "active:bg-[var(--btn-primary-pressed)]",
          "disabled:hover:bg-[var(--btn-primary-fill)] disabled:active:bg-[var(--btn-primary-fill)]",
        ],

        /**
         * `.kw-btn--secondary` — a FILLED button in the other paper tone.
         * Not an outline. Which tone "the other" is depends on the band the
         * button sits in; a container re-resolves `--btn-secondary-fill`
         * (kit GAP-10). No pressed token exists, so pressed is the nudge only.
         */
        secondary: [
          "bg-[var(--btn-secondary-fill)] text-[var(--btn-secondary-label)]",
          "hover:bg-[var(--btn-secondary-hover)]",
          "disabled:hover:bg-[var(--btn-secondary-fill)]",
        ],

        /** `.kw-btn--destructive` — solid poppy, CHARCOAL label. Not white on red. */
        destructive: [
          "bg-[var(--btn-destructive-fill)] text-[var(--btn-destructive-label)]",
          "hover:bg-[var(--btn-destructive-hover)]",
          "disabled:hover:bg-[var(--btn-destructive-fill)]",
        ],

        /** `.kw-btn--text` — a quiet action. Ink, permanently underlined on a faint rule. */
        text: [
          "bg-transparent text-foreground",
          "underline underline-offset-[0.1875rem] decoration-hair-strong",
          "hover:decoration-[var(--foreground)]",
          "disabled:hover:decoration-hair-strong",
        ],

        /**
         * ch26 · 01, verbatim: "Ghost / text link. Muted ink (fg3), darkens to
         * full ink on hover. Used for tertiary moves like 'Skip' or a
         * breadcrumb crumb." So: tertiary ink, no fill, and the hover is the
         * ink going to full — not a wash. The `--accent` wash this variant
         * used to carry was derived, not drawn (GAPS.md BTN-1), and it is the
         * chapter's stated treatment that wins. Logged as GAPS-TRACK1 BTN-2
         * because it also removes the only hover an icon-only ghost had, and
         * ch26 says an icon-only control is `secondary` anyway.
         */
        ghost: [
          "bg-transparent text-ink-tertiary",
          "hover:text-foreground",
          "disabled:hover:text-ink-tertiary",
        ],

        /** `.kw-link` — inherits its ink, underlines on hover, occupies no box. */
        link: [
          "bg-transparent text-inherit no-underline",
          "underline-offset-[0.1875rem] hover:underline",
          "disabled:hover:no-underline",
        ],

        /* ---- Added, not required. Commission §2 rule 3 permits additions.
           Both are drawn by the kit and hold their own tokens; without them a
           call site would have to hand-roll a fill. ------------------------ */

        /** `.kw-btn--inverse` — charcoal fill, off-beige label. Flips with the palette. */
        inverse: [
          "bg-[var(--btn-inverse-fill)] text-[var(--btn-inverse-label)]",
          "hover:bg-[var(--btn-inverse-hover)]",
          "disabled:hover:bg-[var(--btn-inverse-fill)]",
        ],

        /** `.kw-btn--cancel` — the quiet dismissal beside a primary. */
        cancel: [
          "bg-[var(--btn-cancel-fill)] text-[var(--btn-cancel-label)]",
          "hover:bg-[var(--btn-cancel-hover)]",
          "disabled:hover:bg-[var(--btn-cancel-fill)]",
        ],
      },

      size: {
        /** 40 — `--control-height-button`, the kit's standing control height. */
        default: "h-[var(--control-height-button)] px-5",
        /** 32 — `--control-height-dense`, the kit's `.kw-btn--dense` (in-field, in-overlay). */
        sm: "h-[var(--control-height-dense)] px-4",
        /** 44 — `--control-height-input`, the touch row. Padding derived (GAPS.md BTN-3). */
        lg: "h-[var(--control-height-input)] px-6",
        /** Square at the standing control height. Needs an `aria-label`. */
        icon: "size-[var(--control-height-button)] p-0",
      },
    },

    /* Compound classes are emitted after the variant classes, so tailwind-merge
       resolves them as the winner. This is how a variant overrides a size. */
    compoundVariants: [
      // The kit pads a text button to `--space-2`, whatever its height.
      { variant: "text", class: "px-2" },
      // A link is not a box: no height, no padding, no nudge on press.
      { variant: "link", class: "h-auto p-0 active:translate-y-0" },
    ],

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/* ----------------------------------------------------------------------------
   Busy indicator — local, not exported. `spinner` is its own primitive folder
   and owns the public `Spinner`; this is the in-button glyph the kit draws
   inside `.kw-btn` and nothing else may import it.

   The ring takes its colour from the label via `currentColor`, so it is
   correct on every variant and in both palettes without a token of its own.
   `border-2` is a 2px stroke — the second of the two values tokens.css keeps
   off the spacing scale, alongside the 1px hairline.
   ------------------------------------------------------------------------- */
function BusyRing() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-[0.875rem] shrink-0 rounded-pill border-2",
        "border-[color-mix(in_srgb,currentColor_25%,transparent)] border-t-current",
        /* `.motion-spinner`, NOT Tailwind's `animate-spin`. CH07's Loading row
           states "700ms spin / 1.4s bar" and motion.css §16 is where that
           700ms lives (`--duration-spin` on `--ease-linear`); `animate-spin`
           is Tailwind's own 1s and nothing in the theme re-times it, so the
           in-button ring was the one rotation in the system off the kit's
           clock. Same class `spinner.tsx` uses — two spinners, one drawing
           (SPN-1). Reduced motion: motion.css §18 keeps status loops running
           at their own speed, which replaces the 2.4s slow-down this span
           used to carry from kwapso-ui.css (both sides in GAPS-CE SPN-2). */
        "motion-spinner",
      )}
    />
  );
}

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Busy. The button keeps its own fill and grows a spinner — the kit draws a
   * submitting button as itself, not as a disabled button. Interaction is
   * blocked via the native `disabled` attribute and `aria-busy` is announced.
   */
  loading?: boolean;
  /**
   * The label to show while `loading`. Left undefined the children stay put,
   * which is why this component hardcodes no string at all: there is no
   * "Loading…" here to fail to translate. Pass one per locale if the label
   * should change (the kit draws "Submitting…").
   */
  loadingLabel?: React.ReactNode;
}

/**
 * The system's button.
 *
 * TEN STATES
 *  1. default        — variant fill + variant ink.
 *  2. hover          — `--btn-*-hover`. A colour swap, never a fade.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *  4. active/pressed — a 1px nudge; `default` also takes `--btn-primary-pressed`.
 *  5. disabled       — `--btn-disabled-fill` / `--btn-disabled-label`. ONE
 *                      treatment, identical on all eight variants.
 *  6. loading        — `loading`: variant fill kept, spinner, `aria-busy`.
 *  7. empty          — does not apply. A button always carries a label; where
 *                      that label is an icon only (`size="icon"`) the call site
 *                      must pass `aria-label`, which is why no default exists.
 *  8. error          — does not apply. Error is a property of the field or the
 *                      form, not of the control that submits it.
 *                      `variant="destructive"` is an intent, not an error state.
 *  9. selected       — does not apply. The kit draws no toggled button; the
 *                      system's selected control is `toggle` / `toggle-group`.
 *                      `aria-pressed` passes through untouched and gets no
 *                      visual, deliberately. Logged as GAPS.md BTN-2.
 * 10. read-only      — does not apply to a button.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. The kit states one control height
 *  (40) at every width, so the button does not grow, stack or collapse on its
 *  own. Where a 44 touch target is wanted the call site asks for `size="lg"`;
 *  where a button goes full-bleed that is the composition's grid, not this
 *  component (see GAPS.md BTN-4).
 *
 * RTL — safe. Every inset is logical (`px-*` is padding-inline), the icon slot
 * is order-driven by `gap`, and no direction is written anywhere.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      loading = false,
      loadingLabel,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    // Loading is not disabled-looking: it keeps its fill. Only a genuinely
    // disabled button takes the disabled skin.
    const showDisabledSkin = disabled && !loading;

    return (
      <button
        ref={ref}
        data-slot="button"
        data-loading={loading ? "" : undefined}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          buttonVariants({ variant, size }),
          showDisabledSkin && DISABLED,
          className,
        )}
        {...props}
      >
        {loading ? <BusyRing /> : null}
        {loading && loadingLabel !== undefined ? loadingLabel : children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
