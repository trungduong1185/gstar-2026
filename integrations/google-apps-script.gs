const SHEET_NAME = "Applications";
const RESUME_FOLDER_NAME = "GStar Applications - Resumes";
const SHARED_SECRET = "REPLACE_WITH_THE_SAME_SECRET_AS_NEXT_ENV";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    if (SHARED_SECRET && payload.secret !== SHARED_SECRET) return json({ ok: false, error: "Unauthorized" });

    const first = payload.attribution?.firstTouch || {};
    const last = payload.attribution?.lastTouch || {};
    const resumeUrl = payload.storeResumeInDrive ? saveResume(payload.resume, payload.id) : "";

    if (payload.writeSheet) {
      if (!payload.spreadsheetId) throw new Error("Missing spreadsheet ID");
      const spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
      const sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error(`Missing sheet: ${SHEET_NAME}`);
      sheet.appendRow([
        payload.submittedAt,
        payload.id,
        payload.fullName,
        payload.email,
        payload.yearOfBirth,
        payload.country,
        payload.currentStatus,
        payload.currentRole,
        payload.organization,
        payload.linkedin,
        resumeUrl || "Stored on VPS",
        payload.aiExperience,
        (payload.readinessSignals || []).join(", "),
        payload.motivation,
        payload.scholarshipRequest,
        payload.weeklyAvailability,
        first.utm_source || "direct",
        first.utm_medium || "none",
        first.utm_campaign || "direct",
        last.utm_source || "direct",
        last.utm_medium || "none",
        last.utm_campaign || "direct",
        last.utm_content || "",
        payload.attribution?.landingPage || "",
        payload.attribution?.referrer || "",
        "Submitted"
      ]);
    }
    return json({ ok: true, id: payload.id, resumeUrl });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function saveResume(resume, applicationId) {
  if (!resume?.data) throw new Error("Missing resume data");
  const folders = DriveApp.getFoldersByName(RESUME_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(RESUME_FOLDER_NAME);
  const safeName = String(resume.name || "resume.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = Utilities.newBlob(Utilities.base64Decode(resume.data), "application/pdf", `${applicationId}-${safeName}`);
  return folder.createFile(blob).getUrl();
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
