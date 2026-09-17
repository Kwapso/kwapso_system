/* ============================================================================
   TrailLine — back, forward, then the text trail. The thing a reader would
   actually call "the breadcrumbs" (0 direct call sites yet; the node
   `ScreenShell`'s `trail` slot is handed, now rendered INSIDE the content
   card as its first row — see that prop's own doc for the geometry).

   CLIENT RULING, 17 SEP 2026 MORNING, VERBATIM, TWO SENTENCES AND EACH WAS
   A HALF OF THIS FILE:

     "the breadcrumbs should sit in the background, outside the container,
      on top, and on the very far left, have a back and forward arrow."

   was `ScreenShell`'s half — where this component's OUTPUT stood relative to
   the card. SUPERSEDED THE SAME DAY, AFTERNOON, VERBATIM: "I love the
   direction that we are going, but put the breadcrumbs and the navigation
   inside the container." That ruling moves the whole slot INSIDE the card —
   argued at `ScreenShell`'s own `trail` prop, not here. "On the very far
   left" is UNCHANGED by either ruling — the arrows still lead the row — and
   neither ruling touches the second sentence:

     "Yes to Chrome navigation, push the trail on a rail pick."

   which remains THIS file's whole shape, spelled out at `steps`/`cursor`
   below. "Chrome navigation" means the two arrows move a CURSOR through a
   history that already exists — they do not create steps, they revisit them,
   exactly as a browser's back/forward buttons do and exactly why this file
   draws none of its own history: `steps` and `cursor` are handed in, already
   ordered, and this component reads them. "Push the trail on a rail pick"
   is the other half of that model, spelled out at `steps`/`cursor` below:
   a rail pick is a PUSH (append after the cursor, drop anything that was
   ahead of it), not an edit of the array in place — that is the call site's
   own job, because this component owns no state to do it with.

   WHY THIS IS A THIRD FILE IN `components/breadcrumbs/`, RATHER THAN A
   FOURTH DRAWING SOMEWHERE ELSE. `breadcrumbs.tsx`'s own header states the
   boundary this folder already keeps: `breadcrumb/` is the composable SEVEN
   PARTS, `Breadcrumbs` (this folder) is the ONE-PROP wrapper over them, and
   nothing outside this folder imports `collapse()` — "the two files that do
   are the two forms of the same trail." This file is the third form, for one
   reason neither of the first two can serve: `Breadcrumbs`' items carry a
   label and an optional `href` and nothing else, so a crumb with no route
   renders as inert text (`BreadcrumbPage` / the non-link `BreadcrumbPage`
   branch) — right for an ancestor with no page, wrong for a rail pick that
   has no URL at all but must still be pressable. `onJump` needs every
   earlier step to be a real, focusable control whether or not it carries an
   `href`, which is one more affordance than the sealed one-prop form takes a
   view on. So this file reaches one layer down, to the SAME primitives
   `Breadcrumbs` is built from (`components/breadcrumb/breadcrumb.tsx`) and
   the SAME fold rule (`collapse()`, imported from `./breadcrumbs` rather than
   re-derived), and wires the one thing neither of those two decide: what
   happens on click. Everything a reader can see — the ink, the weight, the
   ellipsis, the ordering — is unchanged from what `<Breadcrumbs>` already
   draws; only the click handler is new.

   THE ARROWS ARE THIS FILE'S OWN — a borderless pill, `--control-height-pill`
   (26), the neutral hover wash, never mango (ruling 26: mango is a brand
   fill, never a hover, never a status). Disabled is ink-only, `cursor-not-
   allowed` plus a named token — see the ink paragraph below for why no fill
   is added on top of it.

   THIS COMPONENT NOW LIES ON PAPER, NOT ON THE GROUND — the afternoon
   ruling moved the whole slot inside the card, and the card's own surface is
   paper (`CARD`'s own `bg-[var(--surface-raised)] text-foreground`,
   `compositions/templates/screen-shell.tsx`), not the spine. So every ink
   here REVERTS to the PAPER LADDER `breadcrumb/breadcrumb.tsx` already
   draws on its own, unedited: `--foreground` for the current step
   (`BreadcrumbPage`), `--ink-tertiary` for quiet earlier steps
   (`BreadcrumbList`'s own base, inherited by everything under it that names
   no ink of its own), and this file's own arrows follow the same ladder —
   `--foreground` at rest, `--ink-disabled` when there is nowhere to go (see
   the ARROW paragraph below).

   THIS FILE NO LONGER REBINDS EITHER CUSTOM PROPERTY. The v1.2.104 build
   rebound `--foreground` and `--ink-tertiary` to `--spine-ink` on this
   component's own root, because it stood on the spine ground and the
   unedited primitive would have disappeared there — confirmed wrong before
   that rebind existed: the first build of this file drew `text-ink-tertiary`
   on the ground with no rebind at all and the trail nearly disappeared on
   the mango spine, `verify/trail-line/` at the time showing the ARROWS in
   the identical off-token grey. On paper the primitive's own defaults are
   already correct — a card's off-beige is exactly what
   `breadcrumb/breadcrumb.tsx` was built for — so the rebind is dead weight
   now and this file deletes it rather than carry a no-op forward.

   THE CLIENT'S "NEVER GREY NAV TEXT" RULE STILL HOLDS, NARROWED TO WHERE IT
   APPLIES. Verbatim, `rail.tsx`'s own correction: "nav text should ALWAYS be
   either pure black or pure white — never gray — depending on what it sits
   on." That rule was never "no grey ever" — it was "no grey nav text ON THE
   SPINE," `rail.tsx`'s own ground, which is why `rail.tsx`'s `ROW_IDLE`
   moved off `--spine-ink-quiet` to `--spine-ink` outright and carried the
   quiet/current distinction on WEIGHT instead. This trail's text no longer
   sits on the spine at all — it sits on the card's off-beige, exactly where
   `--ink-tertiary` IS the correct quiet ink and where the rule does not
   reach. "Last item current (bold ink), earlier items quiet" is still
   carried by WEIGHT, never by colour — `BreadcrumbPage`'s existing
   `font-[var(--font-weight-medium)]` against `BreadcrumbLink`'s inherited
   light body weight — because that half of the rule was never spine-
   specific and still holds on paper exactly as it held on the ground.

   THE ARROWS' OWN DISABLED STATE now reads `--ink-disabled` — the PANEL
   ladder's own named disabled ink (`--btn-disabled-label` resolves to it) —
   still ink-only, `cursor-not-allowed`, and NOT filled, the same restraint
   `rail.tsx`'s `ROW_BLOCKED` argued when this file stood on the spine and
   read `--spine-ink-disabled` for the identical reason: a borderless
   control never had a fill to begin with, and inventing one to satisfy the
   letter of RULES.md §2.3's fill-plus-ink pair (`--btn-disabled-fill` /
   `--btn-disabled-label`, written for buttons) would put a stray disc where
   this control has never had one. The rule's actual target — no opacity
   standing in for a state — is still honoured: `--ink-disabled` is a named
   token in every palette, distinguishable from `--foreground` in both
   themes.

   THE LAW THIS FILE OBEYS
   · Colour from tokens only, R32's closed palette. No hex, no `rgb()`, no
     opacity standing in for a disabled or hover state.
   · Every user-facing string is a prop with a default — `backLabel`,
     `forwardLabel`, the landmark's `label`, the ellipsis's own
     `ellipsisLabel`. Arabic, Urdu, Persian.
   · The row never wraps. `BreadcrumbList`'s own default is `flex-wrap` — a
     deliberate choice at THAT primitive, argued at its own file, for a bare
     trail with nothing beside it. This row is no longer bare: two arrows
     lead it, and a wrapped second line would run under them rather than
     beside them. `flex-nowrap` overrides it here; the shortening lever stays
     `maxItems`, unchanged from `breadcrumbs.tsx`.
   · Disabled is a named token, never an opacity (§2.3's actual prohibition;
     see the ink paragraph above for why this file's disabled state carries
     no fill). A control with nowhere to go is `disabled`, not `aria-
     disabled` alone, so it also leaves the tab order the way a real
     disabled control should.
   · No product vocabulary (§9.5). `steps`, not `pages` or `records`.

   RENDERING CONTEXT
   `"use client"` — `onBack`/`onForward`/`onJump` are event handlers, so this
   cannot be a server component the way `Breadcrumbs` and `breadcrumb/` are.
   ========================================================================= */

"use client";

import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../breadcrumb/breadcrumb";
import { collapse } from "./breadcrumbs";
import { CaretLeft, CaretRight } from "../../foundations/icons";
import { cn } from "../../lib/utils";

/** One step in the trail — a place the reader has been, or could go back to. */
export interface TrailStep {
  /** What the step says. A node, so an icon may ride along with the text. */
  label: React.ReactNode;
  /**
   * Where it goes, if it is a real route. Omitted steps are still pressable
   * — see `onJump` — they just render no `href` of their own, the way a
   * rail's own internal views often have no URL at all.
   */
  href?: string;
  /** A stable key, when two steps share a label. Falls back to the index. */
  key?: string;
}

export interface TrailLineProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  /**
   * THE WHOLE HISTORY, root first, in the order it was visited — NOT only the
   * path to where you are. "Chrome navigation" keeps everything the reader
   * has pushed, past `cursor` included, so `onForward` has somewhere to go
   * after a `onBack`. A rail pick PUSHES: the call site appends a new step
   * after `cursor` and drops whatever followed it, the same way a browser
   * discards forward history the moment you navigate somewhere new from a
   * back state. This component never mutates the array itself — it has
   * nowhere to keep that state and no business owning it.
   */
  steps: TrailStep[];
  /**
   * WHICH step is "here" — the index into `steps` the trail renders as the
   * current, bold-ink crumb. Everything at and before it is the VISIBLE
   * trail (root … here); everything after it exists only so `onForward` has
   * somewhere to land and is not drawn as a crumb, the same way a browser's
   * forward history is not painted into its address bar.
   */
  cursor: number;
  /** Move the cursor one step back. Omitted or already at 0: no control. */
  onBack?: () => void;
  /** Move the cursor one step forward. Omitted or already at the end: no control. */
  onForward?: () => void;
  /**
   * An earlier crumb was pressed — `index` is its position in `steps`. Fires
   * whether or not that step carries an `href`, which is the one thing
   * `Breadcrumbs`' own `items` cannot do (see the file header). A call site
   * wiring real routes can ignore this and let `href` do the navigating; a
   * rail with no URLs at all has nothing else to listen for.
   */
  onJump?: (index: number) => void;
  /** Accessible name for the Back control. A prop because it is announced. */
  backLabel?: string;
  /** Accessible name for the Forward control. A prop because it is announced. */
  forwardLabel?: string;
  /** The trail's landmark name, forwarded to `Breadcrumb`. */
  label?: string;
  /**
   * Fold the middle once the VISIBLE trail (root … cursor) is longer than
   * this. Defaults to 4 — `breadcrumb-folders.tsx`'s own `FOLD_AFTER`, so a
   * trail does not fold at one count in the strip above it and another in
   * the line below it.
   */
  maxItems?: number;
  /** What the elision announces. Defaults to `BreadcrumbEllipsis`'s own English. */
  ellipsisLabel?: string;
}

/* Matches `breadcrumb-folders.tsx`'s `FOLD_AFTER` — one fold rule for both
   drawings of the trail, not two numbers that happen to agree today. */
const FOLD_AFTER = 4;

/* ----------------------------------------------------------------------------
   THE ARROWS.

   A borderless pill at `--control-height-pill`, PAPER ink throughout since
   the afternoon ruling moved this component off the spine (see the file
   header for the full argument) — `--foreground` at rest, `--ink-disabled`
   when there is nowhere to go — the neutral hover wash — `--accent` is a
   fixed charcoal/off-beige alpha (RULES.md §2.5) rather than a spine token,
   and composites visibly over any of the three grounds, so it needs no
   rebind of its own. `enabled:` is safe here (unlike on a link) because this
   is a real `<button>` — §5.2 only traps `enabled:` on an element that can
   render as `<a>`. -------------------------------------------------------- */
const ARROW = cn(
  "inline-grid shrink-0 place-content-center",
  "size-[var(--control-height-pill)] shrink-0",
  "cursor-pointer appearance-none rounded-pill border-0 bg-transparent",
  "text-[var(--foreground)]",
  "enabled:hover:bg-accent",
  "transition-colors duration-[var(--duration-colour)] ease-kwapso",
  // Ink-only, no fill — see the file header's `rail.tsx` ROW_BLOCKED
  // paragraph for why a control with no resting fill gets none on disabled
  // either. Emitted last so tailwind-merge drops the resting ink rather than
  // leaving the two to fight over stylesheet order.
  "disabled:cursor-not-allowed disabled:text-[var(--ink-disabled)]",
);

/**
 * Back/forward arrows plus the text trail.
 *
 * TEN STATES
 *  1. default        — root … here, separators between, arrows leading.
 *  2. hover          — the arrows take the neutral `--accent` wash; a
 *                      pressable crumb takes `breadcrumb/breadcrumb.tsx`'s
 *                      own `.kw-link` underline. Ink does not move on hover
 *                      — see the file header's "never grey" paragraph — so
 *                      the underline (crumbs) and the wash (arrows) are the
 *                      whole hover signal, not a colour change on top.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *  4. active/pressed — does not apply; every control here is a borderless
 *                      pill or a trail link, and neither nudges on press.
 *  5. disabled       — an arrow with nowhere to go: `disabled`,
 *                      `--ink-disabled`, no fill, no hover (`enabled:`
 *                      guarded). `steps: []` renders no trail at all, only
 *                      the (both disabled) arrows.
 *  6. loading        — does not apply. A trail is known before the screen it
 *                      describes; there is nothing here to wait for.
 *  7. empty          — `steps: []` renders both arrows disabled and no
 *                      `Breadcrumb` landmark at all — not an empty `<nav>`.
 *  8. error          — does not apply. A trail reports nothing.
 *  9. selected       — the crumb at `cursor`: `BreadcrumbPage`, medium
 *                      weight, `aria-current="page"`, `--foreground` (see the
 *                      file header — the paper ladder, not the spine's).
 *                      Every earlier crumb is quiet BY WEIGHT and pressable
 *                      (`--ink-tertiary`); nothing after `cursor` is drawn.
 * 10. read-only      — the arrows are controls; the trail is not, per
 *                      `breadcrumb/breadcrumb.tsx`'s own read-only ruling.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. The row never wraps (`flex-nowrap`
 *  on `BreadcrumbList`, overriding that primitive's own default); the
 *  shortening lever is `maxItems`, a content decision, not a width one —
 *  the same argument `breadcrumbs.tsx` already makes for its own `maxItems`.
 *
 * RTL — safe. `CaretLeft`/`CaretRight` read as "back"/"forward" in the
 * direction the trail is written; RTL is out of scope by client decision
 * (`docs/RULES.md` §7.3) and this component invents no mirror ahead of it.
 */
const TrailLine = React.forwardRef<HTMLDivElement, TrailLineProps>(
  (
    {
      steps,
      cursor,
      onBack,
      onForward,
      onJump,
      backLabel = "Back",
      forwardLabel = "Forward",
      label = "Breadcrumb",
      maxItems = FOLD_AFTER,
      ellipsisLabel,
      className,
      ...props
    },
    ref,
  ) => {
    const canGoBack = cursor > 0;
    const canGoForward = cursor < steps.length - 1;
    // The VISIBLE trail is root … cursor. Anything after cursor is history
    // `onForward` can reach but the crumb line never draws — see `cursor`.
    const visible = steps.slice(0, Math.max(cursor + 1, 0));
    const lastVisible = visible.length - 1;

    const items = visible.map((step, index) => ({
      label: step.label,
      href: step.href,
      key: step.key ?? String(index),
    }));
    const rendered = collapse(items, maxItems);

    return (
      <div
        ref={ref}
        data-slot="trail-line"
        className={cn(
          "flex min-w-0 items-center gap-[var(--space-2)]",
          // NO REBIND HERE ANY MORE — see the file header. This component now
          // stands on the card's own paper, where `breadcrumb/breadcrumb.tsx`
          // already reads `--foreground` / `--ink-tertiary` correctly on its
          // own, unedited. The v1.2.104 spine rebind lived on this exact line
          // and is deleted, not merely unused.
          className,
        )}
        {...props}
      >
        <div className="flex shrink-0 items-center gap-[var(--space-1)]">
          <button
            type="button"
            data-slot="trail-line-back"
            className={ARROW}
            onClick={onBack}
            disabled={!canGoBack}
            aria-label={backLabel}
          >
            <CaretLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-slot="trail-line-forward"
            className={ARROW}
            onClick={onForward}
            disabled={!canGoForward}
            aria-label={forwardLabel}
          >
            <CaretRight size={16} aria-hidden="true" />
          </button>
        </div>

        {visible.length === 0 ? null : (
          <Breadcrumb label={label} className="min-w-0 flex-1 overflow-hidden">
            <BreadcrumbList className="flex-nowrap overflow-hidden">
              {rendered.map((entry, position) => {
                const key =
                  entry.kind === "gap" ? "trail-line-gap" : (items[entry.index]?.key ?? entry.index);
                const isCurrent = entry.kind === "item" && entry.index === lastVisible;

                return (
                  <React.Fragment key={key}>
                    {position > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem className={isCurrent ? "min-w-0" : undefined}>
                      {entry.kind === "gap" ? (
                        <BreadcrumbEllipsis label={ellipsisLabel} />
                      ) : isCurrent ? (
                        <BreadcrumbPage>{entry.item.label}</BreadcrumbPage>
                      ) : entry.item.href ? (
                        <BreadcrumbLink
                          href={entry.item.href}
                          onClick={() => onJump?.(entry.index)}
                        >
                          {entry.item.label}
                        </BreadcrumbLink>
                      ) : (
                        // No route to weld to — still pressable, via `asChild`
                        // over a real `<button>` rather than an `<a href="#">`
                        // that would go nowhere and dirty the address bar.
                        <BreadcrumbLink asChild>
                          <button type="button" onClick={() => onJump?.(entry.index)}>
                            {entry.item.label}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    );
  },
);

TrailLine.displayName = "TrailLine";

export { TrailLine };
