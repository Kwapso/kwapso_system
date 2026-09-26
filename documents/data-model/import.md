### data_import_batches. KEEP (BUILT 2026-07-04, team migration `0006_import_batches`), agentic multi-file import
Purpose: the shell for an AGENTIC, multi-file import (AGENTIC-IMPORT.md). Groups the
uploaded files, the agent-built PLAN (targets, column mappings, normalizations,
references, dependency order) and the per-row REPORT, all JSON columns here; per-file
parsing reuses the single-target session engine. Real data: `id`, `overall_status`
(draft→analyzing→planned→running→complete), `files_json`, `plan_json`, `report_json`,
the audit block, `completed_at`. Creator-scoped (a batch belongs to who started it),
the same way the single-target `data_import_sessions` it replaced was (that table
was dropped 2026-09-14, migration `0087`; see above). Lives in the TEAM database
(the data being imported is the team's). Execution writes every row through the module's gated create endpoint
(act-as-user → audit parity); the plan step is metered on the AI credit pool.

