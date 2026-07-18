import Script from "next/script";
import { GA_MEASUREMENT_ID } from "../lib/analytics.mjs";

export function GoogleAnalytics() {
  return <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
    <Script id="google-analytics" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(){window.dataLayer.push(arguments);};
        window.gtag('js', new Date());
        window.gtag('config', '${GA_MEASUREMENT_ID}');
      `}
    </Script>
  </>;
}
