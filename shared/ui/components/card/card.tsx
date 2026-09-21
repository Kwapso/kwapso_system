/* ============================================================================
   Card — the boxed block everything else is dropped into (8 direct call sites).

   DESIGN SOURCE
   design-mothership/specimens/kwapso-ui.css → `.kw-card`, `.kw-card--raised`,
   `.kw-card--brand`, `.kw-card--inverse`, `.kw-card--hairline`.
   The anatomy — header / body / footer inside ONE shell — is kit chapter 13
   ("Cards & containers"), which the specimen set never transcribed, so it was
   read out of the kit itself. Chapter 13's own subtitle is the whole brief:

       "Colour separates, strokes don't"

   and its first specimen caption states the anatomy verbatim:

       "Header, body, and footer are hairline-separated inside one 24px shell
        — never three stacked cards."

   The well is chapter 13's last specimen, and its caption is also transcribed:

       "A well holds secondary detail inside a card — a quoted message, a
        system value, a diff. Same radius, no edge, no shadow."

   THE LAW THIS FILE OBEYS
   · A card is a box, so its radius is `--radius` (24). There is no fifth
     radius, and the named middle step of Tailwind's own ladder (the one
     between `md` and `xl`) is re-pointed at 24 too, so it is never reached
     for meaning "slightly rounded".

     THAT STEP IS DESCRIBED HERE RATHER THAN SPELLED, and so are the two
     below in `tokens.css`, because Tailwind scans this comment. It scans
     every file it is pointed at, source and prose alike, and it cannot tell
     an explanation from an intention — so writing the class in order to say
     it is forbidden COMPILED it into every consuming app's stylesheet, where
     it was the only thing in the whole build asking for a third box radius.
     See CHANGELOG v1.2.4/v1.2.5: the same bug, in markdown, produced a rule
     that was not even valid CSS.
   · Blocks are separated by COLOUR, not by strokes. The one blessed hairline
     is same-tone separation, which is exactly what the header and footer
     rules inside a single shell are — one shell, two hairlines, never three
     stacked cards.
   · A raised card is `--card` over `--surface-panel`: off-beige on soft
     paper. Both are real paper tones; neither is white.
   · Hover, where a card is a target, is `--accent` — the neutral row/item
     wash. Never mango, never an opacity. A card that is a LINK may also gain
     `--shadow-lifted`, which motion.css §13 grants to exactly three things.
   · SELECTED is `--surface-selected`, and it is the SAME wash `TableRow`,
     `List` and `map`'s list row take (override 44, which re-homed override
     40's `--surface-panel`). The system holds one answer for
     a chosen record and this is it. A selected card does not also hover: it
     is already the marked one.
   · Focus is ONE global rule (tokens.css §8). A card that is a link still
     takes the ring, so nothing here clips it: the shell sets no
     `overflow: hidden` (the header and footer rules are inset shadows, not fills,
     so there is nothing to clip at the corner).
   · A SIXTH VARIANT, `plain`, ADDED 21 SEP 2026: THE CLIENT'S RULING,
     VERBATIM: "only the containers like the ones around assigned to,
     related stories, etc" go, chips, tabs and the rest stay. A record
     page's grouping sections (Assigned to, Stakeholders, Related tickets,
     Related stories, Effort, Detail, Acceptance criteria, Build notes)
     drop their box and sit directly on the page's own white main content;
     everything else keeps its paper. `plain` paints no fill, no shadow and
     no stroke, and its header, content and footer parts drop their
     horizontal inset so the section's text lines up with the page column
     (see each part's own comment). It exists for a scoped experiment in
     the tickets module's record page first, not yet a system-wide
     replacement for `default`. See CHANGELOG v1.2.145.

   RENDERING CONTEXT
   No `"use client"`. Every part forwards props and a ref and nothing else.
   ========================================================================= */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/* ----------------------------------------------------------------------------
   Interactive skin — composed in JS rather than written as a `hover:` utility
   inside the cva, because the wash is wrong on the two COLOURED variants: a
   mango or a charcoal card washed with 5% charcoal reads as dirt, not as a
   hover. Two skins, picked by variant, exactly as `button.tsx` picks between
   its two disabled skins.

   `motion-hover-lift` is motion.css's own class. It transitions the fill and
   the shadow and adds `--shadow-lifted` on hover, gated behind
   `(hover: hover) and (pointer: fine)` so a tapped card on a phone does not
   stay looking lifted. No duration and no curve is written here.
   ------------------------------------------------------------------------- */
const INTERACTIVE_NEUTRAL = "cursor-pointer motion-hover-lift hover:bg-accent";
const INTERACTIVE_COLOURED = "cursor-pointer motion-hover-lift";

/* ----------------------------------------------------------------------------
   OVERRIDE 40 (2026-08-23) — THE SELECTED WASH.

   Ruling N7-1 kept K1 (the collection panel keeps the card's paper) and
   attached a job to it: the build held THREE answers for a chosen record —
   nothing at all on `Card`, `--surface-panel` on `TableRow` and `List`, and a
   CHARCOAL row in `map`. They are one now, and this is the one:
   `--surface-panel`, the kit's second paper tone, the same string
   `table.tsx`'s `ROW_SELECTED` and `list.tsx`'s `ROW_SELECTED` already hold.

   It cannot be `--accent`: that is the hover wash, and a selected card that
   looks exactly like a hovered one tells the reader nothing. It is not a ring
   either — the ring is N2's question and it is 1px `--hairline-ink`
   (override 33), a separate mark that may be true at the same time.

   THE LIMIT THIS BLOCK USED TO STATE IS CLOSED, OVERRIDE 44 (2026-08-23).
   It read: "the `default` variant is ALREADY `--surface-panel`, so `selected`
   paints nothing on it … a grid of pickable cards is `raised`." That was true
   while the wash WAS the panel tone. `--surface-selected` is a paper neither
   variant is ever painted, so a selection is now visible on BOTH: measured
   1.107 on a `default` card and 1.221 on a `raised` one in light, 1.252 and
   1.127 in dark. `raised` is still the right variant for a pickable grid —
   `OnboardingOptionGroup` and the flowchart's node keep it — but it is a
   preference now and no longer a requirement.
   ------------------------------------------------------------------------- */
/* OVERRIDE 44 (2026-08-23) — the selected paper is its own token now.
   Override 40 pointed this at `--surface-panel`. The K1 reversal then moved
   the papers underneath it: a row now sits INSIDE a soft-paper panel, so the
   "selected" wash painted the row the paper it was already standing on and
   measured 1.000. `--surface-selected` is the paper one rung further from the
   page than the panel -- #EFE6DD in light, --kw-unlit-quiet in dark. Still
   ONE answer for a chosen record: `TableRow`, `List`, `map`'s list row and
   `Card` all take this exact string. */
/* OVERRIDE 77 (2026-08-27, the client's D15-B) — override 44 is OVERTURNED:
   the selected paper is the lift the artifact drew. The string below is
   unchanged on purpose (one answer for a chosen record survives), but
   `--surface-selected` now points at `--surface-raised` — which is `--card`,
   the `raised` variant's OWN fill. So row 40's limit returns inverted:
   a selection is visible on a `default` card (1.103 light / 1.111 dark)
   and PAINTS NOTHING on a `raised` one — 1.000 in BOTH palettes. A pickable
   grid must be `default` now, the exact opposite of what override 44's
   note below concluded. Chosen from the drawing; register row 77 carries
   the full per-context table. */
const CARD_SELECTED = "bg-surface-selected";

/** Variants whose fill is an accent, so the neutral hover wash must not land. */
const COLOURED_VARIANTS = new Set(["brand", "inverse"]);

const cardVariants = cva(
  [
    // A card is a column: header, body, footer, in that order.
    "flex flex-col",
    // The box radius. The only radius a card has.
    "rounded-[var(--radius)]",
    // Ink comes from the surface; the two coloured variants override it below.
    "text-card-foreground",
    // A card holds tables, long words and truncating rows. Without this a
    // single unbreakable string makes the whole card wider than its column.
    "min-w-0",
    // The named group `CardHeader`/`CardContent`/`CardFooter` key their own
    // `plain` overrides off, below. Unconditional: cheap on the five
    // variants that never read it, and the only way a part can detect its
    // own shell without a prop every call site would have to repeat.
    "group/card",
  ],
  {
    variants: {
      variant: {
        /**
         * `.kw-card` — soft paper. The default because it is the tone that is
         * VISIBLE on the page: `--background` and `--card` are both off-beige,
         * so a `--card` box on the page draws nothing at all.
         *
         * `--badge-quiet-fill` REBOUND, 19 SEP 2026 — CLIENT RULING, VERBATIM:
         * "chips and pills always must have the background card or shape
         * wherever they are." Her own example is this exact card: the ticket
         * page's Related-stories row, a `default` Card, where the STATUS chip
         * drew no visible fill because nothing rebound `--badge-quiet-fill`
         * here and the ambient value inherited from whatever ancestor last
         * set it (often `screen-shell.tsx`'s own `BODY`, itself soft paper)
         * happened to equal THIS card's own soft-paper ground — a `Badge`
         * painting the identical colour it sits on, 1.000, no card at all.
         * Off-beige — `--surface-raised`, the OTHER paper tone from this
         * card's own soft paper, the same alternation `--btn-secondary-fill`
         * already draws for a control inside this same card (tokens.css §8's
         * `.bg-surface-panel` rule) — breaks the inheritance chain at the
         * exact level a nested card is mounted at, so a Badge is guaranteed
         * its own card the moment it lands inside one,
         * regardless of what any ancestor already rebound. See
         * CHANGELOG v1.2.132.
         */
        default: "bg-surface-panel [--badge-quiet-fill:var(--surface-raised)]",
        /**
         * `.kw-card--raised` — off-beige over soft paper, plus `--shadow-rest`
         * (`shadow-sm` is re-pointed at it in the tokens bridge). This is the
         * "raised card" the binding law names, and it only reads as raised
         * when it sits inside a `--surface-panel` band.
         *
         * `--badge-quiet-fill` REBOUND, 19 SEP 2026 — same ruling as
         * `default`, above. Soft paper — `--surface-panel`, the OTHER paper
         * tone from this card's own off-beige — is the identical value
         * `screen-shell.tsx`'s `CARD`/`BODY` and `collection-frame.tsx`
         * already spend for a Badge standing on THIS exact tone; reused
         * rather than re-picked so a status chip reads one rung of contrast
         * everywhere the kit paints off-beige, card or shell alike.
         */
        raised: "bg-card shadow-sm [--badge-quiet-fill:var(--surface-panel)]",
        /**
         * `.kw-card--brand` — mango, CHARCOAL ink. One per view.
         *
         * `--badge-quiet-fill` REBOUND, 19 SEP 2026 — same ruling. Off-beige,
         * not a paper alternation this time: mango has no "other paper tone"
         * of its own, so this reuses the rail's own answer to the identical
         * question — `[data-spine="mango"]`'s `--spine-chip-fill: var(--kw-
         * off-beige)` (tokens.css §7b), "the rail (mango) → its own pill
         * tone". One brand ground, one chip tone, wherever it is painted.
         * `--surface-brand-chip` is the role token tokens.css now carries for
         * this exact value (added alongside this fix, next to `--surface-
         * brand` — the palette law forbids a component reaching past it for
         * the raw `--kw-off-beige` directly).
         */
        brand: "bg-surface-brand text-ink-on-accent [--badge-quiet-fill:var(--surface-brand-chip)]",
        /** `.kw-card--inverse` — charcoal, off-beige ink. Chapter 13's own
         *  instruction: "Use charcoal for the last block on a page — a sum, a
         *  decision, a next step."
         *
         * `--badge-quiet-fill` REBOUND, 19 SEP 2026 — same ruling.
         * `--surface-record-footer-well` (`--kw-unlit-secondary`, ONE value
         * in both palettes — see tokens.css §3) is the kit's own already-
         * measured answer for a chip-sized fill on an inverse/charcoal
         * ground: `record-detail.tsx`'s ink footer rebinds `--card` /
         * `--surface-raised` / `--background` to the exact same token for
         * the exact same reason, "the well under a mark, a pill or a field".
         * Reused rather than re-picked, so an inverse Card and the record
         * footer's own inverse band agree on what a chip looks like there.
         */
        inverse: "bg-surface-inverse text-ink-on-inverse [--badge-quiet-fill:var(--surface-record-footer-well)]",
        /**
         * Chapter 13's "Well" — secondary detail nested INSIDE a card. Same
         * radius, no edge, no shadow. Added, not required; commission §2
         * rule 3 permits additions and the kit draws it. The drawn fill is a
         * 4.5% charcoal wash and `--accent` is the palette's 5% wash; the
         * gap is logged rather than a new token invented (GAPS-F CRD-4).
         *
         * NO `--badge-quiet-fill` REBIND HERE, DELIBERATELY. A well is a wash
         * OVER its parent card's own paper, not a paper of its own — chapter
         * 13 draws it nested inside a card that has already answered this
         * question for itself (the `default`/`raised`/`brand`/`inverse`
         * rebind above it in the tree), and a second rebind here would only
         * ever repeat or fight that one. A Badge inside a well reads the
         * enclosing card's own value, which is what a well being "the same
         * radius, no edge, no shadow" as its card already promises.
         */
        well: "bg-accent",
        /**
         * `plain`: no box at all. CLIENT RULING, 21 SEP 2026, VERBATIM:
         * "only the containers like the ones around assigned to, related
         * stories, etc" go, chips, tabs and the rest stay. A record page's
         * grouping sections sit directly on the page's own white main
         * content: no fill, no shadow, no stroke. Ink is still
         * `text-card-foreground`, from the base class list above, because a
         * plain card still holds a heading and body text that need an ink
         * to read against even with no paper of its own.
         *
         * `--badge-quiet-fill` is left at `default`'s own value
         * (`--surface-raised`), not re-bound: a `plain` card paints no
         * paper of its own, so a Badge inside one sits on the PAGE's own
         * ground, which is exactly the ground `default`'s rebind already
         * answers for.
         *
         * Scoped to a single experiment in the tickets module's record
         * page first (GAPS: not yet a system-wide replacement for
         * `default`). See CHANGELOG v1.2.145.
         */
        plain: "bg-transparent [--badge-quiet-fill:var(--surface-raised)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface CardProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof cardVariants> {
  /**
   * `.kw-card--hairline` — the same-tone separation case, and the only reason
   * a card may carry a stroke at all. Off by default: the kit separates
   * blocks with colour and reaches for the hairline only when two cards of
   * the SAME tone sit against each other.
   */
  hairline?: boolean;
  /**
   * The card is a target — a link, a row, a draggable. Adds the neutral
   * `--accent` wash and motion.css's `motion-hover-lift`. It does NOT make
   * the card focusable or clickable: the call site still wraps it in an `a`
   * or a `button`, or passes `role` and `tabIndex`, and tokens.css §8 rings
   * whatever ends up focusable.
   */
  interactive?: boolean;
  /**
   * This card's record is the chosen one. Takes `--surface-panel` — the same
   * wash a selected `TableRow`, `List` row and `map` list row take
   * (override 40) — and suppresses the interactive hover, because a selected
   * card is already the marked one.
   *
   * Only visible on a card that sits on card paper: see the note above
   * `CARD_SELECTED`. Emits `data-selected="true"`. `aria-selected` is the
   * CALL SITE's, because only it knows whether the card is an option in a
   * listbox, a row in a grid, or neither.
   */
  selected?: boolean;
}

/**
 * The boxed block.
 *
 * TEN STATES
 *  1. default        — variant fill at radius 24, no stroke. Five of the
 *                      six variants paint a fill; `plain` (21 Sep 2026,
 *                      the client's ruling) paints none at all, so the
 *                      page's own paper shows through, see that
 *                      variant's own comment above.
 *  2. hover          — only with `interactive`: `--accent` on the three
 *                      neutral variants, elevation on all five. A named
 *                      token and a named shadow; never an opacity, never
 *                      mango. A card that is not a target has no hover,
 *                      deliberately — a whole page of reacting boxes is
 *                      noise.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once,
 *                      at the control's own radius. The shell sets no
 *                      `overflow: hidden`, so a card that IS a link shows its
 *                      ring in full instead of having the corners shaved off.
 *  4. active/pressed — does not apply. The press belongs to the control
 *                      inside the card, or to the link wrapping it; a card
 *                      that nudged under the pointer would fight the button
 *                      inside it that is already nudging.
 *  5. disabled       — does not apply. A card is a surface. An unavailable
 *                      record disables its own controls and keeps its paper;
 *                      dimming the paper would be an opacity, which is a
 *                      rejection.
 *  6. loading        — does not apply here. A card whose CONTENT has not
 *                      arrived keeps its shell and fills it with `Skeleton`,
 *                      which is that component's whole job. The shell must
 *                      not disappear, or the page reflows when data lands.
 *  7. empty          — a card with no children still renders: it is a
 *                      deliberate placeholder shape and the composition
 *                      decides whether to mount it. This is the one place the
 *                      system does NOT prefer nothing, and the reason is
 *                      layout stability in a grid of cards.
 *  8. error          — does not apply. A card does not report; an `Alert`
 *                      inside it does, and a destructive card is not drawn by
 *                      the kit (GAPS-F CRD-3).
 *  9. selected       — `--surface-selected`, the one selected-record wash in
 *                      the system (override 44). The kit draws no selected
 *                      card of its own — that was GAPS-F CRD-3 — so this is
 *                      the ruled answer carried over from the row, not a
 *                      fifth invention. Suppresses the hover wash.
 * 10. read-only      — always. A card holds no value of its own.
 *
 * THREE BREAKPOINTS — and here the answer is NOT "unchanged".
 *  The kit states a RANGE for the card inset rather than one figure
 *  (chapter 5: "24–32px card inset"), which is the only place in the system
 *  where a component's own geometry is given two values. It is read as a
 *  width response, because that is the only thing that varies between the
 *  two figures in every drawing that uses them:
 *    · mobile  — inset 24 (`--space-6`). 32 on a 320 viewport spends a fifth
 *                of the width on air.
 *    · tablet  — inset 24. Unchanged; the kit changes nothing at `sm`.
 *    · desktop — inset 32 (`--space-7`) from `lg:` (64rem), on the header,
 *                the body and the footer alike, so the three parts stay in
 *                register.
 *  The SHELL itself is width-agnostic: no max-width, no min-width, no
 *  stacking. A card fills the grid cell it is given, and the grid is the
 *  composition's. Derivation logged as GAPS-F CRD-2.
 *
 * RTL — safe. Every inset is logical (`px-*` is padding-inline), the two
 * rules are on the block axis, which does not mirror, and nothing here names
 * an inline side.
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      hairline = false,
      interactive = false,
      selected = false,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="card"
      data-variant={variant ?? "default"}
      data-selected={selected ? "true" : undefined}
      className={cn(
        cardVariants({ variant }),
        hairline && "shadow-[var(--hairline)]",
        /* Precedence, written down rather than left to emission order
           (PATTERN §4): selected > hover. A selected card is the loudest one
           on the screen already. */
        interactive &&
          !selected &&
          (COLOURED_VARIANTS.has(variant as string)
            ? INTERACTIVE_COLOURED
            : INTERACTIVE_NEUTRAL),
        interactive && selected && "cursor-pointer",
        selected && CARD_SELECTED,
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

/* ----------------------------------------------------------------------------
   The three insets.

   Chapter 13 draws the header at 20/22/16 and the footer at 14/22/18 — none
   of those five figures is on the kwapso spacing ladder, and chapter 5 states
   the card inset as 24–32. So the drawn asymmetry is KEPT (a header is
   tighter under its rule than over it) and each figure is snapped to the
   nearest ladder step: 24 on the outer edges, 20 (`--space-5`) against the
   hairline. Logged as GAPS-F CRD-1.

   `p-6` is 1.5rem because tokens.css sets `--spacing: 0.25rem`; above 32 the
   kwapso and Tailwind ladders diverge, so the desktop step is written as the
   token.
   ------------------------------------------------------------------------- */

/**
 * The header band. Carries the hairline that separates it from the body —
 * chapter 13's "header, body, and footer are hairline-separated inside one
 * shell". `--hairline-under` is the blessed same-tone hairline, at 8%,
 * not at the heavier `--hair-strong` that `Title` uses for a SECTION rule.
 *
 * ON A `plain` SHELL (21 Sep 2026 ruling, see `Card`'s own comment): the
 * horizontal inset drops to 0 at every breakpoint, so the title lines up
 * with the page column instead of the card's own edge, and the bottom
 * gap to whatever follows tightens to the page mock's own 12px
 * (`--space-3`) instead of this band's usual 20. No hairline either: a
 * plain section has no box to separate FROM. Detected off the shell's own
 * `group/card` marker (`Card`'s own comment) via `group-data-*`, not a
 * prop this part would need repeating at every call site.
 *
 * TEN STATES — none apply. It is a band; its children carry their own.
 * THREE BREAKPOINTS — inset 24 to `lg:`, 32 above. See `Card`.
 * RTL — safe. `px-*` is padding-inline; the hairline is on the block axis.
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-[var(--space-1h)]",
        "px-6 pt-6 pb-5",
        "lg:px-[var(--space-7)] lg:pt-[var(--space-7)]",
        // `plain`: horizontal inset gone at every breakpoint, and the
        // bottom gap to the content below tightens to the page mock's
        // 12px seam.
        "group-data-[variant=plain]/card:px-0 group-data-[variant=plain]/card:pb-[var(--space-3)]",
        "lg:group-data-[variant=plain]/card:px-0",
        /* Same-tone card separation — ch02's carve-out. The artifact draws it
           as `inset 0 -1px 0 var(--hair)`, never a `border` (review 1A · fix
           2); `--hairline-under` is that string, named.

           ONLY WHEN SOMETHING FOLLOWS IT, which is what this rule has always
           been FOR. This component's own sentence above says it "carries the
           hairline that separates it from the BODY", and chapter 13's caption
           — transcribed at the top of this file — is "header, body, and
           footer are hairline-separated inside one 24px shell", which the
           file's own law restates as "one shell, TWO hairlines". Every one of
           those sentences presumes a region on the other side of the line.

           It drew unconditionally, so a header-only card — a shape this kit
           DEMONSTRATES, in four of the seven card specimens in its own demo —
           put a rule along the bottom of the card with nothing beneath it to
           separate from. Measured by a consuming app on real data: where a
           row of cards stretches to its tallest member and a title wraps to
           two lines, the header becomes the full height of the card and the
           hairline lands 0px from the card's own bottom edge — exactly
           coincident with the shell, reading as a second border in a slightly
           lighter tone.

           `:not(:last-child)` is the whole fix: no prop, no value, no colour,
           no spacing, and no caller changes. A header followed by a body OR a
           footer still draws it, because in both cases there is something to
           separate from.

           ON A `plain` SHELL, NEVER: a plain section has no box, so there is
           nothing to separate its own title from even when something
           follows it. The override below matches this rule's own selector
           shape (`group-data-[variant=plain]/card:` stacked with the same
           `[&:not(:last-child)]` the base rule uses) so the two carry equal
           specificity and the later one in source wins, the same guarantee
           an ordinary `hover:` override relies on. */
        "[&:not(:last-child)]:shadow-[var(--hairline-under)]",
        "group-data-[variant=plain]/card:[&:not(:last-child)]:shadow-none",
        className,
      )}
      {...props}
    />
  ),
);

CardHeader.displayName = "CardHeader";

/**
 * The card's headline. Chapter 13 draws it at 18/500 — `text-lg` is the 18
 * step and carries its own leading and tracking, and the weight is lifted to
 * Saans Medium.
 *
 * This is a deliberate departure from the shadcn shape being replaced, whose
 * `CardTitle` is 24/600. 24 is `Title`'s size in this system — a section
 * heading — and using it inside a card made every card look like a page.
 * Logged as GAPS-F CRD-5.
 *
 * Renders a `div` rather than an `h3`, as the shape it replaces does, because
 * a card's heading level depends on the page it lands in. Pass `role` and
 * `aria-level`, or wrap, where the outline matters.
 *
 * TEN STATES — none apply; it is a heading.
 * THREE BREAKPOINTS — UNCHANGED. The kit states one card title size, and a
 * heading that shrank on mobile would break its relationship with the body
 * copy beside it, which does not shrink.
 * RTL — safe. No inset, no direction.
 */
const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-title"
      className={cn("text-lg font-[var(--font-weight-medium)]", className)}
      {...props}
    />
  ),
);

CardTitle.displayName = "CardTitle";

/**
 * The line under the title. Chapter 13's media card draws it at 13/300 in
 * secondary ink — the caption step, which `text-caption` sets whole.
 *
 * TEN STATES — none apply; it is prose.
 * THREE BREAKPOINTS — UNCHANGED. It reflows; it does not restep.
 * RTL — safe.
 */
const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-description"
      className={cn("text-caption text-ink-secondary", className)}
      {...props}
    />
  ),
);

CardDescription.displayName = "CardDescription";

/* ----------------------------------------------------------------------------
   THE HORIZONTAL INSET, PULLED OUT AND NAMED, 17 SEP 2026 EVENING — RULING 2,
   CORRECTED. The client, on the live product: "the margin on the sides
   should be the same as the margin you now have on top of the toolbar."

   MEASURED ON STAGING (`getComputedStyle`, not guessed): a toolbar-led
   collection card's own `CardContent` reads `padding-top: 13.5px` there —
   NOT this file's own `p-6 lg:p-[var(--space-7)]` (which would print 24/36
   at that app's root); the app's `web/app/globals.css` (R83) overrides just
   the top with `calc(var(--toolbar-lead-gap) - var(--tab-content-gap))` =
   `calc(2rem - 1.25rem)` = `0.75rem`, confirmed by reading BOTH custom
   properties and the resolved `padding-top` in the same pass. `0.75rem` IS
   this kit's own `--space-3` — not a coincidence the app invented, R83's own
   header derives `--toolbar-lead-gap` (`--space-7`) as "the nearest step ON
   THE scale" to begin with, so the remainder was always going to land back
   on a step of the SAME scale. The app's `padding-top` override cannot be
   read from here (it lives in `web/app/globals.css`, outside this repo, and
   a kit file may not couple itself to an app-only custom property name —
   see `screen-shell.tsx`'s own `DENSITY_BODY` for where that boundary is
   drawn) — but the NUMBER it lands on is already a token this kit owns, so
   the kit's OWN horizontal inset can read that token directly, by name,
   with no dependency on the app's CSS at all.

   ONE TOKEN, TWO SEAMS, SO SIDES EQUAL TOP BY CONSTRUCTION. This constant is
   the single source `CardContent` reads for its own left/right padding AND
   the one `screen-shell.tsx`'s `DENSITY_BODY` imports for the shell's own
   content inset — "the collection card's horizontal inset" and "the
   screen-shell content inset" the ruling asked to compare are now the SAME
   export, not two literals that happen to agree today and drift tomorrow.
   `check-screen-shell.mjs` pins both files to this identifier by name.

   VERTICAL IS UNTOUCHED — `py-6 lg:py-[var(--space-7)]`, the same two
   figures this file always spent, just no longer sharing one `p-*` utility
   with the horizontal figure that moved. This ruling named "the sides." */
const CARD_CONTENT_INSET_X = "px-[var(--space-3)]";

/**
 * `inset="default"`'s own two-step vertical ladder, pulled out and named for
 * the same reason `CARD_CONTENT_INSET_X` was: `check-card.mjs` reads it by
 * identifier, not by re-deriving the figures from the className string.
 */
const CARD_CONTENT_INSET_Y_DEFAULT = "py-6 lg:py-[var(--space-7)]";

/**
 * `inset="compact"` — THE DECLARED SHAPE, not an override a caller fights
 * the default for. Before this prop existed, a compact card was every call
 * site's own `className="py-[var(--space-3)]"` (or worse, `!py-3`) landing
 * on top of `CARD_CONTENT_INSET_Y_DEFAULT` and winning on specificity by
 * accident of `cn`'s own merge order — a shape nowhere declared, so nothing
 * here could check for it and every call site had to re-derive the same
 * figure. `--space-3` is the constant already chosen for the HORIZONTAL
 * inset above (`CARD_CONTENT_INSET_X`) — the same 17 Sep 2026 evening
 * ruling's own number — so a compact card's body is that one step on every
 * side, at every width: no `lg:` bump, matching the horizontal axis that is
 * already flat.
 */
const CARD_CONTENT_INSET_Y_COMPACT = "py-[var(--space-3)]";

const CARD_CONTENT_INSET_Y: Record<"default" | "compact", string> = {
  default: CARD_CONTENT_INSET_Y_DEFAULT,
  compact: CARD_CONTENT_INSET_Y_COMPACT,
};

export interface CardContentProps extends React.ComponentPropsWithoutRef<"div"> {
  /**
   * `"default"` keeps the two-step ladder (24 to `lg:`, 32 above).
   * `"compact"` is the space-3 step at every breakpoint — a declared shape
   * for a dense card body, not a className override fighting the default.
   */
  inset?: "default" | "compact";
}

/**
 * The body. Inset only — no type, deliberately.
 *
 * Chapter 13 draws card body COPY at 13/secondary, but `CardContent` is a
 * slot: across the two apps it holds tables, forms, charts and lists as often
 * as it holds a paragraph, and a container that quietly shrank all of them to
 * 13 would be a component making a design decision on the engineer's behalf.
 * Prose inside a card asks for `Text` or `Hint` from `typography`, which draw
 * exactly what chapter 13 draws. Logged as GAPS-F CRD-6.
 *
 * ON A `plain` SHELL (21 Sep 2026 ruling, see `Card`'s own comment): the
 * horizontal inset drops to 0 at every breakpoint, same as the header and
 * footer, and the TOP of the vertical inset drops to 0 as well, at every
 * breakpoint and regardless of `inset`, because `CardHeader` already
 * spends the page mock's own 12px gap for whatever precedes this block,
 * so stacking this band's own top inset on top of that would double the gap.
 * The bottom of the vertical inset is untouched: with no footer beneath
 * it, it is this section's own trailing space before the next plain
 * section starts. Detected off the shell's own `group/card` marker, not a
 * prop.
 *
 * TEN STATES — none apply. It is an inset.
 * THREE BREAKPOINTS — horizontal is now FLAT (`CARD_CONTENT_INSET_X`, one
 * figure at every width — see that constant's own comment for the 17 Sep
 * 2026 evening ruling this answers); vertical keeps its old two-step ladder
 * by default, 24 to `lg:`, 32 above, or is flat at `--space-3` when `inset`
 * is `"compact"`. See `Card` for the shell's own (unrelated) range.
 * RTL — safe. `px-*`/`py-*` are both logical.
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, inset = "default", ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      data-inset={inset}
      className={cn(
        "min-w-0 flex-1",
        CARD_CONTENT_INSET_Y[inset],
        CARD_CONTENT_INSET_X,
        // `plain`: no horizontal inset, and no top inset (the header
        // already supplies the 12px gap above this band).
        "group-data-[variant=plain]/card:px-0 group-data-[variant=plain]/card:pt-0",
        "lg:group-data-[variant=plain]/card:pt-0",
        className,
      )}
      {...props}
    />
  ),
);

CardContent.displayName = "CardContent";

/**
 * The footer band, and the second of the shell's two hairlines. Chapter 13
 * draws a control at the inline start and a quiet meta line pushed to the
 * inline end; the push is the call site's `Spacer grow` or `ms-auto`, not
 * something this band does for it.
 *
 * `gap-3` is chapter 13's own 12 between footer items.
 *
 * ON A `plain` SHELL (21 Sep 2026 ruling, see `Card`'s own comment): the
 * horizontal inset drops to 0 at every breakpoint, and the TOP gap
 * tightens to the page mock's own 12px (`--space-3`) instead of this
 * band's usual 20, matching `CardHeader`'s own bottom-gap figure so the
 * seam either side of a plain block's content is one consistent number.
 * No hairline either: a plain section has no box to separate FROM. The
 * bottom inset is untouched, the same trailing-space reasoning as
 * `CardContent`'s own. Detected off the shell's own `group/card` marker,
 * not a prop.
 *
 * TEN STATES — none apply. Its children are Buttons and carry all ten.
 * THREE BREAKPOINTS — inset 24 to `lg:`, 32 above. The row WRAPS rather than
 * stacking: two 40-tall pills fit side by side at 320, and a stacked pair
 * reads as a list of options rather than as a choice. Same reasoning as
 * `ActionRow align="start"`, which this band is a fixed instance of.
 * RTL — safe. `px-*` is padding-inline and flex order follows the document.
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        "flex flex-wrap items-center gap-3",
        "px-6 pt-5 pb-6",
        "lg:px-[var(--space-7)] lg:pb-[var(--space-7)]",
        /* The shell's second hairline, drawn as the artifact draws it. */
        "shadow-[var(--hairline-over)]",
        // `plain`: no horizontal inset, no hairline, and the top gap
        // tightens to the page mock's own 12px seam.
        "group-data-[variant=plain]/card:px-0 group-data-[variant=plain]/card:pt-[var(--space-3)]",
        "group-data-[variant=plain]/card:shadow-none",
        "lg:group-data-[variant=plain]/card:px-0",
        className,
      )}
      {...props}
    />
  ),
);

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  CARD_CONTENT_INSET_X,
};
