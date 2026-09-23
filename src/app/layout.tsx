import type { Metadata } from "next";
import { Fraunces, Public_Sans, Geist_Mono } from "next/font/google";
import { AudioPlayerProvider } from "@/components/audio-player-context";
import "./globals.css";
import Script from "next/script";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Growth and Giggles",
  description: "Growth and Giggles learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-50YBS6WHXQ"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-50YBS6WHXQ');
          `}
        </Script>
        <AudioPlayerProvider>{children}</AudioPlayerProvider>
      </body>
    </html>
  );
}
