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
  motivation: string;
  resumeFileName: string;
  resumeStorage?: "vps" | "google-drive";
  resumeDownload?: string;
  resumeUrl?: string;
  googleSheetsSynced?: boolean;
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
    if (!selected) return;
    setMessage("");
    const response = await fetch(withBasePath("/api/admin/applications"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, status })
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Unable to update application status."); return; }
    const updated = { ...selected, status };
    setSelected(updated);
    setApplicants((current) => current.map((applicant) => applicant.id === updated.id ? updated : applicant));
  }

  function exportCsv() {
    const headers = ["ID", "Submitted", "Name", "Email", "Country", "Organization", "Role", "AI experience", "Scholarship", "Status", "Google Sheets"];
    const rows = filtered.map((applicant) => [applicant.id, applicant.submittedAt, applicant.fullName, applicant.email, applicant.country, applicant.organization, applicant.currentRole, applicant.aiExperience, applicant.scholarshipRequest ? "Yes" : "No", applicant.status, applicant.googleSheetsSynced ? "Synced" : "Local only"]);
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
      <div className="admin-toolbar"><label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or country" /></label><AdminSelect name="status-filter" label="Status" options={statuses} value={statusFilter} onChange={(value) => setStatusFilter(value as (typeof statuses)[number])}/><div><span>Data source</span><b>Local VPS · {applicants.length} records</b></div></div>
      {message && <p className="admin-notice">{message}</p>}
      <section className="admin-data"><header><div><span>Applicant pipeline</span><h2>Recent applications</h2></div><small>{loading ? "Loading…" : `${filtered.length} of ${applicants.length} applications`}</small></header><div className="dashboard-table-wrap"><table><thead><tr><th>Applicant</th><th>Role</th><th>Country</th><th>Aid</th><th>Status</th><th></th></tr></thead><tbody>{!loading && filtered.map((applicant) => <tr key={applicant.id}><td><b>{applicant.fullName}</b><small>{applicant.email}</small></td><td>{applicant.currentRole}</td><td>{applicant.country}</td><td>{applicant.scholarshipRequest ? "Scholarship" : "Standard"}</td><td><span className="admin-status">{applicant.status}</span></td><td><button className="admin-row-action" onClick={() => setSelected(applicant)} aria-label={`View application from ${applicant.fullName}`}>View</button></td></tr>)}</tbody></table>{!loading && !filtered.length && <p className="admin-empty">No applications match the current filters.</p>}</div></section>
    </main>

    {selected && <div className="applicant-detail" role="presentation">
      <button className="applicant-detail__backdrop" onClick={() => setSelected(null)} aria-label="Close applicant details" />
      <aside className="applicant-detail__drawer" ref={drawer} role="dialog" aria-modal="true" aria-labelledby="applicant-name" tabIndex={-1}>
        <header><div><span>{selected.id} · {formatDate(selected.submittedAt)}</span><h2 id="applicant-name">{selected.fullName}</h2><p>{selected.currentRole} · {selected.country}</p></div><button onClick={() => setSelected(null)} aria-label="Close applicant details">×</button></header>
        <div className="applicant-detail__status"><AdminSelect name="application-status" label="Application status" options={statuses.slice(1)} value={selected.status} onChange={(value) => updateStatus(value as ApplicationStatus)}/><small>Status is stored in the local Admin record.</small></div>
        <section><span>Profile</span><dl><div><dt>Email</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div><div><dt>Year of birth</dt><dd>{selected.yearOfBirth}</dd></div><div><dt>Current status</dt><dd>{selected.currentStatus}</dd></div><div><dt>Organization</dt><dd>{selected.organization}</dd></div><div><dt>AI experience</dt><dd>{selected.aiExperience}</dd></div><div><dt>Availability</dt><dd>{selected.weeklyAvailability ? "15–20 hours / week" : "Not confirmed"}</dd></div><div><dt>Financial aid</dt><dd>{selected.scholarshipRequest ? "Requested" : "Not requested"}</dd></div></dl></section>
        <section><span>Evidence</span><div className="applicant-detail__links"><a href={selected.linkedin} target="_blank" rel="noreferrer">LinkedIn / Website ↗</a>{resumeHref && <a href={resumeHref} target="_blank" rel="noreferrer">View PDF ↗</a>}{resumeDownloadHref && <a href={resumeDownloadHref} download={selected.resumeFileName}>Download PDF ↓</a>}</div><dl><div><dt>Resume / CV</dt><dd>{selected.resumeFileName || "PDF attached"}</dd></div><div><dt>CV storage</dt><dd>{selected.resumeStorage === "google-drive" ? "Google Drive" : "Local VPS"}</dd></div><div><dt>Google Sheet</dt><dd>{selected.googleSheetsSynced ? "Synced" : "Local only"}</dd></div></dl></section>
        <section><span>Readiness signals</span><ul className="applicant-detail__signals">{selected.readinessSignals.length ? selected.readinessSignals.map((signal) => <li key={signal}>{signal}</li>) : <li>No signals selected</li>}</ul></section>
        <section><span>Why GStar?</span><p className="applicant-detail__motivation">{selected.motivation}</p></section>
        <section><span>Attribution</span><dl><div><dt>Campaign</dt><dd>{lastTouch.utm_campaign || "Direct"}</dd></div><div><dt>Source / medium</dt><dd>{`${lastTouch.utm_source || "direct"} / ${lastTouch.utm_medium || "none"}`}</dd></div></dl></section>
        <footer><button onClick={() => setSelected(null)}>Close</button><button onClick={() => updateStatus("Assessment")} disabled={selected.status === "Assessment"}>{selected.status === "Assessment" ? "In assessment" : "Move to assessment"}</button></footer>
      </aside>
    </div>}
  </>;
}
