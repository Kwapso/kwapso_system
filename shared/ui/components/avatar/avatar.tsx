/* ============================================================================
   Avatar — the person mark (45 direct call sites).

   DESIGN SOURCE
   design-mothership/specimens/_fragments/t11.css → `.kw-avatar` and its three
   sizes, and `.kw-mark`, the square twin. The fragment's own header states
   the ruling both are drawn from:

       "Avatars — pill for a person (ruling 30), 24 / 32 / 48, flex none.
        Initials step down with the size: micro / badge / body-s."
       "Record marks — square for a thing (ruling 30), same three sizes,
        flex none. Two characters or a module icon, never three, never a
        photograph. Radius: --radius-select (6)."

   THE LAW THIS FILE OBEYS
   · Ruling 30: SQUARE FOR A THING, PILL FOR A PERSON, at 24 / 32 / 48
     (`--avatar-sm` / `--avatar-md` / `--avatar-lg`), and `flex: none` at
     every size so a mark never squeezes inside a tight row. `size="control"`
     (40, `--avatar-control`) is a later, NAMED EXCEPTION to this ladder —
     Aurora, on TicketThread's message-actions menu: "make the avatar as big
     as this button" — never a fourth rung a caller reaches for by habit.
   · TWO initials, never three. A string fallback is cut to two characters by
     this component rather than by the call site, because 45 call sites cannot
     each be trusted to remember. A node fallback (a module icon) passes
     through untouched, which is the kit's other stated option.
   · The kit's mark holds no photograph at all. `AvatarImage` exists because
     the commission requires it and 45 call sites already pass one; the
     CONTRADICTION is logged as GAPS-F AVA-1 rather than resolved silently.
   · Charcoal on every accent. `variant="brand"` is mango with charcoal ink,
     and the kit rules ONE mango mark per view — it is opt-in, never default.
   · Focus is ONE global rule (tokens.css §8). An avatar is not focusable; a
     link around one is, and it takes the ring at its own radius.

   RENDERING CONTEXT
   `"use client"`. The image's load state is real state: the fallback has to
   know whether the photograph arrived, and `AvatarFallback` honours a
   `delayMs` timer. Radix's `@radix-ui/react-avatar` is not a dependency of
   this repository, so the small state machine is local — see GAPS-F AVA-2.
   ========================================================================= */

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/* ----------------------------------------------------------------------------
   The load state machine, shared between the three parts exactly as Radix
   shares it: the image reports, the fallback listens.

   `idle` is the state when no `AvatarImage` has mounted at all, which is the
   common case at these call sites — an initials-only mark. It shows the
   fallback immediately, with no delay, because there is nothing to wait for.
   ------------------------------------------------------------------------- */
type LoadStatus = "idle" | "loading" | "loaded" | "error";

interface AvatarContextValue {
  status: LoadStatus;
  setStatus: (status: LoadStatus) => void;
  /** WHOSE FACE THIS IS — see `Avatar`'s own `external` prop. It travels on
   * the context rather than as a second prop on `AvatarImage`, for the same
   * reason `status` does: the call site sets it ONCE on the mark, and the
   * photograph inside reads it. A call site that had to remember to put the
   * same word on both would be a call site that puts it on one. */
  external: boolean;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext(part: string): AvatarContextValue {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside an <Avatar>.`);
  }
  return context;
}

const avatarVariants = cva(
  [
    // `position: relative` so a presence dot or a stack ring can be hung on
    // it by a composition without that composition re-declaring the box.
    "relative inline-grid place-content-center",
    // `flex: none` — ruling 30, stated for both the mark and the avatar.
    "shrink-0 grow-0",
    // A mark is never selected as text, and the photograph is clipped to the
    // mark's own shape.
    "select-none overflow-hidden",
    // Saans Medium. The kit's initials are always the heavier of the two
    // weights the family ships.
    "font-[var(--font-weight-medium)] leading-none uppercase",
  ],
  {
    variants: {
      /**
       * Ruling 30, as one prop. The kit's own two words, so nothing is
       * coined: a PILL is a person, a SQUARE is a thing (a record mark).
       */
      shape: {
        pill: "rounded-pill",
        square: "rounded-[var(--radius-select)]",
      },
      size: {
        /** 24 · `--avatar-sm`, initials at the micro step. */
        sm: "size-[var(--avatar-sm)] text-micro",
        /** 32 · `--avatar-md`, initials at the badge step. The kit's default. */
        md: "size-[var(--avatar-md)] text-badge",
        /**
         * 48 · `--avatar-lg`. The kit says "body-s" here, a name this token
         * set does not carry; 14 is `text-sm`, the step the kit's body-s
         * holds. Mapping logged as GAPS-F AVA-3.
         */
        lg: "size-[var(--avatar-lg)] text-sm",
        /**
         * 40 · `--avatar-control`, a NAMED EXCEPTION to ruling 30's 24/32/48
         * ladder, not a fourth rung on it — see that token's own comment in
         * tokens.css. Exists for exactly one caller, `TicketThread`'s
         * `faceSize="md"` (Aurora: "make the avatar as big as this
         * button"), so a face can sit beside a `size="icon"` button
         * (`--control-height-button`) at the SAME height. Initials at
         * `text-sm`, the same step `lg` reads — 40 sits far closer to lg's
         * 48 than to md's 32, and two initials read better a step up.
         */
        control: "size-[var(--avatar-control)] text-sm",
      },
      variant: {
        /**
         * `.kw-avatar` - raised paper, normal ink.
         *
         * THE FILL IS RELATIONAL NOW, 21 SEP 2026, AND IT IS THE SAME DEFECT
         * `SearchInput` HAD IN v1.2.146. This read `bg-card`: a FIXED
         * address at off-beige, which is also the colour of the body pane a
         * face most often stands on. Measured live on the tickets list
         * during the minimal pass, two of the three faces on screen painted
         * rgb(255, 254, 249) against a pane of rgb(255, 254, 249) - ratio
         * 1.000. The initials still read, because they are charcoal on
         * white, so nothing looked broken: a person was simply two floating
         * letters with no disc. Only the `inverse` face in the rail still
         * read as a face at all.
         *
         * `--surface-lift` is the kit's own answer to exactly this question
         * (tokens.css §4): "for the parts that are handed to a ground they
         * cannot see". An avatar is the purest case of that - it is dropped
         * into a rail, a table row, a chat bubble, a charcoal footer and a
         * plain record section by callers who never tell it which - so it
         * takes the OTHER paper from whatever §8 says it is standing on:
         * soft paper on the page, off-beige inside a panel. Measured 1.103
         * light / 1.111 dark in both directions.
         *
         * `bg-surface-lift`, THE NAMED CLASS, NEVER `bg-[var(--surface-
         * lift)]`. tokens.css §8 keys its rebinds off class NAMES, and the
         * arbitrary spelling paints the identical colour while taking the
         * element out of every one of them - the failure `toolbar-row.tsx`
         * documents at length and `screen-shell.tsx`'s `BODY` hit from the
         * other side. The @theme bridge carries `--color-surface-lift` for
         * this exact class.
         *
         * A FACE WITH A PHOTOGRAPH IS UNAFFECTED either way: the image
         * covers the fill. This is the INITIALS face, which is most of them.
         */
        default: "bg-surface-lift text-foreground",
        /** `.kw-avatar--inverse` — charcoal fill, off-beige ink. */
        inverse: "bg-surface-inverse text-ink-on-inverse",
        /**
         * `.kw-avatar--mango` / `.kw-mark--mango` — the brand fill with
         * CHARCOAL ink. The kit's own comment on the square twin is "One mark
         * per view may take the mango fill", so this is opt-in and never the
         * default. Never a status.
         */
        brand: "bg-surface-brand text-ink-on-accent",
        /**
         * The overflow chip at the end of a stack: `.kw-avatarstack__more`,
         * the hairline used as a fill. Added, not required; without it a
         * stack's "+3" would hand-roll a colour.
         */
        quiet: "bg-border text-ink-secondary",
      },
    },
    defaultVariants: { shape: "pill", size: "md", variant: "default" },
  },
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<"span">,
    VariantProps<typeof avatarVariants> {
  /**
   * IS THIS PERSON FROM OUTSIDE? Aurora's ruling, 23 Sep 2026, verbatim:
   * *"external photos (from contacts) gray scale. keep staff nirmal."*
   * ("nirmal" is normal.) An outside person's PHOTOGRAPH renders in
   * greyscale; one of our own renders in full colour, so a reader can tell
   * at a glance whose face they are looking at, in a table, on a card, in a
   * chip, in an attendee list, on a record's header mark, anywhere.
   *
   * IT IS A FACT, NOT A GUESS. The kit has no idea who anybody is — it holds
   * no notion of a team, a contact, or a company — so this is the one thing
   * it can do honestly: TAKE the answer and draw it. A component that tried
   * to infer "external" from a URL's host, or from whether initials were
   * supplied, would be wrong the first time somebody put a staff photograph
   * on a CDN.
   *
   * THE DEFAULT IS COLOUR (`false`), AND THAT IS A DELIBERATE CHOICE
   * BETWEEN TWO IMPERFECT ONES. Defaulting to GREYSCALE fails more loudly —
   * a call site nobody has updated greys our own people, which somebody
   * notices the same morning — and it fails by SAYING SOMETHING FALSE about
   * a real person, in every app that vendors this kit, on a screen nobody
   * here can see. Defaulting to COLOUR is the status quo: an un-updated call
   * site is merely NOT YET TREATED, never WRONGLY treated, and no face ever
   * claims to be something it is not. So the loudness is bought somewhere
   * that cannot lie instead — `check-avatar.mjs` reads every `AvatarImage`
   * this kit renders and fails the build where the mark around it is not
   * told, which is louder than a grey face (it is red, and it is before the
   * thing ships) and costs nobody a false statement in the meantime.
   *
   * IT IS ABOUT THE PHOTOGRAPH, NOT THE INITIALS. Her word was "photos", and
   * this file draws the two separately: `AvatarImage` desaturates,
   * `AvatarFallback` does not. An initials tile has no colour OF THE PERSON
   * to remove — its fill is the mark's own variant, the same token every
   * other mark on the screen paints — so greying it would not say "external",
   * it would say "quiet", a word this kit already spends on `variant="quiet"`
   * for a different meaning entirely.
   *
   * A SQUARE MARK NEVER PASSES IT. `shape="square"` is a THING (ruling 30) —
   * a company's logo, a record's mark — and a company is not a person to be
   * one of us or not. Nothing enforces that here; it is simply never true.
   */
  external?: boolean;
}

/**
 * A person's mark, or — with `shape="square"` — a thing's.
 *
 * TEN STATES
 *  1. default        — variant fill, initials or a photograph, at the size.
 *  2. hover          — does not apply. A mark is a label. Where one sits in a
 *                      hoverable row the ROW carries `--accent`, and where it
 *                      is itself a link the link carries the hover; a mark
 *                      that lit up on its own would make every list twinkle.
 *  3. focus-visible  — NOT here. tokens.css §8 rings every focusable thing at
 *                      once, and an avatar is not focusable in the first
 *                      place.
 *  4. active/pressed — does not apply.
 *  5. disabled       — does not apply. A person is not disabled. An inactive
 *                      record's mark takes `variant="quiet"`, which is a
 *                      meaning rather than a state.
 *  6. loading        — the PHOTOGRAPH's loading is a real state and it is
 *                      handled: while the image is in flight the fallback
 *                      holds the box, so nothing reflows when it lands and
 *                      nothing flashes empty. `AvatarFallback delayMs` exists
 *                      for the opposite case — suppressing the initials on a
 *                      fast connection.
 *  7. empty          — no image and no fallback children renders the bare
 *                      coloured box at the right size. Deliberately NOT
 *                      `null`: a missing mark in a list of rows shifts every
 *                      line beside it, and the box IS the information that
 *                      someone is there. This is the one place the system
 *                      does not prefer nothing.
 *  8. error          — an image that fails to load falls back to the initials
 *                      silently and permanently. That is the whole error
 *                      story; a broken-image glyph is never shown.
 *  9. selected       — does not apply. The kit draws no selected mark. A
 *                      selected ROW is the table's or the list's business.
 * 10. read-only      — always. A mark holds no value.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED, and this one is load-bearing rather
 *  than lazy. Ruling 30 states three sizes and states them absolutely, and a
 *  mark's size is what encodes WHAT IT IS: 24 in a dense row, 32 in a list,
 *  48 on a record header. If 48 shrank to 32 on a phone it would start
 *  meaning "list item" at that width. The row around it restacks; the mark
 *  does not. `flex: none` is what makes that survive a narrow viewport.
 *
 * RTL — safe. The box is square, the initials centre, and nothing is
 * positioned by side. A stack's overlap is the composition's, and it must use
 * `-ms-*` when it builds one (the kit's own `margin-left: -10` is physical
 * and is logged as GAPS-F AVA-4).
 */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    { className, shape = "pill", size = "md", variant = "default", external = false, children, ...props },
    ref,
  ) => {
    const [status, setStatus] = React.useState<LoadStatus>("idle");
    const value = React.useMemo(() => ({ status, setStatus, external }), [status, external]);

    return (
      <AvatarContext.Provider value={value}>
        <span
          ref={ref}
          data-slot="avatar"
          data-shape={shape ?? "pill"}
          data-size={size ?? "md"}
          /* PUBLISHED, so the fact is readable from the DOM — by a test, by a
             measuring script, and by a composition that needs to know without
             re-deriving it. Written only when TRUE (`undefined` otherwise, the
             same shape `aria-hidden` is given above), so the attribute's mere
             presence is the answer and an un-updated mark carries nothing at
             all rather than a cheerful `data-external="false"` that would read
             as "we checked, and they are ours". */
          data-external={external ? "true" : undefined}
          className={cn(avatarVariants({ shape, size, variant }), className)}
          {...props}
        >
          {children}
        </span>
      </AvatarContext.Provider>
    );
  },
);

Avatar.displayName = "Avatar";

export interface AvatarImageProps extends React.ComponentPropsWithoutRef<"img"> {
  /** Fires as the load state settles, mirroring the Radix API this replaces. */
  onLoadingStatusChange?: (status: LoadStatus) => void;
}

/**
 * The photograph. Unmounts itself when the source fails, so the fallback is
 * the only thing left rather than sitting behind a broken image.
 *
 * `alt` is not defaulted and not invented: a mark that repeats the name
 * beside it is noise to a screen reader, so the honest default is the empty
 * string the call site passes, and the call site is the only place that knows
 * whether the name is already in the row. PATTERN §7 — the best default is no
 * string.
 *
 * A CACHED OR SERVER-RENDERED PHOTOGRAPH CAN FINISH — OR FAIL — BEFORE ITS OWN
 * `onLoad`/`onError` EVER ATTACH. The browser starts resolving an `<img src>`
 * the instant it enters the DOM; for a hydrated tree that is before React has
 * wired the two handlers below, and for a warm cache it can simply be faster
 * than the attach. Either way the DOM event fires at nobody, `status` never
 * reaches `"loaded"`, and `AvatarFallback` — which hides only on that exact
 * status — never hides: the photograph paints and the initials sit on top of
 * it, permanently, which is the client's 18 Sep 2026 report ("we see the
 * avatar AND the initials"). `components/image/image.tsx` already reads the
 * image's own `complete`/`naturalWidth` after mount to close the identical
 * race for the success case, and `RecordMark`
 * (kwapso_system/shared/web/record-mark.tsx, an app-side file, not the kit's)
 * independently found and fixed the same race for BOTH the success and the
 * failure case. `innerRef`/`setRefs` below is `Image`'s own merge-ref
 * pattern, read the same way, so this seam and that one stop drifting.
 *
 * TEN STATES — see `Avatar`; the image owns loading and error and nothing
 * else.
 * THREE BREAKPOINTS — UNCHANGED. It fills the mark at every width.
 * RTL — safe. `object-cover` has no direction.
 */
const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onLoad, onError, onLoadingStatusChange, src, ...props }, ref) => {
    const { status, setStatus, external } = useAvatarContext("AvatarImage");

    /* The callback is held in a ref rather than listed as a dependency. A
       call site that passes an inline arrow gets a new identity every render,
       and an effect that re-ran on that would push a loaded image back to
       "loading" on any parent re-render — the initials would flash back over
       a picture that is already on screen. */
    const notify = React.useRef(onLoadingStatusChange);
    React.useEffect(() => {
      notify.current = onLoadingStatusChange;
    });

    /* The internal handle `Image` already keeps, merged with whatever ref a
       call site passed, so both the forwarded ref and this file's own
       post-mount `complete` check see the same node. */
    const innerRef = React.useRef<HTMLImageElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLImageElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.RefObject<HTMLImageElement | null>).current = node;
      },
      [ref],
    );

    /* Report "loading" as soon as a source is known, and treat a missing
       source as a failure rather than as a permanent wait — an <img> with no
       src fires neither load nor error. Then, in the SAME effect (so it runs
       once per `src`, straight after the node it reads is mounted), read the
       node the browser already has an answer for: `complete` is true the
       instant a cached or already-resolved fetch is attached to, whether it
       ended in bytes (`naturalWidth > 0`, "loaded") or a 404 (`naturalWidth
       === 0`, the same test `RecordMark` and `Image` both use, "error"). A
       fetch still in flight leaves `complete` false and changes nothing here;
       the ordinary `onLoad`/`onError` handlers below settle it when it
       answers. */
    React.useEffect(() => {
      const next: LoadStatus = src ? "loading" : "error";
      setStatus(next);
      notify.current?.(next);

      if (!src) return;
      const node = innerRef.current;
      if (node && node.complete) {
        const settled: LoadStatus = node.naturalWidth > 0 ? "loaded" : "error";
        setStatus(settled);
        notify.current?.(settled);
      }
    }, [src, setStatus]);

    if (status === "error") return null;

    return (
      <img
        ref={setRefs}
        data-slot="avatar-image"
        src={src}
        /* GREYSCALE FOR AN OUTSIDE PERSON — Aurora, 23 Sep 2026: "external
           photos (from contacts) gray scale. keep staff nirmal." See
           `AvatarProps.external` for why the fact is taken rather than
           guessed, and why the default is colour.

           `grayscale` IS A TAILWIND CORE UTILITY (`filter: grayscale(100%)`),
           not a token this kit has to mint: there is no COLOUR here to name.
           §32-shaped laws are about which ink a thing paints; this removes
           chroma from a PHOTOGRAPH, whose colours were never ours to have a
           token for in the first place — an arbitrary value or a new
           `--surface-*` entry would both be pretending otherwise.

           IT SITS ON THE `<img>`, NOT ON THE MARK. The mark's own box holds
           the variant fill and, underneath a loading photograph, the initials;
           desaturating the whole box would quietly drain the kit's own
           `variant="brand"` mango and `variant="inverse"` charcoal wherever a
           caller paired one with an outside face, which is a second, unasked
           change to a token colour. The filter belongs to the one element
           whose colours belong to the person. */
        className={cn("size-full object-cover", external && "grayscale", className)}
        onLoad={(event) => {
          setStatus("loaded");
          notify.current?.("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          setStatus("error");
          notify.current?.("error");
          onError?.(event);
        }}
        {...props}
      />
    );
  },
);

AvatarImage.displayName = "AvatarImage";

/**
 * Two initials, never three.
 *
 * A string child is cut to its first two characters here rather than at the
 * call site. `Array.from` is used instead of `slice`, so a two-character
 * name in a script outside the basic plane is not sliced through the middle
 * of a code point — the apps run in Arabic, Urdu and Persian.
 *
 * A non-string child (the kit's other stated option, a module icon) passes
 * through untouched.
 */
function twoInitials(children: React.ReactNode): React.ReactNode {
  if (typeof children !== "string") return children;
  return Array.from(children.trim()).slice(0, 2).join("");
}

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<"span"> {
  /**
   * Hold the fallback back for this many milliseconds, so a photograph that
   * arrives quickly never shows initials first. Undefined shows it at once,
   * which is right for the common case here: most of the 45 call sites are
   * initials-only and have no image to wait for.
   */
  delayMs?: number;
}

/**
 * The initials under the photograph.
 *
 * TEN STATES — see `Avatar`. The fallback itself is either shown or not.
 * THREE BREAKPOINTS — UNCHANGED; the step comes from the mark's size.
 * RTL — safe. Centred, no inset, no direction.
 */
const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, delayMs, children, ...props }, ref) => {
    const { status } = useAvatarContext("AvatarFallback");
    const [delayPassed, setDelayPassed] = React.useState(delayMs === undefined);

    React.useEffect(() => {
      if (delayMs === undefined) {
        setDelayPassed(true);
        return;
      }
      setDelayPassed(false);
      const timer = window.setTimeout(() => setDelayPassed(true), delayMs);
      return () => window.clearTimeout(timer);
    }, [delayMs]);

    if (status === "loaded" || !delayPassed) return null;

    return (
      <span
        ref={ref}
        data-slot="avatar-fallback"
        /* The photograph, when there is one, sits on top: the fallback holds
           the box underneath so nothing reflows as the image swaps in. */
        className={cn("absolute inset-0 grid place-content-center", className)}
        {...props}
      >
        {twoInitials(children)}
      </span>
    );
  },
);

AvatarFallback.displayName = "AvatarFallback";

/**
 * The presence dot — CH11's drawn companion to the person mark: 13 across
 * (`--dot-presence`), forest (`--success`, so it lifts on dark), hung at the
 * mark's bottom inline-end corner with a 2.5 ring (`--avatar-ring`) in the
 * ground tone so it reads as punched through the mark rather than laid on it.
 * Rendered INSIDE an `Avatar`, whose box is already `position: relative`.
 *
 * The two stated values lived nowhere before this (GAPS-KIT-BC AVA-B2), so
 * every composition that wanted a dot was going to invent them.
 *
 * The ring colour defaults to `--background`; a stack sitting on a panel
 * passes its own via `className` (`shadow-[0_0_0_var(--avatar-ring)_var(--surface-panel)]`).
 * The -1px hang is the artifact's own optical nudge — one of the two values
 * tokens.css keeps off the scale — made logical (`end`) so it mirrors in RTL.
 *
 * Decorative by default (`aria-hidden`): presence in words belongs to the row,
 * not to a 13px dot. A call site that passes `aria-label` opts into exposure.
 */
const AvatarPresence = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="avatar-presence"
    aria-hidden={props["aria-label"] === undefined ? true : undefined}
    className={cn(
      "absolute -bottom-px -end-px",
      "size-[var(--dot-presence)] rounded-pill bg-success",
      "shadow-[0_0_0_var(--avatar-ring)_var(--background)]",
      className,
    )}
    {...props}
  />
));

AvatarPresence.displayName = "AvatarPresence";

/**
 * The stack — CH11's overlapped row of person marks. Every member takes the
 * 2.5 ground-tone ring (which is what separates two touching pills) and every
 * member after the first pulls back by 10 (`--space-2h`, made NEGATIVE and
 * LOGICAL — the artifact's own `margin-left: -10px` is physical, logged as
 * GAPS-F AVA-4; `margin-inline-start` mirrors in Arabic, Urdu and Persian on
 * its own). The overflow chip is the kit's own drawing too: a normal
 * `<Avatar variant="quiet">` whose label is "+5" — `--hair` used as a fill,
 * tabular numerals from the badge step.
 *
 * TEN STATES — a stack is a layout; every state belongs to the marks in it.
 * THREE BREAKPOINTS — UNCHANGED. Marks never squeeze (`flex: none` on each);
 * a row that runs out of width caps the list and raises the "+n".
 * RTL — safe, and deliberately so; see above.
 */
const AvatarStack = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="avatar-stack"
    className={cn(
      "inline-flex items-center",
      "[&>[data-slot=avatar]]:shadow-[0_0_0_var(--avatar-ring)_var(--background)]",
      "[&>[data-slot=avatar]:not(:first-child)]:ms-[calc(var(--space-2h)*-1)]",
      className,
    )}
    {...props}
  />
));

AvatarStack.displayName = "AvatarStack";

export { Avatar, AvatarImage, AvatarFallback, AvatarPresence, AvatarStack, avatarVariants };
