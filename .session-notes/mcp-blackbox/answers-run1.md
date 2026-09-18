# MCP mystery-shopper answers

## 1. The workspace (read)

**Answer:** The workspace's display name is **Kwapso**.

**Tool calls:** `whoami` (confirmed the pinned team id), `get_team` (returned `"name":"Kwapso"`).

## 2. Accounts (read)

**Answer:** **134** accounts in total (`total: 134`, `totalCapped: false` — an exact count, not capped).

**Tool calls:** `list_accounts` (no filters).

## 3. Apps (read)

**Answer:** **28** apps in total (`total: 28`, list_apps is unpaginated/bounded so this is the full set).

**Tool calls:** `list_apps` (no filters).

## 4. Apps by stage (filtered list)

**Answer:** **11** apps are in stage `Maintenance`.

**Tool calls:** `list_apps` (no server-side stage filter is offered by this tool, so I counted `stage:"Maintenance"` by hand across the 28 returned apps): 196+ awards (A0003), Academy (A0024), Assecuranz (A0017), CONFIA (A0001), Fuhrpark (A0019), MAKLAR Pickl (A0005), Padelbase (A0009), S4Y Extern (A0011), S4Y Mitarbeiter (A0007), S4Y Office (A0002), S4Y Schulungszentrum (A0010).

## 5. A client's tickets (filtered list)

**Answer:** Account **Confia** (entity account, id `01KZXBT5T6CVY065QVW9M2S47G`) has **380** tickets in total, of which **30** are **not** `resolved` (byStatus for the account-filtered set: new 27, in_progress 1, triaged 1, ready 1, resolved 350; 27+1+1+1 = 30 open).

**Tool calls:**
- `list_accounts` with `q="Confia"` to find the entity account (as opposed to the individual contacts whose `companyName` is "Confia").
- `list_help_tickets` with `accountId="01KZXBT5T6CVY065QVW9M2S47G"` — result was too large for direct display, so I read the saved tool-result file with `python3`/`json` (via Bash) and pulled the `total` and `byStatus` aggregate fields.

## 6. Sprint → its app (chain)

**Answer:** Sprint `S0102` ("Planning") is against the app **ERP Kennogroup**, whose own `ref` is **A0028**, in stage **"Not started"**.

**Tool calls:**
- `query_records` on module `sprints` with `where: [{field:"ref", op:"eq", value:"S0102"}]` → returned `appId: "01KZXD67BZW38R1ZN1ZH8DBRRG"`.
- Cross-checked against the earlier `list_apps` result, where app id `01KZXD67BZW38R1ZN1ZH8DBRRG` = `{"ref":"A0028","name":"ERP Kennogroup","stage":"Not started"}`.

## 7. Ticket → its account (chain)

**Answer:** Ticket `T0001` belongs to account **Amstella** (id `01KZXBT09VCBGNZNDHXE75YXEV`).

**Tool calls:**
- `query_records` on module `tickets` with `where: [{field:"ref", op:"eq", value:"T0001"}]` → returned `accountId: "01KZXBT09VCBGNZNDHXE75YXEV"`.
- `query_records` on module `accounts` with `where: [{field:"id", op:"eq", value:"01KZXBT09VCBGNZNDHXE75YXEV"}]` → returned `{"name":"Amstella","accountType":"entity"}`.

## 8. Raise a ticket, then correct it (write)

**Answer:** Ticket id **`01M2NY75A14629CX7MCQQE6H0W`** (ref `T3831`), for account PLATINUM. Final description: **"Mystery-shopper test ticket, updated."**

**Tool calls:**
- `list_accounts` with `q="PLATINUM"` to get the account id (`01KZXBTAJXJXE3J1GYX7MFYYXB`).
- `create_help_ticket` with `accountId="01KZXBTAJXJXE3J1GYX7MFYYXB"`, `titleEn="BLACKBOX-1"`, `description="Mystery-shopper test ticket"` (result too large to display directly; read the saved JSON file via Bash/python to get the new `id`).
- `update_help_ticket` with `id="01M2NY75A14629CX7MCQQE6H0W"`, `description="Mystery-shopper test ticket, updated."`.
- `query_records` on module `tickets` filtered by the new ticket's `id`, with `fields:["id","ref","title","description","status","accountId"]`, to confirm the final state.

## 9. Raise a to-do (write)

**Answer:** To-do id **`01M2NY7Z291WCDHZD39NJZSR24`** (ref `I0002`), for account PLATINUM.

**Tool calls:** `raise_todo` with `accountId="01KZXBTAJXJXE3J1GYX7MFYYXB"`, `title="BLACKBOX-2"`, `detail="Mystery-shopper test to-do."`.

## 10. Ask the knowledge base (knowledge)

**Answer:** Yes, it found an answer (`found: true`). It cites one ticket: **"Filtern nach Beginn eines Vertrages"** (ref `T3507`, an `Extra`-type ticket raised by Confia, status resolved at time of citation) — about a client wanting to filter large contract tables by start-year, with the agency discussing a UI workaround (e.g. big year buttons).

The tool's own instruction on how to treat this citation: *"1 source in the knowledge base answer this. I checked the live record just now. Say what it says today, not what the passage says."* — i.e. the passage is historical text from the ticket, but the tool separately re-checked the live record just now (`liveStatus: "resolved"`, `checkedAt: 2026-09-16T20:24:12.950Z`) and instructs me to report the record's **current** live state, not just repeat what the archived passage said, in case the two have since diverged.

**Tool calls:** `ask_knowledge` with `q="What do we know about Confia?"`.

---

*All ids/refs/numbers above came directly from tool call outputs, not guessed.*
