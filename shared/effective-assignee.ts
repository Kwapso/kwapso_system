// EFFECTIVE ASSIGNEE, one resolver, read by every record that can say who is
// on it. Aurora's ruling, verbatim, 21 Sep 2026: "both on story detail and
// ticket detail we need to see to whom it's assigned, normally this gets
// inherited from the app." A record answers for itself when it carries its
// own assignee; when it does not, the question falls to the app it belongs
// to. Shipped for the ticket first (`help-stakeholders.tsx`); kept here,
// generic, so the story page can read the identical rule the day it is
// wired to it.
//
// THE APP'S OWN ANSWER IS ITS LEAD (`app_staff.is_lead`), never a second,
// disconnected `apps.assignee_id` column: the app already carries exactly
// one "who owns this system" fact (`AppRow.staff`, editable on
// `app-detail.tsx`'s own Lead field), and a second one beside it would be
// two answers that can disagree the first time the lead changes and the
// copy does not follow.
//
// PURE AND SYNCHRONOUS: both candidates arrive pre-resolved (id + name) so
// this file never touches a database or a members cache itself. The
// record's own pair is already a stored snapshot (`assigneeId`/
// `assigneeName`, the same audit-pair habit every person-reference in this
// codebase keeps); the app's pair is resolved by the CALLER, off the same
// team-members cache every other staff face on the page already reads
// (`useCached('members:'+teamId, …)`), before this function is ever called.

export type AssigneeRecord = {
  assigneeId: string | null
  assigneeName: string | null
}

export type AssigneeApp = {
  id: string
  name: string
  /** The app's lead, resolved by the caller, `AppRow.staff.find(isLead)`'s
   * own id, not a stored column. */
  assigneeId: string | null
  assigneeName: string | null
}

export type EffectiveAssignee = {
  id: string | null
  name: string | null
  /** true when the record carries no assignee of its own and this is the
   * app's own answer instead. */
  inherited: boolean
  /** the app's name, only when `inherited` is true, the caller's
   * "Inherited from <app>" line reads off this rather than re-threading the
   * app's name through a second prop. */
  appName: string | null
}

export function effectiveAssignee(record: AssigneeRecord, app: AssigneeApp | null): EffectiveAssignee {
  if (record.assigneeId) {
    return { id: record.assigneeId, name: record.assigneeName, inherited: false, appName: null }
  }
  if (app && app.assigneeId) {
    return { id: app.assigneeId, name: app.assigneeName, inherited: true, appName: app.name }
  }
  return { id: null, name: null, inherited: false, appName: null }
}
