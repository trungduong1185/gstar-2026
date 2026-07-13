import { NextRequest, NextResponse } from "next/server";
import { adminCookie, verifyAdminSession } from "@/lib/admin-auth";
import { withBasePath } from "@/lib/base-path";

export async function proxy(request: NextRequest) {
  const valid = await verifyAdminSession(request.cookies.get(adminCookie.name)?.value);
  if (valid) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/admin")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const login = new URL(withBasePath("/admin/login"), request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard/:path*", "/api/admin/:path*"] };
