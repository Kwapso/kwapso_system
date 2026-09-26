## PER-TEAM (each lives in that team's own database)

Everything below this line is **per-team**: it lives in that team's own D1
database, reached over the REST door, and another team's rows are never in the
same file. Everything above it is GLOBAL core. That two-tier split is the thing
this document is organised around, and every other document defers to this one
for "which tier does this table live in" — so if you are scanning the outline,
this heading is the boundary.

*(The heading was lost on 2026-08-26 in commit `a9694fbe`, which inserted the
`team_module_databases` section over the top of it and left the index's link to
it pointing at nothing. Restored; the anchor
`#per-team-each-lives-in-that-teams-own-database` resolves again.)*

