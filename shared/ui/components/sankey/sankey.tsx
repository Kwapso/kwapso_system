"use client";

/* ============================================================================
   Sankey — one population under two categorisations, and what moved between
   them (0 direct call sites today; built for the "arrived as X, turned out to
   be Y" figure and generic to any before/after pair).

   WHAT THE CLIENT ASKED FOR, 2026-09-07, pointing at a chart in an approved
   design artifact: "for the Raised as, then triaged as i want this graphic you
   proposed / also, if its not there, include in ui-ux components". The drawing
   is four stacked bars on the left labelled with a kind and a count, the same
   four kinds on the right with their own counts, and curved translucent
   ribbons between them whose thickness is the number that moved, tinted by the
   SOURCE. A sentence underneath states the headline in words.

   IT IS BUILT GENERICALLY AND THE VOCABULARY IS DELIBERATELY ABSENT.
   PATTERN §9 forbids product vocabulary in a component — no "ticket", no
   "triage" — so this file knows only about NODES and FLOWS. What the two
   columns MEAN is two caption props the call site fills in. A later caller
   using it for applications-to-outcomes, or leads-to-stages, gets the same
   drawing with no argument.

   DESIGN SOURCE
   The kit draws no Sankey. Chapter 18 ("Data display") owns the charts and
   stops at bar/line/area plus the donut and the rings; chapter 19's 24 view
   types include a flowchart and a comparison, neither of which is this. So
   this is a NEW SHAPE, and it is assembled from parts the kit has already
   ruled on rather than invented whole:

     · the ribbon fill  — `chart.tsx`'s own area rule, verbatim: a COLOUR
                          (`color-mix`), never an alpha, because "an alpha
                          applied to an element is a state mechanism and is
                          banned; a mixed colour is a colour the palette can
                          name".
     · the node bar     — `--radius-bar`, which tokens.css names for "bars,
                          heat cells, NODES". Ruling 03's "4px on a bar … a
                          bar is not a box" reaches this shape by its own
                          words.
     · the data colours — `--chart-1..5`, chart.tsx's sequence in its order.
                          Mango is a fill and never a data colour.
     · the readout      — `HoverCard`, which Radix opens on focus as well as
                          on hover. That is the whole reason it is used here
                          rather than `Tooltip`: a pointer-only readout on a
                          shape whose values cannot be read off the picture is
                          not a readout, it is a decoration.
     · the registers    — `CollectionRegister` and `Skeleton`, the same two
                          `chart.tsx` and `donut.tsx` already stand in for a
                          plot that has not arrived.

   Every judgement below that the artifact does not settle is logged in
   /GAPS-FLOW.md as FLW-1 … FLW-7, and the artifact owes this shape a chapter
   entry.

   TWO STAGES, NOT N — AND THAT IS A DECISION, NOT A SHORTFALL
   A general Sankey chains any number of stages. This one draws exactly two: a
   before and an after. The name is kept because it is the word a person
   SAYS when they see the shape, and demo/chrome.tsx's own header states that
   as the whole hierarchy of the book — "a person recognises a shape on
   screen, reads its NAME off the card, and says that name to an AI coding
   assistant". Calling it something more precise and less recognisable would
   cost exactly the thing the book is for. A third stage would be a new prop
   and a second layout pass, not a reinterpretation of these props.

   ─────────────────────────────────────────────────────────────────────────
   THE FIVE RULINGS THIS FILE MAKES, EACH ONE ASKED FOR AND EACH ONE PAID FOR
   ─────────────────────────────────────────────────────────────────────────

   1 · NODE TOTALS ARE DERIVED FROM THE FLOWS. THERE IS NO `value` ON A NODE.
   The alternative — letting the caller state each node's total — was rejected
   because the two can then DISAGREE, and there is no honest drawing of a
   disagreement. A bar longer than the ribbons leaving it leaves a gap with no
   meaning, and a bar shorter than them either clips a ribbon or lets it hang
   outside its own node. The client's own reference proves the derivation is
   the natural one: `Issue 149` on the left and `71 Issue` on the right are
   exactly the row sum and the column sum of ONE matrix. So the matrix is the
   input and both margins are computed. A caller holding a total that differs
   from its own flows has a data problem this component must not hide.

   2 · PAINT ORDER IS THICKEST FIRST, THINNEST LAST, AND EVERY RIBBON CARRIES
   ITS OWN EDGE. Ribbons cross, and the artifact's own trend chart learned the
   cost of getting this wrong: a translucent small area drawn BEHIND a large
   one has no findable edge and effectively disappears. So the ribbons are
   sorted and painted in descending order of thickness — the biggest band goes
   down first and the thin corrections land on top of it, never under it.

   The thickness that decides the order is the ribbon's NARROWEST END, not its
   average and not its source, because a ribbon's two ends can differ (see the
   taper below) and the end somebody loses it at is the thin one.

   Ordering alone is not enough when two ribbons share a hue — a correction
   leaving the same source as the self-flow beside it — so each ribbon is also
   drawn with a 1-unit stroke of its own colour at roughly double the body's
   strength. Measured on verify/sankey, light palette on the page tone: the
   body reads 1.569 against its ground, the edge 2.528, and the edge 1.611
   against its own body. Dark: 1.691, 3.319, 1.963. Every one of those clears
   the step this kit already ships as a visible surface change (override 77
   measures its selected wash at 1.103 light / 1.111 dark and calls that the
   answer).

   That stroke is the MARK'S OWN OUTLINE, not a rule between two surfaces: the
   house rule that separation is a fill or an inset shadow governs boxes
   sitting against boxes, and a band with no edge is not a box with a border
   removed, it is an unreadable band. Logged as FLW-4 rather than presented as
   kit law. The stroke carries `vector-effect: non-scaling-stroke` because the
   plot is drawn in a stretched coordinate space (see the render) and an
   ordinary stroke would come out thick across and thin down.

   3 · THE OPACITY IS A COLOUR. `color-mix(in srgb, <source> 34%, transparent)`
   for the body and 68% for the edge — the same mechanism and the same reason
   `chart.tsx` gives for its 16% area fill. 34 rather than 16 because a Sankey
   ribbon is READ as an object and crossed by others, where an area fill sits
   behind a curve and is read as a shading; two ribbons overlapping at 34%
   each still resolve, and at 16% the overlap and the body are the same tone.
   The quiet diagonal keeps the kit's own 16% and measures 1.229 against the
   light page tone and 1.225 against the dark one — present, and beaten by
   every correction crossing it (1.276 light, 1.381 dark). Logged as FLW-3.

   4 · THE SELF-FLOW IS QUIETER BY DEFAULT, AND THAT IS A PROP.
   "Arrived an issue, still an issue" is usually the biggest ribbon and the
   least interesting one — the corrections are the point of the picture. So
   `selfFlow="quiet"` (the default) draws a node's flow to ITSELF at the 16%
   mix and with no edge stroke, and `selfFlow="equal"` draws it exactly like
   every other flow. It is a prop and not a hardcoded opinion because another
   caller may be looking for exactly the retention the diagonal measures.
   There is deliberately NO `"hidden"` value: node totals are derived from the
   flows (§1), so hiding the diagonal would leave every bar longer than the
   ribbons that explain it — a picture that contradicts itself. A caller who
   truly wants the diagonal gone removes those flows from the data, where the
   totals will change with them and stay true.

   5 · A MINIMUM RIBBON THICKNESS, AND WHAT IT COSTS.
   A flow of 1 against a flow of 149 is 0.55% of the plot — under two device
   pixels at the default height, which is not a mark, it is an artefact. So a
   ribbon is never drawn thinner than `MIN_RIBBON_PCT` (0.9% of the plot), and
   a node band never thinner than `MIN_NODE_PCT` (8%, which is what its label
   needs to sit on one line without touching its neighbour's).

   THE HONESTY COST, STATED PLAINLY BECAUSE IT IS REAL: two flows whose true
   thickness both fall under the floor are drawn IDENTICALLY. On the client's
   own 180-ticket population a 1 and a 2 both land under 0.9% and become the
   same band; a 3 does not and is drawn true. So the picture's thickness is
   truthful ABOVE the floor and merely present below it, and the floor is
   stated here rather than tuned until nobody notices.

   WHAT PAYS FOR IT: no value in this component is readable ONLY from the
   thickness of a ribbon. Every flow carries its exact number three times over
   — in the readout its `HoverCard` opens, in the accessible name of the real
   `<button>` that opens it, and in the visually-hidden table that is this
   figure's textual equivalent. The floor distorts the picture and cannot
   distort any of the three. The alternative — drawing a 1 to scale — is
   honest about proportion and silent about existence, and a flow nobody can
   see is worse than a flow drawn slightly too thick.

   AND THE FLOOR IS A FLOOR, NOT A GUARANTEE. Bands are lifted to the floor
   and then normalised to fit the plot, in that order, so a chart with very
   many tiny flows takes some of the lift back. With more than about nine
   categories the node floor cannot be honoured at all and the labels will
   crowd. This shape is for a handful of categories; that is a real ceiling
   and it is written down rather than discovered.

   THE FLOOR'S SECOND, LESS OBVIOUS CONSEQUENCE: A RIBBON CAN TAPER. Each
   node's ribbons are cut to fill THAT node's band exactly, and a band lifted
   to the node floor is wider than its share — so a flow of 1 leaving a
   floored category is drawn thicker where it leaves than where it arrives
   into a category that needed no lift. Measured on verify/sankey, cell 1:
   `Extra → Issue: 1` is about 11 device pixels at the Extra end and about 3
   at the Issue end.

   That is a deliberate choice between two distortions, and the other one is
   worse. Keeping every ribbon parallel would mean a node's bar is no longer
   the sum of the ribbons touching it, which shows up as an unexplained gap
   inside a bar — a mark with no meaning, in a picture whose whole claim is
   that a bar IS its ribbons. A taper at least means something a reader can
   name: this end of the flow belongs to a category too small to draw at
   scale. So the bars stay exactly full and the ribbons are allowed to change
   width, and this paragraph exists so nobody re-derives it as a bug.

   ─────────────────────────────────────────────────────────────────────────
   ACCESSIBILITY — THE HARD CASE, ANSWERED THREE WAYS
   ─────────────────────────────────────────────────────────────────────────
   A picture of ribbons says nothing at all to a screen reader, and "148
   flows" read out as prose is useless. So:

   · THE FIGURE HAS A NAME. `aria-label` on the `<figure>`, a prop with no
     default, because only the caller knows what the population is.
   · THE FIGURE HAS A REAL TEXTUAL EQUIVALENT: a visually-hidden `<table>`
     carrying the SAME matrix the ribbons draw — one row per source, one
     column per target, a margin of totals on both. That is a structure a
     screen reader can navigate cell by cell, which prose cannot be. It is not
     an approximation of the picture; it is the picture's own input.
   · EVERY RIBBON IS OPERABLE, OR NOTHING PRETENDS TO BE. With
     `interactive` (the default), each flow gets a REAL `<button>` sitting
     exactly over its own band, carrying the whole readout as its accessible
     name and wrapped in `HoverCard` so the card opens on focus as well as on
     hover. That is the kit's established answer and it is reused rather than
     re-invented. With `interactive={false}` there is no button, no card and
     no hover — the picture is inert and the table carries everything. What
     this file will not do is the middle case: a hover-only readout on a
     shape that is not focusable.

   THE HIT AREA IS EXACTLY THE MARK, AND IS NOT INFLATED. A thin ribbon's
   button is as thin as the ribbon. Inflating it to a comfortable target would
   put a transparent 24-tall control over the middle of the thick ribbon
   underneath, and the pointer would then open the wrong readout — the thin
   ribbon would steal the thick one's hover, which is the same crossing
   problem as §2 in a different medium. The keyboard route does not need a
   target at all, and tokens.css §8's ring lands on the button's own band, so
   tabbing lights up the ribbon it belongs to.

   THE LAW THIS FILE OBEYS
   · No hex, no px outside a comment, no hardcoded font size. Geometry is in
     PERCENT of the plot, which is unitless and moves with the height prop.
   · No CSS border anywhere. Nothing in this drawing separates by a rule.
   · Two radii and the pill: the node bar and the buttons take `--radius-bar`
     (which tokens.css names for bars and nodes), the readout card is
     `HoverCard`'s own box radius, and the key dots are pills.
   · A ground painted from a STATIC token uses the named utility. The node
     bar's fill is DATA — one colour per node, chosen by the caller — so it
     cannot be a class at all and rides on an inline style, exactly as
     `donut.tsx`'s and `chart.tsx`'s legend dots already do. That is not the
     arbitrary-class trap `record-detail.tsx` documents: the trap is
     tailwind-merge filing `bg-[…]` and a named `bg-*` in one group and
     silently dropping one of them, and an inline style has no merge group and
     cannot cancel a class.
   · Mango is nowhere near this file. `--chart-1..5` and nothing else.
   · Focus is one global rule (tokens.css §8). Nothing here draws a ring.
   · Every user-facing string is a prop with a default, including the table's
     column headings and the readout's own wording.

   RENDERING CONTEXT
   `"use client"`. `HoverCard` is Radix, which holds open state and portals,
   and the flow buttons create handlers during this module's own render.
   ========================================================================= */

import * as React from "react";

import { cn } from "../../lib/utils";
import { Skeleton } from "../skeleton/skeleton";
import { CollectionRegister } from "../collection-frame/collection-frame";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../hover-card/hover-card";

/* ----------------------------------------------------------------------------
   The data colours, in order — `chart.tsx`'s own sequence.

   Not imported, because `chart.tsx` does not export it; duplicated for the
   same reason `donut.tsx` duplicates it rather than reaching privately across
   a module boundary that was never made public.

   A caller with a fixed palette per category — which the consuming
   application has — hands `color` per node instead, and must hand a TOKEN
   REFERENCE rather than a literal: the palette re-points on dark and a
   literal would not move with it.
   ------------------------------------------------------------------------- */
const NODE_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/* ----------------------------------------------------------------------------
   The geometry, all of it in PERCENT OF THE PLOT.

   Percent rather than rem for one reason: the same numbers drive both the
   HTML columns (`top` / `height` as CSS percentages) and the SVG ribbons
   (`y` in a `0 0 100 100` viewBox), so the two CANNOT drift out of register.
   A ribbon that starts a hair above its own node is the single most visible
   defect this shape can have, and the only sure way to prevent it is for the
   bar and the band to be the same number.
   ------------------------------------------------------------------------- */

/** The space between two stacked node bands. */
const GAP_PCT = 2.5;

/**
 * The shortest a node band may be drawn. 8% of the plot is 1.6rem at the
 * default height, which is what one caption line needs in order to sit at the
 * band's centre without touching the band above it. This is the LABEL's
 * floor, not the data's — see ruling 5 in the header for what it costs.
 */
const MIN_NODE_PCT = 8;

/**
 * The thinnest a ribbon may be drawn. 0.9% of the plot is under three device
 * pixels at the default height — small enough that a flow of 1 stays visibly
 * smaller than a flow of 10, large enough that it is a mark rather than a
 * rendering artefact. Ruling 5 states what two flows under this floor cost.
 */
const MIN_RIBBON_PCT = 0.9;

/** The ribbon body, as a share of its source colour mixed into nothing. */
const RIBBON_MIX = 34;
/** The ribbon's own edge — roughly double the body, so it is findable. */
const RIBBON_EDGE_MIX = 68;
/** A node's flow to itself, when `selfFlow="quiet"`. chart.tsx's own 16%. */
const SELF_MIX = 16;

/**
 * The edge's width, and the one bare number in this file's drawing.
 *
 * It is a MARK on the picture rather than a distance in the layout, which is
 * the same reason `chart.tsx` writes its 2.5 curve and its 4 bar corner as
 * bare numbers: a ribbon's outline that grew with the root text size would
 * stop reading as the same object. `vector-effect: non-scaling-stroke` on the
 * path keeps it at this width in device pixels no matter how the viewBox is
 * stretched, which is what makes one number correct at every size.
 */
const EDGE_WIDTH = 1;

/** Where the two columns meet the ribbon field, in the SVG's own x space. */
const X_START = 0;
const X_END = 100;

/* ----------------------------------------------------------------------------
   Types
   ------------------------------------------------------------------------- */

/** Which column a category appears in. */
export type SankeySide = "from" | "to";

export interface SankeyNode {
  /** Stable key. A flow names its ends by this. */
  id: string;
  /**
   * What the column says, and what a screen reader is given for this
   * category. A STRING rather than a node, deliberately: it is used verbatim
   * as part of a button's accessible name and as a table header, and neither
   * of those can be given a `<span>`.
   */
  label: string;
  /**
   * Override the colour. Must be a token reference — never a literal, since
   * the chart palette re-points on dark. Defaults to `--chart-1..5` by
   * position in `nodes`.
   */
  color?: string;
  /**
   * Restrict this category to ONE column. The default is both, which is the
   * usual case — a population re-categorised against the same vocabulary. A
   * before and an after with genuinely different vocabularies (a channel on
   * the left, a team on the right) declares every category once and pins each
   * to its own side, so neither column grows a phantom zero row.
   */
  side?: SankeySide | "both";
}

export interface SankeyFlow {
  /** A node id in the left column. */
  from: string;
  /** A node id in the right column. */
  to: string;
  /** How many of the population moved this way. Zero and below are dropped. */
  value: number;
}

/** One flow, as the readout and the click handler receive it back. */
export interface SankeyFlowDetail {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  value: number;
  /** This flow as a percentage of everything leaving its SOURCE, rounded. */
  shareOfSource: number;
  /** Whether the two ends are the same category. */
  self: boolean;
}

export interface SankeyProps
  extends Omit<React.ComponentPropsWithoutRef<"figure">, "children"> {
  /** The categories, in the order they should stack. */
  nodes?: SankeyNode[];
  /**
   * The matrix. Node totals are DERIVED from these and never supplied — see
   * ruling 1 in the file header. A pair named twice is summed; a pair naming
   * an id that is not in `nodes` is dropped, because a flow to a category the
   * caller never declared can be neither drawn nor named.
   */
  flows?: SankeyFlow[];

  /**
   * How tall the plot is. A rem string, never px: the applications move the
   * root text size and a plot that did not move with it would drift out of
   * register with the copy beside it. Same reasoning as `chart.tsx`'s own
   * `height`.
   */
  height?: string;
  /** The heading over the left column. Undefined draws nothing. */
  fromTitle?: React.ReactNode;
  /** The heading over the right column. Undefined draws nothing. */
  toTitle?: React.ReactNode;
  /**
   * How loudly to draw a category's flow to ITSELF. `"quiet"` (the default)
   * mutes it so the corrections read first; `"equal"` treats it as any other
   * flow. Ruling 4 in the header says why there is no third value.
   */
  selfFlow?: "quiet" | "equal";
  /**
   * Whether each ribbon is a real, focusable control carrying its own
   * readout. `false` makes the picture inert — no button, no card, no hover —
   * and leaves the hidden table as the whole textual equivalent. There is no
   * middle setting: a hover-only readout is not offered.
   */
  interactive?: boolean;
  /** Pressing a ribbon. Given, the ribbon's button also reports its flow. */
  onSelectFlow?: (flow: SankeyFlowDetail) => void;

  /**
   * How a count is spelled, everywhere one appears — beside a label, in the
   * readout, in the hidden table. No default beyond `String`, deliberately: a
   * number's spelling is a locale decision and the runtime knows the locale
   * better than this file does. `Chart` and `Progress` both reason this way.
   */
  formatValue?: (value: number) => string;
  /**
   * The whole readout for one flow — also the accessible name of its button.
   * The default names both ends and the count and uses no English word at
   * all, so it survives a locale change untranslated.
   */
  formatFlow?: (flow: SankeyFlowDetail) => string;
  /** The second line of the readout: this flow's share of its source. */
  formatShare?: (flow: SankeyFlowDetail) => string;

  /** The data has not arrived. Cold cache only. */
  loading?: boolean;
  /** The request failed. Beats every other register. */
  error?: boolean;
  /** Force the empty register even with categories present. */
  empty?: boolean;
  loadingState?: React.ReactNode;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  unrecordedState?: React.ReactNode;
  loadingLabel?: string;
  emptyLabel?: string;
  emptyBody?: string;
  errorLabel?: string;
  errorBody?: string;
  /**
   * What is said when the categories are known but nothing has moved between
   * them. This is NOT the empty register: the columns are still drawn, with
   * their labels and their zeros, and this sentence sits under them. A box
   * with nothing in it would throw away the one thing that IS known.
   */
  unrecordedLabel?: string;
  unrecordedBody?: string;

  /** Accessible name for the figure. */
  label?: string;
  /**
   * The sentence under the picture, stating the headline in words — the
   * client's own reference draws one. Visible, and read by everyone.
   */
  caption?: React.ReactNode;

  /**
   * The hidden table's own caption, and its three headings. Strings with
   * defaults, per PATTERN §7 — including these, which nobody ever sees.
   */
  tableCaption?: string;
  fromHeader?: string;
  toHeader?: string;
  totalHeader?: string;
}

/* ----------------------------------------------------------------------------
   Layout — pure, and deliberately not a hook.

   Nothing here measures the DOM, so nothing here needs an effect, a ref or a
   state. The whole drawing is a function of the props, which is what lets the
   HTML columns and the SVG ribbons agree without either one asking the
   browser where the other ended up.
   ------------------------------------------------------------------------- */

interface Band {
  node: SankeyNode;
  colour: string;
  /** The node's TRUE total on this side. Never the drawn height. */
  value: number;
  /** Percent from the top of the plot. */
  top: number;
  /** Percent of the plot. Floored, so it may exceed the value's share. */
  height: number;
}

interface Slice {
  key: string;
  top: number;
  bottom: number;
}

interface Ribbon {
  key: string;
  detail: SankeyFlowDetail;
  colour: string;
  /** The source end, in percent. */
  y0: number;
  y1: number;
  /** The target end, in percent. */
  y2: number;
  y3: number;
  /**
   * The ribbon's THINNEST point, which is what decides the paint order.
   *
   * Its two ends can differ — see the taper paragraph in the file header —
   * and findability is governed by the narrowest end, not the average and not
   * the source. A ribbon that is generous where it leaves and hairline where
   * it arrives is a ribbon somebody will lose at the arriving end, so that is
   * the end the ordering is computed from.
   */
  weight: number;
}

/** The kit's 16%-style mix, generalised: a colour, never an alpha. */
function mix(colour: string, percent: number) {
  return `color-mix(in srgb, ${colour} ${String(percent)}%, transparent)`;
}

/**
 * Stack one column's nodes.
 *
 * Lift to the floor FIRST and normalise to the plot SECOND, in that order, so
 * the floor is honoured wherever the plot has room for it and gives way
 * gracefully where it does not. The reverse order would normalise a value to
 * nothing and then lift the nothing, which would make every small node the
 * same size as every other one.
 */
function stack(
  side: SankeySide,
  nodes: SankeyNode[],
  flows: SankeyFlow[],
  colourOf: (node: SankeyNode) => string,
): Band[] {
  const here = nodes.filter((n) => (n.side ?? "both") === "both" || n.side === side);
  if (here.length === 0) return [];

  const valueOf = (id: string) =>
    flows
      .filter((f) => (side === "from" ? f.from : f.to) === id)
      .reduce((sum, f) => sum + f.value, 0);

  const values = here.map((n) => valueOf(n.id));
  const total = values.reduce((a, b) => a + b, 0);
  const available = Math.max(0, 100 - GAP_PCT * (here.length - 1));

  const lifted = values.map((v) =>
    Math.max(total > 0 ? (v / total) * available : 0, MIN_NODE_PCT),
  );
  const liftedTotal = lifted.reduce((a, b) => a + b, 0);
  const scale = liftedTotal > 0 ? available / liftedTotal : 0;

  let y = 0;
  return here.map((node, index) => {
    const height = lifted[index] * scale;
    const band: Band = { node, colour: colourOf(node), value: values[index], top: y, height };
    y += height + GAP_PCT;
    return band;
  });
}

/**
 * Cut one band into the flows that meet it, in the order given.
 *
 * The order is the COUNTERPART column's order rather than the flow array's,
 * so ribbons leaving one node arrive in the same top-to-bottom sequence they
 * land in — which is what stops a chart crossing itself for no reason. Paint
 * order (ruling 2) is a separate decision made later, on thickness.
 */
function cut(band: Band, keys: string[], valueOf: (key: string) => number): Map<string, Slice> {
  const out = new Map<string, Slice>();
  if (keys.length === 0) return out;

  const values = keys.map(valueOf);
  const total = values.reduce((a, b) => a + b, 0);
  const lifted = values.map((v) =>
    Math.max(total > 0 ? (v / total) * band.height : 0, MIN_RIBBON_PCT),
  );
  const liftedTotal = lifted.reduce((a, b) => a + b, 0);
  const scale = liftedTotal > 0 ? band.height / liftedTotal : 0;

  let y = band.top;
  keys.forEach((key, index) => {
    const height = lifted[index] * scale;
    out.set(key, { key, top: y, bottom: y + height });
    y += height;
  });
  return out;
}

/** The closed band between two vertical slices, as one path. */
function ribbonPath(r: Ribbon) {
  const midX = (X_START + X_END) / 2;
  return [
    `M${String(X_START)} ${String(r.y0)}`,
    `C${String(midX)} ${String(r.y0)} ${String(midX)} ${String(r.y2)} ${String(X_END)} ${String(r.y2)}`,
    `L${String(X_END)} ${String(r.y3)}`,
    `C${String(midX)} ${String(r.y3)} ${String(midX)} ${String(r.y1)} ${String(X_START)} ${String(r.y1)}`,
    "Z",
  ].join(" ");
}

/* ----------------------------------------------------------------------------
   The hidden table — this figure's textual equivalent.

   A separate component only so the main render stays readable. It is the same
   matrix the ribbons draw, with both margins, because a screen reader can
   navigate a table cell by cell and cannot navigate a sentence.
   ------------------------------------------------------------------------- */
function MatrixTable(props: {
  caption: string;
  fromHeader: string;
  toHeader: string;
  totalHeader: string;
  fromNodes: SankeyNode[];
  toNodes: SankeyNode[];
  valueAt: (from: string, to: string) => number;
  format: (value: number) => string;
}) {
  const { caption, fromHeader, toHeader, totalHeader, fromNodes, toNodes, valueAt, format } = props;

  const rowTotal = (from: string) =>
    toNodes.reduce((sum, t) => sum + valueAt(from, t.id), 0);
  const columnTotal = (to: string) =>
    fromNodes.reduce((sum, f) => sum + valueAt(f.id, to), 0);
  const grand = fromNodes.reduce((sum, f) => sum + rowTotal(f.id), 0);

  return (
    <table data-slot="sankey-table" className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {/* The corner cell names BOTH axes, which is the one thing a
              two-way table cannot say anywhere else: without it a reader
              meeting "Issue" as a row header and "Issue" as a column header
              has no way to tell which is the before and which the after. */}
          <th scope="col">
            {fromHeader} / {toHeader}
          </th>
          {toNodes.map((t) => (
            <th key={t.id} scope="col">
              {t.label}
            </th>
          ))}
          <th scope="col">{totalHeader}</th>
        </tr>
      </thead>
      <tbody>
        {fromNodes.map((f) => (
          <tr key={f.id}>
            <th scope="row">{f.label}</th>
            {toNodes.map((t) => (
              <td key={t.id}>{format(valueAt(f.id, t.id))}</td>
            ))}
            <td>{format(rowTotal(f.id))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">{totalHeader}</th>
          {toNodes.map((t) => (
            <td key={t.id}>{format(columnTotal(t.id))}</td>
          ))}
          <td>{format(grand)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/* ----------------------------------------------------------------------------
   One column of labelled bars.

   HTML, not SVG, and that is load-bearing: the ribbon field is drawn in a
   coordinate space stretched to the container (see the render below), and
   text inside a stretched viewBox comes out stretched with it. So every
   glyph in this drawing is an ordinary DOM node at an ordinary type step, and
   only the ribbons live in the SVG.
   ------------------------------------------------------------------------- */
function Column(props: {
  side: SankeySide;
  bands: Band[];
  format: (value: number) => string;
}) {
  const { side, bands, format } = props;
  const start = side === "from";

  return (
    <div data-slot={`sankey-column-${side}`} className="relative h-full min-w-0">
      {bands.map((band) => (
        <div
          key={band.node.id}
          data-slot="sankey-node"
          style={{ top: `${String(band.top)}%`, height: `${String(band.height)}%` }}
          className={cn(
            "absolute start-0 end-0 flex items-center gap-2",
            /* The label reads outward from the ribbon field: on the left it
               is name-then-count with the bar hard against the ribbons, on
               the right the bar comes first and the count leads the name.
               That is the client's own reference — `Issue 149` on the left,
               `71 Issue` on the right — and it is also what puts both counts
               nearest the picture they belong to. */
            start ? "flex-row justify-end" : "flex-row-reverse justify-end",
          )}
        >
          {/* LONG LABELS CANNOT LEAVE THE BOX OR REACH THE RIBBONS. The
              column is a bounded grid track, the name is the only thing
              allowed to shrink, and it truncates rather than wrapping —
              wrapping would push a two-line name outside a band that may be
              one line tall and straight into its neighbour. The whole name
              survives in `title` for a pointer and in the hidden table for
              everyone else, so truncation costs presentation and never
              information. */}
          <span
            title={band.node.label}
            className={cn(
              "min-w-0 truncate text-caption text-ink-secondary",
              start ? "text-end" : "text-start",
            )}
          >
            {band.node.label}
          </span>
          <span className="shrink-0 text-caption tabular-nums text-ink-tertiary">
            {format(band.value)}
          </span>
          <div
            aria-hidden="true"
            /* A DATA colour, so it is an inline style and cannot be a named
               utility: there is no class per datum. Not the arbitrary-ground
               trap `record-detail.tsx` documents — that one is tailwind-merge
               filing an arbitrary `bg` and a named `bg` in one group and
               dropping one of them, and an inline style has no merge group at
               all. */
            style={{ background: band.colour }}
            className="h-full w-3 shrink-0 rounded-[var(--radius-bar)]"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * One population under two categorisations, with the movement between them
 * drawn as ribbons.
 *
 * TEN STATES
 *  1. default        — two columns of labelled bars and a ribbon between
 *                      every pair that moved.
 *  2. hover          — the readout card over the ribbon under the pointer.
 *                      That IS the hover: nothing dims, nothing washes, and
 *                      no other ribbon fades out. Fading the rest would be an
 *                      opacity used as a state, which is a rejection. With
 *                      `interactive={false}` there is no hover at all, on
 *                      purpose.
 *  3. focus-visible  — tokens.css §8's one ring, on the flow's own button, at
 *                      the band's own shape — so tabbing lights up the ribbon
 *                      it belongs to and `HoverCard` opens its readout on the
 *                      same gesture. This is the state `chart.tsx` and
 *                      `donut.tsx` both had to log as missing (GAPS-COL1
 *                      CHT-5); it is answered here rather than logged again.
 *  4. active/pressed — the flow's button, when `onSelectFlow` is given. With
 *                      no handler the button still exists and still opens the
 *                      readout, because reading the number IS its job.
 *  5. disabled       — does not apply. A figure cannot be unavailable; a
 *                      caller who must not let a flow be pressed passes no
 *                      handler, or `interactive={false}`.
 *  6. loading        — `loading`: a card `Skeleton` at the plot's own height,
 *                      so nothing reflows when the matrix lands.
 *  7. empty          — TWO different nothings, and they are not the same
 *                      picture. No categories at all (or `empty`): the quiet
 *                      register stands in for the plot, because a flow chart
 *                      with no categories has no axes to draw. Categories but
 *                      no movement: the columns ARE drawn, with their labels
 *                      and their zeros, and the register's words sit under
 *                      them — what is known is shown, and only what is
 *                      unknown is spoken.
 *  8. error          — `error`: the poppy-dot register. Beats both empties.
 *  9. selected       — does not apply. The figure holds no selection of its
 *                      own; `onSelectFlow` reports a press and the call site
 *                      decides what that means.
 * 10. read-only      — always. Nothing here is edited.
 *
 * THREE BREAKPOINTS
 *  mobile   — UNCHANGED in structure, narrower in fact: the two label tracks
 *             are capped at 12rem and shrink from there, and the names
 *             truncate. No restack, because the whole content of this shape
 *             is the horizontal movement from one column to the other — a
 *             Sankey stacked vertically is not a smaller Sankey, it is a
 *             different chart, and a primitive may not become a different
 *             chart on a narrow screen.
 *  tablet   — UNCHANGED.
 *  desktop  — UNCHANGED. Width comes from the parent, height from `height`.
 *
 * RTL — safe, and the mirroring is real rather than accidental: every inset
 * is logical, the columns are grid tracks in DOM order, and the ribbon field
 * is a plain SVG whose own x axis mirrors with the document. Nothing here
 * names a physical side. RTL itself remains out of scope (2026-08-22).
 */
const Sankey = React.forwardRef<HTMLElement, SankeyProps>(
  (
    {
      className,
      nodes,
      flows,
      height = "20rem",
      fromTitle,
      toTitle,
      selfFlow = "quiet",
      interactive = true,
      onSelectFlow,
      formatValue,
      formatFlow,
      formatShare,
      loading = false,
      error = false,
      empty = false,
      loadingState,
      emptyState,
      errorState,
      unrecordedState,
      loadingLabel = "Loading…",
      emptyLabel = "Nothing here",
      emptyBody = "There is nothing to compare for this period.",
      errorLabel = "Figures unavailable",
      errorBody = "We can’t show this right now. Try again in a moment.",
      unrecordedLabel = "Nothing recorded",
      unrecordedBody = "No movement between these categories has been recorded yet.",
      label,
      caption,
      tableCaption = "The same figures as a table",
      fromHeader = "From",
      toHeader = "To",
      totalHeader = "Total",
      ...props
    },
    ref,
  ) => {
    const allNodes = nodes ?? [];
    const format = formatValue ?? ((v: number) => String(v));

    const declared = new Set(allNodes.map((n) => n.id));
    const colourOf = (node: SankeyNode) => {
      const index = allNodes.findIndex((n) => n.id === node.id);
      return node.color ?? NODE_COLOURS[Math.max(0, index) % NODE_COLOURS.length];
    };

    /* Coalesce first, then drop. A pair named twice is one ribbon carrying
       the sum — two ribbons between the same two nodes would stack against
       each other and read as a distinction the data does not contain — and a
       pair naming an id that is not declared is dropped, because it can
       neither be drawn nor named.

       Derived in the render body rather than memoised. The whole layout is a
       handful of categories against a handful of flows, and a memo keyed on
       two array props — which a call site almost always rebuilds inline —
       would recompute on every render anyway while costing a dependency list
       somebody has to keep true. `chart.tsx` and `donut.tsx` both derive in
       the body for the same reason. */
    const merged = new Map<string, SankeyFlow>();
    for (const f of flows ?? []) {
      if (!declared.has(f.from) || !declared.has(f.to)) continue;
      if (!(f.value > 0)) continue;
      const key = `${f.from}::${f.to}`;
      const seen = merged.get(key);
      merged.set(key, seen ? { ...seen, value: seen.value + f.value } : { ...f });
    }
    const clean = [...merged.values()];

    const total = clean.reduce((sum, f) => sum + f.value, 0);

    const state = loading
      ? "loading"
      : error
        ? "error"
        : allNodes.length === 0 || empty
          ? "empty"
          : total === 0
            ? "unrecorded"
            : "default";

    const drawn = state === "default" || state === "unrecorded";

    const fromBands = drawn ? stack("from", allNodes, clean, colourOf) : [];
    const toBands = drawn ? stack("to", allNodes, clean, colourOf) : [];

    const fromNodes = fromBands.map((b) => b.node);
    const toNodes = toBands.map((b) => b.node);

    const valueAt = (from: string, to: string) =>
      clean.find((f) => f.from === from && f.to === to)?.value ?? 0;

    /* ---- the ribbons -------------------------------------------------- */

    const ribbons: Ribbon[] = [];
    if (state === "default") {
      /* Slice each band once, in the counterpart column's order, and keep the
         two maps side by side. Doing it per band rather than per flow is what
         guarantees a node's ribbons exactly fill its bar with no seam. */
      const fromSlices = new Map<string, Map<string, Slice>>();
      for (const band of fromBands) {
        const keys = toNodes.map((t) => t.id).filter((t) => valueAt(band.node.id, t) > 0);
        fromSlices.set(band.node.id, cut(band, keys, (t) => valueAt(band.node.id, t)));
      }
      const toSlices = new Map<string, Map<string, Slice>>();
      for (const band of toBands) {
        const keys = fromNodes.map((f) => f.id).filter((f) => valueAt(f, band.node.id) > 0);
        toSlices.set(band.node.id, cut(band, keys, (f) => valueAt(f, band.node.id)));
      }

      for (const band of fromBands) {
        const outgoing = band.value;
        for (const t of toNodes) {
          const value = valueAt(band.node.id, t.id);
          if (value <= 0) continue;
          const source = fromSlices.get(band.node.id)?.get(t.id);
          const target = toSlices.get(t.id)?.get(band.node.id);
          if (!source || !target) continue;

          ribbons.push({
            key: `${band.node.id}::${t.id}`,
            colour: band.colour,
            detail: {
              from: band.node.id,
              to: t.id,
              fromLabel: band.node.label,
              toLabel: t.label,
              value,
              shareOfSource: outgoing > 0 ? Math.round((value / outgoing) * 100) : 0,
              self: band.node.id === t.id,
            },
            y0: source.top,
            y1: source.bottom,
            y2: target.top,
            y3: target.bottom,
            weight: Math.min(source.bottom - source.top, target.bottom - target.top),
          });
        }
      }
    }

    /* RULING 2 — thickest first, thinnest last, on each ribbon's NARROWEST
       end. Both the paths and the buttons over them walk this one array, in
       this one order, so what is drawn on top is also what the pointer
       reaches. The array is still copied rather than sorted in place: sorting
       `ribbons` would mutate the order the layout above built it in, which is
       the counterpart column's order and is what keeps a node's own ribbons
       from crossing each other for no reason. */
    const painted = [...ribbons].sort((a, b) => b.weight - a.weight);

    const readout = (d: SankeyFlowDetail) =>
      formatFlow ? formatFlow(d) : `${d.fromLabel} → ${d.toLabel}: ${format(d.value)}`;
    const share = (d: SankeyFlowDetail) =>
      formatShare ? formatShare(d) : `${String(d.shareOfSource)}% · ${d.fromLabel}`;

    /* ---- the registers ------------------------------------------------ */

    const register =
      state === "loading" ? (
        (loadingState ?? <Skeleton variant="card" label={loadingLabel} className="h-full" />)
      ) : state === "error" ? (
        (errorState ?? (
          <CollectionRegister tone="error" eyebrow={errorLabel} body={errorBody} />
        ))
      ) : state === "empty" ? (
        (emptyState ?? (
          <CollectionRegister tone="quiet" eyebrow={emptyLabel} body={emptyBody} />
        ))
      ) : null;

    return (
      <figure
        ref={ref}
        data-slot="sankey"
        data-state={state}
        data-self-flow={selfFlow}
        aria-busy={loading || undefined}
        aria-label={label}
        className={cn("m-0 flex min-w-0 flex-col gap-[var(--space-3)]", className)}
        {...props}
      >
        {fromTitle !== undefined || toTitle !== undefined ? (
          <div
            data-slot="sankey-titles"
            /* The same three tracks the plot uses, so a heading sits over the
               column it names at every width. The middle track is where the
               ribbons run and carries nothing. */
            className="grid min-w-0 items-baseline gap-[var(--space-3)] grid-cols-[minmax(0,12rem)_minmax(4rem,1fr)_minmax(0,12rem)]"
          >
            <span className="min-w-0 truncate text-end text-micro uppercase tracking-[var(--tracking-eyebrow)] font-[var(--font-weight-medium)] text-ink-tertiary">
              {fromTitle}
            </span>
            <span aria-hidden="true" />
            <span className="min-w-0 truncate text-start text-micro uppercase tracking-[var(--tracking-eyebrow)] font-[var(--font-weight-medium)] text-ink-tertiary">
              {toTitle}
            </span>
          </div>
        ) : null}

        <div style={{ height }} className="min-w-0">
          {register}

          {drawn ? (
            <div className="grid h-full min-w-0 gap-[var(--space-3)] grid-cols-[minmax(0,12rem)_minmax(4rem,1fr)_minmax(0,12rem)]">
              <Column side="from" bands={fromBands} format={format} />

              <div data-slot="sankey-field" className="relative h-full min-w-0">
                {/* THE PICTURE, AND ONLY THE PICTURE. `aria-hidden`, because
                    every number in it is carried by the table below and by
                    the buttons over it; a screen reader meeting the paths as
                    well would be told everything twice.

                    `preserveAspectRatio="none"` stretches this 100x100 space
                    to whatever the middle track is, which is exactly what
                    makes the y coordinates here and the CSS percentages in
                    the columns beside it the SAME NUMBER. The cost is a
                    non-uniform scale, and it is paid for on the one thing it
                    would spoil: the edge stroke opts out of the transform. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full overflow-visible"
                >
                  {painted.map((r) => {
                    const quiet = r.detail.self && selfFlow === "quiet";
                    return (
                      <path
                        key={r.key}
                        data-slot="sankey-ribbon"
                        data-self={r.detail.self ? "true" : undefined}
                        d={ribbonPath(r)}
                        fill={mix(r.colour, quiet ? SELF_MIX : RIBBON_MIX)}
                        /* RULING 2 — the mark's own edge, so a thin ribbon
                           crossing a thick one of the same hue is still
                           findable. The muted diagonal deliberately has
                           none: it is the ribbon that should recede. */
                        stroke={quiet ? "none" : mix(r.colour, RIBBON_EDGE_MIX)}
                        strokeWidth={EDGE_WIDTH}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </svg>

                {/* THE CONTROLS, one per flow, each sitting exactly over its
                    own band, and in THE SAME ORDER AS THE PATHS ABOVE.

                    That is a fix, not a coincidence: these are positioned
                    siblings with no z-index, so the LAST one wins the pointer,
                    exactly as the last path wins the paint. Built the other
                    way round first, and it put every thin ribbon's control
                    UNDER the thick one crossing it — so the ribbon you could
                    see was never the one you could reach. Measured on
                    verify/sankey before it was believed. Keeping one order for
                    both is the only arrangement where what you point at is
                    what you looked at, and it makes the tab sequence run
                    biggest flow to smallest, which is also the order somebody
                    reads the picture in. */}
                {interactive && state === "default" ? (
                  <div className="absolute inset-0">
                    {painted.map((r) => {
                      const top = (r.y0 + r.y2) / 2;
                      const bottom = (r.y1 + r.y3) / 2;
                      const d = r.detail;
                      return (
                        <HoverCard key={r.key} openDelay={120} closeDelay={80}>
                          <HoverCardTrigger asChild>
                            <button
                              type="button"
                              data-slot="sankey-flow"
                              data-self={d.self ? "true" : undefined}
                              /* The accessible name IS the readout, so the
                                 card's content is a second telling for a
                                 sighted reader rather than the only one. A
                                 name that said "flow 7 of 16" would make the
                                 keyboard route useless. */
                              aria-label={readout(d)}
                              onClick={onSelectFlow ? () => { onSelectFlow(d); } : undefined}
                              style={{
                                top: `${String(top)}%`,
                                height: `${String(Math.max(0, bottom - top))}%`,
                              }}
                              className={cn(
                                /* Centred on the ribbon field's waist, where
                                   every ribbon is at its own midpoint and the
                                   bands are furthest from their neighbours.
                                   The width is a share of the track, so it
                                   holds at any measure. */
                                "absolute start-[41%] w-[18%]",
                                /* The reset, WITHOUT a font shorthand: an
                                   arbitrary font property is emitted after
                                   the named utilities and would outrank a
                                   type step set anywhere inside. There is no
                                   text in here anyway — the name is the
                                   label. */
                                "border-0 bg-transparent p-0",
                                "rounded-[var(--radius-bar)]",
                                onSelectFlow ? "cursor-pointer" : "cursor-default",
                              )}
                            />
                          </HoverCardTrigger>
                          <HoverCardContent
                            data-slot="sankey-readout"
                            className="w-auto max-w-[18.75rem]"
                          >
                            <p className="m-0 flex items-center gap-2 text-caption text-ink-secondary">
                              <span
                                aria-hidden="true"
                                /* 9 — the chart-key dot `chart.tsx`'s legend,
                                   `donut.tsx` and `tiles.tsx` all already
                                   draw at. Nothing invents a second size for
                                   the same idea. Data colour, so an inline
                                   style; see the node bar above. */
                                style={{ background: r.colour }}
                                className="size-[0.5625rem] shrink-0 rounded-pill"
                              />
                              <span className="min-w-0">{readout(d)}</span>
                            </p>
                            <p className="m-0 pt-1 text-caption tabular-nums text-ink-tertiary">
                              {share(d)}
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <Column side="to" bands={toBands} format={format} />
            </div>
          ) : null}
        </div>

        {/* THE NOTHING-RECORDED CASE. The columns above are already drawn with
            their labels and their zeros; this says the part the picture
            cannot. An empty box in place of the whole figure would throw away
            the categories, which are known. */}
        {state === "unrecorded"
          ? (unrecordedState ?? (
              <CollectionRegister tone="quiet" eyebrow={unrecordedLabel} body={unrecordedBody} />
            ))
          : null}

        {/* The textual equivalent. Drawn whenever there is anything to say
            about — including the nothing-recorded case, where the table's
            zeros are themselves the answer. */}
        {drawn ? (
          <MatrixTable
            caption={tableCaption}
            fromHeader={fromHeader}
            toHeader={toHeader}
            totalHeader={totalHeader}
            fromNodes={fromNodes}
            toNodes={toNodes}
            valueAt={valueAt}
            format={format}
          />
        ) : null}

        {/* Last child, because a `figcaption` must be the first or the last,
            and the client's own reference puts the sentence underneath. */}
        {caption !== undefined ? (
          <figcaption className="text-caption text-ink-secondary">{caption}</figcaption>
        ) : null}
      </figure>
    );
  },
);

Sankey.displayName = "Sankey";

export { Sankey };
