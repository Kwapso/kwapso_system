"use client"

// /new resolves INSIDE the one deep-link shell (client-resolved from the URL) —
// soft History-API nav, no reload. The content is NewTabScreen, the `Where to?`
// page with the search bar (deep-link-screen.tsx dispatches to it on
// `module === "new"`). Single level on purpose: `NEW_TAB_PATH` is the whole
// address, nothing ever appends an id to it, so this never grows a sub-path the
// gateway's own `SHELL_MODULES` list would have to be told about.
//
// WHY THIS FILE EXISTS AT ALL, since /new has worked since the strip grew its
// "+". It worked SOFTLY. `openNewTab` + `softNavigate(NEW_TAB_PATH)` never
// leaves the mounted shell, so the address changed and no page was ever
// fetched for it — and with no route file here the static export emitted no
// `new.html`, so a RELOAD (or a pasted link, or a restored session) at /new was
// answered by the asset layer's 404 page. The gateway's `SHELL_MODULES` does
// not cover it either: that list forwards DEPTH under a module (/tickets/<id>),
// and /new has no depth to forward — it is the flat path itself that was
// missing, exactly as /home, /kwapso and /invitations each need their own file.
//
// It became reachable enough to matter on 23 Sep 2026, when closing the LAST
// folder tab started landing here (the client's ruling, see `closeTabAndLand`
// in web/lib/workspace-tabs.ts). Before that ruling the same close landed on an
// ordinary collection address, which has a real file and reloads fine; after
// it, "close the last tab, then reload" is an ordinary thing to do and used to
// end on the 404 page.

import { DeepLinkScreen } from "@/components/deep-link/deep-link-screen"

export default function NewTabPage() {
  return <DeepLinkScreen />
}
