/* ============================================================================
   Select — the field that opens a list (43 direct call sites).

   DESIGN SOURCE
   The TRIGGER is a field. Chapter 9 draws it as one:
     design-mothership/specimens/_fragments/t9.css → `.kw-selectwrap`,
       `.kw-selectwrap__chevron` ("the field pill with a chevron … the select
       itself is a plain .kw-field__input"), chevron at `--icon-button` on
       `--ink-secondary`, with `--space-7` of room reserved for it.
     design-mothership/specimens/kwapso-ui.css → `.kw-field__input` for the
       skin `input.tsx` already carries: 44 tall, pill, page fill, one
       hairline at `--hair-strong` (override 42), focus hairline to ink.
     design-mothership/specimens/_fragments/t9-inputs.html lines 119-127 —
       the drawn specimen ("Sprint type" / "Maintenance").

   The LIST is an overlay. Chapter 12 draws every floating surface the same:
     design-mothership/specimens/_fragments/t12.css → `.kw-menu`
       (`--surface-raised` at `--radius-card` under `--shadow-overlay`, padded
       `--space-2h`) and `.kw-menu__item` (a pill row, `--space-2h`/`--space-3`
       of padding, 14/300, hover on the kit's own `--accent` wash).
     Chapter rule, verbatim: "Overlay shadow, 24px radius, no blur."

   THE LAW THIS FILE OBEYS
   · A select trigger is a FIELD and takes the field hairline — CH09's TWO
     strengths, `--hair-strong` at rest and `--border` (8%) disabled,
     override 42 — and
     the field's 44 height. That is the deliberate distinction from a button,
     which carries no border in any state.
   · The overlay is `--radius` (24), the overlay shadow and NO blur. Menus in
     this system are paper, not glass.
   · A menu row is a pill and its hover is `--accent`, the kit's neutral row
     wash. Never `--primary`: mango is a brand fill, never a hover, or every
     menu row turns mango.
   · Focus is ONE global rule (tokens.css §8). This file moves the trigger's
     HAIRLINE to ink on focus and while open, which is a fill colour and not a
     ring, and defines no ring. Nothing here sets `outline: none` — shadcn's
     select does, on both the trigger and every item, and that is a rejection.
   · Disabled is a fill and an ink (`--hair-faint` / `--ink-disabled`), never
     an opacity.
   · Motion is attached, not written: `.motion-anchored` from motion/motion.css
     opens the list on the kit's 4px rise and closes it on a straight fade,
     and `.motion-menu-item` carries the row's colour swap. No duration is
     written in this file.

   WHY `enabled:` GUARDS THE TRIGGER'S LIVE STATES
   A Select is disabled from the ROOT (`<Select disabled>`), so the trigger's
   own props never see it — a JS-resolved state like `input.tsx`'s would miss
   it entirely. Radix does put the native `disabled` attribute on the trigger
   button, so `:enabled` and `:disabled` are mutually exclusive there and
   exactly one class set can match. Everything live is `enabled:`-guarded;
   everything dead is `disabled:`-prefixed and therefore also outranks the
   unprefixed base. The one state still resolved in JS is error, because
   `error` and `aria-invalid` are two spellings of one thing.

   RENDERING CONTEXT
   `"use client"`. `@radix-ui/react-select` holds state, portals, measures and
   attaches handlers throughout.
   ========================================================================= */

"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar/avatar";
import {
  CheckFat,
  CaretDown,
  CaretUp,
} from "../../foundations/icons";

/* ----------------------------------------------------------------------------
   Two initials, cut on code points so a name outside the basic plane is not
   cut through the middle of one. Copied — not imported — from `comments.tsx`
   and `detail-view.tsx`, which each already carry the identical function for
   the identical reason; this file follows the kit's own precedent (a shared
   `lib/utils` helper was considered and rejected the same way twice already)
   rather than introducing a fourth pattern. `Avatar` cuts to two again on its
   own, so this is belt and braces, same as those two call sites say of
   themselves.
   ------------------------------------------------------------------------- */
function initialsOf(name: string | undefined): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("");
  return [words[0], words[words.length - 1]].map((word) => Array.from(word)[0] ?? "").join("");
}

/**
 * A FACE — a person's, a contact's, an account's or an app's — the one shape
 * every choice over one of those draws from now on (the client, verbatim:
 * "every time there is an avatar, I want to also see it in the choice
 * component, so I also want to see the avatars here"). It renders through
 * `Avatar` itself — photo or initials fallback, never a bare `<img>` — so a
 * picker can never show a silhouette the record's own row does not.
 */
export interface SelectFace {
  /** The photograph. Falls back to the initials silently when missing or
   * broken — `Avatar`'s own contract, not reimplemented here. */
  src?: string | null;
  /** The record's name. Cut to two initials the same way every other choice
   * in this kit does (see `initialsOf` above); also the mark's own
   * `aria-hidden` fallback text. */
  name?: string;
  /** The `Avatar` variant carrying the record's own tone when there is no
   * photograph — `default` unless the record's own row draws another. */
  tone?: "default" | "inverse" | "brand" | "quiet";
  /** Square for a thing, pill for a person — ruling 30. Defaults to `pill`,
   * which is right for the common case (a person, a contact, a staff
   * member); an account or an app passes `square`. */
  shape?: "pill" | "square";
  /** IS THIS PERSON FROM OUTSIDE? Forwarded straight to `Avatar`'s own
   * `external` (see `components/avatar/avatar.tsx` for the ruling and why the
   * fact is taken rather than guessed): an outside person's PHOTOGRAPH
   * renders greyscale, one of our own in full colour. Aurora, 23 Sep 2026:
   * "external photos (from contacts) gray scale. keep staff nirmal." It rides
   * the face rather than the ITEM, so the TRIGGER inherits it for free
   * through the same registry the photograph itself travels by — a chosen
   * contact stays grey once the list closes, with no second prop for a call
   * site to forget. Undefined reads as one of ours; a `square` face (a
   * company, an app) never sets it. */
  external?: boolean;
  /**
   * A GLYPH face; an icon standing in for a record that has neither a
   * photograph nor a name to initial, a ticket's TYPE being the case this
   * was added for. Aurora, verbatim: "on every choice component where I can
   * choose a ticket, show me the type as the icon everywhere." Takes
   * priority over `src`/`name` when given; `SelectFaceMark` draws it as a
   * small glyph badge instead of through `Avatar`, because there is no
   * photo-or-initials pair to fall back through for a type. A call site
   * supplies a real Phosphor element (from `../../foundations/icons`), the
   * same as `SelectItem`'s own standalone `icon` prop takes; this is a
   * SECOND way to carry a glyph, not a replacement for that one; `icon`
   * stays a call-site-drawn leading mark with no registered identity, while
   * `face.icon` is a face like any other and rides the same trigger-persists
   * -on-close pipeline the photo/initials pair below does.
   */
  icon?: React.ReactNode;
}

/**
 * The face slot both `SelectItem` and `SelectTrigger` render through — one
 * function, so an option's mark and the trigger's own chosen-value mark can
 * never draw two different sizes or two different fallbacks of the same
 * record. `size="sm"` (24, `--avatar-sm`) is the kit's own small rung of
 * ruling 30's ladder and the exact size the old bare `image` prop already
 * drew at; this only swaps the bare `<img>` for the primitive that knows how
 * to fall back.
 */
function SelectFaceMark({ face }: { face: SelectFace }) {
  if (face.icon) {
    // The glyph branch; `size-[var(--avatar-sm)]` so an icon face takes
    // exactly the footprint the photo/initials pair does (ruling 30's own
    // small rung), never a second size a row would have to make room for.
    return (
      <span
        aria-hidden="true"
        data-slot="select-face-icon"
        className={cn(
          "inline-flex size-[var(--avatar-sm)] shrink-0 items-center justify-center",
          "text-ink-secondary [&_svg]:size-[var(--icon-16)]",
        )}
      >
        {face.icon}
      </span>
    );
  }
  return (
    <Avatar
      /* `Avatar`'s own load state (`idle`/`loading`/`loaded`/`error`) lives
         on the component instance, not on `src` — it is set once by
         `AvatarImage`'s effect and nothing resets it when a LATER render
         hands the same instance a different `src`, or no `src` at all.
         Every other call site in this kit gives each record its own Avatar
         instance (a distinct list row, a distinct comment), so the state
         never had a reason to go stale. THE TRIGGER's face is the one place
         that is not true: one instance, and a value change can swap it from
         a photo option to a no-photo one without ever unmounting. Measured
         live in `verify/select-faces`: selecting "Owen Tate" (no photo)
         right after "Priya Raman" (a photo) left the trigger's mark BLANK —
         `status` was still `"loaded"` from Priya's photograph, so
         `AvatarFallback` kept hiding Owen's initials behind a photograph
         that was no longer there. Keying on the face's own identity forces
         a fresh instance — and a fresh `status` — exactly when the face
         itself changes, closing the race the same way a changed `key`
         forces a fresh img in `record-mark.tsx` (RecordMark.tsx's own
         header, this kit's app-side sibling). */
      key={face.src ? `img:${face.src}` : `initials:${face.name ?? ""}`}
      size="sm"
      shape={face.shape ?? "pill"}
      variant={face.tone ?? "default"}
      external={face.external}
      className="shrink-0"
      aria-hidden="true"
    >
      {face.src ? <AvatarImage src={face.src} alt="" /> : null}
      <AvatarFallback>{initialsOf(face.name)}</AvatarFallback>
    </Avatar>
  );
}

/* ----------------------------------------------------------------------------
   THE FACE REGISTRY; how the TRIGGER learns the selected option's face with
   NO per-call-site prop.

   Before this, a trigger only ever showed a face when the call site passed
   one explicitly (`SelectTrigger face={...}`); the call site had to resolve
   which option was chosen and hand its face across a second time, in a
   second place, and every Select that skipped that step (which was most of
   them) closed back down to a bare label the instant a face-carrying option
   was picked. Aurora, verbatim, on exactly this: "when I have selected, for
   example, the app, in the dropdown I see the icon, but I want to continue
   seeing it also once it's selected... still show it once it's selected, or
   the icon." The fix has to live on the SELECT SIDE, because that is the one
   place that already knows both which options exist and which one is
   chosen.

   `SelectItem` registers its own `(value, face)` pair into this registry as
   it renders; `SelectTrigger` reads the registry for the CURRENT value and
   draws that face automatically, `face` prop or not. An explicit `face` on
   the trigger still wins; this is additive, not a breaking change to the
   nine call sites that already pass one by hand.

   WHY THIS WORKS EVEN CLOSED: Radix keeps every `SelectItem` mounted at all
   times, open or shut; a closed `SelectContent` renders its children into a
   detached `DocumentFragment` rather than unmounting them (`SelectContent`/
   `SelectContentFragment` in `@radix-ui/react-select`, the same mechanism
   that lets `SelectValue` show the right TEXT before the list has ever been
   opened once). So every item's registering effect has already run by the
   time the trigger paints, closed list or not, and nothing here needs to
   peek at Radix's own internal value context to know that.

   WHY A SHADOW VALUE, NOT RADIX'S OWN: Radix's per-item `isSelected` lives on
   an internal, unexported context; reaching into it would pin this file to
   an implementation detail rather than the public `value`/`defaultValue`/
   `onValueChange` contract. `Select` below shadows the same value Radix
   tracks by intercepting `onValueChange` (controlled or not), so the
   registry can ask "whose face is this?" using only public API. */
interface SelectFaceRegistry {
  registerFace: (itemValue: string, face: SelectFace | undefined) => void;
  selectedFace: SelectFace | undefined;
}

const SelectFaceContext = React.createContext<SelectFaceRegistry | null>(null);

/* ----------------------------------------------------------------------------
   Root, group and value.

   `Select` holds the open state and the value; `SelectGroup` is a labelled
   run of options and paints nothing on its own; `SelectValue` renders the
   chosen option's text inside the trigger and takes the `placeholder` from
   the call site; which is why this component hardcodes no string anywhere.

   `Select` itself is no longer `SelectPrimitive.Root` bare; it wraps it in
   the face registry above, a shadow value and nothing else. Every prop
   (`value`, `defaultValue`, `onValueChange`, `open`, …) still passes straight
   through to Radix's own `Root`; this component adds no visible behaviour of
   its own.
   ------------------------------------------------------------------------- */
function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const currentValue = value !== undefined ? value : uncontrolledValue;

  // Read inside the registration callback without making every keystroke of
  // typing rebuild it; the callback's identity stays fixed across renders.
  const currentValueRef = React.useRef(currentValue);
  currentValueRef.current = currentValue;

  // Never cleared on an item's unmount: a closed list still needs yesterday's
  // selected face, and Radix's own fragment-mount trick (see above) means an
  // item that is still IN the tree never truly unmounts anyway. Only a face
  // that changes on a live value forces a repaint, via `bump` below.
  const facesRef = React.useRef<Map<string, SelectFace>>(new Map());
  const [, bump] = React.useReducer((n: number) => n + 1, 0);

  const registerFace = React.useCallback((itemValue: string, face: SelectFace | undefined) => {
    const map = facesRef.current;
    const had = map.get(itemValue);
    if (face) {
      if (had === face) return;
      map.set(itemValue, face);
    } else if (had === undefined) {
      return;
    } else {
      return; // see the comment above `facesRef`: registrations are never retracted.
    }
    if (itemValue === currentValueRef.current) bump();
  }, []);

  const handleValueChange = React.useCallback(
    (next: string) => {
      setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const selectedFace = currentValue ? facesRef.current.get(currentValue) : undefined;

  const registry = React.useMemo<SelectFaceRegistry>(
    () => ({ registerFace, selectedFace }),
    [registerFace, selectedFace],
  );

  return (
    <SelectFaceContext.Provider value={registry}>
      <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={handleValueChange} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectFaceContext.Provider>
  );
}
Select.displayName = "Select";

const SelectGroup = SelectPrimitive.Group;
SelectGroup.displayName = "SelectGroup";

const SelectValue = SelectPrimitive.Value;
SelectValue.displayName = "SelectValue";

const selectTriggerVariants = cva(
  [
    "flex w-full min-w-0 appearance-none items-center justify-between gap-2",

    // 44 tall · 18 inline padding (`--space-4h`, CH09) · full pill · one
    // hairline (FLD-B2). The hairline is
    // an INSET SHADOW, never a CSS `border`: the global rule is that no
    // component in this system carries one at any thinness, and the artifact
    // draws its own field hairline the same way — `box-shadow: inset 0 0 0
    // 1px var(--hair)` on the 999-radius search pill, CH19.
    "h-[var(--control-height-input)] px-[var(--space-4h)] rounded-pill",
    "bg-background text-foreground",

    // 14/300 — the control label step.
    "text-sm font-[var(--font-weight-light)] whitespace-nowrap cursor-pointer",

    // The chosen value must not push the chevron — or, on a `hideChevron`
    // trigger, whatever else the call site put beside it — out of the pill.
    "[&>span]:min-w-0 [&>span]:truncate [&>span]:text-start",

    // Nothing chosen yet: the placeholder is tertiary ink, exactly as a text
    // field's is. This IS the empty state; nothing else marks it.
    "data-[placeholder]:text-muted-foreground",

    "transition-[box-shadow,background-color]",
    "duration-[var(--duration-colour)] ease-kwapso",

    /* ---- Disabled. A fill, an ink and the WEAK edge — `--border` is 8% and
       the resting trigger is now 20%, which is what tells the two apart
       (override 42). The chevron greys with the label. ------------------ */
    "disabled:cursor-not-allowed disabled:shadow-[inset_0_0_0_0.0625rem_var(--border)]",
    "disabled:bg-hair-faint disabled:text-ink-disabled",
    "disabled:[&_svg]:text-ink-disabled",
  ],
  {
    variants: {
      /** Folded from `error` + `aria-invalid` in JS; see the header. */
      state: {
        default: [
          /* OVERRIDE 42 — THE RESTING EDGE IS `--hair-strong`, AND THERE IS
             NO HOVER. A select trigger is a FIELD, so CH09's two strengths
             govern it: `var(--hair2)` at rest, `var(--hair)` disabled. The
             build had them swapped and promoted 8% to 20% on hover, so a
             resting trigger and a disabled one carried the same stroke. The
             hover came from kwapso-ui.css and has no source in the artifact;
             it is gone and nothing replaces it. Only the INK changes here —
             the shape stays `inset 0 0 0 0.0625rem`, so the stroke is the
             same width it has always been.

             THE OPEN AND FOCUS INK BELOW IS NOT TOUCHED. CH09's "the
             hairline goes to ink" is the artifact's own answer to what a
             field does next, and it is the state the hover was standing in
             front of. Disabled keeps `--border` in the base block. */
          "shadow-[inset_0_0_0_0.0625rem_var(--hair-strong)] [&_svg]:text-ink-secondary",
          // Focus, and open: "the hairline goes to ink". The ring is global.
          "enabled:focus:shadow-[inset_0_0_0_0.0625rem_var(--foreground)]",
          "enabled:data-[state=open]:shadow-[inset_0_0_0_0.0625rem_var(--foreground)]",
        ],

        /**
         * Chapter 9: the border is poppy at 65%. `color-mix` keeps the 65%
         * token-driven, so dark re-resolves `--destructive` to poppy-lift and
         * the field is correct in both palettes with no second value. Same
         * treatment, same contradiction with kwapso-ui.css, as GAPS.md INP-2.
         */
        error: [
          "shadow-[inset_0_0_0_0.0625rem_color-mix(in_srgb,var(--destructive)_65%,transparent)]",
          "[&_svg]:text-ink-secondary",
          /* The hover freeze that used to sit here held the default's hover
             still. There is no longer a hover to hold — override 42. */
          "enabled:focus:shadow-[inset_0_0_0_0.0625rem_var(--destructive)]",
          "enabled:data-[state=open]:shadow-[inset_0_0_0_0.0625rem_var(--destructive)]",
        ],
      },
    },
    defaultVariants: { state: "default" },
  },
);

export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  /**
   * The field has failed validation. Also sets `aria-invalid` when the call
   * site has not set it itself, so a form library that only speaks
   * `aria-invalid` reaches the same skin without this prop.
   */
  error?: boolean;
  /**
   * Draw NO chevron. Off by default, so a field keeps CH09's
   * `.kw-selectwrap__chevron` and every existing call site is untouched.
   *
   * Client, 2026-09-02, verbatim: *"on the sort, rmeove the chevron after the
   * word. i know its a button"* and *"same on views - rmeove the chevron"*.
   * The two that opt in are the TOOLBAR pills — `SortControl`'s field and
   * `ViewSwitch` — which the client has spent this week matching to the
   * filter chip, a pill that never carried a caret. In that row they read as
   * buttons, and she says so.
   *
   * THE OPT-OUT HAS TO LIVE HERE. The glyph is `SelectPrimitive.Icon`'s, so
   * no utility at a call site can take it away: `[&>svg]:hidden` would leave
   * this trigger's `gap-2` and the icon's 16 of room behind, and the pill
   * would keep the width of a chevron it no longer draws. Not rendering it is
   * the only way the room goes with it.
   *
   * The base is `justify-between`, so a trigger left holding ONE child puts
   * that child at the inline start on its own. A call site that puts a SECOND
   * child in — `ViewSwitch`'s leading view icon — says `justify-start` itself.
   */
  hideChevron?: boolean;
  /**
   * The trigger's OWN face — the same mark the chosen option draws in the
   * list. Radix clones `ItemText`'s children into the trigger to render the
   * chosen value (see `SelectItem`'s own note on why the mark sits outside
   * `ItemText` and is therefore never cloned along with it), so the trigger
   * cannot pick this up on its own; the call site already knows which option
   * is selected — it is what supplies `SelectValue`'s `placeholder` — so it
   * passes that option's face here too. `undefined` draws nothing, exactly as
   * before this prop existed.
   *
   * Built `justify-start` BY CONSTRUCTION when given, the same move
   * `hideChevron`'s own doc above describes a call site making by hand for a
   * second child — this one is the kit's, not a call site's, so the kit makes
   * it. The chevron takes `ms-auto` in the same case, so it still lands at
   * the trailing edge regardless.
   */
  face?: SelectFace;
}

/**
 * The closed control: a field pill with a chevron — unless `hideChevron`, the
 * opt-out the two toolbar pills take (see the prop).
 *
 * TEN STATES
 *  1. default        — page fill, one hairline at `--hair-strong`, pill,
 *                      44 tall (override 42).
 *  2. hover          — does not apply. CH09 draws a field at rest, at focus
 *                      and disabled and no hover for any of them; the one
 *                      this file carried came from kwapso-ui.css. Nothing
 *                      replaces it — the next thing a trigger does is state
 *                      3, and state 3 is a real drawn move here.
 *  3. focus-visible  — the hairline goes to ink here; the RING is tokens.css §8
 *                      and this file adds none.
 *  4. active/pressed — the OPEN state, which takes the same ink hairline as
 *                      focus. A select has no separate pressed moment: the
 *                      press opens the list, and the list is the feedback.
 *  5. disabled       — `--hair-faint` fill, `--ink-disabled` label and
 *                      chevron, and the WEAK 8% edge against the resting
 *                      trigger's 20% (override 42). Set on `<Select
 *                      disabled>` or here; both reach the same skin.
 *  6. loading        — does not apply to the trigger itself. A select whose
 *                      OPTIONS have not arrived is `disabled` with the
 *                      placeholder showing; a select whose VALUE has not
 *                      arrived shows a `Skeleton` in its place, because
 *                      rendering the placeholder would say "nothing chosen",
 *                      which is an answer and a wrong one. See GAPS-B.md
 *                      SEL-5.
 *  7. empty          — the placeholder, in tertiary ink, via
 *                      `data-[placeholder]`. `SelectValue` takes the string
 *                      from the call site, so nothing here needs translating.
 *  8. error          — `error` or `aria-invalid`: poppy hairline at 65%. The
 *                      MESSAGE beside it is ink, never poppy, and belongs to
 *                      `field` (chapter 9: "error text poppy-free").
 *  9. selected       — the chosen option's text replaces the placeholder and
 *                      goes to primary ink. The trigger itself is never
 *                      "selected"; the selection lives on an item.
 * 10. read-only      — does not apply. Radix exposes none, and a value the
 *                      user may not change is `disabled` — which is exactly
 *                      how chapter 9 treats a system-set field, minus the
 *                      borderless skin a real read-only input gets.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. `w-full` and 44 tall at every
 *  width, which is already the touch row. A select does not become a sheet on
 *  a phone in this system: Radix's native-feeling list is already
 *  touch-scrollable, and a sheet would be a second drawing of the same
 *  control. Logged as GAPS-B.md SLC-4.
 *
 * RTL — safe. `px-*` is padding-inline, the chevron — when it is drawn at all
 * — is placed by `justify-between` rather than by a side, and Radix mirrors
 * the list's alignment from `dir`.
 */
const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(
  (
    { className, children, error, hideChevron = false, face, "aria-invalid": ariaInvalid, ...props },
    ref,
  ) => {
    const invalid = error ?? (ariaInvalid === true || ariaInvalid === "true");

    // An explicit `face` still wins (nine call sites already pass one by
    // hand and keep working byte-identical); everyone else gets the
    // registry's own answer for the CURRENT value, with no prop at all. See
    // the face-registry block above `Select` for why this is safe to read
    // even before the list has ever been opened.
    const registry = React.useContext(SelectFaceContext);
    const resolvedFace = face ?? registry?.selectedFace;

    return (
      <SelectPrimitive.Trigger
        ref={ref}
        data-slot="select-trigger"
        aria-invalid={invalid || undefined}
        className={cn(
          selectTriggerVariants({ state: invalid ? "error" : "default" }),
          resolvedFace ? "justify-start" : undefined,
          className,
        )}
        {...props}
      >
        {resolvedFace ? <SelectFaceMark face={resolvedFace} /> : null}
        {children}
        {hideChevron ? null : (
          <SelectPrimitive.Icon asChild>
            {/* `--icon-button` (16) on `--ink-secondary`, as `.kw-selectwrap__chevron`
                draws it. The colour is set by the cva so the disabled skin can
                reach it. `ms-auto` only when `resolvedFace` claimed `justify-start`
                above — without it the base `justify-between` already pins the
                chevron to the end on its own. */}
            <CaretDown className={cn("size-[var(--icon-button)] shrink-0", resolvedFace ? "ms-auto" : undefined)} />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>
    );
  },
);

SelectTrigger.displayName = "SelectTrigger";

/* ----------------------------------------------------------------------------
   Scroll affordances — local, not exported. Radix renders them only when the
   list overflows. They are chrome, not options: `cursor-default`, no hover,
   and the glyph is decoration so it stays `aria-hidden`.
   ------------------------------------------------------------------------- */
const scrollButtonClasses =
  "flex cursor-default items-center justify-center py-1 text-ink-secondary";

function SelectScrollUpButton() {
  return (
    <SelectPrimitive.ScrollUpButton className={scrollButtonClasses}>
      <CaretUp className="size-[var(--icon-button)]" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton() {
  return (
    <SelectPrimitive.ScrollDownButton className={scrollButtonClasses}>
      <CaretDown className="size-[var(--icon-button)]" />
    </SelectPrimitive.ScrollDownButton>
  );
}

const selectContentClasses = [
  /* z-70, WITH THE OTHER THREE ANCHORED SURFACES, and 50 was not a smaller
     number — it was a broken control.
     ------------------------------------------------------------------
     This list is PORTALLED (see `SelectContent` below): it renders at the
     document root, so its z-index competes with every other overlay in the
     app rather than with the form it belongs to. The system's layers are
     sheet 55, dialog and alert-dialog 60, then popover, dropdown-menu,
     tooltip and hover-card at 70 — the four anchored surfaces that have to
     open OVER a dialog, because a dialog is where a form lives and a form is
     where you pick things.

     Select was the only portalled surface left under that line. Inside a
     dialog it opened BEHIND the dialog it was opened from: the list was
     painted, the options were there, and every click landed on the dialog in
     front of it. On a phone, where the list fills most of the screen, the
     effect is a form whose pickers simply do not work — reported from a
     handset with three dead pickers on one form.

     It is not a taste call and it has no downside: 70 is the layer the kit
     already assigns to "anchored to a control, must clear a dialog", and a
     Select is exactly that. */
  "relative z-[70] overflow-hidden",

  // Chapter 12's floating surface: raised paper at 24 under the overlay
  // shadow, padded `--space-2h`. No blur, no border, no arrow.
  "rounded-[var(--radius)] border-0 bg-card text-card-foreground",
  "shadow-[var(--shadow-overlay)] p-[var(--space-2h)]",

  // Never narrower than the field it belongs to, never taller than the space
  // Radix measured. Both are Radix's own custom properties.
  "min-w-[var(--radix-select-trigger-width)]",
  "max-h-[var(--radix-select-content-available-height)]",

  // The kit's 8 of air between a floating surface and its trigger, as a
  // margin rather than a Radix pixel offset — a margin is rem and scales with
  // the text-size control, and the block axis does not mirror.
  "data-[side=bottom]:mt-2 data-[side=top]:mb-2",

  // Attached, not written. motion/motion.css owns the rise and the fade.
  "motion-anchored",
];

export type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
>;

/**
 * The open list. Portalled, so it escapes any `overflow: hidden` the form
 * happens to sit in.
 *
 * TEN STATES
 *  1. default        — raised paper at 24 under `--shadow-overlay`, no blur.
 *  2. hover          — does not apply to the SURFACE. The rows hover; the
 *                      paper they sit on does not.
 *  3. focus-visible  — NOT here. Focus lands on an ITEM, and tokens.css §8
 *                      rings that item at its own pill radius.
 *  4. active/pressed — belongs to the items.
 *  5. disabled       — does not apply. A disabled select never opens, so this
 *                      surface has no disabled form.
 *  6. loading        — does not apply. Radix mounts the list from the options
 *                      it was given; options that have not arrived mean the
 *                      trigger is `disabled`, not that the list draws a
 *                      spinner (GAPS-B.md SLC-2).
 *  7. empty          — no items renders the bare padded pill: 20 of paper
 *                      under the overlay shadow. The kit draws no empty menu
 *                      and this file invents no "No options" line, because a
 *                      string baked in here could not be translated. A caller
 *                      with nothing to offer passes a disabled `SelectItem`
 *                      whose label they own. Logged as GAPS-B.md SLC-3.
 *  8. error          — does not apply. Error belongs to the field.
 *  9. selected       — belongs to the items.
 * 10. read-only      — does not apply.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED in treatment; the SIZE is measured,
 *  not chosen: at least as wide as the trigger, at most as tall as the space
 *  Radix found. That is the same rule at every width, and it is why there is
 *  no phone variant.
 *
 * RTL — safe. Radix flips the list's alignment from `dir`; the 8 of air is on
 * the block axis, which does not mirror.
 */
const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      data-slot="select-content"
      position={position}
      className={cn(selectContentClasses, className)}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "h-full w-full",
          // In popper mode Radix does not size the viewport itself.
          position === "popper" && "min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

SelectContent.displayName = "SelectContent";

const selectItemClasses = [
  // `.kw-menu__item`: a pill row, 10 block / 12 inline, 14/300 on primary ink.
  "relative flex w-full cursor-pointer select-none items-center",
  "gap-[var(--space-2h)] rounded-pill py-[var(--space-2h)] px-3",
  "text-sm font-[var(--font-weight-light)] text-foreground",

  // Highlighted — keyboard or pointer, Radix says so with one attribute. The
  // kit's neutral row wash, never mango.
  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",

  // Dead rows take an ink and no wash — Radix never highlights a disabled
  // item, so the two can never meet and there is nothing to race.
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-disabled",

  // Attached, not written. motion/motion.css owns the row's colour swap.
  "motion-menu-item",
];

export interface SelectItemProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  /**
   * A glyph leading the label — one of the kit's forty, at the 16 delivery
   * size in secondary ink. Ruling 34 is the rule it serves: a module is
   * identified by its icon, in the rail, on the record AND in a picker, so a
   * picker that could only carry text was the picker being wrong.
   */
  icon?: React.ReactNode;
  /**
   * A picture leading the label — a logo, an avatar, a thumbnail. Drawn as
   * ruling 30's record mark: a 24 SQUARE at the 6 selection radius, `flex:
   * none`, the picture FILLING that square and cropping to it — the same
   * treatment `AvatarImage` gives a record's own mark, so an option's mark
   * and the record it names cannot show two silhouettes of one asset
   * (RULES.md §4.4). Ignored when `icon` is given; a row carries one mark,
   * never two.
   */
  image?: string;
  /**
   * The picture's alternative text. `""` by default, which is correct here:
   * the label beside it already says what the option is, so the image is
   * decorative and a screen reader must not read the name twice.
   */
  imageAlt?: string;
  /**
   * A face leading the label — the SAME `Avatar` primitive the record's own
   * list row draws: a photograph when `face.src` is given, the record's own
   * initials otherwise, never a bare `<img>` with no fallback. This is the
   * law for every choice over a person, a contact, an account or an app (the
   * client, verbatim: "every time there is an avatar, I want to also see it
   * in the choice component"). Takes priority over `image` when both are
   * given — a row carries one mark; `image` is kept working unchanged for
   * every call site that has not moved to `face` yet.
   */
  face?: SelectFace;
}

/**
 * One option — a label, and optionally an image OR an icon beside it.
 *
 * THE MARK SITS OUTSIDE `ItemText`, and that is load-bearing rather than
 * tidy: Radix clones `ItemText`'s children into the trigger to render the
 * chosen value. An `<img>` cloned into a 44 pill would be a second, unasked-
 * for drawing in the field. Keeping the mark a sibling means the list shows
 * the picture and the closed field shows the words.
 *
 * The chosen row is marked with a tick at the reading end, NOT with the
 * inverse fill the rest of chapter 10's family uses. A full inverse row would
 * sit on the same element as the `--accent` highlight wash and the two would
 * fight: moving the keyboard onto the already-chosen row would have to either
 * lose the selection or lose the highlight. The tick is a second channel and
 * survives both. Logged as GAPS-B.md SLC-1 — the kit draws no select list.
 *
 * TEN STATES
 *  1. default        — pill row, 14/300, primary ink.
 *  2. hover          — `--accent`, the kit's neutral row wash. Pointer and
 *                      keyboard are one state here because Radix reports them
 *                      as one attribute, which is right: a menu has a single
 *                      "the row you are on".
 *  3. focus-visible  — NOT here. Radix moves real DOM focus onto the row, so
 *                      tokens.css §8 rings it at its own pill radius. Nothing
 *                      in this file suppresses that, which is the one place
 *                      this component deliberately departs from shadcn.
 *  4. active/pressed — does not apply. The press commits the choice and
 *                      closes the list; a pressed skin would be shown for the
 *                      length of a frame.
 *  5. disabled       — `--ink-disabled`, not-allowed, and no wash. An option
 *                      that cannot be chosen still has to be readable, which
 *                      is why the row keeps its paper.
 *  6. loading        — does not apply to a row.
 *  7. empty          — does not apply. An option always carries a label; a
 *                      row with no children is a row that should not exist.
 *  8. error          — does not apply. An option cannot be invalid; the FIELD
 *                      can, and it draws that itself.
 *  9. selected       — a tick at the reading end, in primary ink. See the
 *                      note above for why this one member of the family is
 *                      not the inverse fill.
 * 10. read-only      — does not apply.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED. The row is 10 + 14 + 10 ≈ 40 tall,
 *  the kit's standing control height, at every width. It is under the 44
 *  touch row by 4; the kit draws menu rows at this density on every device
 *  and nothing here overrides it (GAPS-B.md SLC-5).
 *
 * RTL — safe. `px-*` is padding-inline, the tick is pushed out by `ms-auto`
 * (margin-inline-start), and the row's order follows the document direction.
 */
const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, icon, image, imageAlt = "", face, ...props }, ref) => {
  // Register this option's face into the trigger's own registry; see the
  // face-registry block above `Select`. Radix keeps every item mounted
  // (open or shut, see that same comment), so this runs and the trigger has
  // the face ready well before the list is ever opened. Unconditional: a
  // value with no `face` registers `undefined`, which the registry already
  // treats as a no-op rather than erasing a face registered a render ago.
  const registry = React.useContext(SelectFaceContext);
  React.useEffect(() => {
    registry?.registerFace(props.value, face);
  }, [registry, props.value, face]);

  return (
  <SelectPrimitive.Item
    ref={ref}
    data-slot="select-item"
    className={cn(selectItemClasses, className)}
    {...props}
  >
    {icon !== undefined && icon !== null ? (
      <span
        aria-hidden="true"
        data-slot="select-item-icon"
        className={cn(
          "inline-flex size-[var(--icon-16)] shrink-0 items-center justify-center",
          "text-ink-secondary [&_svg]:size-[var(--icon-16)]",
        )}
      >
        {icon}
      </span>
    ) : face ? (
      <SelectFaceMark face={face} />
    ) : image ? (
      <img
        src={image}
        alt={imageAlt}
        data-slot="select-item-image"
        /* Ruling 30's square record mark at 24, ruling 03's 6 for a mark.
           `object-cover`, and that is a CORRECTION rather than a preference.
           This line shipped as `object-contain` on the strength of CH27.28's
           *"Portrait assets letterbox onto paper rather than being cropped to
           fill"* — and the client overruled that sentence on 2026-09-09:
           *"everywhere for images: do fill, not fit!"*, with a wide logo
           losing its ends named as the INTENDED consequence.
           The deeper reason is that this mark was disagreeing with the kit's
           own. A record's mark is `Avatar shape="square"`, whose `AvatarImage`
           has covered since it was written, and `company-hub.tsx` draws a
           supplied company logo through exactly that. So Padelbase's logo was
           cropped in the record and letterboxed one row down in the picker
           that chooses it — the same asset, the same size, two silhouettes.
           RULES.md §4.4. */
        className={cn(
          "size-[var(--avatar-sm)] shrink-0 object-cover",
          "rounded-[var(--radius-select)] bg-surface-quiet",
        )}
      />
    ) : null}
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="ms-auto grid place-content-center">
      <CheckFat className="size-[var(--icon-button)]" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
  );
});

SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  selectTriggerVariants,
  selectItemClasses,
};
