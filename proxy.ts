import { NextRequest, NextResponse } from "next/server";
import { adminCookie, verifyAdminSession } from "@/lib/admin-auth";
import { withBasePath } from "@/lib/base-path";

export async function proxy(request: NextRequest) {
  const session = await verifyAdminSession(request.cookies.get(adminCookie.name)?.value);
  if (session) {
    const response = NextResponse.next();
    response.headers.set("x-admin-user", encodeURIComponent(session.username));
    response.headers.set("x-admin-role", session.role);
    return response;
  }
  if (request.nextUrl.pathname.startsWith("/api/admin")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const login = new URL(withBasePath("/admin/login"), request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard/:path*", "/api/admin/:path*"] };
