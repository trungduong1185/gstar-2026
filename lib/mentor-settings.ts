import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import bundledNetwork from "@/public/static/data/previous-gstar-mentors.json";

export type Mentor = {
  id: string;
  name: string;
  image: string;
  alt: string;
  group: string;
  cohortStatus: string;
  category: string;
  position: string[];
  bio: string;
  visible?: boolean;
  social: Record<string, { url: string; title: string }>;
};

export type MentorNetwork = { version: number; network: string; mentors: Mentor[]; updatedAt?: string };

function mentorData(mentor: Mentor, sortOrder: number): Prisma.MentorCreateManyInput {
  return {
    id: mentor.id,
    name: mentor.name,
    image: mentor.image,
    alt: mentor.alt,
    group: mentor.group,
    cohortStatus: mentor.cohortStatus,
    category: mentor.category,
    position: mentor.position as Prisma.InputJsonValue,
    bio: mentor.bio,
    visible: mentor.visible !== false,
    social: mentor.social as Prisma.InputJsonValue,
    sortOrder
  };
}

async function seedBundledMentors() {
  const mentors = (bundledNetwork as MentorNetwork).mentors;
  await prisma.mentor.createMany({ data: mentors.map(mentorData) });
}

export async function readMentorNetwork(): Promise<MentorNetwork> {
  let rows = await prisma.mentor.findMany({ orderBy: { sortOrder: "asc" } });
  if (!rows.length) {
    await seedBundledMentors();
    rows = await prisma.mentor.findMany({ orderBy: { sortOrder: "asc" } });
  }
  return {
    version: 2,
    network: "Previous GStar mentor network",
    mentors: rows.map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
      alt: row.alt,
      group: row.group,
      cohortStatus: row.cohortStatus,
      category: row.category,
      position: Array.isArray(row.position) ? row.position.filter((value): value is string => typeof value === "string") : [],
      bio: row.bio,
      visible: row.visible,
      social: (row.social || {}) as Mentor["social"]
    })),
    updatedAt: rows.reduce((latest, row) => row.updatedAt > latest ? row.updatedAt : latest, new Date(0)).toISOString()
  };
}

export async function writeMentorNetwork(value: MentorNetwork) {
  await prisma.$transaction([
    prisma.mentor.deleteMany(),
    prisma.mentor.createMany({ data: value.mentors.map(mentorData) })
  ]);
}
