import { NextRequest, NextResponse } from "next/server";
// Relative, not the "@/" alias, and deliberately so. The seed organizer app
// (experiments/simple-seed-organizer/prototype/app) is a pnpm workspace member
// whose Turbopack build infers the repo root as its workspace root and compiles
// this file along with its own. Both tsconfigs map "@/*" to "./*", so under that
// build "@/lib/pdf-auth" resolves against the seed app, where it does not exist,
// and its build fails on code it never referenced. A relative specifier resolves
// against this file instead, which is correct under either root.
import {
  PDF_SESSION_COOKIE,
  isGatedPath,
  verifySession,
} from "./lib/pdf-auth";

// Vanity host for the Etsy Listing Kit ad funnel — serves /etsy-listing-kit at
// its root so ads can point at a clean URL. The labs.* paths keep working
// unchanged (Stripe webhook + email links stay on ELK_SITE_URL).
const ELK_HOST = "etsy-listing-kit.vercel.app";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── pdf-metadata-viewer: refuse before anything else runs ─────────────────
  // The spec requires an unauthenticated request to be refused before any
  // storage, database, or third-party call, and to leave no way to tell an
  // existing document from a missing one. Both hold because this returns here,
  // identically, for every gated path — the route handler never executes, so it
  // never opens a connection and never has a chance to 404 differently.
  if (isGatedPath(pathname)) {
    const session = await verifySession(
      request.cookies.get(PDF_SESSION_COOKIE)?.value,
      process.env.PDF_SESSION_SECRET ?? "",
    );

    if (!session) {
      // Uniform for forged, expired, malformed, and absent alike.
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(
        new URL("/pdf-metadata-viewer/sign-in", request.url),
      );
    }

    return NextResponse.next();
  }

  // ── Etsy Listing Kit vanity host → rewrite to the funnel routes ────────────
  const host = request.headers.get("host") ?? request.nextUrl.host;
  if (host === ELK_HOST && !pathname.startsWith("/etsy-listing-kit")) {
    const url = request.nextUrl.clone();
    url.pathname = `/etsy-listing-kit${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Admin area protection ──────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const editCookie = request.cookies.get("hub-edit");
    const isAuthenticated =
      !!editCookie && editCookie.value === process.env.ADMIN_SECRET;

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // ── Legacy ?edit= URL param → cookie (kept for backwards compat) ───────────
  // Scoped to the paths the old matcher covered; the matcher itself is now
  // wider so the ELK host rewrite can see every route.
  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/experiments")
  ) {
    return NextResponse.next();
  }
  const editSecret = request.nextUrl.searchParams.get("edit");

  if (editSecret) {
    if (editSecret === process.env.ADMIN_SECRET) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("edit");
      const response = NextResponse.redirect(url);
      response.cookies.set("hub-edit", editSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
      return response;
    }
    const url = request.nextUrl.clone();
    url.searchParams.delete("edit");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Wide match (minus _next internals and files with extensions) so the ELK
  // host rewrite applies everywhere; admin/edit logic self-scopes by pathname.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
