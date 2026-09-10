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
   ========================================================================= */

/** The pin. Everything a pinned toolbar needs and nothing a screen decides:
 * the stick, what it sticks below, the stacking, and the ground it paints. */
export const PINNED_TOOLBAR =
  "sticky top-[var(--pinned-chrome-h,0px)] z-[9] flex min-w-0 flex-col bg-[var(--pinned-ground)]"

/** Worn by a strip that pins at the top of the scrollport ABOVE a toolbar, so
 * `globals.css` can raise `--pinned-chrome-h` for that strip's container
 * without every host having to declare it. A plain marker class, not a
 * utility: the rule that reads it is hand-written in both front doors'
 * `globals.css`, beside the token it spends. */
export const PINNED_STRIP_MARK = "pinned-strip"

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
 * whatever it resolves to. */
export const PINNED_TOOLBAR_IN_KIT_PANEL =
  "[&_[data-slot=collection-frame-toolbar]]:sticky " +
  "[&_[data-slot=collection-frame-toolbar]]:top-[var(--pinned-chrome-h,0px)] " +
  "[&_[data-slot=collection-frame-toolbar]]:z-[9] " +
  "[&_[data-slot=collection-frame-toolbar]]:bg-[var(--pinned-ground)] " +
  "[&_[data-slot=collection-frame-toolbar]]:pb-5 " +
  "[&_[data-slot=collection-frame-toolbar]]:-mb-5"
