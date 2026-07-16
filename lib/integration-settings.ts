import { prisma } from "@/lib/prisma";

export type IntegrationSettings = {
  googleSheetsEnabled: boolean;
  resumeStorage: "vps" | "google-drive";
  googleSheetUrl: string;
  googleAppsScriptUrl: string;
  googleAppsScriptSecret: string;
  slackWebhookUrl: string;
  confirmationEmailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "starttls" | "tls" | "none";
  smtpUsername: string;
  smtpPassword: string;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
  gaMeasurementId: string;
  updatedAt: string;
};

const defaults: IntegrationSettings = {
  googleSheetsEnabled: false,
  resumeStorage: "vps",
  googleSheetUrl: "",
  googleAppsScriptUrl: "",
  googleAppsScriptSecret: "",
  slackWebhookUrl: "",
  confirmationEmailEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecurity: "starttls",
  smtpUsername: "",
  smtpPassword: "",
  emailFromName: "GStar Bootcamp",
  emailFromAddress: "",
  emailReplyTo: "",
  gaMeasurementId: "",
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
    confirmationEmailEnabled: stored.confirmationEmailEnabled,
    smtpHost: stored.smtpHost,
    smtpPort: stored.smtpPort,
    smtpSecurity: stored.smtpSecurity === "tls" || stored.smtpSecurity === "none" ? stored.smtpSecurity : "starttls",
    smtpUsername: stored.smtpUsername,
    smtpPassword: stored.smtpPassword,
    emailFromName: stored.emailFromName,
    emailFromAddress: stored.emailFromAddress,
    emailReplyTo: stored.emailReplyTo,
    gaMeasurementId: stored.gaMeasurementId,
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

export async function resolvedGaMeasurementId(): Promise<string> {
  const stored = await readIntegrationSettings();
  return stored.gaMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
}

export async function resolvedEmailSettings() {
  const stored = await readIntegrationSettings();
  const security = stored.smtpSecurity || (process.env.SMTP_SECURE === "true" ? "tls" : "starttls");
  return {
    enabled: stored.confirmationEmailEnabled || process.env.CONFIRMATION_EMAIL_ENABLED === "true",
    host: stored.smtpHost || process.env.SMTP_HOST || "",
    port: stored.smtpHost ? stored.smtpPort : Number(process.env.SMTP_PORT || 587),
    security,
    username: stored.smtpUsername || process.env.SMTP_USERNAME || "",
    password: stored.smtpPassword || process.env.SMTP_PASSWORD || "",
    fromName: stored.emailFromName || process.env.EMAIL_FROM_NAME || "GStar Bootcamp",
    fromAddress: stored.emailFromAddress || process.env.EMAIL_FROM_ADDRESS || "",
    replyTo: stored.emailReplyTo || process.env.EMAIL_REPLY_TO || "",
    source: stored.smtpHost ? "admin" : "environment"
  };
}

export async function writeIntegrationSettings(settings: IntegrationSettings) {
  const data = {
    googleSheetsEnabled: settings.googleSheetsEnabled,
    resumeStorage: settings.resumeStorage,
    googleSheetUrl: settings.googleSheetUrl,
    googleAppsScriptUrl: settings.googleAppsScriptUrl,
    googleAppsScriptSecret: settings.googleAppsScriptSecret,
    slackWebhookUrl: settings.slackWebhookUrl,
    confirmationEmailEnabled: settings.confirmationEmailEnabled,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecurity: settings.smtpSecurity,
    smtpUsername: settings.smtpUsername,
    smtpPassword: settings.smtpPassword,
    emailFromName: settings.emailFromName,
    emailFromAddress: settings.emailFromAddress,
    emailReplyTo: settings.emailReplyTo,
    gaMeasurementId: settings.gaMeasurementId
  };
  await prisma.integrationSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data
  });
}
