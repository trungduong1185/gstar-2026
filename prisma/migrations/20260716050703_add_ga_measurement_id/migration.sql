-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IntegrationSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "googleSheetsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "resumeStorage" TEXT NOT NULL DEFAULT 'vps',
    "googleSheetUrl" TEXT NOT NULL DEFAULT '',
    "googleAppsScriptUrl" TEXT NOT NULL DEFAULT '',
    "googleAppsScriptSecret" TEXT NOT NULL DEFAULT '',
    "slackWebhookUrl" TEXT NOT NULL DEFAULT '',
    "confirmationEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecurity" TEXT NOT NULL DEFAULT 'starttls',
    "smtpUsername" TEXT NOT NULL DEFAULT '',
    "smtpPassword" TEXT NOT NULL DEFAULT '',
    "emailFromName" TEXT NOT NULL DEFAULT 'GStar Bootcamp',
    "emailFromAddress" TEXT NOT NULL DEFAULT '',
    "emailReplyTo" TEXT NOT NULL DEFAULT '',
    "gaMeasurementId" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_IntegrationSetting" ("confirmationEmailEnabled", "emailFromAddress", "emailFromName", "emailReplyTo", "googleAppsScriptSecret", "googleAppsScriptUrl", "googleSheetUrl", "googleSheetsEnabled", "id", "resumeStorage", "slackWebhookUrl", "smtpHost", "smtpPassword", "smtpPort", "smtpSecurity", "smtpUsername", "updatedAt") SELECT "confirmationEmailEnabled", "emailFromAddress", "emailFromName", "emailReplyTo", "googleAppsScriptSecret", "googleAppsScriptUrl", "googleSheetUrl", "googleSheetsEnabled", "id", "resumeStorage", "slackWebhookUrl", "smtpHost", "smtpPassword", "smtpPort", "smtpSecurity", "smtpUsername", "updatedAt" FROM "IntegrationSetting";
DROP TABLE "IntegrationSetting";
ALTER TABLE "new_IntegrationSetting" RENAME TO "IntegrationSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
