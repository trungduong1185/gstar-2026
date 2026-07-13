import { NextResponse } from "next/server";
import { readIntegrationSettings, resolvedGoogleSheetsSettings, spreadsheetIdFromUrl, writeIntegrationSettings, type IntegrationSettings } from "@/lib/integration-settings";

export const runtime = "nodejs";

function validAppsScriptUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "script.google.com" && url.pathname.includes("/macros/s/");
  } catch {
    return false;
  }
}

export async function GET() {
  const stored = await readIntegrationSettings();
  const resolved = await resolvedGoogleSheetsSettings();
  return NextResponse.json({
    googleSheetsEnabled: stored.googleSheetsEnabled,
    resumeStorage: stored.resumeStorage,
    googleSheetUrl: stored.googleSheetUrl,
    googleAppsScriptUrl: stored.googleAppsScriptUrl,
    secretConfigured: Boolean(resolved.secret),
    source: resolved.source,
    updatedAt: stored.updatedAt
  });
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }

  const googleSheetUrl = typeof body.googleSheetUrl === "string" ? body.googleSheetUrl.trim() : "";
  const googleAppsScriptUrl = typeof body.googleAppsScriptUrl === "string" ? body.googleAppsScriptUrl.trim() : "";
  const submittedSecret = typeof body.googleAppsScriptSecret === "string" ? body.googleAppsScriptSecret.trim() : "";
  const current = await readIntegrationSettings();
  const googleSheetsEnabled = body.googleSheetsEnabled === "on" || body.googleSheetsEnabled === "true" || body.googleSheetsEnabled === true;
  const resumeStorage = body.resumeStorage === "google-drive" ? "google-drive" : body.resumeStorage === "vps" ? "vps" : "";
  if (!resumeStorage) return NextResponse.json({ error: "Select where Resume / CV files should be stored." }, { status: 400 });

  const googleRequired = googleSheetsEnabled || resumeStorage === "google-drive";
  if (googleSheetsEnabled && !spreadsheetIdFromUrl(googleSheetUrl)) return NextResponse.json({ error: "Enter a valid Google Sheets URL." }, { status: 400 });
  if (googleRequired && !validAppsScriptUrl(googleAppsScriptUrl)) return NextResponse.json({ error: "Enter a deployed Google Apps Script Web App URL." }, { status: 400 });

  const googleAppsScriptSecret = submittedSecret || current.googleAppsScriptSecret || process.env.GOOGLE_APPS_SCRIPT_SECRET || "";
  if (googleRequired && !googleAppsScriptSecret) return NextResponse.json({ error: "Shared secret is required for Google Sheets or Drive." }, { status: 400 });

  const settings: IntegrationSettings = {
    googleSheetsEnabled,
    resumeStorage,
    googleSheetUrl: googleSheetUrl || current.googleSheetUrl,
    googleAppsScriptUrl: googleAppsScriptUrl || current.googleAppsScriptUrl,
    googleAppsScriptSecret,
    slackWebhookUrl: current.slackWebhookUrl,
    updatedAt: new Date().toISOString()
  };
  await writeIntegrationSettings(settings);
  return NextResponse.json({ ok: true, googleSheetsEnabled, resumeStorage, updatedAt: settings.updatedAt });
}
