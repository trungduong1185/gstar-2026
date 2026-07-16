"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { ConsentBanner } from "@/components/ConsentBanner";
import { withBasePath } from "@/lib/base-path";

export function GoogleAnalytics({ fallbackGaId }: { fallbackGaId?: string }) {
  const [gaId, setGaId] = useState<string>(fallbackGaId || "");

  useEffect(() => {
    if (fallbackGaId) return;
    fetch(withBasePath("/api/public-settings"))
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.gaMeasurementId) setGaId(data.gaMeasurementId); })
      .catch(() => {});
  }, [fallbackGaId]);

  if (!gaId) return null;

  return (
    <>
      <ConsentBanner />
      <Script id="gstar-consent-defaults" strategy="beforeInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('consent', 'default', {
          ad_storage: 'denied',
          analytics_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500
        });
      `}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="gstar-ga4" strategy="afterInteractive">{`
        gtag('js', new Date());
        gtag('config', '${gaId}', { send_page_view: true });
      `}</Script>
    </>
  );
}
