-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submittedAt" DATETIME NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "yearOfBirth" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "currentRole" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "linkedin" TEXT NOT NULL,
    "github" TEXT,
    "aiExperience" TEXT NOT NULL,
    "readinessSignals" JSONB NOT NULL,
    "motivation" TEXT NOT NULL,
    "resumeFileName" TEXT NOT NULL,
    "resumeSize" INTEGER NOT NULL,
    "resumeStorage" TEXT NOT NULL DEFAULT 'vps',
    "resumePath" TEXT,
    "resumeUrl" TEXT,
    "googleSheetsSynced" BOOLEAN NOT NULL DEFAULT false,
    "scholarshipRequest" BOOLEAN NOT NULL DEFAULT false,
    "weeklyAvailability" BOOLEAN NOT NULL DEFAULT false,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "attribution" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "cohortStatus" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "bio" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "social" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProgramSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "cohortYear" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "timezoneLabel" TEXT NOT NULL,
    "dates" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "googleSheetsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "resumeStorage" TEXT NOT NULL DEFAULT 'vps',
    "googleSheetUrl" TEXT NOT NULL DEFAULT '',
    "googleAppsScriptUrl" TEXT NOT NULL DEFAULT '',
    "googleAppsScriptSecret" TEXT NOT NULL DEFAULT '',
    "slackWebhookUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Application_email_submittedAt_idx" ON "Application"("email", "submittedAt");

-- CreateIndex
CREATE INDEX "Application_submittedAt_idx" ON "Application"("submittedAt");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Mentor_group_sortOrder_idx" ON "Mentor"("group", "sortOrder");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");
