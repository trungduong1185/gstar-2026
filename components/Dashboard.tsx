"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSelect } from "@/components/AdminSelect";
import { withBasePath } from "@/lib/base-path";

type DateRange = "7d" | "30d" | "90d" | "all";
type AttributionModel = "first" | "last" | "linear" | "position";

type CampaignRow = {
  campaign: string;
  source: string;
  medium: string;
  applications: number;
  reachedApplications: number;
  cvr: number | null;
  cpa: number | null;
};
type FunnelStage = { label: string; value: number; fromPrevious: number | null };
type MetricsResponse = {
  meta: {
    range: DateRange;
    source: string;
    model: AttributionModel;
    generatedAt: string;
    dataSources: { applications: string; sessions: string; clicks: string; spend: string };
    counts: { total: number; inRange: number; matched: number };
  };
  kpis: {
    applications: number;
    shortlisted: number;
    admitted: number;
    formStarts: number | null;
    applyClicks: number | null;
    sessions: number | null;
    cpa: number | null;
    spend: number | null;
    conversionRate: number | null;
  };
  funnel: FunnelStage[];
  campaigns: CampaignRow[];
  sources: string[];
};

function number(value: number) { return new Intl.NumberFormat("en-US").format(Math.round(value)); }
function percent(value: number | null) { return value == null ? "—" : `${(value * 100).toFixed(1)}%`; }
function money(value: number | null) { return value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }

const rangeLabels: Record<DateRange, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" };
const modelLabels: Record<AttributionModel, string> = { first: "First touch", last: "Last touch", linear: "Linear", position: "Position (40/20/40)" };

export function Dashboard() {
  const [range, setRange] = useState<DateRange>("30d");
  const [source, setSource] = useState("all");
  const [model, setModel] = useState<AttributionModel>("last");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ range, source, model });
    setLoading(true);
    setError("");
    fetch(withBasePath(`/api/admin/metrics?${params.toString()}`), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load dashboard data.");
        setData(payload);
      })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [range, source, model]);

  const sources = useMemo(() => ["all", ...(data?.sources ?? [])], [data]);
  const maxCredit = useMemo(() => Math.max(1, ...(data?.campaigns.map((row) => row.applications) ?? [0])), [data]);
  const totals = data?.kpis;
  const dataFresh = data?.meta.generatedAt ? new Date(data.meta.generatedAt).toLocaleTimeString() : "—";

  function exportCsv() {
    if (!data) return;
    const header = ["Campaign", "Source", "Medium", `Applications (${model})`, "Applications (unique)", "CVR", "CPA"];
    const csvRows = data.campaigns.map((row) => [row.campaign, row.source, row.medium, row.applications, row.reachedApplications, percent(row.cvr), money(row.cpa)]);
    const csv = [header, ...csvRows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `gstar-campaigns-${source}-${range}-${model}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="admin-page dashboard-overview">
      <div className="admin-pagehead">
        <div>
          <span>Workspace overview</span>
          <h1>Acquisition &amp; Admissions</h1>
          <p>Live figures aggregated from stored applications. Sessions, apply clicks and spend require GA4 / ads sync — placeholders shown until connected.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!data}>Export CSV</button>
      </div>

      <div className="dashboard-filters" aria-label="Dashboard filters">
        <AdminSelect name="range" label="Date range" options={["7d", "30d", "90d", "all"]} value={range} onChange={(value) => setRange(value as DateRange)} labels={rangeLabels} />
        <AdminSelect name="source" label="Source" options={sources} value={source} onChange={setSource} labels={{ all: "All sources" }} />
        <AdminSelect name="model" label="Attribution model" options={["first", "last", "linear", "position"]} value={model} onChange={(value) => setModel(value as AttributionModel)} labels={modelLabels} />
        <div className="dashboard-freshness">
          <span>Data freshness</span>
          <b>Live · updated {dataFresh}</b>
          {data && <small>{data.meta.counts.matched} of {data.meta.counts.total} applications shown</small>}
        </div>
      </div>

      {error && <p className="settings-message is-error" role="alert">{error}</p>}
      {loading && !data && <p className="settings-status">Loading dashboard data…</p>}

      {totals && (
        <section className="metric-strip" aria-label="Key performance indicators">
          <div><span>Applications</span><b>{number(totals.applications)}</b><small>Range · {rangeLabels[range]}</small></div>
          <div><span>Shortlisted</span><b>{number(totals.shortlisted)}</b><small>{totals.applications ? percent(totals.shortlisted / totals.applications) : "—"} of applications</small></div>
          <div><span>Sessions</span><b>{totals.sessions == null ? "—" : number(totals.sessions)}</b><small>{totals.sessions == null ? "Connect GA4 export to populate" : `${percent(totals.conversionRate)} visit CVR`}</small></div>
          <div><span>Cost per application</span><b>{money(totals.cpa)}</b><small>{totals.spend == null ? "Connect ad platform spend" : `${money(totals.spend)} tracked spend`}</small></div>
        </section>
      )}

      {data && (
        <div className="dashboard-grid">
          <section className="dashboard-panel dashboard-panel--funnel">
            <div className="dashboard-panel__heading"><div><span>Applicant funnel</span><h2>From application to admission</h2></div><small>{rangeLabels[range]}</small></div>
            <ol className="funnel-list">
              {data.funnel.map((stage, index) => (
                <li key={stage.label}>
                  <div><span>{stage.label}</span><b>{number(stage.value)}</b></div>
                  <div className="funnel-track"><i style={{ width: `${(data.funnel[0].value ? stage.value / data.funnel[0].value : 0) * 100}%` }} /></div>
                  <small>{index ? `${percent(stage.fromPrevious)} from previous` : "100% of applications"}</small>
                </li>
              ))}
            </ol>
          </section>

          <section className="dashboard-panel dashboard-panel--creative">
            <div className="dashboard-panel__heading"><div><span>Campaign performance</span><h2>Applications credited</h2></div><small>{modelLabels[model]}</small></div>
            <div className="campaign-bars">
              {data.campaigns.length === 0 && <small>No applications match the current filter.</small>}
              {data.campaigns.map((row) => (
                <div key={`${row.campaign}::${row.source}::${row.medium}`}>
                  <div><span>{row.campaign}</span><b>{row.applications.toFixed(1)}</b></div>
                  <i><em style={{ width: `${row.applications / maxCredit * 100}%` }} /></i>
                  <small>{row.source} / {row.medium} · {row.reachedApplications} unique</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {data && (
        <section className="dashboard-table-section">
          <div className="dashboard-panel__heading">
            <div><span>UTM breakdown</span><h2>Campaign efficiency</h2></div>
            <small>Attribution model · {modelLabels[model]}</small>
          </div>
          <div className="dashboard-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Source / medium</th>
                  <th>Applications (credited)</th>
                  <th>Applications (unique)</th>
                  <th>Sessions</th>
                  <th>CVR</th>
                  <th>CPA</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((row) => (
                  <tr key={`${row.campaign}::${row.source}::${row.medium}`}>
                    <td><b>{row.campaign}</b></td>
                    <td>{row.source} / {row.medium}</td>
                    <td>{row.applications.toFixed(1)}</td>
                    <td>{row.reachedApplications}</td>
                    <td>—</td>
                    <td>{percent(row.cvr)}</td>
                    <td>{money(row.cpa)}</td>
                  </tr>
                ))}
                {data.campaigns.length === 0 && (
                  <tr><td colSpan={7}><small>No applications match the current filter.</small></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="dashboard-panel__note"><small>Sessions and CPA columns are placeholders until GA4 export and ad-platform spend are connected — the underlying applications data is live.</small></p>
        </section>
      )}
    </main>
  );
}
