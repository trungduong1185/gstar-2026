export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"] as const;

/**
 * Ad-platform click identifiers.
 * Server-side conversion APIs (Meta CAPI, Google Enhanced Conversions,
 * TikTok Events API, LinkedIn CAPI) require these to attribute a conversion
 * back to the paid click when client-side pixels are blocked by ITP or ad-blockers.
 *
 * Case is preserved (values may contain uppercase letters) unlike UTM values.
 */
export const CLICK_ID_KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid", "msclkid", "li_fat_id"] as const;

export const ATTRIBUTION_KEYS = [...UTM_KEYS, ...CLICK_ID_KEYS] as const;

export type UtmData = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>;

/**
 * A single tracked visit that carried at least one attribution parameter.
 * The array is capped client-side to avoid quadratic growth for returning visitors.
 */
export type Touchpoint = UtmData & {
  at: string;              // ISO timestamp of the visit
  landingPage: string;     // full URL of the landing at the moment of capture
  referrer: string;        // document.referrer at the moment of capture
};

export const MAX_TOUCHPOINTS = 20;

/**
 * Backward-compat wrapper: keep the old firstTouch/lastTouch contract for
 * anything that hasn't migrated yet (Google Sheet columns, older admin views),
 * and additionally carry the full touchpoints[] array for multi-touch reports.
 */
export type Attribution = {
  firstTouch: UtmData;
  lastTouch: UtmData;
  touchpoints: Touchpoint[];
  landingPage: string;
  referrer: string;
};

/**
 * Read attribution parameters from a URL search string.
 * UTMs are lower-cased for consistency. Click IDs preserve original case,
 * because ad platforms sometimes use case-sensitive tokens.
 */
export function readUtm(search: string): UtmData {
  const params = new URLSearchParams(search);
  const result: UtmData = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim().toLowerCase();
    if (value) result[key] = value;
  }
  for (const key of CLICK_ID_KEYS) {
    const value = params.get(key)?.trim();
    if (value) result[key] = value;
  }
  return result;
}

/**
 * True if a UtmData object carries any actionable attribution signal.
 * Empty objects are dropped so we don't pollute the touchpoints array.
 */
export function hasAttribution(data: UtmData | undefined | null): data is UtmData {
  if (!data) return false;
  return ATTRIBUTION_KEYS.some((key) => Boolean(data[key]));
}

/**
 * Extract only the UTM/click-ID fields from a Touchpoint, discarding metadata.
 */
export function touchpointToUtm(point: Touchpoint): UtmData {
  const result: UtmData = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = point[key];
    if (value) result[key] = value;
  }
  return result;
}

/**
 * Server-side helper: normalize an inbound touchpoints array from the client.
 * Drops entries without attribution signal, truncates strings, caps length.
 */
export function sanitizeTouchpoints(input: unknown): Touchpoint[] {
  if (!Array.isArray(input)) return [];
  const output: Touchpoint[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const at = typeof record.at === "string" ? record.at.slice(0, 40) : "";
    if (!at || Number.isNaN(Date.parse(at))) continue;
    const landingPage = typeof record.landingPage === "string" ? record.landingPage.slice(0, 500) : "";
    const referrer = typeof record.referrer === "string" ? record.referrer.slice(0, 500) : "";
    const utm: UtmData = {};
    for (const key of ATTRIBUTION_KEYS) {
      const value = record[key];
      if (typeof value === "string") {
        const trimmed = value.trim().slice(0, 120);
        if (trimmed) utm[key] = trimmed;
      }
    }
    if (!hasAttribution(utm)) continue;
    output.push({ ...utm, at, landingPage, referrer });
    if (output.length >= MAX_TOUCHPOINTS) break;
  }
  return output;
}

/**
 * Server-side helper: sanitize a single UtmData object (firstTouch/lastTouch).
 * Only keeps known attribution keys, truncates values, drops junk.
 */
export function sanitizeUtmData(input: unknown): UtmData {
  if (!input || typeof input !== "object") return {};
  const record = input as Record<string, unknown>;
  const result: UtmData = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim().slice(0, 120);
      if (trimmed) result[key] = trimmed;
    }
  }
  return result;
}

/**
 * Server-side helper: sanitize the full attribution object from the client.
 * Validates firstTouch, lastTouch, touchpoints, landingPage, referrer.
 */
export function sanitizeAttribution(input: unknown): Attribution {
  const raw = (!input || typeof input !== "object" ? {} : input) as Record<string, unknown>;
  return {
    firstTouch: sanitizeUtmData(raw.firstTouch),
    lastTouch: sanitizeUtmData(raw.lastTouch),
    touchpoints: sanitizeTouchpoints(raw.touchpoints),
    landingPage: typeof raw.landingPage === "string" ? raw.landingPage.slice(0, 500) : "",
    referrer: typeof raw.referrer === "string" ? raw.referrer.slice(0, 500) : ""
  };
}
