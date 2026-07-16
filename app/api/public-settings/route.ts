import { NextResponse } from "next/server";
import { resolvedGaMeasurementId } from "@/lib/integration-settings";

export async function GET() {
  return NextResponse.json(
    { gaMeasurementId: await resolvedGaMeasurementId() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
