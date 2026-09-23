"use client";

/* ============================================================================
   Donut — a whole split into segments, a legend beside it, an optional
   number inside the ring (0 direct call sites; a body swap for
   `CollectionFrame`, and chapter 18/19's own data-display figure).

   DESIGN SOURCE
   Two drawings, both the kit's own, and neither is a skin of the other:

     · Kit chapter 19 ("Collection views · 24 view types · one toolbar
       contract"), view 19's own chart specimen, the "Donut — ticket status
       split" card: an SVG ring built from `<circle>` strokes with
       `stroke-dasharray` / `stroke-dashoffset`, and a column beside it —
       a dot then a label, one row per segment. NO number inside the ring.
     · Kit chapter 18 ("Data display"), the "Share of hours" card: the same
       ring (there, a CSS `conic-gradient`) with a NUMBER CENTRED INSIDE it
       — `312h` — and the same dot-then-label column beside it, but with a
       PERCENTAGE printed after each label ("Build 42%").

   This file draws the union of the two: chapter 19's ring-plus-legend
   structure, chapter 18's centre label AND its per-row percentage — because
   both are the kit's own and nothing here is invented. `centerLabel` is
   optional so a caller can draw either reading; `showPercent` defaults to
   on, matching chapter 18's own drawing (the fuller of the two specimens).

   Client's reference screenshots asked for exactly this pairing: "ring with
   legend + percentages beside it, AND a variant with a number/unit centred
   inside the ring." Both are this same component with `centerLabel` present
   or absent — never two components, because the ring, the legend and the
   colours are one drawing whichever way it is read.

   THE ACTIVE SEGMENT — ADDED 2026-09-23, AURORA'S OWN RULING
   Verbatim: "make the where as a donut graphic (when hover show)."

   WHAT THIS FILE USED TO SAY, AND WHY IT WAS A DEFECT. The state table below
   read "hover — none drawn … it is switched off here", and state 3 read
   "focus-visible — not here; the SVG is not focusable." Between the two,
   this component could draw the picture and nothing else: no per-segment
   callback, no active-segment input, and the ring rendered inside the
   component where a call site could not reach it. The consuming
   application's Accounts tab had to answer her ruling by drawing its OWN
   legend of `<button>`s beside a `legend={false}` ring and restating this
   file's `SEGMENT_COLOURS` sequence by hand to keep the two keyed alike —
   an app-side patch of a kit gap, which the standing rule (the kit is the
   only UI input) makes a bug HERE. This is that bug fixed.

   THE SHAPE OF THE FIX, AND WHOSE CONVENTION IT IS
   · `activeId` / `defaultActiveId` / `onActiveChange` — the id-based
     controlled/uncontrolled trio this kit already writes, from
     `flowdetail.tsx` (`selectedId` / `defaultSelectedId` / `onSelectStep`)
     and `split.tsx` (`selectedId` / `defaultSelectedId`). The resolution is
     `rating.tsx`'s own: a prop given at all means the call site owns the
     value, and the component's own state is not consulted. Nothing new is
     invented for a problem two files in this repository already solved.
   · `interactive` — `sankey.tsx`'s own prop, same word, same default (on),
     same meaning: whether each mark is a real, focusable control or the
     picture is inert.
   · THE LEGEND ROW IS THE SEGMENT'S CONTROL. `sankey.tsx`'s law, quoted:
     "EVERY RIBBON IS OPERABLE, OR NOTHING PRETENDS TO BE … What this file
     will not do is the middle case: a hover-only readout on a shape that is
     not focusable." An SVG sector cannot hold a tab stop, so the row beside
     it does: a real `<button>` carrying the segment's WHOLE readout as its
     accessible name, so what a pointer reveals and what a screen reader is
     told are the same sentence and cannot drift. Pointing at the RING
     activates the same segment, by `Pie`'s own `onMouseEnter`/`onMouseLeave`.
   · NOTHING WASHES AND NOTHING DIMS. `chart.tsx`: "the tooltip, and the
     series' own active dot. That IS the hover; nothing washes, nothing
     dims"; `sankey.tsx` draws its ribbons identically at rest and under the
     pointer. So the ring is not re-coloured when a segment goes active: the
     active segment's ROW takes a fill (`--surface-quiet`, a swap between two
     defined tones, never a fade — `rating.tsx`'s own hover law) and, with
     `figures="active"`, its FIGURES appear. That is the whole hover.
   · `legend={false}` KEEPS THE POINTER AND HANDS BACK THE KEYBOARD. A caller
     drawing its own legend outside still gets `onActiveChange` from the ring
     and still drives the ring through `activeId`, so an outside legend and
     the ring stay in step; it owns the keyboard route the same way it owns
     the rows. With the kit's own legend — the default — the keyboard route
     is here and needs no call site.

   COLOUR. `--chart-1..5`, chart.tsx's own sequence and in the same order —
   never a literal hex, unlike both artifact drawings, which hardcode
   `#1F9259` / `#89BCE6` / `var(--poppy)` plus a bare `rgba(...,.12)` for an
   "Other" slice. The literals are read as instructions to use the DATA
   palette in its stated order, not as licence to reach for raw hex here;
   `--chart-4` and `--chart-5` carry the same placeholder gap chart.tsx logs
   (GAPS-COL1 CHT-1) — a five-segment donut will show two indistinguishable
   slices until the palette gains two more data colours.

   RECHARTS, NOT HAND-ROLLED SVG. `chart.tsx` already depends on recharts for
   bar/line/area; `Pie` is the same library's ring primitive and needs no
   second dependency. THE ARRAY-NOT-FRAGMENT TRAP APPLIES HERE TOO — see
   `chart.tsx`'s own header for the full account of why recharts' internal
   `toArray` silently drops a React 19 fragment. Nothing here hands recharts
   a fragment; the legend is drawn OUTSIDE the `<PieChart>`, in plain JSX,
   because chapter 18 and 19 both draw it as ordinary rows beside the ring,
   never as a recharts `<Legend>`.

   THE LAW THIS FILE OBEYS
   · No colour reaches the ring except `--chart-1..5`. Mango is a fill, never
     a data colour (tokens.css is explicit), so an "Other / uncategorised"
     slice takes `--hair-strong` — a neutral ink wash, not a sixth data hue.
   · The centre label is optional and unstyled beyond the kit's own size —
     `text-sm font-medium`, chapter 18's own `13px / 500` — and takes
     whatever node the caller passes; a component may not decide what a
     figure is measuring.
   · The legend dot is 9px (`0.5625rem`), the same size `chart.tsx`'s
     `LegendRow` and `tiles.tsx` already use for a chart key. Nothing here
     invents a second dot size for the same idea.
   · Every value is tabular where it is a number.
   · Focus is one global rule (tokens.css §8). The row's ring lands on the
     row's own box at its own radius; nothing here draws one and nothing
     sets `outline: none`. The RING still draws none of its own — it is not
     a control, its row is (the pun is the artifact's, not this comment's).

   RENDERING CONTEXT
   `"use client"`. recharts measures the DOM, this module holds the active
   segment when the call site does not, and the legend rows attach pointer
   and focus handlers during its own render.
   ========================================================================= */

import * as React from "react";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { cn } from "../../lib/utils";
import { CollectionRegister } from "../collection-frame/collection-frame";

/** Mirrors `chart.tsx`'s `SERIES_COLOURS` exactly — same order, same GAPS-
 *  COL1 CHT-1 hole at 4 and 5. Not imported, because `chart.tsx` does not
 *  export it; duplicated rather than reached for privately across a module
 *  boundary that was never made public. */
const SEGMENT_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** The "Other / uncategorised" reading — a neutral ink wash, never a sixth
 *  data hue and never mango. */
const OTHER_COLOUR = "var(--hair-strong)";

/* ONE ROW, ONE CLASS LIST, whether it is drawn as a control or as a plain
   line. The two branches below share this so that turning `interactive` off
   cannot quietly produce a second drawing of the same row: the only
   difference between them is the tag, the handlers and the active fill. */
const ROW_CLASSES = [
  "inline-flex items-center gap-[var(--space-2)] text-caption text-ink-secondary",
];

/* THE CONTROL'S OWN RESET AND ITS FILL BOX. The horizontal padding is paid
   back by an equal negative margin — `activity-feed.tsx` and
   `calendar-view.tsx` draw their pressable rows exactly this way — so the
   dot still starts on the column's own edge and the resting legend sits
   where it has always sat, while the active fill has room to breathe around
   the text. `--radius-select` is one of the three corners tokens.css bridges
   (RULES.md §4.1); no third radius is introduced. */
const ROW_CONTROL_CLASSES = [
  "border-0 bg-transparent text-start",
  "px-[var(--space-1)] -mx-[var(--space-1)] py-0",
  "rounded-select",
  /* A donut is read, not pressed: the row carries the readout and the tab
     stop, and clicking it commits nothing. `sankey.tsx`'s flow button reasons
     the same way when no `onSelectFlow` is given. */
  "cursor-default",
];

/** The active row's fill. A swap between two defined tones, never a fade —
 *  `rating.tsx`'s own hover law, and the same `--surface-quiet` step
 *  `status-stepper.tsx` uses for a pressable row. */
const ROW_ACTIVE_CLASSES = ["bg-surface-quiet"];

export interface DonutSegment {
  /** Stable key. */
  id: string;
  /** What the legend row says. */
  label: React.ReactNode;
  /** The raw measure. Percentages are derived from the whole, not supplied. */
  value: number;
  /**
   * Override the colour. Must be a token reference. Defaults to
   * `--chart-1..5` by position; pass `OTHER_COLOUR`'s own token,
   * `"var(--hair-strong)"`, for an explicit "everything else" slice.
   */
  color?: string;
}

export interface DonutProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  data?: DonutSegment[];
  /**
   * The ring's own diameter. A rem string, never px — the applications move
   * the root text size and a fixed-pixel ring would fall out of register
   * with the legend beside it. Chapter 18's own drawing is 108 at the 16px
   * authoring root, which is `6.75rem`.
   */
  size?: string;
  /**
   * A node centred inside the hole — chapter 18's `312h`. Undefined draws
   * chapter 19's plainer ring, with nothing in the middle.
   */
  centerLabel?: React.ReactNode;
  /** Draw the dot-and-label column. Chapter 19 and 18 both draw one. */
  legend?: boolean;
  /**
   * Print each row's share of the whole, chapter 18's own "Build 42%".
   * Defaults on; a caller reading chapter 19's plainer legend passes false.
   */
  showPercent?: boolean;
  /** How a segment's raw value is spelled in a screen reader's summary. */
  formatValue?: (value: number) => string;

  /**
   * The active segment's id, when the CALL SITE owns it — the segment under
   * the pointer, or the one the keyboard has reached. `null` is "none", and
   * is a different answer from leaving the prop off: passing it at all,
   * `null` included, makes this component controlled and its own state is
   * never consulted again (`rating.tsx`'s own resolution).
   */
  activeId?: string | null;
  /**
   * Which segment is active before anybody points at one, when this
   * component owns the value. Defaults to `null` — a donut at rest has
   * nothing active, which is the whole of Aurora's "(when hover show)".
   */
  defaultActiveId?: string | null;
  /**
   * Reports every change of the active segment — pointer or keyboard, and
   * whether or not the value is controlled. `null` is "nothing is active any
   * more". This is the hook an outside legend keeps itself in step with.
   */
  onActiveChange?: (id: string | null) => void;
  /**
   * Whether a segment can be pointed at and tabbed to at all. `false` makes
   * the picture inert: no buttons, no ring handlers, nothing reported — the
   * reading the kit's own chapter 18 and 19 specimens draw. `sankey.tsx`'s
   * prop, same word and same default.
   */
  interactive?: boolean;
  /**
   * WHEN a row prints its figures — the percentage (`showPercent`) and the
   * value (`formatValue`).
   *
   *   `"always"` (the default) — chapter 18's own drawing: every row carries
   *                             its share, at rest. No existing call site
   *                             moves.
   *   `"active"`              — nothing until that segment is pointed at or
   *                             tabbed to. Aurora, 2026-09-23: "make the
   *                             where as a donut graphic (when hover show)."
   *                             The picture still READS at rest — the ring,
   *                             the dots and every label — and it is the
   *                             FIGURE that is asked for.
   *
   * It governs the printing only. The figures are in the row's accessible
   * name either way, so a screen reader is never given less than a pointer
   * reveals.
   */
  figures?: "always" | "active";
  /**
   * One segment's whole readout, and the accessible name of its row. The
   * default names the label, then the percentage, then `formatValue`'s
   * spelling of the value, in the order the row draws them and with no
   * English word in it, so it survives a locale change untranslated. A
   * caller with a sentence of its own ("Austria · 7 accounts, 50% of the
   * book") passes it here rather than drawing a second legend.
   */
  formatSegment?: (segment: DonutSegment, percent: number) => string;

  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  loadingState?: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  loadingLabel?: string;
  emptyLabel?: string;
  emptyBody?: string;
  errorLabel?: string;
  errorBody?: string;

  /** Accessible name for the figure. */
  label?: string;
  /** The sentence a screen reader is given instead of the picture. No
   *  default — only the caller knows what the split says (PATTERN §7). */
  summary?: string;
}

/** A segment's label as text, for the readout. A caller handing a NODE has
 *  said nothing this file can put in an accessible name, so the readout is
 *  built from the figures alone and the caller is expected to pass
 *  `formatSegment` — which is exactly what a node-labelled legend must do. */
function labelText(label: React.ReactNode): string {
  return typeof label === "string" ? label : typeof label === "number" ? String(label) : "";
}

/**
 * A whole split into segments: a ring, a legend, and — optionally — a number
 * centred in the hole.
 *
 * TEN STATES
 *  1. default        — the ring and, unless turned off, its legend.
 *  2. hover          — a segment goes ACTIVE, by the pointer on its ring
 *                      sector (`Pie`'s own `onMouseEnter`) or on its legend
 *                      row. The active row takes `--surface-quiet` and, with
 *                      `figures="active"`, prints its percentage and value;
 *                      `onActiveChange` reports it either way. The RING
 *                      itself does not change — `chart.tsx`'s and
 *                      `sankey.tsx`'s standing law, "nothing washes, nothing
 *                      dims". recharts' own active-shape hover stays off, as
 *                      it always was: the emphasis is this kit's, not the
 *                      library's. Aurora, 2026-09-23: "make the where as a
 *                      donut graphic (when hover show)."
 *  3. focus-visible  — tokens.css §8's one ring, on the legend row's own box
 *                      at its own radius. Each row is a real `<button>` and
 *                      its own tab stop, and reaching it ACTIVATES its
 *                      segment, so the keyboard sees exactly what the
 *                      pointer sees. The SVG sector still holds no tab stop
 *                      — it cannot — which is why the row is the control.
 *  4. active/pressed — does not apply. A donut is read, not pressed: the row
 *                      is a control so it can be reached and named, and
 *                      pressing it commits nothing.
 *  5. disabled       — does not apply, for the same reason a chart has none.
 *  6. loading        — `loading`: a round `Skeleton` at the ring's own size,
 *                      so nothing reflows when the split lands.
 *  7. empty          — no segments, every value zero, or `empty`: the quiet
 *                      register in the ring's place.
 *  8. error          — `error`: the poppy-dot register. Beats `empty`.
 *  9. selected       — does not apply; a donut has no selection of its own.
 *                      The active segment is a reading, not a choice: it
 *                      follows the pointer away and is never committed.
 * 10. read-only      — always.
 *
 * THREE BREAKPOINTS — unchanged at all three. The ring is a fixed `size`
 * and the legend wraps under it on a narrow measure by ordinary flex-wrap;
 * chapter 18 and 19 both draw the pairing at one width and state nothing
 * about it changing at another.
 *
 * RTL — safe. The ring has no reading direction and the legend's row order
 * is DOM order, not a physical side. The row's own padding and its paid-back
 * margin are both logical (`px`/`-mx` resolve to the inline axis), and the
 * trailing value sits on `ms-auto`.
 */
const Donut = React.forwardRef<HTMLDivElement, DonutProps>(
  (
    {
      className,
      data,
      size = "6.75rem",
      centerLabel,
      legend = true,
      showPercent = true,
      formatValue,
      activeId,
      defaultActiveId = null,
      onActiveChange,
      interactive = true,
      figures = "always",
      formatSegment,
      loading = false,
      error = false,
      empty = false,
      loadingState,
      emptyState,
      errorState,
      loadingLabel = "Loading…",
      emptyLabel = "Nothing here",
      emptyBody = "There is nothing to split for this period.",
      errorLabel = "Figures unavailable",
      errorBody = "We can’t show this right now. Try again in a moment.",
      label,
      summary,
      ...props
    },
    ref,
  ) => {
    const segments = data ?? [];
    const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

    /* THE CONTROLLED/UNCONTROLLED RESOLUTION, `rating.tsx`'s own: the prop
       being PRESENT is what hands the value to the call site, so `null` —
       "nothing is active" — is a real controlled answer and not a fallback
       into this component's own state. */
    const controlled = activeId !== undefined;
    const [ownActive, setOwnActive] = React.useState<string | null>(defaultActiveId);

    const state = loading
      ? "loading"
      : error
        ? "error"
        : segments.length === 0 || total <= 0 || empty
          ? "empty"
          : "default";

    const operable = interactive && state === "default";
    const active = controlled ? activeId : ownActive;

    /* Reports only a CHANGE. Re-entering the same sector (recharts fires
       `onMouseEnter` per sector, and a row's own pointer enter follows the
       ring's on the way in) must not spray an outside legend with the answer
       it already has. */
    const activate = (next: string | null) => {
      if (next === active) return;
      if (!controlled) setOwnActive(next);
      onActiveChange?.(next);
    };

    const colourFor = (segment: DonutSegment, index: number) =>
      segment.color ?? SEGMENT_COLOURS[index % SEGMENT_COLOURS.length];

    const percentOf = (value: number) =>
      total > 0 ? Math.round((value / total) * 100) : 0;

    /* THE ROW'S WHOLE READOUT — its accessible name, and (under
       `figures="active"`) the same figures the pointer reveals. Built from
       the same two decisions the row itself draws from, so the two channels
       cannot make different claims. */
    const readoutFor = (segment: DonutSegment, percent: number) =>
      formatSegment
        ? formatSegment(segment, percent)
        : [
            labelText(segment.label),
            showPercent ? `${String(percent)}%` : "",
            formatValue ? formatValue(segment.value) : "",
          ]
            .filter((part) => part !== "")
            .join(" · ");

    return (
      <div
        ref={ref}
        data-slot="donut"
        data-state={state}
        aria-busy={loading || undefined}
        aria-label={label}
        className={cn("flex min-w-0 items-center gap-[var(--space-4)]", className)}
        {...props}
      >
        {summary ? <span className="sr-only">{summary}</span> : null}

        <div
          className="relative shrink-0"
          style={{ width: size, height: size }}
        >
          {state === "loading" ? (
            loadingState ?? (
              /* `Skeleton`'s five variants are a bar, a card block, media at
                 16/9, and two composites — none of them a ring, and a bar
                 forced into a circle with an override className is a merge
                 outcome to trust rather than a shape this file draws on
                 purpose. So the ring's own pulse is drawn directly, with the
                 same fill `Skeleton` itself pulses — `--surface-quiet`,
                 Tailwind's own `animate-pulse` — rather than inventing a
                 second placeholder idiom. */
              <div
                role="status"
                aria-live="polite"
                aria-label={loadingLabel}
                className="size-full rounded-pill bg-surface-quiet animate-pulse motion-reduce:animate-none"
              />
            )
          ) : state === "error" || state === "empty" ? null : (
            <>
              {/* AN ARRAY, NEVER A FRAGMENT — see the file header. `Pie` walks
                  its own `data` prop rather than JSX children, so the trap
                  does not apply to the segments themselves, but `PieChart`
                  still resolves ITS children the same fragile way `chart.tsx`
                  documents; a bare `<Pie>` here is already an array of one
                  and needs no wrapping. */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segments as unknown as Record<string, unknown>[]}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="66%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                    /* THE RING ANSWERS THE POINTER. recharts hands the
                       sector's own index, which is this file's own `segments`
                       index because `data` IS that array — so the segment is
                       found by position and never by re-deriving it from the
                       payload recharts hands back. Nothing is drawn
                       differently; what changes is which segment is active,
                       which the legend row and `onActiveChange` then say. */
                    onMouseEnter={
                      operable
                        ? (_sector: unknown, index: number) => {
                            activate(segments[index]?.id ?? null);
                          }
                        : undefined
                    }
                    onMouseLeave={
                      operable
                        ? () => {
                            activate(null);
                          }
                        : undefined
                    }
                  >
                    {segments.map((s, i) => (
                      <Cell key={s.id} fill={colourFor(s, i)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {centerLabel !== undefined ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-[var(--font-weight-medium)] tabular-nums text-foreground">
                    {centerLabel}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>

        {state === "error" ? (
          errorState ?? (
            <CollectionRegister tone="error" eyebrow={errorLabel} body={errorBody} />
          )
        ) : state === "empty" ? (
          emptyState ?? (
            <CollectionRegister tone="quiet" eyebrow={emptyLabel} body={emptyBody} />
          )
        ) : legend && state === "default" ? (
          <div className="flex min-w-0 flex-col gap-[var(--space-2)]">
            {segments.map((s, i) => {
              const percent = percentOf(s.value);
              const isActive = active === s.id;
              /* AT REST, UNDER `figures="active"`, NOTHING IS PRINTED — the
                 spans are not rendered at all rather than hidden, because a
                 figure a reader cannot see but a test (or a screen reader
                 walking the text) can find is still a printed figure. */
              const printFigures = figures === "always" || isActive;
              const dot = (
                <span
                  aria-hidden="true"
                  /* 9 — the same chart-key dot chart.tsx's LegendRow and
                     tiles.tsx already draw at. */
                  className="size-[0.5625rem] shrink-0 rounded-pill"
                  style={{ background: colourFor(s, i) }}
                />
              );
              const body = (
                <>
                  {dot}
                  <span className="min-w-0 truncate">{s.label}</span>
                  {showPercent && printFigures ? (
                    <span className="tabular-nums text-ink-tertiary">
                      {percent}%
                    </span>
                  ) : null}
                  {formatValue && printFigures ? (
                    <span className="ms-auto tabular-nums text-ink-tertiary">
                      {formatValue(s.value)}
                    </span>
                  ) : null}
                </>
              );

              /* INERT — `interactive={false}`, or any state but `default`.
                 The row is the line chapter 18 and 19 draw and nothing more.
                 One class list, so the two readings cannot drift apart. */
              if (!operable) {
                return (
                  <span key={s.id} data-slot="donut-segment" className={cn(ROW_CLASSES)}>
                    {body}
                  </span>
                );
              }

              return (
                <button
                  key={s.id}
                  type="button"
                  data-slot="donut-segment"
                  data-active={isActive ? "" : undefined}
                  /* THE ACCESSIBLE NAME IS THE READOUT — `sankey.tsx`'s own
                     law. A name that said "segment 2 of 5" would make the
                     keyboard route useless, and would let a screen reader be
                     told less than the pointer reveals. */
                  aria-label={readoutFor(s, percent)}
                  onPointerEnter={() => {
                    activate(s.id);
                  }}
                  onPointerLeave={() => {
                    activate(null);
                  }}
                  onFocus={() => {
                    activate(s.id);
                  }}
                  onBlur={() => {
                    activate(null);
                  }}
                  className={cn(
                    ROW_CLASSES,
                    ROW_CONTROL_CLASSES,
                    isActive && ROW_ACTIVE_CLASSES,
                  )}
                >
                  {body}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  },
);

Donut.displayName = "Donut";

export { Donut };
