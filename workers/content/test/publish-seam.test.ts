// R1 — the live-sync seam for CONTENT (CACHING.md "Every mutation publishes").
// The scan itself is shared (shared/rules/seam-scan.ts); what lives here is the
// only thing that is genuinely this worker's — the reviewed housekeeping set.
//
// R10 used to be checked HERE as well, in a second, weaker copy sitting beside
// the real one in gating-seam.test.ts. It is gone: one law, one check.

import { join } from "node:path"

import { publishSeam } from "@shared/rules/seam-scan"
import { ROUTES } from "../src/index"

/** The ONLY writes allowed to broadcast nothing. Changing this set is a
 * conscious, reviewed decision — that's the point: you can't dodge live-sync by
 * quietly flipping a mutation to "housekeeping". */
const HOUSEKEEPING = [
  // Stores an uploaded file in R2 but changes no record — there's no row to
  // patch, so nothing to broadcast (the create/edit that references the file
  // pings its own row).
  //
  // EACH OF THESE COMES IN A PAIR since 2026-08-17: the buffered door that took a
  // base64 data URL, and the `-stream` door beside it that takes the file as the
  // request body. Streaming changed how the bytes ARRIVE and nothing at all about
  // what they change — still a file and still no row — so the reasoning above
  // covers both halves, and the pair is listed rather than the rule loosened.
  //
  // The caller's OWN timer preference (does starting one stop the others?). It
  // changes no record anybody else can see and no screen anybody else is looking
  // at, so there is nothing for a ping to patch.
  "POST /api/content/work-logs/auto-stop",
  // PERMISSION TO PUT A FILE, and not the file. This one is further from a
  // mutation than the byte-shovels below it: they at least put an object in a
  // bucket, and this writes NOTHING — no row, no object, no counter. It decides
  // whether a caller may upload, mints the key, and signs. A POST because it
  // carries a body and must not sit in a URL, not because it changes state.
  // The row is written later by the module's own door, which publishes there.
  "POST /api/content/uploads/presign",
  // A phase's burndown series (round-28 ruling, team migration 0110). A read,
  // work:read, no `publishChange`, shaped as a POST because the phase id
  // travels as a body field rather than a query string ("GET-style POST",
  // Aurora's own words); there is no row it changes and so nothing to ping.
  "POST /api/content/stories/burndown",
  // A story's own Cycle time / Effort / Flow efficiency (`getStoryMetrics`).
  // A read, work:read, no `publishChange`, the same "GET-style POST" shape
  // as the burndown door immediately above it: nothing here changes a row,
  // it is computed fresh off `work_logs`/`story_status_events` every time.
  "POST /api/content/stories/metrics",
  // "THE BYTES ARE UP" — the third step of the same upload. It LOOKS (`head`)
  // and answers the reference; it writes no row, no object and no counter.
  // The module's own door writes the row and publishes there, exactly as it
  // does after the streaming doors below.
  "POST /api/content/uploads/confirm",
  // The agency's own housekeeping: two more byte-shovels, same reasoning. The
  // brand library re-hosts 74 legacy files that die with the Glide account, and
  // a staff photo lands the same way. Neither writes a row
  // — the create/edit that references the URL pings its own.
  "POST /api/content/brand-assets/upload",
  "POST /api/content/brand-assets/upload-stream",
  "POST /api/content/staff/upload",
  "POST /api/content/staff/upload-stream",
  // The bytes behind a deliverable — a handover PDF, a recorded walkthrough.
  // Same reasoning, and NO buffered twin: it was written after the pair above
  // stopped being worth shipping, so there is one door and it streams.
  "POST /api/content/deliverables/upload-stream",
]

publishSeam({
  name: "content",
  routes: ROUTES,
  src: join(__dirname, "..", "src"),
  minRoutes: 8,
  housekeeping: HOUSEKEEPING,
  // None today — every content mutation publishes directly in its route handler.
  indirectPublishers: [],
})
