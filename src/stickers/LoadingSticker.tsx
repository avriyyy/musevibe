"use client";

import { Sticker } from "./Sticker";
import { brand } from "./fun";
import { calendar, folder, pen, phone } from "./icons";

const MUSEVIBE_PALETTE = brand("#8ab4ff", "#7ee2a8");
type LoadingPurpose = "project" | "documents" | "tasks" | "pages";

/** Fun-isometric sticker that reflects the work currently being generated. */
export default function LoadingSticker({
  size = 76,
  label,
  purpose = "project",
}: {
  size?: number;
  label?: string;
  purpose?: LoadingPurpose;
}) {
  const icon =
    purpose === "documents"
      ? pen
      : purpose === "tasks"
        ? calendar
        : purpose === "pages"
          ? phone
          : folder;
  const accessibleLabel =
    label ??
    (purpose === "documents"
      ? "Writing project documents"
      : purpose === "tasks"
        ? "Checking off a task list"
        : purpose === "pages"
          ? "Sketching page suggestions"
          : "Animated folder opening");

  return (
    <Sticker
      icon={icon}
      palette={MUSEVIBE_PALETTE}
      label={accessibleLabel}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
