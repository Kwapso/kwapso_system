# BRIEF — lane `de95` · branch `fix/dead-end-95-second` · worktree `~/kwapso-lanes/de95`

Read `/Users/alaap_kanchwala_apple/kwapso-lanes/LANE-COMMON.md` first and obey it — including
the new per-lane scratchpad rule at the end.

## Goal
`dead_end_review` from **90 to ≥95**, measured fresh with
`~/.claude/skills/dead_end_review/SKILL.md`.

A lane claimed 98. An independent measurement at `d2e50c8f` says **90** — and it disagreed with
the lane in BOTH directions, which is why it is credible: criterion 1 it scored 100 (higher than
the lane's own reading, refuting the prior round's single finding as a false positive that was
already false when filed), and criterion 4 it scored **63**, down from a carried-forward 100.

**Fixing criterion 4 alone reaches the goal:** Σ 9010 + (100 − 63) × 12 = 9454 → 94.54 → **95**.

## Why criterion 4 collapsed — read this, it is the point of the lane
The prior rounds leaned on the probe field `columns.writeOnlyUserFacing`, which read 0.
**That field is structurally incapable of reporting anything else, in any codebase.** In
`~/.claude/skills/dead_end_review/assets/probe.mjs`: `writeOnly` is only appended when
`!inClient`, while `userFacing` is `inClient && !structural`. The two conditions are mutually
exclusive, so the intersection is always empty. Verified. A hand census of the 114 write-only
columns found three real dead ends.

## The three findings — all user-facing, all real, each opened and traced

1. **`help.screen_recording_link` — HIGH, and a person loses data they supplied.**
   Settable by the assistant on `create_help_ticket` and `update_help_ticket`, validated, stored,
   `SELECT`ed in `TICKET_COLS`, mapped to `screenRecordingLink`, typed at `shared/types.ts:358` —
   and **rendered by no screen on either front door**. Its sibling `sourceScreen` IS rendered at
   `help-detail.tsx:494` ("Raised from"). So somebody can hand the assistant a Loom link, confirm
   a dialog that reads "Screen recording: …", and never see it again.
   **Fix:** one row in the existing overview array in `web/components/tickets/help-detail.tsx`,
   beside "Raised from". If the value is a URL it must reach the person as a real link — R40's
   discriminator is `href`/`src`, never a form value — so render it clickable, safely
   (`safeHref`), and check whether the portal's ticket screen should show it too.
2. **`stories.reviewer_id` / `reviewer_name` — HIGH.**
   Settable only through `update_story` / `create_story` on the machine surfaces, validated at
   the door (`memberOrThrow`), stored, selected (`stories.ts:97`), mapped (`:142`), typed
   (`shared/types.ts:1534`), filterable in the query grammar — and **no screen sets or shows a
   story's reviewer**. `story-detail.tsx` shows "Who's doing it" (the assignee) and nothing else.
   **Two honest options, and you must pick with evidence, not preference:** render it
   (`{ label: t("Who reviews it"), value: story.reviewerName || "—" }`), OR remove `reviewerId`
   from the two tools. **CHECKLIST 6.10 says the reviewer is "the team lead, refused at the
   door", which suggests the per-story column is vestigial** — read that ruling before choosing,
   and if you remove the parameter, walk R19/R22/R27 and R43 for the tool-contract consequences.
   Whichever you choose also closes criterion 7's 5-point dock, which is the same capability.
3. **`agent_credits.lifetime_granted` — MEDIUM.**
   Incremented on every grant and read by **nothing at all**. Its schema comment says
   `-- total ever granted (for admin view)` and DATA-MODEL.md:209 repeats the promise. The admin
   view does not exist. **Fix:** either surface it where credits are already shown, or retire the
   promise with a reasoned line in the style of `NO_CONTROL` — a comment that promises a screen
   nobody built is the defect, so deleting the promise is a legitimate fix.

## Then close the hole that hid them (criterion 10, 85 → higher)
Every reachability census in this repo walks **doors**. `NO_CONTROL`'s "a gap — EMPTY, and that
is the point" is true of doors and silent about FIELDS — which is exactly where all three
findings live. **Add a field clause to `web/test/reachable-screens.test.ts`:** a field the tool
catalogue writes that no `.tsx` renders is either given a render site or a reasoned, rot-checked
line. Canary it both ways. This is the durable half of the lane and it is worth more than the
three fixes.

## Available but NOT required
- **Criterion 2 is 75 and worth +3.5, and it needs no app code at all** — `role-detail.tsx:207`
  already passes `rights`; kit v1.2.63's `PermissionModule` ignores it. It closes on the kit tag
  the design lead has not merged. **Do not chase it. Do not touch `shared/ui/`.** State it.
- Criterion 5 (97): three correct one-way columns want the comment the fourth already has.
- Criterion 6 (97): `MailReplyDialog` is built and mounted by nothing — mount it, or delete it
  WITH its `PARKED` line (the rot check requires both).
- Criterion 9 (95): expired/revoked token badges render at `access-tokens.tsx:174–180` and
  nothing proves it — one render test beside `assistant-limit-notice.test.tsx`.

## Do not
Touch `shared/ui/`. Deploy. Spend neurons. Invent a finding to fill a section — the measurement
found criterion 1 CLEAN and said so.

## Report
The ten-criterion table recomputed at your tip with arithmetic; for each of the three fields,
what a person now sees and where; the field-clause census with its canaries; `npm run check`
exit code unpiped. Judge honestly — two lanes have already been caught scoring their own work
high. Write `/Users/alaap_kanchwala_apple/kwapso-lanes/REPORT-de95.md` AND return its full text.
