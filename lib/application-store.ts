import fs from "node:fs/promises";
import path from "node:path";
import type { Touchpoint } from "@/lib/utm";

export type ApplicationStatus = "Submitted" | "Assessment" | "Shortlisted" | "Rejected";

export type StoredApplication = {
  id: string;
  submittedAt: string;
  fullName: string;
  email: string;
  yearOfBirth: string;
  country: string;
  currentStatus: string;
  currentRole: string;
  organization: string;
  linkedin: string;
  github?: string;
  aiExperience: string;
  readinessSignals: string[];
  motivation: string;
  resumeFileName: string;
  resumeSize: number;
  resumeStorage?: "vps" | "google-drive";
  resumePath?: string;
  resumeUrl?: string;
  googleSheetsSynced?: boolean;
  scholarshipRequest: boolean;
  weeklyAvailability: boolean;
  consent: boolean;
  attribution: {
    firstTouch?: Record<string, string>;
    lastTouch?: Record<string, string>;
    /**
     * Full multi-touch history — populated from Sprint 2 onwards.
     * Older records saved before this rollout may be absent; consumers should
     * fall back to firstTouch/lastTouch when the array is missing or empty.
     */
    touchpoints?: Touchpoint[];
    landingPage?: string;
    referrer?: string;
  };
  status?: ApplicationStatus;
};

export const dataDirectory = path.join(process.cwd(), "data");
export const uploadDirectory = path.join(dataDirectory, "uploads");
const submissionsPath = path.join(dataDirectory, "submissions.ndjson");

export async function appendApplication(application: StoredApplication) {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.appendFile(submissionsPath, `${JSON.stringify(application)}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function readApplications(): Promise<StoredApplication[]> {
  try {
    const content = await fs.readFile(submissionsPath, "utf8");
    return content.split("\n").filter(Boolean).flatMap((line) => {
      try {
        const item = JSON.parse(line) as StoredApplication;
        return item?.id ? [{ ...item, status: item.status || "Submitted" }] : [];
      } catch {
        return [];
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Unable to read applications", error);
    return [];
  }
}

export async function findApplication(id: string) {
  return (await readApplications()).find((application) => application.id === id) || null;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  const applications = await readApplications();
  const index = applications.findIndex((application) => application.id === id);
  if (index < 0) return null;
  applications[index] = { ...applications[index], status };
  const temporaryPath = `${submissionsPath}.tmp`;
  await fs.writeFile(temporaryPath, `${applications.map((application) => JSON.stringify(application)).join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporaryPath, submissionsPath);
  return applications[index];
}
