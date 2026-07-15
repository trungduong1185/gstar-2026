const SHEET_NAME = "Applications";
const RESUME_FOLDER_NAME = "GStar Applications - Resumes";
const ADMIN_RESUME_BASE_URL = "https://summit.newturing.ai/gstar/api/admin/applications";
const SHARED_SECRET = "REPLACE_WITH_THE_SAME_SECRET_AS_NEXT_ENV";

const HEADERS = [
  "Submitted at",
  "Application ID",
  "Full name",
  "Email",
  "Year of birth",
  "Country / city",
  "Current status",
  "Current role / school major",
  "Organization / school",
  "LinkedIn / website",
  "GitHub",
  "Resume URL / storage",
  "AI experience",
  "Readiness signals",
  "Proud project",
  "Career goal",
  "Technical challenge",
  "Target organizations",
  "Impact goal",
  "Math concepts",
  "Machine learning concepts",
  "Deep learning concepts",
  "NLP concepts",
  "Motivation reasons",
  "Program goals",
  "Preferred test slot",
  "Referral source",
  "Motivation",
  "Scholarship requested",
  "Weekly availability",
  "Consent",
  "First-touch source",
  "First-touch medium",
  "First-touch campaign",
  "First-touch content",
  "First-touch term",
  "Last-touch source",
  "Last-touch medium",
  "Last-touch campaign",
  "Last-touch content",
  "Last-touch term",
  "Google click ID",
  "Meta click ID",
  "TikTok click ID",
  "LinkedIn click ID",
  "Landing page",
  "Referrer",
  "Touchpoints JSON",
  "Status"
];

function doGet() {
  return json({ ok: true, service: "gstar-applications", sheet: SHEET_NAME });
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    if (!event || !event.postData || !event.postData.contents) {
      return json({ ok: false, error: "Missing request body" });
    }

    const payload = JSON.parse(event.postData.contents);
    if (!isSecretConfigured() || payload.secret !== SHARED_SECRET) {
      return json({ ok: false, error: "Unauthorized" });
    }
    if (!payload.id) return json({ ok: false, error: "Missing application ID" });

    lock.waitLock(10000);

    let sheet = null;
    let existingRow = 0;
    if (payload.writeSheet) {
      if (!payload.spreadsheetId) throw new Error("Missing spreadsheet ID");
      const spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
      sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
      ensureHeaders(sheet);
      existingRow = findApplicationRow(sheet, payload.id);
    }

    // A server retry must not create a duplicate row or duplicate Drive file.
    if (existingRow) {
      return json({
        ok: true,
        duplicate: true,
        id: payload.id,
        resumeUrl: String(sheet.getRange(existingRow, 12).getValue() || "")
      });
    }

    const resumeUrl = payload.storeResumeInDrive
      ? saveResume(payload.resume, payload.id)
      : "";

    if (sheet) {
      const first = payload.attribution && payload.attribution.firstTouch || {};
      const last = payload.attribution && payload.attribution.lastTouch || {};
      const touchpoints = payload.attribution && payload.attribution.touchpoints || [];
      const row = [
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
        payload.github || "",
        resumeUrl || buildVpsResumeUrl(payload.id),
        payload.aiExperience,
        joinValues(payload.readinessSignals),
        payload.proudProject || "",
        payload.careerGoal || "",
        payload.technicalChallenge || "",
        payload.targetOrganizations || "",
        payload.impactGoal || "",
        joinValues(payload.mathConcepts),
        joinValues(payload.machineLearningConcepts),
        joinValues(payload.deepLearningConcepts),
        joinValues(payload.nlpConcepts),
        joinValues(payload.motivationReasons),
        payload.programGoals || "",
        payload.preferredTestSlot || "",
        payload.referralSource || "",
        payload.motivation || "",
        booleanLabel(payload.scholarshipRequest),
        booleanLabel(payload.weeklyAvailability),
        booleanLabel(payload.consent),
        first.utm_source || "direct",
        first.utm_medium || "none",
        first.utm_campaign || "direct",
        first.utm_content || "",
        first.utm_term || "",
        last.utm_source || "direct",
        last.utm_medium || "none",
        last.utm_campaign || "direct",
        last.utm_content || "",
        last.utm_term || "",
        last.gclid || last.gbraid || last.wbraid || "",
        last.fbclid || "",
        last.ttclid || "",
        last.li_fat_id || "",
        payload.attribution && payload.attribution.landingPage || "",
        payload.attribution && payload.attribution.referrer || "",
        JSON.stringify(touchpoints),
        "Submitted"
      ].map(safeCell);

      sheet.appendRow(row);
    }

    return json({ ok: true, id: payload.id, resumeUrl: resumeUrl });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message || error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function isSecretConfigured() {
  return SHARED_SECRET && SHARED_SECRET !== "REPLACE_WITH_THE_SAME_SECRET_AS_NEXT_ENV";
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else if (String(sheet.getRange(1, 2).getValue()) !== "Application ID") {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else if (sheet.getLastColumn() < HEADERS.length) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setFontWeight("bold").setBackground("#731013").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

function findApplicationRow(sheet, applicationId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const match = sheet
    .getRange(2, 2, lastRow - 1, 1)
    .createTextFinder(String(applicationId))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
}

function saveResume(resume, applicationId) {
  if (!resume || !resume.data) throw new Error("Missing resume data");
  const folders = DriveApp.getFoldersByName(RESUME_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(RESUME_FOLDER_NAME);
  const safeName = String(resume.name || "resume.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileName = String(applicationId) + "-" + safeName;
  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) return existing.next().getUrl();

  const blob = Utilities.newBlob(
    Utilities.base64Decode(resume.data),
    "application/pdf",
    fileName
  );
  return folder.createFile(blob).getUrl();
}

function joinValues(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function booleanLabel(value) {
  return value === true ? "Yes" : "No";
}

function buildVpsResumeUrl(applicationId) {
  return ADMIN_RESUME_BASE_URL + "/" + encodeURIComponent(String(applicationId)) + "/resume";
}

// Prevent applicant-controlled values beginning with =, +, - or @ from being
// interpreted as formulas when written to Google Sheets.
function safeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
