import fs from "node:fs/promises";
import path from "node:path";

export type ProgramSettings = { cohortYear: number; timezone: string; timezoneLabel: string; dates: Record<string, string>; updatedAt: string };
export const defaultProgramSettings: ProgramSettings = { cohortYear: 2026, timezone: "Asia/Ho_Chi_Minh", timezoneLabel: "Indochina Time", dates: { applicationsOpen: "2026-07-01T00:00:00+07:00", earlyBirdDeadline: "2026-07-25T23:59:59+07:00", finalDeadline: "2026-08-10T23:59:59+07:00", bootcampStart: "2026-09-01T00:00:00+07:00", capstone: "2026-12-01T00:00:00+07:00", summit: "2027-01-01T00:00:00+07:00" }, updatedAt: "" };
const file = path.join(process.cwd(), "data", "program-settings.json");
export async function readProgramSettings() { try { return { ...defaultProgramSettings, ...JSON.parse(await fs.readFile(file, "utf8")) } as ProgramSettings; } catch { return defaultProgramSettings; } }
export async function writeProgramSettings(value: ProgramSettings) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 }); }
