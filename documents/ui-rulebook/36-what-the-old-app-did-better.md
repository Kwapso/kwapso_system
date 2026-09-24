# What the old app did better

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## What the old app did better

Four things Glide got right that this app currently gets wrong. Each is the reason a
whole section above exists.

### 1. It hid the actions people rarely take

`A-4.05.52`: a story detail with one visible button, "In progress", and a three-dot menu
holding Blocked, Edit, Archive and Delete. `A-3.57.42`: a meeting detail with nothing but
a three-dot. `P-4.10.05`: a portal app detail with exactly "Open App" and "New Ticket".

Here, `web/components/tickets/help-detail.tsx:418-539` puts Translate, Answer, Reply by email,
Make it a story, Edit, Archive, Move up and Move down on the same screen region, and the
codebase contains no overflow menu at all. The old app made the primary action obvious by
removing its competitors. See [B1](#b1-two-visible-actions-maximum-on-any-title) and
[B2](#b2-the-three-dot-menu).

### 2. It kept context while you scrolled

`A-4.00.19` compared with `A-4.00.30` and `A-4.00.37`: the header band scrolls away and
the tab strip pins to the top of the viewport, badges intact, so you always know which
record and which tab you are in. Nothing in this app is sticky below the shell chrome,
so scrolling a long ticket loses the title, the tabs and the record entirely. See
[D3](#d3-the-header-and-tabs-stick).

### 3. It put almost nothing in a collection row

`A-3.58.53`: contact rows are a name and a company. `P-4.10.05`: ticket rows are a title
and "Created on 6 August 2026 · Paras Maroo". `A-4.00.11`: sprint rows are a name and a
date range. When more facts were genuinely needed it switched to a table with column
headers (`A-4.05.42`) rather than cramming them into a subtitle.

Here, `web/components/deep-link/shape.tsx` built a ticket subtitle out of four facts and
prefixed the reference into the title as well; `work/stories-screen.tsx` used five. The
result was a wall of text with no shape. *(Fact updated 7 Sep 2026: both are fixed.
`shapeHelpList` is now a title plus two facts — status and kind — and `shapeStories` a
title plus three — status, who has it, when it is due — with the ref, the sprint and the
answered ticket moved onto the record. The diagnosis is kept because it is what the rule
below is FOR.)* See
[K1](#k1-a-collection-row-is-a-title-plus-one-meta-line-and-nothing-else) and
[K2](#k2-a-table-is-for-scanning-a-list-is-for-reading).

### 4. It used the whole screen

`A-4.06.36`, `A-4.05.42`, `A-4.08.47`: content runs edge to edge with a gutter of roughly
45px and no width cap, so a table of nine stories shows five columns without truncating
any of them. This app caps every module screen at 768px
(`web/components/deep-link/deep-link-screen.tsx:330`), so the same table would truncate at column
two while 138px of empty page sits on either side, and over 700px on a large display. See
[L1](#l1-one-page-container-one-cap).

### Honourable mention: the one form said "Submit"

`P-4.10.31` and `P-4.10.36`. One word, with Cancel beside it, in a bar pinned to the
bottom of a scrolling sheet. This app has 31 different words for the same act. See
[F1](#f1-every-submit-button-says-submit) and [F2](#f2-the-dialog-is-a-three-row-grid-and-never-spills).

---
