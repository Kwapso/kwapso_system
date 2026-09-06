// THE SIGNER IS CHECKED AGAINST AWS'S OWN PUBLISHED VECTOR, not against my
// reading of the specification.
//
// ── WHY THAT DISTINCTION IS THE WHOLE TEST ──────────────────────────────────
//
// A SigV4 presigner is easy to write plausibly and hard to write correctly:
// the canonical request, the string to sign and the four-step key derivation all
// have to agree with the server's byte for byte, and the only feedback a wrong
// one gives is `SignatureDoesNotMatch`. That reads to everybody as a broken
// credential — the exact wrong place to go looking — and it would only ever
// appear after somebody had created a real R2 key and applied bucket CORS,
// which is the step this code was deliberately written not to need yet.
//
// So the first test drives the documented example from the S3 signing reference
// (Signature Version 4, "Signing AWS requests", the presigned-URL walkthrough)
// through `signedQueryUrl` and compares the signature to the published one. It
// is a GET, in `us-east-1`, against a virtual-hosted bucket, expiring in 86,400
// seconds — none of which is what this app signs. That mismatch is the point:
// every one of those is an argument, so reproducing the vector exercises the
// same code the app uses rather than a special case built to agree with it.
//
// The rest are properties the vector cannot check: that the signature actually
// COVERS the things it is supposed to pin, and that the seam stays off until a
// credential exists.

import { describe, expect, it } from "vitest"

import {
  presignConfigured,
  presignPut,
  signedQueryUrl,
  PRESIGN_TTL_SECONDS,
  type PresignEnv,
} from "@shared/workers/presign"

const sigOf = (url: string): string => new URL(url).searchParams.get("X-Amz-Signature") ?? ""

const ENV: PresignEnv = {
  CF_ACCOUNT_ID: "b5bb3d84a59c029ea5e0fe164dab1cf7",
  R2_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
  R2_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
}

describe("the presigner reproduces AWS's published example", () => {
  it("signs the documented GET vector byte for byte", async () => {
    // The example from AWS's own signing documentation. Everything here — the
    // key, the secret, the date, the bucket, the expiry — is the published
    // fixture, and the expected signature is the published answer.
    const url = await signedQueryUrl({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      canonicalUri: "/test.txt",
      accessKey: "AKIAIOSFODNN7EXAMPLE",
      secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      expiresIn: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
    })
    expect(
      sigOf(url),
      "the signature does not match AWS's published example — the canonical request, the " +
        "string to sign or the key derivation disagrees with the specification, and R2 would " +
        "answer SignatureDoesNotMatch on every upload"
    ).toBe("aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404")
  })
})

describe("the signature pins what it is supposed to pin", () => {
  // The vector proves the algorithm. These prove the INPUTS reach it — a signer
  // that ignored the key would reproduce the vector and still let one signed URL
  // upload over any object.
  const base = {
    method: "PUT" as const,
    host: "acct.r2.cloudflarestorage.com",
    canonicalUri: "/kwapso-media/T1/story/01J",
    accessKey: "AK",
    secret: "SEC",
    region: "auto",
    expiresIn: 300,
    now: new Date("2026-09-06T12:00:00Z"),
  }

  it("is deterministic for one moment and one request", async () => {
    expect(sigOf(await signedQueryUrl(base))).toBe(sigOf(await signedQueryUrl(base)))
  })

  for (const [what, patch] of [
    ["the key", { canonicalUri: "/kwapso-media/T1/story/01K" }],
    ["the bucket", { canonicalUri: "/kwapso-internal-media/T1/story/01J" }],
    ["the method", { method: "GET" }],
    ["the secret", { secret: "OTHER" }],
    ["the expiry", { expiresIn: 900 }],
    ["the moment", { now: new Date("2026-09-06T12:00:01Z") }],
    ["the content type", { contentType: "image/png" }],
  ] as [string, Partial<typeof base>][]) {
    it(`changes when ${what} changes`, async () => {
      const a = sigOf(await signedQueryUrl(base))
      const b = sigOf(await signedQueryUrl({ ...base, ...patch }))
      expect(
        b,
        `${what} is not covered by the signature — one signed URL would be valid for a request ` +
          "it was never issued for"
      ).not.toBe(a)
    })
  }
})

describe("the two headers the door keeps control of once it stops holding the bytes", () => {
  // THE PART THAT IS NOT AN OPTIMISATION. Moving the bytes out of the worker
  // moves two decisions with them, and signing the headers takes both back.
  const base = {
    method: "PUT" as const,
    host: "acct.r2.cloudflarestorage.com",
    canonicalUri: "/kwapso-media/T1/story/01J",
    accessKey: "AK",
    secret: "SEC",
    region: "auto",
    expiresIn: 300,
    now: new Date("2026-09-06T12:00:00Z"),
  }

  it("signs the content type, so the browser cannot choose the label", async () => {
    // `storedContentType` writes a non-inline-safe upload as
    // `application/octet-stream` precisely so `mediaHeaders` can never serve it
    // as `text/html` — "a byte that was never labelled cannot be re-labelled by
    // forgetting a check". A direct PUT hands that label to the client. Signing
    // it means R2 verifies the header against the signature and refuses a
    // deviation, so the invariant survives the move.
    const url = await signedQueryUrl({ ...base, contentType: "application/octet-stream" })
    expect(new URL(url).searchParams.get("X-Amz-SignedHeaders")).toContain("content-type")
  })

  it("signs the content length, so the size ceiling is a term of the grant", async () => {
    // Today the ceiling is enforced where the bytes pass through
    // (`dataUrlBytes`, `STREAM_UPLOAD_MAX_BYTES`). On a signed PUT nothing
    // stands between a caller and the storage bill unless the length is pinned.
    const url = await signedQueryUrl({ ...base, contentLength: 1024 })
    expect(new URL(url).searchParams.get("X-Amz-SignedHeaders")).toContain("content-length")
  })

  it("a different length is a different signature — the ceiling is really pinned", async () => {
    const a = sigOf(await signedQueryUrl({ ...base, contentLength: 1024 }))
    const b = sigOf(await signedQueryUrl({ ...base, contentLength: 1025 }))
    expect(
      b,
      "content-length is in SignedHeaders but does not change the signature — it is being " +
        "declared and not signed, which is a ceiling that does not hold"
    ).not.toBe(a)
  })

  it("signed headers stay lowercase and sorted, or the canonical form is wrong", async () => {
    const url = await signedQueryUrl({
      ...base,
      contentType: "image/png",
      contentLength: 10,
    })
    expect(new URL(url).searchParams.get("X-Amz-SignedHeaders")).toBe("content-length;content-type;host")
  })
})

describe("what the presigned URL grants", () => {
  it("is one key, PUT only, expiring in minutes", async () => {
    const url = (await presignPut(ENV, "kwapso-media", "T1/story/01JABC")) as string
    expect(url).toBeTruthy()
    const u = new URL(url)
    expect(u.host).toBe("b5bb3d84a59c029ea5e0fe164dab1cf7.r2.cloudflarestorage.com")
    // ONE key. Not a prefix, not a bucket — the path is the whole grant.
    expect(u.pathname).toBe("/kwapso-media/T1/story/01JABC")
    expect(Number(u.searchParams.get("X-Amz-Expires"))).toBe(PRESIGN_TTL_SECONDS)
    // Minutes, not hours: the standing capability-URL finding is about
    // PERMANENCE, and this is the property that keeps a presigned PUT out of it.
    expect(PRESIGN_TTL_SECONDS).toBeLessThanOrEqual(15 * 60)
    expect(u.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
  })

  it("escapes a key's segments without eating its separators", async () => {
    // R2 keys are `team/module/ulid`; the slashes are structure. A key with a
    // character `encodeURIComponent` leaves alone would sign a different string
    // from the one R2 reads, and the PUT would be refused.
    const url = (await presignPut(ENV, "kwapso-media", "T1/story/a b'c")) as string
    const path = new URL(url).pathname
    expect(path.startsWith("/kwapso-media/T1/story/")).toBe(true)
    expect(path).toContain("%20")
    expect(path, "an apostrophe was left unescaped — AWS canonicalisation escapes it").toContain("%27")
  })
})

describe("it is off until somebody turns it on", () => {
  // The property that lets this land with no infrastructure and no behaviour
  // change: an environment with no credential behaves exactly as it does today.
  const bare: PresignEnv = { CF_ACCOUNT_ID: "acct" }

  it("reports itself unconfigured", () => {
    expect(presignConfigured(bare)).toBe(false)
    expect(presignConfigured({ ...bare, R2_ACCESS_KEY_ID: "AK" })).toBe(false)
    expect(presignConfigured(ENV)).toBe(true)
  })

  it("returns null rather than throwing on somebody's upload", async () => {
    // A caller that forgot to check must still degrade to the proxy path. An
    // exception here would turn an unconfigured accelerator into a failed
    // upload, which is the one thing an optional path may never do.
    await expect(presignPut(bare, "kwapso-media", "T1/x/1")).resolves.toBeNull()
  })
})
