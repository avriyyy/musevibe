import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import LandingTheme from "@/components/landing/LandingTheme";

export const metadata: Metadata = {
  title: "MuseVibe — Type an idea, get a workspace",
  description:
    "MuseVibe turns one sentence into a PRD, task board, designs, and starter code that all read the same context.",
  openGraph: {
    title: "MuseVibe — Type an idea, get a workspace",
    description:
      "MuseVibe turns one sentence into a PRD, task board, designs, and starter code that all read the same context.",
  },
};

export default function Home() {
  return (
    <LandingTheme>
      <LandingPage />
    </LandingTheme>
  );
}
