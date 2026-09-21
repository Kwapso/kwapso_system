/* ============================================================================
   SearchInput — the raised search pill (1 direct call site, and the shape the
   command palette's own input copies).

   DESIGN SOURCE
   design-mothership/specimens/_fragments/t9.css → `.kw-search`,
     `.kw-search__icon`, `.kw-search__input`, `.kw-search__kbd`
     (chapter 9: "Search — borderless raised pill, 44").
   design-mothership/specimens/_fragments/t9-inputs.html — the glyph leads,
     the shortcut chip trails, the input between them is bare.

   THE LAW THIS FILE OBEYS
   · This is the ONE field in chapter 9 with NO hairline. It is a raised
     surface — the paper tone against its ground is the whole treatment (the
     rest shadow it used to carry is gone; SRC-B1).
     Adding a border here would make it the same drawing as `input`, which it
     deliberately is not.
   · 44 tall (`--control-height-input`, also the touch row) and a full pill,
     like every other single-line field.
   · Focus is ONE global rule (tokens.css §8). Nothing here defines a ring.
     The bare inner input is the focusable node, so this file marks the PILL
     as the focus shell and the input as the proxy: the ring is drawn on the
     shape the reader sees, at the same width and offset. Review 1A · fix 4;
     it closes GAPS-C.md SRC-2, which had recorded the square-ring behaviour
     as a known divergence.
   · Disabled is a fill and an ink (`--hair-faint` / `--ink-disabled`), never
     an opacity, and the elevation is withdrawn: a disabled surface is not a
     raised one.
   · The shortcut chip is badge type on `--hair-faint` at pill radius, and it
     is `aria-hidden` — it is a reminder of a key the application binds, not a
     control.

   THE ONE DIVERGENCE FROM `input.tsx`, ON PURPOSE
   `input.tsx` makes a loading field READ-ONLY, because typing into a field
   whose value has not arrived throws away what you typed. A search box has no
   such value: the text in it is the reader's own query and the server never
   fills it in. So `loading` here keeps the field fully editable, swaps the
   leading glyph for the spinner and announces `aria-busy`. Logged as
   GAPS-C.md SRC-1.

   THE FILL IS `--surface-lift`, NOT `--surface-raised` — CORRECTED 21 SEP
   2026, CLIENT RULING, VERBATIM: "the search on toolbar needs to have
   backhogunrd color" (a toolbar search box painting no visible fill on the
   tickets module's `Card variant="plain"` ground, CHANGELOG v1.2.146).

   `--surface-raised` IS `var(--card)`, a FIXED address — correct paper for a
   pill that always stands on soft paper, wrong for one a caller can drop
   anywhere. `--card` and `--background` are the SAME colour in light
   (tokens.css §4's own note on `--surface-lift`: "an element that paints
   `bg-card` … has NO boundary at all whenever what it stands on is any of
   those four papers"), so a search pill inside a `plain` `Card` — no fill of
   its own, the page's own white showing through — painted the identical
   colour it sat on. 1.000. Invisible, for the same arithmetic reason the
   `--surface-lift` token exists at all: `Alert` inside a `Sheet`,
   `StatusStepper`'s pill, the book's own shadow swatch, and now this field.

   `--surface-lift` IS THE KIT'S OWN NAME FOR "A RAISED THING, RELATIVE TO ITS
   GROUND" (tokens.css §4) — the identical mechanism `--btn-secondary-fill`
   already gives a `secondary` `Button`, which is why `FilterBar` and
   `SortControl` (the two controls the client compared this field against,
   "the Filter and Sort buttons beside it do carry a fill") never went
   invisible on the same ground: both paint `bg-[var(--btn-secondary-fill)]`,
   the relational token, never the fixed one. `--surface-lift`'s OWN root
   default is `var(--card)` — byte-identical to `--surface-raised` wherever
   nothing rebinds it — so every existing caller of this field, on every
   ground it already stood on correctly, renders the same pixel it did
   before. It only starts differing exactly where the bug was: inside a
   `.bg-background` / `.bg-card` / `[data-ground="page"]` region (tokens.css
   §8 rebinds it to `--surface-panel`) or a `.bg-surface-panel`
   region (rebound to `--surface-raised`, i.e. unchanged). No prop, no
   variant, no call-site change — the toolbar's `SearchInput` already IS this
   component, so it takes the fix for free the moment the kit is pulled. The
   named class (`bg-surface-lift`) is used rather than the arbitrary
   `bg-[var(--surface-lift)]` form for the reason tokens.css states beside
   `--color-surface-lift`: an arbitrary value paints the colour but matches
   none of §8's ground selectors, so nothing downstream of it would rebind
   either — the same freeze the toolbar row's own header comment warns about
   by name.

   RENDERING CONTEXT
   `"use client"`. The clear control needs to know whether there is anything to
   clear, which is state, and clearing an uncontrolled field touches the DOM
   node through a ref.
   ========================================================================= */

"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";
import {
  CircleNotch,
  MagnifyingGlass,
  X,
} from "../../foundations/icons";

const searchShellVariants = cva(
  [
    "flex w-full min-w-0 items-center",
    // 44 tall · 18 inline padding (`--space-4h`, CH09 `padding: 0 18px`) · full
    // pill · 10 between the parts. FLD-B2.
    "h-[var(--control-height-input)] px-[var(--space-4h)] gap-[var(--space-2h)] rounded-pill",
    // Raised paper and NOTHING ELSE. No hairline — chapter 9's one borderless
    // field — and, since SRC-B1, no elevation either.
    //
    // SRC-B1 — the rest shadow is gone. CH09 draws the search pill as
    // `display: flex; align-items: center; gap: 10px; height: 44px;
    // border-radius: 999px; background: var(--card); padding: 0 18px` and
    // stops; CH16 and CH19 draw the same pill and add only an inset hairline.
    // No drawing of this shape in the artifact carries an elevation. It also
    // put the field on the wrong side of CH19's "nothing else in the system
    // may float" — the floating layer has exactly two tenants and a search
    // box is not one of them. The paper tone against its ground is the whole
    // treatment, which is what "borderless raised pill" already said.
    //
    // `bg-surface-lift`, NOT `bg-[var(--surface-raised)]` — CORRECTED 21 SEP
    // 2026. See the header note above ("THE FILL IS `--surface-lift`") for
    // the full argument; in one line, `--surface-raised` is a fixed address
    // that reads as the identical colour to `--background` on a `plain`
    // ground, and `--surface-lift` is the kit's own relational token for
    // exactly that failure, already spent by `Alert`, `StatusStepper` and
    // the book's shadow swatch.
    "bg-surface-lift",
    "transition-[background-color,box-shadow,color]",
    "duration-[var(--duration-colour)] ease-kwapso",
  ],
  {
    variants: {
      /** Mutually exclusive. Resolved once, in JS, below. */
      state: {
        default: "text-foreground",
        /**
         * A fill and an ink, and the elevation goes: paper that cannot be
         * used does not sit above the page.
         */
        disabled: "bg-hair-faint text-ink-disabled shadow-none cursor-not-allowed",
        /**
         * A search box the reader may not edit. There is no border to take
         * away — chapter 9's read-only rule removes one this field never had —
         * so the faint fill carries the state on its own and the elevation
         * goes with it.
         */
        readOnly: "bg-hair-faint text-foreground shadow-none",
      },
    },
    defaultVariants: {
      state: "default",
    },
  },
);

export interface SearchInputProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "type" | "size"> {
  /**
   * The accessible name. A search pill usually carries no visible label, so
   * one is defaulted rather than left to the call site to remember. Ignored
   * when the call site passes `aria-label` or `aria-labelledby` itself.
   */
  label?: string;
  /**
   * The key the application binds to focus this box, drawn as the kit's chip
   * — "⌘K" in the specimen. No default: the chip is a promise about a
   * keyboard shortcut, and a component cannot know whether the app kept it.
   */
  shortcut?: React.ReactNode;
  /**
   * Called when the reader empties the box with the clear control. The
   * control appears only when this is given AND there is something to clear;
   * an application that does not need to react to a clear does not get a
   * button that silently does nothing.
   */
  onClear?: () => void;
  /** The clear control's accessible name. Translatable. */
  clearLabel?: string;
  /**
   * A query is in flight. The glyph becomes a spinner and `aria-busy` is
   * announced; the field STAYS editable — see the header note.
   */
  loading?: boolean;
  /**
   * Draw the leading glyph — the magnifying glass at rest, the spinner while
   * `loading`. Defaults to `true`, which is this field's original, only
   * drawing: every existing caller keeps it.
   *
   * `false` FOR THE ONE CALLER WITH A SECOND SEARCH GLYPH ALREADY BESIDE IT.
   * Client ruling, on the new-tab page: "there is the search icon on the
   * right and on the left. Remove the one on the left inside the text bar,
   * the white one." A page that draws its OWN leading mark next to this
   * field (a hero search with a button-side glyph, say) ends up with two —
   * this field's own tertiary-ink glass, always drawn, and the caller's.
   * Named for what it removes, not for the one call site that needs it:
   * `kwapso_system`'s new-tab screen used a blunt `[&>svg:first-child]:
   * hidden` class override before this prop existed, which hides whichever
   * child happens to render first — silently wrong the day `loading` makes
   * that first child the spinner instead of the glass. This prop asks for
   * the removal directly, and covers both glyphs by construction: with
   * `false`, NEITHER the glass nor the spinner renders, ever, so a loading
   * search with no leading icon reads as a search with no leading icon —
   * not as a hidden spinner still telling `aria-busy` it is there. Nothing
   * else about the field changes: the shell's own `px-[var(--space-4h)]`
   * padding and the gap before the input are unconditional, so the input
   * simply starts where the glyph would have stood.
   */
  leadingIcon?: boolean;
}

/**
 * The system's search field.
 *
 * TEN STATES
 *  1. default        — raised pill, no elevation, glyph in tertiary ink.
 *  2. hover          — does not apply. The kit draws none on `.kw-search`, and
 *                      there is no border to shift: the hover a bordered field
 *                      shows is a border colour, and this field has no border.
 *                      Deepening the shadow would be an elevation change, which
 *                      the kit reserves for the three lifting surfaces.
 *  3. focus-visible  — NOT here. tokens.css §8 rings the focusable node, which
 *                      is the bare input inside the pill.
 *  4. active/pressed — does not apply. A text field is not pressed; the
 *                      equivalent moment is focus, which is state 3. The clear
 *                      control is a Button-shaped thing and takes the row wash.
 *  5. disabled       — `--hair-faint` fill, `--ink-disabled` ink, no shadow,
 *                      clear control withdrawn.
 *  6. loading        — `loading`: the glyph becomes the spinner and `aria-busy`
 *                      is set. Editable throughout, unlike `input` — the
 *                      header says why.
 *  7. empty          — the placeholder in tertiary ink and no clear control.
 *                      A search box with nothing in it is the resting state,
 *                      not a hole to fill with a message.
 *  8. error          — does not apply. A query cannot be invalid; there is
 *                      nothing to validate. A search that FAILED is a state of
 *                      the result list, and a search that matched nothing is
 *                      the empty register, which belongs to the collection
 *                      that shows the results.
 *  9. selected       — does not apply. Text selection inside the field is the
 *                      platform's, and the kit does not restyle it.
 * 10. read-only      — `readOnly`: faint fill, no elevation, clear withdrawn.
 *                      The native attribute passes straight through.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. `w-full` and 44 tall at every width,
 *  which is already the touch row. Where a header collapses its search into an
 *  icon on a phone, that is the header's decision and not this field's.
 *
 * RTL — safe. The glyph leads and the chip trails because of DOM order inside
 * a flex row, not because a side is named, so both swap in Arabic, Urdu and
 * Persian. `px-*` is padding-inline.
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      label = "Search",
      shortcut,
      onClear,
      clearLabel = "Clear",
      loading = false,
      leadingIcon = true,
      disabled = false,
      readOnly = false,
      value,
      defaultValue,
      onChange,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
      },
      [ref],
    );

    // Uncontrolled fields still need to know whether the clear control has
    // anything to do, so the emptiness — and only the emptiness — is tracked.
    const [dirty, setDirty] = React.useState(() => String(defaultValue ?? "").length > 0);
    const controlled = value !== undefined;
    const filled = controlled ? String(value).length > 0 : dirty;

    const state = disabled ? "disabled" : readOnly ? "readOnly" : "default";
    const showClear = Boolean(onClear) && filled && !disabled && !readOnly;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setDirty(event.currentTarget.value.length > 0);
      onChange?.(event);
    };

    const handleClear = () => {
      if (!controlled && innerRef.current) innerRef.current.value = "";
      setDirty(false);
      onClear?.();
      innerRef.current?.focus();
    };

    return (
      <div
        data-slot="search-input"
        data-state={state}
        /* Review 1A · fix 4: "the focus indicator must match the shape of the
           control it sits on ... focus shape always follows the control's own
           shape." The focusable node here is the bare inner input, which has
           no box and no radius, so the ring used to draw a RECTANGLE inside
           this pill. The shell takes the ring instead (tokens.css §8) — the
           same 1px at the same 0 offset, on the shape the reader sees. */
        data-focus-shell=""
        data-readonly={readOnly ? "true" : undefined}
        className={cn(searchShellVariants({ state }), className)}
      >
        {leadingIcon ? (
          loading ? (
            // `.motion-spinner` is motion.css's one rotation: the kit-stated
            // 700ms turn on the linear curve, kept running under reduced
            // motion because a frozen spinner is the absence of the only
            // signal that work is still open.
            <CircleNotch
              size={16}
              aria-hidden="true"
              className="motion-spinner text-ink-tertiary"
            />
          ) : (
            <MagnifyingGlass size={16} aria-hidden="true" className="text-ink-tertiary" />
          )
        ) : null}

        <input
          ref={setRefs}
          type="search"
          data-slot="search-input-control"
          /* Hands its ring to the shell above. See tokens.css §8. */
          data-focus-proxy=""
          disabled={disabled}
          readOnly={readOnly}
          /* Review 1A · fix 5 — a read-only search box is not a focus target. */
          tabIndex={readOnly ? -1 : undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? label)}
          aria-labelledby={ariaLabelledBy}
          aria-busy={loading || undefined}
          className={cn(
            "h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0",
            // 14/300 — the control step, as every field value.
            "text-sm font-[var(--font-weight-light)] text-inherit",
            "placeholder:text-muted-foreground",
            // The platform's own clear cross would sit beside ours and take a
            // shape the kit does not draw. Hidden, not the outline.
            "[&::-webkit-search-cancel-button]:appearance-none",
            "[&::-webkit-search-decoration]:appearance-none",
            disabled && "cursor-not-allowed",
          )}
          {...props}
        />

        {showClear ? (
          <button
            type="button"
            data-slot="search-input-clear"
            onClick={handleClear}
            aria-label={clearLabel}
            className={cn(
              // The dense square, at the pill radius, on the neutral row wash.
              "grid size-[var(--control-height-dense)] shrink-0 place-content-center",
              "cursor-pointer rounded-pill border-0 bg-transparent text-ink-secondary",
              "hover:bg-accent hover:text-foreground",
              "transition-colors duration-[var(--duration-colour)] ease-kwapso",
            )}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}

        {shortcut !== undefined && shortcut !== null ? (
          <span
            data-slot="search-input-shortcut"
            aria-hidden="true"
            className={cn(
              "shrink-0 rounded-pill bg-hair-faint px-2 py-1",
              "text-badge font-[var(--font-weight-medium)] text-ink-tertiary",
            )}
          >
            {shortcut}
          </span>
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";

export { SearchInput, searchShellVariants };
