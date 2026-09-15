"use client"

// APP MARK — the square an app is known by, wherever one is drawn.
//
// UI-RULEBOOK K9 allows a card grid exactly where a record carries an image, and
// G3 says the type mark sits in a rounded square where a logo would. An app has
// both, and since 0037_app_logo it has the second one for real: the client's own
// mark where they have one, the stage mark where they do not.
//
// THE WALL OF TILES THIS FILE USED TO DRAW LEFT ON 15 SEP 2026, with the client's
// ruling that replaced it: "For the main screen for the apps, I want the gallery
// icon laid out … I also want you to add an alternate view board by stage." The
// hand-rolled `<a>` tile below was never a kit `<Card>`/`<CardTitle>`, so it could
// never have carried R65/K16's "chip above title" — the new Gallery draws a real
// kit `Card` instead (`apps-screen.tsx`'s own `appsGalleryCard`), and the new
// Board is the kit's `Kanban`. `AppMark` is the one thing both of those, and every
// other screen that draws an app's face, still read from here.

import * as React from "react"

import { RecordMark } from "@shared/web/record-mark"
import { appStageMark } from "@shared/app-stages"
import type { AppRow } from "@shared/types"

/** THE SQUARE AN APP IS KNOWN BY — its logo, or the stage mark it has always
 * drawn. It reads the two things an APP has that no other record does (its stage
 * mark, and its logo column) and hands them to the ONE mark every record on both
 * front doors is drawn with (`shared/web/record-mark.tsx`).
 *
 * It was that component first, alone, and everything the header there says about
 * a stored path outliving its bytes was learned here (web/test/app-mark.test.tsx,
 * which still holds this signature to it). What changed on 19 Aug 2026 is that
 * every OTHER record got the same treatment instead of one of thirteen others, so
 * the state, the `safeSrc` call and the `onError` fallback moved to where they
 * are shared and this became the two lines that are actually about an app. */
export function AppMark({
  app,
  size = "tile",
}: {
  app: AppRow
  size?: React.ComponentProps<typeof RecordMark>["size"]
}) {
  return <RecordMark picture={app.logoUrl} mark={appStageMark(app.stage)} name={app.name} size={size} />
}
