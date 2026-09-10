"use client"

// YOUR OWN PAGE — who you are, how we reach you, and what you have done.
//
// WHY IT IS NOT A TAB ON SETTINGS ANY MORE. Who you are is not the same question
// as how the app is set up: Settings holds the tokens a machine holds, the Google
// account this deployment may act through, the invitations waiting for you to
// accept. A tester looking for "change my name" opened Settings, found a strip
// called Account / Teams / Access, and had to guess — which is the owner's own
// note, and the reason this is a destination of its own reached from the profile
// menu, where a person already looks for themselves. That reasoning is unchanged
// and it is why your name, your email address and your history are here.
//
// THE LANGUAGE LEFT AGAIN ON 2026-09-10, and only the language. The client:
// *"language shoudl be in settings somewhere, not in my porfile"*. It came here
// in August under a wider version of the sentence above — everything about a
// PERSON on this page, everything about the APP on Settings — and that version
// was too wide, because the app's size, its light or dark and the sidebar's
// colour are every bit as personal and have never been anywhere but Settings ›
// Appearance. Language is a DISPLAY choice, not an identity one, so it now sits
// with the other three (screens/settings-screen.tsx, the Appearance tab). The
// August move stands for everything else on this screen.
//
// It carries no team scope at all. A profile and an email address belong to the
// person and follow them into any team they are in, so this screen renders
// directly in the shell beside /home and /settings rather than under
// /t/<teamId>.

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { List } from "@shared/web/list-compat"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { ActivityFeed } from "@shared/ui/components/activity-feed/activity-feed"
import { Envelope } from "@shared/ui/foundations/icons"
import { ShapeStateBody } from "@shared/ui/compositions/states/states"

import { EmailChangeDialog } from "@/components/team/email-change-dialog"
import { ProfileDialog } from "@/components/team/profile-dialog"
import { auth } from "@/lib/api"
import { formatDateTime } from "@shared/web/format"
import { personName, personInitials } from "@/lib/identity"
import { useCached } from "@shared/web/store"
import type { ActiveTeam } from "@/lib/use-active-team"
import { useLanguage } from "@shared/web/language"

export function ProfileScreen({ active }: { active: ActiveTeam }) {
  const { t, lang } = useLanguage()
  const [editing, setEditing] = React.useState(false)
  const [changingEmail, setChangingEmail] = React.useState(false)
  const { user } = active
  // The same cache key Settings used to read this under, so a person who lands
  // here from either direction sees it already warm.
  const accountActivityQ = useCached("account-activity", () => auth.activity().then((r) => r.activity))

  const name = personName({ firstName: user?.firstName, lastName: user?.lastName }) || "You"

  return (
    <>
      <div className="flex w-full flex-col gap-12">
        <section className="motion-panel-in flex flex-col gap-4">
          <List
            surface="none"
            className="rounded-[var(--radius)] bg-surface-panel"
            items={[
              {
                id: "profile",
                image: user?.imageUrl,
                imageAlt: name,
                initials: personInitials(user?.firstName, user?.lastName),
                title: name,
                trailing: (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    {t("Edit profile")}
                  </Button>
                ),
              },
              {
                id: "email",
                leading: (
                  <div className="text-muted-foreground flex size-9 items-center justify-center">
                    <Envelope className="size-4" />
                  </div>
                ),
                title: user?.email,
                trailing: (
                  <Button variant="secondary" size="sm" onClick={() => setChangingEmail(true)}>
                    {t("Change email")}
                  </Button>
                ),
              },
            ]}
          />
        </section>

        <section className="motion-panel-in flex flex-col gap-4">
          <h2 className="text-muted-foreground text-micro uppercase">
            {t("Account activity")}
          </h2>
          {/* ONE BOX, WHATEVER THIS SECTION IS SAYING (R67) — client, 2026-09-10:
            * "nothing shoudl sit on the white, everything contained!" The feed,
            * its skeleton and its error all stood directly on the page ground
            * while the block above them sat on soft paper, so this section read
            * as the one unfinished thing on the screen. */}
          <div className="flex flex-col rounded-[var(--radius)] bg-surface-panel p-4">
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
        </section>
      </div>

      <ProfileDialog open={editing} onOpenChange={setEditing} user={user} onSaved={active.refresh} />
      <EmailChangeDialog
        open={changingEmail}
        onOpenChange={setChangingEmail}
        currentEmail={user?.email ?? ""}
        onSaved={active.refresh}
      />
    </>
  )
}
