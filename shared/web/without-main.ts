// THE MAIN PERSON IS NOT ALSO A SECONDARY ONE — R92 (RULES.md,
// shared/rules/registry.ts). Aurora, verbatim, 20 Sep 2026: "Generally,
// always when selecting main/secondary people (staff, contacts, etc.): when
// I select the main, this person should not be available as secondary. E.g.
// when I select 'Raised by,' this person should disappear from the 'Keep in
// the loop' options. Make this law."
//
// ONE SEAM, the same shape `sorted-options.ts` (R75) and `chip-order.ts`
// (R94) already take for a rule that is really about the DATA a picker is
// handed rather than about any one screen: a caller narrows its secondary
// picker's options through this function instead of re-deriving the
// exclusion by hand at every call site, so "did I remember the `!==`" is
// never a question a reviewer has to ask.
//
// A FALSE `mainId` (empty string, `null`, `undefined` — nobody chosen yet as
// the main) EXCLUDES NOTHING: `options` comes back unchanged. Excluding on an
// empty string would silently drop any option whose own id happens to BE the
// empty string, which is not what "nobody is main yet" means.
//
// WHAT THIS DOES NOT COVER, and why that is a different law rather than a
// gap in this one. Some main/secondary pairs are not disjoint by design — an
// app's "Main stakeholder" is chosen FROM its "Stakeholders" list, on
// purpose, so the main is always a MEMBER of the secondary set rather than
// excluded from it (`app-form-dialog.tsx`'s own `mainStakeholderContactId`).
// This function is for the OTHER shape, the one Aurora's own examples name —
// raised by / keep in the loop, assignee / reviewer, account manager /
// members, owner / stakeholders — two INDEPENDENT pickers over one shared
// pool, where picking one person as the main is a reason to stop offering
// them as a secondary at all.
export function withoutMain<T extends { id: string }>(options: readonly T[], mainId: string | null | undefined): T[] {
  if (!mainId) return [...options]
  return options.filter((option) => option.id !== mainId)
}
