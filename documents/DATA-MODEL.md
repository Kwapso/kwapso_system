# Data model. Glide Base v3 → the Kwapso System (the mental model)

- Every table and column, mapped to the Kwapso System's design: what we KEEP, what we DROP, our additions, and OPEN questions.
- This is the canonical data-model reference, split by topic on 26 Sep 2026 so no one file has to be read whole. The text moved verbatim.
- The two tiers: GLOBAL core (`kwapso-core`, `env.DB`) holds identity and billing across teams; PER-TEAM (one D1 database per team, over the REST door) holds everything a team owns.

## Read the part you need

| Part | File |
|---|---|
| Preamble: Glide patterns not persisted, the audit block | [data-model/preamble.md](data-model/preamble.md) |
| GLOBAL core: users, teams, credits, MCP tokens, sharding, retention | [data-model/global-core.md](data-model/global-core.md) |
| PER-TEAM: the tier boundary | [data-model/per-team-overview.md](data-model/per-team-overview.md) |
| Roles and permissions | [data-model/permissions.md](data-model/permissions.md) |
| Tickets (help, help_threads) | [data-model/tickets.md](data-model/tickets.md) |
| Refs and aliases | [data-model/references.md](data-model/references.md) |
| Invites and activity | [data-model/invites-activity.md](data-model/invites-activity.md) |
| Accounts, account links, portal users | [data-model/accounts.md](data-model/accounts.md) |
| CSV import batches | [data-model/import.md](data-model/import.md) |
| Agent threads and messages | [data-model/agent.md](data-model/agent.md) |
| Knowledge base | [data-model/knowledge.md](data-model/knowledge.md) |
| Apps and process maps | [data-model/processes.md](data-model/processes.md) |
| The client's organisation | [data-model/client-org.md](data-model/client-org.md) |
| Stories and sprints | [data-model/work.md](data-model/work.md) |
| Agency housekeeping: brand assets, meeting purposes, staff profiles | [data-model/agency.md](data-model/agency.md) |
| Deliverables | [data-model/deliverables.md](data-model/deliverables.md) |
| Google connections and sources | [data-model/google-chat.md](data-model/google-chat.md) |
| Status: built vs. to build | [data-model/status.md](data-model/status.md) |

A code comment that says "DATA-MODEL.md § <table>" means the section for that table in the part above.
