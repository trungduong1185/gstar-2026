import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import { ApplicationDrawer } from "@/components/ApplicationDrawer";
import { withBasePath } from "@/lib/base-path";

function landingBody() {
  const source = fs.readFileSync(path.join(process.cwd(), "content/landing.html"), "utf8");
  const match = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error("Unable to extract the V3 landing body");
  const staticRoot = withBasePath("/static/");
  return match[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/(["'])static\//g, `$1${staticRoot}`);
}

export default function LandingPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: landingBody() }} />
      <ApplicationDrawer />
      <Script src={withBasePath("/static/js/mentors.js")} strategy="afterInteractive" />
      <Script src={withBasePath("/api/program-config")} strategy="afterInteractive" />
      <Script src={withBasePath("/static/js/enhancements.js")} strategy="afterInteractive" />
      <Script src={withBasePath("/static/js/interactions.js")} strategy="afterInteractive" />
      <Script src={withBasePath("/static/js/experience.js")} strategy="afterInteractive" />
    </>
  );
}
