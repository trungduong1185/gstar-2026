ALTER TABLE "Application" ADD COLUMN "confirmationEmailStatus" TEXT NOT NULL DEFAULT 'not-configured';
ALTER TABLE "Application" ADD COLUMN "confirmationEmailSentAt" DATETIME;
ALTER TABLE "Application" ADD COLUMN "confirmationEmailError" TEXT;

ALTER TABLE "IntegrationSetting" ADD COLUMN "confirmationEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IntegrationSetting" ADD COLUMN "smtpHost" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationSetting" ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "IntegrationSetting" ADD COLUMN "smtpSecurity" TEXT NOT NULL DEFAULT 'starttls';
ALTER TABLE "IntegrationSetting" ADD COLUMN "smtpUsername" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationSetting" ADD COLUMN "smtpPassword" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationSetting" ADD COLUMN "emailFromName" TEXT NOT NULL DEFAULT 'GStar Bootcamp';
ALTER TABLE "IntegrationSetting" ADD COLUMN "emailFromAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IntegrationSetting" ADD COLUMN "emailReplyTo" TEXT NOT NULL DEFAULT '';
