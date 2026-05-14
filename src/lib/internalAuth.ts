import { NextRequest, NextResponse } from "next/server";

// All internal API routes that spend server wallet funds require this header.
// Set INTERNAL_API_SECRET in Railway env vars to a long random string.
// The Next.js app sets it on every outbound fetch automatically via the helper below.

const SECRET = process.env.INTERNAL_API_SECRET;

export function checkInternalAuth(req: NextRequest): NextResponse | null {
  if (!SECRET) return null; // not configured — open (dev mode)
  const header = req.headers.get("x-internal-secret");
  if (header !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null; // ok
}

export function internalHeaders(): Record<string, string> {
  return SECRET ? { "x-internal-secret": SECRET } : {};
}
