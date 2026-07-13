import { NextResponse } from "next/server";
import { resolvedGoogleSheetsSettings } from "@/lib/integration-settings";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    const sheets = await resolvedGoogleSheetsSettings();
    return NextResponse.json({
      ok: true,
      service: "gstar-next-dashboard",
      database: "gstar.db",
      databaseConnected: true,
      storageConfigured: Boolean(sheets.endpoint && sheets.secret),
      storageSource: sheets.source,
      analyticsConfigured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check database failure", error);
    return NextResponse.json({ ok: false, service: "gstar-next-dashboard", database: "gstar.db", databaseConnected: false }, { status: 503 });
  }
}
