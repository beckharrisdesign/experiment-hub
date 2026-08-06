import { NextResponse } from "next/server";
import {
  DriveReauthorizationRequired,
  getValidAccessToken,
} from "@/lib/pdf-drive";

/**
 * Short-lived access token for the Google Picker.
 *
 * The one place a Drive token is handed to the browser, and only because a
 * `drive.file` grant over *existing* files cannot be established any other way:
 * the Picker is a browser API and takes a token. See the spec correction in
 * `drive-document-source` — the refresh token still never leaves the server.
 *
 * Requested at the moment the picker opens rather than embedded in page HTML,
 * so it is not sitting in a document someone can scroll back to.
 *
 * Gated by middleware like every other `/api/pdf-*` path.
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    // The Picker's appId is the Cloud project number, which is the leading
    // segment of the OAuth client id. Deriving it avoids a second env var that
    // could drift out of step with the client.
    const clientId = process.env.PDF_GOOGLE_CLIENT_ID ?? "";
    const appId = clientId.split("-")[0] || null;

    return NextResponse.json(
      { accessToken, appId },
      // Never cached: it is a credential with an expiry.
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "reauthorize", message: error.message },
        { status: 409 },
      );
    }
    console.error("picker-token:", error);
    return NextResponse.json(
      { error: "Could not obtain a Drive token" },
      { status: 500 },
    );
  }
}
