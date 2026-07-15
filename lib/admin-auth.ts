import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Validates the hub-edit admin cookie. Fails closed: an unset ADMIN_SECRET
 * denies every request instead of granting open access.
 */
export async function requireAdminCookie(): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return false;
  }
  const cookieStore = await cookies();
  return cookieStore.get("hub-edit")?.value === adminSecret;
}

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
