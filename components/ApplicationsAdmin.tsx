"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminSelect } from "@/components/AdminSelect";
import { withBasePath } from "@/lib/base-path";

type ApplicationStatus = "Submitted" | "Assessment" | "Shortlisted" | "Rejected";

type Applicant = {
  id: string;
  submittedAt: string;
  fullName: string;
  email: string;
  yearOfBirth: string;
  country: string;
  currentStatus: string;
  currentRole: string;
  organization: string;
  linkedin: string;
  aiExperience: string;
  readinessSignals: string[];
  proudProject?: string;
  careerGoal?: string;
  technicalChallenge?: string;
  targetOrganizations?: string;
  impactGoal?: string;
  mathConcepts?: string[];
  machineLearningConcepts?: string[];
  deepLearningConcepts?: string[];
  nlpConcepts?: string[];
  motivationReasons?: string[];
  programGoals?: string;
  preferredTestSlot?: string;
  referralSource?: string;
  motivation: string;
  resumeFileName: string;
  resumeStorage?: "vps" | "google-drive";
  resumeDownload?: string;
  resumeUrl?: string;
  googleSheetsSynced?: boolean;
  confirmationEmailStatus?: string;
  confirmationEmailSentAt?: string;
  confirmationEmailError?: string;
  scholarshipRequest: boolean;
  weeklyAvailability: boolean;
  attribution?: {
    firstTouch?: Record<string, string>;
    lastTouch?: Record<string, string>;
    landingPage?: string;
    referrer?: string;
  };
  status: ApplicationStatus;
};

const statuses = ["All statuses", "Submitted", "Assessment", "Shortlisted", "Rejected"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function ApplicationsAdmin() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("All statuses");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus>("Submitted");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState("");
  const [statusError, setStatusError] = useState(false);
  const drawer = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch(withBasePath("/api/admin/applications"), { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load applications.");
        setApplicants(result.applications);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load applications."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    drawer.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applicants.filter((applicant) => {
      const matchesStatus = statusFilter === "All statuses" || applicant.status === statusFilter;
      const matchesSearch = !query || [applicant.fullName, applicant.email, applicant.country, applicant.organization, applicant.currentRole].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [applicants, search, statusFilter]);

  async function updateStatus(status: ApplicationStatus) {
    if (!selected || status === selected.status || statusSaving) return;
    setStatusSaving(true);
    setStatusFeedback("");
    setStatusError(false);
    try {
      const response = await fetch(withBasePath("/api/admin/applications"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update application status.");
      const updated = { ...selected, status };
      setSelected(updated);
      setApplicants((current) => current.map((applicant) => applicant.id === updated.id ? updated : applicant));
      setStatusFeedback(`Status updated to ${status}.`);
    } catch (error) {
      setStatusError(true);
      setStatusFeedback(error instanceof Error ? error.message : "Unable to update application status.");
    } finally {
      setStatusSaving(false);
    }
  }

  function openApplicant(applicant: Applicant) {
    setSelected(applicant);
    setPendingStatus(applicant.status);
    setStatusFeedback("");
    setStatusError(false);
  }

  function exportCsv() {
    const headers = ["ID", "Submitted", "Name", "Email", "Country", "Organization", "Current role", "AI experience", "Proud project", "Career goal", "Technical challenge", "Target organizations", "Impact goal", "Math concepts", "Machine learning concepts", "Deep learning concepts", "NLP concepts", "Motivation reasons", "Program goals", "Preferred test slot", "Referral source", "Scholarship", "Status", "Google Sheets"];
    const rows = filtered.map((applicant) => [applicant.id, applicant.submittedAt, applicant.fullName, applicant.email, applicant.country, applicant.organization, applicant.currentRole, applicant.aiExperience, applicant.proudProject, applicant.careerGoal, applicant.technicalChallenge, applicant.targetOrganizations, applicant.impactGoal, applicant.mathConcepts?.join("; "), applicant.machineLearningConcepts?.join("; "), applicant.deepLearningConcepts?.join("; "), applicant.nlpConcepts?.join("; "), applicant.motivationReasons?.join("; "), applicant.programGoals, applicant.preferredTestSlot, applicant.referralSource, applicant.scholarshipRequest ? "Yes" : "No", applicant.status, applicant.googleSheetsSynced ? "Synced" : "Local only"]);
    const blob = new Blob([[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gstar-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const resumeHref = selected?.resumeUrl || (selected?.resumeDownload ? withBasePath(selected.resumeDownload) : "");
  const resumeDownloadHref = selected?.resumeDownload ? `${withBasePath(selected.resumeDownload)}?download=1` : "";
  const lastTouch = selected?.attribution?.lastTouch || {};

  return <>
    <main className="admin-page">
      <div className="admin-pagehead"><div><span>Admissions</span><h1>Applications</h1><p>Review real applicant submissions stored by the GStar application API.</p></div><button onClick={exportCsv} disabled={!filtered.length}>Export CSV</button></div>
      <div className="dashboard-filters applications-filters" aria-label="Application filters">
        <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or country" /></label>
        <AdminSelect name="status-filter" label="Status" options={statuses} value={statusFilter} onChange={(value) => setStatusFilter(value as (typeof statuses)[number])}/>
        <div className="dashboard-freshness"><span>Data source</span><b>Prisma SQLite · {applicants.length} records</b><small>{filtered.length} applications shown</small></div>
      </div>
      {message && <p className="admin-notice">{message}</p>}
      <section className="admin-data"><header><div><span>Applicant pipeline</span><h2>Recent applications</h2></div><small>{loading ? "Loading…" : `${filtered.length} of ${applicants.length} applications`}</small></header><div className="dashboard-table-wrap"><table><thead><tr><th>Applicant</th><th>Role</th><th>Country</th><th>Aid</th><th>Status</th><th></th></tr></thead><tbody>{!loading && filtered.map((applicant) => <tr key={applicant.id}><td><b>{applicant.fullName}</b><small>{applicant.email}</small></td><td>{applicant.currentRole}</td><td>{applicant.country}</td><td>{applicant.scholarshipRequest ? "Scholarship" : "Standard"}</td><td><span className="admin-status">{applicant.status}</span></td><td><button className="admin-row-action" onClick={() => openApplicant(applicant)} aria-label={`View application from ${applicant.fullName}`}>View</button></td></tr>)}</tbody></table>{!loading && !filtered.length && <p className="admin-empty">No applications match the current filters.</p>}</div></section>
    </main>

    {selected && <div className="applicant-detail" role="presentation">
      <button className="applicant-detail__backdrop" onClick={() => setSelected(null)} aria-label="Close applicant details" />
      <aside className="applicant-detail__drawer" ref={drawer} role="dialog" aria-modal="true" aria-labelledby="applicant-name" tabIndex={-1}>
        <header><div><span>{selected.id} · {formatDate(selected.submittedAt)}</span><h2 id="applicant-name">{selected.fullName}</h2><p>{selected.currentRole} · {selected.country}</p></div><button onClick={() => setSelected(null)} aria-label="Close applicant details">×</button></header>
        <div className="applicant-detail__status"><AdminSelect name="application-status" label="Application status" options={statuses.slice(1)} value={pendingStatus} onChange={(value) => { setPendingStatus(value as ApplicationStatus); setStatusFeedback(""); setStatusError(false); }}/><small className={statusError ? "is-error" : ""} role="status" aria-live="polite">{statusFeedback || (pendingStatus === selected.status ? `Current status: ${selected.status}.` : `Ready to update from ${selected.status} to ${pendingStatus}.`)}</small></div>
        <section><span>Profile</span><dl><div><dt>Email</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div><div><dt>Year of birth</dt><dd>{selected.yearOfBirth}</dd></div><div><dt>Current status</dt><dd>{selected.currentStatus}</dd></div><div><dt>Organization</dt><dd>{selected.organization}</dd></div><div><dt>AI experience</dt><dd>{selected.aiExperience}</dd></div><div><dt>Availability</dt><dd>{selected.weeklyAvailability ? "15–20 hours / week" : "Not confirmed"}</dd></div><div><dt>Financial aid</dt><dd>{selected.scholarshipRequest ? "Requested" : "Not requested"}</dd></div></dl></section>
        <section><span>Evidence &amp; delivery</span><div className="applicant-detail__links"><a href={selected.linkedin} target="_blank" rel="noreferrer">LinkedIn / Website ↗</a>{resumeHref && <a href={resumeHref} target="_blank" rel="noreferrer">View PDF ↗</a>}{resumeDownloadHref && <a href={resumeDownloadHref} download={selected.resumeFileName}>Download PDF ↓</a>}</div><dl><div><dt>Resume / CV</dt><dd>{selected.resumeFileName || "PDF attached"}</dd></div><div><dt>CV storage</dt><dd>{selected.resumeStorage === "google-drive" ? "Google Drive" : "Local VPS"}</dd></div><div><dt>Google Sheet</dt><dd>{selected.googleSheetsSynced ? "Synced" : "Local only"}</dd></div><div><dt>Applicant email</dt><dd>{selected.confirmationEmailStatus === "sent" ? `Sent${selected.confirmationEmailSentAt ? ` · ${formatDate(selected.confirmationEmailSentAt)}` : ""}` : selected.confirmationEmailStatus === "failed" ? "Failed" : selected.confirmationEmailStatus === "sending" ? "Sending" : "Not enabled"}{selected.confirmationEmailError && <small className="applicant-detail__delivery-error">{selected.confirmationEmailError}</small>}</dd></div></dl></section>
        <section><span>Achievements &amp; career goals</span><div className="applicant-detail__answers"><div><b>Project they are most proud of</b><p>{selected.proudProject || "Not collected"}</p></div><div><b>Target role</b><p>{selected.careerGoal || "Not collected"}</p></div><div><b>Challenging AI problem</b><p>{selected.technicalChallenge || "Not collected"}</p></div><div><b>Target organizations</b><p>{selected.targetOrganizations || "Not collected"}</p></div><div><b>3–5 year impact</b><p>{selected.impactGoal || "Not collected"}</p></div></div></section>
        <section><span>Technical self-assessment</span><div className="applicant-detail__assessment"><div><b>Math</b><ul>{selected.mathConcepts?.length ? selected.mathConcepts.map((item)=><li key={item}>{item}</li>) : <li>Not collected</li>}</ul></div><div><b>Machine learning</b><ul>{selected.machineLearningConcepts?.length ? selected.machineLearningConcepts.map((item)=><li key={item}>{item}</li>) : <li>Not collected</li>}</ul></div><div><b>Deep learning</b><ul>{selected.deepLearningConcepts?.length ? selected.deepLearningConcepts.map((item)=><li key={item}>{item}</li>) : <li>Not collected</li>}</ul></div><div><b>NLP</b><ul>{selected.nlpConcepts?.length ? selected.nlpConcepts.map((item)=><li key={item}>{item}</li>) : <li>None selected</li>}</ul></div></div></section>
        <section><span>Motivation &amp; logistics</span><div className="applicant-detail__answers"><div><b>Top reasons</b><ul className="applicant-detail__signals">{selected.motivationReasons?.length ? selected.motivationReasons.map((item)=><li key={item}>{item}</li>) : <li>Not collected</li>}</ul></div><div><b>Program goals</b><p>{selected.programGoals || selected.motivation || "Not collected"}</p></div><div><b>Preferred test time</b><p>{selected.preferredTestSlot || "Not collected"}</p></div><div><b>Referral source</b><p>{selected.referralSource || "Not collected"}</p></div></div></section>
        <section><span>Readiness signals</span><ul className="applicant-detail__signals">{selected.readinessSignals.length ? selected.readinessSignals.map((signal) => <li key={signal}>{signal}</li>) : <li>No signals selected</li>}</ul></section>
        <section><span>Attribution</span><dl><div><dt>Campaign</dt><dd>{lastTouch.utm_campaign || "Direct"}</dd></div><div><dt>Source / medium</dt><dd>{`${lastTouch.utm_source || "direct"} / ${lastTouch.utm_medium || "none"}`}</dd></div></dl></section>
        <footer><button onClick={() => setSelected(null)}>Close</button><button onClick={() => updateStatus(pendingStatus)} disabled={statusSaving || pendingStatus === selected.status}>{statusSaving ? "Applying…" : pendingStatus === selected.status ? "Status applied" : `Apply ${pendingStatus}`}</button></footer>
      </aside>
    </div>}
  </>;
}
