### brand_assets + meeting_purposes + staff_profiles. KEEP (BUILT 2026-08-12, team migration `0018_agency_internal`). THE AGENCY'S OWN HOUSEKEEPING

**A fourth table, `staff_certificates`, was built the same day and DROPPED on
14 Sep 2026** (team migration `0090_the_certificate_module_is_killed_everywhere`)
at the client's ruling, verbatim: "Kill the whole certificate module
everywhere." It was a credential register — a qualification a member held,
who issued it, when it was granted and when it lapses, and the file that
proved it — gated on the same `staff_profiles` permission as the table beside
it (it never had a module of its own). Its screen (the Certificates panel on
`staff-panel.tsx`), its dialog (`certificate-form-dialog.tsx`), its five
worker routes, its three agent/MCP tools, its `export_certificates_csv`
export, its glossary term and its knowledge-base ingestion all went with it.
`staff_profiles` KEEPS the `create` right on the Roles screen even though
`create_staff_certificate` was its only literal, per-door asker: the record
activity feed's add-a-note write (R36's fifth source — `postActivityNote`
gates on `<module>:create` for every module `ACTIVITY_GATE_MAP` names) still
asks for it, because a colleague's profile can still take a note the same way
every other record here can. **The bytes a certificate's file uploaded to
`kwapso-internal-media` are NOT deleted by the DROP** — a `DROP TABLE` removes
rows, never R2 objects, and the media-reclaim path that could have cleaned
them up was deleted along with the routes that called it. They are now
unreferenced objects under each team's own `staff/` prefix: a real, small,
ongoing storage cost rather than a data-loss risk, and cheaper to leave than
to build a one-off sweep for. `activity` rows for certificate writes survive
untouched, the same way every other DROP in this ledger since `0077` leaves
history alone.

**A colour is not a picture of a colour (`0043`, 19 Aug 2026).** Twenty-four of
the twenty-five `Color` rows held a LINK to a flat rectangle rendered by another
website, and **nine were on `corhexa.com` — a typosquat of `colorhexa.com`**, a
domain we do not control, one letter from the one we meant, serving bytes into
the agency's own brand library. Every other category (46 rows across seven types)
was already hosted here, so colour was the whole of the library's external
surface — and the hex sat in the URL the entire time.

Nothing rendered those URLs as an image: a brand asset's file shows as TEXT, so
this was **dormant rather than live**. It would not have stayed dormant. The
collection row is getting a picture slot (UI-GAPS #16), and that entry names
`brand.list` carrying "the asset's own file" as one of the four lists that gain
one. The fix landed before the thing that would have made it matter.

`color_hex` is `#RRGGBB`, normalised on the way in by `safeColorHex` (three-digit
shorthand expanded, anything else dropped rather than refused — the same choice
`safeExternalLink` makes beside it, and for the same reason: the field is
optional and losing a bad value costs nothing). The migration converted both URL
shapes the two hosts wrote, cleared `file_url` on every row it touched, and left
the one colour we host and every non-colour row alone. Proved row by row in
`workers/tenancy/test/colour-is-not-a-picture.test.ts`, including the trap: a
logo whose URL happens to end in six valid hex digits.

Three tables, three permission modules, and the agency-internal side of the legacy
Glide app finally landed (a fourth table, `staff_certificates`, stood here until
14 Sep 2026 — see above). What they have in common is the whole of their security
story: **none of them carries an `account_id`**, because none of these rows
belongs to a customer. There is nothing here for the account fence to fence, so
the defence is at the door instead, and it is a REFUSAL rather than a filter:
every handler on all three modules opens with `refusePortalCaller`, and
`workers/content/test/agency-internal.test.ts` proves three things off disk (none
of the doors is on the portal gateway's surface, every one of them refuses, and
no file in `web-portal/` names these tables, paths or fields). That is the same
structural shape R24 used for the margin until R24 was retired on 10 Sep 2026,
applied here to a different secret.

| Table | Module | From (Glide) | Rows | What it is |
|---|---|---|---|---|
| `brand_assets` | `brand_assets` | `branding` | 74 | The material everything else is made with: logos, decks, templates. `file_url` holds either an object we host or a link elsewhere; `color_hex` (`0043`) holds a colour that IS the asset, and the two are exclusive — the migration cleared the URL on every row it converted. |
| `meeting_purposes` | `delivery` | `purposes` | 27 | Why the agency meets, and the department it belongs to. |
| `staff_profiles` | `staff_profiles` | `users` (six profile columns) | 6 | The person behind the member row: personality type, what they are best at, what they find hard, who they look up to, a photo. |

**The `delivery` module is now one table.** It was born holding two, a
`programs` table behind the Delivery method page, and `meeting_purposes`, and
the page went on 17 Aug 2026 (the ten programmes were the sprint types wearing a
second name; see `selectable_data` above for where their enrichment lives now).
The permission module key stays `delivery`, because that string sits in every
role's permission sheet and renaming it would take somebody's access away; its
LABEL is now "Meeting purposes", which is what it actually covers. The page is
reached from a link on the Meetings screen rather than from the sidebar, because
the taxonomy of why we meet is read where meetings are.

**Two of the legacy lookup tables are deliberately NOT tables here.**
`departments` (8 rows) and `channels` (6) are bare labels with no fields of their
own, and the base already has exactly one home for a team's editable vocabulary:
`selectable_data`, which carries its own permissions, screen, import, export and
machine tools. `departments` became the dropdown GROUP "Department",
pick-or-created the way every other vocabulary in this app is
(`workers/content/src/lib/vocabulary.ts`); `channels` had only the Marketing
module to serve and left with it. A module built to hold a word is ceremony.
`purposes` is the one that could NOT go the same way, and the reason is worth
keeping: it carries a department, and a dropdown row is a single label with
nowhere to put a second fact, so the purpose is a record and the department is
the dropdown value, each fact stored the way its own shape asks.

**`staff_profiles` holds ONE live profile per person**, and holds it in the
database rather than in a handler: a partial unique index on `user_id WHERE
deactivated_at IS NULL`, so two tabs saving a colleague's profile at the same
instant settle into one row (CONCURRENCY rule 2). The write is a single upsert
door for both "there wasn't one" and "there was", a person either has a profile
or they don't, and the screen filling in the form has no way of knowing which.

**`birthday` · `position` · `phone` (0089,
`0089_a_members_first_panel_gets_a_birthday_a_position_and_a_phone`, 14 Sep
2026)** — the client's ruling on a member's own detail page: "More fields that
I want on the first component inside where we currently have role, joined, and
email: Full name · Birthday · Position · A button to send email · A button to
call · The field for the phone number." Full name and email needed no new
storage (`TeamMember.firstName`/`lastName`/`email`, already joined from the
core `users` table); these three are the ones that live here, because
`staff_profiles` is the one table a member's own facts already join — headline,
personality type, strengths — team-visible, never a client's, gated on
`staff_profiles` rather than `team_members`. All three NULLABLE, no backfill:
"we don't know yet" is the same honest answer every other optional field on
this table already gives. `birthday` is a calendar DAY through `optionalDate`
(not a timestamp — nobody is born at a time of day this product needs to know);
`position` and `phone` are plain short text through `optionalText`, the same
seam the table's other free-text fields already go through. Drawn on the
member's own detail head (`web/components/team/member-head.tsx`), not inside
the "Profile" bio card below it — the CLIENT'S OWN GROUPING, "the first
component ... where we currently have role, joined, and email" — while the edit
control stays the one FormShell the profile already has
(`staff-profile-dialog.tsx`), because all three are still one row on this same
table. `phone` also feeds the head's Call button (`tel:`); email feeds Send
email (`mailto:`) — R37 names both as the one shape of anchor that is NOT
in-app soft-navigation.

**Dates are days, and a value that is nearly a day is refused** (`optionalDate`,
`workers/content/src/lib/internal-fields.ts`): `2026-02-31` rolls over into March
in every naive parser, and a date that half parses sorts, renders, and is wrong.

**The two ungrouped legacy sets.** Sixteen of the legacy app's 154 dropdown
values carried no group at all, ten country names, five company-size bands and
one stray hyphen. The owner ruled for two GROUPS rather than two fields on the
account, because a country typed free into an address is a country spelled five
ways by five people. Both are seeded in `DEFAULT_SELECTABLE` and backfilled for
existing teams by the same migration; the hyphen is not carried across.

