"use client";

import { Sticker } from "./Sticker";
import { brand } from "./fun";
import { folder } from "./icons";

const MUSEVIBE_PALETTE = brand("#8ab4ff", "#7ee2a8");

/** Isometric folder sticker for active generation and project-preparation states. */
export default function LoadingSticker({
  size = 76,
  label = "Animated folder opening",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <Sticker
      icon={folder}
      palette={MUSEVIBE_PALETTE}
      label={label}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
