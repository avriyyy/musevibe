import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { themes, defaultThemeSlug } from "@/astryx-themes";

export default function FormWizardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh bg-[#0b0c10]">
      <Theme theme={themes[defaultThemeSlug]} mode="dark">
        {children}
      </Theme>
    </div>
  );
}
