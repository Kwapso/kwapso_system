# Agent & tool parity

Lean cross-index for the `lean_foundation` score. Judges whether everything the app does through
the UI can also be done by a machine caller, the same way, through the same gate, with nothing
re-implemented and nothing extra reachable that the UI can't reach. See
`~/.claude/skills/criterion-review/criteria/08-agent.md` for the full rubric. Source of truth for
every law remains RULES.md + `shared/rules/registry.ts`.

- **R9** — The agent's system-prompt capability brief is generated from the import/export catalogue and the glossary, so the UI and the agent can never disagree about what the app can do. (check: `agent-app-parity`, enforced)
- **R19** — Any tool sitting on a list/search door exposes and forwards every filter that door parses, a set derived from the door's own parameter parsing, never hand-listed. (check: `agent-filter-parity`, enforced)
- **R22** — Any tool sitting on a write door exposes and forwards every field that door reads off the request body, proved by actually running the tool's own body-builder. (check: `agent-body-parity`, enforced)
- **R27** — Every backticked identifier inside a tool's description must name something real: a declared argument, a door's own field, a response field, another tool, or a reasoned exemption. (check: `described-contracts`, enforced)
- **R43** — A tool on the agent's own catalogue exists on MCP's catalogue too (same name or a locked rename), and the same holds in reverse, or the gap is a named, reasoned line. (check: `agent-mcp-tool-parity`, enforced)
- **R47** — Every module a person can see resolves to a knowledge kind, a gated read tool, or a reasoned line saying it's blind; a tool-only module says in writing why it isn't in the searchable corpus. (check: `assistant-coverage`, enforced)
