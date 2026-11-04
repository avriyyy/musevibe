"use client";
import type { ReactNode } from "react";
import NextLink from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { themes, defaultThemeSlug } from "@/astryx-themes";

export default function LandingTheme({ children }: { children: ReactNode }) {
  return (
    <Theme theme={themes[defaultThemeSlug]} mode="dark">
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </Theme>
  );
}
