import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MuseVibe — Ubah Ide Menjadi PRD yang Rapi",
  description:
    "Workspace PRD generator frontend: tulis ide, jawab klarifikasi, dapatkan draft PRD, review per bagian, kelola versi, kunci Final.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body className="flex min-h-full flex-col bg-white text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
