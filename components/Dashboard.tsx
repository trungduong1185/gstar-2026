"use client";

import { useMemo, useState } from "react";
import { AdminSelect } from "@/components/AdminSelect";

const campaigns = [
  { campaign: "gstar_scholarship", source: "facebook", medium: "paid_social", sessions: 2850, clicks: 380, starts: 212, applications: 95, spend: 4370 },
  { campaign: "ai_engineers_2026", source: "linkedin", medium: "paid_social", sessions: 1200, clicks: 210, starts: 132, applications: 76, spend: 5980 },
  { campaign: "july_newsletter", source: "nti_newsletter", medium: "email", sessions: 640, clicks: 170, starts: 116, applications: 82, spend: 0 },
  { campaign: "mentor_stories", source: "youtube", medium: "organic_social", sessions: 910, clicks: 124, starts: 71, applications: 39, spend: 680 },
  { campaign: "direct", source: "direct", medium: "none", sessions: 1480, clicks: 156, starts: 88, applications: 44, spend: 0 }
];

const funnel = [
  { label: "Landing visits", value: 7080 },
  { label: "Apply clicks", value: 1040 },
  { label: "Form starts", value: 619 },
  { label: "Applications", value: 336 },
  { label: "Shortlisted", value: 124 },
  { label: "Admitted", value: 52 }
];

function number(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function percent(value: number) { return `${value.toFixed(1)}%`; }
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }

export function Dashboard() {
  const [source, setSource] = useState("all");
  const [range, setRange] = useState("30d");
  const rows = useMemo(() => source === "all" ? campaigns : campaigns.filter((row) => row.source === source), [source]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({ sessions: sum.sessions + row.sessions, clicks: sum.clicks + row.clicks, starts: sum.starts + row.starts, applications: sum.applications + row.applications, spend: sum.spend + row.spend }), { sessions: 0, clicks: 0, starts: 0, applications: 0, spend: 0 }), [rows]);
  const maxApplications = Math.max(...rows.map((row) => row.applications));

  function exportCsv() {
    const header = ["Campaign", "Source", "Medium", "Sessions", "Apply Clicks", "Form Starts", "Applications", "Spend"];
    const csvRows = rows.map((row) => [row.campaign, row.source, row.medium, row.sessions, row.clicks, row.starts, row.applications, row.spend]);
    const csv = [header, ...csvRows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `gstar-campaigns-${source}-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="admin-page dashboard-overview">
      <div className="admin-pagehead"><div><span>Workspace overview</span><h1>Acquisition &amp; Admissions</h1><p>Monitor campaign quality and applicant progression for GStar 2026.</p></div><button type="button" onClick={exportCsv}>Export CSV</button></div>

      <div className="dashboard-filters" aria-label="Dashboard filters">
        <AdminSelect name="range" label="Date range" options={["7d", "30d", "campaign"]} value={range} onChange={setRange} labels={{ "7d": "Last 7 days", "30d": "Last 30 days", campaign: "Campaign to date" }} />
        <AdminSelect name="source" label="Source" options={["all", ...new Set(campaigns.map((row) => row.source))]} value={source} onChange={setSource} labels={{ all: "All sources" }} />
        <div className="dashboard-freshness"><span>Data freshness</span><b>Preview dataset · {range}</b></div>
      </div>

      <section className="metric-strip" aria-label="Key performance indicators">
        <div><span>Sessions</span><b>{number(totals.sessions)}</b><small>+18.4% vs previous</small></div>
        <div><span>Apply clicks</span><b>{number(totals.clicks)}</b><small>{percent(totals.sessions ? totals.clicks / totals.sessions * 100 : 0)} click rate</small></div>
        <div><span>Applications</span><b>{number(totals.applications)}</b><small>{percent(totals.sessions ? totals.applications / totals.sessions * 100 : 0)} visit CVR</small></div>
        <div><span>Cost / application</span><b>{totals.spend ? money(totals.spend / totals.applications) : "—"}</b><small>{money(totals.spend)} tracked spend</small></div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-panel--funnel">
          <div className="dashboard-panel__heading"><div><span>Applicant funnel</span><h2>From visit to admission</h2></div><small>Campaign to date</small></div>
          <ol className="funnel-list">{funnel.map((stage, index) => {
            const previous = index ? funnel[index - 1].value : stage.value;
            return <li key={stage.label}><div><span>{stage.label}</span><b>{number(stage.value)}</b></div><div className="funnel-track"><i style={{ width: `${stage.value / funnel[0].value * 100}%` }} /></div><small>{index ? `${percent(stage.value / previous * 100)} from previous` : "100% of visits"}</small></li>;
          })}</ol>
        </section>

        <section className="dashboard-panel dashboard-panel--creative">
          <div className="dashboard-panel__heading"><div><span>Campaign performance</span><h2>Applications generated</h2></div><small>Last-touch UTM</small></div>
          <div className="campaign-bars">{rows.map((row) => <div key={row.campaign}><div><span>{row.campaign}</span><b>{row.applications}</b></div><i><em style={{ width: `${row.applications / maxApplications * 100}%` }} /></i><small>{row.source} / {row.medium}</small></div>)}</div>
        </section>
      </div>

      <section className="dashboard-table-section">
        <div className="dashboard-panel__heading"><div><span>UTM breakdown</span><h2>Campaign efficiency</h2></div><small>First and last touch stored per application</small></div>
        <div className="dashboard-table-wrap"><table><thead><tr><th>Campaign</th><th>Source / medium</th><th>Sessions</th><th>Apply clicks</th><th>Form starts</th><th>Applications</th><th>CVR</th><th>CPA</th></tr></thead><tbody>{rows.map((row) => <tr key={row.campaign}><td><b>{row.campaign}</b></td><td>{row.source} / {row.medium}</td><td>{number(row.sessions)}</td><td>{number(row.clicks)}</td><td>{number(row.starts)}</td><td><strong>{row.applications}</strong></td><td>{percent(row.applications / row.sessions * 100)}</td><td>{row.spend ? money(row.spend / row.applications) : "Organic"}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
