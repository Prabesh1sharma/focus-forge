import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FocusForge — Forge your focus. Build your streak.",
    template: "%s | FocusForge",
  },
  description:
    "A social focus and reading tracker that helps you develop consistent deep-work habits through Pomodoro sessions, accountability rooms, leaderboards, streaks, and activity heatmaps.",
  keywords: [
    "focus tracker",
    "pomodoro",
    "reading tracker",
    "productivity",
    "deep work",
    "study timer",
  ],
  openGraph: {
    type: "website",
    siteName: "FocusForge",
    title: "FocusForge — Forge your focus. Build your streak.",
    description:
      "Track your focus sessions, compete with friends, and build lasting habits.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
