// THE one list of team modules a role's permission sheet covers — shared truth.
// Tenancy builds the permission matrix from it (tall sheet: one row per role ×
// module) and data-ops builds the import/export matrix columns from it, so the
// two can never drift. Adding a module here is the ONLY way it appears in either.

/** The modules every role's permission sheet covers today. Future modules just
 * add rows, never columns. */
export const TEAM_MODULES = [
  "teams",
  "team_members",
  "member_roles",
  "accounts",
  // CONTACTS — the PEOPLE on an account, as their own switch. A company record
  // and the list of humans inside it are two different sights: "people of the
  // development team does not need to know who are the contacts" (Aurora, 17 Aug
  // 2026), and a developer opening a client should see the company and its apps
  // without the address book. The rows are the same `accounts` table (companies
  // and people are one table — SCOPE ch.03), so this is a permission over a
  // SHAPE of that table, never a second spine.
  "contacts",
  "portal_users",
  "help",
  "knowledge",
  "selectable_data",
  // `screens` WAS HERE, and it was the only module on the sheet whose four
  // switches decided nothing at all (21 Aug 2026). Its two doors — read the
  // screen recipes, save one — gate on `teams:update`, which is the correct
  // answer: a screen layout is a team setting. So the row offered four grants
  // that no door has ever asked for, and an owner ticking one believed they had
  // granted something. Removed here, and migration 0038 deletes its rows.
  "agent",
  "processes",
  // WHAT WE HAND OVER on an app (CHECKLIST 8.7). Its own switch and not four
  // more rights on `processes`, because the two answer different questions
  // about the same record: `processes` is what an app IS and what its work gave
  // back; this is the material we handed over on it. An agency wants a
  // developer to open an app without being able to publish a handover doc
  // against it, and it wants a delivery lead to file one without being able to
  // edit the map the savings are computed from.
  "deliverables",
  "commercials",
  "work",
  // EVERYONE ELSE'S TASKS — a switch over a SIGHT, not over a record. `work`
  // already decides whether a person reaches the tasks screen at all; this
  // decides whether the list they get is the whole team's or their own. It is a
  // module row because that is what a right IS in this base (one row per role ×
  // module on the tall sheet), and Aurora's ruling was that this particular
  // question must be configurable rather than settled once for everybody.
  "all_tasks",
  // EVERYONE ELSE'S STORIES — `all_tasks`'s own shape, one module along. The
  // Stories tabs redesign (client ruling, 15 Sep 2026) added an "Everyone's"
  // tab the same way Tasks already has one, so it needs the same kind of
  // switch: `work` already decides whether a role reaches the Stories screen
  // at all, this decides whether the backlog it sees is the whole team's or
  // its own. Migration 0095 seeds it for every team that already exists.
  "all_stories",
  // RENAMED FROM `todos` 15 SEP 2026 (Task C, the Inputs screen — documents/
  // UI-RULEBOOK.md K entry). The TABLE is still `todos`, the ref kind is
  // still `todos`, and every cache key/activity relatedTable still says
  // `todos` — only the PERMISSION BOX changes name, to the word the glossary
  // and the label below have used since 31 Aug 2026. Team migration 0096
  // carries every role's existing `todos` grants over to this key untouched
  // (R36: a rename must not silently reset what a role already held).
  "inputs",
  // EVERYONE ELSE'S INPUTS — `all_tasks`/`all_stories`'s own shape, a third
  // time. An input is owed BY a client TO us, so nobody on staff "owns" one
  // the way they own a task or a story (the Inputs screen's own I1 design
  // note: "no Mine tab — an input is owed by a client to us"); what this
  // switch decides instead is whether the screen's three tabs (Waiting/
  // Overdue/Received) show every account's, or only the accounts THIS
  // caller themselves manages (`account_manager_user_id`). Without it, a
  // person sees their own accounts' inputs only — narrowed, never refused,
  // the same shape `all_tasks:read` narrows Overdue/Planned/Completed by.
  "all_inputs",
  // MEETINGS — its own switch, because a meeting's NOTES are the thing being
  // permissioned. The taxonomy of why we meet lives under `delivery`; what was
  // said in the room is a different question to ask a role about.
  "meetings",
  // THE AGENCY'S OWN HOUSEKEEPING — three modules carrying the Glide tables that
  // describe how the agency runs ITSELF rather than what it does for a client.
  // None of them is customer material, so every door on all three refuses a
  // client login outright (R21) rather than fencing.
  "brand_assets",
  "delivery",
  "staff_profiles",
  // GOOGLE — TWO MODULES. IT WAS THREE.
  //
  // "May connect a Google account" is one switch per role. "kwapso may act in
  // Google on my behalf" is one more — sending mail — deliberately separate from
  // the `agent` right, so that giving somebody the assistant does not silently
  // give the assistant their outbox. The tall sheet's unit of "a switch per
  // role" is a module row. (`agent` is the precedent for a module whose four
  // rights are not all meaningful: nothing reads agent:update either.)
  //
  // THE THIRD WAS `google_events`, "Calendar on your behalf", and it went with
  // the doors it guarded when the calendar became READ-ONLY (18 Aug 2026). A
  // switch nothing consults is worse than no switch: somebody grants it, expects
  // a capability, and gets silence. Migration 0037 deletes its rows.
  "google",
  "google_mail",
] as const

/** Plain-English label for each module, shown as the rows of the permission
 * matrix. Keyed off TEAM_MODULES so a new module can't be added without a
 * label. ONE source for both the workers and the Roles screen. */
const MODULE_LABELS: Record<(typeof TEAM_MODULES)[number], string> = {
  teams: "Team",
  team_members: "Members",
  member_roles: "Roles & permissions",
  // The customer spine. `accounts` covers the account records AND the links
  // between them (a link is the SHAPE of an account, not a record of its own);
  // granting someone a login is separately gated because it hands out sight of
  // customer data, which is a bigger decision than editing a phone number.
  accounts: "Accounts",
  // The PEOPLE on an account. Off by default for every role but Admin, because
  // an address book is the one part of a client record that is somebody's
  // personal data rather than the company's: seeing who we work with is a
  // separate grant from seeing that we work with them. A contact still SURFACES
  // by name where a record already points at one (a to-do's dropdown, a ticket's
  // raiser) — this right is about being able to LIST them.
  contacts: "Contacts",
  portal_users: "Portal access",
  // The module KEY stays `help` — it is the permission string every role's sheet
  // already carries, the table the rows live in, and the path the API answers on.
  // The LABEL is what a person reads, and the word for this is Tickets.
  help: "Tickets",
  // The knowledge base: the material the assistant is allowed to read. Its four
  // rights mean exactly what they say — `read` is "ask it questions", and
  // `delete` is "take a source away from it". A person who cannot delete a
  // source cannot ask the assistant to delete one either, because the assistant
  // acts through this same sheet.
  knowledge: "Knowledge",
  selectable_data: "Dropdown data",
  agent: "AI agent",
  // THE MAP AND THE MONEY, kept apart on purpose — one is the client's own world
  // and the other is the agency's books.
  //
  // `processes` covers the whole App → Process → Step chain, its versions, and
  // the comments a client leaves on a map. It is CUSTOMER material: a contact
  // sees their own company's maps and the value they got, so every door on it
  // carries the account fence.
  //
  // `commercials` covered the two rate cards and the margin, and then the client
  // rate card too; all three were retired on 10 Sep 2026. What it covers now is
  // WHAT AN APP GIVES BACK, PRICED — one read door, agency-only. It is AGENCY
  // material, and no client login ever passes one of its doors, which is why it
  // is a second module and not four more rights on the first.
  processes: "Processes",
  // WHAT WE HANDED OVER. A deliverable is one piece of material on an app — a
  // handover doc, an API reference, a recorded walkthrough, an SOP — and this
  // right is what decides whether a role may see the shelf and add to it.
  //
  // IT IS THE AGENCY'S SIDE OF THE FENCE TODAY, deliberately. The material is
  // FOR the client and every row carries their account id, so the fence is
  // there and correct; what is not there is a portal door, and nothing in the
  // client portal names this module. Every door on it refuses a client login at
  // the door (R21), the way the knowledge base's do — the decision to show a
  // client their own handover shelf is a product decision the owner has not
  // made, and the base's rule is that an unmade decision is a closed door
  // rather than an open one.
  deliverables: "Deliverables",
  // THE LABEL FOLLOWED THE MODULE. It read "Rates & margin" until 10 Sep 2026,
  // and named three cards that no longer exist — a row on the permission sheet
  // whose words describe a feature is a row that lies the day the feature goes.
  commercials: "Money",
  // THE WORK ENGINE — what we DO, as opposed to what an account asks for. One
  // module covers stories, the sprints they sit in and the time logged against
  // them, because they are one record from a reader's point of view: a piece of
  // work, when it is due, and how long it took. It is AGENCY material — a client
  // sees a COUNT of the stories on their own ticket and never a title, an
  // assignee or a date (SCOPE ch.06) — so no client login holds it and every
  // door on it refuses a portal caller.
  //
  // To-dos are deliberately NOT here: a to-do is aimed at the client and they
  // must be able to complete one, so it is its own module with its own right.
  work: "Work",
  // WHOSE TASKS YOU SEE. Read the row as a sentence: "this role may see
  // everyone's tasks". Without it the tasks screen is still there and still
  // works — it shows the ones assigned to you, and every count above it counts
  // the same narrowed question. Only `read` is meaningful here, like `google`
  // and `agent`: the module IS the switch, and creating or editing a task is
  // still `work`'s decision.
  all_tasks: "Everyone's tasks",
  // Read the row as a sentence, `all_tasks`'s own: "this role may see
  // everyone's stories". Without it the Stories screen still works — it
  // shows the backlog assigned to you, Now/Planned/Backlog/Completed
  // included — and every count above those four tabs counts the same
  // narrowed question. Only `read` is meaningful here, like `all_tasks`:
  // creating or editing a story is still `work`'s decision.
  all_stories: "Everyone's stories",
  // TO-DOS — the one part of the work engine a client login can WRITE to, which
  // is exactly why it is its own module and not four more rights on `work`. A
  // contact completes theirs and uploads a file against it from the portal
  // (SCOPE ch.06, one of the six things a contact can do), so an owner grants
  // `inputs: read + update` to their Client role and grants nothing else. THE
  // KEY WAS `todos` UNTIL 15 SEP 2026 — the label already read "Inputs" (31
  // Aug 2026, the client's own follow-up naming the glossary term); the box
  // itself carried the old word for two weeks after the word it decides had
  // already changed. Team migration 0096 is the rename.
  inputs: "Inputs",
  // EVERYONE ELSE'S INPUTS — read the row as a sentence, `all_tasks`'s own:
  // "this role may see every account's inputs, not only the ones they
  // manage." Without it the Inputs screen still works — it narrows to the
  // caller's own managed accounts — and only `read` is meaningful here, like
  // `all_tasks`/`all_stories`: creating, completing or withdrawing an input
  // is still `inputs`'s own decision.
  all_inputs: "Everyone's inputs",
  // MEETINGS. A record of a conversation — when it was, why we met, what was on
  // the agenda and what was decided. AGENCY material: the notes are ours, taken
  // for us, and often about the client rather than for them, so every door on it
  // refuses a client login the way the work engine's do. Its `delete` is the
  // cancel — the row survives, because "didn't we have a call in March?" has to
  // stay answerable after somebody tidies up.
  meetings: "Meetings",

  // ── THE AGENCY'S OWN HOUSEKEEPING ──────────────────────────────────────────
  // Three modules and one sentence that decides all of it: none of this is any
  // client's. It is the material we make our own work with, why we meet, and who
  // our people are — so these modules never appear in a portal, never carry an
  // account fence, and every door on them refuses a client login the way
  // `knowledge` does.
  //
  // Several of the legacy tables are NOT here, on purpose. `departments` (8 rows)
  // and `channels` (6) are bare labels with no fields of their own, and the base
  // already has exactly one home for a team's editable vocabulary — the dropdown
  // values module, which carries its own permissions, screen, import, export and
  // machine tools. Giving each of them a table, a screen and a permission row
  // would be a module built to hold a word. `content` (marketing posts) and the
  // learning library were purged outright on 17 Aug 2026, and `program` went the
  // same day with its ten rows folded onto the sprint type, which had always been
  // the same idea under a second name (team-schema 0025).
  brand_assets: "Brand library",
  // WHY WE MEET. One thin table, and a module of its own rather than four more
  // rights on `meetings`: the taxonomy of why an agency meets is a settled list
  // somebody sets and leaves, and what was SAID in the room is a different
  // question to ask a role about. RENAMED, 15 SEP 2026 (Task C) — "Meeting
  // purposes" → "Meeting types", the client's own word; the module KEY
  // (`delivery`) is unchanged, this is only the label the Roles matrix and
  // similar module-name readers show.
  delivery: "Meeting types",
  // The person behind the member row: their profile. Visible to the team,
  // never to a client — which is why it is its own permission row and not four
  // more rights on `team_members`: an agency can want everyone to see who
  // their colleagues are without everyone being able to change who is on the
  // team. A `staff_certificates` table used to gate on this same right too,
  // until the certificate module was killed whole on 14 Sep 2026.
  staff_profiles: "Staff profiles",

  // ── GOOGLE ─────────────────────────────────────────────────────────────────
  // What each right MEANS here, because three of these four are not the usual
  // reading and a permission nobody can read is a permission nobody can grant
  // safely:
  //   read   — see your own connections, and read what you have shared through
  //            them (files in the folders you named, mail with a known contact,
  //            your calendar, the spaces you named);
  //   create — CONNECT a Google account, and name a folder or a space for it;
  //   update — write back through a connection: put a file in a folder you
  //            named, leave a draft in your own Gmail, post in a space you named;
  //   delete — disconnect an account, or take a folder or space away again.
  //
  // The two acts that reach OUTSIDE the world you connected — mail that actually
  // leaves, and an event that lands in a calendar — are the owner's two extra
  // switches and live in their own modules below. Only `create` is read on
  // either: the module IS the switch. A space post is not a third switch because
  // the owner named two, and a space is one you named yourself; it sits under
  // `update` with the other writes.
  google: "Google connections",
  // Read as a sentence with the role's name in front: "Ana may send mail on her
  // behalf" is the wrong reading — it is "kwapso may send mail on Ana's behalf".
  // The right is on the ROLE because that is where the agency decides it, and it
  // applies whether the assistant pressed the button or Ana did: pressing "send
  // it from kwapso" is the same act, done by the same product, from the same
  // mailbox.
  google_mail: "Mail on your behalf",
}

/** The matrix rows: { key, label } per module, in display order. */
export const TEAM_MODULE_CATALOG: { key: string; label: string }[] =
  TEAM_MODULES.map((key) => ({ key, label: MODULE_LABELS[key] }))

/** The four rights each module row carries, in matrix order. */
export const MODULE_RIGHTS = ["read", "create", "update", "delete"] as const

/** WHICH OF THE FOUR A MODULE ACTUALLY OFFERS (R36).
 *
 * The matrix is a grid, so every module gets four boxes whether or not four
 * decisions exist behind them. On 21 Aug 2026 fifteen of the eighty-eight
 * boxes decided nothing — a switch somebody could tick, save, and believe they
 * had granted something by. Eight of those were deliberate and documented in
 * this file; seven were not, and nothing anywhere said which was which.
 *
 * So the offered set is DATA, and `web/test/rules.test.ts` derives the
 * consulted set off the source and fails BOTH ways: a right offered here that
 * no door, tool gate, activity map or import target asks for, and a right
 * something asks for that is not offered here. The second half is the one that
 * matters — it is what stops a door being written against a right no role can
 * ever hold.
 *
 * A module absent from this map offers all four. Only the exceptions are here,
 * so the list can only shrink as doors get written.
 *
 * THE PROP LANDED, AND THE GRID TURNED UNDER IT — both on 2026-09-09, and the
 * two have to be read together.
 *
 * This note used to say the library's matrix "renders a fixed four columns" and
 * that hiding a box per row "needs a `rights?: Right[]` on that contract, which
 * is a library change and this repo does not fork the library." The library
 * change LANDED: kit v1.2.72 ships `PermissionModule.rights` — "an unoffered box
 * stops pretending to be a switch" — and an unoffered slot keeps its place and
 * loses its control: no well, no letter, an em dash, no tab stop, no tooltip,
 * and it is never counted as held whatever the stored sheet says.
 *
 * THE SAME DAY, THE SCREEN THAT WOULD HAVE USED IT WAS REPLACED. The client
 * asked for every role on ONE grid, roles down the side and these modules
 * across (web/components/team/roles-matrix.tsx), which is the TRANSPOSE of the
 * kit's own axes — and `rights` sits on the kit's ROW. Whether a module offers
 * `delete` is a fact about the module, and the module is now the COLUMN, so the
 * prop cannot say it. The grid is therefore STILL one line behind this map, for
 * a different reason than before and with a different fix: not "a library change
 * nobody has made" but "`rights` on `PermissionRole` too, or an `orientation` on
 * the matrix". The matrix file's own header carries the ask.
 *
 * Nothing is mis-granted in the meantime, which is why this is a legibility
 * defect and not a security one: an unoffered right is one no door reads, the
 * screen never draws it held, and a press on it writes nothing. */
export const MODULE_OFFERED_RIGHTS: Record<string, readonly (typeof MODULE_RIGHTS)[number][]> = {
  // The team's own settings, and the screen recipes that came with `screens`.
  // Reading a team is `whoAmI`, not a right; a team is created at signup and is
  // never deleted (SCOPE: one team per product).
  teams: ["update"],
  // A contact is a person ACCOUNT, so editing one is `accounts:update` — this
  // right is about being able to LIST them, link one, and take a link away.
  contacts: ["read", "create", "delete"],
  // Same shape: granting and revoking a login are the two acts. A login has
  // nothing on it to edit that is not the person's own account row.
  portal_users: ["read", "create", "delete"],
  // Deactivate, never delete — a ticket is archived, which is `update`.
  help: ["read", "create", "update"],
  // THE MODULE IS THE SWITCH. `read` is "see your threads", `create` is "say
  // something to it". There is no third act: the assistant acts through the
  // caller's OTHER rights, which is the whole security model.
  agent: ["read", "create"],
  // A story, sprint or work log is deactivated, not deleted.
  work: ["read", "create", "update"],
  // A switch over a SIGHT, not over a record: "may this role see everyone's
  // tasks, or only their own". Creating and editing a task is `work`'s call.
  all_tasks: ["read"],
  // A switch over a SIGHT, not over a record — `all_tasks`'s own reasoning,
  // one module along: "may this role see everyone's stories, or only their
  // own". Creating and editing a story is still `work`'s call.
  all_stories: ["read"],
  // A switch over a SIGHT, not over a record — the third of the three
  // "everyone else's" rows. "May this role see every account's inputs, or
  // only the ones it manages." Asking for/completing/withdrawing an input is
  // still `inputs`'s own call.
  all_inputs: ["read"],
  // READ-ONLY SINCE 10 SEP 2026, and it is the client's two rulings that made it
  // so. `commercials` had three rate cards behind it and now has none: the
  // agency's own two went with the internal rates ("kill the whole internal rates
  // thing … for now i iwanna wipe it clean") and the account rate card went an
  // hour later ("the whole account rates also killed it"). The ONE door left on
  // this right is `GET /api/tenancy/app-money` — what one app gives back, priced
  // — which reads and never writes. Leaving `create`, `update` and `delete` on the
  // sheet would be three boxes an owner ticks and believes they granted by, which
  // is the whole of R36.
  commercials: ["read"],
  // Read as "kwapso may send mail on this person's behalf". One decision.
  google_mail: ["create"],
}

/** The rights one module offers. Absent from the map means all four. */
export function offeredRights(module: string): readonly (typeof MODULE_RIGHTS)[number][] {
  return MODULE_OFFERED_RIGHTS[module] ?? MODULE_RIGHTS
}
