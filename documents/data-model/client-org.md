### client_departments + client_roles + client_role_departments + client_role_people + client_tools + client_tool_prices. KEEP (BUILT 2026-08-24, team migration `0052_the_client_organisation`). THE CLIENT'S OWN ORGANISATION

Who does the work AT A CLIENT, what an hour of them costs, and what they run on
— and, since 10 Sep 2026, the ONLY hourly money left in this base. This paragraph
has been re-pointed twice in one day: it named the internal cards as "the other
side"; then it named the charged card when those went, and all three of those
were dropped on 10 Sep 2026. **These six were not touched by either ruling**, and the reason is worth
saying rather than assuming: they are what a client's own staff and software cost
THEM, on their own record, and a saving is the subtraction of two of these
numbers. Six tables, every one fenced by `account_id`:

- **`client_departments`**, the named parts of their business.
- **`client_roles`**, who does the work. `cents_per_hour` is what an hour of
  this role costs the CLIENT, and NULL is a real answer rather than a zero — a
  saving computed from it reads as incomplete instead of as nothing.
- **`client_role_departments`**, the join: a role can sit in SEVERAL
  departments, and the write is the WHOLE set — anything left out is removed
  (which is why the door's tool says so in as many words).
- **`client_role_people`**, who holds the role: `person_account_id` points at
  the person's own `accounts` row. A person on a role is a contact you already
  have, never a new record.
- **`client_tools`**, what they run on — a name and a `mark`.
- **`client_tool_prices`**, the DATED price history: `cents`, a
  `billing_period` of month or year, and `effective_on`, the day this price
  started being true. A map set to a date reads the newest row on or before it,
  which is what lets a map set to March cost March correctly; setting a price
  for a day that already has one REPLACES it (a correction means "this is what
  it was", not a second truth about the same morning), and that replace is one
  of the few genuine child-row deletes in the base (CONVENTIONS.md).

The join tables carry creator blocks only; the four record tables carry the full
audit block and deactivate, never delete.

---

