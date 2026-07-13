import { NextResponse } from "next/server";
import { readProgramSettings, writeProgramSettings } from "@/lib/program-settings";
export async function GET() { return NextResponse.json(await readProgramSettings()); }
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(Number(body.cohortYear))) return NextResponse.json({ error: "Invalid program settings." }, { status: 400 });
  const keys = ["applicationsOpen", "earlyBirdDeadline", "finalDeadline", "bootcampStart", "capstone", "summit"];
  const dates = Object.fromEntries(keys.map(key => [key, String(body.dates?.[key] || "")]));
  if (Object.values(dates).some(value => Number.isNaN(Date.parse(value)))) return NextResponse.json({ error: "All program dates are required." }, { status: 400 });
  const value = { cohortYear: Number(body.cohortYear), timezone: "Asia/Ho_Chi_Minh", timezoneLabel: "Indochina Time", dates, updatedAt: new Date().toISOString() };
  await writeProgramSettings(value); return NextResponse.json({ ok: true, updatedAt: value.updatedAt });
}
