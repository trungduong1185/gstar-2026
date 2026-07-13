import { NextResponse } from "next/server";
import { resolvedGoogleSheetsSettings } from "@/lib/integration-settings";

export async function GET() {
  const sheets = await resolvedGoogleSheetsSettings();
  return NextResponse.json({
    ok: true,
    service: "gstar-next-dashboard",
    storageConfigured: Boolean(sheets.endpoint && sheets.secret),
    storageSource: sheets.source,
    analyticsConfigured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    timestamp: new Date().toISOString()
  });
}
