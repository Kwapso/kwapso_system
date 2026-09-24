// THE DROPDOWN GROUPS THE CODE ITSELF NAMES.
//
// Most groups in `selectable_data` are a team's own business — they type them on
// the Dropdown values screen and nothing in the code knows they exist. These four
// are different: a worker pick-or-creates into them (the way a meeting purpose's
// department is pick-or-created into "Department"), or the legacy migration lands
// a set of rows in them. So the string has to be said in ONE place, or the
// screen that offers a value and the door that writes one drift into two groups
// with the same meaning and different names — which is the exact failure the
// module exists to prevent, committed by the module itself.
//
// A group is not a row: the table holds (type, value) pairs, so a group EXISTS
// once it has a value. That is why the two migrated ones ship with a starting
// vocabulary (DEFAULT_SELECTABLE in workers/tenancy/src/team-schema.ts) and the
// two module vocabularies do not — those fill themselves from the first value
// anybody writes, or from the rows the legacy import brings.

export const SELECTABLE_GROUPS = {
  /** A meeting purpose's department — the legacy `departments` table, eight rows,
   * a vocabulary for the same reason. */
  department: "Department",
  /** A brand asset's category — logos, decks, templates, photography. */
  brandCategory: "Brand asset category",
  /** WHERE AN ACCOUNT IS. The first of the two ungrouped legacy sets: ten country
   * labels that carried no group at all. The alternative was a field on the
   * account; the owner ruled for a group, because a country typed free into an
   * address is a country spelled five ways by five people. */
  country: "Country",
  /** WHAT AN ACCOUNT DOES. Aurora, 23 Sep 2026, verbatim: "make it a drop down,
   * adjustable on settings."
   *
   * IT WAS ALREADY HALF A GROUP AND THAT IS WHY IT DRIFTED. The form has picked
   * from an "Industry" group since it was built, `VOCABULARY_HOMES`
   * (shared/selectable-homes.ts) has named `accounts.industry` as its home, and
   * Settings › Accounts › "Industries and countries" has edited it — but the
   * WRITE DOOR took free text, the group was never seeded from what was already
   * stored, and the group's NAME was a literal typed at the call site rather
   * than read from here. So a value could reach the column without ever being a
   * dropdown row, which is how the live book came to hold "Insurance" and
   * "Insurance Broker" as two spellings of one trade. Team migration 0120 seeds
   * the group from the column, and `requireActiveSelectableValue`
   * (shared/workers/vocabulary.ts) is what closes the door behind it.
   *
   * THE SAME SENTENCE IS NOW TRUE OF `country` BELOW, and it was true of it for
   * longer: that group has been seeded since 0018 and its door was open the
   * whole time, which is how "Österreich" got in beside "Austria". Both are
   * closed in the same change, because they are the same field twice. */
  industry: "Industry",
  /** HOW BIG AN ACCOUNT IS. The second ungrouped set — five size bands.
   *
   * NOTHING READS THIS KEY, and nothing ever has: the owner ruled for a group
   * rather than a field and no column was ever added to `accounts` to hold the
   * answer, so no door pick-or-creates into it and no screen offers it. Its seed
   * rows were deleted on 11 Sep 2026 (`INTERNAL_VOCABULARY`,
   * workers/tenancy/src/team-schema/seed.ts), so a team born after that date has
   * no such group at all. The NAME stays here because teams that already exist
   * still have the group and `shared/selectable-homes.ts` still has to declare a
   * home for it — and because this file is the one place the string may be said,
   * which is the property that stops the eventual `accounts.company_size` column
   * inventing a second spelling of it. */
  companySize: "Company size",
  /** WHERE AN APP HAS GOT TO. It was a free-typed text field until 17 Aug 2026,
   * which is how one inventory carried "live", "Live" and "in dev" for the same
   * three apps. The eight names the agency already uses live in
   * `shared/app-stages.ts` beside the mark and the active/inactive answer each
   * one implies; the rows themselves are ordinary dropdown values, editable like
   * every other vocabulary. */
  appStage: "App stage",
  /** WHAT KIND OF THING WE HANDED OVER — the word in small caps on a
   * deliverable's card. A vocabulary rather than an enum for the same reason
   * every other word here is one: the owner's list ("handover materials /
   * handover docs / API documentation / loom or teller reviews / SOPs") ends in
   * "etc.", and an enum has no room for the etc. */
  deliverableKind: "Deliverable kind",
} as const

export type SelectableGroup = (typeof SELECTABLE_GROUPS)[keyof typeof SELECTABLE_GROUPS]

/** The starting vocabulary for `deliverableKind`, in the owner's own words.
 *
 * It lives beside the group name rather than loose in the schema because the
 * migration that ships it to EXISTING teams and the seed a NEWBORN team runs
 * both read it — and a starting set written twice is a set that ends up
 * different in a team made yesterday and a team made last month (the duplicate
 * dropdown values migration 0026 is what that costs). Editable like every other
 * vocabulary: a team adds its own on the Dropdown values screen. */
export const DELIVERABLE_KINDS = [
  "Handover doc",
  "API documentation",
  "Video",
  "SOP",
  "Other",
] as const
