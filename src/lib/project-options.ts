export type Platform = "web" | "mobile" | "desktop";
export type Timeline = "weekend" | "week" | "two-weeks" | "month";

export const PLATFORMS: { value: Platform; label: string; description: string }[] = [
  {
    value: "web",
    label: "Web app",
    description: "Runs in the browser. The fastest path to a shareable demo.",
  },
  {
    value: "mobile",
    label: "Mobile app",
    description: "Ships to iOS and Android. Needs a device build to test.",
  },
  {
    value: "desktop",
    label: "Desktop app",
    description: "Installs on macOS, Windows, or Linux.",
  },
];

export const TIMELINES: { value: Timeline; label: string }[] = [
  { value: "weekend", label: "A weekend" },
  { value: "week", label: "About a week" },
  { value: "two-weeks", label: "Two weeks" },
  { value: "month", label: "A month" },
];

export function platformLabel(value: Platform): string {
  return PLATFORMS.find((platform) => platform.value === value)?.label ?? value;
}

export function timelineLabel(value: Timeline): string {
  return TIMELINES.find((timeline) => timeline.value === value)?.label ?? value;
}
