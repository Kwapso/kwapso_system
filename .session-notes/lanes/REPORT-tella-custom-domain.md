# REPORT — Tella custom domains are invisible to `LINK_TYPES` (two real bugs, found, not fixed)

**Lane:** kb_B2. **Found while smoke-testing `b-loom` against the owner's real link:**
`https://content.kwapso.com/video/hogo-cv-upload-optimised-5snm`

`b-loom` passes tonight on the honest-refusal branch — `classifyLink()` returns `null` for
this URL, so `extractLink` (`workers/content/src/lib/knowledge-files.ts:263-269`) writes:

> "We can't read this link, so it is kept here but the assistant can't answer from it.
> Anything you type into the note below IS searchable."

That is a real, upfront refusal and satisfies the row as written. **Not fixed tonight, on
purpose** — a real bug found at a cutoff gets written down, not rushed. Both bugs below are
inside `source-readers.ts` and in scope for this lane whenever picked up.

## The load-bearing half: Tella supports custom domains, and `LINK_TYPES` is host-only

`content.kwapso.com` is not a kwapso-built video feature — it is a genuine Tella recording,
confirmed from the live response, not assumed:

```
curl -sI https://content.kwapso.com/video/hogo-cv-upload-optimised-5snm
  x-matched-path: /[domain]/video/[id]        ← Tella's own Next.js routing shape
  link: …<https://www.tella.tv/api/stories/…/thumb.webp>; rel=preload …

curl -s https://content.kwapso.com/video/hogo-cv-upload-optimised-5snm | grep oembed
  <link rel="alternate" href="https://www.tella.tv/api/oembed?…" type="application/json+oembed"/>
```

`LINK_TYPES`'s Tella entry (`source-readers.ts`) matches on host: `["tella.tv", "tella.video"]`.
A custom domain can be anything a Tella customer points a CNAME at — there is no way to
enumerate it by host, ever. **This is not a one-off gap for this one link: it means EVERY
Tella recording the owner pastes from his own branded domain misses the table, every time,
silently classified as "unrecognized link" rather than "Tella, best-effort".** The refusal
sentence produced today is honest, but it is the WRONG honest sentence — it says "we can't
read this link" (implying nobody home) rather than "no public transcript" (the real, narrower
reason `LINK_TYPES`'s Loom/Tella entries already state for the hosts they DO recognize).

**A host list can never close this gap by adding more entries** — the fix, when it is picked
up, is detection by content (the standard oEmbed auto-discovery `<link>` tag already present
on the page, exactly as shown above) as a fallback when the host is unrecognized, not a
bigger host list. That is a real design change to `readersForLink`'s current "host only, no
bytes fetched to classify" contract (stated in its own header comment) and deserves a ruling,
not a rushed patch.

## The second, independent bug: the reader's own oEmbed URL is wrong

Once a Tella host IS recognized, `runLinkReader` calls:

```
readOEmbedTitle("https://www.tella.tv/oembed", url)
```

Measured live: `GET https://www.tella.tv/oembed?url=…` → **HTTP 404** (a real Next.js
not-found page, not a redirect). The correct, working path is `/api/oembed`, exactly what the
page's own discovery `<link>` above points at:

```
curl -s "https://www.tella.tv/api/oembed?url=https%3A%2F%2Fcontent.kwapso.com%2Fvideo%2Fhogo-cv-upload-optimised-5snm"
  → 200 {"title":"Hogo: CV Upload Optimised", "provider_name":"content.kwapso.com", …}
```

This one bug affects `tella.tv`/`tella.video` links TOO, once the domain gap above is closed
— today it means even a plain `tella.tv/...` link would fail the oEmbed lookup and fall
through to the "no public transcript" honest refusal rather than getting the real (weak
signal) title. Never caught before because — per the reader's own header comment — it was
never smoke-tested against a live Tella account until tonight.

## What would need to change (not built, a sketch for whoever picks this up)

1. `runLinkReader`'s Tella/Loom branch: `https://www.tella.tv/oembed` → `https://www.tella.tv/api/oembed`. One-line, low-risk, verified against a live endpoint above.
2. `readersForLink`/`classifyLink` need a content-based fallback for an unrecognized host: fetch the page (bounded, same timeout `readLink` already uses), look for `<link type="application/json+oembed" href="…">`, and if the discovered href's own host is a known `LINK_TYPES` entry, treat the URL as that type. This is the standard oEmbed discovery mechanism, not a scrape hack — but it changes `readersForLink` from a synchronous, host-only lookup into something that may need a fetch, which touches its documented contract and the two doors that call it (R42) — worth a look at both before building it.

Verified read-only, no code changed, no deploy. Reported for tonight's tracker; picked up whenever the hub assigns it.
