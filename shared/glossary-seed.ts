// THE 54-WORD SEED, the app's own vocabulary, identified and defined once.
// Aurora's ruling, 20 Sep 2026, verbatim: "Add a tab to Knowledge with a
// glossary, and craft me an artifact identifying which words we use and their
// definitions. Choose which words you think worthy of being there... We'll
// iterate on definitions, but I want to identify the words already."
//
// A DATA FILE, NOT A CODE PATH: the 54 words this build shipped with, read once
// by `POST /api/content/knowledge/glossary/seed` (workers/content/src/routes/
// knowledge.ts) the first time a team opens the Glossary tab. Each becomes an
// ordinary `glossary`-kind knowledge source (`createGlossaryEntry`,
// workers/content/src/lib/knowledge.ts), a record a person can then edit or
// delete like any other; this list is the STARTING set, never re-read after
// the seed runs.
//
// DISTINCT FROM `shared/glossary.ts`: that file is the DICTIONARY the app's OWN
// SCREENS speak (R6/R34, `glossary-wellformed`/`glossary-in-copy`), enforced
// against UI copy. This one is a knowledge base seed a person reads, corrects and
// searches; nothing here is checked against on-screen text.
//
// No em dash or en dash anywhere (R95, her own ruling the same day); every
// definition below was written or corrected to avoid one.

export type GlossarySeedEntry = { word: string; definition: string }

export const GLOSSARY_ENTRIES: readonly GlossarySeedEntry[] = [
  { word: "Story", definition: "One piece of work the team does, it carries who's doing it, when it's due, and which phase it belongs to." },
  { word: "Phase", definition: "A block of delivery work sold to one account, with a start, an end and a price. Its reference number now starts with P instead of S (format P0000)." },
  { word: "Wave", definition: "A package of phases sold to one account, told apart only by its name and its dates, never by a kind." },
  { word: "Backlog", definition: "\"The story exists but isn't scheduled yet.\"" },
  { word: "To Do", definition: "A story chosen for the current phase but not yet started. Also the name of a column on the stories kanban board." },
  { word: "In Review", definition: "A story being reviewed before it's marked Done, one of the three columns on the stories kanban board." },
  { word: "Done", definition: "A story that's finished." },
  { word: "Acceptance criteria", definition: "The conditions a story must meet to count as finished, a field on the story, alongside its Detail." },
  { word: "MoSCoW", definition: "\"MoSCoW is a prioritization method, Must = critical for this cycle, Should = important but not vital, Could = nice-to-have if time allows, Won't = explicitly out of scope for now.\"" },
  { word: "Phase Goal", definition: "\"A Phase Goal is the 'why' behind a cycle; every story in that cycle should support it, and anything that doesn't probably shouldn't be included.\"" },
  { word: "Burndown chart", definition: "\"A burndown chart plots work remaining (story points or story count) on the Y-axis against the days of the cycle on the X-axis, with a straight 'ideal' line from the starting total down to zero so the team can see whether they're ahead or behind.\"" },
  { word: "Cycle time", definition: "\"Cycle time = calendar time elapsed from when a story enters 'Now'/In Progress to when it reaches 'Completed'; capture this automatically via timestamps on those status changes.\"" },
  { word: "Time log", definition: "\"Effort = the actual hours logged working on the story (from our existing time tracking).\", then, the same round: \"Inside stories and tickets, let's rename 'effort' to 'time log.'\"" },
  { word: "Flow efficiency", definition: "\"Flow efficiency = effort \u00f7 cycle time, shown as a percentage; low flow efficiency means the story spent most of its life waiting or blocked rather than being actively worked.\"" },
  { word: "Spike", definition: "\"A Spike is a time-boxed research or investigation task whose output is a decision or knowledge (e.g. a prototype, a recommendation), not shippable features.\"" },
  { word: "Chore", definition: "\"A Chore is necessary work with no direct user-visible value, dependency upgrades, refactors, config cleanup, data migrations, that keeps the system healthy but a user wouldn't notice directly.\"" },
  { word: "Enabler", definition: "A story that traces back to the team's own upkeep rather than a client ask." },
  { word: "Bug", definition: "A story type: something that should work is broken, missing, or wrong." },
  { word: "Feature", definition: "A story type: a brand-new capability that didn't exist before." },
  { word: "Change", definition: "A story type, and the default: modifying something that already works, copy and email wording included." },
  { word: "Data", definition: "A story type: changing values inside records, not the software around them." },
  { word: "Ticket", definition: "Something an account has asked for, a question, a problem, or a change. It lives in Tickets until it's sorted." },
  { word: "Triage", definition: "The first read of a new ticket, answer it, or split it into stories." },
  { word: "Raised by", definition: "The contact who asked for the ticket, shown with their avatar wherever the ticket is listed or opened. \"Raised on\" is the date it arrived, with how many days ago in brackets." },
  { word: "On the loop", definition: "Everyone kept informed about a ticket besides the person who raised it, drawn as a row of pills on the ticket's own record." },
  { word: "Ticket stages", definition: "The path a ticket travels, most of it moved by something happening rather than by somebody choosing it." },
  { word: "Closed", definition: "The ticket pile showing everything Resolved, the finished half, as against Open (everything still ours to do something about)." },
  { word: "Account", definition: "A company or a person you work with, both live in the same list." },
  { word: "Contact", definition: "A person who belongs to one company, or to none at all." },
  { word: "Portal", definition: "The client-facing app where an account's own contacts sign in to see their own tickets, stories and files, kept separate from the team's own app, which we call the system." },
  { word: "Client login", definition: "A team member on the other side of the fence, an ordinary member whose account is a client's, so staff-only material stays hidden from them." },
  { word: "Stakeholder", definition: "Someone kept in the loop on a ticket, the person who raised it, your admins, and anyone else mentioned." },
  { word: "Knowledge", definition: "Everything the assistant is allowed to read, in one place, add to it, correct it, or take things out." },
  { word: "Source", definition: "One piece of material in the knowledge base, a note you wrote, or something the app keeps in step for you automatically." },
  { word: "Glossary", definition: "The list of words this app uses and what each one means, searchable by users, and read by the assistant as part of the knowledge base." },
  { word: "Assistant", definition: "Your in-app helper, it can find things, explain them, and make changes for you." },
  { word: "App", definition: "A system we build for an account, the thing with its own address. One goal can need two." },
  { word: "Module", definition: "A section of an app, like Settings or Documents. A ticket says which one it's about." },
  { word: "Input", definition: "Something we need from a client. It sits in their portal with a due date." },
  { word: "Member", definition: "A person on your team." },
  { word: "Role", definition: "What a member is allowed to see and do." },
  { word: "Audit", definition: "\"Assess the current state and gather requirements before work is scoped.\"" },
  { word: "Plan", definition: "\"Scope, prioritize, and schedule the stories for the wave.\"" },
  { word: "Build", definition: "\"Implement the stories.\"" },
  { word: "Pilot", definition: "\"The period where the customer uses the app and confirms it meets their needs and signs off, before full release.\"" },
  { word: "Revision", definition: "\"Implement changes and adjustments requested by the customer after they have used the release.\"" },
  { word: "Deploy", definition: "\"Release the accepted work to production, includes the release checklist, smoke tests, rollout (phased/canary if needed), release notes, and a rollback plan.\"" },
  { word: "Hypercare", definition: "\"A short, intensive support window immediately after deploy where the team closely monitors the release, fixes urgent issues fast, and supports users during adoption.\"" },
  { word: "New", definition: "Raised. Nobody here has read it yet." },
  { word: "Triaged", definition: "Somebody on duty has read it." },
  { word: "Scheduled", definition: "Work exists, and some of it is in a phase." },
  { word: "In progress", definition: "A timer has started, on the ticket or one of its stories." },
  { word: "Ready", definition: "Every story is closed, but nobody's told the client yet." },
  { word: "Resolved", definition: "A person sent the answer." },
] as const
