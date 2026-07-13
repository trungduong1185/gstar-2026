import { prisma } from "@/lib/prisma";

export type IntegrationSettings = {
  googleSheetsEnabled: boolean;
  resumeStorage: "vps" | "google-drive";
  googleSheetUrl: string;
  googleAppsScriptUrl: string;
  googleAppsScriptSecret: string;
  slackWebhookUrl: string;
  updatedAt: string;
};

const defaults: IntegrationSettings = {
  googleSheetsEnabled: false,
  resumeStorage: "vps",
  googleSheetUrl: "",
  googleAppsScriptUrl: "",
  googleAppsScriptSecret: "",
  slackWebhookUrl: "",
  updatedAt: ""
};

export function spreadsheetIdFromUrl(value: string) {
  return value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || "";
}

export async function readIntegrationSettings(): Promise<IntegrationSettings> {
  const stored = await prisma.integrationSetting.findUnique({ where: { id: 1 } });
  if (!stored) return defaults;
  return {
    googleSheetsEnabled: stored.googleSheetsEnabled,
    resumeStorage: stored.resumeStorage === "google-drive" ? "google-drive" : "vps",
    googleSheetUrl: stored.googleSheetUrl,
    googleAppsScriptUrl: stored.googleAppsScriptUrl,
    googleAppsScriptSecret: stored.googleAppsScriptSecret,
    slackWebhookUrl: stored.slackWebhookUrl,
    updatedAt: stored.updatedAt.toISOString()
  };
}

export async function resolvedGoogleSheetsSettings() {
  const stored = await readIntegrationSettings();
  return {
    googleSheetsEnabled: stored.googleSheetsEnabled,
    resumeStorage: stored.resumeStorage,
    sheetUrl: stored.googleSheetUrl,
    spreadsheetId: spreadsheetIdFromUrl(stored.googleSheetUrl),
    endpoint: stored.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || "",
    secret: stored.googleAppsScriptSecret || process.env.GOOGLE_APPS_SCRIPT_SECRET || "",
    source: stored.googleAppsScriptUrl ? "admin" : "environment"
  };
}

export async function resolvedSlackWebhookUrl(): Promise<string> {
  const stored = await readIntegrationSettings();
  return stored.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL || "";
}

export async function writeIntegrationSettings(settings: IntegrationSettings) {
  const data = {
    googleSheetsEnabled: settings.googleSheetsEnabled,
    resumeStorage: settings.resumeStorage,
    googleSheetUrl: settings.googleSheetUrl,
    googleAppsScriptUrl: settings.googleAppsScriptUrl,
    googleAppsScriptSecret: settings.googleAppsScriptSecret,
    slackWebhookUrl: settings.slackWebhookUrl
  };
  await prisma.integrationSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data
  });
}
