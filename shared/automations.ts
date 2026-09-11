// EVERY AUTOMATION IN THE BASE, AND WHETHER IT CAN BE SWITCHED OFF.
//
// ── THE CLIENT'S RULING, 2026-09-11 ─────────────────────────────────────────
//
// Shown a census of the automatic behaviours in this product, she gave two
// sentences and they are the whole scope of this file:
//
//   *"include absolutely all of those in settings by module. I want no
//    automation without visibility."*
//   *"so far i want visibility and on+off."*
//
// So: EVERY automation gets a row on its module's settings page, and the ones
// that can be switched get a switch. Not the four that send email — all of
// them, including the silent ones nobody has ever seen. What a message SAYS,
// who it goes TO and the numbers behind a threshold are explicitly NOT in this
// round; they are a later one.
//
// ── WHY A `switchable: false` IS A FEATURE AND NOT A GAP ────────────────────
//
// Some of these must never be switched off, and SAYING SO is the deliverable.
// The sign-in code is the clearest: turn it off and nobody can sign in, and
// `EMAIL_CENSUS` already records that it is the one email that may not even
// carry a BUTTON, because a sign-in mail with a link is the shape of a phishing
// mail. So every entry answers `switchable` and a `false` carries `helpText` —
// a sentence a person READS on the settings page, under the place the switch
// would have been.
//
// "You may see this, and you may not change it, because …" satisfies her ruling
// where a hidden row would not. A row that is visible and inert with NO
// explanation is the control-that-looks-like-it-works this repo has shipped
// four times (R36's fifteen dead permission boxes, `screens`' four rights and
// no door, the two purged modules still holding rows, the gear that renders
// `null` for ever) — so the reason is a required field of the data, not a
// convention.
//
// ── "OFF" IS A VALUE; ABSENCE IS THE DEFAULT ───────────────────────────────
//
// `AUTOMATION_OFF` below is the one word stored, and it is stored ONLY for an
// automation somebody deliberately switched off. An absent key means nobody has
// been asked, and an absent ROW means nobody has been asked about that whole
// module — so nothing migrates and today's behaviour is the default, for every
// team that exists tonight. Switching one back ON deletes the key rather than
// writing a second word beside it, so there is exactly one spelling of each
// state and a deliberate silence can never be confused with a forgotten config.
//
// That is `OPS_DIGEST_OFF`'s discipline (workers/tenancy/src/lib/ops-alert.ts)
// read one layer up: there, an unset `ALERT_TO` THROWS and the literal word
// `"off"` returns quietly, precisely so that "somebody chose silence" and
// "somebody forgot to wire the alarm" cannot look alike. Here, the fault the
// store must never swallow is a key naming something that is not a switchable
// automation — so the write door REFUSES it (`workers/tenancy/src/lib/
// automations-config.ts`) rather than storing a preference about nothing.
//
// THAT REFUSAL IS WHERE THIS DEPARTS FROM `screens`, WHICH IT OTHERWISE COPIES
// LINE FOR LINE. The recipe store treats its JSON as opaque because the WEB APP
// owns the `ScreenRecipe` shape and the worker cannot honestly check one. This
// registry is SHARED — the worker imports it, the front door imports it — so
// the key space is closed and the door can say no. A store that accepted any
// key would make an automation switched off by a typo indistinguishable from
// one switched off on purpose, which is the exact confusion the paragraph above
// exists to prevent.
//
// ── HOW THIS IS HELD SHUT ──────────────────────────────────────────────────
//
// A hand-typed list of thirty-three rots, so nothing here is only hand-typed.
// R70 (`web/test/automations.test.ts`) derives four censuses off the disk and
// fails in BOTH directions on each:
//
//   · every branded send in `workers/` — the same `brandedEmail` /
//     `sendBrandedEmail` derivation R30 stands on, extracted into
//     `shared/rules/email-sites.ts` so the two laws read ONE census and cannot
//     come to disagree about what an email is;
//   · every `crons` entry in every `workers/*/wrangler.jsonc`;
//   · every export of the files whose whole job is automatic behaviour
//     (`AUTOMATION_OWN_FILES` below);
//   · every `automationOff("…")` read in worker source, against every entry
//     this file calls switchable — so a switch that is offered and never
//     consulted, and a flag consulted that nobody is offered, are both red.
//
// WHAT THAT DOES NOT COVER, said plainly rather than papered over: a NEW silent
// state-change, written tomorrow inside a file that also does ordinary work
// (`help.ts` is 2,600 lines and four of its automations live there), is
// derivable from nothing. There is no seam it must pass through, no import it
// must make and no configuration it must appear in. The strongest tripwire this
// repo can honestly point at it is `AUTOMATION_OWN_FILES` — a small set of
// files that exist ONLY to do things by themselves, where every export must be
// claimed here or excused in writing. That catches the next flip and the next
// stage writer, because those go where their siblings are. It does not catch
// somebody adding an `if` to `updateTicket`, and nothing here pretends it does.

/** THE ONE WORD THAT MEANS "DELIBERATELY OFF" — the only value `automations
 * .settings` ever holds, and the reason it is a word rather than `false`: see
 * this file's header, and `OPS_DIGEST_OFF`, which it is copied from. */
export const AUTOMATION_OFF = "off"

/** What sets an automation going. Read on screen as the answer to "when does
 * this happen", and read by R70 as the thing a census must match:
 *   `send`  — it puts a message in somebody's inbox
 *   `cron`  — an unattended schedule runs it
 *   `write` — it changes a record while somebody is waiting for a response */
export type AutomationTrigger = "send" | "cron" | "write"

export type Automation = {
  /** Stable for ever — it is what a team's stored `{"<key>": "off"}` names, so
   * renaming one silently switches that automation back on. Dotted, opening
   * with its own segment, so a key read in a worker says where its row is. */
  key: string
  /** The `MODULE_SETTINGS` segment whose page carries this row. R70 holds it to
   * a segment that table really declares, which R61 in turn holds to a real
   * `MODULE_PERMISSION` key — so an automation can never land on a page that
   * does not exist, and no automation can be filed under a made-up module. */
  segment: string
  /** `<repo-relative file>::<exported function>` — the code that DOES this.
   * Rot-checked: an entry naming a function that is gone turns the build red.
   * Never translated (it is a path, and `source` is not a position the
   * extraction walk reads). */
  source: string
  trigger: AutomationTrigger
  /** WHICH SCHEDULE RUNS IT — required on a `cron` entry and refused on any
   * other. Held to the `triggers.crons` of that worker's own `wrangler.jsonc`,
   * BOTH ways: a schedule nothing claims is unattended work nobody can see, and
   * an entry naming a schedule that has been retimed or deleted is a settings
   * page describing a job that no longer runs. */
  cron?: { worker: string; expression: string }
  /** English; translated at the read (`TRANSLATED_WHERE_READ`). A short noun
   * phrase — the name of the row. */
  title: string
  /** English; translated at the read. ONE short sentence saying what happens,
   * in the glossary's words (R34). */
  description: string
  /** CAN A TEAM TURN THIS OFF. `true` means a switch is drawn and the flag is
   * really consulted — R70 proves the second half off the worker's own source,
   * because an offered switch nothing reads is the fault this whole file is
   * about. */
  switchable: boolean
  /** WHY NOT — REQUIRED when `switchable` is false, and SHOWN ON SCREEN under
   * the place the switch would have been.
   *
   * `helpText` and not `why`, and the name is load-bearing rather than a
   * stylistic choice: `helpText` is one of the seven positions
   * `scripts/lib/i18n-source.mjs` reads as copy ("the sentence under the
   * input"), and `why` is not one. A reason that must be READ has to be a
   * sentence the catalogue can see, or it ships in English to somebody who
   * chose German — which is R28's own failure, committed in the one place this
   * file is trying to be honest. */
  helpText?: string
}

/** THE FILES WHOSE WHOLE JOB IS DOING THINGS BY THEMSELVES.
 *
 * Every exported function in one of these is claimed by an entry below or named
 * in `AUTOMATION_OWN_FILE_EXEMPT`, both directions, off the disk (R70). This is
 * the best tripwire available for the SILENT half of the census — a status flip
 * or a history writer has no seam, no import and no configuration a check could
 * derive it from, but it does have neighbours, and the next one will be written
 * beside them. */
export const AUTOMATION_OWN_FILES = [
  "workers/content/src/lib/ready-flip.ts",
  "workers/content/src/lib/help-stages.ts",
] as const

/** An export of one of those files that is NOT an automation — with the reason,
 * rot-checked, so the list can only shrink. */
export const AUTOMATION_OWN_FILE_EXEMPT: Record<string, string> = {
  "workers/content/src/lib/ready-flip.ts::ticketBehind":
    "a LOOKUP, not an act: it answers \"which ticket is this story under\" so the two flips beside it know what to move. It writes nothing and decides nothing.",
  "workers/content/src/lib/help-stages.ts::readTicketStages":
    "the READ side: it is what the ticket's stage trail is drawn from (`web/components/tickets/ticket-stages.tsx`). A person opening a record and being shown its history is the opposite of an automation.",
  "workers/content/src/lib/help-stages.ts::statusEventStatement":
    "the same write as `recordStatusEvent` in string form, so it can ride inside `createTicket`'s own INSERT script rather than costing a second trip. One automation, two spellings — claimed once, below, under the function a reader would look for.",
  "workers/content/src/lib/help-stages.ts::recordStatusEvents":
    "the bulk arm of `recordStatusEvent`, for `bulkSetStatusByFilter`. Same automation, same row.",
}

/** EVERY AUTOMATION IN THE BASE, BY THE PAGE IT APPEARS ON.
 *
 * Order is the order on screen, within a segment. Nothing sorts it. */
export const AUTOMATIONS: Automation[] = [
  /* ── TICKETS ──────────────────────────────────────────────────────────────
   * Ten, which is more than any other module has, and the reason is worth one
   * line: a ticket is the one record in this base that a CLIENT and the agency
   * both write to, so almost everything the software does to keep the two in
   * step happens without either of them asking. */
  {
    key: "tickets.reply-email",
    segment: "tickets",
    source: "workers/content/src/lib/notify.ts::notifyReplyAndMentions",
    trigger: "send",
    title: "Reply and mention emails",
    description: "When somebody answers a ticket or names a member in it, we email them.",
    switchable: true,
  },
  {
    key: "tickets.resolved-email",
    segment: "tickets",
    source: "workers/content/src/lib/notify.ts::notifyTicketResolved",
    trigger: "send",
    title: "Resolution email",
    description: "When a ticket is resolved, the client who raised it is emailed the answer.",
    switchable: true,
  },
  {
    key: "tickets.triage-digest",
    segment: "tickets",
    source: "workers/content/src/lib/notify.ts::sendTriageDigest",
    trigger: "cron",
    cron: { worker: "content", expression: "0 7 * * *" },
    title: "Morning triage digest",
    description: "Every morning, whoever is on triage is emailed what is waiting.",
    switchable: true,
  },
  {
    key: "tickets.flip-scheduled",
    segment: "tickets",
    source: "workers/content/src/lib/ready-flip.ts::scheduledFlip",
    trigger: "write",
    title: "Move a ticket to scheduled",
    description: "A new ticket moves to scheduled once its story sits in a sprint.",
    switchable: false,
    helpText:
      "Not yet. Nothing tells anybody that a ticket has stopped moving on its own, so switching this off would leave tickets sitting in the queue looking exactly like the ones the software is still handling. It needs the queue to say so first.",
  },
  {
    key: "tickets.flip-in-progress",
    segment: "tickets",
    source: "workers/content/src/lib/ready-flip.ts::progressFlip",
    trigger: "write",
    title: "Move a ticket to in progress",
    description: "A ticket moves to in progress the moment somebody starts a timer on it.",
    switchable: false,
    helpText: "The same answer as the move to scheduled above, for the same reason.",
  },
  {
    key: "tickets.flip-ready",
    segment: "tickets",
    source: "workers/content/src/lib/ready-flip.ts::readyFlipForTicket",
    trigger: "write",
    title: "Move a ticket to ready",
    description: "A ticket moves to ready when the last story on it closes.",
    switchable: false,
    helpText: "The same answer as the two moves above, for the same reason.",
  },
  {
    key: "tickets.draft-resolution",
    segment: "tickets",
    source: "workers/content/src/lib/ready-flip.ts::readyFlipForTicket",
    trigger: "write",
    title: "Draft the resolution",
    description: "As stories close, what was done on each is gathered into a draft answer.",
    switchable: false,
    helpText:
      "It is written by the same statement that moves the ticket to ready, so it cannot be switched off on its own. Nothing is sent: a person reads the draft, rewrites it, and decides.",
  },
  {
    key: "tickets.stage-history",
    segment: "tickets",
    source: "workers/content/src/lib/help-stages.ts::recordStatusEvent",
    trigger: "write",
    title: "Stage history",
    description: "Every move a ticket makes is written down, with who moved it and when.",
    switchable: false,
    helpText:
      "The stage trail on a ticket is drawn from these rows and from nothing else. A gap in a record's own history cannot be filled in afterwards, so this is not a preference.",
  },
  {
    key: "tickets.client-edit-lock",
    segment: "tickets",
    source: "workers/content/src/lib/help.ts::refuseIfLocked",
    trigger: "write",
    title: "Lock the client out of editing",
    description: "Once we have touched a ticket, the client can add to it but not rewrite it.",
    switchable: false,
    helpText:
      "This is a rule about who may write, not about what the software does for you, and it is enforced at the door. Changing it is a permission decision and belongs on the roles matrix.",
  },
  {
    key: "tickets.triage-ageing",
    segment: "tickets",
    source: "workers/content/src/lib/triage.ts::needsTriage",
    trigger: "write",
    title: "Ageing into the triage queue",
    description: "A ticket nobody has read joins the triage queue after three working days.",
    switchable: false,
    helpText:
      "The three days are written in the code. There is no column holding them and no door that writes one, so there is nothing here a switch could reach yet.",
  },

  /* ── TIME ─────────────────────────────────────────────────────────────── */
  {
    key: "time.nobody-logged-last-week",
    segment: "time",
    source: "workers/content/src/lib/triage.ts::loggedNothingLastWeek",
    trigger: "cron",
    cron: { worker: "content", expression: "0 7 * * *" },
    title: "Who logged no time last week",
    description: "On Mondays, the morning digest names anybody who logged nothing.",
    switchable: true,
  },
  {
    key: "time.auto-stop",
    segment: "time",
    source: "workers/content/src/lib/work-logs.ts::autoStops",
    trigger: "write",
    title: "Stop my other timers",
    description: "Starting a timer stops the ones you already had running.",
    switchable: false,
    helpText:
      "Each person decides this for themselves — it is stored against your own account and not the team's. Today the only way to set it is to ask the assistant, which is a gap rather than a design.",
  },
  {
    key: "time.runaway-flag",
    segment: "time",
    source: "workers/content/src/lib/work-logs.ts::runningTimers",
    trigger: "write",
    title: "Flag a runaway timer",
    description: "A timer still running after eight hours is flagged for you to settle.",
    switchable: false,
    helpText:
      "Nothing happens on its own here — the timer is not stopped and no time is written. It is a question the app asks you, and you answer it three ways.",
  },

  /* ── MEETINGS ─────────────────────────────────────────────────────────── */
  {
    key: "meetings.transcript-capture",
    segment: "meetings",
    source: "workers/content/src/lib/google-autopilot.ts::googleAutopilot",
    trigger: "cron",
    cron: { worker: "content", expression: "*/15 * * * *" },
    title: "Capture meeting transcripts",
    description: "Every quarter of an hour we collect transcripts from connected accounts.",
    switchable: true,
  },
  {
    key: "meetings.billable-time",
    segment: "meetings",
    source: "workers/content/src/lib/meetings.ts::captureTranscript",
    trigger: "write",
    title: "Billable time from a meeting",
    description: "A captured meeting writes one billable work log for each member who attended.",
    switchable: false,
    helpText:
      "It is the second half of the capture above and is written by the same statement. Switching it off alone would record the meeting and lose the hours it took, which is a half-finished record rather than a preference.",
  },

  /* ── KNOWLEDGE ────────────────────────────────────────────────────────── */
  {
    key: "knowledge.sweep",
    segment: "knowledge",
    source: "workers/content/src/lib/knowledge-ingest.ts::sweepAll",
    trigger: "cron",
    cron: { worker: "content", expression: "*/15 * * * *" },
    title: "Keep the knowledge base in step",
    description: "Every quarter of an hour, the team's own records are re-read into it.",
    switchable: true,
  },
  {
    key: "knowledge.google-autopilot",
    segment: "knowledge",
    source: "workers/content/src/lib/google-autopilot.ts::googleAutopilot",
    trigger: "cron",
    cron: { worker: "content", expression: "*/15 * * * *" },
    title: "Read connected Google accounts",
    description: "Material each member has shared with us is collected while nobody is working.",
    switchable: true,
  },
  {
    key: "knowledge.retire-vanished",
    segment: "knowledge",
    source: "workers/content/src/lib/knowledge-google.ts::retireVanished",
    trigger: "cron",
    cron: { worker: "content", expression: "*/15 * * * *" },
    title: "Retire material that has gone",
    description: "A source we can no longer find in Google stops being searchable.",
    switchable: true,
  },
  {
    key: "knowledge.retire-archived",
    segment: "knowledge",
    source: "workers/content/src/lib/knowledge-ingest.ts::sweepKind",
    trigger: "cron",
    cron: { worker: "content", expression: "*/15 * * * *" },
    title: "Retire an archived record's source",
    description: "Archive a record and what the assistant knew about it stops being searchable.",
    switchable: false,
    helpText:
      "It is one clause of the sweep's own statement above. A record you have archived that the assistant still quotes is the fault, not the feature.",
  },
  {
    key: "knowledge.source-switch",
    segment: "knowledge",
    source: "workers/content/src/lib/knowledge.ts::setSourceActive",
    trigger: "write",
    title: "Take one source away",
    description: "Any single source can be taken away from the assistant and given back.",
    switchable: false,
    helpText:
      "This one is already a switch, and it is a better one: it sits on each source's own screen, where you can see what you are taking away. A second switch here would be a second answer to one question.",
  },

  /* ── ACCOUNTS ─────────────────────────────────────────────────────────── */
  {
    key: "accounts.todo-email",
    segment: "accounts",
    source: "workers/content/src/lib/notify.ts::notifyTodoRaised",
    trigger: "send",
    title: "We need your input",
    description: "Raising a to-do emails the client contacts on that account.",
    switchable: true,
  },
  {
    key: "accounts.portal-welcome",
    segment: "accounts",
    source: "workers/tenancy/src/lib/portal-welcome.ts::sendPortalWelcome",
    trigger: "send",
    title: "Portal welcome email",
    description: "A contact given portal access can be welcomed to it by email.",
    switchable: false,
    helpText:
      "It is already decided one grant at a time: whoever hands out the access ticks the box or leaves it. A switch above that would quietly overrule somebody who had just ticked it.",
  },

  /* ── MEMBERS ──────────────────────────────────────────────────────────────
   * Seven, and three of them are the SIGN-IN emails, which belong to no module
   * at all — the argument for filing them here is in `MODULE_SETTINGS`'s own
   * entry for this segment. */
  {
    key: "members.role-changed-email",
    segment: "members",
    source: "workers/tenancy/src/lib/notify.ts::notifyRoleChanged",
    trigger: "send",
    title: "Role changed email",
    description: "A member whose role changes is told what they can do now.",
    switchable: true,
  },
  {
    key: "members.removed-email",
    segment: "members",
    source: "workers/tenancy/src/lib/notify.ts::notifyRemoved",
    trigger: "send",
    title: "Removed from the team email",
    description: "A member who is removed is told, and told who to ask about it.",
    switchable: true,
  },
  {
    key: "members.invite-revoked-email",
    segment: "members",
    source: "workers/tenancy/src/lib/notify.ts::notifyInviteRevoked",
    trigger: "send",
    title: "Invitation withdrawn email",
    description: "Withdraw an invitation and the person who had it is told.",
    switchable: true,
  },
  {
    key: "members.invite-email",
    segment: "members",
    source: "workers/tenancy/src/lib/invites.ts::createInvite",
    trigger: "send",
    title: "Invitation email",
    description: "An invitation is sent to the address it was written for.",
    switchable: false,
    helpText:
      "The only way into the team is the link in this message. An invitation nobody is told about is one nobody can accept.",
  },
  {
    key: "members.login-code-email",
    segment: "members",
    source: "workers/auth/src/lib/email.ts::sendLoginCode",
    trigger: "send",
    title: "Sign-in code",
    description: "Signing in sends a six-digit code to the address you signed in with.",
    switchable: false,
    helpText:
      "It is how everybody signs in, so switching it off would lock the whole team out. It is also the one message that may never carry a button, because a sign-in email with a link in it is the shape of a fraudulent one.",
  },
  {
    key: "members.email-change-code",
    segment: "members",
    source: "workers/auth/src/lib/email.ts::sendEmailChangeCode",
    trigger: "send",
    title: "Email change code",
    description: "Changing your address sends a code to the new one, to prove it is yours.",
    switchable: false,
    helpText: "The code is the proof. Without it there is nothing to check the new address against.",
  },
  {
    key: "members.email-changed-notice",
    segment: "members",
    source: "workers/auth/src/lib/email.ts::sendEmailChangedNotice",
    trigger: "send",
    title: "Your address was changed",
    description: "The old address is told, so a change nobody meant is noticed.",
    switchable: false,
    helpText:
      "It goes to the OLD address precisely because the person reading it may not be the one who made the change. A team cannot switch off somebody else's warning.",
  },

  /* ── TEAM · THE ESTATE ────────────────────────────────────────────────────
   * Four, none switchable, and that is the point of the page rather than a
   * shortfall: these are the INSTALLATION's own housekeeping. One team cannot
   * switch off the work that keeps every team's database alive, and until today
   * nobody outside this repository could see that they run at all. */
  {
    key: "team.retention-sweep",
    segment: "team",
    source: "shared/workers/retention.ts::sweepCoreRetention",
    trigger: "cron",
    cron: { worker: "tenancy", expression: "10 3 * * *" },
    title: "Nightly clear-out",
    description: "Spent sign-in codes and expired sessions are deleted each night.",
    switchable: false,
    helpText:
      "It is what keeps the shared database from growing for ever, and it belongs to the whole installation rather than to this team. It is shown here so that it is not invisible.",
  },
  {
    key: "team.growth-alarm",
    segment: "team",
    source: "workers/tenancy/src/lib/sharding.ts::alertNewAlarms",
    trigger: "cron",
    cron: { worker: "tenancy", expression: "10 3 * * *" },
    title: "A database is filling up",
    description: "A database that passes four fifths full is reported the same night.",
    switchable: false,
    helpText:
      "The same answer as the nightly clear-out: it watches the whole installation, not this team. A team that could switch it off would be a team nobody is watching.",
  },
  {
    key: "team.ops-digest",
    segment: "team",
    source: "workers/tenancy/src/lib/ops-alert.ts::sendOpsDigest",
    trigger: "cron",
    cron: { worker: "tenancy", expression: "10 3 * * *" },
    title: "Nightly fault report",
    description: "New and worsening faults are gathered every night.",
    switchable: false,
    helpText:
      "The gathering cannot be switched off — it is what the fault record is made of. The email already is: it is addressed to nobody on purpose, and the faults are read here instead.",
  },
  {
    key: "team.cron-heartbeat",
    segment: "team",
    source: "shared/workers/cron-heartbeat.ts::reportStaleCrons",
    trigger: "cron",
    cron: { worker: "tenancy", expression: "10 3 * * *" },
    title: "Watch the schedules",
    description: "Each unattended job checks that the others are still running.",
    switchable: false,
    helpText:
      "It is the thing that notices when everything above has stopped. Switching it off would make a silent failure look exactly like a quiet night.",
  },
]

/** IS THIS AUTOMATION OFF FOR THIS TEAM — the one reading of a stored blob, so
 * that every consulting site spells the comparison the same way.
 *
 * POSITIONAL, like every other value this base reads off something it did not
 * write (R20): the stored value must BE the word, never merely be truthy. A
 * blob holding `{"tickets.reply-email": true}` is not a team that switched
 * something off, it is a store that has been written to by something other than
 * this app's own door, and it must not silence an email.
 *
 * A KEY THAT NAMES NOTHING SWITCHABLE IS ALWAYS ON. The door refuses to write
 * one, so a blob holding one has been tampered with or predates a registry
 * change — and in both cases the honest answer is the default rather than a
 * silence nobody chose. */
export function isAutomationOff(settings: unknown, key: string): boolean {
  if (typeof settings !== "object" || settings === null) return false
  if (!AUTOMATIONS.some((a) => a.key === key && a.switchable)) return false
  return (settings as Record<string, unknown>)[key] === AUTOMATION_OFF
}
