# web/components — which folder a component goes in

Every component in the agency app lives in one of the folders below; nothing sits loose at
the top level. There are **two kinds of folder** and that is the whole rule, because a
newcomer who does not know it guesses wrong every time:

- a **module** folder holds everything that draws one part of the product — its collection
  screen, its record detail, its dialogs, its panels;
- a **kind** folder holds the parts that belong to no single module: the app's frame, the
  pieces every record screen reuses, the routing shell, the assistant, and the handful of
  screens the product has that are not a module.

So `tickets-screen.tsx` is in `tickets/` (it draws the tickets module) and
`home-screen.tsx` is in `screens/` (there is no home module); `collection-heading.tsx` is
in `records/` (every collection reuses it) and `collection-content.tsx` is in `deep-link/`
(only the routing shell renders it). Read the folder's line below before you decide.

A component belongs to whichever module a person would say it is part of. A new module
gets a new folder, and that folder's line is added here — the check in
`web/test/component-folders.test.ts` reads this file, so a folder nobody described here
turns the build red.

## The module folders

| folder | what belongs here |
|---|---|
| `accounts/` | The customer spine: companies we work for, the contacts at them, and the links between the two. |
| `apps/` | The apps we build and run for a client, their modules, deliverables and stakeholders. |
| `choices/` | The dropdown values an owner manages, and the screens that edit them. |
| `knowledge/` | The knowledge base: its documents, its uploads, and each person's Google connections. |
| `meetings/` | Meetings and the screens that list and open one. |
| `money/` | The rate cards and the margin. What a client is charged, what our own hour costs, and what a role costs. |
| `process/` | Process maps: the steps, the flowchart, and the screens that draft and review one. |
| `team/` | The team itself: members, roles, invites, staff profiles, access tokens and the team's own details. |
| `tickets/` | Tickets, their threads, their triage queue and the replies that answer them. |
| `work/` | The work engine: stories, sprints, waves, tasks, to-dos and work logs. |

## The kind folders

| folder | what belongs here |
|---|---|
| `assistant/` | The in-app AI agent: its panel, its blocks, its history and what it says about its own limits. |
| `deep-link/` | The one client-resolved shell behind `/t/<teamId>/<module>/<id>` — routing, the screen it picks, and the shaping that feeds it. |
| `records/` | The parts every record and every collection reuses: activity, headings, tabs, tables, calendars, pickers and paging. |
| `screens/` | Whole screens the product has that belong to no module: home, settings, profile, invitations, import and the pulse. |
| `shell/` | The frame around everything: the app shell, the sign-in card, navigation, the team switcher and the error boundary. |
