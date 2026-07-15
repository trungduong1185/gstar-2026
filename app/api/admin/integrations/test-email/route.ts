import { NextResponse } from "next/server";
import { sendApplicationEmailTest } from "@/lib/email-notifier";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }

  const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
  if (!EMAIL.test(to)) return NextResponse.json({ error: "Enter a valid test recipient email address." }, { status: 400 });

  try {
    const result = await sendApplicationEmailTest(to);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "Unable to send the test email.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
