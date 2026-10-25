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
  title: "MuseVibe — Dari Prompt Jadi PRD, Task, Desain, Lalu Kode",
  description:
    "MuseVibe menyederhanakan alur pembuatan aplikasi: dari prompt alami menjadi PRD, pemecahan tugas, desain antarmuka, hingga siap dieksekusi menjadi kode produksi.",
  icons: {
    icon: "/logo-musevibe.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#05060A] text-slate-200 font-sans selection:bg-[#7C3AED]/30 selection:text-white">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
