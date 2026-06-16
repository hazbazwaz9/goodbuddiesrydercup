import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { OfflineBanner } from "@/components/app-shell/offline-banner";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/lib/brand";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Live scoring for the Good Buddies Ryder Cup — Europe vs USA.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  appleWebApp: { capable: true, title: "GBRC", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#00205b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {/* Tiled logo watermark behind all content */}
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              backgroundImage: "url('/logo.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "140px 140px",
              opacity: 0.07,
            }}
          />
          <OfflineBanner />
          <TopBar />
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">{children}</main>
          <BottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
