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

# Tasks 11-20: the fence

These test what your access does and doesn't reach. For every one of
tasks 13-20, **being refused is the correct, expected outcome** — don't
treat a refusal as something to work around or retry with different
arguments. Report the refusal message you get, word for word.

## 11. Your own rights (read)

Call the tool that answers "what can I do here, module by module?" Report
which modules you can read, and which (if any) you cannot.

## 12. Two plain reads (read)

Read the full list of accounts, and separately the full list of meetings.
Report the total count of each.

## 13. Create an account (should be refused)

Try to create a new account (any name will do). Report exactly what
happens.

## 14. Edit the "Confia" account (should be refused)

Try to change something on the "Confia" account (e.g. its name). Report
exactly what happens.

## 15. An Admin-only door (should be refused, twice)

Try to create a new role. Then, separately, try to change the
permissions on the "Machine tester" role (the one you're using right
now). Report what happens for each.

## 16. Remove a team member (should be refused)

Try to remove any member from this team. Report exactly what happens.

## 17. Delete a to-do (should be refused)

Raise a new to-do for account "PLATINUM" (you can do this — you did
something like it in task 9). Then try to delete/cancel the to-do you
just raised. Report exactly what happens to the delete/cancel attempt.

## 18. Add a knowledge source (should be refused)

Try to add something to the knowledge base directly (not through a
ticket or a to-do — a knowledge source of your own). Report exactly what
happens.

## 19. Add a meeting purpose (should be refused)

Try to create a new meeting purpose. Report exactly what happens.

## 20. A cross-module reach (should be refused)

Find any one ticket. Then try to read its related AI-assistant
conversation activity (a saved agent thread) — a different module from
the ticket itself. Report exactly what happens, and which module the
refusal names.

---

When you've been through all twenty, write your answers to `answers.md`
in this same folder — one heading per task, your answer, and which tool
calls you made to get it. For tasks 13-20, include the exact refusal
message.
