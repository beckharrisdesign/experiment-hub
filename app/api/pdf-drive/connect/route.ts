import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  buildAuthUrl,
  newOAuthState,
} from "@/lib/pdf-drive";

/**
 * Start the Google handshake.
 *
 * Deliberately ungated — `isGatedPath` carves this out, because requiring a
 * session to reach sign-in would mean nobody could ever sign in.
 */
export async function GET() {
  let url: string;
  const state = newOAuthState();

  try {
    url = buildAuthUrl(state);
  } catch (error) {
    console.error("pdf-drive connect: not configured:", error);
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 503 },
    );
  }

  const response = NextResponse.redirect(url);

  // Ties the callback to this request. Without it, an attacker can hand the
  // user a callback URL carrying their own code and bind the wrong account.
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the cross-site redirect back from Google
    path: "/",
    maxAge: 600,
  });

  return response;
}
