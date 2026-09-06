// "CONTINUE WITH GOOGLE" — the SECOND way to prove the SAME identity, never a
// second identity. Both halves are GET because Google's flow is a browser
// redirect: see lib/google.ts for why the Identity-Services POST button is the
// wrong shape behind refuseForeignOrigin.
//
// Like the email pair next door, these run before any caller exists. The
// callback's protection is the signed OAuth state cookie and Google's own id
// token signature, not a permission — named in test/gating-seam.test.ts.
//
// Lifted out of index.ts on 6 Sep 2026 with nothing changed but the file and the
// `export` keyword.

import { fail } from "@shared/workers/http"
import { queryText, TEXT_LIMITS } from "@shared/workers/validate"

import type { Env } from "../env"
import { createSession, readCookie } from "../lib/sessions"
import {
  buildGoogleStart,
  exchangeGoogleCode,
  googleCredentials,
  googleRedirectUri,
  googleSigningKeys,
  oauthCookie,
  OAUTH_COOKIE,
  resolveFrontDoor,
  verifyGoogleIdToken,
} from "../lib/google"
import { findOrCreateUserByEmail } from "../lib/users"

/** "Continue with Google", step 1: bounce the browser to Google's account picker.
 *
 * WHY THIS DOOR IS NOT ON THE SEND LEDGER. The login throttle and the send ledger
 * (lib/login-codes.ts) meter one scarce thing: emails leaving the product. This
 * door sends none, writes no row and makes no outbound call — it mints a cookie
 * and redirects. Charging it to the same buckets would not add a defence; it
 * would let anyone burn a real person's code budget by clicking a button that
 * costs us nothing. The thing this path could actually be walked down — minting
 * sessions — is bounded by Google's own assertion, which is exactly how the code
 * path is bounded by the code. */
export async function googleStart(request: Request, env: Env): Promise<Response> {
  // The redirect_uri is derived from WHICH FRONT DOOR the person is standing at
  // (there are two hostnames), then required to be one of ours. Deriving without
  // checking would make this an open redirect that hands out a session cookie.
  const origin = resolveFrontDoor(env, request)
  if (!origin) return fail(400, "unknown_front_door", "Sign in from the app's own address.")
  // Not configured = say so quietly and let the person use the code instead.
  // BOTH halves are checked here, not at the callback, so nobody is sent to
  // Google only to fail on the way back.
  const creds = googleCredentials(env)
  if (!creds) return Response.redirect(`${origin}/login?error=google_not_ready`, 302)

  const { url, setCookie } = await buildGoogleStart(env, creds, origin)
  return new Response(null, { status: 302, headers: { Location: url, "Set-Cookie": setCookie } })
}

/** "Continue with Google", step 2: Google sends the browser back here. Finish the
 * handshake, VERIFY the assertion, and sign the person in as the same user the
 * email code would have signed in.
 *
 * IDENTITY-GATED, exactly like emailVerify: the gate is not a permission but a
 * proof of who the caller is — Google's signature here, a 6-digit code there.
 * Both then go through the ONE identity seam, findOrCreateUserByEmail, so a
 * person who used a code yesterday and Google today is one row, not two.
 *
 * SIGNING IN IS NOT GETTING IN (SCOPE ch.06). A Google account whose address is
 * not a member gets what a stranger gets from the code door: a user row with no
 * team, and the "nothing here yet" screen. The invite creates access; this
 * doesn't, and there is deliberately no second onboarding branch for it. */
export async function googleCallback(request: Request, env: Env): Promise<Response> {
  const origin = resolveFrontDoor(env, request)
  if (!origin) return fail(400, "unknown_front_door", "Sign in from the app's own address.")

  /** Back to the sign-in screen with a reason, and ALWAYS without the one-shot
   * cookie — a state that survives its round-trip is a replay waiting to happen.
   * The reason is encoded even though every caller passes a fixed word: the
   * origin is fixed by the allow-list above, so this is the only part of the
   * Location a future edit could make writable, and it costs one call. */
  const back = (reason: string) =>
    new Response(null, {
      status: 302,
      headers: {
        Location: `${origin}/login?error=${encodeURIComponent(reason)}`,
        "Set-Cookie": oauthCookie(env, "", 0),
      },
    })

  const creds = googleCredentials(env)
  if (!creds) return back("google_not_ready")

  const url = new URL(request.url)
  // The QUERY half of the boundary (R20). Google's own values are small, but this
  // door is unauthenticated and anyone can call it with a multi-megabyte `?code=`
  // — which without a cap is a 500 and a row in the GLOBAL error log per request.
  const code = queryText(url.searchParams.get("code"), "Code", TEXT_LIMITS.link)
  const state = queryText(url.searchParams.get("state"), "State", TEXT_LIMITS.short)
  const cookie = readCookie(request, OAUTH_COOKIE)
  if (!code || !state || !cookie) return back("google_failed")

  const [cookieState, verifier] = cookie.split(".")
  if (!verifier || state !== cookieState) return back("google_failed")

  try {
    const idToken = await exchangeGoogleCode(creds, code, verifier, googleRedirectUri(origin))
    const identity = await verifyGoogleIdToken(idToken, {
      clientId: creds.clientId,
      keys: await googleSigningKeys(),
    })

    const { user } = await findOrCreateUserByEmail(env, identity.email)
    if (user.deactivated_at !== null) return back("deactivated")

    const { setCookie } = await createSession(env, user.id)
    const headers = new Headers({ Location: `${origin}/` })
    headers.append("Set-Cookie", setCookie)
    headers.append("Set-Cookie", oauthCookie(env, "", 0))
    return new Response(null, { status: 302, headers })
  } catch (e) {
    // One sentence to the person, the detail to the log. Which claim failed is
    // useful to us and is an oracle to anyone probing the door.
    console.error("google callback failed:", e)
    return back("google_failed")
  }
}
