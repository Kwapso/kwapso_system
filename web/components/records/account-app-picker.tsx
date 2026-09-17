"use client"

// THE APP FIELD, ACCOUNT-AWARE — client ruling, 16 Sep 2026, verbatim: "when
// selecting app in cases account has been selected first, show horizontal
// choice component."
//
// ANYWHERE A FORM ASKS FOR BOTH AN ACCOUNT AND AN APP (tasks' department-driven
// split is the one shape this does not cover — see below), the two fields are
// not independent: an app belongs to one account (or to none, the agency's own
// systems), so once the account is answered the app question has a short,
// countable answer rather than an open search. `RecordPicker`'s own `layout="row"`
// is the pill-row idiom every other closed vocabulary in this app already draws
// through (the ticket form's App/Type rows, the story form's Type row, the staff
// row's own bare-button pills) — this is that same primitive, not a new control,
// wired to the one behaviour her ruling asks for: NO ACCOUNT YET keeps whatever
// picker the form already drew (the `control` layout, untouched below), and an
// ACCOUNT CHOSEN swaps it for the row, narrowed to that account's own apps.
//
// NO HINT WHEN THE ROW HAS NOTHING (R81, her 16 Sep 2026 "no hints" ruling,
// read together with this same day's other one). `RecordPicker`'s own row
// layout answers an empty list with a locked shell carrying a sentence
// ("No apps yet.") — the right shape for a vocabulary a team ran empty, and
// exactly the shape her OTHER ruling today refuses for this one: "the row shows
// nothing to pick." So this component does not hand the row an empty
// `options` array and let it speak; it returns nothing at all.
//
// ONE FILE FOR THREE CALL SITES (`meeting-form-dialog.tsx`,
// `sprint-form-dialog.tsx`, `wave-form-dialog.tsx` — `web/lib/members.ts`'s own
// argument: "a rule copied nine times is a rule that holds eight times"), so a
// fourth form that gains both fields inherits the behaviour rather than
// reinventing it. `task-form-dialog.tsx`'s account/app split is deliberately
// NOT one of the three: its department picker asks for exactly one of them,
// never both at once, so there is no "account chosen, now narrow the app" state
// for this component to answer — ruling 2 is about a form where both fields are
// live together, which that form's asked-one-of-two shape never is. The ticket
// form (`help-form-dialog.tsx`) already draws this exact row (2026-09-07,
// unified with the Module gate's own shell on 2026-09-09) and is left as it is
// rather than rewired onto this component: its own empty state carries a
// sentence ("Choose an account first."/"No apps yet.") inside the same locked
// shell the Module row wears, which is HER ruling for that pair specifically —
// touching it would trade one of her rulings for another.

import { RecordPicker } from "@/components/records/record-picker"
import type { PickableRecord } from "@/lib/pickable"
import type { Language } from "@shared/i18n"
import { sortedOptions } from "@shared/web/sorted-options"

/** An app a picker can offer, tagged with whose system it is — `null` for the
 * agency's own. Optional so a caller whose app field is FIXED (the picker never
 * shows at all) can still satisfy the type without threading the fact through. */
export type AccountScopedApp = PickableRecord & { accountId?: string | null }

const appOption = (a: AccountScopedApp) => ({
  value: a.id,
  label: a.name,
  picture: a.logoUrl,
  // THE APP'S OWN LOGO AS THE MARK, `face: true` so a system with none on file
  // still draws its own initial rather than a blank row — the same flag every
  // other App field in this app already sets (`story-form-dialog.tsx`,
  // `help-form-dialog.tsx`).
  face: true,
})

export function AccountAppPicker({
  id,
  ariaLabel,
  accountId,
  apps,
  value,
  onChange,
  lang,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyOption,
  emptyText,
  noneLabel,
}: {
  id?: string
  /** Named on the ROW, where a `<label for>` cannot bind to a `role="group"`
   * div — the same wall `RecordPicker`'s own row layout and `StaffPillPicker`
   * both work around the same way. Unused in the `control` branch, which keeps
   * the `id` a `Field`'s label already points at. */
  ariaLabel?: string
  /** The one account this form knows about right now — chosen, fixed, or (an
   * edit) settled. `null`/`""` means "not answered yet", which is the ONLY
   * state that keeps the form's own existing picker. */
  accountId: string | null
  apps: AccountScopedApp[]
  value: string
  onChange: (value: string) => void
  lang: Language
  disabled?: boolean
  /** The three strings the CONTROL layout needs — exactly what this form's App
   * field already passed before this component existed. */
  placeholder: string
  searchPlaceholder: string
  emptyOption: { value: string; label: string }
  emptyText: string
  /** ROW MODE ONLY — an explicit "leave it off" pill, drawn AFTER the
   * account's own apps and committing `""` on the click. Undefined (every
   * caller before the Inputs form) keeps the row exactly as it always drew:
   * `layout="row"` carries no clear-X and no `emptyOption` by design
   * (record-picker.tsx's own header), which is right for a field that opens
   * on a blank draft and is never revisited mid-form — but the client's 17
   * Sep 2026 ruling on the Inputs form asks for a visible "None" state on a
   * row that also has real chips to choose from, so this is the opt-in
   * rather than a change to every existing row. */
  noneLabel?: string
}) {
  if (!accountId) {
    // NO ACCOUNT YET — her ruling's own words: "with no account chosen the
    // current app picker stays." Untouched: the same control-layout
    // `RecordPicker` this field already drew, offered the whole list.
    return (
      <RecordPicker
        id={id}
        value={value || emptyOption.value}
        // The control layout's own "leave it off" row commits its sentinel
        // value, same as every other optional RecordPicker in this app —
        // translated back to "" here so the caller's `onChange` never has to
        // know the sentinel exists.
        onChange={(v) => onChange(v === emptyOption.value ? "" : v)}
        options={sortedOptions(apps, lang, (a) => a.name).map(appOption)}
        emptyOption={emptyOption}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={disabled}
      />
    )
  }

  const narrowed = apps.filter((a) => (a.accountId ?? null) === accountId)
  // NOTHING TO PICK, NOTHING SAID (R81) — see this file's header. A row handed
  // an empty `options` array draws a locked "No apps yet." shell; her ruling
  // today asks for silence instead, so this returns before `RecordPicker` ever
  // gets the chance to say anything. A caller that opted into `noneLabel` still
  // has ONE thing to pick even when the account has no apps of its own — "None"
  // — so the silent-return only fires for a caller that did not ask for it.
  if (narrowed.length === 0 && !noneLabel) return null

  const rowOptions = [
    ...sortedOptions(narrowed, lang, (a) => a.name).map(appOption),
    // ALWAYS LAST, AND ALWAYS "" — the row calls `onChange` with the raw pill
    // value it was clicked with (no NONE-sentinel translation, unlike the
    // control branch above), so "" here is also exactly the blank a form's
    // optional draft field already starts on. Never sorted in among the real
    // apps: it is a way OUT of the list, not a member of it.
    ...(noneLabel ? [{ value: "", label: noneLabel }] : []),
  ]

  return (
    <RecordPicker
      id={id}
      layout="row"
      ariaLabel={ariaLabel}
      value={value}
      onChange={onChange}
      options={rowOptions}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      disabled={disabled}
    />
  )
}
