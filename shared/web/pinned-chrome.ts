/* ============================================================================
   THE PIN. ONE SEAM, BOTH FRONT DOORS (R63).
   ============================================================================
   Client ruling, 2026-09-10, verbatim and unhedged: "on scroll down, i also
   want the toolbar to be on top all time visible. everywhere."

   The same sentence she wrote for the search box (R48, "stop hardcoding this,
   just write it as a rule"), for the empty row (R50) and for the slot set
   (R53), one property along — so it is answered the same way: the pin belongs
   to the ROW, not to the sixty screens that draw one. A component that draws a
   collection toolbar wears `PINNED_TOOLBAR`; nothing else in `web/`,
   `web-portal/` or `shared/web/` writes a `sticky top-…` on a toolbar of its
   own.

   TWO PARTS, AND THE SECOND IS WHY THIS IS A FILE RATHER THAN A CLASS STRING
   TYPED FIVE TIMES.

   1 · `PINNED_TOOLBAR` — the pin itself. `position: sticky` against the
       SCROLLPORT'S PADDING BOX, which on the agency door is the kit's body
       pane (`[data-slot=screen-shell-body]`, whose block-start padding
       app-shell.tsx already moves down a level precisely so a sticky child
       pins at the pane's true top edge) and on the client portal is the
       document. IT PAINTS THE GROUND IT IS STANDING ON, and no caller is
       asked which: `--pinned-ground` is published by the ground class itself
       (both front doors' `globals.css`), the same mechanism the kit's
       `tokens.css` §8 uses to make a secondary button the other tone from
       whatever it stands on. It has to paint SOMETHING, or the rows scroll
       through it; it has to paint the right thing, or it reads as a hole
       punched in the card — measured, dark, 2026-09-10: a row inside a
       `<CollectionCard>` stands on `--surface-panel` #1C1B18 while its own pill
       is `--surface-raised` #26241F, and the same row on the Knowledge base
       stands directly on the shell's body pane, which IS `--surface-raised`.
       One hardcoded fill cannot be right in both, and a PROP would put the
       answer back at the call site.

       IT MUST BE PAINTED, AND THE GAP BELOW IT MUST BE PAINTED TOO. A pinned
       bar's whole job is to occlude the rows sliding under it, so a `gap-*`
       between the row and the rows below is not enough: a flex gap is a
       distance between two siblings, never a painted box, and the moment the
       row pins the content keeps scrolling and carries that reserved space
       away with it. Exactly the bug `STICKY_FOLDER_TABS` hit
       (shared/web/screen-engine/tabs-view.tsx) and fixed the same way — the
       space goes INSIDE the pinned box. `PINNED_TOOLBAR` is a flex COLUMN for
       that reason: a flex container establishes a formatting context, so a
       child's own trailing margin (R49's `--toolbar-content-gap`, which
       `<ToolbarRow>` still pays on its own root) sits INSIDE this box and is
       painted by this box's ground instead of collapsing out of it. Nothing
       about R49 changes — the number, its owner and its spelling are
       untouched; it is simply now inside something that paints.

   2 · `--pinned-chrome-h` — WHAT IT PINS BELOW, and the reason this is a
       custom property rather than `top-0`. A toolbar is not the only thing
       that pins: a collection's own tab strip (`STICKY_FOLDER_TABS`) and a
       record's (`STICKY_TABS`, web/components/records/record-chrome.tsx) are
       both already stuck at the top of the same scrollport. A toolbar at
       `top: 0` would pin in the SAME band and one of the two would be
       invisible. So the offset is a property that DEFAULTS TO ZERO and is
       raised, for a whole subtree, by whatever pins above it:

         · a collection tab strip raises it for its own container, derived —
           the strip wears `PINNED_STRIP_MARK` and `globals.css` says
           `:has(> .pinned-strip) { --pinned-chrome-h: … }`, so every host of
           `renderFolderTabs` is covered by the rule rather than by a line
           somebody remembered to add;
         · a record's strip raises it on `RecordScreen`'s own root, beside the
           two geometry properties that file already declares there for the
           same reason (a custom property only reaches downward, and the strip
           is not an ancestor of the panels below it);
         · the client portal's sticky header raises it on the portal shell's
           root, measured, because a header of buttons has no tab strip's
           token geometry to read.

       A screen with nothing pinned above its toolbar therefore pins at zero
       and needs no entry anywhere, which is the property R48 wanted for the
       search box: the default is the right answer and an exception has to be
       written down.

   3 · `--pinned-lead` — WHAT PINS ABOVE THE ROW, INSIDE THE SAME BOX. Added
       2026-09-10, the client's second sentence the same day: "when sticky
       toolbar, include also the top part of the container above it! if not
       looks weird. so the spacing between tabs and container should stay, as
       well as spacing between beginning container and toolbar."

       WHAT SHE IS LOOKING AT. A collection is a tab strip, then air, then a
       CARD, then the card's own top inset, then the toolbar. Pin the toolbar
       ALONE and two of those five disappear the moment the list moves: the
       card's top edge slides up behind the strip and its inset goes with it, so
       the bar arrives flush under the tabs, standing on nothing, touching a
       card that no longer has a top. It looks detached because it IS detached —
       the container it belongs to left.

       So the pinned box starts at the CONTAINER'S OWN TOP EDGE instead of at
       the toolbar's, and the two distances she named are the two that survive:

         · TABS → CONTAINER is `--pinned-chrome-h` above, unchanged. The strip
           already paints that gap as its own `pb`, and the box now pins with
           its TOP at the strip's painted bottom — which is exactly where the
           container's top edge sits at rest.
         · CONTAINER → TOOLBAR is this property: the container's own top inset,
           now paid as padding INSIDE the pinned box and taken straight back as
           a negative top margin, so the row does not move by one pixel at rest
           and the box is that much taller at the top. The identical pair the
           trailing `pb-N -mb-N` at every call site already uses, read upwards.

       PUBLISHED BY THE CONTAINER, CONSUMED BY THE ROW, exactly as
       `--pinned-chrome-h` is — and for the same reason. The row cannot know
       what it is standing in: `<ToolbarRow>` is drawn inside a
       `<CollectionCard>` on one screen and directly on the shell's pane on
       another, and a PROP would put the answer back at the call site. So the
       box that INSETS a pinned toolbar publishes the inset it spends
       (`CollectionCard`, web/components/deep-link/screen-bits.tsx; the kit's
       own collection panel, through the override below), everything else
       inherits the `0px` both front doors' `globals.css` declares, and a
       toolbar that is nobody's inset child pins flush exactly as it did
       yesterday.

   4 · `--pinned-inset-x` + `--pinned-behind` — AND THE BAND KEEPS THE
       CONTAINER'S ROUNDED TOP CORNERS. Added 2026-09-10, the client's third
       sentence the same day, after part 3 shipped and she looked at it:
       "When pin, I still want it round. That's exactly what I asked for, so
       do whatever you have to do."

       WHY PART 3 ALONE LEFT SQUARE CORNERS, and it is TWO faults, either of
       which alone makes the other's fix a no-op. Both measured, not reasoned.

         · THE BOX NEVER REACHES THE CORNERS. The pinned box is INSIDE the
           container, so it spans the container's CONTENT box; the container's
           radius is on its BORDER box, one side inset further out. A
           `rounded-t-*` on the pinned box would round a corner 16px in from
           the corner a reader is looking at.
         · AND A ROUNDED CORNER IS A TRANSPARENT NOTCH. Directly behind that
           notch sits the container's OWN paper — the container runs far below
           the pin, only its top EDGE has scrolled away — so the notch would
           show the same tone as the band in front of it and the corner would
           still read square.

       So the shape needs both, published the same two ways part 3 already
       publishes its two halves:

         · `--pinned-inset-x` is the container's SIDE inset, spent by the row
           as `mx-[calc(...*-1)] px-[...]` — the same read-upwards pair as the
           lead's `mt`/`pt` and the trailing `pb-N -mb-N`, on the other axis.
           The row does not move by one pixel at rest; the BOX now reaches the
           container's border box, which is where the corner it has to round
           actually is. A SEPARATE property from `--pinned-lead` on purpose,
           even though both publishers today spend a symmetric inset and the
           two numbers are equal: the lead is "everything above the toolbar
           inside the container" and the day the kit's `band` slot is filled
           it stops being the top padding, while the side inset never does.
         · `--pinned-behind` is WHAT IS BEHIND THE CONTAINER, so the notch can
           be filled with it instead of being left transparent over the
           container's own paper. The element paints THAT across the whole
           band and a `::before` paints `--pinned-ground` over it with
           `rounded-t-[var(--radius)]`, so the two corners show exactly what
           the container's real top corners show at rest. Not a `rounded-t` on
           the box itself: the box has to keep painting to its own square
           edges, or the notch is transparent again.

       PUBLISHED BY THE GROUND CLASS MECHANISM, ONE LEVEL UP. The row cannot
       be told the tone (part 1's whole argument) and the CONTAINER cannot
       read it either: a container that paints wears the ground class itself,
       so `var(--pinned-ground)` resolved on its own element is its OWN paper,
       not the paper behind it. So the capture happens on the element ABOVE
       it, and each publisher does it wherever that element is:

         · `CollectionCard` IS the ground-class element (`Card`'s own
           `bg-surface-panel`), so it wears `PINNED_INSET_MARK` and
           `globals.css` captures the value on its PARENT —
           `*:has(> .pinned-inset)`, the identical `:has()` move part 2
           already makes for `.pinned-strip`, and derived the same way.
         · `PINNED_TOOLBAR_IN_KIT_PANEL` already rides the FRAME'S root, which
           is OUTSIDE the kit's panel and paints nothing (`tone="bare"`), so
           the value it inherits there IS the ground behind the panel. It
           publishes `--pinned-behind` directly, no rule needed.

       THE DEFAULT IS THE IDENTITY, NOT A COLOUR. `var(--pinned-behind,
       var(--pinned-ground))`: a toolbar that is nobody's inset child paints
       one tone in front and behind, so its rounded corners show the tone they
       are cut out of and it pins flush and square exactly as it did before —
       no branch, no second class, and nothing for a screen to decide. The
       same property is the reason the stand-down rule in `globals.css` puts
       the identity back on a nested row: a stood-down toolbar is not pinned,
       and a corner cut in the panel it is sitting inside is a hole.

       R31 WIDENED, AND SAID SO. `rounded-t-[var(--radius)]` was the law's
       spelling for "a sheet that meets the bottom of the screen"; it is the
       same VALUE on the same one edge, which is all the check ever
       constrained, and the law's prose now names this second position too
       rather than leaving the file to look like a breach of it.
   ========================================================================= */

/** The pin. Everything a pinned toolbar needs and nothing a screen decides:
 * the stick, what it sticks below, the band of container that pins with it —
 * on both axes — the stacking, the ground it paints, and the container's own
 * top corners riding along on the `::before`.
 *
 * THE `::before` IS A PSEUDO-ELEMENT AND NOT A WRAPPER, deliberately. Part 1's
 * contract is that this box is a flex COLUMN so R49's trailing margin sits
 * inside something that paints; a real child painting the front ground would
 * either become a flex item in that column (changing the layout it exists to
 * protect) or have to wrap the row AND its margin, which is the same box with
 * an extra element. An absolutely positioned `::before` is out of flow, covers
 * the whole padding box — the lead above, the pill, and R49's gap below, since
 * a flex container's height includes its items' margins — and `z-[-1]` puts it
 * above this box's own background and below its content, inside the stacking
 * context `sticky` + `z-[9]` already establishes. */
export const PINNED_TOOLBAR =
  "sticky top-[var(--pinned-chrome-h,0px)] z-[9] flex min-w-0 flex-col " +
  "mt-[calc(var(--pinned-lead,0px)*-1)] pt-[var(--pinned-lead,0px)] " +
  "mx-[calc(var(--pinned-inset-x,0px)*-1)] px-[var(--pinned-inset-x,0px)] " +
  "bg-[var(--pinned-behind,var(--pinned-ground))] " +
  "before:pointer-events-none before:absolute before:inset-0 before:z-[-1] " +
  "before:rounded-t-[var(--radius)] before:bg-[var(--pinned-ground)] before:content-['']"

/** Worn by a strip that pins at the top of the scrollport ABOVE a toolbar, so
 * `globals.css` can raise `--pinned-chrome-h` for that strip's container
 * without every host having to declare it. A plain marker class, not a
 * utility: the rule that reads it is hand-written in both front doors'
 * `globals.css`, beside the token it spends. */
export const PINNED_STRIP_MARK = "pinned-strip"

/** Worn by a CONTAINER that insets a pinned toolbar and paints its own paper,
 * so `globals.css` can capture the ground BEHIND it — `*:has(> .pinned-inset)
 * { --pinned-behind: var(--pinned-ground) }` — on the one element that still
 * has that value: its parent. The same marker-plus-`:has()` shape as
 * `PINNED_STRIP_MARK` one line up, and for a harder version of the same
 * reason. `--pinned-chrome-h` cannot be declared by the strip because a custom
 * property only reaches DOWNWARD; `--pinned-behind` cannot be declared by the
 * container because the container is the element that overwrote the value it
 * needs to read (part 4 above). A container that paints NOTHING needs no mark:
 * it never overwrote `--pinned-ground`, so the row's own fallback is already
 * the right answer. */
export const PINNED_INSET_MARK = "pinned-inset"

/** THE SAME PIN, REACHED THROUGH THE KIT'S OWN SLOT NAME.
 *
 * A collection drawn through the vendored `CollectionFrame`
 * (`useKitPanel`, shared/web/screen-engine/collection-frame.tsx) does not draw
 * its own toolbar at all — the kit does, as its `ToolbarRow` under
 * `data-slot="collection-frame-toolbar"`, inside a soft-paper panel this app
 * never touches. `shared/ui/` is vendored and hash-pinned (a hand-edit turns
 * `web/test/vendored-kit.test.ts` red), so the pin reaches it the way every
 * other app-side kit correction does: a `[&_[data-slot=…]]:` rule from the
 * element the app DOES own. OWED UPSTREAM — "a collection toolbar pins to the
 * top of its scroller" is the kit's sentence to write, not this app's.
 *
 * The row itself is `ground="bare"` there — the panel paints the paper and the
 * row paints nothing, which is right at rest and is a hole the rows scroll
 * through the moment it pins. `--pinned-ground` is what the panel publishes
 * (its own `bg-surface-panel`), so this paints the panel's paper without
 * naming it.
 *
 * `pb-5 -mb-5` is the panel's own `gap-5` made visible and then given back,
 * exactly as the engine's other branch does with its `gap-3`: the padding is
 * inside the pinned box and painted, the negative margin cancels the flex gap
 * the padding just duplicated, and both read the same step so they cancel
 * whatever it resolves to.
 *
 * AND THE PANEL'S OWN TOP INSET PINS WITH IT — `--pinned-lead`, part 3 of the
 * header above, published HERE rather than by the panel because the panel is
 * the kit's element and this class rides the frame's, the one element the app
 * owns. The number is the panel's own inset, `collectionPanelVariants`'
 * `p-6 lg:p-[var(--space-7)]`, read off that file and spelled in the app's own
 * tokens; the row below consumes it through `PINNED_TOOLBAR`'s spelling of the
 * same property, so there is one arithmetic and two publishers.
 *
 * IT RIDES THE FRAME'S ROOT, NOT THE PANEL'S, which costs nothing and buys the
 * stand-down: only a pinned toolbar ever reads this property, so publishing it
 * a level up reaches the one consumer and nothing else — and when an OUTER pin
 * stands this one down (globals.css: two bars on one collection land in the
 * same band), that same rule zeroes the lead on the toolbar itself, which an
 * inherited value can never outrank.
 *
 * ONE ASSUMPTION, WRITTEN DOWN: the toolbar is the panel's FIRST child, so the
 * panel's top inset is the whole distance above it. The kit puts a `band` slot
 * there and exactly one composition upstream fills it; no screen on either
 * front door passes `band` today (`screen-renderer.tsx` forwards it and nothing
 * hands it one). The day one does, its toolbar's lead is the band's height too,
 * and this is the line that says so. The SIDE inset below has no such
 * assumption, which is why it is its own property (part 4).
 *
 * AND THE PANEL'S CORNERS PIN WITH IT — part 4 of the header. The same two
 * additions as `PINNED_TOOLBAR`, spelled through the slot: the side inset is
 * the panel's own `p-6 lg:p-[var(--space-7)]` read off the same variant line
 * the lead is read off, and `--pinned-behind` is published on THIS element
 * rather than through `globals.css`'s `:has()` rule, because this class already
 * rides the frame's root — which is OUTSIDE the panel and paints nothing
 * (`tone="bare"`), so the `--pinned-ground` it inherits IS the ground behind
 * the panel. One arithmetic, two publishers, two ways of reaching the element
 * above the box, because the two boxes sit differently. */
export const PINNED_TOOLBAR_IN_KIT_PANEL =
  "[--pinned-lead:var(--space-6)] lg:[--pinned-lead:var(--space-7)] " +
  "[--pinned-inset-x:var(--space-6)] lg:[--pinned-inset-x:var(--space-7)] " +
  "[--pinned-behind:var(--pinned-ground)] " +
  "[&_[data-slot=collection-frame-toolbar]]:sticky " +
  "[&_[data-slot=collection-frame-toolbar]]:top-[var(--pinned-chrome-h,0px)] " +
  "[&_[data-slot=collection-frame-toolbar]]:z-[9] " +
  "[&_[data-slot=collection-frame-toolbar]]:bg-[var(--pinned-behind,var(--pinned-ground))] " +
  "[&_[data-slot=collection-frame-toolbar]]:mt-[calc(var(--pinned-lead,0px)*-1)] " +
  "[&_[data-slot=collection-frame-toolbar]]:pt-[var(--pinned-lead,0px)] " +
  "[&_[data-slot=collection-frame-toolbar]]:mx-[calc(var(--pinned-inset-x,0px)*-1)] " +
  "[&_[data-slot=collection-frame-toolbar]]:px-[var(--pinned-inset-x,0px)] " +
  "[&_[data-slot=collection-frame-toolbar]]:pb-5 " +
  "[&_[data-slot=collection-frame-toolbar]]:-mb-5 " +
  "[&_[data-slot=collection-frame-toolbar]]:before:pointer-events-none " +
  "[&_[data-slot=collection-frame-toolbar]]:before:absolute " +
  "[&_[data-slot=collection-frame-toolbar]]:before:inset-0 " +
  "[&_[data-slot=collection-frame-toolbar]]:before:z-[-1] " +
  "[&_[data-slot=collection-frame-toolbar]]:before:rounded-t-[var(--radius)] " +
  "[&_[data-slot=collection-frame-toolbar]]:before:bg-[var(--pinned-ground)] " +
  "[&_[data-slot=collection-frame-toolbar]]:before:content-['']"
