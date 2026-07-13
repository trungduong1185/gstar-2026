import fs from "node:fs/promises";
import path from "node:path";

export type IntegrationSettings = {
  googleSheetsEnabled: boolean;
  resumeStorage: "vps" | "google-drive";
  googleSheetUrl: string;
  googleAppsScriptUrl: string;
  googleAppsScriptSecret: string;
  updatedAt: string;
};

const settingsPath = path.join(process.cwd(), "data", "integration-settings.json");

export function spreadsheetIdFromUrl(value: string) {
  return value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || "";
}

export async function readIntegrationSettings(): Promise<IntegrationSettings> {
  try {
    const stored = JSON.parse(await fs.readFile(settingsPath, "utf8")) as Partial<IntegrationSettings>;
    return {
      googleSheetsEnabled: stored.googleSheetsEnabled ?? false,
      resumeStorage: stored.resumeStorage === "google-drive" ? "google-drive" : "vps",
      googleSheetUrl: stored.googleSheetUrl || "",
      googleAppsScriptUrl: stored.googleAppsScriptUrl || "",
      googleAppsScriptSecret: stored.googleAppsScriptSecret || "",
      updatedAt: stored.updatedAt || ""
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Unable to read integration settings", error);
    return { googleSheetsEnabled: false, resumeStorage: "vps", googleSheetUrl: "", googleAppsScriptUrl: "", googleAppsScriptSecret: "", updatedAt: "" };
  }
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

export async function writeIntegrationSettings(settings: IntegrationSettings) {
  const directory = path.dirname(settingsPath);
  const temporaryPath = `${settingsPath}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporaryPath, JSON.stringify(settings, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporaryPath, settingsPath);
}
