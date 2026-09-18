# Machine tester — expected rights (Kwapso staging team)

Read live 2026-09-18 via `my_permissions` (as the sandbox token itself)
against role `01M2N1JJNPDF7KB7XA1T6KH9BF` ("Machine tester"). Cross-checked
against `MODULE_OFFERED_RIGHTS` (`shared/team-modules.ts`) — a module can
only ever say yes/no on the rights it actually **offers** (R36); a right a
module doesn't offer has no door behind it at all, so there is nothing to
allow or refuse. Those cells are marked **N/A**, not "refused" — refusing
something that was never askable would be a false test, not a fence.

| module | read | create | update | deactivate (delete) |
|---|---|---|---|---|
| teams | N/A (not offered — reading a team is `whoAmI`, not a right) | N/A | **Refused** | N/A |
| team_members | **Allowed** | Refused | Refused | Refused |
| member_roles | **Allowed** | Refused | Refused | Refused |
| accounts | **Allowed** | Refused | Refused | Refused |
| contacts | **Allowed** | Refused | N/A (not offered — editing a contact is `accounts:update`) | Refused |
| portal_users | **Allowed** | Refused | N/A (not offered) | Refused |
| help | **Allowed** | **Allowed** | **Allowed** | N/A (not offered — archiving a ticket IS `update`) |
| knowledge | **Allowed** | Refused | Refused | Refused |
| selectable_data | **Allowed** | Refused | Refused | Refused |
| agent | Refused | Refused | N/A (not offered — the module has no third act) | N/A |
| processes | **Allowed** | Refused | Refused | Refused |
| deliverables | **Allowed** | Refused | Refused | Refused |
| commercials | **Allowed** | N/A (not offered — read-only since 10 Sep 2026) | N/A | N/A |
| work | **Allowed** | **Allowed** | **Allowed** | N/A (not offered — deactivating a sprint/story IS `update`) |
| all_tasks | **Allowed** (a sight switch, not a record right — offers `read` only) | N/A | N/A | N/A |
| all_stories | **Allowed** (sight switch, `read` only) | N/A | N/A | N/A |
| inputs | **Allowed** | **Allowed** | **Allowed** | **Refused** (all four rights are real doors here — `cancel_todo` is the delete) |
| all_inputs | **Allowed** (sight switch, `read` only) | N/A | N/A | N/A |
| meetings | **Allowed** | Refused | Refused | Refused |
| brand_assets | **Allowed** | Refused | Refused | Refused |
| delivery | **Allowed** | Refused | Refused | Refused |
| staff_profiles | **Allowed** | Refused | Refused | Refused |
| google | **Allowed** | Refused | Refused | Refused |
| google_mail | N/A (not offered — the only decision here is `create`, "send mail on this person's behalf") | Refused | N/A | N/A |

**Summary.** 21 of 23 modules readable (everything except `teams`, which
was never a read right to begin with, and `agent`, deliberately denied).
Only three modules carry a real write grant: `help` (create+update, no
delete offered), `work` (create+update, no delete offered), `inputs`
(create+update+**delete refused**). Every other write cell that's a real
door — `accounts`, `team_members`, `member_roles`, `knowledge`,
`processes`, `deliverables`, `meetings`, `brand_assets`, `delivery`,
`staff_profiles`, `google`, `contacts`, `portal_users`, `google_mail`,
`agent`, `teams` — is refused.
