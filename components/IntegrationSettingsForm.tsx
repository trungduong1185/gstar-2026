"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminSelect } from "@/components/AdminSelect";
import { withBasePath } from "@/lib/base-path";

type Settings = {
  googleSheetsEnabled: boolean;
  resumeStorage: "vps" | "google-drive";
  googleSheetUrl: string;
  googleAppsScriptUrl: string;
  secretConfigured: boolean;
  confirmationEmailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "starttls" | "tls" | "none";
  smtpUsername: string;
  smtpPasswordConfigured: boolean;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyTo: string;
  gaMeasurementId: string;
  source: "admin" | "environment";
  updatedAt: string;
};

const empty: Settings = {
  googleSheetsEnabled: false,
  resumeStorage: "vps",
  googleSheetUrl: "",
  googleAppsScriptUrl: "",
  secretConfigured: false,
  confirmationEmailEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecurity: "starttls",
  smtpUsername: "",
  smtpPasswordConfigured: false,
  emailFromName: "GStar Bootcamp",
  emailFromAddress: "",
  emailReplyTo: "",
  gaMeasurementId: "",
  source: "environment",
  updatedAt: ""
};

export function IntegrationSettingsForm() {
  const [settings, setSettings] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<"idle" | "copied" | "error">("idle");
  const [testRecipient, setTestRecipient] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testError, setTestError] = useState(false);
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);
  const [googleSettingsOpen, setGoogleSettingsOpen] = useState(false);
  const [smtpGuideOpen, setSmtpGuideOpen] = useState(false);
  const googleRequired = settings.googleSheetsEnabled || settings.resumeStorage === "google-drive";

  useEffect(() => {
    fetch(withBasePath("/api/admin/integrations"), { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load settings.");
        setSettings(result);
        setTestRecipient(result.emailFromAddress || result.smtpUsername || "");
        setEmailSettingsOpen(!result.smtpHost || !result.emailFromAddress);
        setGoogleSettingsOpen(result.googleSheetsEnabled && (!result.googleSheetUrl || !result.googleAppsScriptUrl));
      })
      .catch((reason) => { setError(true); setMessage(reason.message); })
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setMessage("");
    setError(false);
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch(withBasePath("/api/admin/integrations"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save settings.");
      setSettings((current) => ({
        ...current,
        googleSheetsEnabled: result.googleSheetsEnabled,
        resumeStorage: result.resumeStorage,
        secretConfigured: googleRequired ? true : current.secretConfigured,
        confirmationEmailEnabled: result.confirmationEmailEnabled,
        smtpPasswordConfigured: result.smtpPasswordConfigured,
        gaMeasurementId: result.gaMeasurementId ?? current.gaMeasurementId,
        source: "admin",
        updatedAt: result.updatedAt
      }));
      const secretInput = form.elements.namedItem("googleAppsScriptSecret") as HTMLInputElement | null;
      if (secretInput) secretInput.value = "";
      const smtpPasswordInput = form.elements.namedItem("smtpPassword") as HTMLInputElement | null;
      if (smtpPasswordInput) smtpPasswordInput.value = "";
      setMessage("Integration settings saved.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function copyAppsScript() {
    setTemplateStatus("idle");
    try {
      const response = await fetch(withBasePath("/api/admin/integrations/apps-script"), { cache: "no-store" });
      if (!response.ok) throw new Error("Template unavailable");
      await navigator.clipboard.writeText(await response.text());
      setTemplateStatus("copied");
    } catch {
      setTemplateStatus("error");
    }
  }

  async function sendTestEmail() {
    setTestSending(true);
    setTestMessage("");
    setTestError(false);
    try {
      const response = await fetch(withBasePath("/api/admin/integrations/test-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testRecipient })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send the test email.");
      setTestMessage(`Test email sent from ${result.fromAddress} to ${result.to}.`);
    } catch (reason) {
      setTestError(true);
      setTestMessage(reason instanceof Error ? reason.message : "Unable to send the test email.");
    } finally {
      setTestSending(false);
    }
  }

  return (
    <main className="admin-page settings-shell">
      <div className="admin-pagehead"><div><span>System</span><h1>Integration settings</h1><p>Control application records, applicant email, Google sync and private CV storage.</p></div><a href={withBasePath("/")}>Open landing page ↗</a></div>

      <div className="settings-layout">
        <section className="settings-main">
          <div className="settings-heading"><span>Application storage</span><h2>Admin records and file storage</h2><p>Every submission is stored locally for Admin. Optionally sync records to Google Sheets and choose where Resume / CV files are stored.</p></div>
          {loading ? <p className="settings-status">Loading settings…</p> : (
            <form className="settings-form" onSubmit={save}>
              <div className="settings-storage-note"><b>Admin dashboard storage is always enabled</b><small>Application records are stored in Prisma SQLite at <code>data/gstar.db</code> and displayed in Dashboard Applications.</small></div>

              <div className={`settings-integration-group${settings.confirmationEmailEnabled ? " is-enabled" : ""}${emailSettingsOpen ? " is-open" : ""}`}>
                <div className="settings-integration-group__top">
                  <label className="settings-toggle settings-toggle--embedded">
                    <input name="confirmationEmailEnabled" type="checkbox" checked={settings.confirmationEmailEnabled} onChange={(event) => {
                      const enabled = event.target.checked;
                      setSettings((current) => ({ ...current, confirmationEmailEnabled: enabled }));
                      if (enabled) setEmailSettingsOpen(!settings.smtpHost || !settings.emailFromAddress);
                    }}/>
                    <span><b>Send confirmation email to applicants</b><small>Email each applicant after their application is stored successfully.</small></span>
                  </label>
                  {settings.confirmationEmailEnabled && <button type="button" className="settings-collapsible__trigger" aria-label={`${emailSettingsOpen ? "Hide" : "Show"} applicant email settings`} aria-expanded={emailSettingsOpen} aria-controls="applicant-email-settings" onClick={() => setEmailSettingsOpen((open) => !open)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>}
                </div>
                {settings.confirmationEmailEnabled && <div id="applicant-email-settings" className="settings-collapsible__content" hidden={!emailSettingsOpen}>
                  <div className="settings-collapsible__intro"><span>Applicant email connection</span><p>Connect an SMTP mailbox used to send the application receipt. Credentials remain server-side.</p><button type="button" className="settings-info-trigger" onClick={() => setSmtpGuideOpen(true)} aria-label="SMTP setup guide"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button></div>
                  <div className="settings-storage-note"><b>Google Workspace / Gmail setup</b><small>Use <code>smtp.gmail.com</code>, port <code>587</code>, STARTTLS, the complete email address as username, and a 16-character Google App Password. A normal Gmail password will be rejected with error 535.</small></div>
                  <label>SMTP host<input name="smtpHost" required={emailSettingsOpen} defaultValue={settings.smtpHost} placeholder="smtp.example.com" autoComplete="off" /></label>
                  <label>SMTP port<input name="smtpPort" type="number" min="1" max="65535" required={emailSettingsOpen} defaultValue={settings.smtpPort} inputMode="numeric" /></label>
                  <AdminSelect name="smtpSecurity" label="Connection security" options={["starttls", "tls", "none"]} labels={{ starttls: "STARTTLS (recommended)", tls: "TLS / SSL", none: "None" }} value={settings.smtpSecurity} onChange={(value) => setSettings((current) => ({ ...current, smtpSecurity: value as Settings["smtpSecurity"] }))}/>
                  <label>SMTP username<input name="smtpUsername" defaultValue={settings.smtpUsername} placeholder="notifications@example.com" autoComplete="username" /></label>
                  <label>SMTP password<input name="smtpPassword" type="password" placeholder={settings.smtpPasswordConfigured ? "Configured · leave blank to keep current password" : "Enter SMTP password or app password"} autoComplete="new-password" /></label>
                  <label>From name<input name="emailFromName" required={emailSettingsOpen} defaultValue={settings.emailFromName} placeholder="GStar Bootcamp" /></label>
                  <label>From email address<input name="emailFromAddress" type="email" required={emailSettingsOpen} defaultValue={settings.emailFromAddress} placeholder="gstar@example.com" /></label>
                  <label>Reply-to email <small>Optional. Applicant replies will be sent here.</small><input name="emailReplyTo" type="email" defaultValue={settings.emailReplyTo} placeholder="admissions@example.com" /></label>
                  <div className="settings-storage-note"><b>{settings.smtpPasswordConfigured ? "SMTP password configured" : "SMTP password required when authentication is used"}</b><small>The password is write-only and is never returned to the browser after saving.</small></div>
                  <div className="settings-email-test">
                    <div><b>Test applicant receipt</b><small>Uses the currently saved SMTP configuration and sends the complete branded sample application email.</small></div>
                    <label>Test recipient<input type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="duong@imi.ai" /></label>
                    <button type="button" onClick={sendTestEmail} disabled={testSending || !testRecipient}>{testSending ? "Sending…" : "Send test email"}</button>
                    {testMessage && <p className={testError ? "is-error" : ""} role="status">{testMessage}</p>}
                  </div>
                </div>}
              </div>

              <div className="settings-integration-group is-enabled is-open">
                <div className="settings-integration-group__top">
                  <div className="settings-toggle settings-toggle--embedded">
                    <span><b>Google Analytics</b><small>Enter your GA4 Measurement ID to enable visitor tracking.</small></span>
                  </div>
                </div>
                <div className="settings-collapsible__content" style={{ display: "block" }}>
                  <div className="settings-collapsible__intro"><span>Analytics tracking</span><p>Add the GA4 Measurement ID (e.g. G-XXXXXXXXXX) to enable Google Analytics on the landing page.</p></div>
                  <label>GA4 Measurement ID<input name="gaMeasurementId" defaultValue={settings.gaMeasurementId} placeholder="G-XXXXXXXXXX" autoComplete="off" /></label>
                  <div className="settings-storage-note"><b>{settings.gaMeasurementId ? "GA4 tracking enabled" : "No GA4 ID configured"}</b><small>Leave blank to disable analytics. Env variable NEXT_PUBLIC_GA_MEASUREMENT_ID is used as fallback.</small></div>
                </div>
              </div>

              <div className={`settings-integration-group${settings.googleSheetsEnabled ? " is-enabled" : ""}${googleSettingsOpen ? " is-open" : ""}`}>
                <div className="settings-integration-group__top">
                  <label className="settings-toggle settings-toggle--embedded">
                    <input name="googleSheetsEnabled" type="checkbox" checked={settings.googleSheetsEnabled} onChange={(event) => {
                      const enabled = event.target.checked;
                      setSettings((current) => ({ ...current, googleSheetsEnabled: enabled }));
                      if (enabled) setGoogleSettingsOpen(!settings.googleSheetUrl || !settings.googleAppsScriptUrl);
                    }}/>
                    <span><b>Sync records to Google Sheets</b><small>Keep the Admin record and append a second copy to the selected Sheet.</small></span>
                  </label>
                  {settings.googleSheetsEnabled && <button type="button" className="settings-collapsible__trigger" aria-label={`${googleSettingsOpen ? "Hide" : "Show"} Google Sheets settings`} aria-expanded={googleSettingsOpen} aria-controls="google-sheets-settings" onClick={() => setGoogleSettingsOpen((open) => !open)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>}
                </div>
                {settings.googleSheetsEnabled && <div id="google-sheets-settings" className="settings-collapsible__content" hidden={!googleSettingsOpen}>
                  <div className="settings-collapsible__intro"><span>Google Sheets connection</span><p>Connect the Sheet and Apps Script used for parallel record sync.</p></div>
                  <section className="settings-setup-guide" aria-labelledby="google-sheets-setup-title">
                    <div><span>Setup guide</span><h3 id="google-sheets-setup-title">Connect Google Sheets in six steps</h3></div>
                    <ol>
                      <li><b>Create the destination Sheet</b><small>Open a new Google Sheet and rename the worksheet tab to <code>Applications</code>.</small></li>
                      <li><b>Open Apps Script</b><small>From the Sheet, choose Extensions → Apps Script and replace the editor content with the GStar template.</small></li>
                      <li><b>Set the shared secret</b><small>In the template, replace <code>REPLACE_WITH_THE_SAME_SECRET_AS_NEXT_ENV</code> with a strong private value.</small></li>
                      <li><b>Deploy as a Web App</b><small>Create a new deployment, execute it as your Google account, and allow server requests to access the Web App.</small></li>
                      <li><b>Complete the fields below</b><small>Paste the Sheet URL, the Web App URL ending in <code>/exec</code>, and the same shared secret.</small></li>
                      <li><b>Save and verify</b><small>Save the destination, then submit one controlled application and confirm a new row appears.</small></li>
                    </ol>
                    <div className="settings-setup-guide__action"><button type="button" onClick={copyAppsScript}>Copy Apps Script template</button><small role="status">{templateStatus === "copied" ? "Template copied to clipboard." : templateStatus === "error" ? "Could not copy the template. Try again." : "Paste the template into the Apps Script editor."}</small></div>
                  </section>
                  <label>Google Sheet URL<input name="googleSheetUrl" type="url" required={googleSettingsOpen} defaultValue={settings.googleSheetUrl} placeholder="https://docs.google.com/spreadsheets/d/…/edit" /></label>
                  <label>Apps Script Web App URL<input name="googleAppsScriptUrl" type="url" required={googleSettingsOpen} defaultValue={settings.googleAppsScriptUrl} placeholder="https://script.google.com/macros/s/…/exec" /></label>
                  <label>Shared secret<input name="googleAppsScriptSecret" type="password" required={googleSettingsOpen && !settings.secretConfigured} placeholder={settings.secretConfigured ? "Configured · leave blank to keep current secret" : "Enter the same secret used in Apps Script"} autoComplete="new-password" /></label>
                </div>}
              </div>

              <AdminSelect name="resumeStorage" label="Resume / CV file storage" options={["vps", "google-drive"]} labels={{ vps: "Local VPS", "google-drive": "Google Drive" }} value={settings.resumeStorage} onChange={(value) => setSettings((current) => ({ ...current, resumeStorage: value as Settings["resumeStorage"] }))}/>
              <div className="settings-storage-note"><b>{settings.resumeStorage === "vps" ? "CV files stored privately on the VPS" : "CV files uploaded to Google Drive"}</b><small>{settings.resumeStorage === "vps" ? "Files use private permissions in data/uploads/ and download through authenticated Admin routes." : "Apps Script stores files in GStar Applications - Resumes and returns a Drive URL to Admin."}</small></div>

              {settings.resumeStorage === "google-drive" && <div className="settings-google-block">
                <div><span>Google Drive connection</span><p>Connect Apps Script to upload Resume / CV files to Drive.</p></div>
                <label>Google Drive folder<input value="GStar Applications - Resumes" readOnly aria-describedby="drive-folder-help"/><small id="drive-folder-help">Apps Script creates this private folder automatically if it does not exist.</small></label>
                {settings.googleSheetsEnabled ? <>
                  <label>Apps Script Web App URL<input value="Uses the Google Sheets connection above" readOnly /></label>
                  <label>Shared secret<input value="Uses the shared secret configured above" readOnly /></label>
                  <div className="settings-storage-note"><b>Shared Google connection</b><small>Google Sheets and Drive use the same Apps Script deployment, so you only need to enter the URL and secret once.</small></div>
                </> : <>
                  <label>Apps Script Web App URL<input name="googleAppsScriptUrl" type="url" required defaultValue={settings.googleAppsScriptUrl} placeholder="https://script.google.com/macros/s/…/exec" /></label>
                  <label>Shared secret<input name="googleAppsScriptSecret" type="password" required={!settings.secretConfigured} placeholder={settings.secretConfigured ? "Configured · leave blank to keep current secret" : "Enter the same secret used in Apps Script"} autoComplete="new-password" /></label>
                </>}
              </div>}

              <div className="settings-form__footer">
                <div><b className={!googleRequired || settings.secretConfigured ? "is-connected" : ""}>{!googleRequired ? "Local storage ready" : settings.secretConfigured ? "Google connection configured" : "Google setup required"}</b>{settings.updatedAt && <small>Updated {new Date(settings.updatedAt).toLocaleString()}</small>}</div>
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save destination"}</button>
              </div>
              {message && <p className={`settings-message${error ? " is-error" : ""}`} role="status">{message}</p>}
            </form>
          )}
        </section>

        <aside className="settings-guide">
          <span>Submission flow</span>
          <ol><li><b>Validate</b><small>GStar checks required fields and the PDF before storage.</small></li><li><b>Save Admin record</b><small>Every application is written locally and appears in Dashboard Applications.</small></li><li><b>Email applicant</b><small>A confirmation receipt is sent when SMTP is enabled.</small></li><li><b>Sync destinations</b><small>Google Sheets and Drive run only when enabled in settings.</small></li></ol>
          <p>Back up the <code>data</code> directory even when Google sync is enabled. The shared secret is never returned to the browser.</p>
        </aside>
      </div>

      {smtpGuideOpen && <div className="smtp-guide-overlay" role="presentation" onClick={() => setSmtpGuideOpen(false)}>
        <div className="smtp-guide-modal" role="dialog" aria-modal="true" aria-labelledby="smtp-guide-title" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="smtp-guide-close" onClick={() => setSmtpGuideOpen(false)} aria-label="Close">×</button>
          <header><span>SMTP setup guide</span><h2 id="smtp-guide-title">How to get your SMTP credentials</h2></header>
          <div className="smtp-guide-body">
            <section>
              <h3>Gmail / Google Workspace</h3>
              <ol>
                <li>Enable <b>2-Step Verification</b> on your Google Account at <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">myaccount.google.com/security</a></li>
                <li>Go to <b>App passwords</b> at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">myaccount.google.com/apppasswords</a></li>
                <li>Select <b>Mail</b>, click <b>Create</b>, and copy the 16-character password</li>
                <li>Use these settings:
                  <table className="smtp-guide-table"><tbody>
                    <tr><td>SMTP host</td><td><code>smtp.gmail.com</code></td></tr>
                    <tr><td>Port</td><td><code>587</code></td></tr>
                    <tr><td>Security</td><td><code>STARTTLS</code></td></tr>
                    <tr><td>Username</td><td>your@gmail.com (full email address)</td></tr>
                    <tr><td>Password</td><td>16-character App Password</td></tr>
                  </tbody></table>
                </li>
              </ol>
              <p className="smtp-guide-note">A normal Gmail password will be rejected with error 535.</p>
            </section>
            <section>
              <h3>Amazon SES</h3>
              <ol>
                <li>AWS Console → <b>SES</b> → <b>SMTP Settings</b></li>
                <li>Click <b>Create My SMTP Credentials</b></li>
                <li>Copy the username and password</li>
                <li>Use these settings:
                  <table className="smtp-guide-table"><tbody>
                    <tr><td>SMTP host</td><td><code>email-smtp.us-east-1.amazonaws.com</code></td></tr>
                    <tr><td>Port</td><td><code>587</code></td></tr>
                    <tr><td>Security</td><td><code>STARTTLS</code></td></tr>
                    <tr><td>Username</td><td>SES SMTP username</td></tr>
                    <tr><td>Password</td><td>SES SMTP password</td></tr>
                  </tbody></table>
                </li>
              </ol>
            </section>
            <section>
              <h3>SendGrid</h3>
              <ol>
                <li>SendGrid Dashboard → <b>Settings</b> → <b>API Keys</b> → create a key</li>
                <li>Use these settings:
                  <table className="smtp-guide-table"><tbody>
                    <tr><td>SMTP host</td><td><code>smtp.sendgrid.net</code></td></tr>
                    <tr><td>Port</td><td><code>587</code></td></tr>
                    <tr><td>Security</td><td><code>STARTTLS</code></td></tr>
                    <tr><td>Username</td><td><code>apikey</code></td></tr>
                    <tr><td>Password</td><td>SendGrid API Key</td></tr>
                  </tbody></table>
                </li>
              </ol>
            </section>
            <section>
              <h3>Mailgun / Postmark / Resend</h3>
              <p>These providers use API keys as SMTP passwords. Check your provider's dashboard for the SMTP host and port. The username is typically <code>apikey</code> or your project-specific SMTP login.</p>
            </section>
            <section className="smtp-guide-ports">
              <h3>Port & security reference</h3>
              <table className="smtp-guide-table"><tbody>
                <tr><td>587</td><td><code>STARTTLS</code> — recommended, most widely supported</td></tr>
                <tr><td>465</td><td><code>TLS / SSL</code> — implicit encryption, older but still common</td></tr>
                <tr><td>25</td><td><code>None</code> — unencrypted, not recommended; often blocked by cloud providers</td></tr>
              </tbody></table>
            </section>
          </div>
        </div>
      </div>}
    </main>
  );
}
