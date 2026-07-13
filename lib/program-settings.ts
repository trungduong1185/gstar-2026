import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ProgramSettings = { cohortYear: number; timezone: string; timezoneLabel: string; dates: Record<string, string>; updatedAt: string };

export const defaultProgramSettings: ProgramSettings = {
  cohortYear: 2026,
  timezone: "Asia/Ho_Chi_Minh",
  timezoneLabel: "Indochina Time",
  dates: {
    applicationsOpen: "2026-07-01T00:00:00+07:00",
    earlyBirdDeadline: "2026-07-25T23:59:59+07:00",
    finalDeadline: "2026-08-10T23:59:59+07:00",
    bootcampStart: "2026-09-01T00:00:00+07:00",
    capstone: "2026-12-01T00:00:00+07:00",
    summit: "2027-01-01T00:00:00+07:00"
  },
  updatedAt: ""
};

export async function readProgramSettings(): Promise<ProgramSettings> {
  const stored = await prisma.programSetting.findUnique({ where: { id: 1 } });
  if (!stored) return defaultProgramSettings;
  return {
    cohortYear: stored.cohortYear,
    timezone: stored.timezone,
    timezoneLabel: stored.timezoneLabel,
    dates: (stored.dates || {}) as Record<string, string>,
    updatedAt: stored.updatedAt.toISOString()
  };
}

export async function writeProgramSettings(value: ProgramSettings) {
  await prisma.programSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      cohortYear: value.cohortYear,
      timezone: value.timezone,
      timezoneLabel: value.timezoneLabel,
      dates: value.dates as Prisma.InputJsonValue
    },
    update: {
      cohortYear: value.cohortYear,
      timezone: value.timezone,
      timezoneLabel: value.timezoneLabel,
      dates: value.dates as Prisma.InputJsonValue
    }
  });
}
