"use client"

// The Invitations inbox — where the invite email's "Join" button lands. A content
// component rendered inside the one deep-link shell (the shell provides AppShell chrome).

import { Headline } from "@shared/ui/components/typography/typography"
import { InvitationsPanel } from "@/components/team/invitations"
import type { ActiveTeam } from "@/lib/use-active-team"
import { useT } from "@shared/web/language"

export function InvitationsScreen({ active }: { active: ActiveTeam }) {
  const t = useT()
  return (
    <div className="flex w-full flex-col gap-6">
      {/* THE SAME TITLE TREATMENT EVERY SIBLING SCREEN DRAWS — a plain page
          title, no eyebrow, no chip (the kit's own "Page title" step,
          display-m/56/500), the identical shape `module-settings-screen.tsx`
          and `settings-screen.tsx` draw one screen over: a bare `<h1>` is
          what a MAIN screen takes, and this is one — it is its own address
          (where the invite email's "Join" button lands), it has a workspace
          tab, and it is not a record. Fixed 21 Sep 2026: this screen used to
          render only a micro uppercase `<h2>` and no page title at all — the
          one main screen in the app without one. */}
      <Headline as="h1" size="display-m">{t("Invitations")}</Headline>
      {/* THE OLD SENTENCE, KEPT AS THE SECTION'S OWN LABEL — it still adds
          meaning under the new title: "Invitations" names the screen,
          "Invites waiting for you" says whose list this is, the exact same
          micro-uppercase eyebrow `settings-screen.tsx` prints above its own
          `<InvitationsPanel>` for the identical reason. */}
      <h2 className="text-muted-foreground text-micro uppercase">
        {t("Invites waiting for you")}
      </h2>
      <InvitationsPanel refresh={active.refresh} />
    </div>
  )
}
