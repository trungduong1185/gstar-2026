import { StoredApplication } from "@/lib/application-store";
import { resolvedSlackWebhookUrl } from "@/lib/integration-settings";

/**
 * Fire-and-forget Slack (or Discord — the payload is Slack-compatible) notification
 * for a new application. Silently skips when no webhook is configured.
 *
 * The webhook call is intentionally NOT awaited from the request handler so a slow
 * or failing Slack endpoint never delays the applicant's response.
 *
 * Payload is minimal: name, email, campaign source, readiness count. No resume URL
 * — that stays inside the admin surface behind auth.
 */
export function notifySlack(application: StoredApplication): void {
  void (async () => {
    try {
      const url = await resolvedSlackWebhookUrl();
      if (!url) return;

      const last = application.attribution?.lastTouch || {};
      const first = application.attribution?.firstTouch || {};
      const source = last.utm_source || first.utm_source || "direct";
      const medium = last.utm_medium || first.utm_medium || "none";
      const campaign = last.utm_campaign || first.utm_campaign || "—";
      const readiness = application.readinessSignals?.length ?? 0;

      const clickIdKeys: Array<keyof typeof last> = ["gclid", "fbclid", "ttclid", "msclkid", "li_fat_id"];
      const clickIds = clickIdKeys
        .map((key) => (last[key] ? `${key}` : ""))
        .filter(Boolean)
        .join(", ") || "none";

      const text = `*New GStar application* · ${application.fullName}`;
      const detail = [
        `*Email:* ${application.email}`,
        `*Status:* ${application.currentStatus} · ${application.aiExperience}`,
        `*Source:* ${source} / ${medium}`,
        `*Campaign:* ${campaign}`,
        `*Readiness signals:* ${readiness} of 5`,
        `*Scholarship request:* ${application.scholarshipRequest ? "yes" : "no"}`,
        `*Click IDs captured:* ${clickIds}`
      ].join("\n");

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          blocks: [
            { type: "section", text: { type: "mrkdwn", text } },
            { type: "section", text: { type: "mrkdwn", text: detail } },
            { type: "context", elements: [{ type: "mrkdwn", text: `Application ID · \`${application.id}\`` }] }
          ]
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (error) {
      console.error("Slack notification failed", error);
    }
  })();
}
