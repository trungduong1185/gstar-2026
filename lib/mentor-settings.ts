import fs from "node:fs/promises";
import path from "node:path";
import bundledNetwork from "@/public/static/data/previous-gstar-mentors.json";

export type Mentor = { id: string; name: string; image: string; alt: string; group: string; cohortStatus: string; category: string; position: string[]; bio: string; visible?: boolean; social: Record<string, { url: string; title: string }> };
export type MentorNetwork = { version: number; network: string; mentors: Mentor[]; updatedAt?: string };
const storedFile = path.join(process.cwd(), "data", "mentor-network.json");
export async function readMentorNetwork(): Promise<MentorNetwork> { try { return JSON.parse(await fs.readFile(storedFile, "utf8")); } catch { return bundledNetwork as MentorNetwork; } }
export async function writeMentorNetwork(value: MentorNetwork) { await fs.mkdir(path.dirname(storedFile), { recursive: true }); const tmp=`${storedFile}.tmp`; await fs.writeFile(tmp, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 }); await fs.rename(tmp, storedFile); }
