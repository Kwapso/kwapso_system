// A TIME-LIMITED PERMISSION TO PUT ONE OBJECT, AND NOTHING ELSE.
//
// Every byte of every upload currently passes through a worker: the browser
// POSTs the file to a door, the door validates it and calls `bucket.put`. That
// is correct and it costs worker CPU and bandwidth proportional to the file, on
// a platform that caps a request body at 100 MB however well we stream it
// (`STREAM_UPLOAD_MAX_BYTES` sits under that wall and says so). A presigned URL
// takes the worker out of the byte path: it signs a PUT the browser makes
// directly to R2, and the door goes back to doing what a door is for — deciding
// whether this caller may upload at all, and where.
//
// ── WHY THIS DOES NOT WIDEN THE OPEN CAPABILITY-URL FINDING ─────────────────
//
// `/media/*` serves any object whose key you know, with no session — a recorded
// owner decision (SCOPE ch.06), and the standing finding against it is that
// those URLs are never REVOKED when a record is archived. A presigned upload URL
// is a capability URL too, so the question was asked directly and the answer is
// the difference between the two:
//
//   · that finding is about PERMANENCE. A presigned PUT carries its own expiry
//     in the signature and is refused by R2 the moment it passes — it is
//     self-revoking by construction, which is the opposite property.
//   · it grants WRITE, to ONE key that does not yet exist. Not read, not
//     delete, not a prefix.
//   · the READ path does not change. The bytes come back through `/media/<key>`
//     exactly as they do today, so the number of never-revoked read URLs is the
//     same before and after.
//
// ── THE THREE THINGS THAT MAKE IT SAFE, AND ONE OF THEM IS NOT IN THIS FILE ─
//
//  1 · THE KEY IS MINTED SERVER-SIDE. Never off a request body. A caller who
//      chose their own key could presign a PUT over another team's object —
//      which is the integrity hole `unreferencedKeys` closes, reopened one layer
//      down where the database check cannot see it. This file signs whatever key
//      it is handed; the DOOR is what must never hand it a caller's string, and
//      `presign-key-is-ours.test.ts` is what holds the door to it.
//  2 · ONE KEY, `PUT` ONLY, MINUTES OF EXPIRY. Below.
//  3 · THE CREDENTIAL IS WRITE-ONLY AND SCOPED TO TWO BUCKETS. That is an
//      infrastructure property this code cannot enforce and must not pretend to:
//      an account-scoped key would turn a worker compromise from "can write
//      through gated doors" into "can read and delete every object in every
//      bucket". It is the CONDITION the owner's approval rests on, written out
//      in the lane report's apply-list, and it is applied by a person.
//
// ── AND IT IS OFF UNTIL SOMEBODY TURNS IT ON ────────────────────────────────
//
// `presignConfigured` is false when the credential is absent, and every caller
// falls back to the path it has today — bytes through the worker, byte for byte
// unchanged. Same shape as the rate-limit binding, whose own file says the code
// "FAILS OPEN if this block is missing, which is what makes it safe to deploy
// the worker before adding the binding". So this lands with no behaviour change
// and switches on later, rather than holding a merge hostage to a decision about
// a Cloudflare account shared with two other companies.

/** What signing needs. Absent in every environment until the credential is
 * created, which is the ordinary case today. */
export type PresignEnv = {
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  CF_ACCOUNT_ID: string
}

/** Is direct-to-R2 available in this environment? Callers branch on this and
 * take the proxy path when it is false — never throw, never refuse an upload
 * because an optional accelerator is unconfigured. */
export function presignConfigured(env: PresignEnv): boolean {
  return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY)
}

/** HOW LONG A SIGNED PUT STAYS VALID.
 *
 * Long enough that a slow connection can finish a large file, short enough that
 * a URL captured from a log or a browser history is worthless by the time
 * anybody reads it. Five minutes is the upload's START deadline, not its
 * duration — R2 checks the signature when the request arrives, so a PUT that
 * begins at 4:59 may run as long as it needs. */
export const PRESIGN_TTL_SECONDS = 300

/** R2 speaks S3, and its region is the literal string `auto`. */
const REGION = "auto"
const SERVICE = "s3"

const enc = new TextEncoder()

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey(
    "raw",
    key as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return crypto.subtle.sign("HMAC", k, enc.encode(data))
}

const hex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")

async function sha256Hex(input: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(input)))
}

/** RFC 3986 escaping, applied per PATH SEGMENT.
 *
 * `encodeURIComponent` leaves `!'()*` alone and AWS's canonicalisation does not,
 * so a key containing one would sign a different string from the one R2 reads
 * and the PUT would be refused with a signature mismatch — the kind of failure
 * that looks like a credential problem and is not. Slashes are preserved by
 * escaping each segment separately: R2 keys are `team/module/ulid`, and the
 * separators are structure rather than content. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((seg) =>
      encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    )
    .join("/")
}

/**
 * A URL the browser may `PUT` one object to, and nothing else.
 *
 * `bucket` and `key` are the door's own values — see the note above about why
 * neither may come from a request body.
 *
 * Returns null when the credential is absent, so a caller that forgot to check
 * `presignConfigured` still degrades to the proxy path rather than throwing on
 * somebody's upload.
 */
export async function presignPut(
  env: PresignEnv,
  bucket: string,
  key: string,
  opts: { contentType?: string; contentLength?: number; ttlSeconds?: number } = {}
): Promise<string | null> {
  if (!presignConfigured(env)) return null
  return signedQueryUrl({
    method: "PUT",
    host: `${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    canonicalUri: `/${bucket}/${encodeKey(key)}`,
    accessKey: env.R2_ACCESS_KEY_ID as string,
    secret: env.R2_SECRET_ACCESS_KEY as string,
    region: REGION,
    expiresIn: opts.ttlSeconds ?? PRESIGN_TTL_SECONDS,
    contentType: opts.contentType,
    contentLength: opts.contentLength,
    now: new Date(),
  })
}

/** THE SIGNATURE ITSELF, with every input a parameter.
 *
 * Split out from `presignPut` for ONE reason: so a test can drive AWS's own
 * published presigned-URL vector through the real code path. A signer verified
 * only by "it returns a plausible-looking string" is a signer nobody has
 * checked — and the failure mode is a signature R2 refuses, which reads to
 * everybody as a broken credential rather than as a broken canonicalisation.
 * `presign.test.ts` reproduces the documented example byte for byte, so the
 * canonical request, the string to sign and the key derivation are all proved
 * against the specification rather than against my reading of it.
 *
 * The vector is a GET in `us-east-1` against a virtual-hosted bucket; the app
 * signs a PUT in `auto` against a path-style one. That is exactly why every one
 * of those is an argument. */
export async function signedQueryUrl(p: {
  method: string
  host: string
  canonicalUri: string
  accessKey: string
  secret: string
  region: string
  expiresIn: number
  contentType?: string
  contentLength?: number
  now: Date
}): Promise<string> {
  const { method, host, canonicalUri, accessKey, secret, region, expiresIn, contentType, contentLength } = p
  const amzDate = p.now.toISOString().replace(/[:-]|\.\d{3}/g, "") // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8)
  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`
  const opts = { contentType, contentLength }

  // THE SIGNED HEADERS ARE WHAT THE DOOR STILL GETS TO DECIDE ONCE IT IS NO
  // LONGER HOLDING THE BYTES, and there are two, both load-bearing.
  //
  // CONTENT-TYPE, because the label is the whole protection. `storedContentType`
  // writes a non-inline-safe upload into R2 as `application/octet-stream` so
  // `mediaHeaders` cannot serve it as `text/html` — "a byte that was never
  // labelled cannot be re-labelled by forgetting a check". A direct PUT hands
  // that label to the BROWSER, which would undo it. Signing the header takes it
  // back: R2 verifies the signature against the `Content-Type` actually sent, so
  // a client that deviates from the door's choice is refused by R2 rather than
  // trusted by us. The invariant survives the move, structurally.
  //
  // CONTENT-LENGTH, because the door is no longer counting the bytes either.
  // Today the size ceiling is enforced where the bytes pass through
  // (`dataUrlBytes`, `STREAM_UPLOAD_MAX_BYTES`); on a signed PUT nothing stands
  // between a caller and R2's storage bill. Signing the length means the door
  // declares the size up front and R2 refuses anything else — the ceiling moves
  // from a check we perform to a term of the grant.
  //
  // Both are optional in this function and REQUIRED by the doors, for the reason
  // the file header gives: this signs what it is handed, and what it is handed
  // is the door's business. `presign-key-is-ours.test.ts` holds the doors to it.
  const parts: [string, string][] = []
  if (opts.contentLength !== undefined) parts.push(["content-length", String(opts.contentLength)])
  if (opts.contentType) parts.push(["content-type", opts.contentType])
  parts.push(["host", host])
  // Lowercase and sorted by name, which the canonical form requires.
  parts.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const signedHeaders = parts.map(([n]) => n).join(";")
  const canonicalHeaders = parts.map(([n, v]) => `${n}:${v}\n`).join("")

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  })
  // Sorted by key, which the canonical form requires and URLSearchParams does
  // not do on its own.
  const canonicalQuery = [...query.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

  // UNSIGNED-PAYLOAD, because the bytes are not here to hash — that is what a
  // presigned upload IS. The signature pins the method, the bucket, the key, the
  // headers and the deadline; the body is the one thing it does not constrain,
  // which is why the size ceiling stays a decision the door makes.
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n")

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n")

  let signing: ArrayBuffer | Uint8Array = enc.encode(`AWS4${secret}`)
  for (const part of [dateStamp, region, SERVICE, "aws4_request"])
    signing = await hmac(signing, part)
  const signature = hex(await hmac(signing, stringToSign))

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}
