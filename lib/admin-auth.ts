import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the request carries a valid admin secret.
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 * Returns a 401 response if unauthorized, or null if the request is valid.
 */
export function checkAdminAuth(request: NextRequest): NextResponse | null {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: "Admin secret not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
