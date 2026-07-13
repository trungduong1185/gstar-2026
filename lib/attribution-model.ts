import type { StoredApplication } from "@/lib/application-store";
import { hasAttribution, Touchpoint, touchpointToUtm } from "@/lib/utm";

export type AttributionModel = "first" | "last" | "linear" | "position";

export const ATTRIBUTION_MODELS: AttributionModel[] = ["first", "last", "linear", "position"];

const POSITION_FIRST = 0.4;
const POSITION_LAST = 0.4;

/**
 * A channel bucket derived from a touchpoint or legacy first/last snapshot.
 * We collapse to source/medium/campaign for reporting — anything more granular
 * (utm_content, ad-set click IDs) is preserved on the record itself.
 */
export type ChannelKey = {
  source: string;
  medium: string;
  campaign: string;
};

const DIRECT: ChannelKey = { source: "direct", medium: "none", campaign: "(direct)" };

function channelOf(point: { utm_source?: string; utm_medium?: string; utm_campaign?: string }): ChannelKey {
  return {
    source: point.utm_source || DIRECT.source,
    medium: point.utm_medium || DIRECT.medium,
    campaign: point.utm_campaign || DIRECT.campaign
  };
}

/**
 * Collapse an application's touchpoints (falling back to firstTouch/lastTouch
 * for pre-Sprint-2 records) into an ordered list of channel keys.
 */
export function channelsForApplication(application: StoredApplication): ChannelKey[] {
  const attribution = application.attribution || {};
  const points: Touchpoint[] = attribution.touchpoints?.length
    ? attribution.touchpoints
    : legacyTouchpoints(attribution);
  if (!points.length) return [DIRECT];
  return points.map((point) => channelOf(touchpointToUtm(point)));
}

function legacyTouchpoints(attribution: StoredApplication["attribution"]): Touchpoint[] {
  const derived: Touchpoint[] = [];
  const at = "";
  if (hasAttribution(attribution?.firstTouch)) {
    derived.push({ ...attribution.firstTouch, at, landingPage: "", referrer: "" });
  }
  if (hasAttribution(attribution?.lastTouch)) {
    // Skip if it's the exact same shape as the first entry — a single-touch
    // journey would otherwise be double-counted.
    const first = derived[0];
    const last = attribution.lastTouch;
    const same = first && ["utm_source", "utm_medium", "utm_campaign"].every((key) => (first as Record<string, unknown>)[key] === (last as Record<string, unknown>)[key]);
    if (!same) derived.push({ ...last, at, landingPage: "", referrer: "" });
  }
  return derived;
}

/**
 * Return per-touchpoint weights (summing to 1) for the requested model.
 * With one touchpoint, every model degenerates to `[1]`.
 */
export function weightsForChannels(count: number, model: AttributionModel): number[] {
  if (count <= 1) return count === 1 ? [1] : [];
  switch (model) {
    case "first": {
      const weights = new Array(count).fill(0);
      weights[0] = 1;
      return weights;
    }
    case "last": {
      const weights = new Array(count).fill(0);
      weights[count - 1] = 1;
      return weights;
    }
    case "linear":
      return new Array(count).fill(1 / count);
    case "position": {
      if (count === 2) return [0.5, 0.5];
      const middle = 1 - POSITION_FIRST - POSITION_LAST;
      const perMiddle = middle / (count - 2);
      const weights = new Array(count).fill(perMiddle);
      weights[0] = POSITION_FIRST;
      weights[count - 1] = POSITION_LAST;
      return weights;
    }
  }
}

/**
 * Apply the requested model to every application and roll credits up per
 * channel key (source/medium/campaign). Total credited value across all
 * channels equals `applications.length` — useful for CPA calculations.
 */
export function creditByChannel(applications: StoredApplication[], model: AttributionModel) {
  const totals = new Map<string, { key: ChannelKey; credit: number; applications: Set<string> }>();
  for (const application of applications) {
    const channels = channelsForApplication(application);
    const weights = weightsForChannels(channels.length, model);
    channels.forEach((channel, index) => {
      const bucketId = `${channel.source}::${channel.medium}::${channel.campaign}`;
      const entry = totals.get(bucketId) ?? { key: channel, credit: 0, applications: new Set<string>() };
      entry.credit += weights[index];
      entry.applications.add(application.id);
      totals.set(bucketId, entry);
    });
  }
  return Array.from(totals.values()).map((entry) => ({
    ...entry.key,
    credit: entry.credit,
    reachedApplications: entry.applications.size
  }));
}
