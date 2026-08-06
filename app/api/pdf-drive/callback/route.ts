import { NextRequest, NextResponse } from "next/server";
import {
  PDF_SESSION_COOKIE,
  PDF_SESSION_TTL_SECONDS,
  acceptGoogleIdentity,
  signSession,
} from "@/lib/pdf-auth";
import {
  OAUTH_STATE_COOKIE,
  REFUSED_SUB_COOKIE,
  exchangeCodeForTokens,
  storeDriveGrant,
} from "@/lib/pdf-drive";

const SIGN_IN = "/pdf-metadata-viewer/sign-in";

function back(request: NextRequest, reason: string) {
  const url = new URL(SIGN_IN, request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

/**
 * Finish the Google handshake: verify state, exchange the code, gate on the
 * allowlist, store the Drive grant, and issue a session.
 *
 * Ungated by `isGatedPath` for the same reason as `/connect`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // The user declined, or Google refused.
  const oauthError = params.get("error");
  if (oauthError) {
    console.warn("pdf-drive callback: authorization declined:", oauthError);
    return back(request, "declined");
  }

  // CSRF: the state must match the cookie set when this flow started.
  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const received = params.get("state");
  if (!expected || !received || expected !== received) {
    console.warn("pdf-drive callback: state mismatch");
    return back(request, "state");
  }

  const code = params.get("code");
  if (!code) return back(request, "no_code");

  let exchange;
  try {
    exchange = await exchangeCodeForTokens(code);
  } catch (error) {
    console.error("pdf-drive callback: token exchange failed:", error);
    return back(request, "exchange");
  }

  const identity = exchange.identity;
  const session = acceptGoogleIdentity(identity ?? {}, process.env);

  if (!session) {
    // Task 4.5a. `sub` is not visible anywhere in the Google Console — it only
    // exists inside a token — so a first sign-in is expected to land here. This
    // line is how the operator learns what to put in PDF_ALLOWED_GOOGLE_SUBS.
    // Logged rather than returned: the browser is not entitled to it, and a
    // first-run bypass that auto-admits the caller would be permanently
    // dangerous code.
    console.warn(
      "[pdf-metadata-viewer] Sign-in refused. To allow this account, add its " +
        `sub to PDF_ALLOWED_GOOGLE_SUBS:\n  sub=${identity?.sub ?? "(absent)"}` +
        `\n  email=${identity?.email ?? "(absent)"}` +
        `  email_verified=${identity?.email_verified ?? "(absent)"}`,
    );

    const refused = back(request, "not_allowed");

    // Also hand the sub to the sign-in page, so bootstrapping does not require
    // reading server logs. Safe to show: whoever sees this just authenticated
    // as that account, so it tells them nothing they could not read out of
    // their own id_token. In a cookie rather than the URL, so it stays out of
    // browser history and referrers. Short-lived, and cleared once displayed.
    if (identity?.sub) {
      refused.cookies.set(REFUSED_SUB_COOKIE, identity.sub, {
        httpOnly: true, // the sign-in page renders server-side
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      });
    }
    return refused;
  }

  // Drive tokens live server-side only; nothing here reaches the browser.
  try {
    await storeDriveGrant({
      accessToken: exchange.accessToken,
      refreshToken: exchange.refreshToken,
      expiresAt: exchange.expiresAt,
      scope: exchange.scope,
      email: session.email || null,
      sub: session.sub,
    });
  } catch (error) {
    console.error("pdf-drive callback: could not store grant:", error);
    return back(request, "grant_storage");
  }

  const secret = process.env.PDF_SESSION_SECRET;
  if (!secret) {
    console.error("pdf-drive callback: PDF_SESSION_SECRET is not set");
    return back(request, "not_configured");
  }

  const token = await signSession(session, secret);
  const response = NextResponse.redirect(
    new URL("/pdf-metadata-viewer", request.url),
  );

  response.cookies.set(PDF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PDF_SESSION_TTL_SECONDS,
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);

  return response;
}
