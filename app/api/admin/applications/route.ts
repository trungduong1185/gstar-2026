import { NextResponse } from "next/server";
import { ApplicationStatus, readApplications, updateApplicationStatus } from "@/lib/application-store";

export const runtime = "nodejs";

const statuses: ApplicationStatus[] = ["Submitted", "Assessment", "Shortlisted", "Rejected"];

function publicApplication(application: Awaited<ReturnType<typeof readApplications>>[number]) {
  return {
    ...application,
    resumePath: undefined,
    resumeDownload: application.resumePath ? `/api/admin/applications/${application.id}/resume` : ""
  };
}

export async function GET() {
  const applications = (await readApplications()).reverse().map(publicApplication);
  return NextResponse.json({ applications, source: "prisma-sqlite", count: applications.length });
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" && statuses.includes(body.status as ApplicationStatus) ? body.status as ApplicationStatus : null;
  if (!id || !status) return NextResponse.json({ error: "Application ID and a valid status are required." }, { status: 400 });
  const application = await updateApplicationStatus(id, status);
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ ok: true, application: publicApplication(application) });
}
