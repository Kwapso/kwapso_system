### agent_threads + agent_messages. KEEP (BUILT 2026-06-23, team migration `0004_modules`), the AI agent's saved conversations
The agent gets its OWN tables (not help's). `agent_threads`: audit + the thread
title/owner, one saved conversation per row, scoped to its creator (a private
conversation, the audit trail). `agent_messages`: audit + `thread_id` (the
parent thread) + the turn (role + content + any tool calls/results). Every agent
turn is persisted here, so the conversation is replayable and auditable. The
agent acts AS the signed-in user through the same gated endpoints the UI uses, so
these rows are a record of intent, never a separate set of powers.

**`agent_messages.content` is WRITE-ONCE, and that is the point rather than an
omission.** No door updates it; a turn is inserted and never revised. Said here
because it was the one immutable user-facing column in the base with no reason on
file — the other four each carry theirs where they are declared
(`knowledge_terms.term` is half the primary key, `client_tool_prices` is an
append-only price history so that March's arithmetic does not get rewritten, and
`google_connections.service` / `google_sources.service` are structural) — so the
next person auditing one-way columns had to re-derive this one, as a tidiness
review did on 5 Sep 2026. A conversation that can be edited afterwards is not a
record of what was asked and answered, which is the only thing these rows are
for. Correcting a turn means adding another one.

