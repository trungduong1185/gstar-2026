import crypto from "node:crypto";
import type { StoredApplication } from "@/lib/application-store";
import { channelsForApplication } from "@/lib/attribution-model";

/**
 * Meta Conversions API (CAPI) integration.
 *
 * Server-side conversion sends bypass ITP, ad-blockers and the iOS 14+
 * signal loss that hobbles the browser Pixel. It gives Meta the same signal
 * quality regardless of the visitor's browser.
 *
 * Requires Business-Manager–issued env variables (see .env.example):
 *   - META_PIXEL_ID              — 15–16 digit numeric ID
 *   - META_ACCESS_TOKEN          — long-lived server token
 *   - META_TEST_EVENT_CODE       — optional, only in staging
 *
 * Delivery is fire-and-forget with a 5s timeout so a slow or misconfigured
 * Meta endpoint never delays the applicant's response.
 */

const META_API_VERSION = "v20.0";

type MetaConfig = {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
};

function readConfig(): MetaConfig | null {
  const pixelId = (process.env.META_PIXEL_ID || "").trim();
  const accessToken = (process.env.META_ACCESS_TOKEN || "").trim();
  if (!pixelId || !accessToken) return null;
  return {
    pixelId,
    accessToken,
    testEventCode: (process.env.META_TEST_EVENT_CODE || "").trim()
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Build the `fbc` (Meta click identifier cookie shape) from a raw fbclid.
 * Meta's format: fb.<subdomainIndex>.<timestampMs>.<fbclid>
 * subdomainIndex is 1 for a top-level domain like example.com.
 */
function buildFbc(fbclid: string, at: number): string {
  return `fb.1.${at}.${fbclid}`;
}

/**
 * Extract Meta-relevant user_data from an application.
 * Emails/phones are SHA-256 hashed per Meta's requirement. Names are hashed too.
 */
function buildUserData(application: StoredApplication) {
  const email = application.email?.trim().toLowerCase();
  const name = application.fullName?.trim();
  const [first, ...rest] = name ? name.split(/\s+/) : [""];
  const last = rest.join(" ");
  const country = application.country?.split(",").at(-1)?.trim().slice(0, 2).toLowerCase();
  const last3 = application.attribution?.touchpoints?.at(-1);
  const fbclid = last3?.fbclid || application.attribution?.lastTouch?.fbclid;
  const clickTime = last3?.at ? Date.parse(last3.at) : Date.now();

  const user: Record<string, unknown> = {};
  if (email) user.em = [sha256(email)];
  if (first) user.fn = [sha256(first)];
  if (last) user.ln = [sha256(last)];
  if (country && country.length === 2) user.country = [sha256(country)];
  if (fbclid) user.fbc = buildFbc(fbclid, clickTime);
  return user;
}

function buildCustomData(application: StoredApplication) {
  const primaryChannel = channelsForApplication(application)[0];
  return {
    currency: "USD",
    value: 0,
    content_name: "GStar Bootcamp application",
    content_category: "education",
    predicted_ltv: 4500,     // one full tuition worth — used by Advantage+ budget
    campaign_source: primaryChannel.source,
    campaign_medium: primaryChannel.medium,
    campaign_name: primaryChannel.campaign,
    ai_experience: application.aiExperience,
    scholarship_request: application.scholarshipRequest ? "yes" : "no"
  };
}

/**
 * Fire the Lead event to Meta CAPI. Returns immediately — the actual HTTP call
 * runs on a detached promise. Errors are logged but never thrown.
 */
export function sendMetaLead(application: StoredApplication): void {
  const config = readConfig();
  if (!config) return;

  void (async () => {
    try {
      const eventTime = Math.floor(Date.parse(application.submittedAt) / 1000) || Math.floor(Date.now() / 1000);
      const payload: Record<string, unknown> = {
        data: [
          {
            event_name: "Lead",
            event_time: eventTime,
            action_source: "website",
            event_source_url: application.attribution?.landingPage || application.attribution?.touchpoints?.at(-1)?.landingPage || "",
            event_id: application.id,        // dedupe key vs any pixel-side Lead
            user_data: buildUserData(application),
            custom_data: buildCustomData(application)
          }
        ]
      };
      if (config.testEventCode) payload.test_event_code = config.testEventCode;

      const endpoint = `https://graph.facebook.com/${META_API_VERSION}/${config.pixelId}/events?access_token=${encodeURIComponent(config.accessToken)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error("Meta CAPI rejected event", response.status, detail.slice(0, 400));
      }
    } catch (error) {
      console.error("Meta CAPI delivery failed", error);
    }
  })();
}
