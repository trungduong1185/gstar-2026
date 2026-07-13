import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./app.css";
import "./admin-nti.css";
import { withBasePath } from "@/lib/base-path";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://gstar.newturing.ai").replace(/\/$/, "");
const siteOrigin = new URL(siteUrl).origin;
const ogImage = withBasePath("/static/img/hero-background-v2.jpg");

const title = "GStar Bootcamp 2026 · Build frontier AI systems";
const description =
  "A selective 12-week online AI accelerator for engineers. Train frontier models, ship a mentored capstone, and join NTI's global builder network.";
const socialTitle = "GStar Bootcamp · NTI Global Talent Program 2026";
const socialDescription =
  "From strong engineers to world-class AI builders. A 12-week, fully online AI accelerator — mentored by researchers from Google DeepMind, OpenAI, Stanford, Princeton and CMU.";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: title,
    template: "%s · GStar Bootcamp"
  },
  description,
  applicationName: "GStar Bootcamp",
  category: "education",
  keywords: [
    "GStar Bootcamp",
    "AI accelerator",
    "AI bootcamp",
    "frontier AI",
    "LLM training",
    "AI engineering",
    "machine learning program",
    "New Turing Institute",
    "NTI"
  ],
  authors: [{ name: "New Turing Institute", url: "https://newturing.ai" }],
  creator: "New Turing Institute",
  publisher: "New Turing Institute",
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "GStar Bootcamp · New Turing Institute",
    title: socialTitle,
    description: socialDescription,
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "GStar Bootcamp 2026 — Build AI at the frontier"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: "From strong engineers to world-class AI builders. 12 weeks. Fully online. Global bar.",
    images: [ogImage]
  },
  icons: {
    icon: withBasePath("/static/img/new-turing-institute.png"),
    shortcut: withBasePath("/static/img/new-turing-institute.png"),
    apple: withBasePath("/static/img/new-turing-institute.png")
  }
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://newturing.ai/#organization",
      name: "New Turing Institute",
      url: "https://newturing.ai",
      logo: `${siteUrl}/static/img/new-turing-institute.png`
    },
    {
      "@type": "Course",
      name: "GStar Bootcamp 2026",
      description,
      url: siteUrl,
      inLanguage: "en",
      educationalLevel: "Advanced",
      provider: { "@id": "https://newturing.ai/#organization" },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "P12W",
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        offers: {
          "@type": "Offer",
          price: "4500",
          priceCurrency: "USD",
          url: `${siteUrl}/#apply`,
          category: "Tuition — scholarships up to 100% available"
        }
      }
    }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={withBasePath("/static/css/tokens.css")} />
        <link rel="stylesheet" href={withBasePath("/static/css/base.css")} />
        <link rel="stylesheet" href={withBasePath("/static/css/components.css")} />
        <link rel="stylesheet" href={withBasePath("/static/css/sections.css")} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body data-mentor-source={withBasePath("/api/mentors")}>
        {children}
        {gaId && <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="gstar-ga4" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${gaId}', { send_page_view: true });
          `}</Script>
        </>}
      </body>
    </html>
  );
}
