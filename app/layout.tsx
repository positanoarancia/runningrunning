import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

const SITE_URL = "https://runningrunning.vercel.app";
const SITE_NAME = "runningrunning";
const PAGE_TITLE = "러닝 페이스 계산기 | 러닝머신 속도 ↔ 페이스 변환";
const PAGE_DESCRIPTION = "러닝머신 속도와 페이스를 빠르게 변환하세요";
const OG_IMAGE_URL = "https://runningrunning.vercel.app/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "러닝 페이스 계산기",
    description: PAGE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "러닝 페이스 계산기 - 속도와 페이스 변환 예시 이미지",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "러닝 페이스 계산기",
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE_URL],
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
