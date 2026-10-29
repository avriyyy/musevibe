"use client";

/**
 * Shared logo gallery modal. The current mark, any fresh vector variants,
 * and every stashed previous mark sit in one grid; picking one makes it
 * the mark. Used by the wizard step and by the workspace header, so both
 * places change the logo the same way.
 */

import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading, Text } from "@astryxdesign/core/Text";
import { svgToDataUrl, type LogoSvgVariant } from "@/lib/logo";

interface LogoModalProps {
  projectName: string;
  current: string | null;
  history: string[];
  variants?: LogoSvgVariant[];
  pickingVariant?: boolean;
  onPick: (url: string) => void;
  onPickVariant?: (svg: string) => void;
  onUpload: (file: File | undefined) => void;
  onClose: () => void;
}

export default function LogoModal({
  projectName,
  current,
  history,
  variants = [],
  pickingVariant = false,
  onPick,
  onPickVariant,
  onUpload,
  onClose,
}: LogoModalProps) {
  const [tab, setTab] = useState<"marks" | "variants">(variants.length ? "variants" : "marks");
  const uploadRef = useRef<HTMLInputElement>(null);
  const shownVariants = variants.slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Choose a logo for ${projectName}`}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}>
      <div
        className="flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17181d] shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Heading level={3}>Choose a logo</Heading>
            <Text type="supporting" color="secondary">
              Current, fresh variants, and every previous mark.
            </Text>
          </div>
          {shownVariants.length > 0 && onPickVariant && (
            <div className="flex gap-1 rounded-full bg-white/5 p-1">
              {(["variants", "marks"] as const).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setTab(entry)}
                  aria-pressed={tab === entry}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize ${
                    tab === entry ? "bg-white text-[#0b0c10]" : "text-[#9aa0ae] hover:text-white"
                  }`}>
                  {entry === "variants" ? `New (${shownVariants.length})` : "Saved"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close logo picker"
            className="flex size-9 items-center justify-center rounded-full text-[18px] text-[#9aa0ae] hover:bg-white/10 hover:text-white">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "variants" && shownVariants.length > 0 && onPickVariant ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shownVariants.map((variant, index) => {
                const url = svgToDataUrl(variant.svg);
                const active = current === url;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={pickingVariant && active}
                    onClick={() => {
                      onPickVariant(variant.svg);
                      onClose();
                    }}
                    className={`group flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors ${
                      active
                        ? "border-[#8ab4ff]/60 bg-[#8ab4ff]/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/30"
                    }`}>
                    <img
                      src={url}
                      alt={`Logo variant ${index + 1}`}
                      className="size-16 text-white [color-scheme:dark]"
                    />
                    <span className="line-clamp-2 text-center text-[11px] leading-4 text-[#9aa0ae]">
                      {active ? "In use" : (variant.rationale || `Variant ${index + 1}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {current && (
                <LogoTile
                  url={current}
                  label="Current mark"
                  active
                  onClick={() => onClose()}
                />
              )}
              {history
                .filter((url) => url !== current)
                .map((url, index) => (
                  <LogoTile
                    key={`${index}-${url.slice(-24)}`}
                    url={url}
                    label={`Previous mark ${index + 1}`}
                    onClick={() => {
                      onPick(url);
                      onClose();
                    }}
                  />
                ))}
              {!current && history.length === 0 && (
                <Text type="supporting" color="secondary">
                  No marks yet. Generate or upload one below.
                </Text>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <Button
            label="Upload image"
            variant="secondary"
            size="sm"
            className="min-h-11 md:min-h-0"
            onClick={() => uploadRef.current?.click()}
          />
          <input
            ref={uploadRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            aria-label="Upload a logo image"
            onChange={(event) => {
              onUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Text type="supporting" color="secondary">
            SVG stays vector; anything else becomes a square mark.
          </Text>
        </div>
      </div>
    </div>
  );
}

function LogoTile({
  url,
  label,
  active = false,
  onClick,
}: {
  url: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={active ? `${label} (in use)` : `Use ${label.toLowerCase()}`}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors ${
        active
          ? "border-[#8ab4ff]/60 bg-[#8ab4ff]/[0.08]"
          : "border-white/10 bg-white/[0.02] hover:border-white/30"
      }`}>
      <img
        src={url}
        alt=""
        width={64}
        height={64}
        className="size-16 rounded-lg bg-white/[0.04] object-contain [color-scheme:dark]"
      />
      <span className="text-[11px] text-[#9aa0ae]">{active ? "In use" : label}</span>
    </button>
  );
}
