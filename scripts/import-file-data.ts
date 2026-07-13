import fs from "node:fs/promises";
import path from "node:path";
import { upsertApplication, type StoredApplication } from "../lib/application-store";
import { writeIntegrationSettings, type IntegrationSettings } from "../lib/integration-settings";
import { readMentorNetwork, writeMentorNetwork, type MentorNetwork } from "../lib/mentor-settings";
import { prisma } from "../lib/prisma";
import { writeProgramSettings, type ProgramSettings } from "../lib/program-settings";

const dataDirectory = path.join(process.cwd(), "data");

async function readJson<T>(fileName: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDirectory, fileName), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
}

async function importApplications() {
  let content = "";
  try {
    content = await fs.readFile(path.join(dataDirectory, "submissions.ndjson"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
  const applications = content.split("\n").filter(Boolean).flatMap((line) => {
    try {
      const application = JSON.parse(line) as StoredApplication;
      return application?.id ? [application] : [];
    } catch {
      return [];
    }
  });
  for (const application of applications) await upsertApplication(application);
  return applications.length;
}

async function main() {
  const applications = await importApplications();

  const mentorNetwork = await readJson<MentorNetwork>("mentor-network.json");
  if (mentorNetwork?.mentors?.length) await writeMentorNetwork(mentorNetwork);
  else await readMentorNetwork();

  const programSettings = await readJson<ProgramSettings>("program-settings.json");
  if (programSettings) await writeProgramSettings(programSettings);

  const integrationSettings = await readJson<IntegrationSettings>("integration-settings.json");
  if (integrationSettings) await writeIntegrationSettings(integrationSettings);

  const [databaseApplications, databaseMentors] = await Promise.all([
    prisma.application.count(),
    prisma.mentor.count()
  ]);
  console.log(JSON.stringify({ importedApplications: applications, databaseApplications, databaseMentors }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
