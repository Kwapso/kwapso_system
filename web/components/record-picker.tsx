"use client"

// RECORD PICKER — the ONE control in this app for "which record do you mean?",
// and the only one with a search box in it.
//
// WHY IT EXISTS. Every picker in the agency app was the library `Select`, which
// has no search of any kind: it draws its options and you scroll. On a laptop
// with twelve apps that is fine. On a phone, against twenty clients and a
// hundred and four contacts, it is a wall — reported from a phone as "any
// drop-downs are becoming impossible to search through", beside the Glide app
// that put a search bar at the top of every one of them.
//
// AND ON A PAGED COLLECTION IT WAS ALSO WRONG. The ticket form's client picker
// read `accountsKey(teamId)`, whose fetcher primes a cursor — accounts is a
// GROWING_COLLECTIONS row (R14), so that list is PAGE ONE. The picker offered
// the newest fifty companies and silently had no opinion about the rest, which
// is the other half of the same report: "not all clients or contacts are showing
// per account". A search box that filtered that array in the browser would have
// made it worse, because it would have answered "no" with confidence. So this
// control has two modes and the call site says which:
//
//   • `options`  — the whole list is already in hand (a bounded read, a team's
//                  own dropdown vocabulary). cmdk filters it in memory, instantly,
//                  for nothing. Same engine the library's own `Choice` uses.
//   • `search`   — the collection PAGES, so the question goes to the DOOR (`q`),
//                  debounced, cached per term. This is SEARCH.md layer 2, the
//                  same shape `PagedFind` uses for a list screen and
//                  `contact-link-dialog` already used for one field.
//
// NOTHING NEW IS INVENTED. It is the library's `Popover` + `Command` (cmdk), the
// documented searchable-combobox composition — the same two primitives the
// library's own `Choice` is built from. `Choice` itself cannot be used here: it
// owns its search text internally and filters in memory, so it has no way to ask
// a door. That gap is flagged in UI-GAPS.md; the day the library takes a
// server-side seam, this file collapses onto it.
//
// ── IT HAS A SECOND PRESENTATION NOW, AND NOT A SECOND COMPONENT ────────────
//
// `layout="row"` (2026-09-06) draws the same options as ONE HORIZONTAL LINE of
// chips, in place, with no trigger and nothing to open. The triage queue asked
// for it twice on one card — "which type is this really?" and "who is picking
// this up?" — and the client chose that shape herself out of eight drawn
// alternatives.
//
// WHY IT IS A PROP AND NOT A SIBLING FILE. `one-record-picker` in
// `web/test/rules.test.ts` makes this the ONLY file in `web/components/` allowed
// to compose the library's `Command`, and the reason in its own header is the
// one that applies here: nine screens each building their own picker is how they
// came to behave nine different ways. A one-row picker written beside this one
// would have been the tenth — a second answer to "which record do you mean?"
// with its own idea of what a selected option looks like, its own idea of what
// an option's face is, and no share in the swatch, the avatar or the phone
// behaviour this file has spent a month getting right. So the OPTIONS, the
// FACES, the swatch and the chosen-value contract are all one piece of code, and
// only the surface they are laid out on differs.
//
// WHAT THE ROW GIVES UP, deliberately, and what that costs:
//
//   • NO SEARCH. cmdk is a search box over a scrolling list, and a line of four
//     chips has nothing to search. `search`/`searchKey` (SERVER MODE) are
//     therefore refused here rather than silently ignored — a row cannot page a
//     growing collection, and a picker that quietly answered "no" about the rest
//     of a list is the exact defect this whole file was written for. The row is
//     `options` only, and a call site with more than a handful of them wants the
//     control, not the row.
//   • NO CLEAR X and no `emptyOption` row. A chip line commits on the click; a
//     caller that needs "leave it off" puts it in `options` as its own chip,
//     where it reads as one of the choices rather than as an escape hatch.
//   • NO `placeholder`. Nothing is closed, so nothing has to say what it would
//     hold.
//
// AND ONE THING IT ADDS: `leadValue`, the option promoted to the front of the
// line with a divider after it. Today it is the ticket's CURRENT type, which is
// the honest "start here" — and it is also the seam a SUGGESTION would land in
// the day one is costed and built. That is a real decision that has not been
// taken; nothing in this file or its callers makes a model call, and the divider
// is a piece of layout rather than a promise.
//
// ── THE CHOSEN CHIP IS BLACK, AND A SUGGESTION IS NOT MANGO (2026-09-06) ─────
//
// CLIENT DEFECT REPORT, round nine, and it is a defect about the SYSTEM rather
// than about this row: the lead chip and the chosen chip were both mango, so on
// a card where mango means "this is the chosen one" — which is what it means on
// every other screen in this app — an OFFER was painted in the colour of a
// DECISION. Two different claims, one fill, and the reader has to work out from
// position which is which.
//
// So the two claims now look like two things, and neither of them borrows the
// brand fill:
//
//   • CHOSEN → `variant="inverse"`. Charcoal fill, off-beige label, and it
//     FLIPS with the palette, which is what makes "black chip" survive dark
//     mode where an actual black would vanish. It is the same word, from the
//     same kit component, as the black `#1513` chip on the card above this row
//     (`TriageChips` in tickets-collection.tsx) — so the loudest mark in the
//     queue means one thing in both places.
//   • SUGGESTED → `variant="ghost"` plus the kit's own INSET HAIRLINE and the
//     spark glyph. No fill at all, an edge, and a mark that says "offered".
//
// WHY THE EDGE IS A SHADOW AND NOT A DASHED BORDER, since the client offered
// "dashed OR outlined" and dashed is the first thing anybody reaches for. A CSS
// border is ruled out here (BUILD-A-SCREEN.md §6.1, "no CSS border, ever";
// separation is a fill or an inset shadow), and the dashed spelling of it has
// been REMOVED from this codebase twice already as a regression — process-map's
// gap marker and `NothingYet`, both on 2026-09-01, both with the same note: the
// one place the kit itself draws a dashed edge is `file-upload.tsx`'s dropzone,
// documented there as deliberately not a pattern to extend. A chip is not a
// dropzone. `shadow-[var(--hairline-strong)]` is the SAME outline the kit's own
// `Badge variant="outline"` wears — the one uncoloured variant, and so the one
// that carries an edge — so this is the outlined half of her ruling drawn in
// the system's existing vocabulary rather than a second one invented for it.
// No new colour token either way (R32): inverse, ghost and the hairline are all
// already in the kit.
//
// AND CHOSEN BEATS SUGGESTED WHEN THEY ARE THE SAME CHIP. Today they always are
// — `leadValue` is the ticket's current type, which is also `value` — so the
// lead reads BLACK and no spark is drawn. That is the honest picture: a thing
// that has been picked is not also being offered. The two only come apart the
// day a real suggestion lands in `leadValue`, which is exactly the seam that
// paragraph above describes, and the treatment for it is already here.
//
// ON A PHONE IT IS A SHEET, NOT A POPOVER, and that is the part that is actually
// about touch. (The ROW LAYOUT has neither, and needs neither: it is already in
// the page, so the software keyboard this whole paragraph is about never opens
// over it. It wraps instead — a line of chips is the one picker shape that
// narrows to a phone by itself.) A popover is anchored to its trigger in the LAYOUT viewport,
// which the software keyboard is not in: open a picker on a field low in a form
// and the keyboard covers the list and often the search box itself, so the one
// control you must be able to see while typing is the one that disappears. Below
// `sm` this opens a bottom sheet 85dvh tall instead — its top edge sits near the
// top of the screen, the search box is pinned there, and the keyboard rises into
// the bottom of a list that scrolls. That is what Glide does on a phone, and it
// is why it works there.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@shared/ui/components/command/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/ui/components/popover/popover"
import { Sheet, SheetContent, SheetTitle } from "@shared/ui/components/sheet/sheet"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { useDebouncedCallback } from "@shared/ui/components/use-debounce/use-debounce"
import { Check, CaretUpDown, Sparkle, X } from "@shared/ui/foundations/icons"
import { cn } from "@shared/ui/lib/utils"

import { useIsPhone } from "@/lib/use-is-phone"
import { useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"
import { RecordMark } from "@shared/web/record-mark"

/** One row in the list. `hint` is the second line — an email, a code, the client
 * a person belongs to: whatever makes two people called Marta tellable apart.
 *
 * AND THE THING'S OWN FACE (R35). A record is known by its picture as much as by
 * its name, and until 19 Aug 2026 this type had nowhere to put one — so all
 * thirty-three pickers in the app offered a column of bare words, while the very
 * same records carried logos and glyphs on the list two clicks away. Two pickers
 * worked around it by writing the emoji into `label`, which is a pictograph
 * inside a sentence and the one shape UI-CONVENTIONS §5 refuses.
 *
 * The three fields are `RecordMark`'s own, passed straight through, so a picker
 * row and a collection row are drawn by the same component and cannot drift:
 * `picture` is a stored path (a logo, a photo), `mark` is the type's glyph, and
 * the record's own `label` is the last resort — its first letter. All optional:
 * a role, a meeting purpose and a process version genuinely have no picture, and
 * an option with none renders exactly what it rendered before.
 *
 * AND A THIRD KIND OF MARK, ADDED 2026-09-06: a COLOUR SWATCH. The first two
 * both resolve to a `RecordMark` — a box holding a picture, a glyph or a letter —
 * because both answer "what does this record LOOK like". A ticket type has no
 * picture and its glyph is a two-letter code (`IS`, `Q`, `RQ`) that already
 * appears on the tab strip and the ticket's own header band; what tells four
 * types apart AT A GLANCE, and what the client ruled in the eighth design round,
 * is a colour. That is not a face and must not be drawn as one — a 24px box with
 * a flat fill and no content reads as a picture that failed to load, which is
 * the exact thing `RecordMark`'s whole state machine exists to prevent. So it is
 * a small dot beside the label, and it is a SEPARATE field rather than a
 * `mark: "🔴"`: a pictograph in a label is the shape UI-CONVENTIONS §5 refuses,
 * and the client's own 2026-08-31 ruling ("i said no emojis. why are there still
 * emojis? kill them!") closed that door for good.
 *
 * IT LIVES HERE RATHER THAN AT THE ONE CALL SITE THAT NEEDS IT TODAY, which is
 * the whole point of this type: thirty-three pickers pass through it, and R35
 * was earned by exactly this — a visual the type could not carry was a visual no
 * picker COULD have drawn. The next screen that offers a coloured vocabulary (a
 * sprint state, a department, a chart series a person picks) inherits it. */
export type PickerOption = {
  value: string
  label: string
  hint?: string
  /** the stored path to this record's own picture, if it has one */
  picture?: string | null
  /** the record type's glyph — a ticket type's emoji, an app's stage mark */
  mark?: string | null
  /** a person in their own right is a circle; a client, an app, a thing is not */
  shape?: "square" | "round"
  /** THE THIRD KIND OF MARK — a colour this option is known by, drawn as a dot
   * before the label. A CSS colour VALUE that must resolve through a token
   * (`var(--chart-3)`, `var(--ink-tertiary)`); R32 has no opinion about a
   * `style` attribute, so nothing here stops a hex, and `web/lib/type-colours.ts`
   * — the one map that supplies these today — is where that discipline is kept
   * and reasoned. Never drawn as a `RecordMark`: see this type's own header. */
  swatch?: string | null
  /** THIS OPTION IS A RECORD AND ALWAYS WEARS ITS FACE — even when it has
   * neither a picture nor a glyph, in which case `RecordMark` draws the name's
   * own initial, which is its whole last-resort branch.
   *
   * WHY IT HAS TO BE SAID RATHER THAN INFERRED. Both places below draw the mark
   * only `if (o.picture || o.mark)`, and that gate is right for most of the
   * thirty-three pickers: a role, a meeting purpose and a process version are
   * words rather than records, and a column of letter tiles beside them would be
   * inventing an identity none of them has. But it makes the face conditional on
   * the DATA, so the same record type draws one on a row that happens to have a
   * logo and nothing at all on the row beside it — which is exactly the "a card
   * with a dot on four rows and none on the fifth reads as the broken one"
   * failure `type-colours.ts` argues out for colour, in a bigger box.
   *
   * Added 2026-09-07 for the ticket form's APP picker (client: "when I select
   * the app, I want to see the icons"), because the ticket LIST's app facet
   * hands its own options a whole `<AppMark>` and therefore always draws one —
   * an app with no logo and no stage shows its initial there and showed blank
   * here. One flag makes the two identical instead of nearly identical.
   *
   * `shape` was the tempting inference and is deliberately not used: a dozen
   * call sites already pass `shape: "round"` for people, so reading it as "draw
   * a face" would change what those pickers look like without anybody asking. */
  face?: boolean
}

/** THE DOT ITSELF, drawn in one place so the closed control, the open list and
 * the one-row layout below cannot end up three sizes.
 *
 * EXPORTED, and for R35's own reason read one step further out: the SAME record
 * wearing the SAME colour appears outside a picker as well — a ticket's type is
 * a chip on the triage card before it is an option in the row underneath — and
 * two spellings of one dot is exactly the drift `RecordMark`'s own header
 * counted seventeen of. One component, one size token, one shape. `--dot-status` is the
 * kit's own status-dot size (the same token `badge.tsx` fills for its six
 * `--dot-*` tones), so a type's dot and a state's dot are the same object at the
 * same size even though their colours come from different vocabularies.
 *
 * `rounded-pill`, which is R31's second radius and the only one a circle has.
 * `aria-hidden` for `RecordMark`'s own reason: the word beside it says
 * everything the colour does, and a screen reader announcing a colour before
 * every option is one fact read twice — and, for the pairs `tokens.css` measures
 * as identical in luminance, a fact a reader may not be able to check anyway. */
export function Swatch({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden
      className="size-[var(--dot-status)] shrink-0 rounded-pill"
      style={{ background: colour }}
    />
  )
}

export function RecordPicker({
  id,
  ariaLabel,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  search,
  searchKey,
  selectedLabel,
  emptyOption,
  disabled,
  clearable = true,
  className,
  layout = "control",
  leadValue,
  note,
}: {
  /** the id the Field's label points at */
  id?: string
  /** The control's name where NO label points at it — an inline picker that
   * stands on its own rather than inside a `Field`. With a label, leave it off:
   * two names on one control is one too many. */
  ariaLabel?: string
  /** the chosen value ("" or the `emptyOption`'s value when nothing is chosen) */
  value: string
  onChange: (value: string) => void
  /** What the CLOSED CONTROL says when nothing is chosen — so it is meaningless
   * in `layout="row"`, where nothing is closed, and optional for that reason
   * alone. Every one of the control-layout call sites passes it and must: a
   * trigger reading "" is a button with no name on it. It is not a union type
   * (`layout: "row"` forbidding it outright) because the honest version of that
   * split would also have to fork `searchPlaceholder` and `emptyText`, and
   * BOTH of those do real work in a row — see their own notes below. One
   * optional prop with its reason written down is the smaller price. */
  placeholder?: string
  /** The search box's own placeholder, in the screen's words. IN ROW MODE it is
   * the fallback accessible name for the group of chips (a row has no search
   * box), so a row-layout caller should pass `ariaLabel` and this stays the
   * safety net rather than the answer. */
  searchPlaceholder: string
  /** What the list says when it has no rows. In the CONTROL layout that means
   * "the search matched nothing"; IN ROW MODE it means the vocabulary itself is
   * empty — a team that has deactivated every ticket type, an app with nobody
   * on it — which is a real state and the one thing a row of no chips must not
   * do silently. */
  emptyText: string
  /** CLIENT MODE — the whole list, already loaded. Bounded reads only.
   *
   * In SERVER mode it is optional and means something narrower: the list the
   * screen already holds, painted while the door's first answer is on its way,
   * and consulted for the LABEL of a record being edited. It is never searched.
   */
  options?: PickerOption[]
  /** SERVER MODE — ask the door. Debounced (200ms) and cached per term, so a
   * keystroke is not a request and backspacing lands on a warm answer. */
  search?: (term: string) => Promise<PickerOption[]>
  /** SERVER MODE — the cache prefix for this picker's answers. Must be
   * team-scoped, like every key in the app, so a team switch cannot show the
   * last team's people. */
  searchKey?: string
  /** SERVER MODE — the label of the value already chosen, for the closed
   * control. Without it (and without a matching row in `options`) a record being
   * EDITED shows its own id until the door happens to return it. */
  selectedLabel?: string
  /** The "leave it off" row, where a form has one ("No app", "Ours, no client").
   * Rendered first, and it is what the clear X goes back to. */
  emptyOption?: { value: string; label: string }
  disabled?: boolean
  /** Show the clear X beside the control when something is chosen. */
  clearable?: boolean
  /** Width/placement of the control in its own row. The list follows the
   * trigger's width, so this is the only size anything needs. */
  className?: string
  /** HOW THE SAME OPTIONS ARE LAID OUT. `control` (the default, and every one of
   * the call sites that existed before 2026-09-06) is the trigger that opens a
   * searchable list. `row` is one horizontal line of chips, already open,
   * committing on the click — `options` mode only, no search, no clear, no
   * `emptyOption`. See this file's header for what the row gives up and why it
   * is a prop rather than a second component. */
  layout?: "control" | "row"
  /** ROW MODE — the option promoted to the FRONT of the line, with a divider
   * after it. `undefined`/`null`/a value not in `options` draws no lead and no
   * divider, and the line is simply every option in the order it was given.
   *
   * THIS IS THE SUGGESTION SEAM, and it is empty on purpose. The triage card
   * passes the ticket's CURRENT type, which is the honest first thing to offer;
   * the day a suggestion is costed and built it lands here and NOTHING ELSE IN
   * THIS FILE CHANGES. No model is called from here or from any caller of it
   * today. */
  leadValue?: string | null
  /** ROW MODE — one line UNDER the chips saying why this row is being asked.
   * Already-translated copy from the screen, like every other string prop on
   * this component; a `ReactNode` because the reason a screen has for asking is
   * the screen's to compose. */
  note?: React.ReactNode
}) {
  const t = useT()
  const phone = useIsPhone()
  const [open, setOpen] = React.useState(false)
  // What is TYPED, and what the door has been ASKED, are two different values on
  // purpose: the box has to keep up with the keyboard while the request does not.
  const [text, setText] = React.useState("")
  const [term, setTerm] = React.useState("")
  const askDoor = useDebouncedCallback(setTerm, 200)
  // The label of whatever was picked in this session — so the closed control can
  // name a record the door is no longer returning (the search box has moved on).
  const [picked, setPicked] = React.useState<string | null>(null)

  const serverSide = !!search && !!searchKey
  const found = useCached<PickerOption[]>(
    open && serverSide ? `${searchKey}:${term}` : null,
    () => (search as (term: string) => Promise<PickerOption[]>)(term)
  )

  // Reopening starts clean — otherwise the second open of a picker shows the
  // first one's search still in the box and its answer still under it.
  React.useEffect(() => {
    if (!open) {
      setText("")
      setTerm("")
    }
  }, [open])

  // TYPED BUT NOT YET ASKED. The box runs ahead of the request by up to 200ms,
  // and in that gap the previous answer is on screen under new words — which
  // looks exactly like a search that returned the wrong rows. So the gap shows
  // that it is still looking, rather than showing a stale list confidently.
  const typing = serverSide && text.trim() !== term
  const rows = serverSide
    ? typing
      ? []
      : (found.data ?? options ?? [])
    : (options ?? [])
  const chosen = !!value && value !== emptyOption?.value
  // THE CHOSEN ROW ITSELF, not just its label — so the closed control can draw
  // its face too (below), the same option object `label` is already pulled
  // from. Absent while the value is a session-only id the door hasn't
  // answered for yet (`picked`/`selectedLabel` cover the label in that gap;
  // there is no picture to show until a real option row exists).
  const chosenOption = chosen
    ? (rows.find((o) => o.value === value) ?? options?.find((o) => o.value === value))
    : undefined
  const label = chosen
    ? (chosenOption?.label ?? picked ?? selectedLabel ?? value)
    : (placeholder ?? "")

  function choose(next: string) {
    onChange(next)
    setPicked(rows.find((o) => o.value === next)?.label ?? null)
    setOpen(false)
  }

  function clear() {
    onChange(emptyOption?.value ?? "")
    setPicked(null)
  }

  const row = (o: PickerOption) => (
    <CommandItem
      key={o.value}
      // cmdk filters on the item's own `value`, so it is the id (unique — two
      // clients may share a name) and the words a person would type ride along
      // as `keywords`. In server mode nothing is filtered here at all.
      value={o.value}
      keywords={o.hint ? [o.label, o.hint] : [o.label]}
      onSelect={() => choose(o.value)}
      // 44px is the touch floor (UI-RULEBOOK S6); a desktop row stays compact.
      className="min-h-11 items-start gap-2 py-2.5 sm:min-h-0 sm:py-1.5"
    >
      <Check className={value === o.value ? "mt-0.5 opacity-100" : "mt-0.5 opacity-0"} />
      {/* THE RECORD'S OWN FACE, in the slot an icon would take (R35). Drawn only
          when the option carries one, so a list of roles or versions is exactly
          as dense as it was. `size="choice"` (24px) — CLIENT-REPORTED,
          2026-09-01, on the "Team lead" field's open list: this used to be
          `size="row"` (36px) on the reasoning that a picker row and a
          collection row are the same record at the same size, but a picker's
          list is a dense, scannable stack of candidates being compared against
          each other — the same shape as the staff CHECKLIST `choice` was
          already named for in `record-mark.tsx` — not a single row read on its
          own the way a collection row is. NO SIZE CLASS HERE — a `size-6`/
          `text-sm` className here was a hand-rolled size fighting the `size`
          prop for the same box, exactly the drift `RecordMark`'s own header
          warns a caller-supplied size class causes; that bug is fixed, this is
          a size decision on top of it. */}
      {(o.picture || o.mark || o.face) && (
        <RecordMark
          picture={o.picture}
          mark={o.mark}
          name={o.label}
          shape={o.shape}
          size="choice"
          className="mt-0.5"
        />
      )}
      {/* THE THIRD KIND OF MARK, in the same slot and never beside a face: an
          option carries a picture, a glyph or a colour, and a record that
          somehow had two would be saying the same thing twice in one row. The
          `mt-1.5` is the dot's own optical centring against the first line of a
          two-line option, the same job `mt-0.5` does for the 24px box above. */}
      {!o.picture && !o.mark && o.swatch && (
        <span className="mt-1.5 flex">
          <Swatch colour={o.swatch} />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{o.label}</span>
        {o.hint && <span className="text-muted-foreground truncate text-xs">{o.hint}</span>}
      </span>
    </CommandItem>
  )

  const list = (
    <Command
      // SERVER MODE FILTERS NOTHING HERE. The door already answered the question;
      // running cmdk's own matcher over its reply would filter the answer by the
      // same words a second time, and drop any row whose match was in a field the
      // door searched and the label does not show.
      // Her Command filters internally; in server mode the door already
      // answered, so the pass-everything filter stops a second, narrower match.
      filter={serverSide ? () => true : undefined}
      // In the SHEET the palette owns the whole 85dvh and the list is the part
      // that scrolls; in the POPOVER it is as tall as its contents, up to the
      // library's own ceiling. Without the distinction the popover has no height
      // bound at all — a search matching thirty rows grew a list off the top of
      // the window and took its own search box with it.
      className={phone ? "h-full" : ""}
    >
      {/* The kit's Command owns the query text; the picker OBSERVES it through
          the input's own onInput (spread through to the <input>) so server mode
          can ask the door as the person types. */}
      <CommandInput
        onInput={(e: React.FormEvent<HTMLInputElement>) => {
          const next = e.currentTarget.value
          setText(next)
          if (serverSide) askDoor(next.trim())
        }}
        placeholder={searchPlaceholder}
        className="pr-8"
      />
      <CommandList
        className={
          phone ? "max-h-none flex-1 overflow-y-auto overscroll-contain" : "overscroll-contain"
        }
      >
        {serverSide ? (
          <ServerRows
            loading={typing || (found.loading && !found.data)}
            error={!!found.error}
            count={rows.length}
            emptyText={emptyText}
          />
        ) : (
          <CommandEmpty>{emptyText}</CommandEmpty>
        )}
        <CommandGroup>
          {emptyOption && (
            <CommandItem
              value={emptyOption.value}
              keywords={[emptyOption.label]}
              onSelect={() => {
                clear()
                setOpen(false)
              }}
              className="text-muted-foreground min-h-11 py-2.5 sm:min-h-0 sm:py-1.5"
            >
              <Check className={chosen ? "opacity-0" : "opacity-100"} />
              {emptyOption.label}
            </CommandItem>
          )}
          {rows.map(row)}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  // ── THE ONE-ROW LAYOUT ────────────────────────────────────────────────────
  //
  // Returned BEFORE the trigger and the palette are even built, and after every
  // hook above has run: `useCached`, `useDebouncedCallback` and the two
  // `useState`s are all called unconditionally, so this branch cannot change the
  // hook order however a caller flips `layout`. The state they hold (the typed
  // text, the asked term, the session's last pick) is simply unused here — the
  // cheaper alternative, hooks after an early return, is the React rule this
  // file may not break.
  if (layout === "row") {
    // The lead first, then the rest in the order the caller gave them, with the
    // lead subtracted so it is never offered twice. `find` rather than a
    // filter-and-take: a `leadValue` naming nothing (no type set yet, or a word
    // that has since been retired) must draw no lead AND no divider, and an
    // undefined here is what makes both disappear together.
    const lead = leadValue ? options?.find((o) => o.value === leadValue) : undefined
    const rest = (options ?? []).filter((o) => o.value !== lead?.value)
    return (
      // `role="group"` + `aria-label`, not `radiogroup`: these are buttons that
      // ACT (each one commits and closes the row) rather than a set of states
      // being toggled before a submit, and announcing them as radios would
      // promise a confirm step the client explicitly refused.
      //
      // `id` IS CARRIED HERE TOO, added 2026-09-07 when the ticket form put a
      // row INSIDE a `Field` for the first time. The kit's Field mints an id and
      // clones it onto its single child; the control layout below spends it on
      // the trigger button, and this branch used to drop it on the floor — so a
      // `<label for="help-type">` pointed at nothing at all. It still does not
      // ASSOCIATE (a label's `for` binds only to a labelable control, and this
      // is a div — the same wall the description field's `aria-label` works
      // around one file over), which is exactly why the name a screen reader
      // reads comes from `ariaLabel` and the call site must pass it. What the id
      // buys is that the attribute names a real element instead of a ghost.
      <div id={id} role="group" aria-label={ariaLabel ?? searchPlaceholder} className={className}>
        {/* A ROW WITH NOTHING IN IT IS A REAL STATE AND SAYS SO. The control
            layout has the same sentence inside its palette (`CommandEmpty`);
            here there is no palette to put it in, so it takes the chips' own
            place. It is not hypothetical: a team can deactivate every ticket
            type on the Choices screen, and a line that simply drew nothing
            would read as a screen that had failed to finish loading. */}
        {(options ?? []).length === 0 && <p className="text-muted-foreground text-sm">{emptyText}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {lead && (
            // `suggested` and `chosen` are two DIFFERENT questions asked of the
            // same chip, and the chip resolves the clash rather than this line:
            // see `RowChip`. Today the answer to both is the same option, so
            // the lead draws black and no spark — say the two facts anyway,
            // because the day a real suggestion lands in `leadValue` this call
            // site must not need editing.
            <RowChip
              option={lead}
              chosen={value === lead.value}
              suggested
              disabled={disabled}
              onPick={choose}
            />
          )}
          {lead && rest.length > 0 && (
            // THE DIVIDER, and it is the whole of what "suggested first" looks
            // like today. A real `<Separator>` would be a horizontal rule laid
            // on its side inside a wrapping flex row, which is the one place it
            // draws badly — the kit's own is a full-width line and this is a
            // 1px, one-chip-tall tick. `bg-border` is the token; `aria-hidden`
            // because the grouping it marks is visual and the chips either side
            // are already one labelled group.
            <span aria-hidden className="bg-border h-5 w-px shrink-0" />
          )}
          {rest.map((o) => (
            <RowChip key={o.value} option={o} chosen={value === o.value} disabled={disabled} onPick={choose} />
          ))}
        </div>
        {note && (
          // THE REASON LINE, under the chips. It is the row's own explanation of
          // what a click here will do, and it is the reason no confirm button is
          // needed: a person reads what happens BEFORE they commit rather than
          // being asked to agree to it afterwards.
          <p className="text-muted-foreground mt-2 text-xs">{note}</p>
        )}
      </div>
    )
  }

  // A PERSON IN THEIR OWN RIGHT gets their face on the closed control too, not
  // only in the open list — a staff Owner/Assignee field or a Contact field,
  // told apart from a client/app/thing by the same `shape: "round"` the option
  // already carries (record-mark.tsx's own discriminator). Client-reported:
  // "every time I have to select a person, add the avatar" — originally drawn
  // on the RIGHT, beside the chevron, so the label stayed the thing read
  // first. OVERRIDDEN 2026-08-31: the client's next ruling is a blanket one —
  // "an avatar next to a name sits on the LEFT of it, never the right, never
  // above or below" — which this control's own trigger disagreed with. Drawn
  // before the label now, exactly where the kit's own `Avatar`-then-name
  // pattern (team-switcher.tsx, the kit's `List`/`ActivityFeed`) already puts
  // it everywhere else in the app.
  const personMark = chosenOption?.shape === "round" && (
    // No size className here either — see the option row's own `RecordMark`
    // comment above: a `size-6` override was fighting the `size` prop for the
    // same box. `size="choice"` (24px), for the same reason as the open list:
    // the closed control and its own open rows are the same record at the
    // same size, so the closed face follows the list's size down with it.
    <RecordMark
      picture={chosenOption.picture}
      mark={chosenOption.mark}
      name={chosenOption.label}
      shape="round"
      size="choice"
      className="shrink-0"
    />
  )

  const trigger = (
    <Button
      id={id}
      aria-label={ariaLabel}
      type="button"
      variant="secondary"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      // Square, not pill: this is a form control sitting in a column of inputs,
      // and the library's own Select trigger is the shape a person reads as one.
      //
      // THE GREY OUTLINE, 2026-08-31 — client-reported on this exact dialog's
      // screenshot: the two picker fields ("Whose system it is", "Stage") sat
      // beside plain Input/Textarea fields as a solid filled swatch with no
      // edge, while every other field around them drew the field hairline.
      // `--btn-secondary-fill` already IS `--card` — same tone `input.tsx` and
      // `textarea.tsx` fill with — so the two were never a colour mismatch;
      // a BUTTON carries no border in any state (button.tsx's own law) and a
      // FIELD does, drawn as this inset-shadow hairline (never a CSS
      // `border`), which is the one thing missing here. Two strengths, same
      // as `input.tsx`'s `disabled` split: `--hair-strong` at rest, the
      // weaker `--hair` once the control is disabled — so a picker a form
      // has locked reads as locked the same way a text field does. Focus
      // needs nothing added: tokens.css §8 rings every control the same way
      // already, button or field.
      className={cn(
        "min-h-9 min-w-0 flex-1 justify-between gap-2 rounded-[var(--radius)] px-3 font-normal",
        disabled ? "shadow-[var(--hairline)]" : "shadow-[var(--hairline-strong)]"
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {personMark}
        <span className={chosen ? "min-w-0 truncate" : "text-muted-foreground min-w-0 truncate"} title={label}>
          {label}
        </span>
      </span>
      <CaretUpDown className="shrink-0 opacity-50" />
    </Button>
  )

  return (
    <div className={className ? `flex items-center gap-1 ${className}` : "flex w-full items-center gap-1"}>
      {phone ? (
        <>
          <div className="flex min-w-0 flex-1" onClick={() => !disabled && setOpen(true)}>
            {trigger}
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            {/* 85dvh from the BOTTOM: the top edge lands near the top of the
                screen, which is the one band a software keyboard never covers,
                and the search box is pinned there. `dvh` because a phone's
                address bar is the difference between "pinned" and "off screen". */}
            <SheetContent
              side="bottom"
              /* A picker is an INPUT SURFACE, wherever it opens — and half its
                 openings are inside a dialog (every form with a record field),
                 where a page-layer sheet paints BEHIND the form asking for it.
                 `overDialog` is the kit's word for exactly this (v1.0.5). */
              overDialog
              className="flex h-[85dvh] flex-col gap-0 rounded-t-[var(--radius)] p-0"
            >
              <SheetTitle className="sr-only">{searchPlaceholder}</SheetTitle>
              {list}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover
          open={open}
          onOpenChange={setOpen}
          // ALWAYS MODAL, both because it must be and because it should be.
          // Must: a picker usually lives in a form DIALOG, whose scroll lock
          // preventDefaults wheel and touch on everything outside its own
          // subtree — and a portaled popover is outside it, so without this the
          // list opens and will not scroll (popover.tsx says so in its header).
          // Should: on an ordinary page this is the behaviour of the control it
          // replaces — Radix `Select` blocks outside pointer events too — and a
          // picker closes the moment you choose, so nothing is trapped for long.
          modal
        >
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] p-0"
          >
            {list}
          </PopoverContent>
        </Popover>
      )}
      {clearable && chosen && !disabled && (
        // A SIBLING of the trigger, never nested inside it: Button's base class
        // carries `[&_svg]:pointer-events-none`, so an X drawn inside the trigger
        // is invisible to hit-testing and the click just opens the list.
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("Clear")}
          onClick={clear}
          className="text-muted-foreground hover:text-foreground size-9 shrink-0"
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  )
}

/** ONE CHIP ON THE ONE-ROW LAYOUT — an option a person can click, wearing the
 * same face the open list draws for the same record.
 *
 * IT IS A `Button`, not a styled span with an onClick (R39, and the kit's own
 * law): focus, the pressed nudge, the disabled fill/ink pair and the global
 * focus ring in `tokens.css` §8 all arrive with it, and none of them would have
 * been remembered by hand.
 *
 * THREE STATES, THREE WORDS OUT OF THE KIT, AND NONE OF THEM IS MANGO. The
 * client's ruling of 2026-09-06 is written up at length in this file's header;
 * the short version is that mango means "this is the chosen one" everywhere
 * else in the app, so painting an OFFER in it put two different claims in one
 * colour.
 *
 *   • CHOSEN     `variant="inverse"` — charcoal fill, off-beige label, flipping
 *                with the palette. The same word the black `#1513` chip above
 *                this row is drawn with, so the loudest mark on the card means
 *                one thing in both places.
 *   • SUGGESTED  `variant="ghost"` + `shadow-[var(--hairline-strong)]` + the
 *                spark. No fill, an edge, and a glyph: "offered, not picked".
 *                The edge is the kit's own inset hairline rather than a dashed
 *                CSS border — see the header for why that spelling is refused
 *                here, and why it has already been removed from this codebase
 *                twice.
 *   • ORDINARY   `variant="secondary"`, the filled chip it always was.
 *
 * CHOSEN WINS OVER SUGGESTED, and the precedence lives HERE rather than at the
 * call site so it cannot be answered two ways by two callers. A chip that has
 * been picked is not simultaneously being offered, and the black fill is the
 * louder claim of the two, so it takes the chip and the spark stands down. That
 * is not a hypothetical tidy-up: today `leadValue` IS the ticket's current type,
 * so every lead chip in the app is in exactly this case.
 *
 * `aria-pressed` still carries the CHOSEN half to a screen reader, unchanged.
 * The suggestion is deliberately NOT announced: it is an offer about which chip
 * to read first, which is a visual ordering the row already expresses by putting
 * it first, and announcing "suggested" on a lead that is also the current answer
 * would be a second, contradictory claim in the same breath.
 *
 * THE FACE COMES FROM THE SAME THREE FIELDS the open list reads, in the same
 * precedence: a picture or a glyph is a `RecordMark`, a colour is a `Swatch`,
 * and a record with neither is its word alone. That is R35 in the layout the
 * client picked — the people row on this same card offers colleagues, and a
 * colleague without their face is a name a person has to read rather than
 * recognise.
 *
 * `size="sm"` (32, the kit's dense control height) and NO radius class at all:
 * `Button`'s own base is already `rounded-pill`, which is the shape a chip wants
 * and R31's second radius. The trigger further up this file DOES override it,
 * to `rounded-[var(--radius)]`, because that one is a form control standing in a
 * column of inputs; a chip in a line of chips is not, so it keeps the kit's. */
function RowChip({
  option,
  chosen,
  suggested = false,
  disabled,
  onPick,
}: {
  option: PickerOption
  chosen: boolean
  /** This chip is the one being OFFERED first — `leadValue`'s own chip. Ignored
   * when `chosen` is true; see this function's header for why the precedence is
   * settled here and not by the caller. */
  suggested?: boolean
  disabled?: boolean
  onPick: (value: string) => void
}) {
  // Resolved once, above the JSX, so the three branches below read off ONE
  // answer. Writing `chosen ? … : suggested ? … : …` three separate times in
  // three attributes is how a variant and its glyph drift apart.
  const offering = suggested && !chosen
  return (
    <Button
      type="button"
      size="sm"
      variant={chosen ? "inverse" : offering ? "ghost" : "secondary"}
      disabled={disabled}
      aria-pressed={chosen}
      onClick={() => onPick(option.value)}
      // THE EDGE ONLY EXISTS ON THE OFFER. `--hairline-strong` is an inset
      // box-shadow (tokens.css §7), so it costs no layout and cannot push the
      // chip a pixel taller than the two beside it — which a 1px border would,
      // and which is the second reason this is a shadow and not a border.
      className={cn("min-w-0 gap-2", offering && "shadow-[var(--hairline-strong)]")}
    >
      {/* THE SPARK, BEFORE THE FACE. It is a claim about the CHIP ("this one is
          being offered") rather than about the record, so it sits outside the
          record's own mark instead of replacing it — R35 is about the face, and
          a suggestion may not cost an option its identity. `aria-hidden` for
          UI-CONVENTIONS §5's reason: it is a pictograph, and the row's own
          ordering already says what it says. */}
      {offering && <Sparkle aria-hidden className="size-3.5 shrink-0" />}
      {(option.picture || option.mark || option.face) && (
        <RecordMark
          picture={option.picture}
          mark={option.mark}
          name={option.label}
          shape={option.shape}
          size="choice"
        />
      )}
      {!option.picture && !option.mark && !option.face && option.swatch && <Swatch colour={option.swatch} />}
      <span className="truncate">{option.label}</span>
    </Button>
  )
}

/** WHAT A SERVER-SEARCHED LIST SAYS WHEN IT HAS NO ROWS, and why it is three
 * sentences rather than one. "Nothing matched" is a claim about a collection,
 * and it is only true once the door has answered: said while the request is in
 * flight it is a confident wrong answer, which is exactly the failure this whole
 * component was written for. So an unanswered list says it is looking, a failed
 * one says it failed, and only an answered, empty one says nothing matched. */
function ServerRows({
  loading,
  error,
  count,
  emptyText,
}: {
  loading: boolean
  error: boolean
  count: number
  emptyText: string
}) {
  const t = useT()
  // Rows on screen say everything these sentences would. Checked FIRST so a
  // background refetch over a list somebody is already reading is silent.
  if (count > 0) return null
  if (loading)
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
        <Spinner size="sm" />
        {t("Searching…")}
      </div>
    )
  if (error)
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">
        {t("Couldn't search just now. Try again.")}
      </div>
    )
  return <div className="text-muted-foreground py-6 text-center text-sm">{emptyText}</div>
}
