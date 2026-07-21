"use client";
import { ConsentBanner } from "@/components/ConsentBanner";

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  if (!gaId) return null;
  return <ConsentBanner />;
}
