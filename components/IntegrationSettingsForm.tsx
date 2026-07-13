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
  source: "admin" | "environment";
  updatedAt: string;
};

const empty: Settings = {
  googleSheetsEnabled: false,
  resumeStorage: "vps",
  googleSheetUrl: "",
  googleAppsScriptUrl: "",
  secretConfigured: false,
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
  const googleRequired = settings.googleSheetsEnabled || settings.resumeStorage === "google-drive";

  useEffect(() => {
    fetch(withBasePath("/api/admin/integrations"), { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load settings.");
        setSettings(result);
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
        source: "admin",
        updatedAt: result.updatedAt
      }));
      const secretInput = form.elements.namedItem("googleAppsScriptSecret") as HTMLInputElement | null;
      if (secretInput) secretInput.value = "";
      setMessage("Application storage settings saved.");
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

  return (
    <main className="admin-page settings-shell">
      <div className="admin-pagehead"><div><span>System</span><h1>Integration settings</h1><p>Control application records, Google sync and private CV storage.</p></div><a href={withBasePath("/")}>Open landing page ↗</a></div>

      <div className="settings-layout">
        <section className="settings-main">
          <div className="settings-heading"><span>Application storage</span><h2>Admin records and file storage</h2><p>Every submission is stored locally for Admin. Optionally sync records to Google Sheets and choose where Resume / CV files are stored.</p></div>
          {loading ? <p className="settings-status">Loading settings…</p> : (
            <form className="settings-form" onSubmit={save}>
              <div className="settings-storage-note"><b>Admin dashboard storage is always enabled</b><small>Application records are saved to <code>data/submissions.ndjson</code> and displayed in Dashboard Applications.</small></div>

              <label className="settings-toggle">
                <input name="googleSheetsEnabled" type="checkbox" checked={settings.googleSheetsEnabled} onChange={(event) => setSettings((current) => ({ ...current, googleSheetsEnabled: event.target.checked }))}/>
                <span><b>Sync records to Google Sheets</b><small>Keep the Admin record and append a second copy to the selected Sheet.</small></span>
              </label>

              {settings.googleSheetsEnabled && <div className="settings-google-block">
                <div><span>Google Sheets connection</span><p>Connect the Sheet and Apps Script used for parallel record sync.</p></div>
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
                <label>Google Sheet URL<input name="googleSheetUrl" type="url" required defaultValue={settings.googleSheetUrl} placeholder="https://docs.google.com/spreadsheets/d/…/edit" /></label>
                <label>Apps Script Web App URL<input name="googleAppsScriptUrl" type="url" required defaultValue={settings.googleAppsScriptUrl} placeholder="https://script.google.com/macros/s/…/exec" /></label>
                <label>Shared secret<input name="googleAppsScriptSecret" type="password" required={!settings.secretConfigured} placeholder={settings.secretConfigured ? "Configured · leave blank to keep current secret" : "Enter the same secret used in Apps Script"} autoComplete="new-password" /></label>
              </div>}

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
          <ol><li><b>Validate</b><small>GStar checks required fields and the PDF before storage.</small></li><li><b>Save Admin record</b><small>Every application is written locally and appears in Dashboard Applications.</small></li><li><b>Sync destinations</b><small>Google Sheets and Drive run only when enabled in settings.</small></li></ol>
          <p>Back up the <code>data</code> directory even when Google sync is enabled. The shared secret is never returned to the browser.</p>
        </aside>
      </div>
    </main>
  );
}
