import type { Metadata } from "next";
import { IntegrationSettingsForm } from "@/components/IntegrationSettingsForm";

export const metadata: Metadata = { title: "Integration settings" };

export default function IntegrationSettingsPage() {
  return <IntegrationSettingsForm />;
}
