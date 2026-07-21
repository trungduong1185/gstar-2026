import path from "node:path";
import type { Application, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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
  proudProject?: string;
  careerGoal?: string;
  technicalChallenge?: string;
  targetOrganizations?: string;
  impactGoal?: string;
  mathConcepts?: string[];
  machineLearningConcepts?: string[];
  deepLearningConcepts?: string[];
  nlpConcepts?: string[];
  motivationReasons?: string[];
  programGoals?: string;
  preferredTestSlot?: string;
  referralSource?: string;
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
    touchpoints?: Touchpoint[];
    landingPage?: string;
    referrer?: string;
  };
  status?: ApplicationStatus;
  confirmationEmailStatus?: string;
  confirmationEmailSentAt?: string;
  confirmationEmailError?: string;
};

export const dataDirectory = process.env.GSTAR_DATA_DIR || path.join(process.cwd(), "data");
export const uploadDirectory = path.join(dataDirectory, "uploads");

const applicationStatuses = new Set<ApplicationStatus>(["Submitted", "Assessment", "Shortlisted", "Rejected"]);
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function toStoredApplication(row: Application): StoredApplication {
  const status = applicationStatuses.has(row.status as ApplicationStatus) ? row.status as ApplicationStatus : "Submitted";
  const resumeStorage = row.resumeStorage === "google-drive" ? "google-drive" : "vps";
  return {
    id: row.id,
    submittedAt: row.submittedAt.toISOString(),
    fullName: row.fullName,
    email: row.email,
    yearOfBirth: row.yearOfBirth,
    country: row.country,
    currentStatus: row.currentStatus,
    currentRole: row.currentRole,
    organization: row.organization,
    linkedin: row.linkedin,
    github: row.github || undefined,
    aiExperience: row.aiExperience,
    readinessSignals: stringArray(row.readinessSignals),
    proudProject: row.proudProject,
    careerGoal: row.careerGoal,
    technicalChallenge: row.technicalChallenge,
    targetOrganizations: row.targetOrganizations,
    impactGoal: row.impactGoal,
    mathConcepts: stringArray(row.mathConcepts),
    machineLearningConcepts: stringArray(row.machineLearningConcepts),
    deepLearningConcepts: stringArray(row.deepLearningConcepts),
    nlpConcepts: stringArray(row.nlpConcepts),
    motivationReasons: stringArray(row.motivationReasons),
    programGoals: row.programGoals,
    preferredTestSlot: row.preferredTestSlot,
    referralSource: row.referralSource,
    motivation: row.motivation,
    resumeFileName: row.resumeFileName,
    resumeSize: row.resumeSize,
    resumeStorage,
    resumePath: row.resumePath || undefined,
    resumeUrl: row.resumeUrl || undefined,
    googleSheetsSynced: row.googleSheetsSynced,
    scholarshipRequest: row.scholarshipRequest,
    weeklyAvailability: row.weeklyAvailability,
    consent: row.consent,
    attribution: (row.attribution || {}) as StoredApplication["attribution"],
    status,
    confirmationEmailStatus: row.confirmationEmailStatus,
    confirmationEmailSentAt: row.confirmationEmailSentAt?.toISOString(),
    confirmationEmailError: row.confirmationEmailError || undefined
  };
}

function applicationData(application: StoredApplication): Prisma.ApplicationCreateInput {
  return {
    id: application.id,
    submittedAt: new Date(application.submittedAt),
    fullName: application.fullName,
    email: application.email,
    yearOfBirth: application.yearOfBirth,
    country: application.country,
    currentStatus: application.currentStatus,
    currentRole: application.currentRole,
    organization: application.organization,
    linkedin: application.linkedin,
    github: application.github || null,
    aiExperience: application.aiExperience,
    readinessSignals: application.readinessSignals as Prisma.InputJsonValue,
    proudProject: application.proudProject || "",
    careerGoal: application.careerGoal || "",
    technicalChallenge: application.technicalChallenge || "",
    targetOrganizations: application.targetOrganizations || "",
    impactGoal: application.impactGoal || "",
    mathConcepts: (application.mathConcepts || []) as Prisma.InputJsonValue,
    machineLearningConcepts: (application.machineLearningConcepts || []) as Prisma.InputJsonValue,
    deepLearningConcepts: (application.deepLearningConcepts || []) as Prisma.InputJsonValue,
    nlpConcepts: (application.nlpConcepts || []) as Prisma.InputJsonValue,
    motivationReasons: (application.motivationReasons || []) as Prisma.InputJsonValue,
    programGoals: application.programGoals || "",
    preferredTestSlot: application.preferredTestSlot || "",
    referralSource: application.referralSource || "",
    motivation: application.motivation,
    resumeFileName: application.resumeFileName,
    resumeSize: application.resumeSize,
    resumeStorage: application.resumeStorage === "google-drive" ? "google-drive" : "vps",
    resumePath: application.resumePath || null,
    resumeUrl: application.resumeUrl || null,
    googleSheetsSynced: application.googleSheetsSynced ?? false,
    scholarshipRequest: application.scholarshipRequest,
    weeklyAvailability: application.weeklyAvailability,
    consent: application.consent,
    attribution: application.attribution as Prisma.InputJsonValue,
    status: application.status || "Submitted",
    confirmationEmailStatus: application.confirmationEmailStatus || "not-configured",
    confirmationEmailSentAt: application.confirmationEmailSentAt ? new Date(application.confirmationEmailSentAt) : null,
    confirmationEmailError: application.confirmationEmailError || null
  };
}

export async function appendApplication(application: StoredApplication) {
  await prisma.application.create({ data: applicationData(application) });
}

export async function upsertApplication(application: StoredApplication) {
  const data = applicationData(application);
  await prisma.application.upsert({ where: { id: application.id }, create: data, update: data });
}

export async function readApplications(): Promise<StoredApplication[]> {
  const applications = await prisma.application.findMany({ orderBy: { submittedAt: "asc" } });
  return applications.map(toStoredApplication);
}

export async function findApplication(id: string) {
  const application = await prisma.application.findUnique({ where: { id } });
  return application ? toStoredApplication(application) : null;
}

export async function findApplicationByEmailSince(email: string, cutoff: Date) {
  const application = await prisma.application.findFirst({
    where: { email: email.trim().toLowerCase(), submittedAt: { gte: cutoff } },
    orderBy: { submittedAt: "desc" }
  });
  return application ? toStoredApplication(application) : null;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  const existing = await prisma.application.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const application = await prisma.application.update({ where: { id }, data: { status } });
  return toStoredApplication(application);
}

export async function updateConfirmationEmailStatus(id: string, status: string, error = "") {
  await prisma.application.update({
    where: { id },
    data: {
      confirmationEmailStatus: status,
      confirmationEmailSentAt: status === "sent" ? new Date() : null,
      confirmationEmailError: error || null
    }
  });
}
