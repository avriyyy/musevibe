import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LenisProvider } from "@/components/providers/lenis-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MuseVibe — Autonomous Software Synthesis Engine",
  description:
    "Scaffold software from Prompt to PRD to Task to Design to Code in one continuous flow. Meta-style clean architecture with interactive 3D flow topology and Next.js 16 native emission.",
  keywords: [
    "MuseVibe",
    "Autonomous Development",
    "Prompt to Code",
    "PRD Studio",
    "Task Engine",
    "Design Studio",
    "Next.js 16",
    "Turbopack",
    "Three.js",
    "TypeScript",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 font-sans">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
