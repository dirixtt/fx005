import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
const siteTitle = "fx005 — Telegram-ассистент для продавцов одежды и обуви";
const siteDescription =
  "Продавайте в Telegram: бот отвечает клиентам по остаткам из вашей базы, никогда не выдумывает наличие и цену, и передаёт вам всё, что не смог сам.";

// Generic, product-level metadata for the landing page and anything outside
// a store's own storefront. Each /s/[store] route overrides this with the
// store's own name/tagline via its own generateMetadata — see that layout.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · fx005",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "fx005",
    title: siteTitle,
    description: siteDescription,
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
