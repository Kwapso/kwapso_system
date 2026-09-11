// Everything the content worker is given from outside. This shape structurally
// satisfies the shared GatingEnv (AUTH + DB + the Cloudflare D1 credentials), so
// teamContext / requireRight work here exactly as they do in tenancy.
export type Env = {
  /** THIS REQUEST'S DEFERRER, set by the dispatcher on a per-request shallow
   * copy of this env — how `publishChange` stops holding the response (owner's
   * ruling, 6 Sep 2026). The reasoning, the provenance and why it cannot live on
   * the shared `env` itself are all in shared/workers/parallel.ts.
   *
   * Optional because a cron tick and the test suites have no request to hang
   * work on; absent means the ping is awaited exactly as it was before. */
  DEFER?: (work: Promise<unknown>) => void
  /** THIS REQUEST'S NAME, set on the same per-request shallow copy — the id the
   * public door minted, re-read off the `x-request-id` header and never minted
   * again (shared/workers/trace.ts). `publishChange` and `sendBrandedEmail` read
   * it off `env` and put it on the failure rows they write, so a live-layer ping
   * or an email that did not go out joins the click that ordered it. Nothing
   * else reads it, and nothing gates on it.
   *
   * On the env rather than in the signature for the same reason `DEFER` is:
   * neither seam takes a `Request`, and 190 call sites already pass `env` (186
   * publish + 4 mail, counted 7 Sep 2026).
   *
   * Optional because a cron tick has no request — it puts the TICK's id here
   * instead (`tickId`) — and the suites hand a bare `env`; absent means the row
   * lands exactly as it did before, with nothing to join on. */
  TRACE?: string

  /** The global core database (users, teams, team_members) — read by gating. */
  DB: D1Database
  /** The auth worker — used to answer "who is making this request?". */
  AUTH: Fetcher
  /** The realtime worker — pinged after a write so open screens refresh live. */
  REALTIME: Fetcher
  /** Learning media (uploaded files), served by the gateway. */
  LEARNING_MEDIA: R2Bucket
  /** Ticket media (screen recordings, attachments), served by the gateway. */
  HELP_MEDIA: R2Bucket
  /** The SHARED media bucket, and the only one BOTH front doors serve (`/media/*`
   * on the agency gateway and on the portal gateway alike). A to-do's attachment
   * goes here rather than into HELP_MEDIA for exactly that reason: the client
   * uploads it from the portal and we read it in the agency app, so a bucket only
   * one door can serve would be a file one of the two sides cannot open. */
  MEDIA: R2Bucket
  /** The agency's OWN files — brand assets, staff photos, certificate PDFs, and
   * the documents uploaded into the knowledge base — served by the gateway at
   * /media/internal/. ONE bucket for the internal modules rather than one each:
   * they hold the same kind of object for the same audience, and a bucket per
   * module would be more things to create on a fresh account (BOOTSTRAP.md) for
   * no isolation anybody can point at. The per-team prefix inside it is what
   * keeps teams apart, exactly as it does in the learning and ticket buckets.
   *
   * FOR THE KNOWLEDGE BASE THE CHOICE IS R21's, not R2's: the material there is
   * the agency's own, and `/media/internal/` is served by the AGENCY gateway
   * alone — the portal has no such path — so a capability URL that reached a
   * client has nowhere to be redeemed. The shared MEDIA bucket, which both front
   * doors serve, would have been exactly the wrong shelf for it. */
  INTERNAL_MEDIA: R2Bucket

  /** Cloudflare account id (plain var) — for reaching per-team databases. */
  CF_ACCOUNT_ID: string
  /** THE BUCKET NAMES, BESIDE THEIR BINDINGS — the pair a presigned upload
   * needs. A binding cannot be asked its own bucket name at runtime and an S3
   * presign has to put that name in the signed path, which is the same reason
   * `TEAM_DB_<n>_ID` rides beside its D1 binding. Optional: an environment
   * without them takes the byte-through-the-worker path, which is every
   * environment until the credential below exists. */
  MEDIA_BUCKET?: string
  INTERNAL_MEDIA_BUCKET?: string
  /** The write-only R2 S3 credential, scoped to those two buckets. A SECRET, and
   * absent everywhere until somebody decides to create it — `presignConfigured`
   * is false without it and every upload door behaves exactly as it does today. */
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  /** The AGENCY app's public origin — an email's logo, and the link back to a
   * record for a STAFF recipient. */
  PUBLIC_APP_URL?: string
  /** The CLIENT PORTAL's public origin. The other half of the same job: this
   * worker's emails reach clients as well as staff, and the same ticket has a
   * different address on each front door (R21 · R29). Unset means no button,
   * never an agency link in a client's inbox. */
  PUBLIC_PORTAL_URL?: string

  // Secrets (wrangler secret put):
  /** API token scoped to Account → D1 → Edit. Without it, team databases
   *  can't be reached — handlers fail with a clear cloud_key_missing message. */
  CF_D1_TOKEN?: string
  /** Shared secret for any internal worker-to-worker call (defense-in-depth
   * alongside workers_dev:false). */
  INTERNAL_KEY?: string

  /** Cloudflare Workers AI — the knowledge base's embedding model, AND the cheap
   * model that WRITES the answer a question found (R23). No external key, no
   * external socket: it is a binding, so R11's timeout law is satisfied the way a
   * service binding satisfies it. */
  AI: Ai
  /** Which cheap model writes that answer (shared/workers/model-text.ts). Same var
   * name as data-ops carries, so one setting moves the whole cheap path. */
  WORKERS_AI_MODEL?: string
  /** THE TEAM'S DAILY AI ALLOWANCE — the SAME two knobs data-ops carries, with the
   * same values, because there is one allowance and two workers that spend it now.
   * A cap set on one and not the other is one allowance enforced at two different
   * heights, so credits-invariant.test.ts compares the two wrangler configs. */
  AGENT_FREE_DAILY?: string
  /** Testing environments only: stop ENFORCING the allowance, keep measuring it.
   * Never set on production — the same invariant test fails the build if it is. */
  AGENT_NO_DAILY_CAP?: string
  /** THE KNOWLEDGE BASE'S VECTOR INDEX — one index for the whole account, with
   * every team in its own NAMESPACE (a hard partition applied before the search)
   * and every chunk carrying the labels the router narrows by. The whole
   * argument, and what would change our mind, is at the top of
   * lib/knowledge-vectors.ts.
   *
   * OPTIONAL ON PURPOSE. A binding that is not there is a deployment fact, and
   * the knowledge base answers from its word index alone rather than throwing on
   * every question — degraded, and visibly so, instead of down. BOOTSTRAP.md
   * creates the index and its nine metadata indexes BEFORE anything is ingested:
   * Vectorize does not index metadata retrospectively. */
  KNOWLEDGE_INDEX?: VectorizeIndex

  /** How close a passage must be to the question to count as evidence at all,
   * as a cosine in 0…1. Unset means the measured default in lib/knowledge.ts —
   * this exists because the number belongs to the MODEL, so changing the model
   * without being able to change the floor would mean shipping code to change a
   * threshold. Raise it and the base refuses more; lower it and it starts
   * answering questions it has nothing on. */
  KNOWLEDGE_MIN_SCORE?: string

  /** THE SAME QUESTION, ASKED FOR THE READER'S FLOOR ONLY (BUILD-5 §5-6). When
   * `retrieve()` is handed a reader, it decides what is real evidence by
   * actually reading it rather than trusting a raw cosine — so this floor only
   * has to guard against pure nonsense, not carry the whole decision the way
   * `KNOWLEDGE_MIN_SCORE` does. A SEPARATE var, not a second meaning for that
   * one: see `retrieve`'s own comment for why sharing one var would have made
   * pinning `KNOWLEDGE_MIN_SCORE` (which every test in this suite does)
   * silently pin this too. Unset means `READER_HALLUCINATION_FLOOR`
   * (lib/knowledge.ts). */
  KNOWLEDGE_READER_MIN_SCORE?: string
  /** WHICH MODEL RE-READS THE SHORTLIST, and how many tokens it may spend
   * doing it. Both default to the constants in `knowledge-reader.ts` and both
   * exist so the choice can be MEASURED rather than argued — the same property
   * `kb-bench.mjs` already gives the writer. The reader's model was pinned to
   * a reasoning model on the untested sentence "a shortlist judgment is a
   * harder read"; measured 11 Sep 2026, that model cannot finish the job on a
   * real twelve-passage shortlist, because its chain of thought is billed
   * against the same ceiling as its answer. */
  KNOWLEDGE_READER_MODEL?: string
  KNOWLEDGE_READER_MAX_TOKENS?: string

  /** The embedding model id, so swapping it is config rather than a deploy of
   * new code. Whatever it is, it must be the SAME model that wrote the vectors
   * already stored — a change here makes every existing embedding incomparable,
   * and `similarity` reads that as "no evidence" (0) rather than as a wrong
   * answer, so the base degrades to its lexical half until the sweep re-indexes.
   * AND IT MUST MATCH THE INDEX'S DIMENSIONS, which are fixed when the index is
   * created — so this is now a deploy-time pair, not a lone switch.
   *
   * Defaults to @cf/baai/bge-m3 (1024 dimensions), which replaced
   * bge-small-en-v1.5 (384) for a reason that is specific to this app: half the
   * agency's tickets are in German and the rest are in English, often in the
   * same thread. bge-small is English-only, so every German ticket was being
   * embedded by a model that could not read it. bge-m3 is multilingual, and at
   * $0.012 per million tokens the whole difference is pennies a month. */
  KNOWLEDGE_EMBED_MODEL?: string

  // ── GOOGLE CONNECTIONS ──────────────────────────────────────────────────────
  // A DIFFERENT OAuth app from the one that signs people in (auth's
  // GOOGLE_CLIENT_ID). That app asks Google "who is this?" and needs no review;
  // this one asks for Drive, Gmail, Calendar and Chat, goes through Google's
  // verification, and shows a consent screen nobody should be walked past just
  // to log in. Unset = the Connect button is not offered and nothing else in the
  // product changes.
  /** The connect app's client id. */
  GOOGLE_CONNECT_CLIENT_ID?: string
  /** Its secret (wrangler secret put). */
  GOOGLE_CONNECT_CLIENT_SECRET?: string
  /** 32 random bytes, base64 — the key the stored Google tokens are encrypted
   * under (lib/google-crypto.ts). Held nowhere the database is: a dump of
   * `google_connections` without this is a list of email addresses. Unset = no
   * connection can be made, deliberately, rather than a token written in the
   * clear "for now". */
  GOOGLE_TOKEN_KEY?: string
  /** Local development only: drop `Secure` from the one-shot OAuth cookie so the
   * round-trip works over plain http on localhost. Never set in either deployed
   * environment — the same switch auth carries, for the same reason. */
  INSECURE_COOKIE?: string
}
