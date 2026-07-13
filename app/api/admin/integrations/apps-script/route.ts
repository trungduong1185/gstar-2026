import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const template = await fs.readFile(path.join(process.cwd(), "integrations", "google-apps-script.gs"), "utf8");
    return new Response(template, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Apps Script template is unavailable." }, { status: 404 });
  }
}
