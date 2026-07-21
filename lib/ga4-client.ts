import { prisma } from "@/lib/prisma";

/**
 * GA4 Data API integration.
 *
 * When GA4_PROPERTY_ID + a Google service account JSON key are configured,
 * this module pulls session and event data from the GA4 Data API to enrich
 * campaign metrics with real traffic numbers (sessions, conversions, CVR).
 *
 * Setup:
 * 1. Create a Google Cloud service account with GA4 Data API access.
 * 2. Add the service account email as a Reader in GA4 Property settings.
 * 3. Set env vars:
 *    GA4_PROPERTY_ID=123456789
 *    GA4_CLIENT_EMAIL=xxx@project.iam.gserviceaccount.com
 *    GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
 *
 * If not configured, all functions return null — the UI falls back to
 * application-only metrics.
 */

export type Ga4Config = {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
};

export function ga4Configured(): boolean {
  return Boolean(process.env.GA4_PROPERTY_ID && process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY);
}

function readConfig(): Ga4Config | null {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

type Ga4SessionRow = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  conversions: number;
};

type JwtHeader = { alg: "RS256"; typ: "JWT" };
type JwtPayload = {
  iss: string;
  scope: string;
  aud: string;
  iat: number;
  exp: number;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function getGa4AccessToken(): Promise<string | null> {
  const config = readConfig();
  if (!config) return null;

  const now = Math.floor(Date.now() / 1000);
  const header: JwtHeader = { alg: "RS256", typ: "JWT" };
  const payload: JwtPayload = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  try {
    const { createSign } = await import("node:crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(signingInput);
    sign.end();
    const signature = sign.sign(config.privateKey);
    const jwt = `${signingInput}.${base64url(signature)}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!tokenResponse.ok) return null;
    const tokenData = await tokenResponse.json() as { access_token?: string };
    return tokenData.access_token || null;
  } catch (error) {
    console.error("GA4 auth failed", error);
    return null;
  }
}

/**
 * Fetch sessions and conversions grouped by utm source/medium/campaign
 * from the GA4 Data API for the last N days.
 */
export async function fetchGa4CampaignSessions(days: number): Promise<Ga4SessionRow[] | null> {
  const config = readConfig();
  if (!config) return null;

  const token = await getGa4AccessToken();
  if (!token) return null;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dateStr = startDate.toISOString().slice(0, 10);

  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:runReport`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: dateStr, endDate: "today" }],
        dimensions: [
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "sessionCampaign" }
        ],
        metrics: [
          { name: "sessions" },
          { name: "conversions" }
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 100
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      console.error("GA4 Data API error", response.status);
      return null;
    }

    const data = await response.json() as {
      rows?: Array<{
        dimensionValues: Array<{ value: string }>;
        metricValues: Array<{ value: string }>;
      }>;
    };

    if (!data.rows) return [];

    return data.rows.map((row) => ({
      source: row.dimensionValues[0]?.value || "(none)",
      medium: row.dimensionValues[1]?.value || "(none)",
      campaign: row.dimensionValues[2]?.value || "(none)",
      sessions: Number(row.metricValues[0]?.value || 0),
      conversions: Number(row.metricValues[1]?.value || 0)
    }));
  } catch (error) {
    console.error("GA4 Data API fetch failed", error);
    return null;
  }
}

/**
 * Get total sessions from GA4 for the date range.
 */
export async function fetchGa4TotalSessions(days: number): Promise<{ totalSessions: number; totalConversions: number } | null> {
  const config = readConfig();
  if (!config) return null;

  const token = await getGa4AccessToken();
  if (!token) return null;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dateStr = startDate.toISOString().slice(0, 10);

  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:runReport`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: dateStr, endDate: "today" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" }
        ]
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) return null;

    const data = await response.json() as {
      rows?: Array<{
        metricValues: Array<{ value: string }>;
      }>;
    };

    if (!data.rows?.[0]) return { totalSessions: 0, totalConversions: 0 };

    return {
      totalSessions: Number(data.rows[0].metricValues[0]?.value || 0),
      totalConversions: Number(data.rows[0].metricValues[1]?.value || 0)
    };
  } catch {
    return null;
  }
}

// Store GA4 integration settings in DB for admin-configured connection
export async function readGa4Settings() {
  const stored = await prisma.integrationSetting.findUnique({ where: { id: 1 } });
  return {
    propertyId: stored?.gaMeasurementId || "",
    enabled: ga4Configured()
  };
}
