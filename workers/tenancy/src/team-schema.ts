// THE master definition of what lives inside every team's own database, plus
// the seed rows a newborn team starts with (mirrors the user's Glide Base v3).
//
// THIS FILE IS NOW THE DOOR, not the room. On 6 Sep 2026 it was 4,233 lines and
// 67 CREATE TABLEs, and the two things inside it were of completely different
// kinds: an APPEND-ONLY LEDGER of every migration every team database has been
// carried through (3,900 lines, read by a robot, never top to bottom by a
// person), and about 200 lines of starting vocabularies and seed-building that
// people genuinely read and edit. Splitting them left both halves easier to
// find and neither one changed.
//
// IT IS A PURE FILE SPLIT and it was proved to be one: the text of all 62
// migrations, both catalogues and the generated seed script were dumped before
// and after and compared by SHA-256 (5facfa01…, 184,795 bytes, identical). No
// table was renamed, reordered, merged or touched.
//
// EVERY IMPORT SITE IN THE REPO STILL SAYS `../src/team-schema`. That is the
// point of a barrel: 39 files import from here, most of them tests, and a split
// that rewrote 39 import paths would have been a diff nobody could review beside
// the one that matters.
//
// Adding a future team-table = appending a migration to ./team-schema/migrations,
// which the runner (POST /api/tenancy/admin/migrate-teams) rolls to every team.
// The migration gate parses that file's syntax tree for the last version, so the
// array there must stay a literal — its own header says so at length.

export { TEAM_MODULES, TEAM_MODULE_CATALOG } from "@shared/team-modules"

export { TEAM_MIGRATIONS } from "./team-schema/migrations"

export {
  SPRINT_TYPE_CATALOGUE,
  DEFAULT_SELECTABLE,
  buildTeamSeed,
  type Actor,
  type DefaultSelectable,
} from "./team-schema/seed"
