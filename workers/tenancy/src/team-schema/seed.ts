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
import { TICKET_TYPE_GROUP, TICKET_TYPES } from "@shared/ticket-types"
import { ulid } from "@shared/workers/id"
import { TASK_DEPARTMENTS } from "@shared/departments"
import { APP_STAGES } from "@shared/app-stages"
import { PHASE_TYPES } from "@shared/sprint-types"
import { DELIVERABLE_KINDS, SELECTABLE_GROUPS } from "@shared/selectable-groups"
import type { MeetingTypeIcon } from "@shared/meeting-icons"

// The module list itself lives in shared/team-modules.ts — data-ops builds the
// import/export permission-matrix columns from the SAME list, so the matrix a
// role screen shows and the matrix a CSV carries can never drift apart.
// Re-exported here so tenancy code keeps its one habitual import site.
import { TEAM_MODULES } from "@shared/team-modules"
export { TEAM_MODULES, TEAM_MODULE_CATALOG } from "@shared/team-modules"

/** The group the legacy app never had, as data rather than as a UNION ALL chain
 * — see the comment in 0018. Countries are the ones the customer records
 * themselves evidence; the ten legacy labels pick-or-create into the same group
 * when the choices import runs.
 *
 * ── IT WAS TWO GROUPS UNTIL 11 SEP 2026 ─────────────────────────────────────
 *
 * `Company size` was the second, five bands wide, and NOTHING COULD EVER BE
 * FILED UNDER IT. The owner ruled for a group rather than a free-typed field
 * (the same reason `Country` is one) and then no column was ever added to
 * `accounts` to hold the answer — so every team born since has been handed five
 * rows, in a picker that appears on no screen, in a vocabulary a person can edit
 * to no effect. `shared/selectable-homes.ts` has called the group `"unused"` for
 * as long as that file has existed.
 *
 * A SEED CHANGE, NOT A MIGRATION, and the difference is what happens to teams
 * that already exist: the migration runner applies a version ONCE and records
 * it, so a team that has already run 0018 has its five rows and keeps them —
 * nothing here deletes anybody's data, and if a team has quietly started using
 * the group for something of its own, that keeps working. What changes is the
 * team born TOMORROW: it runs this ledger from empty, and 0018 no longer offers
 * it a vocabulary nothing reads. Retiring the rows that already exist is a
 * migration and a decision about a team's own data, which is the client's to
 * take and not one to fold into a tidy-up.
 *
 * THE SIX `File type` ROWS WENT THE SAME DAY, out of `DEFAULT_SELECTABLE` below,
 * for the same reason and with the same treatment — that one was never in a
 * migration at all, so a newborn team is the only team it ever reached. */
export const INTERNAL_VOCABULARY: { type: string; value: string }[] = [
  { type: "Country", value: "Germany" },
  { type: "Country", value: "Austria" },
  { type: "Country", value: "Switzerland" },
  { type: "Country", value: "Spain" },
  { type: "Country", value: "Andorra" },
  { type: "Country", value: "United Kingdom" },
]

/** THE EIGHT MEETING TYPES — client ruling, 15 Sep 2026 (migration 0092's own
 * header carries it verbatim). `meeting_purposes` is a TEAM-BUILT list, not a
 * fixed catalogue (delivery.ts's own header), and until this ruling the seed
 * planted nothing under it — a brand-new team's Choices screen offered an
 * empty picker and grew its own 27-row mess the same way kwapso's own team
 * did. This is the STARTING set every newborn team gets instead, the same
 * eight names, departments and icons migration 0092 backfills onto every team
 * that already exists — so a newborn team and an upgraded one offer the same
 * words, the shape every other starting vocabulary in this file already
 * takes (TASK_DEPARTMENTS, APP_STAGES, DELIVERABLE_KINDS below).
 *
 * `department`: "Business" for the two her ruling named that way; NULL for
 * the six she called "regarding build and operations" — TASK_DEPARTMENTS
 * (Sales / Admin / Production / Marketing / Business) has no department
 * spelled "Operations" or "Build", so their department is left unset rather
 * than guessed onto the nearest-sounding one.
 *
 * `icon`: one of `MEETING_TYPE_ICONS` (@shared/meeting-icons) — kebab-case,
 * checked against that vocabulary at the write door the same way a team's own
 * future edits are. */
export const MEETING_TYPES: { name: string; department: string | null; icon: MeetingTypeIcon }[] = [
  { name: "Recap", department: null, icon: "clock-counter-clockwise" },
  { name: "Week planning", department: null, icon: "calendar-blank" },
  { name: "Validation", department: null, icon: "check-circle" },
  { name: "Sync", department: null, icon: "arrows-clockwise" },
  { name: "Kick-off", department: null, icon: "rocket-launch" },
  { name: "Follow-up", department: null, icon: "arrow-clockwise" },
  { name: "Jour fixe", department: "Business", icon: "calendar-dots" },
  { name: "Strategy", department: "Business", icon: "target" },
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
 * type has no standard length. `position` is 0097's own column — set only on the
 * App stage rows below, which is the one starting vocabulary with an order the
 * client ruled rather than one the alphabet already gives for free. */
export type DefaultSelectable = {
  type: string
  value: string
  mark?: string | null
  nameDe?: string | null
  description?: string | null
  standardDays?: number | null
  position?: number | null
}

export const DEFAULT_SELECTABLE: DefaultSelectable[] = [
  // SIX `File type` ROWS STOOD HERE and were deleted on 11 Sep 2026, together
  // with the five `Company size` bands further down. Eleven rows handed to every
  // newborn team that nothing in the product could ever file anything under.
  //
  // `File type` IS A NEAR-MISS, which is why it survived so long: a knowledge
  // upload really does record a file type — and it stores the BROWSER's own
  // content type, through `requireText(body.contentType, "File type", …)` in
  // workers/content/src/routes/knowledge.ts. That is a validation LABEL that
  // happens to spell the same two words. Grepping the string finds it; nothing
  // has ever looked a row up. `shared/selectable-homes.ts` records the group as
  // `"unused"` and says so in full.
  //
  // NOTHING IS DELETED FROM A TEAM THAT EXISTS. This list is the seed a team
  // runs once, at birth, and `File type` was never in a migration at all — so a
  // newborn team is the only team it ever reached, and every team already
  // standing keeps the six rows it was born with. Retiring those is a migration
  // and a decision about somebody's own data; `INTERNAL_VOCABULARY` above
  // carries the same paragraph for the `Company size` half.
  // THE FOUR KINDS OF TICKET, AND THEY ARE THE ONLY FOUR. The owner's ruling,
  // 15 Sep 2026, verbatim: *"Remove all other options. Just get rid of them,
  // delete them completely. From staging and production."*
  //
  // NOT A LIST TYPED HERE. `TICKET_TYPES` (shared/ticket-types.ts) is the one
  // place the four words and their marks live, and it is read by four things
  // that used to disagree: this seed, migration 0093 (which carries every team
  // already standing to the same four), the door that refuses a fifth
  // (`createSelectable`), and `web/lib/type-colours.ts`, which derives the
  // client's reading order from it. The seeded list and the chart order being
  // two hand-kept lists is what let a five-word vocabulary ship under a
  // four-column dashboard on 6 Sep 2026.
  //
  // WHAT LEFT. "Request" folded into "Extra" — 0093 rewrites both columns that
  // stored the word — and "Requirements" is gone as a word AND as code: the
  // kept-but-never-shown machinery it needed (`TICKET_TYPE_KEPT_FOR_MIGRATION`
  // and the four readers of it) came out the same day, on a measurement that
  // found zero tickets of that kind on either staging team. "Feedback" comes
  // BACK, having been retired by 0034 — with a condition on it this time:
  // `createTicket` refuses it unless a Validation sprint is running on the
  // ticket's own app.
  //
  // THE MARK IS A SHORT CODE, never a pictograph — the client's ruling,
  // 2026-08-31: "i said no emojis. why are there still emojis? kill them!"
  // `optionalMark` holds the door and R66 holds this seed, which the door cannot
  // see.
  //
  // STILL RENAMEABLE, and that is not a hole in the lock: a team may call an
  // Extra whatever it calls an Extra (`updateSelectable` carries every record
  // with the rename), exactly as the locked Admin role may be retitled. What is
  // refused is a FIFTH ROW.
  ...TICKET_TYPES.map((t) => ({ type: TICKET_TYPE_GROUP, value: t.value, mark: t.mark as string })),
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
  // THE FIVE KINDS OF WORK (client ruling, 15 Sep 2026 — team migration 0094's
  // own header carries it verbatim): Data · Tech · Bug · Feature · Change,
  // replacing the old three. Feature and Change reached existing teams through
  // migration 0028 and are unchanged here; Data/Tech/Bug are new, each with the
  // same two-letter-code mark shape 0034 already set for the three they
  // replace (never a pictograph, R66). Fix is NOT seeded for a newborn team —
  // migration 0094 deactivates it for teams that already hold it, and a team
  // born after that migration has no reason to be handed a word the client
  // just retired.
  { type: "Story type", value: "Data", mark: "DA" },
  // "TECH" RENAMED "CHORE", AND "SPIKE" ADDED — Aurora's ruling, 20 Sep 2026,
  // verbatim: "Add 'Spike' to the story Type options — a time-boxed research
  // or investigation task… not shippable features" and "Rename the 'Tech'
  // story type to 'Chore'. A Chore is necessary work with no direct
  // user-visible value." Team migration 0106 carries the identical rewrite to
  // a team that already exists (Tech → Chore in place, Spike inserted new); a
  // newborn team is simply handed the current six words rather than the old
  // five plus a migration to run.
  { type: "Story type", value: "Chore", mark: "CR" },
  { type: "Story type", value: "Bug", mark: "BG" },
  { type: "Story type", value: "Feature", mark: "FT" },
  { type: "Story type", value: "Change", mark: "CH" },
  { type: "Story type", value: "Spike", mark: "SP" },
  // THE NEW FIELD BESIDE IT, same ruling: where a story came from. Protected,
  // like every other closed vocabulary a required field reads from (Ticket
  // status, Story status) — a team may reword either word, never switch it
  // off, because `stories.category` is never blank (team migration 0094).
  // "INTERNAL" RENAMED "ENABLER" — Aurora's ruling, 20 Sep 2026: an Enabler
  // story must name the ticket it enables (`createStory`/`updateStory`,
  // workers/content/src/lib/stories.ts). Team migration 0106 carries the same
  // rename to an existing team.
  { type: "Story category", value: "Client-requested" },
  { type: "Story category", value: "Enabler" },
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
  // "Sprint status" -> "Phase status", Aurora's ruling, 20 Sep 2026 ("rename
  // 'sprint' to 'phase'"), team migration 0107 carries the same rename to an
  // existing team.
  { type: "Phase status", value: "Running now", mark: "RN" },
  { type: "Phase status", value: "Coming up", mark: "CU" },
  { type: "Phase status", value: "Wrapped", mark: "WR" },
  { type: "Ticket status", value: "New" },
  { type: "Ticket status", value: "Triaged" },
  { type: "Ticket status", value: "In progress" },
  { type: "Ticket status", value: "Ready" },
  { type: "Ticket status", value: "Resolved" },
  // THE SEVEN SPRINT TYPES — Not started, Audit, Plan, Build, Validation,
  // Refinements, Enhancement, in that order. Client ruling, 16 Sep 2026,
  // first read onto App stage (migration 0097) and corrected the same day:
  // "these are the sprint types" — `shared/sprint-types.ts`'s own header
  // carries the full account, and team migration 0098 carries the same
  // rewrite to a team that already exists. A newborn team and a migrated one
  // offer the same seven words, in the same order (`position`, 1-based, the
  // identical shape the App stages below already take), and either can add
  // an eighth on its own Dropdown values screen.
  //
  // THE OLD TWELVE-WORD CATALOGUE (Planning, Iteration, and the ten-row
  // `SPRINT_TYPE_CATALOGUE` — Assessment, Diagnostic, Process Optimization,
  // Data Migration, Foundation, Implementation, Validation, Refinement,
  // Training, Enhancement) no longer seeds a newborn team. It is still
  // exported — an existing team's migration 0098 reads it to know which old
  // word renames onto which new one, and a team already using one of these
  // words on a live sprint keeps that exact word (deactivate, never delete).
  // "Sprint type" -> "Phase type" (Aurora's 20 Sep 2026 rename), and the
  // Wave-lifecycle reorder the same session: `PHASE_TYPES`
  // (shared/sprint-types.ts) carries the current seven words — Audit, Plan,
  // Build, Pilot, Revision, Deploy, Hypercare — never `SPRINT_TYPES`, which is
  // frozen for migration 0098's own sake (see that constant's own header).
  ...PHASE_TYPES.map((s, i) => ({
    type: "Phase type",
    value: s.name,
    // THE SAME TWO-LETTER MARK THE MATCHING APP STAGE WORD CARRIES, where one
    // exists — Audit/Plan/Build still coincide with an App stage word; Pilot/
    // Revision/Deploy/Hypercare are new to THIS vocabulary and do not, so they
    // seed with no mark rather than a borrowed one that means something else.
    mark: APP_STAGES.find((a) => a.name === s.name)?.mark ?? null,
    position: i + 1,
  })),
  // Display-only labels for the four story states. The states the code trusts
  // are STORY_STATUSES in shared/types.ts — rewording a row here can never move
  // a story, exactly as with the ticket labels above.
  // "OPEN" RENAMED "BACKLOG" — Aurora's ruling, 20 Sep 2026: "Open becomes
  // Backlog (the story exists but isn't scheduled yet)." The fixed key
  // underneath stays `open`; team migration 0106 carries the identical word
  // move to an existing team's own dropdown row.
  { type: "Story status", value: "Backlog" },
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
  // THE FIVE `Company size` BANDS STOOD HERE, deleted 11 Sep 2026 — see
  // `INTERNAL_VOCABULARY` at the top of this file, which carries the whole
  // account and the other half of the same deletion (0018's copy of them).
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
  // with the mark it recognises the stage by and its own position. Same shape
  // as the departments above and the sprint types before them: a newborn team
  // and a team upgraded by migration 0097 offer the same eight words, in the
  // same order, and either can add a ninth on its own Dropdown values screen.
  // The active/inactive answer each stage implies is not here, because a
  // dropdown row has nowhere to put it — it lives beside the vocabulary in
  // shared/app-stages.ts. POSITION IS 1-BASED, `APP_STAGES`' own array order —
  // the client's ruling, 16 Sep 2026, "in that order" — so a newborn team never
  // needs the migration to draw its stages correctly.
  ...APP_STAGES.map((s, i) => ({ type: SELECTABLE_GROUPS.appStage, value: s.name, mark: s.mark, position: i + 1 })),
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
      module === "agent"
        ? [1, 1, 0, 0]
        : module === "all_tasks" || module === "all_stories" || module === "all_inputs"
          ? [0, 0, 0, 0]
          : [1, 0, 0, 0]
    statements.push(
      `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete) VALUES (${sqlString(ulid())}, ${sqlString(adminRoleId)}, ${sqlString(module)}, 1, 1, 1, 1);`,
      `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete) VALUES (${sqlString(ulid())}, ${sqlString(viewerRoleId)}, ${sqlString(module)}, ${vr}, ${vc}, ${ve}, ${vd});`
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
      `INSERT INTO selectable_data (id, type, value, is_default, mark, name_de, description, standard_days, position, created_at, creator_id, creator_email, creator_name)
SELECT ${sqlString(ulid())}, ${sqlString(item.type)}, ${sqlString(item.value)}, 1, ${sqlString(item.mark ?? null)}, ${sqlString(item.nameDe ?? null)}, ${sqlString(item.description ?? null)}, ${item.standardDays == null ? "NULL" : item.standardDays}, ${item.position == null ? "NULL" : item.position}, ${a([])}
 WHERE NOT EXISTS (SELECT 1 FROM selectable_data s WHERE s.type = ${sqlString(item.type)} AND s.value = ${sqlString(item.value)});`
    )
  }

  // THE EIGHT MEETING TYPES, same NOT-EXISTS guard as the vocabulary above —
  // `meeting_purposes` is not a selectable-data group (it carries a department,
  // MeetingPurpose's own comment says why), so it gets its own guarded insert
  // rather than joining DEFAULT_SELECTABLE. Matched by name: a newborn team has
  // none of these rows yet, so every one of the eight always lands.
  for (const t of MEETING_TYPES) {
    statements.push(
      `INSERT INTO meeting_purposes (id, name, department, icon, created_at, creator_id, creator_email, creator_name)
SELECT ${sqlString(ulid())}, ${sqlString(t.name)}, ${sqlString(t.department)}, ${sqlString(t.icon)}, ${a([])}
 WHERE NOT EXISTS (SELECT 1 FROM meeting_purposes m WHERE m.name = ${sqlString(t.name)});`
    )
  }

  return { script: statements.join("\n"), adminRoleId, viewerRoleId }
}
