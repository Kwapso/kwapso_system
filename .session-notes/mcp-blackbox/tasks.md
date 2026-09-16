# MCP mystery-shopper tasks

You are connected to a Kwapso team over MCP. Work through these ten tasks
**one at a time, in order**. For each one: call whatever tools you need, then
write your answer down before moving to the next task. Call `describe_tool`
on anything whose one-line summary isn't enough — that's what it's for.

Don't guess at ids, names or numbers from this document. Every answer must
come from a tool call you actually made.

---

## 1. The team (read)

What is this team's display name?

## 2. Accounts (read)

How many accounts does this team have in total?

## 3. A ticket by its words (read)

There's a ticket on this team whose description is exactly:

> PORTAL SMOKE · a request from the other company

Find it. What is its `ref` (reference number)?

## 4. Tickets by type (filtered list)

How many tickets on this team have `helpType` equal to `question`?

## 5. Tasks that are both important and urgent (filtered list)

How many tasks on this team have `important` **and** `urgent` both true?

## 6. Account → its to-do (chain)

Find the account named **"PORTAL SMOKE · another company"**. Then find the
to-do (input) that belongs to that account. What is that to-do's `ref`?

## 7. Ticket → its thread (chain)

Find the ticket with `ref` `T0001`. Read its thread. How many replies does
it have, and what does the first reply's body say?

## 8. Raise a ticket, then correct it (write)

Raise a new ticket for the account **"PORTAL SMOKE · their company"**:
- title: `BLACKBOX-1`
- description: `Mystery-shopper test ticket`

Then update the same ticket's description to:

> Mystery-shopper test ticket, updated.

Report the ticket's id and its final description.

## 9. Raise a to-do (write)

Raise a to-do for the same account, **"PORTAL SMOKE · their company"**:
- title: `BLACKBOX-2`
- detail: `Mystery-shopper test to-do.`

Report the to-do's id.

## 10. Ask the knowledge base (knowledge)

Ask the knowledge base what it knows about **"another company"**.

Does it find an answer? If so, which ticket does it cite (its `ref` and
title), and what does it tell you to do with what the passage says versus
what the live record says today?

---

When you've been through all ten, write your answers to `answers.md` in
this same folder — one heading per task, your answer, and which tool
calls you made to get it.
