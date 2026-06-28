import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*", "/experiments/:path*"],
};
