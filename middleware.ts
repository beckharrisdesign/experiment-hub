import { NextRequest, NextResponse } from "next/server";

// Vanity host for the Etsy Listing Kit ad funnel — serves /etsy-listing-kit at
// its root so ads can point at a clean URL. The labs.* paths keep working
// unchanged (Stripe webhook + email links stay on ELK_SITE_URL).
const ELK_HOST = "etsy-listing-kit.vercel.app";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
