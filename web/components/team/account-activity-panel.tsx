"use client"

// THE SIGNED-IN PERSON'S OWN IDENTITY TRAIL — the retired `/profile` page's
// "Account activity" section, unchanged, now mounted on the member's own
// record (member-screen.tsx) for `member.isYou` only.
//
// NOT THE SAME FEED AS A RECORD'S OWN ACTIVITY (R5). `member-screen.tsx`
// already draws the TEAM'S generic (table, id) read through the ink footer —
// "Member joined", "Member role changed", "Member removed" — written by
// `workers/tenancy/src/lib/members.ts` into the PER-TEAM database.
// `account_activity` is a different table in a different database — the
// GLOBAL core DB, `workers/auth/src/lib/account-activity.ts` — recording the
// person's OWN identity history (a name/photo/email change, a sign-in from a
// new device) across every team they are in; that file's own header says why
// R5's generic path deliberately does not reach it. There is no `userId`
// argument on the door — `auth.me()`'s session decides — so nobody but the
// signed-in person can ever read this, which is why the caller mounts this
// only on their own row.
//
// A SEPARATE FILE ON PURPOSE, not inlined into member-screen.tsx: R2's own
// census (`record-detail-tabs`, web/test/rules.test.ts) flags any component
// shaped like a record detail (draws `<RecordScreen>`) that ALSO hand-rolls
// an `<ActivityFeed>` — the tell for a second, competing copy of the team's
// own R5 pairing. This is not that: it is a genuinely different door reading
// a genuinely different table, exempted from R5 by design rather than a
// duplicate somebody forgot to route through `ActivityPanel`. Keeping it in
// its own file, reached only by composition, is what lets the census still
// catch the shape it was built for without a positional exception to argue
// about every time this feed is read.

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ActivityFeed } from "@shared/ui/components/activity-feed/activity-feed"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import { auth } from "@/lib/api"
import { formatDateTime } from "@shared/web/format"
import { useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"

export function AccountActivityPanel() {
  const { t, lang } = useLanguage()
  // Same cache key the old `/profile` page read, so a person who has this
  // warm from before still does.
  const accountActivityQ = useCached("account-activity", () => auth.activity().then((r) => r.activity))

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{t("Account activity")}</h2>
      {accountActivityQ.error ? (
        <ShapeStateBody
          shape="recordChrome"
          state="error"
          copy={{ errorTitle: t("Couldn't load your activity.") }}
          action={
            <Button variant="secondary" onClick={() => accountActivityQ.refresh()}>
              {t("Try again")}
            </Button>
          }
        />
      ) : accountActivityQ.data === undefined ? (
        <Skeleton variant="list" lines={3} />
      ) : (
        <ActivityFeed
          reverse
          emptyLabel={t("No account activity yet.")}
          items={accountActivityQ.data.map((a) => ({
            id: a.id,
            description: a.description,
            time: formatDateTime(a.createdAt, lang),
          }))}
        />
      )}
    </div>
  )
}
