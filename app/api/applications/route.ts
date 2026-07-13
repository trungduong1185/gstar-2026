import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { appendApplication, StoredApplication, uploadDirectory } from "@/lib/application-store";
import { resolvedGoogleSheetsSettings } from "@/lib/integration-settings";
import { findIdempotent, findRecentByEmail, rememberIdempotent, sanitizeIdempotencyKey } from "@/lib/dedup";
import { notifySlack } from "@/lib/slack-notifier";
import { sendMetaLead } from "@/lib/meta-capi";
import { sanitizeTouchpoints } from "@/lib/utm";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

type RateEntry = { count: number; resetAt: number };
const globalRateStore = globalThis as typeof globalThis & { gstarRateStore?: Map<string, RateEntry> };
const rateStore = globalRateStore.gstarRateStore ??= new Map<string, RateEntry>();

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 6_000_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  // Idempotency check: if the client is retrying with the same key, return the previous ID
  // as a success instead of storing a duplicate. Runs before rate-limit so a network retry
  // does not eat the applicant's rate budget.
  const idempotencyKey = sanitizeIdempotencyKey(request.headers.get("x-idempotency-key"));
  if (idempotencyKey) {
    const previous = findIdempotent(idempotencyKey);
    if (previous) return NextResponse.json({ ok: true, mode: "duplicate", id: previous.previousId });
  }

  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const now = Date.now();
  const current = rateStore.get(ip);
  const rate = !current || current.resetAt <= now ? { count: 1, resetAt: now + WINDOW_MS } : { ...current, count: current.count + 1 };
  rateStore.set(ip, rate);
  if (rate.count > MAX_REQUESTS) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });

  let body: Record<string, unknown>;
  let resumeFile: File | null = null;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
      body.readiness = form.getAll("readiness").filter((value): value is string => typeof value === "string");
      const candidate = form.get("resume");
      resumeFile = candidate instanceof File && candidate.size ? candidate : null;
      if (typeof body.attribution === "string") {
        try { body.attribution = JSON.parse(body.attribution); } catch { body.attribution = {}; }
      }
    } else {
      body = await request.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid application payload." }, { status: 400 });
  }
  if (text(body.website)) return NextResponse.json({ ok: true, mode: "filtered" });

  if (!resumeFile || resumeFile.size > 5_000_000 || (resumeFile.type !== "application/pdf" && !resumeFile.name.toLowerCase().endsWith(".pdf"))) {
    return NextResponse.json({ error: "Please attach a PDF resume up to 5 MB." }, { status: 400 });
  }

  const application = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    fullName: text(body.fullName, 120),
    email: text(body.email, 180).toLowerCase(),
    yearOfBirth: text(body.yearOfBirth, 4),
    country: text(body.country, 100),
    currentStatus: text(body.currentStatus, 80),
    currentRole: text(body.currentRole, 140),
    organization: text(body.organization, 180),
    linkedin: text(body.linkedin, 300),
    github: text(body.github, 300),
    aiExperience: text(body.aiExperience, 50),
    readinessSignals: Array.isArray(body.readiness) ? body.readiness.map((value) => text(value, 40)).filter(Boolean).slice(0, 5) : [],
    motivation: text(body.motivation, 2000),
    resumeFileName: resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, "-"),
    resumeSize: resumeFile.size,
    scholarshipRequest: body.scholarshipRequest === "yes",
    weeklyAvailability: body.weeklyAvailability === "yes",
    consent: body.consent === "yes",
    attribution: body.attribution || {}
  };

  // Sanitize the client-supplied touchpoints[] array. Bad input is dropped
  // silently — the firstTouch/lastTouch legacy fields still carry attribution
  // in that case, so we never fail a submission on malformed history data.
  const rawAttribution = (application.attribution || {}) as Record<string, unknown>;
  const touchpoints = sanitizeTouchpoints(rawAttribution.touchpoints);
  application.attribution = { ...rawAttribution, touchpoints };

  const birthYear = Number(application.yearOfBirth);
  if (!application.fullName || !EMAIL.test(application.email) || birthYear < 1940 || birthYear > 2010 || !application.country || !application.organization || !application.currentStatus || !application.currentRole || !application.linkedin || !application.aiExperience || !application.motivation || !application.weeklyAvailability || !application.consent) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  // Email dedup: reject silent double-submits within the last 24h.
  // Applicants who legitimately need to resubmit can email ops — the alternative
  // (allowing repeat rows) pollutes attribution reports and CRM sync.
  const duplicate = await findRecentByEmail(application.email);
  if (duplicate) {
    return NextResponse.json(
      { ok: true, mode: "duplicate", id: duplicate.previousId, message: "An application from this email was received within the last 24 hours." },
      { status: 200 }
    );
  }

  const { googleSheetsEnabled, resumeStorage, endpoint, secret, spreadsheetId } = await resolvedGoogleSheetsSettings();
  const googleRequired = googleSheetsEnabled || resumeStorage === "google-drive";
  const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
  let resumeUrl = "";

  if (googleRequired) {
    if (!endpoint || !secret || (googleSheetsEnabled && !spreadsheetId)) {
      return NextResponse.json({ error: "Google Sheets or Drive storage is not fully configured." }, { status: 503 });
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...application,
          resume: resumeStorage === "google-drive" ? { name: application.resumeFileName, mimeType: "application/pdf", data: resumeBuffer.toString("base64") } : null,
          secret,
          spreadsheetId,
          writeSheet: googleSheetsEnabled,
          storeResumeInDrive: resumeStorage === "google-drive"
        }),
        signal: AbortSignal.timeout(10000)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false) throw new Error("Google Apps Script rejected the submission");
      resumeUrl = typeof result?.resumeUrl === "string" ? result.resumeUrl : "";
      if (resumeStorage === "google-drive" && !resumeUrl) throw new Error("Google Drive did not return a resume URL");
    } catch (error) {
      console.error("Application forwarding failed", error);
      return NextResponse.json({ error: "The application service is temporarily unavailable." }, { status: 502 });
    }
  }

  let resumePath = "";
  if (resumeStorage === "vps") {
    await fs.mkdir(uploadDirectory, { recursive: true });
    resumePath = path.join(uploadDirectory, `${application.id}-${application.resumeFileName}`);
    await fs.writeFile(resumePath, resumeBuffer, { mode: 0o600 });
  }

  const storedApplication: StoredApplication = {
    ...application,
    attribution: application.attribution as StoredApplication["attribution"],
    resumeStorage,
    resumePath: resumePath || undefined,
    resumeUrl: resumeUrl || undefined,
    googleSheetsSynced: googleSheetsEnabled,
    status: "Submitted"
  };
  await appendApplication(storedApplication);

  // Record the idempotency key AFTER the write succeeds so a retry of a failed
  // submission is still allowed to save.
  if (idempotencyKey) rememberIdempotent(idempotencyKey, application.id);

  // Slack notification is fire-and-forget — see slack-notifier.ts.
  notifySlack(storedApplication);

  // Server-side Meta Conversions API — bypasses ITP / ad-blockers.
  // No-op unless META_PIXEL_ID + META_ACCESS_TOKEN are set. Fire-and-forget.
  sendMetaLead(storedApplication);

  return NextResponse.json({ ok: true, mode: googleRequired ? "local-and-google" : "local", id: application.id });
}
