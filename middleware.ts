import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
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
        maxAge: 60 * 60 * 8, // 8 hours
      });
      return response;
    }
    // Wrong secret — strip param and continue without setting cookie
    const url = request.nextUrl.clone();
    url.searchParams.delete("edit");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/experiments/:path*",
};
