/* ============================================================================
   RecordDetail — the four-region record anatomy (0 direct call sites, and
   "applies to 14 screens" per commission §9.1).

   DESIGN SOURCE
   "Kwapso UI Kit.dc.html" → chapter 24, specimen 24.6 "Record chrome". Its
   caption is the whole brief and is quoted verbatim:

       "Four regions, in this order, on all sixteen record types: header
        band, sticky tab strip, opaque panel, audit footer."

   and the note under the specimen, also verbatim, settles the tones:

       "The header band is transparent — it takes the page tone, which is why
        its buttons are the other neutral. The panel below is opaque and
        carries the content. Permissions hide actions rather than disabling
        them, so a client never sees a button they can't press."

   The drawing, figure by figure, as read off the specimen's inline styles:
     · header band  — `display:flex; align-items:flex-start; gap:14px;
                       padding:0 4px 16px`, a 32 pill mark, an 18/500 title
                       over a 12.5 tertiary tabular meta, actions pushed to
                       the end with gap 8.
     · tab strip    — `align-items:flex-end; gap:4px; margin-bottom:-17px;
                       overflow-x:auto; scrollbar-width:none`, the ACTIVE tab
                       filled `--card` (the panel's own fill) and the rest
                       `--idle`, each with a 13 label and an 11 tabular count.
     · panel        — `background:var(--card); border-radius:24px;
                       padding:20px`, holding a 12/500/uppercase/0.08em
                       eyebrow over 14/1.5 secondary copy.
     · ink footer    — NOT chapter 24's wrapping audit line. See below: CH27.8
                       replaces it with the two-column charcoal card, and this
                       file drew 24.6's strip for weeks while quoting 27.8's
                       rule in this very header. Fixed 2026-08-23, DEF-1.

   REGION 4 IS CH27.8'S INK CARD. Verbatim, under its own heading "The footer
   is the ink card, two columns":

       "Every detail page ends with the charcoal #1A1918 card from the kit's
        record pattern: Latest activity on the left — a short reverse-
        chronological feed with an add-a-note field — and Record on the right,
        two to four key/value rows. It is a normal card in the flow, not
        sticky and not full-bleed, it appears once per record, and it does not
        change per tab. On dark, ink would sit almost on top of the page, so
        the card moves up to raised #26241F with a hairline — same two
        columns, same content."

   and CH27.8 fixes its place in the anatomy, also verbatim:

       "Facts strip, the record's own text, attachments, then the ink footer.
        That order never changes."

   THERE IS NO FACTS STRIP — 26.04 BEATS 27.8, OVERRIDE 49 (2026-08-23).
   26.04, verbatim: "There is no facts strip — a record's values belong in its
   body, not stacked above the tabs." It is the entry that DEFINES the detail
   page, and the same sentence carries the papers law the K1 reversal already
   took as binding, so it wins over 27.8's region list and over 27.8's "the
   facts strip does that job across the top". This component never drew one
   and must not grow one: there is no `facts` slot, and a record's values
   belong in `panel`. An ARTIFACT CORRECTION IS OWED against 27.8.

   THE FOOTER'S DRAWN VALUES, read off 27.8's own markup rather than its prose
   (the wide specimen first, the 380 specimen in brackets where it differs):

     · the card     — `background:var(--inv); color:var(--invfg);
                       border-radius:24px; padding:26px 30px;
                       display:grid;
                       grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
                       gap:32px`                       [`padding:18px 20px`,
                       `flex-direction:column; gap:14px`]
     · each eyebrow — `font-size:11px; font-weight:500; text-transform:
                       uppercase; letter-spacing:0.08em; color:var(--invfg2)`
                       — "Latest activity" and "Record"
     · each column  — `margin-top:12px`                          [`10px`]
     · a feed row   — `grid-template-columns:96px 1fr; gap:16px; padding:11px 0;
                       box-shadow:inset 0 -1px 0 var(--invhair)`, the when at
                       12/`--invfg2` and the line at 14
     · the note     — `height:38px; padding:0 16px; border:none;
                       border-radius:999px; background:#26241F;
                       box-shadow:inset 0 0 0 1px var(--invhair);
                       font-weight:300; font-size:13.5px; color:#FFFEF9`,
                       `placeholder="Add a note"`     [absent at 380]
     · a Record row — `display:flex; justify-content:space-between; gap:16px;
                       padding:9px 0;
                       box-shadow:inset 0 -1px 0 var(--invhair)` and the LAST
                       row drops the rule; label 13/`--invfg2`, value 13
                       tabular                        [`gap:12px; padding:8px 0`,
                       both at 12.5]

   Chapter 26 states what the footer is NOT, verbatim, and it is load-bearing:

       "It's an ink-filled card like any other card on the page — not fixed,
        not sticky, not full-bleed; it sits at the bottom of the tab body's
        normal document flow and scrolls away with the rest of the content.
        It appears once per detail page."

   FIVE PLACES THE DRAWING IS NOT COPIED, AND WHY
   1 · THE FEED ROW'S GEOMETRY IS `ActivityFeed`'S, NOT 27.8'S `96px 1fr`.
       OVERRIDE 18 (verify/decisions.html R2) already ruled on where a log's
       time sits — trailing, not leading — and built one row for CH18, 27.9,
       27.34 and this footer. `activity-feed.tsx` says so in its own header:
       "One answer applied here fixes 27.9, 27.34 and the record footer at
       once, which is why it is one component." So the feed is COMPOSED and
       27.8's leading time column is the side override 18 retired. Redrawing
       it here would reintroduce the second inbox that override exists to
       prevent.
   2 · `padding:26px 30px` AND `padding:9px 0` ARE OFF RULING 28'S LADDER.
       Neither 26, 30 nor 9 is a step or a half-step. The 380 specimen's own
       figures ARE on it — 18 (`--space-4h`), 20 (`--space-5`), 8
       (`--space-2`) — so those are taken at the base width and the wide inset
       steps to the ladder's neighbours, 24 (`--space-6`) and 32
       (`--space-7`), which is `CardContent`'s own ladder. Logged, not
       silently rounded: GAPS-DEF1 Q1.
   3 · `260px` IS WRITTEN `16.25rem`. Every measure in this system is rem so
       it answers the text-size control (tokens.css §1); `folder.tsx` states
       the conversion base as 16. `kanban.tsx` and `gallery.tsx` set the same
       precedent for an auto-fit minimum.
   4 · THE WIDE SPECIMEN KEEPS A RULE UNDER ITS LAST FEED ROW AND THE NARROW
       ONE DROPS IT. Its own Record column drops it at both widths, and
       `ActivityFeed` drops it. The narrow specimen is followed at both
       widths; a trailing rule under the last row of a column is a hanging
       edge, not a separation. GAPS-DEF1 Q2.
   5 · NEITHER THE CARD NOR THE NOTE FIELD WEARS THE EDGE 27.8 DRAWS. This is
       the only one of the five that is not a reading of the drawing but a
       REVERSAL of it, made on the client's instruction of 2026-09-06. The
       chapter's dark clause ("raised #26241F with a hairline") keeps its fill
       and loses its hairline; 27.8's own `inset 0 0 0 1px var(--invhair)` on
       the note field goes with it, and the field's well is re-tuned to pay
       for it. Everything — what the chapter asked for, what she said, what
       was measured, and what is drawn now — is written out immediately above
       region 4 in the body of this file, next to the code, where somebody
       about to "restore" it will actually be standing. An artifact correction
       is owed. Drawn side by side in both palettes at verify/ink-footer.

   HOW THE CARD ANSWERS THE PALETTE — READ THIS BEFORE CHANGING A COLOUR
   CH27.8 asks for two DIFFERENT surfaces, and no single token held both:
   `--surface-inverse` is charcoal in light but flips to off-beige in dark,
   which is the whole reason the chapter writes a dark clause at all. This
   file used to state the pair inline with `light-dark()` and paint it with
   `bg-[var(--rd-footer-surface)]`. BOTH HALVES OF THAT ARE GONE, 2026-09-07:
   tokens.css §3 and §6/§7 now name the pair — `--surface-record-footer`,
   `--ink-on-record-footer`, `--ink-on-record-footer-secondary`,
   `--hair-record-footer`, `--surface-record-footer-well` — and this card
   paints its ground with the real utility `bg-surface-record-footer`.

   THE ARBITRARY BACKGROUND WAS NOT A STYLE PREFERENCE, IT WAS A BUG.
   `cn`'s tailwind-merge puts `bg-[…]` and `bg-surface-inverse` in one group
   and keeps only the last, so `variant="inverse"`'s own class was DELETED
   from this element before it ever reached the DOM. Measured on the built
   lane, 2026-09-07: the card's class list carried no `bg-surface-inverse`,
   and its `--hair` read `rgba(255,254,249,.12)` straight off `:root` rather
   than off tokens.css §8's `.bg-surface-inverse` block — the block whose
   entire job is to make hairlines correct on this exact kind of ground. The
   card rendered the right colour and sat outside every ground-keyed rebind
   in the system. That is the `--btn-secondary-fill` freeze in a different
   costume, and it is why the house rule is "a named utility, always".

   `variant="inverse"` is KEPT even though both of its classes are merged
   away, because `data-variant="inverse"` is what a consuming app keys on and
   because the variant is still the truth in light. What is deliberately NOT
   set is `data-surface="inverse"`: §8's rebind would then fire in dark too,
   where this card is not an inverse surface at all but an ordinary raised
   one, and its rules would flip to charcoal-on-#26241F — invisible.

   Everything else is then rebound ONCE on the card's inner grid, which is the
   mechanism tokens.css §8 already blesses in its own words: "Inverse surfaces
   flip the ring by rebinding the TOKEN, not by adding a second rule." That is
   what makes `ActivityFeed`, `Input` and `Avatar` COMPOSABLE onto a charcoal
   ground without one of them learning about this footer.

   THE CARD HAS NO OUTER EDGE — CH27.8's DARK CLAUSE IS REVERSED, 2026-09-07.
   See the block above region 4 for the full record of what the chapter asked
   for, what the client said, and what is drawn now. In short: the chapter's
   "raised #26241F with a hairline" keeps the fill and loses the hairline.

   THE HAIRLINE ON A CHARCOAL GROUND — AND THE HALF OF IT tokens.css CANNOT
   REACH. `--hair-inverse` landed in tokens.css on 2026-08-23 (the Part A
   audit), which retires the derivation this file first carried: the inner
   rules take the artifact's own `--invhair` by name in both palettes, now
   through `--hair-record-footer`.

   That commit also rebinds `--hair` on `.bg-surface-inverse` and states that
   doing so "keeps every existing consumer of --hairline, --hairline-under,
   --hairline-over, --hairline-start and --hairline-strong correct with no
   component change." MEASURED HERE, IT DOES NOT, and this file is the proof:
   `--hairline: inset 0 0 0 1px var(--hair)` is declared on `:root`, so its
   `var()` is substituted against `:root`'s `--hair` and the RESULT inherits.
   Moving `--hair` further down the tree cannot re-run that substitution, so a
   descendant sees a flipped `--hair` and an UNflipped `--hairline*`. Almost
   every component reaches for the shapes, not the colour. That is why the
   three shapes this card needs are restated on its inner grid below, and it
   is logged for the file's owner as GAPS-DEF1 Q3 — the fix there is to
   redeclare the `--hairline*` shapes inside the same `.bg-surface-inverse`
   block that already rebinds `--hair`. NOTE, since 2026-09-07, that fixing
   GAPS-DEF1 Q3 would still not reach THIS card: it does not carry the class,
   by the paragraph above. The three lines stay either way.

   The stage hero above the strip is chapter 23's, already transcribed into
   `status-stepper.tsx`; this file composes that component and redraws none of
   it.

   THE LAW THIS FILE OBEYS
   · FOUR REGIONS, IN THAT ORDER. Nothing may be reordered by a prop, because
     the order is the anatomy.
   · The header band paints NO FILL. It takes the page tone, which is why the
     panel below it reads as opaque at all.
   · The panel is `--card` at radius 24 — the one opaque region.
   · PERMISSIONS HIDE. A region the reader may not see renders nothing: no
     placeholder, no lock, no dimmed panel. `actions`, `hero`, `panel` and
     `footer` each take a `visible` flag and absence is the whole treatment.
   · The tab strip is STICKY, and a sticky strip must be opaque or the panel
     reads straight through it. It takes `--surface-raised`, the PANEL's own
     paper (`--card`) — not `--background`, the page tone the band sits on.
     A pinned strip's whole job is to occlude rows scrolling under it, and in
     three spines × two themes `--background` and `--card` are identical in
     light but a visible step apart in dark, so painting the page tone read
     as a hole punched in the card the instant the strip went opaque over
     dark content — the exact failure `--card` over `--background` already
     ruled out for a field's own fill (GAPS-KIT-BC.md FLD-B5) and for a table
     row's ground elsewhere in this kit. THIS FILE'S OWN GAPS.md REC-2 ONCE
     ARGUED THE OPPOSITE ("the strip and the band read as the same paper");
     that reasoning is superseded, not merely the class name. THE OPACITY AND
     THE STICKY POSITIONING SIT ON A WRAPPER AROUND `TabsList`,
     NOT ON `TabsList` ITSELF — CHANGED 2026-09-03, alongside moving
     `TABS_STRIP_GAP` off the `<Tabs>` root's flex `gap` and onto that SAME
     wrapper as trailing padding, so the client's "space between tabs and
     content … even when I scroll down" survives being pinned: a `gap` is a
     static distance between two siblings and stops meaning anything once one
     of them goes `position: sticky`, but padding on the box that gets pinned
     travels with it. See `tabs.tsx`'s own comment on `TABS_STRIP_GAP` for the
     whole argument.
   · Tabs are `Tabs`. This file writes not one tab class — see the folder-tab
     contradiction logged as GAPS-COL3 REC-1.
   · Only four radii, no px, no hex, no font size. Focus is one global rule
     (tokens.css §8), and nothing here sets `overflow: hidden`, so a ring in
     the panel is never shaved. The ONE scrolling box is `TabsList`'s own,
     which already carries scroll padding for exactly that reason.

   RENDERING CONTEXT
   `"use client"`. Radix Tabs underneath, plus `StatusStepper`.
   ========================================================================= */

"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Card, CardContent } from "../card/card";
import { Input } from "../input/input";
import { Title } from "../title/title";
import {
  ActivityFeed,
  type ActivityFeedItem,
} from "../activity-feed/activity-feed";
import {
  Tabs,
  TabsContent,
  TabsCount,
  TabsList,
  TabsTrigger,
  TABS_STRIP_GAP,
} from "../tabs/tabs";
import {
  StatusStepper,
  type StatusStage,
} from "../status-stepper/status-stepper";
import { ScreenRegister } from "../screen-renderer/screen-renderer";

/** Which body is drawn. Law 4: only the PANEL swaps. */
export type RecordDetailState = "ready" | "loading" | "empty" | "error";

export interface RecordDetailTab {
  /** Unique within the strip; also what `onTabChange` reports. */
  value: string;
  /** What the tab says. */
  label: React.ReactNode;
  /**
   * A glyph before the label. Absent by default — this strip has shipped
   * without one since CH27 — but every OTHER tab strip in the product draws
   * one, and the client's ruling was that this was an oversight, not a
   * deliberate variation ("yes, they should have icons ... We will only have
   * one variation of tabs with icons"). `TabsTrigger` already sizes and
   * spaces any svg child at the button icon size via `gap-2` (`tabs.tsx`'s
   * `TRIGGER_BASE`), so this is a pass-through, not a new shape: a call site
   * that never sets it renders exactly as before.
   */
  icon?: React.ReactNode;
  /** A live count beside the label, drawn by `TabsCount`. Zero renders
   *  nothing — `Badge`'s zero law, without reaching for `Badge` itself. */
  count?: number;
  /** This tab's panel. Absent, `children` is shown for every tab. */
  content?: React.ReactNode;
  /** Dead tab: a fill and an ink; `Tabs` draws it. */
  disabled?: boolean;
  /**
   * The reader may not open this tab. `false` removes it from the strip
   * entirely — ch24.6: permissions hide, they do not disable.
   */
  visible?: boolean;
}

/** One row of the ink footer's Record column. */
export interface RecordDetailAuditEntry {
  /** Stable key. Falls back to the index. */
  id?: string;
  /**
   * The key, in the quieter ink — CH27.8's "Created", "Latest activity",
   * "Record". OPTIONAL, and the reason this prop's shape did not have to
   * change when DEF-1 was fixed: an entry with a `label` draws the chapter's
   * key/value row, `label` at the inline start and `children` at the inline
   * end; an entry WITHOUT one keeps the older single-phrase reading and
   * spans the row. Every call site that predates the ink footer therefore
   * still renders, and renders correctly — just inside the card it always
   * should have been in.
   */
  label?: React.ReactNode;
  /**
   * The value. Before DEF-1 this carried the whole phrase, as chapter 24
   * writes it — "Created 13 Jun 2026, 14:05 · A. Weber" — and it still may.
   * With a `label` beside it, it is the value half and takes tabular figures,
   * which is what 27.8 draws.
   */
  children: React.ReactNode;
}

export interface RecordDetailProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "title" | "children"> {
  /* ---- Region 1 · the transparent header band ------------------------- */
  /** The micro line over the title. `Title` draws it uppercase at micro. */
  eyebrow?: React.ReactNode;
  /** The record's name. */
  title?: React.ReactNode;
  /**
   * The quiet line under it — the kit's "TCK-1042 · Padelbase". Tabular,
   * tertiary, at the badge step.
   */
  meta?: React.ReactNode;
  /** The 32 mark before the title — an `Avatar`, an icon well. */
  mark?: React.ReactNode;
  /**
   * The band's controls. ch24.6 draws the retreat on the panel tone and the
   * primary in mango; both are `Button`'s job, not this file's.
   */
  actions?: React.ReactNode;
  /** The reader may not act on this record: the whole action group is absent. */
  actionsVisible?: boolean;
  /**
   * Which heading step the title takes. `Title`'s own ladder — 32 / 24 / 20.
   * The kit's 24.6 draws 18, which is not a rung on that ladder, so the
   * nearest page-level rung is the default (GAPS-COL3 REC-3).
   */
  titleSize?: "h2" | "h3" | "h4";

  /* ---- The stage hero, chapter 23, above the strip -------------------- */
  /**
   * The record's progression. Seven stages in the system, three or four in
   * the portal — `StatusStepper` already folds a long tail into "+n" and
   * needs no help here.
   */
  stages?: readonly StatusStage[];
  /** Zero-based index of the stage the record is at now. */
  currentStage?: number;
  /** Pressing a stage scrolls the record to that stage's panel. */
  onStageSelect?: (index: number, stage: StatusStage) => void;
  /** The reader may not see the progression: it renders nothing. */
  stagesVisible?: boolean;
  /** The progression's accessible name, handed to `StatusStepper`. */
  stagesLabel?: string;
  /**
   * Anything else above the strip — an identity band, chapter 23's stage
   * progression. NOT the record's values: 26.04 forbids a facts strip above
   * the tabs (override 49), so a route that puts key/value pairs here is
   * drawing the one region the page type rules out. Values go in `panel`.
   */
  hero?: React.ReactNode;

  /* ---- Region 2 · the sticky tab strip -------------------------------- */
  /** The tabs, in order. Absent or empty, no strip is drawn. */
  tabs?: readonly RecordDetailTab[];
  /** Controlled tab value. */
  tab?: string;
  /** Uncontrolled starting tab. Defaults to the first visible item. */
  defaultTab?: string;
  /** Fires when the reader switches tabs. */
  onTabChange?: (value: string) => void;
  /**
   * Pin the strip while the panel scrolls. On by default — the kit calls the
   * region "sticky tab strip" in its own caption. Turn it off inside a
   * scrolling drawer, where a second sticky layer fights the drawer's own.
   */
  sticky?: boolean;
  /**
   * The strip's accessible name. Undefined leaves it unnamed, which is right
   * when the band's heading already names the record and the call site wires
   * `aria-labelledby` — so nothing is hardcoded here.
   */
  tabsLabel?: string;

  /* ---- Region 3 · the opaque panel ------------------------------------ */
  /** The panel's contents, when a tab carries no `content` of its own. */
  panel?: React.ReactNode;
  /** The reader may not see the panel: it renders nothing. */
  panelVisible?: boolean;
  /** Which body is drawn. Only the panel swaps; the other three regions stay. */
  state?: RecordDetailState;
  /** How many skeleton lines the loading panel draws. ch24.4's range is 2–5. */
  loadingLines?: number;
  /** What a screen reader hears while the panel loads. */
  loadingLabel?: string;
  /** The empty register's sentence — ch27.39, "every panel says what it is waiting for". */
  emptyTitle?: React.ReactNode;
  /** The line under it. */
  emptyDescription?: React.ReactNode;
  /** The one next step, where the panel is waiting on the reader. */
  emptyAction?: React.ReactNode;
  /** The error register's sentence. */
  errorTitle?: React.ReactNode;
  /** The line under it. */
  errorDescription?: React.ReactNode;
  /** The retry. */
  errorAction?: React.ReactNode;

  /* ---- Region 4 · the ink footer, CH27.8's two-column card -------------
     Chapter 26: it appears once per detail page and does not change per tab,
     so the whole card sits OUTSIDE the tab panels — below them, in the normal
     flow, never sticky. The two columns are independent: a call site may
     supply either, both, or neither, and neither draws no card at all rather
     than an empty one. ------------------------------------------------- */

  /**
   * THE RIGHT COLUMN — "Record", two to four key/value rows. Unchanged in
   * name and in type from before the footer was a card, so no call site had
   * to move; what changed is where it is drawn and that a row may now carry a
   * `label`.
   *
   * CH27.8 says two to four rows. That is not enforced — a component that
   * silently dropped a fifth row would hide data — but a call site passing
   * more is warned in development.
   */
  audit?: readonly RecordDetailAuditEntry[];
  /** The reader may not see the Record column: it renders nothing. */
  auditVisible?: boolean;
  /** The eyebrow over it. CH27.8's own word. */
  auditLabel?: React.ReactNode;

  /**
   * THE LEFT COLUMN — CH27.8's "short reverse-chronological feed". Composed
   * as `ActivityFeed`, never redrawn: override 18 already settled that row's
   * geometry for CH18, 27.9, 27.34 and this footer at once.
   *
   * THIS COMPONENT DOES NOT SORT. "Reverse-chronological" is a property of
   * what the caller hands over, and `ActivityFeed` says the same thing for
   * the same reason.
   *
   * SHORT is the caller's job too. The chapter draws two rows and the footer
   * is a summary, not the Activity tab; a route with fifty entries passes the
   * newest few and puts the rest in the tab.
   */
  activity?: readonly ActivityFeedItem[];
  /** The reader may not see the activity column: it renders nothing. */
  activityVisible?: boolean;
  /** The eyebrow over it. CH27.8's own words. */
  activityLabel?: React.ReactNode;
  /** The feed's accessible name, handed to `ActivityFeed`. */
  activityFeedLabel?: string;

  /**
   * CH27.8's add-a-note field, under the feed. Given, the field is drawn;
   * omitted, it is not — which is how the PORTAL door obeys the chapter's
   * "the portal never shows internal notes, only what was said to the
   * client": a portal route passes no handler and there is no field to press.
   *
   * Fires on Enter with the trimmed text, then clears. A blank field does
   * nothing.
   *
   * THIS IS NOT A FORM, and CH27.8's "this page never contains a form" still
   * holds. A form here would edit the record, which happens in 27.3's
   * slide-in. This appends a line to a log and changes no value on the page —
   * and the chapter draws the input itself, in this exact card.
   */
  onAddNote?: (value: string) => void;
  /** The field's placeholder AND its accessible name — CH27.8 draws no label. */
  notePlaceholder?: string;

  /**
   * The reader may not see the footer AT ALL. Distinct from `auditVisible`,
   * which hides only the Record column: a route that shows a client their own
   * record hides the internal log with `activityVisible`, and a route that
   * may show neither hides the card.
   */
  footerVisible?: boolean;
}

/**
 * The word over each of the ink footer's two columns — CH27.8 draws both at
 * 11 / 500 / uppercase / 0.08em in the quieter ink. `text-micro` carries the
 * size, the leading AND the 0.08em together (tokens.css §5), which is why no
 * tracking is written here; the ink is `--ink-tertiary`, which the card's own
 * rebinding has already pointed at `--ink-on-inverse-secondary`.
 *
 * Local, and deliberately not exported: the footer's parts are never
 * addressable from outside, because the card is one object per record.
 */
function RecordFooterEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-micro font-[var(--font-weight-medium)] uppercase text-ink-tertiary">
      {children}
    </span>
  );
}

/**
 * A record, in its four regions.
 *
 * TEN STATES
 *  1. default        — band, hero, strip, panel, ink footer, in that order.
 *                      27.8: "That order never changes", so no prop reorders
 *                      it and the footer is always the last child.
 *  2. hover          — does not apply to any region. Every hover here belongs
 *                      to a control inside one: the band's Buttons, the
 *                      strip's TabsTriggers, the panel's rows. A region that
 *                      responded to the pointer would light up on every
 *                      mouse move across a page-sized target.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every control at once.
 *                      Nothing in this file sets `overflow: hidden`; the one
 *                      scrolling box is `TabsList`, which carries its own
 *                      scroll padding so a tab's ring survives being scrolled
 *                      into view.
 *  4. active/pressed — does not apply, for the same reason as hover.
 *  5. disabled       — per TAB only (`tab.disabled`), and even that is the
 *                      rarer case: ch24.6 rules that permissions HIDE, so the
 *                      normal answer for "the reader may not" is
 *                      `visible: false` and the region is absent. There is no
 *                      whole-record disable, because a record whose every
 *                      control is dead is a record that should have been
 *                      rendered read-only, not greyed.
 *  6. loading        — `state="loading"`: the PANEL is replaced with skeleton
 *                      lines. The band, the hero, the strip and the footer
 *                      stay drawn and stay put (ch27 law 4), so the page is
 *                      never seen to be built twice.
 *  7. empty          — `state="empty"`: the panel is replaced with chapter
 *                      21's register. ch27.39 — a record with nothing in it
 *                      yet is this composition with empty panels, "and each
 *                      one names what will fill it and who fills it", which
 *                      is why the register's strings are props rather than
 *                      defaults: only the call site knows who fills it.
 *  8. error          — `state="error"`: the register in its error tone,
 *                      `role="alert"`. The frame stays; a record that failed
 *                      to load its Activity tab has not stopped being a
 *                      record.
 *  9. selected       — the selected TAB, owned by `Tabs`, plus the current
 *                      STAGE, owned by `StatusStepper` (`aria-current="step"`).
 * 10. read-only      — the page, yes, and deliberately. ch27.8: "this page
 *                      never contains a form" — everything that CHANGES the
 *                      record happens in the slide-in panel of ch27.3.
 *                      THE ONE EXCEPTION IS THE CHAPTER'S OWN: the footer's
 *                      add-a-note field, which 27.8 draws in this exact card.
 *                      It edits no value on the page; it appends a line to a
 *                      log. It is opt-in per call site (`onAddNote`), which
 *                      is also how the portal door obeys "the portal never
 *                      shows internal notes, only what was said to the
 *                      client" — no handler, no field.
 *
 * THREE BREAKPOINTS
 *  mobile   — the band's actions WRAP under the title (`Title` does this
 *             itself, and the wrapped group sits at the inline start in line
 *             with the heading above it). The tab strip SCROLLS on the inline
 *             axis rather than wrapping — `TabsList`'s own answer, and the
 *             right one here: a two-line strip stops reading as one row of
 *             peers, and the strip is the thing that tells a reader what a
 *             record contains. THE INK FOOTER GOES TO ONE COLUMN, activity
 *             then Record, which is 27.8's own 380 specimen. That is a
 *             property of the box, not a breakpoint: `repeat(auto-fit,
 *             minmax(16.25rem, 1fr))` cannot land a second track in a ~340
 *             content box, so the card restacks at whatever width it is
 *             actually given — in a drawer, in a split pane, anywhere. The
 *             panel keeps its radius and takes the narrower inset
 *             `CardContent` already gives it at that width.
 *  tablet   — unchanged. The kit changes nothing at `sm`.
 *  desktop  — the panel's inset opens from 24 to 32 at `lg:`, which is
 *             `CardContent`'s own response and not something this file adds;
 *             the footer's inset opens with it, from 27.8's 18 / 20 to the
 *             ladder's 24 / 32. The four regions never become two columns:
 *             ch27 law 1 forbids a second spine outright — "no page-level
 *             split panes". THE FOOTER IS NOT A SECOND SPINE: it is two
 *             columns INSIDE one card at the bottom of the single reading
 *             column, which is what 27.8 draws and what law 1 is not about.
 *
 * RTL — safe. Every inset is logical, the band's actions are pushed by
 * `Title`'s `ms-auto`, the strip's indicator is measured against the computed
 * direction inside `Tabs`, `StatusStepper` orders its pills in DOM order, and
 * no rule in this file names a physical side.
 */
const RecordDetail = React.forwardRef<HTMLDivElement, RecordDetailProps>(
  (
    {
      className,
      eyebrow,
      title,
      meta,
      mark,
      actions,
      actionsVisible = true,
      titleSize = "h3",
      stages,
      currentStage = 0,
      onStageSelect,
      stagesVisible = true,
      stagesLabel,
      hero,
      tabs,
      tab,
      defaultTab,
      onTabChange,
      sticky = true,
      tabsLabel,
      panel,
      panelVisible = true,
      state = "ready",
      loadingLines = 4,
      loadingLabel = "Loading…",
      emptyTitle,
      emptyDescription,
      emptyAction,
      errorTitle,
      errorDescription,
      errorAction,
      audit,
      auditVisible = true,
      auditLabel = "Record",
      activity,
      activityVisible = true,
      activityLabel = "Latest activity",
      activityFeedLabel,
      onAddNote,
      notePlaceholder = "Add a note",
      footerVisible = true,
      ...props
    },
    ref,
  ) => {
    /* Permissions HIDE. A hidden tab is not in the strip at all, so it also
       cannot be the default value or be reached by keyboard. */
    const visibleTabs = React.useMemo(
      () => (tabs ?? []).filter((item) => item.visible !== false),
      [tabs],
    );

    /* The note field's own text. Uncontrolled on purpose: the value is in
       flight for the seconds between typing and Enter and belongs to nobody
       else, and a route that had to hold it would be holding a form — which
       CH27.8 says this page is not. The COMMITTED note leaves through
       `onAddNote` and becomes the caller's. */
    const [note, setNote] = React.useState("");

    /* ---- Region 4's two columns, decided once ------------------------- */
    const auditRows = auditVisible ? (audit ?? []) : [];
    const activityRows = activityVisible ? (activity ?? []) : [];
    const showRecordColumn = auditRows.length > 0;
    const showActivityColumn = activityRows.length > 0 || (activityVisible && onAddNote !== undefined);
    const showFooter = footerVisible && (showRecordColumn || showActivityColumn);

    if (process.env.NODE_ENV !== "production" && auditRows.length > 4) {
      // CH27.8: "two to four key/value rows". Warned, never truncated — a
      // component that silently dropped a row would hide a fact about the
      // record, which is worse than a footer that is one row too tall.
      console.warn(
        `RecordDetail: CH27.8 draws two to four rows in the footer's Record column, got ${auditRows.length}.`,
      );
    }

    const hasBand =
      eyebrow !== undefined ||
      title !== undefined ||
      meta !== undefined ||
      mark !== undefined ||
      (actionsVisible && actions !== undefined);

    const showStages = stagesVisible && stages !== undefined && stages.length > 0;
    const hasHero = showStages || hero !== undefined;

    /* ---- Region 3, built once and reused by every tab that has no body of
       its own. Chapter 26: the panel is the one OPAQUE region. ---------- */
    const panelBody = (content: React.ReactNode) => {
      if (!panelVisible) return null;

      let inner: React.ReactNode;
      if (state === "loading") {
        inner = (
          <ScreenRegister tone="loading" lines={loadingLines} loadingLabel={loadingLabel} />
        );
      } else if (state === "error") {
        inner = (
          <ScreenRegister
            tone="error"
            title={errorTitle}
            description={errorDescription}
            action={errorAction}
          />
        );
      } else if (state === "empty" || content === undefined || content === null) {
        inner = (
          <ScreenRegister
            tone="empty"
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        );
        // A panel with nothing to show and nothing to say draws nothing.
        if (inner === null) return null;
      } else {
        inner = content;
      }

      return (
        /* K1 REVERSED, 2026-08-23 — THE RECORD'S BODY IS SOFT PAPER.

           This was `variant="raised"` (`--card`, off-beige) on the belief
           that the page under it was `--surface-panel`. It is not: 26.04 is
           explicit — "The page itself is off-beige and every panel on it is
           soft paper: never the other way round" — and `ScreenShell`'s body
           pane is off-beige, so an off-beige panel on it measured 1.000 and
           the record's body did not exist as a shape. p16 draws it as the
           soft-paper slab under the underline tabs.

           `variant="default"` is `--surface-panel` with no lift, which is
           also what the specimen draws: a flat fill, no shadow, no stroke.
           The cards INSIDE it stay `raised` and are off-beige, which is the
           next alternation and the one that now reads at 1.103. */
        <Card
          variant="default"
          data-record-region="panel"
          className="min-w-0"
        >
          <CardContent>{inner}</CardContent>
        </Card>
      );
    };

    const strip =
      visibleTabs.length > 0 ? (
        /* THE WRAPPER, NOT `TabsList` ITSELF, CARRIES STICKY + OPACITY + THE
           TRAILING GAP — CHANGED 2026-09-03. A sticky strip must be OPAQUE or
           the panel reads through it, and opaque means the PANEL's own paper:
           `bg-surface-raised` (`--card`) — NOT `bg-background`, which was
           this wrapper's fill until today. `--background` and `--card` are
           the same #FFFEF9 in light, so the mistake was invisible there, but
           in dark `--background` is `--kw-unlit-page` #141310 against
           `--card`'s `--kw-unlit-raised` #26241F — a visible step apart — so
           a strip painted the page tone read as a hole punched in the card
           the moment it went opaque over rows scrolling under it. This is
           the fourth kit-and-app implementation of this exact strip to carry
           that mistake (`record-chrome.tsx`'s `STICKY_TABS`, `tabs-view.tsx`'s
           `STICKY_FOLDER_TABS`, and the toolbar rows already fixed it on the
           app side); this file is the one the app's recipe-driven screens —
           including its own landing screen — reach directly, so it was still
           live there until now. `TABS_STRIP_GAP` (`tabs.tsx`) is padding, not a flex `gap`,
           for the reason its own comment gives — a `gap` between this wrapper
           and the panel below would stop meaning anything the instant this
           box goes sticky, and the client asked for the space to survive
           exactly that. Neither concern sits on `TabsList` itself: its own
           `LIST_SKIN` hairline is anchored to ITS bottom edge, directly under
           the tab row, and padding there would drag the rule down into the
           middle of the new blank space instead of leaving it under the
           tabs. */
        <div
          data-slot="record-detail-strip"
          className={cn(sticky && "sticky top-0 z-10 bg-surface-raised", TABS_STRIP_GAP)}
        >
          <TabsList aria-label={tabsLabel}>
            {visibleTabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value} disabled={item.disabled}>
                {item.icon}
                {item.label}
                {/* `line`'s asymmetric count — quiet text at rest, a small
                    mango circle with primary-ink text on the active tab only —
                    is `TabsCount`'s own shape (GAPS-RULINGS.md R-4a). Not a
                    `Badge`: a record's sections stay CH27's underline strip,
                    and this was the exact place a bare `Badge` had drifted from
                    that strip's own "quiet count" law before tonight's
                    ruling gave the active state somewhere to go instead. */}
                <TabsCount count={item.count} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      ) : null;

    return (
      <div
        ref={ref}
        data-slot="record-detail"
        data-state={state}
        /* NO FILL. ch24.6: "The header band is transparent — it takes the page
           tone". The whole component is transparent; the panel is the only
           region that paints, which is what makes it read as opaque. */
        className={cn("flex w-full min-w-0 flex-col gap-[var(--space-3h)]", className)}
        {...props}
      >
        {/* ---- Region 1 · the transparent header band -------------------- */}
        {hasBand ? (
          <div
            data-record-region="header"
            /* 14 between the mark and the text, 4 of inline breathing so the
               band's type lines up with the panel's inset below it. */
            className="flex items-start gap-[var(--space-3h)] px-1"
          >
            {mark ? <span className="flex-none">{mark}</span> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Title
                as="h1"
                size={titleSize}
                rule={false}
                eyebrow={eyebrow}
                actions={actionsVisible ? actions : undefined}
              >
                {title}
              </Title>
              {meta !== undefined && meta !== null ? (
                <span
                  data-slot="record-detail-meta"
                  className="text-badge tabular-nums text-ink-tertiary"
                >
                  {meta}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ---- The stage hero, chapter 23, above the strip --------------- */}
        {hasHero ? (
          <div data-record-region="hero" className="flex flex-col gap-3 px-1">
            {showStages ? (
              <StatusStepper
                stages={stages!}
                current={currentStage}
                onStageSelect={onStageSelect}
                label={stagesLabel}
              />
            ) : null}
            {hero}
          </div>
        ) : null}

        {/* ---- Regions 2 and 3 ------------------------------------------ */}
        {visibleTabs.length > 0 ? (
          <Tabs
            /* `variant="line"` USED TO BE STATED HERE and is deleted, not
               moved: under ruling E of 2026-08-22 ("folder tabs are for main
               screens, line tabs for detail screens") a record had to say
               which of two shapes it took, because `CollectionFrame`
               defaulted to the other one. The client retired the folder
               variant on 2026-09-02 and there is one shape left, so the line
               is redundant — "I don't want any dead body around". REC-1 stays
               settled; there is simply nothing left to settle it against. */
            value={tab}
            defaultValue={defaultTab ?? visibleTabs[0].value}
            onValueChange={onTabChange}
            /* THE STRIP-TO-PANEL GAP IS NO LONGER THIS ROOT'S `gap` AT ALL —
               CHANGED 2026-09-03, TWICE THE SAME DAY. First to
               `TABS_STRIP_GAP` (`tabs.tsx`) in place of this file's own
               `gap-[var(--space-3h)]` (14) rhythm — the client's live
               screenshot of a MAIN screen showed the wrong gap and named the
               fix as a rule to change once, not a number to retune per
               screen. Then OFF this root entirely: a flex `gap` is a static
               distance between siblings and stops holding once the STRIP
               (`strip`, above) goes sticky, which this record's own tab strip
               always can, so the gap now lives as padding on the wrapper
               around `TabsList` instead — see that wrapper's own comment and
               `tabs.tsx`'s comment on `TABS_STRIP_GAP` for the whole
               argument. `gap-0` CANCELS `Tabs`'s OWN BASE `gap-4` — without
               it the base default survives untouched (`cn` only drops a
               utility a caller's className actually contests) and the strip
               would carry BOTH the wrapper's 20px padding AND the root's
               16px flex gap, 36px in total rather than the ruled 20. */
            className="min-w-0 gap-0"
          >
            {strip}
            {visibleTabs.map((item) => (
              <TabsContent key={item.value} value={item.value} className="min-w-0">
                {panelBody(item.content ?? panel)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          panelBody(panel)
        )}

        {/* ---- Region 4 · CH27.8's ink card -----------------------------
            Chapter 26: "once per detail page … it does not change per tab",
            which is why it sits OUTSIDE the panels, and "not fixed, not
            sticky, not full-bleed", which is why nothing here pins it. It is
            the LAST child of the flow, which is 27.8's "then the ink footer.
            That order never changes." */}
        {/* ---- THE FOOTER WEARS NO OUTLINE — A CHAPTER REVERSED ----------
            2026-09-07. Read this before restoring `hairline`.

            WHAT THE CHAPTER ASKED FOR. CH27.8's dark clause, verbatim and
            already quoted in full at the top of this file: "On dark, ink
            would sit almost on top of the page, so the card moves up to
            raised #26241F WITH A HAIRLINE — same two columns, same content."
            27.8 also draws the note field with an edge of its own, in its own
            markup: `box-shadow: inset 0 0 0 1px var(--invhair)`. Both edges
            were transcribed faithfully and both shipped.

            WHAT THE CLIENT SAID. 2026-09-06, on a screenshot of a ticket's
            detail screen in dark mode, verbatim: "in dark mode the footer is
            wrong no? what are this outline??? review this". What she is
            looking at is two outlined boxes, one inside the other — this card
            and the field inside it — drawn in the same ink at the same 12%.

            WHAT WAS ACTUALLY DRAWN, measured on the built lane before the
            change (verify/ink-footer, both palettes):
              · this card's edge   light  8% charcoal over #1A1918 → 1.000
                                          (it was never drawing; the file's
                                          old comment was right about that)
                                   dark  12% off-beige over #26241F → 1.455
              · the note field     light 12% off-beige over #26241F → 1.455
                                   dark  12% off-beige over #141310 → 1.391
              · the two columns' row rules   1.423 light / 1.455 dark
            So the "dark-only" edge was one of THREE, the field's edge was
            visible in BOTH palettes, and every one of them was the same 12%
            — an outline around a card, an outline around a control and a rule
            between rows, all at one weight. That is the whole complaint.

            WHAT IS DRAWN NOW.
              · THE CARD: no edge, either palette. Chapter 13's own subtitle
                is "Colour separates, strokes don't", and `card.tsx`'s law
                reserves the hairline for SAME-TONE separation — two cards of
                one tone against each other. This card is not that in either
                palette. It is separated by its FILL, which is also what the
                dark clause's own first half already does: 17.386 against the
                page in light, and in dark 1.198 against `--background` and
                1.111 against `--surface-panel`. Both dark figures are at or
                above steps this kit already ships as visible surface changes
                (override 77 measures its selected wash at 1.103 light /
                1.111 dark and calls that the answer).
              · AND `shadow-sm` UNDER IT, which the tokens bridge points at
                `--shadow-rest` — the elevation `Card variant="raised"` gets
                for free, and in dark this card IS a raised card, by the
                chapter's own words. It measures 1.057 against the dark page:
                a seat, not a lift, and deliberately quieter than the fill it
                supports. It is a shadow, not a stroke, so the standing rule —
                separation is a fill or an inset shadow, never a border — is
                satisfied by the change rather than bent around it.
              · THE FIELD: see the `Input` below. Its edge goes too, and its
                well changes to pay for it.

            WHAT IS NOT TOUCHED. The two columns' row rules stay. They are
            chapter 13's blessed case exactly — same-tone separation between
            stacked rows inside one shell — and they are not what anybody is
            pointing at: a line BETWEEN two rows is not an outline AROUND a
            shape, and the client's word was "outline".

            AN ARTIFACT CORRECTION IS OWED against 27.8's dark clause and
            against its note-field markup, alongside the one override 49
            already owes it. */}
        {showFooter ? (
          <Card
            variant="inverse"
            data-record-region="footer"
            className={cn(
              "min-w-0",
              /* The two surfaces CH27.8 names, as NAMED utilities. Both of
                 `variant="inverse"`'s own classes are merged out by `cn`
                 here, on purpose — see the palette note at the top of this
                 file for why that had to stop being an arbitrary `bg-[…]`. */
              "bg-surface-record-footer text-ink-on-record-footer",
              /* The card's seat, replacing its outline. `shadow-sm` is
                 re-pointed at `--shadow-rest` by tokens.css §10, so this is
                 the kit's own rest elevation and not a shadow invented here.
                 Unbranched: in light it is 5% charcoal under a charcoal card,
                 which is what a raised block in that palette carries anyway. */
              "shadow-sm",
            )}
          >
            <CardContent
              /* 27.8's own insets where ruling 28's ladder has them (18 / 20
                 at the base width) and its neighbours where it does not (the
                 wide 26 / 30 → 24 / 32, which is `CardContent`'s own step).
                 GAPS-DEF1 Q1. */
              className={cn(
                "px-[var(--space-5)] py-[var(--space-4h)] lg:px-[var(--space-7)] lg:py-6",
                /* 27.8's grid, verbatim except for the unit: `repeat(auto-fit,
                   minmax(260px, 1fr))`. auto-fit is what makes "one column at
                   380" a property of the box rather than a breakpoint someone
                   has to remember — at 380 the card's content box is ~340 and
                   a second 16.25rem track cannot land. */
                "grid grid-cols-[repeat(auto-fit,minmax(16.25rem,1fr))] items-start",
                /* 32 BETWEEN the columns, 14 between them once they stack.
                   The chapter's two specimens, in one declaration. */
                "gap-x-[var(--space-7)] gap-y-[var(--space-3h)]",
              )}
              /* THE ONE REBINDING, and the reason `ActivityFeed`, `Input` and
                 `Avatar` can be composed onto a charcoal ground without any
                 of them learning this footer exists. tokens.css §8: "Inverse
                 surfaces flip the ring by rebinding the TOKEN, not by adding
                 a second rule."

                 EVERY ALIAS IS LISTED SEPARATELY, AND THAT IS NOT REDUNDANCY.
                 Measured on the built page, 2026-08-23: rebinding only the
                 SOURCES left the eyebrows at #5F5D59 on charcoal — 2.67:1 —
                 and every rule inside the card at 8% charcoal, invisible. A
                 custom property that references another is substituted on the
                 element where IT is declared, so `--ink-tertiary:
                 var(--muted-foreground)` and `--hairline: … var(--hair)` were
                 computed once on `:root` and inherited as fixed values; a
                 descendant moving `--muted-foreground` or `--hair` cannot
                 reach them. Both halves of each pair are therefore set here.
                 tokens.css §8's own `--focus: var(--focus-inverse)` works for
                 the same reason in reverse: it is declared on the element
                 that needs it.

                 THE THREE `--hairline*` SHAPES ARE RESTATED, NOT INVENTED.
                 They are tokens.css §4's own strings with this card's hair
                 substituted, and `0.0625rem` is how `date-picker.tsx` and
                 `tabs.tsx` already spell the grid line rather than writing a
                 px. tokens.css should grow a `--hair` that rebinds by ground —
                 exactly as `--focus` and `--btn-secondary-fill` already do —
                 and these three lines would go with it. GAPS-DEF1 Q3.

                   --foreground / --ink-primary   the primary ink
                   --muted-foreground / --ink-tertiary   the quiet ink
                   --ink-secondary                the second tier
                   --border / --hair              the hair itself
                   --hairline / -under / -strong  the shapes that carry it
                   --card / --surface-raised / --background / --pill-fill
                                                  the well under a mark, a
                                                  pill or a field
                   --focus                        ruling 24's one ring, on the
                                                  ink that reads on this card

                 Declared HERE and not on the card above, because the values
                 are computed from tokens this element overrides and a custom
                 property may not depend on its own element.

                 EVERY RIGHT-HAND SIDE IS NOW A SEMANTIC TOKEN. It used to be
                 a local `--rd-footer-*` holding a `light-dark()` pair; the
                 pairs live in tokens.css §3 and §6/§7 since 2026-09-07, which
                 is what let the card's ground become a named utility. The
                 self-reference reads alarming and is not: `--hair-record-
                 footer: var(--hair)` is substituted on `:root`, so rebinding
                 `--hair` here cannot feed back into it. Same for
                 `--ink-on-record-footer-secondary: var(--ink-secondary)`. */
              style={
                {
                  "--foreground": "var(--ink-on-record-footer)",
                  "--ink-primary": "var(--ink-on-record-footer)",
                  "--muted-foreground": "var(--ink-on-record-footer-secondary)",
                  "--ink-tertiary": "var(--ink-on-record-footer-secondary)",
                  "--ink-secondary": "var(--ink-on-record-footer-secondary)",
                  "--border": "var(--hair-record-footer)",
                  "--hair": "var(--hair-record-footer)",
                  "--hairline": "inset 0 0 0 0.0625rem var(--hair-record-footer)",
                  "--hairline-under": "inset 0 -0.0625rem 0 var(--hair-record-footer)",
                  "--hairline-strong": "inset 0 0 0 0.0625rem var(--hair-record-footer)",
                  "--card": "var(--surface-record-footer-well)",
                  "--surface-raised": "var(--surface-record-footer-well)",
                  "--background": "var(--surface-record-footer-well)",
                  "--pill-fill": "var(--surface-record-footer-well)",
                  "--focus": "var(--ink-on-record-footer)",
                } as React.CSSProperties
              }
            >
              {/* ---- Left · Latest activity ---------------------------- */}
              {showActivityColumn ? (
                <div data-record-region="footer-activity" className="min-w-0">
                  <RecordFooterEyebrow>{activityLabel}</RecordFooterEyebrow>
                  {activityRows.length > 0 ? (
                    /* COMPOSED, never redrawn — override 18 owns this row. */
                    <ActivityFeed
                      items={[...activityRows]}
                      label={activityFeedLabel}
                      className="mt-3"
                    />
                  ) : null}
                  {onAddNote === undefined ? null : (
                    <Input
                      type="text"
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        const written = note.trim();
                        if (written === "") return;
                        event.preventDefault();
                        onAddNote(written);
                        setNote("");
                      }}
                      /* 27.8 draws no label beside this field, so the
                         placeholder is the accessible name as well — the one
                         case where that is not a shortcut, because the field
                         is one word long and sits under its own eyebrow. */
                      placeholder={notePlaceholder}
                      aria-label={notePlaceholder}
                      /* 38 — ruling 28's "field inside a row", which is what
                         27.8 draws here rather than `Input`'s standing 44.

                         `shadow-none` IS THE SECOND HALF OF THE REVERSAL, and
                         it is the harder half, so it is argued here in full.

                         WHAT IT REMOVES. `Input`'s resting skin is
                         `shadow-[var(--hairline-strong)]` (override 42), and
                         on this card the grid above has rebound that shape to
                         `--hair-record-footer`. Measured before: 12% off-beige
                         at 1.455 over the light well and 1.391 over the dark
                         one — the inner of the client's "two outlined boxes",
                         and the one that was visible in BOTH palettes rather
                         than only in the one she screenshotted.

                         WHY IT CANNOT JUST GO. Override 42 is emphatic that a
                         field's resting edge is doing real work: "a resting
                         field and a disabled one carried the SAME edge, and
                         telling those apart is the one job that edge has."
                         Delete the stroke and pay for it nowhere and this
                         becomes the one field in the kit that does not say it
                         is a field.

                         SO IT IS PAID FOR, WITH A FILL. The well under this
                         field is no longer `--kw-unlit-raised` in light and
                         the page tone in dark — two tones, pointing in
                         opposite directions, each about 1.13–1.20 against its
                         card and each leaning on the stroke. It is one tone in
                         both palettes now, `--surface-record-footer-well`
                         (#3A3833, RULED N2's own lift, minted for exactly
                         this "the shape stopped existing" failure): measured
                         1.499 against the light footer and 1.324 against the
                         dark one. The fill alone is now stronger than the fill
                         AND the stroke used to be.

                         AND FOUR THINGS BESIDES THE FILL SAY "TYPE HERE",
                         none of which is a stroke:
                           · the SHAPE. `rounded-pill` at 38 tall. Nothing else
                             in this card is a pill — the feed rows and the
                             Record rows are flat, full-width, and separated by
                             rules. A pill on this card is a control by
                             elimination.
                           · the PLACEHOLDER. "Add a note", in the quiet ink,
                             which is also this field's accessible name. A
                             filled shape with a verb in it is an invitation;
                             an empty well is not.
                           · the CARET, on hover-free pointer entry and on tab.
                           · the RING. tokens.css §8, at the control's own
                             radius, on `--focus` which the grid above has
                             already pointed at the ink that reads on this
                             card. The moment the field is used it is the
                             loudest thing in the footer.

                         WHY IT IS A PROPERTY AND NOT `shadow-none`. Because
                         `shadow-none` DOES NOT WIN — measured, not assumed:

                           twMerge("shadow-[var(--hairline-strong)]",
                                   "shadow-none")
                             -> "shadow-[var(--hairline-strong)] shadow-none"

                         tailwind-merge cannot see inside an opaque
                         `shadow-[var(…)]`, so it files it under shadow-COLOUR
                         rather than shadow, the two classes do not conflict,
                         BOTH survive, and the winner is decided by Tailwind's
                         emission order instead of by the caller. That is
                         precisely the failure `lib/utils.ts` exists to prevent
                         and documents for `rounded-*` and `text-*`, arriving
                         here in a group its `extend` does not cover — and it
                         renders correctly today purely by luck of ordering.
                         PATTERN §1's promise that "the caller's className goes
                         last so a call site can always win" is not true for
                         this pair, so the call site does not rely on it.

                         Rebinding the SHAPE on this element is exact: it is
                         scoped to the field, it cannot be reordered, and
                         tokens.css §4 states this escape hatch in its own
                         words — "Set them all to `0 0` and every edge
                         disappears." `0 0 #0000` is Tailwind's own spelling of
                         a shadow that paints nothing, and it must stay a VALID
                         shadow rather than `none`: the utility composes five
                         comma-separated parts into one `box-shadow`, and a
                         `none` in the middle of that list invalidates the
                         whole declaration — taking the ring with it.

                         It cannot mask a state, either. `Input`'s error and
                         read-only skins reach for different shapes, and this
                         field can be neither: no `error`, no `loading`, and it
                         never will — a note either sends on Enter or does
                         nothing. */
                      style={{ "--hairline-strong": "0 0 #0000" } as React.CSSProperties}
                      className="mt-[var(--space-3h)] h-[var(--control-height-field)] text-caption"
                    />
                  )}
                </div>
              ) : null}

              {/* ---- Right · Record ------------------------------------ */}
              {showRecordColumn ? (
                <div data-record-region="footer-record" className="min-w-0">
                  <RecordFooterEyebrow>{auditLabel}</RecordFooterEyebrow>
                  <div className="mt-3 flex min-w-0 flex-col">
                    {auditRows.map((entry, index) => (
                      <div
                        key={entry.id ?? String(index)}
                        className={cn(
                          "flex min-w-0 items-baseline justify-between gap-4 py-2",
                          /* Inset shadow, never a border — the artifact draws
                             every rule this way. The last row drops it. */
                          "shadow-[var(--hairline-under)] last:shadow-none",
                        )}
                      >
                        {entry.label === undefined || entry.label === null ? (
                          /* No key: the older single-phrase reading, kept so
                             a call site that predates the card still draws. */
                          <span className="min-w-0 text-caption tabular-nums">
                            {entry.children}
                          </span>
                        ) : (
                          <React.Fragment>
                            <span className="min-w-0 text-caption text-ink-tertiary">
                              {entry.label}
                            </span>
                            <span className="min-w-0 text-caption tabular-nums">
                              {entry.children}
                            </span>
                          </React.Fragment>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  },
);

RecordDetail.displayName = "RecordDetail";

export { RecordDetail };
