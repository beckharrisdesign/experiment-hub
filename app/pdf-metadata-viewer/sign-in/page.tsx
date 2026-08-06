import { Button, Container, Stack } from "@beckharrisdesign/mvds";

/**
 * Sign-in. Ungated by `isGatedPath`, or nobody could reach it.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D5.
 */
export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  declined: "You declined the Google authorization.",
  state:
    "That sign-in link did not match the request that started it, so it was refused.",
  no_code: "Google did not return an authorization code.",
  exchange: "Could not exchange the authorization code with Google.",
  not_allowed:
    "That Google account is not on the allowlist for this instance. The server log records the account's sub, which is what belongs in PDF_ALLOWED_GOOGLE_SUBS.",
  grant_storage: "Signed in, but the Drive grant could not be stored.",
  not_configured: "This instance is not fully configured.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (REASONS[error] ?? "Sign-in failed.") : null;

  return (
    <div className="py-6">
      <Container size="xl">
        <Stack gap={24}>
          <h1 className="font-heading text-2xl">PDF Metadata Viewer</h1>

          {message ? (
            <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
              <Stack gap={4}>
                <span className="font-semibold text-warning">
                  Could not sign you in
                </span>
                <span className="text-sm text-text-muted">{message}</span>
              </Stack>
            </div>
          ) : null}

          <div className="rounded-lg bg-background-secondary p-8">
            <Stack gap={16}>
              <Stack gap={8}>
                <span className="font-semibold text-text-primary">
                  Sign in with Google
                </span>
                <span className="text-sm text-text-muted">
                  One approval covers both signing in and access to the Drive
                  folder you choose. This instance serves a single account —
                  everything else is refused.
                </span>
              </Stack>
              <div>
                <a href="/api/pdf-drive/connect">
                  <Button>Continue with Google</Button>
                </a>
              </div>
            </Stack>
          </div>
        </Stack>
      </Container>
    </div>
  );
}
