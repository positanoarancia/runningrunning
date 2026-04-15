import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

const SITE_URL = "https://runningrunning.kr";
const SITE_NAME = "runningrunning";
const PAGE_TITLE = "러닝 페이스 계산기 | 러닝머신 속도 ↔ 페이스 변환";
const PAGE_DESCRIPTION =
  "러닝머신 속도(km/h)와 러닝 페이스(min/km)를 빠르게 변환하세요. 11km/h가 몇 분 페이스인지, 5:30/km가 몇 km/h인지 바로 확인하고 10km·하프 예상 기록도 볼 수 있습니다.";
const OG_IMAGE_PATH = "/images/og-running-pace-calculator.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: `${SITE_NAME} | 러닝 페이스 계산기`,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "러닝 페이스 계산기 - 러닝머신 속도 ↔ 페이스 변환",
      },
    ],
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${SITE_NAME} 러닝 페이스 계산기`,
    alternateName: [SITE_NAME, "러닝 페이스 계산기"],
    url: SITE_URL,
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const saved = localStorage.getItem("theme-mode");
              const theme = saved === "light" || saved === "dark"
                ? saved
                : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.colorScheme = theme;
            } catch {}
          })();`}
        </Script>
        <Script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
