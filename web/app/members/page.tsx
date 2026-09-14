"use client"

// Members no longer has a page of its own. The standalone collection this
// path used to redirect to (/t/<teamId>/members, with its own Members ·
// Member roles · Invites tab strip) is retired — client ruling, 2026-09-14,
// over a screenshot of exactly that page: "what is this? told you to kill it.
// Now this only lives on settings / team." Team management is reachable only
// from Settings › Team now (web/lib/pages.ts carries the whole decision, and
// web/components/deep-link/module-content.tsx sends the team-scoped address
// itself to the same place), so an old bookmark to THIS path lands there too
// rather than at a screen this app no longer draws. No teamId to wait for any
// more — Settings resolves the active team itself.

import * as React from "react"
import { useRouter } from "next/navigation"

import { ShellLoading } from "@/components/shell/app-shell"

export default function MembersRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/settings?tab=team")
  }, [router])
  return <ShellLoading />
}
