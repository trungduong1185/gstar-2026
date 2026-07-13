"use client";

import { useEffect, useState } from "react";

/**
 * Minimal GDPR/CCPA-shaped consent banner.
 *
 * Values persisted in localStorage under `gstar_consent`:
 *   - "granted"    → analytics + ad storage OK, GA4 fires normally
 *   - "necessary"  → only strictly necessary cookies; GA4 stays denied
 *
 * The banner does NOT fire GA4 itself. It calls Google Consent Mode v2
 * (`gtag('consent', 'update', …)`), which is initialised as "denied" in the
 * root layout. Only after the user accepts does GA4 start collecting.
 */

const STORAGE_KEY = "gstar_consent";

type ConsentValue = "granted" | "necessary";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function updateConsent(value: ConsentValue) {
  const analytics = value === "granted" ? "granted" : "denied";
  window.gtag?.("consent", "update", {
    ad_storage: analytics,
    analytics_storage: analytics,
    ad_user_data: analytics,
    ad_personalization: analytics
  });
  window.dispatchEvent(new CustomEvent("gstar:consent-change", { detail: { value } }));
}

export function ConsentBanner() {
  // Start hidden. We only decide visibility after reading localStorage on the
  // client, otherwise the SSR HTML would flash a banner for consented users.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ConsentValue | null;
      if (stored === "granted" || stored === "necessary") {
        updateConsent(stored);
        return;
      }
    } catch {
      /* localStorage disabled — show banner */
    }
    setVisible(true);
  }, []);

  function decide(value: ConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* If storage is disabled, the banner will re-show next visit — acceptable. */
    }
    updateConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="consent-banner" role="dialog" aria-label="Privacy consent" aria-live="polite">
      <div className="consent-banner__body">
        <p>
          <b>We use analytics cookies to improve GStar.</b>{" "}
          Analytics helps us understand where applicants come from so we can invest in
          channels that work. You can decline — the site works either way.{" "}
          <a href="https://newturing.ai/privacy" target="_blank" rel="noopener noreferrer">
            Read our privacy notice ↗
          </a>
        </p>
        <div className="consent-banner__actions">
          <button type="button" className="consent-banner__btn consent-banner__btn--ghost" onClick={() => decide("necessary")}>
            Necessary only
          </button>
          <button type="button" className="consent-banner__btn consent-banner__btn--primary" onClick={() => decide("granted")}>
            Accept all
          </button>
        </div>
      </div>
    </aside>
  );
}
