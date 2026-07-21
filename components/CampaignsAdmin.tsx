"use client";
import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";

type CampaignRow = {
  campaign: string;
  source: string;
  medium: string;
  applications: number;
  reachedApplications: number;
  cvr: number | null;
  cpa: number | null;
};

type MetricsData = {
  meta: {
    range: string;
    source: string;
    model: string;
    dataSources: { applications: string; sessions: string };
    counts: { total: number; inRange: number; matched: number };
  };
  kpis: {
    applications: number;
    shortlisted: number;
    sessions: number | null;
    conversionRate: number | null;
  };
  campaigns: CampaignRow[];
  sources: string[];
};

type DateRange = "7d" | "30d" | "90d" | "all";
type AttributionModel = "first" | "last" | "linear" | "position";

function fmt(n: number | null, suffix = "") {
  if (n === null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n) + suffix;
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  return n.toFixed(1) + "%";
}

export function CampaignsAdmin() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<DateRange>("30d");
  const [source, setSource] = useState("all");
  const [model, setModel] = useState<AttributionModel>("last");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range, source, model });
      const res = await fetch(withBasePath(`/api/admin/metrics?${params}`), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load metrics");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics.");
    }
    setLoading(false);
  }, [range, source, model]);

  useEffect(() => { load(); }, [load]);

  const ga4Connected = data?.meta?.dataSources?.sessions === "ga4";

  return (
    <main className="admin-page">
      <div className="admin-pagehead">
        <div><span>Acquisition</span><h1>Campaigns &amp; UTM</h1><p>Real application data aggregated from the database{ga4Connected ? " + GA4 sessions" : ""}.</p></div>
        <button onClick={() => load()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <div className="dashboard-filters applications-filters" aria-label="Metrics filters">
        <label>Date range<select value={range} onChange={(e) => setRange(e.target.value as DateRange)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All time</option></select></label>
        <label>Source<select value={source} onChange={(e) => setSource(e.target.value)}><option value="all">All sources</option>{data?.sources.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label>Attribution<select value={model} onChange={(e) => setModel(e.target.value as AttributionModel)}><option value="last">Last touch</option><option value="first">First touch</option><option value="linear">Linear</option><option value="position">Position-based</option></select></label>
        <div className="dashboard-freshness"><span>Data source</span><b>{data ? `${data.meta.counts.matched} of ${data.meta.counts.total} apps` : "—"}</b><small>{ga4Connected ? "SQLite + GA4" : "SQLite only"}</small></div>
      </div>

      {error && <p className="admin-notice" role="alert">{error}</p>}

      {!ga4Connected && !loading && (
        <div className="admin-notice"><b>GA4 not connected</b><span>Sessions and CVR require GA4 Data API configuration. Application counts are still accurate. Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY env vars to enable.</span></div>
      )}

      <section className="metric-strip" aria-label="Key performance indicators">
        <div><span>Sessions</span><b>{fmt(data?.kpis.sessions ?? null)}</b><small>{ga4Connected ? "From GA4" : "Connect GA4"}</small></div>
        <div><span>Applications</span><b>{fmt(data?.kpis.applications ?? null)}</b><small>{data ? `${data.meta.counts.inRange} in range` : ""}</small></div>
        <div><span>Conversion rate</span><b>{fmtPct(data?.kpis.conversionRate ?? null)}</b><small>Applications / sessions</small></div>
        <div><span>Shortlisted</span><b>{fmt(data?.kpis.shortlisted ?? null)}</b><small>Of matched applications</small></div>
      </section>

      <section className="admin-data">
        <header><div><span>Campaign performance</span><h2>Applications by channel ({model} attribution)</h2></div><small>{data?.meta.counts.matched || 0} matched applications</small></header>
        <div className="dashboard-table-wrap">
          {loading ? <p style={{ padding: 20 }}>Loading…</p> : data && data.campaigns.length > 0 ? (
            <table>
              <thead><tr><th>Campaign</th><th>Source / Medium</th><th>Sessions</th><th>Applications</th><th>CVR</th></tr></thead>
              <tbody>
                {data.campaigns.map((c, i) => (
                  <tr key={i}>
                    <td><b>{c.campaign}</b></td>
                    <td><code>{c.source}</code> / <code>{c.medium}</code></td>
                    <td>{ga4Connected ? fmt(c.cvr ? c.applications / (c.cvr / 100) : 0) : "—"}</td>
                    <td><strong>{c.applications}</strong></td>
                    <td>{fmtPct(c.cvr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="admin-empty">No campaign data for the selected filters.</p>}
        </div>
      </section>
    </main>
  );
}
