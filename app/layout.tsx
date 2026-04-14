import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "러닝 페이스 계산기",
  description: "러닝머신 속도와 러닝 페이스를 실시간으로 변환하는 모바일 우선 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
        {children}
      </body>
    </html>
  );
}
