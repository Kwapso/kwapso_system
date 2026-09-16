Connect to a Kwapso workspace over MCP (Model Context Protocol).

Endpoint: https://agency-staging.kwapso.app/mcp
Protocol: MCP over HTTP — JSON-RPC 2.0 (initialize, tools/list, tools/call)

Get the bearer token by running this on your own machine first, then use it
as the `Authorization: Bearer <token>` header on every call:

    security find-generic-password -s mcp-blackbox-token-kwapso -w

The team you're connected to is called "Smoke team". You act as a real
member of it, capped by your role — some things will be refused, that's
expected and not a bug to work around.

Call `tools/list` first to see what you can do, and `describe_tool` on
anything whose one-line summary isn't enough before you call it.

Your task list is at `.session-notes/mcp-blackbox/tasks.md` in this
repository — open and read that file, then work through it one task at a
time, top to bottom. Don't skip ahead or batch tasks together.

When you're done, write your answers to
`.session-notes/mcp-blackbox/answers.md` (create it) — one heading per
task, your answer, and which tool calls you made to get it.
