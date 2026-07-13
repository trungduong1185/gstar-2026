import { readApplications, StoredApplication } from "@/lib/application-store";
import { ATTRIBUTION_MODELS, AttributionModel, channelsForApplication, creditByChannel } from "@/lib/attribution-model";

export type DateRange = "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<Exclude<DateRange, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

export type MetricsQuery = {
  range: DateRange;
  source: string;               // "all" or a utm_source value to filter by
  model: AttributionModel;
};

export function parseMetricsQuery(searchParams: URLSearchParams): MetricsQuery {
  const range = (searchParams.get("range") || "30d") as DateRange;
  const source = searchParams.get("source") || "all";
  const modelParam = (searchParams.get("model") || "last") as AttributionModel;
  return {
    range: (["7d", "30d", "90d", "all"] as DateRange[]).includes(range) ? range : "30d",
    source: typeof source === "string" ? source.slice(0, 60) : "all",
    model: ATTRIBUTION_MODELS.includes(modelParam) ? modelParam : "last"
  };
}

function inRange(application: StoredApplication, range: DateRange): boolean {
  if (range === "all") return true;
  const submitted = Date.parse(application.submittedAt);
  if (Number.isNaN(submitted)) return false;
  return submitted >= Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
}

/**
 * True when any channel in the application's touchpoints matches the requested source.
 * "all" is a passthrough.
 */
function matchesSource(application: StoredApplication, source: string): boolean {
  if (!source || source === "all") return true;
  return channelsForApplication(application).some((channel) => channel.source === source);
}

export type CampaignRow = {
  campaign: string;
  source: string;
  medium: string;
  applications: number;         // credited by attribution model (fractional allowed)
  reachedApplications: number;  // integer count of unique applications touched by this channel
  cvr: number | null;           // conversion rate: applications / sessions (null if unknown)
  cpa: number | null;           // cost per application (null if spend unknown)
};

export type FunnelStage = {
  label: string;
  value: number;
  fromPrevious: number | null;  // ratio to previous stage (null for the first stage)
};

export type MetricsResponse = {
  meta: {
    range: DateRange;
    source: string;
    model: AttributionModel;
    generatedAt: string;
    dataSources: {
      applications: "prisma-sqlite";
      sessions: "unknown" | "ga4";
      clicks: "unknown" | "ga4";
      spend: "unknown";
    };
    counts: {
      total: number;      // ALL applications in SQLite (unfiltered)
      inRange: number;    // in the requested date range
      matched: number;    // after date + source filter
    };
  };
  kpis: {
    applications: number;
    shortlisted: number;
    admitted: number;      // "Admitted" is not a status yet; placeholder for future
    formStarts: number | null;      // not stored server-side today
    applyClicks: number | null;     // not stored server-side today
    sessions: number | null;        // not stored server-side today
    cpa: number | null;
    spend: number | null;
    conversionRate: number | null;
  };
  funnel: FunnelStage[];
  campaigns: CampaignRow[];
  sources: string[];       // all unique sources seen — powers the filter dropdown
};

export async function computeMetrics(query: MetricsQuery): Promise<MetricsResponse> {
  const all = await readApplications();
  const inRangeApps = all.filter((app) => inRange(app, query.range));
  const matched = inRangeApps.filter((app) => matchesSource(app, query.source));

  const sources = new Set<string>();
  for (const app of inRangeApps) {
    for (const channel of channelsForApplication(app)) sources.add(channel.source);
  }

  const credited = creditByChannel(matched, query.model);
  const campaigns: CampaignRow[] = credited
    .sort((a, b) => b.credit - a.credit)
    .map((row) => ({
      campaign: row.campaign,
      source: row.source,
      medium: row.medium,
      applications: Number(row.credit.toFixed(2)),
      reachedApplications: row.reachedApplications,
      cvr: null,
      cpa: null
    }));

  const shortlisted = matched.filter((app) => app.status === "Shortlisted").length;

  const kpis: MetricsResponse["kpis"] = {
    applications: matched.length,
    shortlisted,
    admitted: 0,
    formStarts: null,
    applyClicks: null,
    sessions: null,
    cpa: null,
    spend: null,
    conversionRate: null
  };

  const funnel: FunnelStage[] = [
    { label: "Applications", value: matched.length, fromPrevious: null },
    { label: "Assessment invited", value: matched.filter((app) => app.status === "Assessment").length + shortlisted, fromPrevious: null },
    { label: "Shortlisted", value: shortlisted, fromPrevious: null },
    { label: "Admitted", value: 0, fromPrevious: null }
  ];
  for (let i = 1; i < funnel.length; i += 1) {
    const previous = funnel[i - 1].value;
    funnel[i].fromPrevious = previous ? funnel[i].value / previous : null;
  }

  return {
    meta: {
      range: query.range,
      source: query.source,
      model: query.model,
      generatedAt: new Date().toISOString(),
      dataSources: { applications: "prisma-sqlite", sessions: "unknown", clicks: "unknown", spend: "unknown" },
      counts: { total: all.length, inRange: inRangeApps.length, matched: matched.length }
    },
    kpis,
    funnel,
    campaigns,
    sources: Array.from(sources).sort()
  };
}
