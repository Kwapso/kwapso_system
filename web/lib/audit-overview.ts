// The ONE consistent audit block every record's Overview tab shows, so "metadata"
// reads the same everywhere (RULES/feedback 2026-06-30).
//
// IT TAKES THE CALLER'S `t`, because five labels and two relative times are
// seven sentences a person reads and this is a plain function with no hook in
// scope. The labels were extracted into the catalogue (they are `label:`
// properties) and then rendered from the raw English anyway — translated, and
// never asked for.
import { formatRelative, type Translate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import type { Language } from "@shared/i18n"

export type AuditMeta = {
  createdByName?: string | null
  createdAt?: string | null
  editedByName?: string | null
  updatedAt?: string | null
  status: string
}

/** One label/value pair, keyed by a stable NAME rather than by its position in
 * any array a caller might build from `auditFields`/`auditItems` below. */
export type AuditField = { label: string; value: string }

/** The five audit facts as fields, keyed by NAME — `createdBy` / `created` /
 * `editedBy` / `edited` / `status` — never by array position. THIS IS THE ONE
 * TO CALL WHEN A CALLER WANTS SOME BUT NOT ALL FIVE: a caller picks
 * `auditFields(...).status`, and TypeScript refuses a typo the way an array
 * index never can, because the property genuinely does not exist rather than
 * silently returning `undefined` or, worse, a neighbouring field.
 *
 * Found 22 Sep 2026, over `web/components/knowledge/knowledge-detail.tsx`'s
 * own Overview tab: the caller that first needed "Status only, not the other
 * four" reached for `auditItems(...)[4]`, a POSITIONAL read of a function
 * whose own doc comment happens to promise a fixed order today. That is the
 * same class of mistake this repo already has a law against for an exemption
 * table, keyed by expression rather than by line, for exactly the same
 * reason — the guarantee lives in a comment a future edit has no reason to
 * re-read, and the array can silently hand back a DIFFERENT fact once
 * anybody inserts a row above `status` or makes one conditional, with every
 * check still green. `web/test/audit-fields-by-name.test.ts` is the census
 * that now refuses a positional read of either function's own return value.
 *
 * `t` is a PARAMETER because this is a plain function and `useT` is a hook: the
 * component that renders the list has the reader's language and hands it in —
 * the same shape `translateRecipe` and `createAppFrom` use. The five labels stay
 * English at the call to `t` because English is the catalogue's key
 * (shared/i18n.ts).
 *
 * The VALUES are not translated and must not be: four of them are a person's
 * name or a timestamp, and the fifth is a status word the caller has already put
 * through its own vocabulary.
 *
 * The two NAMES are shortened to a first name on the way through (R54). This is
 * the record-chrome footer's twin — the same two facts, drawn into an Overview
 * DescriptionList instead of the ink footer — and its one caller is the
 * knowledge item, which the portal cannot create, so both people here are ours.
 * There is no client-population prop for that reason; add one the day something
 * a contact can author is drawn through this. */
export function auditFields(
  a: AuditMeta,
  t: Translate,
  lang: Language
): { createdBy: AuditField; created: AuditField; editedBy: AuditField; edited: AuditField; status: AuditField } {
  return {
    createdBy: { label: t("Created by"), value: staffNameFromSnapshot(a.createdByName) || "" },
    created: { label: t("Created"), value: a.createdAt ? formatRelative(a.createdAt, t, lang) : "" },
    editedBy: { label: t("Last edited by"), value: staffNameFromSnapshot(a.editedByName) || "" },
    edited: { label: t("Last edited"), value: a.updatedAt ? formatRelative(a.updatedAt, t, lang) : "" },
    status: { label: t("Status"), value: a.status },
  }
}

/** The five audit rows, in a fixed order, for a caller that genuinely wants
 * every fact as one DescriptionList (none does today — see `auditFields`'s own
 * doc comment for the caller that used to reach for this by position instead).
 * Built FROM `auditFields`, never a second, independently-ordered literal, so
 * the two can never disagree about a label or a value. */
export function auditItems(a: AuditMeta, t: Translate, lang: Language): AuditField[] {
  const f = auditFields(a, t, lang)
  return [f.createdBy, f.created, f.editedBy, f.edited, f.status]
}
