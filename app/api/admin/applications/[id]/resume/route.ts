import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { findApplication, uploadDirectory } from "@/lib/application-store";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const application = await findApplication(id);
  if (!application?.resumePath) return NextResponse.json({ error: "Resume file not found." }, { status: 404 });
  const resolvedPath = path.resolve(application.resumePath);
  const allowedRoot = `${path.resolve(uploadDirectory)}${path.sep}`;
  if (!resolvedPath.startsWith(allowedRoot)) return NextResponse.json({ error: "Invalid resume path." }, { status: 400 });
  try {
    const file = await fs.readFile(resolvedPath);
    const safeName = application.resumeFileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(file, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${safeName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Resume file not found." }, { status: 404 });
  }
}
