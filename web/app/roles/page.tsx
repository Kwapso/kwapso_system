"use client"

// Member roles no longer has a page of its own. The standalone collection this
// path used to redirect to (/t/<teamId>/roles, with its own Members · Member
// roles · Invites tab strip) is retired — client ruling, 2026-09-14, over a
// screenshot of exactly that page: "what is this? told you to kill it. Now
// this only lives on settings / team." Every role's own grid has lived on
// Settings › Team since 2026-09-09 (web/components/team/roles-matrix.tsx);
// this shim just stops handing out an address for a screen the app no longer
// draws. No teamId to wait for any more — Settings resolves the active team
// itself.

import * as React from "react"
import { useRouter } from "next/navigation"

import { ShellLoading } from "@/components/shell/app-shell"

export default function RolesRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/settings?tab=team")
  }, [router])
  return <ShellLoading />
}
