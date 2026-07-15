import nodemailer from "nodemailer";
import path from "node:path";
import type { StoredApplication } from "@/lib/application-store";
import { updateConfirmationEmailStatus } from "@/lib/application-store";
import { resolvedEmailSettings } from "@/lib/integration-settings";
import { readProgramSettings } from "@/lib/program-settings";

type EmailSettings = Awaited<ReturnType<typeof resolvedEmailSettings>>;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function display(value: unknown, fallback = "Not provided") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function yesNo(value: boolean, yes: string, no: string) {
  return value ? yes : no;
}

function list(value: string[] | undefined) {
  return value?.length ? value.join("; ") : "None selected";
}

function textSection(title: string, rows: Array<[string, unknown]>) {
  return [title, ...rows.map(([label, value]) => `${label}: ${display(value)}`), ""].join("\n");
}

function htmlValue(value: unknown) {
  return escapeHtml(display(value)).replace(/\n/g, "<br>");
}

function detailRows(rows: Array<[string, unknown]>) {
  return rows.map(([label, value]) => `<tr><td style="width:34%;padding:10px 12px 10px 0;border-bottom:1px solid #ece9ed;color:#6f6b74;font-size:13px;line-height:20px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #ece9ed;color:#211f26;font-size:15px;line-height:22px;vertical-align:top;overflow-wrap:anywhere">${htmlValue(value)}</td></tr>`).join("");
}

function answerCards(rows: Array<[string, unknown]>) {
  return rows.map(([label, value]) => `<tr><td style="padding:0 0 14px"><div style="padding:16px 18px;border:1px solid #e7e3e8;border-radius:6px;background:#faf9fa"><div style="margin-bottom:7px;color:#6f6b74;font-size:12px;font-weight:700;line-height:18px;text-transform:uppercase">${escapeHtml(label)}</div><div style="color:#211f26;font-size:15px;line-height:24px;overflow-wrap:anywhere">${htmlValue(value)}</div></div></td></tr>`).join("");
}

function emailSection(title: string, eyebrow: string, content: string) {
  return `<tr><td style="padding:28px 34px 0"><div style="margin-bottom:5px;color:#731013;font-size:11px;font-weight:700;line-height:16px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(eyebrow)}</div><h2 style="margin:0 0 16px;color:#211f26;font-size:20px;line-height:28px">${escapeHtml(title)}</h2>${content}</td></tr>`;
}

function emailAttachments() {
  return [{
    filename: "new-turing-institute.png",
    path: path.join(process.cwd(), "public/static/img/nti-logo-white-email.png"),
    cid: "nti-logo-white"
  }];
}

function transporterFor(settings: EmailSettings) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "tls",
    requireTLS: settings.security === "starttls",
    auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 12000
  });
}

function validateSettings(settings: EmailSettings) {
  if (!settings.enabled) throw new Error("Applicant confirmation email is disabled.");
  if (!settings.host || !settings.fromAddress) throw new Error("Applicant email SMTP settings are incomplete.");
  if (settings.username && !settings.password) throw new Error("SMTP authentication password is missing.");
}

function buildApplicationReceipt(application: StoredApplication, cohortYear: number, test = false) {
  const subject = `${test ? "[Test] " : ""}We've received your GStar Bootcamp ${cohortYear} application`;
  const profileRows: Array<[string, unknown]> = [
    ["Full name", application.fullName],
    ["Email", application.email],
    ["Year of birth", application.yearOfBirth],
    ["City of residence & work", application.country],
    ["Current company / school", application.organization],
    ["Current status", application.currentStatus],
    ["Current position / school major", application.currentRole],
    ["Website / LinkedIn", application.linkedin],
    ["Resume / CV", application.resumeFileName],
    ["AI experience", application.aiExperience],
    ["Weekly availability", yesNo(application.weeklyAvailability, "15–20 hours per week confirmed", "Not confirmed")],
    ["Scholarship consideration", yesNo(application.scholarshipRequest, "Requested", "Not requested")],
    ["Data processing consent", yesNo(application.consent, "Recorded", "Not recorded")]
  ];
  const careerRows: Array<[string, unknown]> = [
    ["Project you are most proud of", application.proudProject],
    ["Role you want to pursue", application.careerGoal],
    ["Most challenging AI problem", application.technicalChallenge],
    ["Target companies or organizations", application.targetOrganizations],
    ["Impact you want to make in 3–5 years", application.impactGoal]
  ];
  const skillsRows: Array<[string, unknown]> = [
    ["Foundational mathematics", list(application.mathConcepts)],
    ["Machine learning", list(application.machineLearningConcepts)],
    ["Deep learning", list(application.deepLearningConcepts)],
    ["Natural language processing", list(application.nlpConcepts)],
    ["Readiness signals", list(application.readinessSignals)]
  ];
  const motivationRows: Array<[string, unknown]> = [
    ["Top reasons for joining", list(application.motivationReasons)],
    ["Goals during and after the program", application.programGoals || application.motivation],
    ["Preferred entrance test time", application.preferredTestSlot],
    ["How you heard about GStar", application.referralSource]
  ];
  const text = [
    `Hi ${application.fullName},`,
    "",
    `Thank you for applying to GStar Bootcamp ${cohortYear}. Your application has been received successfully.`,
    `Application reference: ${application.id}`,
    "",
    "Below is a copy of the information you submitted.",
    "",
    textSection("PERSONAL INFORMATION", profileRows),
    textSection("ACHIEVEMENTS & CAREER GOALS", careerRows),
    textSection("TECHNICAL SELF-ASSESSMENT", skillsRows),
    textSection("MOTIVATION & LOGISTICS", motivationRows),
    "WHAT HAPPENS NEXT?",
    "Our selection team will review your application and contact you at this email address with the next step.",
    "You do not need to submit the form again.",
    "",
    "GStar Bootcamp · New Turing Institute"
  ].join("\n");

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head><body style="margin:0;background:#f3f1f4;color:#211f26;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f1f4"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border:1px solid #ded9e0;border-radius:8px;background:#ffffff;overflow:hidden">
    <tr><td style="padding:28px 34px 26px;background:#731013"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="vertical-align:middle"><img src="cid:nti-logo-white" width="220" height="44" alt="New Turing Institute" style="display:block;width:220px;max-width:100%;height:auto;border:0"><div style="margin-top:12px;color:#f4dfe0;font-size:12px;font-weight:700;line-height:18px;letter-spacing:.08em;text-transform:uppercase">GStar Bootcamp · ${cohortYear}</div></td><td align="right" style="padding-left:20px;color:#f4dfe0;font-size:12px;line-height:18px;vertical-align:middle">NTI Global<br>Talent Program</td></tr></table></td></tr>
    <tr><td style="padding:30px 34px 8px"><h1 style="margin:0 0 16px;color:#211f26;font-size:30px;line-height:38px">Application received</h1><p style="margin:0 0 14px;color:#211f26;font-size:16px;line-height:26px">Hi ${escapeHtml(application.fullName)},</p><p style="margin:0;color:#4f4b54;font-size:16px;line-height:26px">Thank you for applying to GStar Bootcamp ${cohortYear}. We received your application successfully.</p><div style="margin-top:22px;padding:16px 18px;border-left:4px solid #731013;border-radius:4px;background:#f8eeee"><div style="color:#6f6b74;font-size:12px;line-height:18px">Application reference</div><strong style="display:block;margin-top:4px;color:#211f26;font-size:14px;line-height:20px;overflow-wrap:anywhere">${escapeHtml(application.id)}</strong></div>${test ? `<div style="margin-top:14px;padding:12px 16px;border:1px solid #d9a7aa;border-radius:5px;background:#fff7f7;color:#731013;font-size:13px;line-height:20px"><strong>Test email:</strong> SMTP delivery and the applicant receipt template are working.</div>` : ""}</td></tr>
    ${emailSection("Personal information", "01 · Profile", `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows(profileRows)}</table>`)}
    ${emailSection("Achievements & career goals", "02 · Goals", `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${answerCards(careerRows)}</table>`)}
    ${emailSection("Technical self-assessment", "03 · Skills", `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${answerCards(skillsRows)}</table>`)}
    ${emailSection("Motivation & logistics", "04 · Motivation", `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${answerCards(motivationRows)}</table>`)}
    <tr><td style="padding:28px 34px 32px"><div style="padding:20px;border-radius:6px;background:#211f26;color:#ffffff"><h2 style="margin:0 0 8px;font-size:18px;line-height:25px">What happens next?</h2><p style="margin:0;color:#d8d4da;font-size:14px;line-height:22px">Our selection team will review your application and contact you at this email address with the next step. You do not need to submit the form again.</p></div></td></tr>
    <tr><td style="padding:22px 34px;background:#731013;color:#ffffff"><strong style="font-size:14px;line-height:20px">GStar Bootcamp</strong><div style="margin-top:4px;color:#f4dfe0;font-size:12px;line-height:18px">New Turing Institute · Started in Asia. Built to a global bar.</div></td></tr>
    </table><p style="margin:18px auto 0;max-width:680px;color:#77727b;font-size:11px;line-height:18px;text-align:center">This is an automated application receipt. Reply to this email only when a reply-to address is shown in your mail client.</p></td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function verifyApplicantEmailConnection() {
  const settings = await resolvedEmailSettings();
  validateSettings(settings);
  await transporterFor(settings).verify();
  return { fromAddress: settings.fromAddress, source: settings.source };
}

export async function sendApplicationEmailTest(to: string) {
  const settings = await resolvedEmailSettings();
  validateSettings(settings);
  const program = await readProgramSettings();
  const sample: StoredApplication = {
    id: `TEST-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    fullName: "GStar Applicant",
    email: to,
    yearOfBirth: "1998",
    country: "Ho Chi Minh City, Vietnam",
    currentStatus: "Working professional (2+ years experience)",
    currentRole: "Machine Learning Engineer",
    organization: "Example AI Lab",
    linkedin: "https://www.linkedin.com/in/example",
    aiExperience: "Self-assessed via technical checklist",
    readinessSignals: ["Python & PyTorch", "Research literacy", "Transformer internals"],
    proudProject: "Built and evaluated an end-to-end retrieval-augmented generation system, including data preparation, model evaluation and deployment.",
    careerGoal: "AI Engineer",
    technicalChallenge: "Improved model quality while reducing inference latency and maintaining reproducible evaluation.",
    targetOrganizations: "Frontier AI labs and product teams building reliable AI systems.",
    impactGoal: "Build useful, safe and globally competitive AI products from Southeast Asia.",
    mathConcepts: ["Linear algebra: matrices and operators", "Statistics: distributions, variance and confidence intervals"],
    machineLearningConcepts: ["Supervised vs. unsupervised learning", "Cross-validation and hyperparameter tuning"],
    deepLearningConcepts: ["Transformers: attention and encoder-decoder", "Transfer learning and fine-tuning"],
    nlpConcepts: ["Question answering and retrieval-augmented generation"],
    motivationReasons: ["Access world-class AI training and mentorship", "Build a strong portfolio through real-world AI projects", "Join a global network of AI researchers and engineers"],
    programGoals: "Deepen my technical foundation, ship a rigorous capstone and contribute to the GStar alumni community.",
    preferredTestSlot: "Saturday, 09:00–11:00 GMT+7",
    referralSource: "NTI LinkedIn page",
    motivation: "Deepen my technical foundation and ship a rigorous capstone.",
    resumeFileName: "gstar-applicant-resume.pdf",
    resumeSize: 240000,
    scholarshipRequest: true,
    weeklyAvailability: true,
    consent: true,
    attribution: {}
  };
  const message = buildApplicationReceipt(sample, program.cohortYear, true);
  const transporter = transporterFor(settings);
  await transporter.verify();
  const result = await transporter.sendMail({
    from: { name: settings.fromName, address: settings.fromAddress },
    to,
    replyTo: settings.replyTo || undefined,
    ...message,
    attachments: emailAttachments()
  });
  return { messageId: result.messageId, fromAddress: settings.fromAddress, to };
}

export async function sendApplicationConfirmation(application: StoredApplication) {
  const settings = await resolvedEmailSettings();
  if (!settings.enabled) return;

  try {
    validateSettings(settings);
    await updateConfirmationEmailStatus(application.id, "sending");
    const program = await readProgramSettings();
    const message = buildApplicationReceipt(application, program.cohortYear);
    await transporterFor(settings).sendMail({
      from: { name: settings.fromName, address: settings.fromAddress },
      to: { name: application.fullName, address: application.email },
      replyTo: settings.replyTo || undefined,
      ...message,
      attachments: emailAttachments()
    });
    await updateConfirmationEmailStatus(application.id, "sent");
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown SMTP error";
    console.error("Application confirmation email failed", message);
    await updateConfirmationEmailStatus(application.id, "failed", message).catch(() => undefined);
  }
}
