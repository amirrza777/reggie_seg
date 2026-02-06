import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "./providers";

const sfPro = localFont({
  src: [
    { path: "../public/fonts/SFProWoff/SF-Pro-Display-Regular.woff", weight: "400", style: "normal" },
    { path: "../public/fonts/SFProWoff/SF-Pro-Display-Medium.woff", weight: "500", style: "normal" },
    { path: "../public/fonts/SFProWoff/SF-Pro-Display-Semibold.woff", weight: "600", style: "normal" },
  ],
  variable: "--font-sf",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Team Feedback",
  description: "Team feedback and reflection platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={sfPro.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
