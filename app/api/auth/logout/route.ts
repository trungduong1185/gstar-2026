import { NextResponse } from "next/server";
import { adminCookie } from "@/lib/admin-auth";
import { withBasePath } from "@/lib/base-path";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(withBasePath("/admin/login"), request.url));
  response.cookies.set(adminCookie.name, "", { path: "/", expires: new Date(0), httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  return response;
}
