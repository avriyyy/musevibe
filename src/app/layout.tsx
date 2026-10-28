import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import StoreHydrator from "@/components/StoreHydrator";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-code" });

export const metadata: Metadata = {
  title: "MuseVibe, from idea to code for indie devs",
  description: "One project, one flow: PRD, tasks, wireframe, and code sharing the same context.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark">
      <body className={`${figtree.className} ${mono.variable} min-h-full flex flex-col`}>
        <StoreHydrator />
        {children}
      </body>
    </html>
  );
}
