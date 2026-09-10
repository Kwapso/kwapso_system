"use client"

// THE COLLECTION TABS of the account record — the people linked to it, and who
// can sign in to it. There were three; "the accounts sitting under it" went on
// 17 Aug 2026, because it and the Contacts tab were answering the same question
// under two names (CHECKLIST 7.2).
//
// They live beside account-detail.tsx rather than inside it because they are the
// part of that screen that GREW: one 611-line function with seventeen hooks, in
// which the list bodies, their empty states, their per-row actions and their
// confirms were interleaved with the record's own header, dialogs and data
// reads. Each of these is one list, one question.
//
// They own no data and no permissions of their own. Everything they need is
// handed in — the rows the host already fetched, the rights it already resolved,
// and the two verbs below. The host stays the only thing that knows how to read
// or write an account, which is what keeps the record's tabs (R2/R8) and its
// counts (R16) in one place.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/components/select/select"
import { Prohibit, Key, LinkSimple, Power, UserMinus } from "@shared/ui/foundations/icons"

import type { AccountDetail } from "@shared/types"
import { tenancy } from "@/lib/api"
import { formatDate } from "@shared/web/format"
import { staffNameFromSnapshot } from "@shared/staff-name"
import { useLanguage, useT } from "@shared/web/language"
import { AddButton, ToolbarRow } from "@/components/deep-link/screen-bits"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"
import type { Confirm, PanelActions } from "@shared/web/use-confirm"

/** Both lists here are bounded (a contact's own account, or one account's
 * logins) and handed down already read whole — the same shape
 * `selectable-screen.tsx`'s own toolbar filters, so the search + status
 * filter run in the browser rather than asking a door for something it
 * already gave us. "All" is the default for both: the row already showed
 * inactive rows faded rather than hidden, and the filter only has to narrow
 * that further, never less than what was on screen before it existed. */
type ActiveFilter = "all" | "active" | "inactive"
function matchesActive(filter: ActiveFilter, active: boolean): boolean {
  return filter === "all" || (filter === "active" ? active : !active)
}

/** The shared confirm shape (shared/web/use-confirm.tsx) and the two verbs a
 * panel borrows from the host that owns it: put a question in front of the
 * person, and do a thing (telling them plainly if it was refused).
 * Re-exported because account-detail.tsx, contact-detail.tsx and
 * account-rate-card.tsx all reached this file for them before the shared hook
 * existed — one shape, one owner, now living beside the dialog itself. */
export type { Confirm, PanelActions }

/** A row in one of these lists: bordered, and visibly faded when it is switched
 * off. Every list here shows inactive rows rather than hiding them — nothing in
 * this app is deleted, so "not a contact now" is a state, not an absence. */
function Row({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex flex-wrap items-center gap-2 px-3 py-2 ${
        active ? "" : "opacity-60"
      }`}
    >
      {children}
    </li>
  )
}

/** The people attached to this account.
 *
 * TWO WAYS IN, AND BOTH EARN THEIR PLACE. New contact makes a person who did not
 * exist a minute ago; Add contact says someone we already hold is a contact here
 * too — which is the case a parent pointer cannot express, and the reason we do
 * not make somebody type a second Marta because the search missed the first.
 *
 * Until 18 Aug 2026 only the second existed, and the only way to make a person
 * at all was the Type selector on the account form. Taking that selector away
 * without this button would have left the search here pointed at a set nobody
 * could ever add to.
 *
 * Removing a contact says they are no longer a contact HERE — they keep
 * everything else they are attached to. */
export function ContactsPanel({
  accountName,
  links,
  canCreate,
  canCreatePerson,
  canArchive,
  actions: { busy, ask, act },
  onAdd,
  onNew,
  onOpen,
}: {
  accountName: string
  links: AccountDetail["links"]
  /** may LINK a person already on the books — `contacts:create` on its own. */
  canCreate: boolean
  /** may make a NEW one, which writes an accounts row as well as a link, so it
   * needs `accounts:create` too. The door decides either way (R10); this only
   * decides whether we offer a button that would come back a 403. */
  canCreatePerson: boolean
  canArchive: boolean
  actions: PanelActions
  onAdd: () => void
  onNew: () => void
  onOpen: (accountId: string) => void
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<ActiveFilter>("all")
  const [sort, setSort] = React.useState<{ by: "name" | "relationship"; dir: "asc" | "desc" }>({
    by: "name",
    dir: "asc",
  })

  const q = query.trim().toLowerCase()
  const filtered = links.filter(
    (l) =>
      matchesActive(status, l.active) &&
      (q === "" ||
        l.personName.toLowerCase().includes(q) ||
        (l.relationship ?? "").toLowerCase().includes(q))
  )
  const dirMul = sort.dir === "desc" ? -1 : 1
  const sorted = [...filtered].sort((a, b) =>
    sort.by === "name"
      ? a.personName.localeCompare(b.personName) * dirMul
      : (a.relationship ?? "").localeCompare(b.relationship ?? "") * dirMul
  )

  return (
    <div className="flex flex-col">
      <ToolbarRow
        // R50 EXEMPTION (EMPTY_TOOLBAR_EXEMPT) — never suppressed, on purpose.
        // This is the one collection in the app with TWO first-adds rather
        // than one: "Add contact" (link a person already on the books) and
        // "New contact" (make one). `CollectionEmptyState` below only ever
        // carries a SINGLE labelled `onCreate` — it cannot offer both, so an
        // empty contacts list still needs this row's own two icon buttons to
        // stay reachable, exactly as a populated one does. See the file
        // header's own "offers both ways in" test.
        empty={false}
        search={
          links.length > 0 && (
            <>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search contacts…")}
                className="flex-1"
                aria-label={t("Search contacts")}
              />
              <Select value={status} onValueChange={(v) => setStatus(v as ActiveFilter)}>
                <SelectTrigger className="h-9 w-full sm:w-40" aria-label={t("Filter by status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  <SelectItem value="active">{t("Contacts now")}</SelectItem>
                  <SelectItem value="inactive">{t("Not a contact now")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          )
        }
        // OUT OF `search` AND INTO ITS OWN SLOT (R53, 2026-09-06). This
        // `<SortControl>` used to be the third child of the fragment above —
        // inside the row's one GROWING box, beside the search field, which is
        // not where `<ToolbarRow>`'s own documented order (search → filters →
        // sort → view → actions) puts it. Eight call sites had drifted into
        // that shape and two had not, which is the "different toolbar
        // variations" the client photographed. The row builds the control
        // itself now; this hands it only what this panel knows.
        sort={
          links.length > 0 && {
            options: [
              { value: "name", label: t("Name") },
              { value: "relationship", label: t("Relationship") },
            ],
            value: sort.by,
            onValueChange: (by: string) => setSort({ by: by as typeof sort.by, dir: "asc" }),
            direction: sort.dir,
            onDirectionChange: (dir: "asc" | "desc") => setSort((s) => ({ ...s, dir })),
          }
        }
        actions={
          (canCreate || canCreatePerson) && (
            <>
              {/* Distinct glyphs on purpose: two icon-only buttons that both showed a
                  plus would be one button drawn twice. Create keeps the Plus
                  (UI-CONVENTIONS §4); linking gets the link. */}
              {canCreate && (
                <AddButton
                  label={t("Add contact")}
                  onClick={onAdd}
                  icon={<LinkSimple className="size-4" />}
                />
              )}
              {canCreatePerson && <AddButton label={t("New contact")} onClick={onNew} />}
            </>
          )
        }
      />
      {links.length === 0 ? (
        // No import wiring: the `accounts` import target bulk-creates people,
        // but never the LINK that makes one a contact HERE — a straight
        // import would still need this same "Add contact" step afterwards.
        <CollectionEmptyState
          title={t("No contacts yet.")}
          onCreate={canCreatePerson ? onNew : undefined}
        />
      ) : sorted.length === 0 ? (
        /* R62 — THE SAME REGISTER, MINUS THE ADD BUTTON. Client, 2026-09-09:
           "the empty because of filters hosul look the same as empty collection
           but the add button." This was a bare grey line beside the full
           register two branches up; it is the same body now, and `filtered`
           does the subtracting. `onCreate` is handed over unconditionally and
           withdrawn by the component, which is the whole point. */
        <CollectionEmptyState
          filtered
          title={t("No contacts yet.")}
          onCreate={canCreatePerson ? onNew : undefined}
        />
      ) : (
        <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
          {sorted.map((l) => (
            <Row key={l.id} active={l.active}>
              {/* The kit's `link` variant: no box, inherited ink, underline on
                  hover. The overrides are layout only — the name flexes and
                  truncates in the row, against a `shrink-0 justify-center`
                  base skin. */}
              <Button
                type="button"
                variant="link"
                onClick={() => onOpen(l.personAccountId)}
                className="hover:text-primary min-w-0 flex-1 shrink justify-start text-left underline-offset-2"
              >
                {/* Truncation on the SPAN, not the control: the kit's skin is
                    `inline-flex`, and `text-overflow: ellipsis` does not apply
                    to a flex container — the name would clip at the same width
                    with no "…" to say it had. */}
                <span className="min-w-0 truncate">{l.personName}</span>
              </Button>
              {l.relationship && (
                <span className="text-muted-foreground text-xs">{l.relationship}</span>
              )}
              {l.isMainStakeholder && (
                <Badge variant="secondary" className="text-badge">
                  {t("Main contact")}
                </Badge>
              )}
              {!l.active && <span className="text-muted-foreground text-xs">{t("Not a contact now")}</span>}
              {canArchive &&
                (l.active ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      ask({
                        title: t("Remove {person} from {account}?", {
                          person: l.personName,
                          account: accountName,
                        }),
                        body: t(
                          "They stay in your accounts, with everything they're attached to. You're only saying they're no longer a contact here."
                        ),
                        action: t("Remove contact"),
                        run: () =>
                          act(
                            () => tenancy.setLinkActive(l.id, false),
                            t("Contact removed."),
                            t("Couldn't remove that contact.")
                          ),
                      })
                    }
                    className="text-destructive hover:text-destructive gap-1"
                    aria-label={t("Remove {person}", { person: l.personName })}
                  >
                    <UserMinus className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => tenancy.setLinkActive(l.id, true),
                        t("Contact added back."),
                        t("Couldn't add that contact back.")
                      )
                    }
                    className="gap-1"
                    aria-label={t("Add {person} back", { person: l.personName })}
                  >
                    <Power className="size-3.5" /> {t("Add back")}
                  </Button>
                ))}
            </Row>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The login switch. Only rendered for someone who may see logins at all — the
 * host hides the tab itself otherwise. Taking access away never removes anyone:
 * their records and their history stay exactly where they are. */
export function PortalAccessPanel({
  portalUsers,
  canGrant,
  canRevoke,
  actions: { busy, ask, act },
  onGrant,
}: {
  portalUsers: AccountDetail["portalUsers"]
  canGrant: boolean
  canRevoke: boolean
  actions: PanelActions
  onGrant: () => void
}) {
  const { t, lang } = useLanguage()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<ActiveFilter>("all")
  const [sort, setSort] = React.useState<{ by: "grantedAt"; dir: "asc" | "desc" }>({
    by: "grantedAt",
    dir: "desc",
  })

  const q = query.trim().toLowerCase()
  const filtered = portalUsers.filter(
    (p) =>
      matchesActive(status, p.active) &&
      (q === "" ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.grantedByName ?? "").toLowerCase().includes(q))
  )
  const dirMul = sort.dir === "desc" ? -1 : 1
  const sorted = [...filtered].sort(
    (a, b) => ((a.grantedAt ?? "") < (b.grantedAt ?? "") ? -1 : 1) * dirMul
  )

  return (
    <div className="flex flex-col">
      <ToolbarRow
        empty={portalUsers.length === 0}
        search={
          portalUsers.length > 0 && (
            <>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search logins…")}
                className="flex-1"
                aria-label={t("Search logins")}
              />
              <Select value={status} onValueChange={(v) => setStatus(v as ActiveFilter)}>
                <SelectTrigger className="h-9 w-full sm:w-40" aria-label={t("Filter by status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All")}</SelectItem>
                  <SelectItem value="active">{t("Can sign in")}</SelectItem>
                  <SelectItem value="inactive">{t("Access taken away")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          )
        }
        // OUT OF `search` AND INTO ITS OWN SLOT (R53) — see the identical note
        // on `ContactsPanel` above. ONE OPTION IS THE WHOLE CONTROL HERE and
        // that is legitimate: a list of logins has exactly one order worth
        // offering (when access was given), so the FIELD is fixed and the
        // DIRECTION is the live question — which is why `onValueChange` has
        // nothing to do.
        sort={
          portalUsers.length > 0 && {
            options: [{ value: "grantedAt", label: t("Given") }],
            value: sort.by,
            onValueChange: () => undefined,
            direction: sort.dir,
            onDirectionChange: (dir: "asc" | "desc") => setSort((s) => ({ ...s, dir })),
          }
        }
        actions={
          canGrant && (
            <Button size="sm" onClick={onGrant} className="gap-1">
              <Key className="size-4" />
              {t("Give access")}
            </Button>
          )
        }
      />
      {portalUsers.length === 0 ? (
        <CollectionEmptyState
          title={t("Nobody here can sign in yet.")}
          description={t("Give access to someone and they'll see this account's own work.")}
          onCreate={canGrant ? onGrant : undefined}
        />
      ) : sorted.length === 0 ? (
        /* R62 — the same register as the branch above, minus the add button. */
        <CollectionEmptyState
          filtered
          title={t("Nobody here can sign in yet.")}
          onCreate={canGrant ? onGrant : undefined}
        />
      ) : (
        <ul className="divide-border divide-y rounded-[var(--radius)] bg-surface-panel">
          {sorted.map((p) => (
            <Row key={p.id} active={p.active}>
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.email ?? t("Someone with a login")}
              </span>
              <span className="text-muted-foreground text-xs">
                {p.active ? t("Can sign in") : t("Access taken away")}
                {/* R54: whoever granted a portal login is one of ours — the grant door
                    is not on the portal's surface. The SEARCH above deliberately
                    still reads the stored name, so a colleague remains findable
                    by surname while the line says one word. */}
                {p.grantedByName ? ` · by ${staffNameFromSnapshot(p.grantedByName)}` : ""}
                {p.grantedAt ? ` · ${formatDate(p.grantedAt, lang)}` : ""}
              </span>
              {canRevoke &&
                (p.active ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      ask({
                        title: t("Take this login away?"),
                        body: t(
                          "They won't be able to sign in any more. Everything they're attached to, their records, their history, stays exactly where it is, and you can switch it back on later."
                        ),
                        action: t("Take access away"),
                        run: () =>
                          act(
                            () => tenancy.setPortalAccessActive(p.id, false),
                            t("Access taken away."),
                            t("Couldn't change that login.")
                          ),
                      })
                    }
                    className="text-destructive hover:text-destructive gap-1"
                    aria-label={t("Take access away")}
                  >
                    <Prohibit className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => tenancy.setPortalAccessActive(p.id, true),
                        t("Access switched back on."),
                        t("Couldn't change that login.")
                      )
                    }
                    className="gap-1"
                    aria-label={t("Switch access back on")}
                  >
                    <Power className="size-3.5" /> {t("Switch back on")}
                  </Button>
                ))}
            </Row>
          ))}
        </ul>
      )}
    </div>
  )
}
