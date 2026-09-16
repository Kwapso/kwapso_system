# MCP mystery-shopper tasks

You have a set of tools for a workspace. Work through these ten tasks **one
at a time, in order**. For each one: call whatever tools you need, then
write your answer down before moving to the next task. Use whatever your
tools' own descriptions tell you — ask for more detail on one before you
call it if the short summary isn't enough.

Don't guess at ids, names or numbers. Every answer must come from a tool
call you actually made.

---

## 1. The workspace (read)

What is this workspace's display name?

## 2. Accounts (read)

How many accounts does this workspace have in total?

## 3. Apps (read)

How many apps does this workspace have in total?

## 4. Apps by stage (filtered list)

How many of those apps are in stage `Maintenance`?

## 5. A client's tickets (filtered list)

Find the account named **"Confia"**. How many tickets does it have in
total, and how many of those are **not** in status `resolved`?

## 6. Sprint → its app (chain)

Find the sprint with `ref` `S0102`. Which app is it against? What is that
app's own `ref`, and what stage is it in?

## 7. Ticket → its account (chain)

Find the ticket with `ref` `T0001`. What account does it belong to?

## 8. Raise a ticket, then correct it (write)

Raise a new ticket for the account **"PLATINUM"**:
- title: `BLACKBOX-1`
- description: `Mystery-shopper test ticket`

Then update the same ticket's description to:

> Mystery-shopper test ticket, updated.

Report the ticket's id and its final description.

## 9. Raise a to-do (write)

Raise a to-do for the same account, **"PLATINUM"**:
- title: `BLACKBOX-2`
- detail: `Mystery-shopper test to-do.`

Report the to-do's id.

## 10. Ask the knowledge base (knowledge)

Ask the knowledge base what it knows about **"Confia"**.

Does it find an answer? If so, what does it cite, and what does it tell
you to do with what the passage says versus what the live record says
today? If it doesn't answer, or it times out, say so exactly — that's a
real result, not a failed task.

---

When you've been through all ten, write your answers to `answers.md` in
this same folder — one heading per task, your answer, and which tool
calls you made to get it.
