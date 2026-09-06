// WHAT A NEWBORN TEAM STARTS WITH — the starting vocabularies, the sprint-type
// catalogue, and the builder that writes the first team's rows.
//
// Split out of team-schema.ts on 6 Sep 2026, together with migrations.ts. This
// is the half of the old file that a person reads and edits; the other half is
// an append-only ledger of every migration ever written. Nothing here changed —
// the split was proved by dumping the generated seed script and both catalogues
// before and after and comparing the SHA-256.
//
// Everything here is a STARTING vocabulary, never a fixed list: every row is
// editable on the team's own Dropdown values screen, and the seed and the
// migrations that carry these forward are all pick-or-create, so a team that has
// retired a value keeps it retired.

// THE master definition of what lives inside every team's own database, plus
// the seed rows a newborn team starts with (mirrors the user's Glide Base v3).
// Adding a future team-table = appending a migration here; the migration
// runner (POST /api/tenancy/admin/migrate-teams) rolls it to every team.

import { sqlString } from "@shared/workers/d1-rest"
import { ulid } from "@shared/workers/id"
import { TASK_DEPARTMENTS } from "@shared/departments"
import { APP_STAGES } from "@shared/app-stages"
import { DELIVERABLE_KINDS, SELECTABLE_GROUPS } from "@shared/selectable-groups"

// The module list itself lives in shared/team-modules.ts — data-ops builds the
// import/export permission-matrix columns from the SAME list, so the matrix a
// role screen shows and the matrix a CSV carries can never drift apart.
// Re-exported here so tenancy code keeps its one habitual import site.
import { TEAM_MODULES } from "@shared/team-modules"
export { TEAM_MODULES, TEAM_MODULE_CATALOG } from "@shared/team-modules"

/** The two groups the legacy app never had, as data rather than as a UNION ALL
 * chain — see the comment in 0018. Countries are the ones the customer records
 * themselves evidence; the ten legacy labels pick-or-create into the same group
 * when the choices import runs. */
export const INTERNAL_VOCABULARY: { type: string; value: string }[] = [
  { type: "Country", value: "Germany" },
  { type: "Country", value: "Austria" },
  { type: "Country", value: "Switzerland" },
  { type: "Country", value: "Spain" },
  { type: "Country", value: "Andorra" },
  { type: "Country", value: "United Kingdom" },
  { type: "Company size", value: "1–10" },
  { type: "Company size", value: "11–50" },
  { type: "Company size", value: "51–200" },
  { type: "Company size", value: "201–500" },
  { type: "Company size", value: "More than 500" },
]

/** The vocabulary a COMPANY record picks from — the industry it is in. Ordinary
 * dropdown values a team edits on its own screen; a starting set, not an enum.
 *
 * THREE `Account status` VALUES SAT HERE TOO, and 0042 retired them with the
 * column they filled. Whether an account is live is `deactivated_at` and always
 * was, so the status was a second answer to a question already answered — and
 * because it was free text behind a pick-or-TYPE box, 24 companies grew four
 * spellings of two ideas, one of them the raw token `active_client` somebody
 * copied out of the form's own placeholder. One of the three values was
 * literally `archived`, competing with the flag underneath it. */
export const COMPANY_VOCABULARY: { type: string; value: string }[] = [
  { type: "Industry", value: "Manufacturing" },
  { type: "Industry", value: "Retail" },
  { type: "Industry", value: "Hospitality" },
  { type: "Industry", value: "Professional services" },
  { type: "Industry", value: "Construction" },
]

/** THE SPRINT-TYPE CATALOGUE — the ten ways the agency runs an engagement.
 *
 * These rows used to be the `programs` table behind the Delivery method page.
 * The page went on 17 Aug 2026 and the DATA did not: a programme was never
 * anything but "the kind of block this sprint is", which is the question the
 * sprint type already answers, so the two were one idea wearing two names. What
 * the programme carried and the sprint type did not is here — the mark somebody
 * recognises it by, the German name the agency already uses with its German
 * clients, the sentence that explains what the block includes, and how long one
 * normally runs. That is what lets a sprint say "Implementation, 21 days".
 *
 * A STARTING vocabulary, like the ticket types: every field is editable on the
 * team's own Dropdown values screen, and a team that has retired one keeps it
 * retired (the seed and migration 0025 are both pick-or-create).
 *
 * `standardDays` is a suggestion, never a rule — a sprint's real dates are the
 * ones somebody agreed with the client. `nameDe` is the ONE curated label
 * carried across from the legacy catalogue, because these words were already in
 * front of German clients; every other language comes from the translation
 * layer, which is why there is no third column here and never will be.
 * `Assessment` arrives bare — the legacy row had no mark, no German name and no
 * length, and inventing three would be worse than carrying a thin row honestly.
 *
 * THE MARK IS A TWO-LETTER CODE, not a pictograph — the client's ruling,
 * 2026-08-31: "i said no emojis. why are there still emojis? kill them!" The
 * legacy catalogue carried an emoji per type; this is the same ten types, the
 * same one-glyph-per-type shape, with the glyph made of letters instead, the
 * same substitution `shared/app-stages.ts` made for the app stages. */
export const SPRINT_TYPE_CATALOGUE: {
  value: string
  mark: string | null
  nameDe: string | null
  description: string | null
  standardDays: number | null
}[] = [
  { value: "Assessment", mark: null, nameDe: null, description: null, standardDays: null },
  { value: "Diagnostic", mark: "DG", nameDe: "Prozessanalyse", description: "We map the organisation around the solution, the tool stack, the data architecture, the way the work is done today and the main user stories behind it, and we set out what it costs in time and money now, alongside the needs and expectations.", standardDays: 14 },
  { value: "Process Optimization", mark: "PO", nameDe: "Prozessoptimierung", description: "Working from the diagnostic, we design the improved process, removing steps, simplifying them, automating them, and produce the assets and the solution paper that meet the needs and expectations and bring the running cost down.", standardDays: 7 },
  { value: "Data Migration", mark: "DM", nameDe: "Datenpflege", description: null, standardDays: 7 },
  { value: "Foundation", mark: "FN", nameDe: "Fundament", description: "Your data, in your app. This is the foundation everything else is built on.", standardDays: 7 },
  { value: "Implementation", mark: "IM", nameDe: "Umsetzung", description: "We build everything designed during the process optimization, on top of the foundation.", standardDays: 21 },
  { value: "Validation", mark: "VL", nameDe: "Validierung", description: "The stakeholders watch the walkthrough, and at the end of the week we meet so you can show us how you use the app. We answer your questions, find what can still be improved, and write the tickets together, though you can raise one at any moment.", standardDays: 14 },
  { value: "Refinement", mark: "RF", nameDe: "Anpassung", description: null, standardDays: 14 },
  { value: "Training", mark: "TR", nameDe: "Schulung", description: "One live online training with the main stakeholders, and a follow-up meeting a few days later to answer what came up.", standardDays: 7 },
  { value: "Enhancement", mark: "EN", nameDe: "Erweiterung", description: "An enhancement cycle adds new steps around what is already live, better automations, new screens, new user stories. It covers a fixed number of tickets and is priced on its own. It opens with one clarification and ideation meeting where we adjust the process map and agree expectations, and closes with a recording of what was built and one follow-up meeting for questions and training.", standardDays: 21 },
]

export type Actor = { id: string; email: string; name: string }

/** Default dropdown values every new team starts with (from Base v3). The four
 * optional fields are the enrichment 0025 folded onto the sprint types — a mark,
 * the German label, the sentence that explains the block, and how long one
 * normally runs. Absent on every other group, which is the honest shape: a file
 * type has no standard length. */
export type DefaultSelectable = {
  type: string
  value: string
  mark?: string | null
  nameDe?: string | null
  description?: string | null
  standardDays?: number | null
}

export const DEFAULT_SELECTABLE: DefaultSelectable[] = [
  { type: "File type", value: "Image file" },
  { type: "File type", value: "Image link" },
  { type: "File type", value: "Video file" },
  { type: "File type", value: "Video link" },
  { type: "File type", value: "Other file" },
  { type: "File type", value: "Other link" },
  // THE FIVE WORDS THE AGENCY ACTUALLY USES (CHECKLIST 2.1), each carrying the
  // mark it is recognised by (11.8, UI-RULEBOOK G2). "Feedback" and "Bug" are
  // gone from the starting vocabulary: Aurora retired them, and a "bug" is an
  // Issue and "feedback" is a Request in the words of the people who file them.
  // Existing teams keep their rows — migration 0034 DEACTIVATES those two rather
  // than deleting them, so every historic ticket still reads correctly.
  //
  // THE GLYPH IS A TWO-LETTER CODE, not a pictograph — the client's ruling,
  // 2026-08-31: "i said no emojis. why are there still emojis? kill them!"
  // Same substitution as 0034/0044 above; `optionalMark` refuses a pictograph
  // going forward, and this is the seed side of the same ruling.
  //
  // It is still an EDITABLE list, not an enum: a team adds its own on the
  // Dropdown values screen, and sets its own glyph beside each word there.
  { type: "Ticket type", value: "Question", mark: "Q" },
  { type: "Ticket type", value: "Issue", mark: "IS" },
  { type: "Ticket type", value: "Request", mark: "RQ" },
  { type: "Ticket type", value: "Extra" },
  // "REQUIREMENTS" IS NOT PLANTED ANY MORE, and the row is not deleted anywhere
  // either — those are two different sentences and both are the client's.
  //
  // She ruled in August that "requirements is not a type, kill that", and on
  // 6 Sep 2026 said what to do with the tickets already filed as one: *"keep the
  // existing requirements (we will use that later) but do not display them in
  // tickets / i just want that you dont lose that data, because later we're
  // moving them to another database"*. So the WORD leaves the starting
  // vocabulary and the ROWS stay exactly as they are.
  //
  // THIS LINE ONLY REACHES A TEAM THAT DOES NOT EXIST YET. Every team already
  // running got the row from migration 0034 and it is still there and still
  // active — deliberately untouched, because deactivating it is a change to
  // their data and she asked for none. What stops a person raising a new one on
  // those teams is the DOOR (`refuseKeptForMigration` in
  // workers/content/src/lib/help.ts), not this list; what stops the word showing
  // up on their screens is `ticketTypeKeptForMigration` (shared/types.ts), which
  // is where the whole ruling is written up.
  //
  // Note the shape here is NOT the one 0034 used on "Feedback" and "Bug": those
  // were retired by DEACTIVATING the row, which is right for a word nobody is
  // coming back for. These rows are being kept for a migration, so the fifth
  // word simply stops being seeded and everything already written stays true.
  // THE THREE KINDS OF WORK (CHECKLIST 2.2), same shape and same reason. They
  // reached existing teams through migration 0028 and were never in the seed, so
  // a brand-new team's story form offered an empty picker.
  { type: "Story type", value: "Fix", mark: "FX" },
  { type: "Story type", value: "Feature", mark: "FT" },
  { type: "Story type", value: "Change", mark: "CH" },
  // Display-only labels for the five built-in states. The status the code trusts
  // is HELP_STATUSES in shared/types.ts — these rows are what a team may reword
  // on screen, and renaming one can never move a ticket.
  // THE THREE STATES A SPRINT IS IN, as words with a glyph each. Aurora asked
  // for a mark on upcoming and running sprints rather than the bare word, and
  // this is the shape the app already had for a state the CODE owns: a sprint's
  // state is DERIVED from its dates (`sprintState` in sprints-screen.tsx) and
  // can never be set from here, so these rows carry only what a person reads —
  // the word and the mark beside it. Renaming one can never move a sprint, and
  // changing a glyph on the Dropdown values screen reaches every sprint at once.
  { type: "Sprint status", value: "Running now", mark: "RN" },
  { type: "Sprint status", value: "Coming up", mark: "CU" },
  { type: "Sprint status", value: "Wrapped", mark: "WR" },
  { type: "Ticket status", value: "New" },
  { type: "Ticket status", value: "Triaged" },
  { type: "Ticket status", value: "In progress" },
  { type: "Ticket status", value: "Ready" },
  { type: "Ticket status", value: "Resolved" },
  // THE SPRINT TYPES: the two SCOPE ch.02 names that the delivery catalogue has
  // no word of its own for, and then the catalogue itself. A "blueprint" is a
  // PRICED PLANNING sprint, not a type (BUILD-1 §3), so it is a price on a
  // Planning row rather than a value here.
  //
  // The ten catalogue rows are the old `programs` table — the ways this agency
  // actually runs an engagement, each with its mark, its German name, what the
  // block includes and how long it normally runs. Implementation appears in both
  // SCOPE's three and the catalogue's ten, so it is listed ONCE and the
  // catalogue's richer row is the one that survives. Editable like every other
  // dropdown value: this is a starting vocabulary, not an enum, and a team that
  // runs three kinds of sprint retires the rest on its own screen.
  { type: "Sprint type", value: "Planning" },
  { type: "Sprint type", value: "Iteration" },
  ...SPRINT_TYPE_CATALOGUE.map((t) => ({ type: "Sprint type", ...t })),
  // Display-only labels for the four story states. The states the code trusts
  // are STORY_STATUSES in shared/types.ts — rewording a row here can never move
  // a story, exactly as with the ticket labels above.
  { type: "Story status", value: "Open" },
  { type: "Story status", value: "In progress" },
  { type: "Story status", value: "In review" },
  { type: "Story status", value: "Done" },
  // THE TWO GROUPS THE LEGACY APP NEVER HAD. Sixteen of its 154 dropdown values
  // carried no group: ten countries, five company-size bands and one stray
  // hyphen. They could have become two FIELDS on the account; the owner ruled
  // for two GROUPS instead, and the reason is the one the whole module exists
  // for — a country typed free into an address is a country spelled five ways.
  //
  // These are a STARTING vocabulary, like the ticket types above: the ten legacy
  // country labels arrive with the migration and pick-or-create into this same
  // group (a label already here is a no-op, a new spelling is a new row), and a
  // team adds or retires any of them on the Dropdown values screen. The hyphen
  // is not carried across — it is not a value, it is a typo.
  { type: "Country", value: "Germany" },
  { type: "Country", value: "Austria" },
  { type: "Country", value: "Switzerland" },
  { type: "Country", value: "Spain" },
  { type: "Country", value: "Andorra" },
  { type: "Country", value: "United Kingdom" },
  { type: "Company size", value: "1–10" },
  { type: "Company size", value: "11–50" },
  { type: "Company size", value: "51–200" },
  { type: "Company size", value: "201–500" },
  { type: "Company size", value: "More than 500" },
  // The company record's other two vocabularies, written once in
  // COMPANY_VOCABULARY so a NEW team's seed and an EXISTING team's migration
  // (0024) can never offer two different starting sets.
  ...COMPANY_VOCABULARY,
  // THE FIVE DEPARTMENTS a task belongs to, from the same shared list migration
  // 0027 hands to teams that already exist — so a newborn team and an upgraded
  // one offer the same five words. Their mark and colour are NOT here: a
  // dropdown row has nowhere to put them, and they live beside the rule each
  // department implies (shared/departments.ts).
  ...TASK_DEPARTMENTS.map((d) => ({ type: SELECTABLE_GROUPS.department, value: d.name })),
  // WHERE AN APP HAS GOT TO — the eight stages the agency already uses, each
  // with the mark it recognises the stage by. Same shape as the departments
  // above and the sprint types before them: a newborn team and a team upgraded
  // by migration 0029 offer the same eight words, and either can add a ninth on
  // its own Dropdown values screen. The active/inactive answer each stage
  // implies is not here, because a dropdown row has nowhere to put it — it
  // lives beside the vocabulary in shared/app-stages.ts.
  ...APP_STAGES.map((s) => ({ type: SELECTABLE_GROUPS.appStage, value: s.name, mark: s.mark })),
  // WHAT KIND OF THING WE HANDED OVER — the five words a deliverable's card
  // shows in small caps. Same shape and same reason as the stages above: a
  // newborn team and a team upgraded by migration 0036 offer the same starting
  // set, and either can add a sixth on its own Dropdown values screen.
  ...DELIVERABLE_KINDS.map((v) => ({ type: SELECTABLE_GROUPS.deliverableKind, value: v })),
]

/**
 * Build the one seed script a newborn team database runs: the locked Admin
 * role, the read-only Viewer role, their permission sheets, and the default
 * dropdown values. Returns the script plus the Admin role id (the creator's
 * membership points at it).
 */
export function buildTeamSeed(
  actor: Actor,
  now: string
): { script: string; adminRoleId: string; viewerRoleId: string } {
  const adminRoleId = ulid()
  const viewerRoleId = ulid()
  const a = (extra: string[]) =>
    [sqlString(now), sqlString(actor.id), sqlString(actor.email), sqlString(actor.name), ...extra].join(", ")

  const statements: string[] = [
    `INSERT INTO member_roles (id, title, description, is_default, created_at, creator_id, creator_email, creator_name) VALUES (${sqlString(adminRoleId)}, 'Admin', 'Default role, full access, can''t be edited.', 1, ${a([])});`,
    `INSERT INTO member_roles (id, title, description, is_default, created_at, creator_id, creator_email, creator_name) VALUES (${sqlString(viewerRoleId)}, 'Viewer', 'Read-only, can view everything, change nothing.', 0, ${a([])});`,
  ]

  for (const module of TEAM_MODULES) {
    // Default Viewer rights are read-only everywhere, with two exceptions.
    //
    // THE AGENT: everyone may USE it out of the box (read+create) — it still
    // can't exceed the user's other rights, so a Viewer's agent is read-only in
    // practice anyway.
    //
    // EVERYONE ELSE'S TASKS: off, like every right that widens what one person
    // sees of another's work. 4.9's ruling is "off by default for every role
    // except Admin", and the Admin row below is the one that says 1, 1, 1, 1 to
    // everything. A Viewer without it still sees their own tasks — the door
    // narrows, it does not refuse.
    const [vr, vc, ve, vd] =
      module === "agent" ? [1, 1, 0, 0] : module === "all_tasks" ? [0, 0, 0, 0] : [1, 0, 0, 0]
    statements.push(
      `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete) VALUES (${sqlString(ulid())}, ${sqlString(adminRoleId)}, ${sqlString(module)}, 1, 1, 1, 1);`,
      `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_edit, can_delete) VALUES (${sqlString(ulid())}, ${sqlString(viewerRoleId)}, ${sqlString(module)}, ${vr}, ${vc}, ${ve}, ${vd});`
    )
  }

  // THE SEED RUNS AFTER THE MIGRATIONS, AND SOME OF THEM SEED TOO.
  //
  // `createTeam` applies every TEAM_MIGRATION and then runs this script, so any
  // value that appears BOTH in a migration's back-fill and in DEFAULT_SELECTABLE
  // was inserted twice into a brand-new team: the four ticket types (0009), the
  // three sprint types (0016), the six countries and five company-size bands
  // (0018). Every picker in the app then offered each of those words twice, which
  // is what a tester meant by "ticket types appear two, three and four times".
  //
  // The migrations already guard themselves with WHERE NOT EXISTS, because they
  // have to be safe against a team that already has the value. The seed did not,
  // because when it was written it ran into an empty table. It does now: this is
  // the migrations' own guard, said the same way, and it makes the seed safe to
  // run in any order against any state. A team that has genuinely retired a
  // default keeps its (deactivated) row rather than being handed a fresh live
  // copy of it — the same reason R13's catalogue reconcile is INSERT-only.
  //
  // Existing teams keep the duplicate rows they were born with; a duplicate is an
  // ordinary value and it is retired on the Dropdown values screen, which is what
  // that screen is for. workers/tenancy/test/team-schema.test.ts runs the real
  // migrations and this seed into SQLite and fails on any repeated (type, value).
  for (const item of DEFAULT_SELECTABLE) {
    statements.push(
      `INSERT INTO selectable_data (id, type, value, is_default, mark, name_de, description, standard_days, created_at, creator_id, creator_email, creator_name)
SELECT ${sqlString(ulid())}, ${sqlString(item.type)}, ${sqlString(item.value)}, 1, ${sqlString(item.mark ?? null)}, ${sqlString(item.nameDe ?? null)}, ${sqlString(item.description ?? null)}, ${item.standardDays == null ? "NULL" : item.standardDays}, ${a([])}
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = ${sqlString(item.type)} AND s.value = ${sqlString(item.value)});`
    )
  }

  return { script: statements.join("\n"), adminRoleId, viewerRoleId }
}
