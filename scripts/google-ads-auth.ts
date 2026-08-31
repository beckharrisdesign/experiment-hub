/**
 * One-time OAuth consent flow for the Google Ads module
 * (openspec/changes/google-ads-automation, docs/GOOGLE_ADS_SETUP.md §OAuth).
 *
 * Run under op run so the client id/secret resolve from the vault:
 *
 *   op run --env-file=.env.local -- pnpm tsx scripts/google-ads-auth.ts
 *
 * Opens a loopback listener, prints the consent URL, exchanges the code, and
 * prints the refresh token with its exact vault destination. The token is
 * printed for a manual paste into 1Password — deliberately not passed to `op`
 * on a command line, where it would land in shell history.
 */
import http from "node:http";

const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/adwords";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(
      `${key} is not set. Run under op run (see docs/GOOGLE_ADS_SETUP.md) so it resolves from the vault.`,
    );
    process.exit(1);
  }
  return value;
}

const clientId = requireEnv("GOOGLE_ADS_CLIENT_ID");
const clientSecret = requireEnv("GOOGLE_ADS_CLIENT_SECRET");

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
// offline + consent force a refresh token even when one was granted before.
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Consent failed: ${error ?? "no code returned"}. Close this tab and re-run.`);
    console.error(`Consent failed: ${error ?? "no code returned"}`);
    server.close();
    process.exit(1);
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await tokenResponse.json()) as {
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenResponse.ok || !tokens.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Token exchange failed — see the terminal.");
    console.error(
      `Token exchange failed: ${tokens.error ?? tokenResponse.status} ${tokens.error_description ?? ""}`,
    );
    server.close();
    process.exit(1);
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Consent complete — refresh token is in the terminal. You can close this tab.");
  console.log("\n──────────────────────────────────────────────────────");
  console.log("Refresh token minted. Store it in 1Password now:");
  console.log('  vault:  BHD Labs');
  console.log('  item:   "Google Ads API"');
  console.log('  field:  refresh token');
  console.log("\nPaste this value into that field (1Password app, not the CLI,");
  console.log("so it never touches shell history):\n");
  console.log(tokens.refresh_token);
  console.log("\nThen .env.local gets the reference, never the literal:");
  console.log('  GOOGLE_ADS_REFRESH_TOKEN="op://BHD Labs/Google Ads API/refresh token"');
  console.log("──────────────────────────────────────────────────────\n");
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL in your browser and approve access:\n");
  console.log(authUrl.toString());
  console.log(`\nListening on ${REDIRECT_URI} for the redirect …`);
});
