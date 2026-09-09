// THE THREE THINGS THE ATTACHMENT PANEL NEEDS — and one of them is a security
// check, which is the reason this file exists rather than a preference.
//
// A ticket's attachments and a story's attachments were two panels that agreed
// on almost everything and legitimately differed on three things: their door,
// their cache key, and their words. What they were NOT allowed to differ about
// is which URLs may be put in an `href`, and until 6 Sep 2026 that decision was
// written out twice, character for character, in help-attachments.tsx and
// story-attachments.tsx. Two copies of a security check is one check and one
// thing that looks like it — the same argument shared/rules/seam-scan.ts makes
// about its own scanner, and the reason R40 cares about `href` at all.
//
// The rest of the two panels followed the same way on 7 Sep 2026: the list is
// `web/components/records/record-attachments.tsx` and the two module files hand
// it their door, their key and their two sentences. This file kept its own
// place, because a security check that lives inside the component it protects
// is one a second component cannot borrow — which is how it came to be written
// twice in the first place.
//
// THE CLIENT PORTAL KEEPS ITS OWN, DELIBERATELY, and this file must not swallow
// it. `web-portal/components/ticket-attachments.tsx` applies a STRICTER policy —
// plainly-the-web only, so no `mailto:` — on top of the same `safeHref` seam,
// and its comment says why. Folding all three together would quietly loosen the
// portal to the agency's rule, which is the opposite of what a client's screen
// should get. Two front doors, one seam underneath, two policies on top of it.

import { safeHref } from "@shared/web/rich-text"
import { TICKET_FILE_MAX_BYTES } from "@shared/workers/limits"

/** WILL WE PUT THIS IN AN `href`? (The seam that answers it is `safeHref`; this
 * says which of ITS answers the agency's screens also accept.)
 *
 * The door refuses anything but http(s) on a link, and stores a file as our own
 * `/media/<key>` path — so this should never be false. It is checked anyway, and
 * the reason is the shape of the failure rather than its likelihood: an
 * attachment can be put on a ticket by a CLIENT login, it renders on a page a
 * staff member already trusts, and `javascript:` in an `href` there is stored
 * XSS. A row written before the door was tightened, or by a future door somebody
 * adds, must not become one. Anything unrecognised is printed as text. */
export function isFollowable(url: string): boolean {
  return safeHref(url) !== undefined
}

/** A file size in the words a person uses. Empty for a row that never carried
 * one — an unknown size is said with nothing, never with "0 KB". */
export function spellSize(bytes: number | null): string {
  if (!bytes) return ""
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** The ceiling, spelled for the upload hint. Derived from the one cap in
 * limits.ts so the sentence a person reads and the number the door enforces
 * cannot drift. */
export const MAX_SIZE_LABEL = `${Math.round(TICKET_FILE_MAX_BYTES / 1024 / 1024)} MB`
