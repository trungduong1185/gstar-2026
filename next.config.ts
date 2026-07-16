import type { NextConfig } from "next";

// React dev mode needs eval() for stack reconstruction; production never does.
const scriptSrc = process.env.NODE_ENV === "development"
  ? "'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.youtube.com"
  : "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.youtube.com";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./data-backup*/**/*"]
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        // style-src/font-src: tokens.css @imports Google Fonts (Lexend/Lato).
        // connect-src: gtag.js sends hits to *.google-analytics.com (fetch/sendBeacon)
        // and region endpoints under analytics.google.com — without these GA4
        // collection is silently blocked even though the tag loads.
        { key: "Content-Security-Policy", value: `default-src 'self'; script-src ${scriptSrc}; frame-src https://www.youtube.com https://www.youtube-nocookie.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com https://graph.facebook.com; base-uri 'self'; form-action 'self'` }
      ]
    }];
  }
};

export default nextConfig;
