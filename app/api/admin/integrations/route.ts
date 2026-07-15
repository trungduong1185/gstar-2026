import { NextResponse } from "next/server";
import { readIntegrationSettings, resolvedEmailSettings, resolvedGoogleSheetsSettings, spreadsheetIdFromUrl, writeIntegrationSettings, type IntegrationSettings } from "@/lib/integration-settings";

export const runtime = "nodejs";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const email = await resolvedEmailSettings();
  return NextResponse.json({
    googleSheetsEnabled: stored.googleSheetsEnabled,
    resumeStorage: stored.resumeStorage,
    googleSheetUrl: stored.googleSheetUrl,
    googleAppsScriptUrl: stored.googleAppsScriptUrl,
    secretConfigured: Boolean(resolved.secret),
    confirmationEmailEnabled: stored.confirmationEmailEnabled,
    smtpHost: stored.smtpHost,
    smtpPort: stored.smtpPort,
    smtpSecurity: stored.smtpSecurity,
    smtpUsername: stored.smtpUsername,
    smtpPasswordConfigured: Boolean(email.password),
    emailFromName: stored.emailFromName,
    emailFromAddress: stored.emailFromAddress,
    emailReplyTo: stored.emailReplyTo,
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
  const confirmationEmailEnabled = body.confirmationEmailEnabled === "on" || body.confirmationEmailEnabled === "true" || body.confirmationEmailEnabled === true;
  const resumeStorage = body.resumeStorage === "google-drive" ? "google-drive" : body.resumeStorage === "vps" ? "vps" : "";
  if (!resumeStorage) return NextResponse.json({ error: "Select where Resume / CV files should be stored." }, { status: 400 });

  const googleRequired = googleSheetsEnabled || resumeStorage === "google-drive";
  if (googleSheetsEnabled && !spreadsheetIdFromUrl(googleSheetUrl)) return NextResponse.json({ error: "Enter a valid Google Sheets URL." }, { status: 400 });
  if (googleRequired && !validAppsScriptUrl(googleAppsScriptUrl)) return NextResponse.json({ error: "Enter a deployed Google Apps Script Web App URL." }, { status: 400 });

  const googleAppsScriptSecret = submittedSecret || current.googleAppsScriptSecret || process.env.GOOGLE_APPS_SCRIPT_SECRET || "";
  if (googleRequired && !googleAppsScriptSecret) return NextResponse.json({ error: "Shared secret is required for Google Sheets or Drive." }, { status: 400 });

  const smtpHost = typeof body.smtpHost === "string" ? body.smtpHost.trim() : current.smtpHost;
  const smtpPort = Number(body.smtpPort || current.smtpPort || 587);
  const smtpSecurity = body.smtpSecurity === "tls" || body.smtpSecurity === "none" ? body.smtpSecurity : "starttls";
  const smtpUsername = typeof body.smtpUsername === "string" ? body.smtpUsername.trim() : current.smtpUsername;
  const submittedSmtpPassword = typeof body.smtpPassword === "string" ? body.smtpPassword : "";
  const smtpPassword = submittedSmtpPassword || current.smtpPassword || process.env.SMTP_PASSWORD || "";
  const emailFromName = typeof body.emailFromName === "string" ? body.emailFromName.trim().slice(0, 100) : current.emailFromName;
  const emailFromAddress = typeof body.emailFromAddress === "string" ? body.emailFromAddress.trim().toLowerCase() : current.emailFromAddress;
  const emailReplyTo = typeof body.emailReplyTo === "string" ? body.emailReplyTo.trim().toLowerCase() : current.emailReplyTo;

  if (confirmationEmailEnabled) {
    if (!smtpHost) return NextResponse.json({ error: "SMTP host is required for confirmation emails." }, { status: 400 });
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) return NextResponse.json({ error: "Enter a valid SMTP port." }, { status: 400 });
    if (!EMAIL.test(emailFromAddress)) return NextResponse.json({ error: "Enter a valid From email address." }, { status: 400 });
    if (emailReplyTo && !EMAIL.test(emailReplyTo)) return NextResponse.json({ error: "Enter a valid Reply-to email address." }, { status: 400 });
    if ((smtpUsername && !smtpPassword) || (!smtpUsername && smtpPassword)) return NextResponse.json({ error: "SMTP username and password must be configured together." }, { status: 400 });
  }

  const settings: IntegrationSettings = {
    googleSheetsEnabled,
    resumeStorage,
    googleSheetUrl: googleSheetUrl || current.googleSheetUrl,
    googleAppsScriptUrl: googleAppsScriptUrl || current.googleAppsScriptUrl,
    googleAppsScriptSecret,
    slackWebhookUrl: current.slackWebhookUrl,
    confirmationEmailEnabled,
    smtpHost,
    smtpPort,
    smtpSecurity,
    smtpUsername,
    smtpPassword,
    emailFromName: emailFromName || "GStar Bootcamp",
    emailFromAddress,
    emailReplyTo,
    updatedAt: new Date().toISOString()
  };
  await writeIntegrationSettings(settings);
  return NextResponse.json({ ok: true, googleSheetsEnabled, resumeStorage, confirmationEmailEnabled, smtpPasswordConfigured: Boolean(smtpPassword), updatedAt: settings.updatedAt });
}
