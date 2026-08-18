# Google Console setup

Owner-only steps for the hosted instance. Everything here needs Console access;
none of it can be done from a session.

Related: `openspec/changes/pdf-metadata-viewer-cloud/design.md` D5 (identity) and
D9 (Drive scope).

---

## 1. First — delete the compromised client

Unrelated to this tool, but it lives in the same Console and it is a live
credential.

**APIs & Services → Credentials →** OAuth 2.0 Client ID
`8514092366-c7fapd4sdqi52mca728ml9n5rcf35qma.apps.googleusercontent.com`
→ **Delete**.

It belonged to `calendar-to-planner`, which is abandoned. Its secret was
committed to that repo and is recoverable from git history; deleting the client
is what makes that string inert. Nothing depends on it.

Then, once deleted, check <https://myaccount.google.com/permissions> for any
lingering grant to that app.

---

## 2. Create a **new** project — do not reuse

Name it something like `pdf-metadata-viewer`.

The temptation is to reuse the project the calendar work already lives in, since
its consent screen is configured. Don't. Consent screens are per-project, and so
is the registered scope list — that project has `calendar.readonly` on it, which
is a **sensitive** scope.

This tool's scope strategy (D9a) rests on the consent screen being **Internal**,
which is what exempts a restricted scope from verification. A clean project keeps
that intact — a shared project carrying someone else's scopes and user type is
exactly how that exemption gets lost by accident.

---

## 3. Enable two APIs

**APIs & Services → Library →** enable:

- **Google Drive API** — reading and writing document metadata
- **Google Picker API** — the folder grant flow

These are two separate APIs and enabling only Drive is the easy mistake. If the
Picker API is off, the picker iframe returns Google's bare
*"403. That's an error. We're sorry, but you do not have access to this page."*
— which names neither the API nor the project.

## 3a. Workspace admin — allow Drive apps at all

**This one is in the Admin console, not the Cloud console**, and nothing about
its symptom points there.

**admin.google.com → Apps → Google Workspace → Drive and Docs → Features and
Applications → Drive SDK →** tick *"Allow users to access Google Drive with the
Drive SDK API"*.

If this is off, every Drive API call from any third-party app is refused at the
domain level:

```
403  "The domain administrators have disabled Drive apps."
```

What makes it hard to spot: **sign-in still works perfectly.** The identity
scopes are unaffected, the consent screen appears, the grant is stored, and a
refresh token comes back. Only Drive calls fail — and the Picker surfaces that
as a bare *"403. That's an error."* with no mention of a domain policy.

It is also scope-independent. `drive.file`, `drive.readonly`, full `drive` —
all equally blocked. No amount of Cloud console configuration works around it.

## 3b. Create an API key for the Picker

**Credentials → Create credentials → API key.**

Google's Picker documentation requires an API key alongside the OAuth token, and
its absence produces the same unhelpful 403. It is browser-visible by design, so
restrict it rather than leaving it open:

- **API restrictions →** Google Picker API only
- **Website restrictions →** `localhost:3000` and `labs.beckharrisdesign.com`

Goes in `PDF_GOOGLE_API_KEY`.

---

## 4. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**

| Field | Value |
|---|---|
| User type | **Internal** |
| App name | PDF Metadata Viewer |
| User support email | your address |
| Developer contact | your address |
| Authorised domain | `beckharrisdesign.com` |

**User type must be Internal.** It is the single setting the scope decision rests
on: an Internal app serves only accounts in the Workspace domain and is exempt
from Google's verification, which is what makes a restricted Drive scope usable
with no CASA assessment, no unverified-app warning, and no seven-day
refresh-token expiry. Set to External, the same scope demands verification the
app has not been through. Changed from External on 2026-08-18 — see D9a.

**Scopes — add exactly these four and nothing else:**

```
openid
.../auth/userinfo.email
.../auth/userinfo.profile
https://www.googleapis.com/auth/drive
```

The Console will flag `drive` as **restricted**. That is expected here, and it is
the Internal user type — not the scope's classification — that keeps it
affordable.

**Do not add** `drive.readonly` or `drive.metadata.readonly`. They are restricted
too, so they cost exactly the same, and neither can write metadata back on
commit.

**Why not `drive.file`**, which is non-sensitive and was the original choice: a
folder handed over through the Picker grants the folder and nothing inside it.
Verified against a live grant on 2026-08-18 — one accessible item, the folder,
and zero files. Drive reports an uncovered listing as an empty list rather than
an error, so an import against it succeeds while importing nothing.

---

## 5. Create the OAuth client

**Credentials → Create credentials → OAuth client ID**

- **Application type: Web application** (not Desktop — the old calendar client
  was Desktop, which is why none of it is reusable)
- Name: `pdf-metadata-viewer web`

**Authorised redirect URIs — exact, both of them:**

```
https://labs.beckharrisdesign.com/api/pdf-drive/callback
http://localhost:3000/api/pdf-drive/callback
```

Google matches these character for character; a trailing slash breaks it.

**Not registering Vercel preview URLs** (task 4.2). Preview deployments get a
fresh hash-based hostname each time and Google needs exact URIs, so authenticated
routes are production-and-local only. That is an acceptable limit for a
single-user instance and is worth revisiting only if previews ever need to be
signed into.

---

## 6. Capture the values

Into the hub's `.env.local` locally, and Vercel project env vars for production:

```
PDF_GOOGLE_CLIENT_ID=<from the Console>
PDF_GOOGLE_CLIENT_SECRET=<from the Console>
PDF_GOOGLE_REDIRECT_URI=https://labs.beckharrisdesign.com/api/pdf-drive/callback
PDF_SESSION_SECRET=<any long random string>
PDF_ALLOWED_GOOGLE_SUBS=<see below — you cannot know this yet>
```

### Getting your `sub` for the allowlist

The allowlist keys on the Google `sub` claim, not your email, because emails are
reassignable. But `sub` is not shown anywhere in the Console — it only appears in
a token.

So there is a deliberate bootstrapping order:

1. Leave `PDF_ALLOWED_GOOGLE_SUBS` empty and attempt to sign in.
2. You will be **refused** — the allowlist fails closed, by design.
3. The callback logs the rejected `sub` server-side (Vercel logs, or the terminal
   locally).
4. Paste that value into `PDF_ALLOWED_GOOGLE_SUBS` and sign in again.

This is preferable to a bootstrap mode that admits the first caller. A
first-run bypass is a permanent piece of code whose only job is to be
dangerous if it is ever re-enabled.

---

## 7. The spike — before any Drive code (task 2.1a)

The one open question that could change the design. Ten minutes:

1. Sign in and grant access to a **folder** through the Picker.
2. Confirm the app can list the PDFs already in it.
3. **Drop a new PDF into that folder in Drive.**
4. Re-list.

**Does the new file appear?**

- **Yes** — folder grants inherit. D9 holds as written and the fallback stays
  belt-and-braces.
- **No** — every scan needs re-granting. The design does not collapse, but the
  "documents need access" instance in Needs attention (task 5.5) stops being a
  safety net and becomes the primary workflow, which is worth knowing before it
  is built rather than after.

Record the answer in `design.md` D9 either way.

---

## What to hand back

Only these, and none of them are secrets that need to travel through chat:

- Whether `drive.file` showed as non-sensitive (step 4)
- The spike result (step 7)

The client ID and secret go straight into env vars — they should not be pasted
into a session.
