// SWITCH A RECORD OFF, OR BACK ON — the doors that are one act.
//
// WHAT THIS REPLACED. The catalogue used to carry twenty-one tools whose whole
// difference was the noun in the path: `set_account_active`, `set_role_active`,
// `set_app_active`, `set_wave_active`, and so on down to
// `set_staff_certificate_active`. Every one of them took an id and a boolean,
// posted it to `<module>/active`, and rode the same idempotent predicate R17
// requires (the current-status test travels with the UPDATE, so a re-run moves
// zero rows, writes no activity and pings nobody). Twenty-one names for one
// operation, and about 2,500 tokens of schema re-sent to the model on every
// step of every turn, whether or not anybody was archiving anything.
//
// R17 is the argument for the collapse, not a coincidence beside it: a law that
// says these all share one shape is a law saying they are one operation.
//
// WHAT IS DELIBERATELY NOT HERE. `set_deliverable_visibility` is the twenty-
// second door of the same shape and it stays its own tool. Its boolean does not
// mean "is this record live" — it means "may the CLIENT see this" — and its
// confirm rule runs the other way (showing a client something asks; hiding it
// again does not). Folding it in would give one argument two meanings, so a
// model that had just learned `active:false` archives a record would use it to
// publish one. A saving of about a hundred tokens is not worth that sentence.
//
// ── HOW THE CONFIRM RULE SURVIVED THE COLLAPSE ───────────────────────────────
//
// The twenty-one did NOT all behave alike, and that is the part a tidy-up would
// have quietly lost. Three behaviours were in there: seven confirmed BOTH ways
// (an access write — deactivating a role removes access and reactivating hands
// it back), eleven confirmed only when switching OFF, and three never confirmed
// at all. So `confirm` is declared per entry, reproducing exactly what each door
// did before — and `alwaysConfirms` in tool-gates.ts may only UPGRADE that to
// "always", never downgrade it, by running the same `isPrivilegeWrite`
// derivation the individual tools rode. A toggle added tomorrow on a privilege
// module or a fence table therefore confirms the moment it exists, even if
// whoever added it wrote "off".
//
// `workers/mcp/test/record-toggles.test.ts` pins the whole matrix — every
// entry, both directions — against what the twenty-one tools answered, so the
// collapse is a refactor rather than a rewrite with a nice comment on it.

/** One door in the family. `path` and `binding` are LITERALS: the record name a
 * caller sends only ever selects an entry here, and can never contribute to a
 * URL. */
export type RecordToggle = {
  binding: "TENANCY" | "CONTENT"
  path: string
  /** The body field this door reads the record's id from. Two doors say
   * `roleId`; the rest say `id`. The tool exposes both (R22: a tool must offer
   * every field its door reads) and the builder sends the one that door wants. */
  idField: "id" | "roleId"
  /** This door ALSO needs the app the record hangs off (deliverables). */
  needsAppId?: boolean
  /** The permission the door asks for. Data here rather than in `TOOL_GATES`
   * because a single collapsed tool has no single gate — and because
   * `alwaysConfirms` reads it to decide whether this is an access write. */
  gate: string
  /** What the record is called in a sentence a person reads on the panel. */
  noun: string
  /** The verb for switching it ON, and for switching it OFF. */
  on: string
  off: string
  /** What this door did before the collapse: ask both ways, ask only when
   * switching off, or never ask. Never downgraded by the derivation. */
  confirm: "always" | "off" | "never"
  /** The sentence an outside developer reads. The MCP surface still publishes
   * these one tool at a time — `set_account_active`, `set_role_active` and the
   * rest, historical names and all — because a tool name there is an EXTERNAL
   * contract somebody has scripts against, and an MCP client fetches its
   * catalogue ONCE rather than re-sending it on every model step. The collapse
   * pays for itself on the surface that is billed by the token; on the one that
   * is not, it would only break things. Same map, two projections. */
  summary: string
  /** The rest of what an outside developer needs, held back from the manifest
   * the same way a SharedTool's `detail` is (MCP.md §3: a tools/list used to
   * carry 85,621 characters of prose before summaries were cut to one line).
   * `describe_tool` on `set_<record>_active` answers with this; a record with
   * nothing more to say than its summary already does leaves it out. */
  detail?: string
}

/** THE ALLOW-LIST OF TOGGLEABLE RECORDS. A record name that is not a key here
 * reaches no door at all — the same shape as the query grammar's module map, and
 * for the same reason: what a machine may name is a fixed set written in our own
 * source, never a string it composes. */
export const RECORD_TOGGLES: Record<string, RecordToggle> = {
  account: {
    binding: "TENANCY",
    path: "/api/tenancy/accounts/active",
    idField: "id",
    gate: "accounts:delete",
    noun: "account",
    on: "Restore",
    off: "Archive",
    confirm: "off",
    summary:
      "Archive an account (`active: false`) or restore it (`active: true`), never deleted; every record it carries survives.",
    detail:
      "Archiving an account is a shelving act, not a removal: its tickets, its stories and sprints, its contacts and every figure computed against it stay exactly where they are, and list_accounts and export_accounts_csv both take an archived filter so an archived one is still findable rather than gone. It only ASKS when switching off, because bringing one back changes nothing anybody has to be warned about. A restored account does not automatically restore anything nested under it that was separately archived — a contact link or a portal login taken down while the account itself was still active stays down until its own toggle is called.",
  },
  // FENCE WRITE (account_links) → both ways. Unlinking takes a company away from
  // a client login; RELINKING hands it straight back.
  contact_link: {
    binding: "TENANCY",
    path: "/api/tenancy/accounts/links/active",
    idField: "id",
    gate: "contacts:delete",
    noun: "contact link",
    on: "Relink",
    off: "Unlink",
    confirm: "always",
    summary:
      "Unlink a contact from an account (`active: false`) or link them back (`active: true`), by the CONTACT LINK's id, get_account returns it. The person's own account is untouched either way.",
    detail:
      "This is a FENCE write, which is why it confirms both ways: a contact link is what makes a person's own account (their individual record) reachable from the company account they work at, and unlinking narrows what a client-portal login built on that person can see just as surely as relinking widens it. The contact's own account record, and any portal login built on it, survive the unlink untouched — only the join between the two accounts moves. Relink hands back exactly the same visibility the original link carried, nothing is recomputed.",
  },
  // PRIVILEGE WRITE (portal_users) → both ways: revoking takes sight of a
  // customer's world away, restoring hands it back.
  portal_access: {
    binding: "TENANCY",
    path: "/api/tenancy/portal-users/active",
    idField: "id",
    gate: "portal_users:delete",
    noun: "portal login",
    on: "Restore",
    off: "Revoke",
    confirm: "always",
    summary:
      "Revoke a portal login (`active: false`) or restore it (`active: true`), by the PORTAL ACCESS row's id, get_account and list_portal_access both return it. The login dies; every record stays.",
    detail:
      "A PRIVILEGE write: revoking takes away a client contact's ability to sign in and see their own world in the portal, and restoring hands that same sight straight back, so both directions confirm. The person, their account and everything on it are untouched — this switches whether they can currently reach the portal at all, nothing about what they would see once they are in it. A revoked login is not deleted, so restoring it does not re-invite anybody or change the address it signs in with.",
  },
  // PRIVILEGE WRITE (member_roles) → both ways, and the one door that reads
  // `roleId` rather than `id`.
  role: {
    binding: "TENANCY",
    path: "/api/tenancy/roles/active",
    idField: "roleId",
    gate: "member_roles:delete",
    noun: "role",
    on: "Activate",
    off: "Deactivate",
    confirm: "always",
    summary:
      "Switch a role off (deactivate, holders keep access) or back on (reactivate), never deleted. Takes `roleId`.",
    detail:
      "A deactivated role is not the same as removing everybody who holds it: a holder keeps whatever access the role granted until they are individually moved to a different one with set_member_role, so this switch alone changes nothing about who can do what today — it stops the role being offered for NEW assignments and hides it from pickers. Reactivating puts it back on offer exactly as it was, permissions included, because deactivating never touched set_role_permissions' own matrix. Both directions confirm: this is the roles module, and member_roles:update is the same right that can grant permissions in the first place.",
  },
  dropdown_value: {
    binding: "TENANCY",
    path: "/api/tenancy/selectable/active",
    idField: "id",
    gate: "selectable_data:delete",
    noun: "dropdown value",
    on: "Activate",
    off: "Deactivate",
    confirm: "off",
    summary:
      "Switch a dropdown value off (deactivate) or back on (reactivate), never deleted. A value marked as one of the team's defaults refuses to switch off — take the mark off with `set_dropdown_default` first.",
    detail:
      "A deactivated value drops out of the picker on every form that offers it, but every record that already carries it keeps reading correctly — a ticket typed 'Billing' before Billing was retired still says Billing, it simply stops being an option going forward. list_dropdown_values shows both states so a deactivated one is still findable. The default-value refusal exists because a group with no default left would leave a form with nothing pre-selected; retire the value first, then move the default to another one in the same group, then this switch is free to run.",
  },
  app: {
    binding: "TENANCY",
    path: "/api/tenancy/apps/active",
    idField: "id",
    gate: "processes:delete",
    noun: "app",
    on: "Restore",
    off: "Archive",
    confirm: "off",
    summary:
      "Archive an app (`active: false`) or restore it (`active: true`). Never deleted, its maps, its versions and every saving computed from them stay exactly where they are. An archived app drops out of the value figures.",
    detail:
      "An app is what a process map is drawn against, so archiving one is a rollup switch rather than a per-process one: every process, every cut version and every deliverable published on it stays readable through get_process and get_app_impact, it simply stops counting toward the totals a client sees on their portal until it is restored. Restoring puts it back into those totals exactly as it left them, nothing is recomputed from scratch.",
  },
  app_module: {
    binding: "TENANCY",
    path: "/api/tenancy/app-modules/active",
    idField: "id",
    gate: "processes:delete",
    noun: "module",
    on: "Switch on",
    off: "Switch off",
    confirm: "off",
    summary:
      "Switch a module off (`active: false`) or back on (`active: true`). Never deleted: every ticket already filed against it keeps naming it and still reads correctly — it simply stops being offered on the ticket form.",
    detail:
      "A MODULE here is what a ticket says it is about (Settings, Documents, Tasks), grouped under an app the same way list_app_modules and create_app_module both name it — it is not the permission module a role right is checked against, a different word for a different thing in the same codebase. Switching one off only changes what a person raising a new ticket is offered; it does not touch the ticket, sprint or story rows that already reference it, and there is nothing to reconcile on restore.",
  },
  process: {
    binding: "TENANCY",
    path: "/api/tenancy/processes/active",
    idField: "id",
    gate: "processes:delete",
    noun: "process map",
    on: "Restore",
    off: "Archive",
    confirm: "off",
    summary:
      "Archive a process map (`active: false`) or restore it (`active: true`). Never deleted: every version, every step and the whole conversation survive, and an archived map simply stops counting toward the value figures.",
    detail:
      "Archiving a process does not touch its cut versions — cut_process_version's history stays exactly as read, and get_process keeps answering for it — it only stops the map counting toward the app's own value figures and read_impact's rollup while it is off. Its connections to other processes (connect_processes) are untouched either way, so a step that used to hand off into an archived map still names it; restoring brings the figure back with nothing to recompute.",
  },
  // `work:update`, not `work:delete` — the work module offers no delete right, and
  // the door says so itself.
  wave: {
    binding: "TENANCY",
    path: "/api/tenancy/waves/active",
    idField: "id",
    gate: "work:update",
    noun: "wave",
    on: "Bring back",
    off: "Switch off",
    confirm: "always",
    summary:
      "Switch a wave off, or bring it back (by `id`). Never a delete: the sprints inside it keep their history, and a package a client paid for stays readable.",
    detail:
      "A wave is what a client bought — several sprints sold together — so switching it off is closer to withdrawing an offer than tidying a record: every sprint inside it keeps its own dates and price, get_wave keeps answering, and set_sprint_wave still moves sprints in and out of it while it is off. It confirms both ways because a client's own portal reads waves as the package they paid for, and either direction changes what that reads as available.",
  },
  // The client's own organisation. None of the three ever asked, and none of
  // them is an access write, so none of them starts asking now.
  client_department: {
    binding: "TENANCY",
    path: "/api/tenancy/client/departments/active",
    idField: "id",
    gate: "processes:delete",
    noun: "department",
    on: "Bring back",
    off: "Switch off",
    confirm: "never",
    summary:
      "Switch a department off, or bring it back. `active` false retires it; true restores it. Nothing is deleted — a retired department is still the one an old map was drawn against.",
    detail:
      "A department here is the client's own organisation, not ours — list_client_departments and create_client_department name the same table. Retiring one only stops it being offered when a new client_role is created or edited; a role already sitting in it, and any process step priced against a person in it, keeps reading correctly. Neither direction confirms because this is client-side vocabulary, not an access write.",
  },
  client_role: {
    binding: "TENANCY",
    path: "/api/tenancy/client/roles/active",
    idField: "id",
    gate: "processes:delete",
    noun: "role in the client's organisation",
    on: "Bring back",
    off: "Switch off",
    confirm: "never",
    summary:
      "Switch a role off in the client's own organisation, or bring it back. Nothing is deleted: a retired role is still the one a two-year-old map was drawn against, and deleting it would quietly turn that map's saving into nothing.",
    detail:
      "This is the client's job title, not one of our own member roles — the same distinction set_role_active draws on the other side of the fence. A step priced against this role reads it by id rather than by name, so retiring it changes nothing about a figure already computed; it only stops the role being offered when a new client_role is created or a process step is priced against one. The people already sitting in it (set_client_role_person) stay linked either way.",
  },
  client_tool: {
    binding: "TENANCY",
    path: "/api/tenancy/client/tools/active",
    idField: "id",
    gate: "processes:delete",
    noun: "tool",
    on: "Bring back",
    off: "Switch off",
    confirm: "never",
    summary:
      "Switch a tool off, or bring it back. Nothing is deleted — its price history is what an old map reads to cost itself.",
    detail:
      "A client_tool's price is dated (set_client_tool_price files an amount under the day it started being true), and switching the tool itself off touches none of that history — list_client_tool_prices keeps answering for it and a map priced against it on a given day still costs correctly on that day. Retiring only stops it being offered when a new one is priced or a map is built going forward.",
  },
  // MONEY. THERE ARE NO MONEY RECORDS ON THIS TABLE ANY MORE, and the absence is
  // written down rather than left as a gap. Two entries stood here — the agency's
  // own `internal_rate` and the client-facing `account_rate` — both `confirm:
  // "always"`, because what a client was charged last year and what our own hour
  // cost are two records nobody should be able to switch off without being asked.
  // The client retired both on 10 Sep 2026, an hour apart ("kill the whole
  // internal rates thing"; "the whole account rates also killed it"), and each
  // entry went with the door it pointed at. That is a change to a PUBLISHED
  // external contract (MCP.md): `set_record_active` names two fewer records.
  meeting: {
    binding: "CONTENT",
    path: "/api/content/meetings/active",
    idField: "id",
    gate: "meetings:delete",
    noun: "meeting",
    on: "Reinstate",
    off: "Cancel",
    confirm: "off",
    summary:
      "Cancel a meeting (`active: false`) or put it back (`active: true`), by id. Nothing is deleted, the record and its notes survive, because a question like 'didn't we speak in March?' has to stay answerable.",
    detail:
      "Cancelling a meeting leaves get_meeting_people, get_meeting_transcript and every work log time already stamped against it exactly as they were — a cancelled meeting can still answer 'what was said' if a transcript was already captured. It only stops the meeting counting as upcoming. There is no set_meeting_held door: whether it happened is read off its own start time, never off this flag.",
  },
  knowledge_source: {
    binding: "CONTENT",
    path: "/api/content/knowledge/active",
    idField: "id",
    gate: "knowledge:delete",
    noun: "knowledge source",
    on: "Give the assistant back",
    off: "Take away the assistant's sight of",
    confirm: "off",
    summary:
      "Take a source away from the assistant (`active: false`) or give it back (`active: true`), by id. Nothing is deleted: the row and its history survive, its searchable pieces do not, and the sweep will not quietly re-add a source somebody took away.",
    detail:
      "Switching a source off removes its embedded passages from what ask_knowledge can find, so it stops the assistant citing it in a new answer immediately — sync_knowledge's own 15-minute sweep checks this flag before re-indexing anything, which is what stops a source somebody deliberately took away quietly reappearing on the next pass. Switching it back on does not re-embed instantly, the next sweep (or a manual sync_knowledge call) picks it up.",
  },
  // The one door that needs a second id: a deliverable is addressed by the app
  // whose shelf it sits on as well as by itself.
  deliverable: {
    binding: "CONTENT",
    path: "/api/content/deliverables/active",
    idField: "id",
    needsAppId: true,
    gate: "deliverables:delete",
    noun: "deliverable",
    on: "Restore",
    off: "Archive",
    confirm: "off",
    summary:
      "Archive a deliverable (`active: false`) or put it back (`active: true`). Needs `appId`, the app whose shelf it sits on. Never deleted, and the file behind it is never thrown away either way, restoring one whose bytes had gone would hand back a broken link.",
    detail:
      "This is separate from set_deliverable_visibility, and the two do not interact: archiving takes a deliverable off the shelf entirely (staff and client both stop seeing it), while visibility only controls whether a CLIENT may see one that is still active. An archived-but-visible deliverable simply disappears from both views until it is restored, at which point its visibility flag is exactly what it was before archiving.",
  },
  brand_asset: {
    binding: "CONTENT",
    path: "/api/content/brand-assets/active",
    idField: "id",
    gate: "brand_assets:delete",
    noun: "brand asset",
    on: "Restore",
    off: "Archive",
    confirm: "off",
    summary:
      "Archive a brand asset, or put it back. The FILE is never deleted either way, restoring an asset whose bytes had been thrown away would hand back a broken link.",
    detail:
      "list_brand_assets and export_brand_assets_csv both show archived rows alongside active ones, so an archived asset stays findable — it simply stops being offered wherever the agency picks a logo or a colour off the brand library. There is no separate delete for the underlying file; the bytes only ever go away if the record itself is removed at the storage layer outside this door, which archiving never does.",
  },
  meeting_purpose: {
    binding: "CONTENT",
    path: "/api/content/delivery/purposes/active",
    idField: "id",
    gate: "delivery:delete",
    noun: "meeting type",
    on: "Restore",
    off: "Archive",
    confirm: "off",
    summary:
      "Archive a meeting type, or put it back, never deleted.",
    detail:
      "A meeting type (called a meeting purpose in the schema and by create_meeting_purpose, and 'purpose' at the door — the module and the tools stay on that older name the way tickets stays 'help') is what create_meeting and update_meeting offer as the reason for a meeting. Archiving one stops it being offered on a NEW meeting; every meeting already carrying it keeps naming it and reads exactly as before.",
  },
  staff_profile: {
    binding: "CONTENT",
    path: "/api/content/staff/profiles/active",
    idField: "id",
    gate: "staff_profiles:delete",
    noun: "staff profile",
    on: "Restore",
    off: "Take down",
    confirm: "always",
    summary:
      "Take a staff profile down, or put it back, never deleted.",
    detail:
      "A staff profile is about a colleague, not their team membership — taking one down does not remove them from the team, change their role or revoke anything they can do, it only takes their profile off whatever screen shows the roster. It confirms both ways for the same reason there is no CSV export for this record: what a profile says about a person is the kind of thing that deserves a person's attention before it changes, in either direction.",
  },
}

/** The entry a caller named, or undefined. `hasOwnProperty`, not bracket
 * access — `record=__proto__` resolves an inherited member on a bare object
 * literal and would then read as a live door. */
/** THE KINDS, as an allow-list both machine surfaces declare in their schema.
 *
 * DERIVED from the map above, never typed out beside it. `set_record_active`
 * used to take `record` as a free string and forward an unrecognised one to the
 * ACCOUNTS door — so a caller asking to archive a ticket silently archived a
 * client. Both surfaces now declare this as an enum, which turns that into a 400
 * naming the kinds; a hand-written second list would have re-opened the same hole
 * the first time somebody added a toggle and updated only one of the three. */
export const RECORD_TOGGLE_NAMES = Object.keys(RECORD_TOGGLES)

export function recordToggle(name: string | undefined): RecordToggle | undefined {
  if (!name) return undefined
  return Object.prototype.hasOwnProperty.call(RECORD_TOGGLES, name)
    ? RECORD_TOGGLES[name]
    : undefined
}
