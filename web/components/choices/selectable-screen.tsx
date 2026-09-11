"use client"

// Choices ("selectable data", formerly "Dropdown values") manager — host-composed.
// Lists a team's values grouped by TYPE (with the standard search + status filter),
// and lets admins add a value (via the shared form dialog — Law R4, like every
// other create), rename one, deactivate/reactivate one, import and export them.
// Gated by the selectable_data module; the server re-checks every write. Library
// primitives only.
//
// ── IT IS ALWAYS A SECTION OF A MODULE'S SETTINGS PAGE, SINCE 11 SEP 2026 ────
//
// It had two mountings for ten days: the WHOLE vocabulary (the "Choices" tab on
// Settings, and before that `/t/<teamId>/dropdowns` on the team area's own
// strip), and a narrowed one — `scope` — inside a module's settings page. The
// client ended the first: *"implement this module settings across app: … End
// goal: kill the big tab 'choice options'."*
//
// So `scope` is REQUIRED and there is no unscoped path left. Three props went
// with it and each one only ever existed to serve a whole-vocabulary screen:
//
//   • `standalone`, which drew the registry's own page-sized heading and count
//     (R16 ii). A section inside a page is never the page.
//   • `onOpen`, the row's link to a value's own RECORD screen. That screen was
//     retired the same day — this link was its only door — and a settings page
//     does not navigate out of Settings ("Everything should be in different
//     containers… not taken anywhere else", client, 2026-09-09).
//   • the unscoped branches of `types`, `values` and the heading, which offered
//     a FREE GROUP NAME on create. That is the one capability this move loses:
//     a team can no longer invent a group. It is recorded rather than
//     discovered, here and in settings-screen.tsx's header — a team-invented
//     group is unused by construction, because nothing reads a word no module
//     stores, so what went is the ability to make rows nothing consults.

import * as React from "react"
import { useRemembered } from "@shared/web/remembered"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Input } from "@shared/ui/components/input/input"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"
import { PencilSimple, X, Check, UploadSimple, Download, Power, Shield, ShieldSlash } from "@shared/ui/foundations/icons"

import type { SortOption } from "@shared/web/screen-engine/config"
import type { SelectableValue } from "@shared/types"
import { ApiFailure, tenancy } from "@/lib/api"
import { NEUTRAL_TYPE_COLOUR } from "@/lib/type-colours"
import { RecordActionsMenu, type RecordAction } from "@/components/records/record-chrome"
import { Swatch } from "@/components/records/record-picker"
import { SelectableFormDialog } from "@/components/choices/selectable-form-dialog"
import { usePermissions } from "@/lib/perms"
import { safeHref } from "@shared/web/rich-text"
import { primeCache, useCached } from "@shared/web/store"
import { useT } from "@shared/web/language"
import { AddButton, CollectionCard, ToolbarAction, ToolbarRow } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import { useVirtualRows } from "@shared/ui/components/use-virtual-rows/use-virtual-rows"
import { useConfirm } from "@shared/web/use-confirm"

/** WHAT A DROPDOWN VALUE MAY BE ORDERED BY. "Value" reorders the words INSIDE
 * one group (the group itself stays put, alphabetical); "Group" reorders the
 * GROUPS themselves (Ticket type before Sprint type, or the other way round)
 * and leaves what's inside each one exactly where it was. Two different
 * questions, and this is the whole vocabulary — a value has no date, no
 * count, nothing else this screen could sort by (SelectableValue carries a
 * word, a type, a protection flag and an active flag, and none of the other
 * three reads as an ORDER). */
const VALUE_SORTS: SortOption[] = [
  { value: "value", label: "Value" },
  { value: "group", label: "Group" },
]

/** Shared by every row, virtualized or not — one function so the two render
 * paths cannot draw a value two different ways. */
interface RowContext {
  teamId: string
  canEdit: boolean
  canDelete: boolean
  editingId: string | null
  editValue: string
  editMark: string
  savingId: string | null
  setEditingId: (id: string | null) => void
  setEditValue: (v: string) => void
  setEditMark: (v: string) => void
  saveRename: (id: string) => void
  setDefault: (v: SelectableValue, next: boolean) => void
  setActive: (v: SelectableValue, next: boolean) => void
  /** Present only where this mounting's group has a PALETTE — see
   * `SelectableScope.colour`. It decides two things and they are the same
   * decision: the group draws as a wall of chips rather than a list of rows,
   * and its mark is not offered for editing, because on a coloured group the
   * colour IS the mark and nothing in the app reads the glyph. */
  colour?: (value: string) => string
  t: ReturnType<typeof useT>
}

/** WHAT A READER MAY DO TO ONE VALUE — built once, so the list row and the chip
 * can never come to offer different acts on the same word.
 *
 * It was written inline in `ValueRow` until the chip wall arrived on
 * 2026-09-10. Two copies of this array is the drift `RecordActionsMenu`'s own
 * header argues against one level up: the confirm on Deactivate, the swap
 * between "Protect it" and "Stop protecting it", and the rule that Deactivate
 * stands down on a protected value are three behaviours, and the second copy is
 * where one of them stops being true. */
function valueActions(v: SelectableValue, ctx: RowContext): RecordAction[] {
  const { canEdit, canDelete, setEditingId, setEditValue, setEditMark, setDefault, setActive, t } = ctx
  return [
    ...(v.active && canEdit
      ? [
          {
            key: "rename",
            label: t("Rename"),
            icon: <PencilSimple className="size-3.5" />,
            onSelect: () => {
              setEditingId(v.id)
              setEditValue(v.value)
              // CARRIED EVEN WHERE IT IS NOT SHOWN. On a coloured group the
              // mark input is not drawn (see `RowContext.colour`), and the
              // rename door takes the mark as an argument — so seeding this
              // from the row is what keeps a rename from silently CLEARING a
              // glyph the reader was never shown and never chose to remove.
              // Clearing the emoji that are already in the data is a migration
              // and a decision of the client's, not a side effect of typing a
              // new word.
              setEditMark(v.mark ?? "")
            },
          },
        ]
      : []),
    // PROTECTED, NOT "DEFAULT" — the client's ruling, 2026-09-10 ("find an
    // accurate word for what Default means … Find a good word and rename it").
    // The flag never pre-selected anything: its one behavioural read in the
    // whole app is the refusal in `setSelectableActive`, so what it does is
    // stop the value being switched off. `shared/glossary.ts` carries the word
    // and the reasoning; the column and the door field are still `is_default` /
    // `isDefault` on purpose. The two glyphs were already `Shield` /
    // `ShieldSlash`, which is the picture the new word was hiding behind.
    ...(canEdit
      ? [
          v.isDefault
            ? {
                key: "undefault",
                label: t("Stop protecting it"),
                icon: <ShieldSlash className="size-3.5" />,
                onSelect: () => void setDefault(v, false),
              }
            : {
                key: "default",
                label: t("Protect it"),
                icon: <Shield className="size-3.5" />,
                onSelect: () => void setDefault(v, true),
              },
        ]
      : []),
    // DEACTIVATE STANDS DOWN ON A PROTECTED VALUE rather than offering itself
    // and failing at the door. The door refuses it either way (that is the real
    // defence, and it holds for the agent and MCP too); this is so a person is
    // never offered a button that cannot work. Take the protection off and it
    // comes back.
    ...(canDelete && !v.isDefault
      ? [
          v.active
            ? {
                key: "deactivate",
                label: t("Deactivate"),
                icon: <Power className="size-3.5" />,
                destructive: true,
                onSelect: () => void setActive(v, false),
              }
            : {
                key: "activate",
                label: t("Activate"),
                icon: <Power className="size-3.5" />,
                onSelect: () => void setActive(v, true),
              },
        ]
      : []),
  ]
}

/** THE INLINE RENAME, shared by the row and the chip for `valueActions`' own
 * reason: one editor, one save button, one loading state.
 *
 * THE MARK INPUT IS ABSENT ON A COLOURED GROUP. Client, 2026-09-07: *"for type,
 * kill the emojis. this is legacy. in current system we use colors"*, and
 * 2026-09-10: *"also kill emojis!!!"*. `web/lib/type-marks.ts` already deleted
 * the READ for ticket types — `MARK_GROUP` has no `ticket` key and the union is
 * closed, so no screen can look one up — which left this editor as the last
 * place in the app that drew a ticket type's glyph, and it drew it in the one
 * position that invites somebody to type another. */
function ValueEditor({ v, ctx }: { v: SelectableValue; ctx: RowContext }) {
  const { editValue, editMark, savingId, setEditingId, setEditValue, setEditMark, saveRename, colour, t } = ctx
  return (
    <>
      {!colour && (
        <Input
          value={editMark}
          onChange={(e) => setEditMark(e.target.value)}
          // "MARK", NOT "EMOJI" — client, 2026-09-10: *"also kill emojis!!!"*,
          // and the label was contradicting the door as well as the ruling.
          // `optionalMark` (`shared/workers/validate.ts`) has refused a
          // pictograph on this exact field since 2026-08-31 with the sentence
          // "Mark should be a short word or initial, not an emoji" — so a
          // control labelled Emoji, asking for one, was a 400 waiting to
          // happen. The tickets and process sides renamed it then; these three
          // Choices screens were the half that was missed.
          aria-label={t("Mark")}
          placeholder={t("Mark")}
          maxLength={4}
          className="h-8 w-16 shrink-0 text-center"
        />
      )}
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        aria-label={t("Option")}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="h-8"
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void saveRename(v.id)}
        loading={savingId === v.id}
        loadingLabel={null}
        aria-label={t("Save")}
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setEditingId(null)}
        aria-label={t("Cancel")}
      >
        <X className="size-4" />
      </Button>
    </>
  )
}

/** ONE VALUE AS A CHIP — the shape a ticket type already wears everywhere else
 * in the app.
 *
 * THE CLIENT, 2026-09-10: *"on ticket type, show it like chips with their
 * color, not a list."* The chip is not invented here: `Badge variant="secondary"
 * size="pill"` with a `Swatch` inside it is exactly what the ticket table's Type
 * cell, the triage card and the type picker draw, on her own earlier ruling
 * (*"Type with the colors, same as we have with the chips"*). This screen — the
 * one place the words are SET — was the last that drew them as grey rows with a
 * pictograph in front.
 *
 * THE CHIP IS THE PRESS TARGET, and the menu behind it is the row's own
 * (`RecordActionsMenu`'s `trigger` slot carries the argument). A reader with no
 * rights gets the chip and no menu rather than a chip that opens an empty one,
 * which is the same rule that component already applies to the three dots.
 *
 * A BARE `<button>`, for `members-gallery.tsx`'s reason one screen along: every
 * kit `Button` size fixes a height and this target is a badge, not a control.
 * The kit's focus rule is global (tokens.css §8 rings every `:focus-visible` at
 * the control's own radius), so it is rung for free and defines nothing.
 *
 * INACTIVE READS AS DIMMED, the same `opacity-60` the list row uses, so the two
 * renderings say "switched off" with one vocabulary. `Protected` and `Inactive`
 * ride the chip's accessible NAME rather than a second badge inside it: a badge
 * nested in a badge is two lozenges for one word, and the state is a fact about
 * the chip rather than a thing beside it. */
function ValueChip({ v, ctx }: { v: SelectableValue; ctx: RowContext }) {
  const { colour, editingId, t } = ctx
  if (editingId === v.id)
    return (
      <span className="flex items-center gap-2">
        <ValueEditor v={v} ctx={ctx} />
      </span>
    )
  const states = [v.isDefault ? t("Protected") : null, v.active ? null : t("Inactive")].filter(Boolean)
  const chip = (
    <Badge variant="secondary" size="pill" className={v.active ? undefined : "opacity-60"}>
      <Swatch colour={colour?.(v.value) ?? NEUTRAL_TYPE_COLOUR} />
      {v.value}
    </Badge>
  )
  const actions = valueActions(v, ctx)
  if (actions.length === 0) return chip
  return (
    <RecordActionsMenu
      actions={actions}
      trigger={
        <button
          type="button"
          className="cursor-pointer"
          aria-label={[v.value, ...states].join(" — ")}
        >
          {chip}
        </button>
      }
    />
  )
}

/** ONE GROUP AS A WALL OF CHIPS — the coloured groups' answer to `GroupValues`
 * below, and deliberately NOT virtualized: a palette is a handful of words (the
 * base seeds four ticket types) and `useVirtualRows` measures one uniform ROW
 * height, which a wrapping wall does not have. */
function ChipWall({ items, ctx }: { items: SelectableValue[]; ctx: RowContext }) {
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <ValueChip v={item} ctx={ctx} />
        </li>
      ))}
    </ul>
  )
}

function ValueRow({
  v,
  ctx,
  rowRef,
  posinset,
  setsize,
}: {
  v: SelectableValue
  ctx: RowContext
  rowRef?: React.Ref<HTMLLIElement>
  /** This row's 1-based position in the FULL (unwindowed) list, and the full
   * count — the reason both exist at all: with only a handful of rows in the
   * DOM, a screen reader has no other way to say "row 214 of 400". Both
   * omitted on the unvirtualized path, where the DOM's own order and length
   * already say the whole thing (ARIA's own guidance for `aria-posinset` /
   * `aria-setsize`: only needed when not every item is present in the DOM). */
  posinset?: number
  setsize?: number
}) {
  const { editingId, t } = ctx
  return (
    <li
      ref={rowRef}
      aria-posinset={posinset}
      aria-setsize={setsize}
      className={`flex items-center gap-2 px-3 py-2 ${v.active ? "" : "opacity-60"}`}
    >
      {editingId === v.id ? (
        <ValueEditor v={v} ctx={ctx} />
      ) : (
        <>
          {/* THE TYPE MARK, where it is SET (CHECKLIST 11.8). It
              sits in the leading icon slot and is `aria-hidden`,
              with the word right beside it, two of the four
              conditions UI-CONVENTIONS §5 puts on a type mark, and
              this screen is the third one (it is data, set here). */}
          {v.mark && (
            <span aria-hidden className="w-5 shrink-0 text-base leading-none">
              {v.mark}
            </span>
          )}
          {/* THE WORD, AND IT OPENS NOTHING. It used to be a real anchor to
              `/t/<teamId>/dropdowns/<id>`, a value's own record screen — and
              this row was that screen's only door anywhere in the app. Both
              went on 11 Sep 2026 with the whole-vocabulary screen (see this
              file's header): a settings page does not navigate out of
              Settings, and everything the record screen offered to CHANGE is
              on this row already. What it alone carried — who made the value
              and when, and its own history — is read in the team's activity
              feed, which covers `selectable_data` like any other table. */}
          <span className="flex-1 text-sm">{v.value}</span>
          {!v.active && (
            <Badge variant="secondary" className="shrink-0">
              {t("Inactive")}
            </Badge>
          )}
          {/* PROTECTED — the reason the Deactivate action is not on
              this row, said as the thing it actually is. It read
              "Default" until 2026-09-10, which promised a
              pre-selection nothing in the app has ever made:
              `is_default` is on every seeded value and its only
              behavioural read anywhere is the refusal in
              `setSelectableActive`. */}
          {v.isDefault && (
            <Badge variant="secondary" className="shrink-0">
              {t("Protected")}
            </Badge>
          )}
          {/* THE TWO ACTIONS, IN THE ROW'S OWN MENU (B2). The row
              was `mark · value · "Inactive" · Edit · Power`:
              two facts, a state and two actions in one sweep,
              which is N4's other worked example. Facts on the
              line, the state as a badge at the end of it, the
              actions in the trailing slot — and never interleaved.
              H 5 → 3. The items themselves are `valueActions`
              above, shared with the chip wall. */}
          <RecordActionsMenu tone="row" actions={valueActions(v, ctx)} />
        </>
      )}
    </li>
  )
}

/** One type's own rows. VIRTUALIZED PER GROUP, not across the whole screen —
 * `useVirtualRows` assumes one row height for the whole list it is given, and
 * a flattened list would mix group-header rows (a different height) into
 * that assumption. Each group's own items ARE uniform, so this is the grain
 * that keeps the hook's guarantee true. A group under the threshold renders
 * exactly as it always did — same markup, no scroll box, `virtualized: false`
 * — so nothing about a short group's page position or print layout changes.
 *
 * THE SCROLL BOX ONLY APPEARS ONCE VIRTUALISED. Windowing only saves anything
 * inside a HEIGHT-BOUNDED container: unbounded, the browser would still be
 * asked to lay out (if not paint) every row as the page grows to fit them.
 * `max-h-[28rem]` is roughly nine rows at the 56px fallback height — enough
 * to browse a handful of screens' worth before scrolling, on any group large
 * enough to need it at all. */
function GroupValues({ items, ctx }: { items: SelectableValue[]; ctx: RowContext }) {
  const v = useVirtualRows<HTMLUListElement>({ count: items.length })

  if (!v.virtualized) {
    return (
      <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
        {items.map((item) => (
          <ValueRow key={item.id} v={item} ctx={ctx} />
        ))}
      </ul>
    )
  }

  return (
    <ul
      ref={v.scrollRef}
      className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel max-h-[28rem] overflow-y-auto"
    >
      {/* THE SPACERS ARE `<li>`s, not `<div>`s wrapping one — a `<ul>`'s only
          valid direct children are `<li>`, and a reader's list-item count
          depends on that structure staying true even for the two rows that
          carry no content. Both are `aria-hidden`, from `use-virtual-rows`'s
          own `SPACER_ATTR` contract, so neither is announced as an empty
          list item. */}
      <li {...v.startSpacerProps} />
      {v.rows.map((index) => (
        <ValueRow
          key={items[index].id}
          v={items[index]}
          ctx={ctx}
          posinset={index + 1}
          setsize={items.length}
          rowRef={index === v.startIndex ? (v.measureRef as unknown as React.Ref<HTMLLIElement>) : undefined}
        />
      ))}
      <li {...v.endSpacerProps} />
    </ul>
  )
}

/** ONE MODULE'S SHARE OF THE VOCABULARY, when this editor is mounted inside a
 * module's own settings page rather than on the whole-team Choices screen.
 *
 * THE CLIENT'S RULING, 2026-09-09: *"the choices: yes, this would survive, but
 * not as a general thing, but inside each module."* A ticket type and a sprint
 * type are the same KIND of row and a different SUBJECT, and somebody who has
 * come to a page called "Ticket settings" has already said which subject they
 * mean — so the page shows those groups and only those.
 *
 * IT IS A NARROWING OF THIS SCREEN, NOT A SECOND SCREEN, and that is the whole
 * point of the prop. `module-settings-screen.tsx` could have drawn its own list
 * of ticket types in an afternoon; it would then have had its own rename, its
 * own deactivate confirm, its own mark field and its own idea of what
 * protecting a value means — four behaviours to keep in step with this file for ever, and a
 * value that reads one way on Settings › Choices and another on Settings ›
 * Tickets. Every write below still goes through the same four `tenancy.*`
 * doors and primes the same `selectable:<teamId>` key, so an edit made here is
 * the identical edit made there, seen live by both.
 *
 * `types` IS THE WHOLE NARROWING. The rows, the group datalist the create
 * dialog offers, and R50's own "is this collection empty" question are all
 * asked of the scoped set rather than the team's whole vocabulary — otherwise a
 * team with no ticket types but plenty of sprint types would draw a toolbar
 * over nothing, which is the exact shape R50 exists to refuse.
 *
 * `title` COMES WITH IT rather than being derived, because the embedded
 * heading's own words ("Choices" / "Ticket types, Sprint types and more") are
 * true of the whole vocabulary and false of any slice of it.
 *
 * `description` WAS BESIDE IT AND IS GONE — client, 2026-09-11, over a
 * screenshot of this very screen: *"ticket types should be on top of the
 * searchbar inside the container without subtitle, make this. always"*, her
 * second saying of it (2026-09-10: *"in ticket settings (or any other module)
 * no subtilte"*). Between the two she said the opposite once — *"The section
 * description: no, I want to keep it."* — and that line is OVERRULED rather
 * than overlooked: two clearer statements either side of it, the later one
 * drawn on a screenshot of the screen. `shared/web/settings-section.tsx` holds
 * the full account and the same deletion.
 *
 * THE FIELD WENT WITH THE SENTENCE, which is the half that matters: a section
 * with nowhere to put a subtitle cannot grow one back, and `MODULE_SETTINGS`
 * lost its `description` column in the same change. This is the shape
 * `standalone` left by. */
export interface SelectableScope {
  /** The `selectable_data.type` groups this mounting shows. */
  types: string[]
  title: string
  /** MAY A NEW VALUE BE ADDED TO THIS SLICE — a fact about the vocabulary, not
   * about the reader (the reader's own `selectable_data:create` right is asked
   * separately and both must agree).
   *
   * It exists because `shared/selectable-homes.ts` already draws the line this
   * needs: a group whose home is `"labels"` does not STORE its words anywhere —
   * the code owns the states and these rows supply only the display word and
   * the mark beside it. A ticket runs through the six statuses
   * `HELP_STATUSES` declares and the server validates against that list, so a
   * seventh "Ticket status" row would be a word for a stage that does not
   * exist: creatable, saveable, and backing nothing. Renaming the five is the
   * whole of what this section is for.
   *
   * It WAS ALSO how the Tickets settings page kept one brand fill: the kit
   * rules one mango per view and `AddButton` is a mango, and two vocabulary
   * sections stacked on one page would have drawn two — the second, Ticket
   * statuses, drew none because it had nothing to create. THAT SECTION IS GONE
   * (client, 2026-09-10: *"remove ticket status, this cannot be adjusted from
   * the app"*), so the page has one section and one mango for a simpler reason
   * than the one this paragraph used to give. The flag stays, unchanged and
   * still declared per section, because the argument above it — a `"labels"`
   * group cannot honestly grow a row — is a fact about the vocabulary rather
   * than a fact about that one page, and it is what the next `"labels"` group
   * offered a settings section will need. Settings › Team answers the
   * one-mango question the other way, by demoting the second button
   * (`RolesMatrix`'s quiet "New role"), and the client ruled on that exception
   * herself — "No exceptions to the rules. It was my mistake." */
  create: boolean
  /** THE COLOUR EACH WORD IS KNOWN BY — present only where this group HAS a
   * palette, and the whole of what turns the section from a list into a wall of
   * chips (`ChipWall` above).
   *
   * Client, 2026-09-10: *"on ticket type, show it like chips with their color,
   * not a list."* A FUNCTION rather than a column because a value's colour is
   * not stored — `selectable_data` has four meaningful columns and none is a
   * colour, and `web/lib/type-colours.ts` is the one place a ticket type's is
   * decided. Handing the resolver down keeps that true: this editor draws
   * whatever colour it is given and knows nothing about ticket types, so the
   * second group that gains a palette hands its own rather than teaching this
   * file a second map. */
  colour?: (value: string) => string
}

export function SelectableScreen({
  teamId,
  onImport,
  scope,
}: {
  teamId: string
  /** Host-provided soft-nav to the import wizard, pre-targeted to dropdown
   * values AND to this section's own groups. The host owns the URL shape; this
   * screen knows there is an importer and not where it lives. */
  onImport?: () => void
  /** WHICH GROUPS THIS MOUNTING IS ABOUT — see `SelectableScope` above.
   * REQUIRED since 11 Sep 2026: every mounting is one section of one module's
   * settings page, because the whole-vocabulary screen is gone (this file's
   * header carries the ruling and what it cost). */
  scope: SelectableScope
}) {
  const t = useT()
  const { can } = usePermissions(teamId)
  const valuesQ = useCached<SelectableValue[]>(`selectable:${teamId}`, () =>
    tenancy.selectable().then((r) => r.values)
  )

  // THE READER'S RIGHT **AND** THE SLICE'S OWN ANSWER — see `SelectableScope.create`.
  // Both have to say yes: a right the caller does not hold, and a vocabulary
  // with nothing to add, are two different reasons for the same absent button
  // and neither one may be inferred from the other.
  const canCreate = can("selectable_data", "create") && scope.create
  const canEdit = can("selectable_data", "edit")
  const canDelete = can("selectable_data", "delete")

  // Add via the shared form dialog (Law R4); the screen just toggles it open.
  const [addOpen, setAddOpen] = React.useState(false)
  // Inline rename state (one row at a time).
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
  // The emoji, editable at last. The door has parsed and written it since the
  // day it shipped and this screen never sent one, so a value's emoji could be
  // chosen when it was created and never changed again.
  const [editMark, setEditMark] = React.useState("")
  // Collection filter chrome — the SAME shape the other collections (roles,
  // learning, help) use: a text search + a status filter defaulting to Active, so
  // deactivated values hide until you ask for them (then show greyed with Activate).
  // Remembered with the screen — see web/lib/nav-memory.ts.
  const [query, setQuery] = useRemembered("search", "")
  const [status, setStatus] = React.useState<"active" | "inactive" | "all">("active")
  // Sort — "Value" (default, A→Z inside each group) or "Group" (reorders the
  // group headings themselves). Not remembered with the screen: it is a view
  // preference over a short list a person re-derives in one glance, the same
  // weight `status` above already gets.
  const [sort, setSort] = React.useState<{ by: string; dir: "asc" | "desc" }>({
    by: "value",
    dir: "asc",
  })
  // Deactivating a value is the red half — one confirm dialog
  // (shared/web/use-confirm.tsx); reactivating stays confirm-free.
  const { ask: askDeactivate, run: runActive, dialog: deactivateDialog } = useConfirm()

  // THE COLLECTION THIS MOUNTING IS ABOUT — the team's whole vocabulary, or one
  // module's share of it (`scope`, above). Everything below reads THIS and not
  // the raw response: the rows, the count, the group datalist, and R50's own
  // "is it empty" question. One narrowing at the top rather than a `scope &&`
  // at each of the four, because the four have to agree — a toolbar drawn over
  // an empty scope because `empty` was asked of the unscoped set is precisely
  // the drift R50's own header describes.
  //
  // A door read, not a door filter: `tenancy.selectable()` returns the whole
  // vocabulary in one bounded response and both mountings share the one
  // `selectable:<teamId>` cache key (R56 — a component asks a door once). A
  // per-scope key would fetch the same rows a second time and then hold two
  // copies that a rename on either screen could leave disagreeing.
  const values = (valuesQ.data ?? []).filter((v) => scope.types.includes(v.type))
  // WHAT THE CREATE DIALOG OFFERS AS A GROUP. Unscoped, that is every type the
  // team already has (not just the filtered ones), so you can always add to any
  // existing group. Scoped, it is the page's OWN declared types rather than the
  // ones that happen to have a row today — a module settings page that has
  // never had a single "Ticket status" would otherwise offer no way to make the
  // first one, which is the one moment the offer matters most.
  const types = [...scope.types].sort()
  // The list is the filtered set, grouped by type.
  const q = query.trim().toLowerCase()
  const filtered = values.filter(
    (v) =>
      (status === "all" || (status === "active" ? v.active : !v.active)) &&
      (q === "" || v.value.toLowerCase().includes(q) || v.type.toLowerCase().includes(q))
  )
  // "Value" sorts what's INSIDE each group; "Group" sorts the group headings
  // themselves and leaves each one's own order alone — two different
  // questions, never mixed into one comparator.
  const dirMul = sort.dir === "desc" ? -1 : 1
  const sortedFiltered =
    sort.by === "value"
      ? [...filtered].sort((a, b) => a.value.localeCompare(b.value) * dirMul)
      : filtered
  const grouped = Array.from(new Set(sortedFiltered.map((v) => v.type)))
    .sort((a, b) => a.localeCompare(b) * (sort.by === "group" ? dirMul : 1))
    .map((t) => ({ type: t, items: sortedFiltered.filter((v) => v.type === t) }))

  // Create — the dialog calls this; it throws on failure so the dialog surfaces the
  // reason and stays open, and closes itself on success.
  async function addValue(type: string, value: string, mark: string) {
    const { values: next } = await tenancy.createSelectable(type, value, mark || undefined)
    primeCache(`selectable:${teamId}`, next)
    toast.success(`Added "${value}".`)
  }

  async function saveRename(id: string) {
    if (!editValue.trim() || savingId) return
    // THE ROW SAYS IT IS SAVING. A rename crosses the gateway, the worker, six
    // reads and writes over the D1 REST door and a realtime ping before the list
    // comes back, and the checkmark used to sit there looking unpressed for all
    // of it — so the first thing a person did was press it again. The wait got
    // shorter this round; this is the half that makes it FEEL shorter, and the
    // half that stops the second click.
    setSavingId(id)
    try {
      const { values: next } = await tenancy.updateSelectable(id, editValue, editMark)
      primeCache(`selectable:${teamId}`, next)
      setEditingId(null)
      toast.success(t("Renamed."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't rename that value."))
    } finally {
      setSavingId(null)
    }
  }

  /** Protect a value, or take the protection off. The protection is what stops
   * `setActive` retiring a word the team's records already lean on. The door
   * field is still `isDefault` — the word a person reads moved on 2026-09-10,
   * the identifier did not (`shared/glossary.ts` says why). */
  async function setDefault(v: SelectableValue, next: boolean) {
    try {
      const { values: rows } = await tenancy.setSelectableDefault(v.id, next)
      primeCache(`selectable:${teamId}`, rows)
      toast.success(next ? t("Protected.") : t("No longer protected."))
    } catch (err) {
      toast.error(err instanceof ApiFailure ? err.message : t("Couldn't change that."))
    }
  }

  // Deactivate / reactivate one value. A deactivated value is switched off, not deleted:
  // it stays visible here (greyed, with an Activate button) so it's never a dead end,
  // and drops out of the form pickers. Same key the pickers read, so both refresh.
  // Deactivating is the red half, so it asks first; reactivating does not.
  function setActive(v: SelectableValue, next: boolean) {
    if (!next) {
      askDeactivate({
        title: t('Deactivate "{value}"?', { value: v.value }),
        body: t("It drops out of the pickers everywhere it's offered. Anything already using it keeps it, and you can turn it back on any time."),
        action: t("Deactivate"),
        run: () =>
          runActive(
            () => tenancy.setSelectableActive(v.id, false).then(({ values: list }) => primeCache(`selectable:${teamId}`, list)),
            t('Deactivated "{value}".', { value: v.value }),
            t("Couldn't update that value.")
          ),
      })
      return
    }
    void runActive(
      () => tenancy.setSelectableActive(v.id, true).then(({ values: list }) => primeCache(`selectable:${teamId}`, list)),
      t('Activated "{value}".', { value: v.value }),
      t("Couldn't update that value.")
    )
  }

  if (valuesQ.error)
    return (
      <ShapeStateBody
        shape="collectionScreen"
        state="error"
        copy={{ errorTitle: t("Couldn't load dropdown values.") }}
        action={
          <Button variant="secondary" onClick={() => valuesQ.refresh()}>
            {t("Try again")}
          </Button>
        }
      />
    )
  // WAS A WHOLE-SCREEN EARLY RETURN (2026-09-03 audit — "nine screens blank
  // their entire toolbar while loading"): unmounted the card, the toolbar
  // (search/status/sort/New value) along with the rows. `values` above
  // already defaults to `[]` for the same reason every sibling screen's does
  // — the fix is to keep the chrome drawn and swap only the ROWS region.
  const valuesLoading = valuesQ.data === undefined

  // Bundled once so `GroupValues`/`ValueRow` take one prop instead of
  // fourteen — every group reads the SAME state and handlers, never its own.
  const rowCtx: RowContext = {
    teamId, canEdit, canDelete, editingId, editValue, editMark, savingId,
    setEditingId, setEditValue, setEditMark, saveRename, setDefault, setActive,
    colour: scope.colour, t,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* THE TITLE USED TO STAND HERE, on the bare page ground, with its
          description under it and the card below that — the exact three lines
          the client drew on. It is now `<ToolbarRow title>`'s, one element
          down: inside the container, on top of the search box, pinned with the
          toolbar it titles. The words are unchanged and still `scope.title`'s;
          what moved is who PLACES them, and that is the whole point — a
          heading a call site positions is a heading a call site can position on
          the white, which is what happened here through four rulings.

          NO `CollectionHeading` AND NO COUNT (R16 ii). This used to branch on
          `standalone`, because the whole-vocabulary SCREEN named and counted
          itself through the registry; a section inside a page is never the
          page, and the page above already carries the title. */}

      {canCreate && (
        <SelectableFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          types={types}
          onSubmit={addValue}
          draftKey={`selectable-add:${teamId}`}
        />
      )}

      {/* THE CANONICAL SHAPE — title, then ONE card holding the toolbar (search
          + status filter, LEFT) and the rows, with New/Import/Export at the
          FAR RIGHT of that SAME toolbar row (client ruling, 2026-08-31: an
          action button never gets a row of its own, separate from the
          search/filter it belongs beside). This screen has no tab strip
          (single-view, like Roles and Processes), so the toolbar is the first
          thing inside the card — drawn through `<ToolbarRow>` (screen-bits.tsx)
          rather than the two hand-rolled rows this used to be, one of them
          floating ABOVE the card with the actions and one below it with the
          search — so the button cannot drift back onto its own row. */}
      <CollectionCard>
          <ToolbarRow
            // THE SECTION'S OWN NAME, INSIDE THE CONTAINER, ON TOP OF THE
            // SEARCH BOX — client, 2026-09-11, this screen, verbatim: "ticket
            // types should be on top of the searchbar inside the container
            // without subtitle, make this. always". A STRING, so there is no
            // position here for this call site to get wrong; the row draws it
            // inside the pinned band (screen-bits.tsx's `title`).
            //
            // AND IT OUTLIVES `empty` BELOW. R50 takes the row away on an empty
            // collection and the title stays — `CollectionEmptyState`'s "No
            // values yet." is the register, not the section's name.
            title={scope.title}
            // R50 — never toolbar on an empty collection. This row USED TO
            // draw regardless of `values.length` whenever `canCreate` was
            // true — a lone "New value" (plus Import CSV, for an import-
            // target screen) pill above "No values yet. Add your first
            // above" pointing at a button that had just been removed from
            // above it. `CollectionEmptyState` below now carries "Add the
            // first" alone.
            // `!valuesLoading &&` — `values` defaults to `[]` before the read
            // resolves (2026-09-03 audit), which reads exactly like a
            // genuinely empty collection unless the loading state is folded
            // into the same expression.
            empty={!valuesLoading && values.length === 0}
            search={
              (valuesLoading || values.length > 0) && (
                <>
                  <SearchInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClear={() => setQuery("")}
                    placeholder={t("Search values…")}
                    className="flex-1"
                    aria-label={t("Search dropdown values")}
                  />
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="h-9 w-full sm:w-40" aria-label={t("Filter by status")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("Active")}</SelectItem>
                      <SelectItem value="inactive">{t("Inactive")}</SelectItem>
                      <SelectItem value="all">{t("All")}</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )
            }
            // OUT OF `search` AND INTO ITS OWN SLOT (R53, 2026-09-06) — see
            // screen-bits.tsx's `ToolbarSortSlot`. This screen was one of the
            // eight that handed a `<SortControl>` to `search`, so it drew
            // inside the row's growing box while Apps and Deliverables drew
            // theirs in the sort box beside `actions` — the same control, two
            // places, on two screens of the same kind.
            sort={
              (valuesLoading || values.length > 0) && {
                options: VALUE_SORTS.map((o) => ({ ...o, label: t(o.label) })),
                value: sort.by,
                onValueChange: (by: string) => setSort({ by, dir: "asc" }),
                direction: sort.dir,
                onDirectionChange: (dir: "asc" | "desc") => setSort((s) => ({ ...s, dir })),
              }
            }
            actions={
              <>
                {/* ── THE CSV DOORS, NARROWED — 11 SEP 2026 ────────────────
                    THIS BLOCK USED TO WITHHOLD EXPORT FROM A SCOPED MOUNTING,
                    and the reason it gave was true when it was written: the
                    doors acted on the WHOLE vocabulary, so "hanging either off
                    a page titled 'Ticket settings' would be a button that
                    quietly does more than the page it sits on says it can."
                    THAT REASON IS OBSOLETE, and it is recorded here rather than
                    deleted because the argument is what makes the new shape
                    right. The client ruled the whole-vocabulary screen away and
                    said where its two doors went: *"each module's settings page
                    gets its own import and export for its own groups… nothing
                    sits outside Settings."*

                    SO THE DOORS THEMSELVES NARROWED, rather than this component
                    filtering what they hand back. `?groups=` on the export door
                    reads only these groups out of the database, and the import
                    door refuses a row in any other group — so the button no
                    longer does more than the page says, because the DOOR no
                    longer does. A filter applied here would have been the same
                    button with a promise this file was keeping on its own.

                    UNSCOPED IS UNCHANGED and is still the whole vocabulary:
                    that is what the agent's capability brief, MCP's
                    `export_dropdown_values_csv` and any saved link already ask
                    for. */}
                {/* ── THE TWO WORDS FOLD WHEN THE ROW IS TIGHT — 11 SEP 2026,
                    measured. These two buttons are what took the search box on
                    this very screen from 203px at 1280 to 23px at 1100, with
                    "Search values…" clipped to "Sea". B4 still stands wherever
                    the word fits; `ToolbarAction` (screen-bits.tsx) is where
                    the fold and the accessible name are decided, once, for
                    every toolbar action in the app rather than for this one
                    screen. Both buttons keep their glyph, their word and their
                    gate exactly as they were. */}
                {values.length > 0 && (
                  <ToolbarAction
                    label={t("Export CSV")}
                    icon={<Download className="size-4" aria-hidden />}
                    // THROUGH THE SEAM, like every other bound URL in the app
                    // (`safeHref`, shared/web/rich-text.ts). The groups come
                    // from `MODULE_SETTINGS`, a code constant, so nothing a
                    // person typed is in this string — and that is exactly the
                    // argument every unchecked href has ever been defended
                    // with, which is why the census reads the EXPRESSION and
                    // not the argument. `ToolbarAction` asks the seam AGAIN at
                    // the one place the attribute actually exists; two calls of
                    // an idempotent check is not a cost, and the census cannot
                    // tell a prop named `href` from an attribute.
                    href={safeHref(tenancy.selectableExportHref(scope.types)) ?? ""}
                  />
                )}
                {canCreate && onImport && (
                  <ToolbarAction
                    label={t("Import CSV")}
                    icon={<UploadSimple className="size-4" aria-hidden />}
                    onClick={onImport}
                  />
                )}
                {canCreate && <AddButton label={t("New value")} onClick={() => setAddOpen(true)} />}
              </>
            }
          />

        {valuesLoading ? (
          // ROWS ONLY — the toolbar above is already real.
          <Skeleton variant="list" lines={5} />
        ) : grouped.length === 0 ? (
          /* R62 — ONE REGISTER, BOTH ZEROS. Client, 2026-09-09: "the empty
             because of filters hosul look the same as empty collection but the
             add button." At rest the toolbar above is gone (R50), so this is
             the only "New value" (and "Import CSV") left on screen; narrowed,
             the toolbar stays up and BOTH acts are withdrawn here by the
             component, so the reader is pointed back at the search that
             emptied the list rather than invited to add a duplicate of a value
             a filter is hiding. */
          <CollectionEmptyState
            filtered={values.length > 0}
            title={t("No values yet.")}
            onCreate={canCreate ? () => setAddOpen(true) : undefined}
            onImport={canCreate && onImport ? onImport : undefined}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((g) => (
              <div key={g.type} className="flex flex-col gap-2">
                {/* A GROUP LABEL ONLY WHERE THERE IS MORE THAN ONE GROUP.
                    Ticket settings drew "Ticket types" as the section's title
                    and then, two lines down, "Ticket type" as this label —
                    twice for one thing, the second time because a section CAN
                    hold several groups, not because this one does. On Accounts
                    (Industries and countries) and Apps (Stages and deliverable
                    kinds) the labels sort a real mixture and earn their place;
                    on the other five they are the title said again in a smaller
                    face.

                    SELF-EXEMPTING, off its own data, which is the shape the kit
                    already uses one control along: `ViewSwitch`
                    (shared/ui/components/collection-frame/view-switch.tsx)
                    decides from `views.length` whether it is a switch, a static
                    label or nothing at all, rather than taking a prop for it —
                    "an absent third zone is not a toolbar variation; it is an
                    absence of data". `grouped` is this section's own answer to
                    the same question, and a `showGroupLabels` prop would put it
                    back at the six call sites that must not each decide.

                    `grouped` AND NOT `scope.types`: the count that matters is
                    how many groups are ON SCREEN. A section scoped to two
                    groups whose second one has no values yet is showing one
                    list, and a label over it names nothing the reader can see
                    a second of. It reappears the moment the second group does. */}
                {grouped.length > 1 && <h2 className="text-sm font-medium">{g.type}</h2>}
                {/* A WALL OR A LADDER, decided by whether this mounting's group
                    has a palette (`SelectableScope.colour`) and by nothing
                    else. Client, 2026-09-10, on Ticket types: *"show it like
                    chips with their color, not a list."* Every other group
                    keeps the row it has always had — a Country and a Department
                    have no colour to carry and a wall of grey lozenges would be
                    a list wearing a costume. */}
                {rowCtx.colour ? (
                  <ChipWall items={g.items} ctx={rowCtx} />
                ) : (
                  <GroupValues items={g.items} ctx={rowCtx} />
                )}
              </div>
            ))}
          </div>
        )}
      </CollectionCard>

      {deactivateDialog}
    </div>
  )
}
