"use client";

/**
 * The wizard's Design step: pick a design system, then make the mark.
 *
 * The system comes from a bundled template (with a live preview), an
 * uploaded design.md file, or a reference link the server fetches and the
 * model converts. Whatever the source, the wizard shows a rendered preview
 * before the project is finished, so the choice is seen, not guessed.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Banner } from "@astryxdesign/core/Banner";
import { DESIGN_SYSTEMS, type DesignSystemEntry } from "@/lib/design-systems-catalog";
import Markdown from "@/components/Markdown";
import LogoModal from "@/components/LogoModal";
import {
  DEFAULT_DESIGN_MD,
  DEFAULT_TOKENS_CSS,
  buildSamplePreviewHtml,
  type DesignSystemRef,
} from "@/lib/design-system";
import {
  initials,
  type LogoOrigin,
  type LogoStatus,
} from "@/lib/logo";

const fileCache = new Map<string, { designMd: string; tokensCss: string }>();
const swatchCache = new Map<string, string[] | null>();

/** First three paint colors out of a tokens.css file, for card dots. */
function extractSwatches(tokensCss: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const pattern = /--(?:accent|bg|surface|fg|primary|background)\s*:\s*([^;\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tokensCss)) !== null && found.length < 4) {
    const value = match[1].trim();
    if (!/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()|(white|black)/i.test(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(value);
  }
  return found;
}

/** Palette dots for one template card, loaded once then cached. */
function TemplateSwatches({ id }: { id: string }) {
  const [swatches, setSwatches] = useState<string[] | null | undefined>(() =>
    swatchCache.has(id) ? (swatchCache.get(id) ?? null) : undefined,
  );
  useEffect(() => {
    // The initializer above already read a warm cache; this only fetches
    // on a cold one.
    if (swatchCache.has(id)) return;
    let live = true;
    fetch(`/design-systems/${id}/tokens.css`)
      .then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.text();
      })
      .then((css) => {
        const dots = extractSwatches(css);
        swatchCache.set(id, dots);
        if (live) setSwatches(dots);
      })
      .catch(() => {
        swatchCache.set(id, null);
        if (live) setSwatches(null);
      });
    return () => {
      live = false;
    };
  }, [id]);
  if (!swatches || swatches.length === 0) return null;
  return (
    <span aria-hidden className="mt-2 flex items-center gap-1">
      {swatches.slice(0, 4).map((color, index) => (
        <span
          key={index}
          className="size-3.5 rounded-full border border-white/25"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

async function loadTemplateFiles(id: string) {
  const hit = fileCache.get(id);
  if (hit) return hit;
  const [designMd, tokensCss] = await Promise.all([
    fetch(`/design-systems/${id}/DESIGN.md`).then((res) => {
      if (!res.ok) throw new Error("missing");
      return res.text();
    }),
    fetch(`/design-systems/${id}/tokens.css`).then((res) => {
      if (!res.ok) throw new Error("missing");
      return res.text();
    }),
  ]);
  const value = { designMd, tokensCss };
  fileCache.set(id, value);
  return value;
}

interface DesignSetupStepProps {
  projectName: string;
  design: DesignSystemRef | null;
  onDesign: (next: DesignSystemRef | null) => void;
  logoUrl: string | null;
  logoOrigin: LogoOrigin;
  logoStatus: LogoStatus;
  logoError: string;
  logoBgNote: string;
  onGenerateLogo: () => void;
  onUploadLogo: (file: File | undefined) => void;
  logoHistory: string[];
  onRestoreLogo: (url: string) => void;
}

export default function DesignSetupStep({
  projectName,
  design,
  onDesign,
  logoUrl,
  logoOrigin,
  logoStatus,
  logoError,
  logoBgNote,
  onGenerateLogo,
  onUploadLogo,
  logoHistory,
  onRestoreLogo,
}: DesignSetupStepProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [showMd, setShowMd] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const entry of DESIGN_SYSTEMS) {
      if (entry.category) set.add(entry.category);
    }
    return ["All", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DESIGN_SYSTEMS.filter((entry) => {
      if (category !== "All" && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q)
      );
    }).slice(0, 60);
  }, [query, category]);

  const applyTemplate = async (entry: DesignSystemEntry) => {
    setLoadingId(entry.id);
    try {
      const files = await loadTemplateFiles(entry.id);
      onDesign({
        id: entry.id,
        name: entry.name,
        designMd: files.designMd,
        tokensCss: files.tokensCss,
        source: "template",
      });
    } catch {
      onDesign({
        id: entry.id,
        name: entry.name,
        designMd: DEFAULT_DESIGN_MD,
        tokensCss: DEFAULT_TOKENS_CSS,
        source: "template",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const previewEntry = previewId
    ? (DESIGN_SYSTEMS.find((entry) => entry.id === previewId) ?? null)
    : null;

  const selectedLabel = design
    ? `${design.name} · ${design.source === "template" ? "template" : design.source === "link" ? "from link" : "uploaded"}`
    : "Minimal · template";

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>Set the look</Heading>
        <Text type="supporting" color="secondary">
          Pick a design system template and preview it. The canvas renders
          this system first, before any app page.
        </Text>
      </VStack>

      <VStack gap={2}>
        <Heading level={3}>Templates</Heading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <div className="min-w-0">
            <TextInput
              label="Search styles"
              value={query}
              onChange={setQuery}
              placeholder="linear, playful, editorial…"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="mb-1 block text-[13px] font-medium" htmlFor="ds-category">
              Category
            </label>
            <select
              id="ds-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#17181d] px-3 text-[14px] text-[#f5f6f8] [color-scheme:dark] md:h-10">
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          role="listbox"
          aria-label="Design system templates"
          className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map((entry) => {
            const selected = design?.id === entry.id && design.source === "template";
            const busy = loadingId === entry.id;
            return (
              <div
                key={entry.id}
                role="option"
                tabIndex={0}
                aria-selected={selected}
                aria-label={`${entry.name}${selected ? ", selected" : ""}. Activate to use this style.`}
                onClick={() => {
                  if (!selected && !busy) void applyTemplate(entry);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  if ((event.target as HTMLElement).closest("button")) return;
                  event.preventDefault();
                  if (!selected && !busy) void applyTemplate(entry);
                }}
                className={`flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] ${
                  selected
                    ? "border-[#8ab4ff]/60 bg-[#8ab4ff]/[0.08]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                }`}>
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#f5f6f8]">
                    {entry.name}
                  </span>
                  {selected && (
                    <span
                      aria-hidden
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#8ab4ff] text-[10px] font-bold text-[#0b0c10]">
                      ✓
                    </span>
                  )}
                </span>
                {!!entry.category && (
                  <span className="mt-0.5 truncate text-[11px] text-[#9aa0ae]">{entry.category}</span>
                )}
                <TemplateSwatches id={entry.id} />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewId(entry.id);
                  }}
                  className="mt-2 min-h-9 w-full rounded-xl bg-white text-[12px] font-medium text-[#0b0c10] transition-colors hover:bg-white/90">
                  {busy ? "Loading…" : selected ? "Preview · in use" : "Preview"}
                </button>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <Text type="supporting" color="secondary">
            No template matches that search. Try another word.
          </Text>
        )}
      </VStack>

      <VStack gap={2}>
        <Text type="label">Chosen system: {selectedLabel}</Text>
        {design && (
          <HStack gap={2}>
            <Button
              label={showMd ? "Hide DESIGN.md" : "Show DESIGN.md"}
              variant="ghost"
              size="sm"
              className="min-h-11 md:min-h-0"
              onClick={() => setShowMd((current) => !current)}
            />
          </HStack>
        )}
        {design && showMd && (
          <div className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Markdown text={design.designMd} />
          </div>
        )}
      </VStack>

      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Heading level={3}>Logo mark (optional)</Heading>
          <span className="rounded-full border border-[#8ab4ff]/30 bg-[#8ab4ff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#a9c8ff]">
            Beta
          </span>
        </HStack>
        <Text type="supporting" color="secondary">
          Generate a symbol mark automatically from your project details. The
          project name stays separate as text. You can change the mark later,
          or skip and keep your initials.
        </Text>
        <HStack gap={4} vAlign="center">
          <button
            type="button"
            onClick={() => setLogoPickerOpen(true)}
            title="Choose from generated marks"
            aria-label="Choose from generated marks"
            aria-haspopup="dialog"
            className="group relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo mark for ${projectName.trim() || "the new project"}`}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-2xl bg-white object-contain p-1 ring-1 ring-transparent transition group-hover:ring-white/30"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white/10 text-[24px] font-semibold text-[#c9cdd6] ring-1 ring-transparent transition group-hover:ring-white/30">
                {initials(projectName.trim() || "?")}
              </span>
            )}
            <span
              aria-hidden
              className="absolute inset-x-0 -bottom-1 mx-auto w-max rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              Change
            </span>
          </button>
          <VStack gap={1}>
            <Text type="label">
              {logoUrl
                ? logoOrigin === "ai"
                  ? "Symbol mark from your direction"
                  : logoOrigin === "upload"
                    ? "Uploaded by you"
                    : "Saved mark, source unknown"
                : "Initials for now"}
            </Text>
            <Text type="supporting" color="secondary">
              {logoBgNote ||
                (logoUrl
                  ? "This is the mark stored on the project. Generate again to replace it, or click the mark to restore an earlier one."
                  : "Generate a mark automatically, or skip and keep your initials.")}
            </Text>
          </VStack>
        </HStack>

        <Button
          label={logoStatus === "loading" ? "Generating…" : "Generate"}
          variant="primary"
          className="min-h-11 self-start md:min-h-0"
          isDisabled={logoStatus === "loading"}
          onClick={onGenerateLogo}
        />

        {logoHistory.length > 0 && (
          <VStack gap={2}>
            <Text type="label">Previous marks ({logoHistory.length})</Text>
            <div className="flex flex-wrap gap-2">
              {logoHistory.map((url, index) => (
                <button
                  key={`${index}-${url.slice(-24)}`}
                  type="button"
                  onClick={() => onRestoreLogo(url)}
                  title="Bring this mark back"
                  aria-label={`Bring back previous mark ${index + 1}`}
                  className="overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-white/30">
                  <img
                    src={url}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 bg-white/[0.04] object-contain [color-scheme:dark]"
                  />
                </button>
              ))}
            </div>
            <Text type="supporting" color="secondary">
              Generating or uploading a new mark stashes the current one here. Click any to bring it back.
            </Text>
          </VStack>
        )}

        {logoStatus === "loading" && (
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <Spinner size="md" />
            <Text type="supporting" color="secondary">
              Generating your logo…
            </Text>
          </div>
        )}

        {logoError && (
          <Banner status="error" title="Logo unavailable" description={logoError} collapsible={false} />
        )}
      </VStack>

      {logoPickerOpen && (
        <LogoModal
          projectName={projectName}
          current={logoUrl}
          history={logoHistory}
          onPick={(url) => onRestoreLogo(url)}
          onUpload={(file) => onUploadLogo(file)}
          onClose={() => setLogoPickerOpen(false)}
        />
      )}

      {previewEntry && (
        <PreviewModal
          entry={previewEntry}
          onUse={() => {
            void applyTemplate(previewEntry).then(() => setPreviewId(null));
          }}
          onClose={() => setPreviewId(null)}
        />
      )}
    </VStack>
  );
}

function PreviewModal({
  entry,
  onUse,
  onClose,
}: {
  entry: DesignSystemEntry;
  onUse: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [tokens, setTokens] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadTemplateFiles(entry.id)
      .then((files) => {
        if (live) setTokens(files.tokensCss);
      })
      .catch(() => {
        if (live) setTokens(DEFAULT_TOKENS_CSS);
      });
    return () => {
      live = false;
    };
  }, [entry.id]);

  const pages = entry.previews.length
    ? entry.previews
    : [{ path: "", role: "sample", title: "Sample" }];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.name} preview`}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}>
      <div
        className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17181d] shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="shrink-0 border-b border-white/10 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[#f5f6f8]">{entry.name}</p>
              {!!entry.category && <p className="truncate text-[12px] text-[#9aa0ae]">{entry.category}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-[18px] text-[#9aa0ae] hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-full bg-white/5 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pages.map((page, index) => (
              <button
                key={`${page.path}-${index}`}
                type="button"
                onClick={() => setTab(index)}
                aria-pressed={tab === index}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  tab === index ? "bg-white text-[#0b0c10]" : "text-[#9aa0ae] hover:text-white"
                }`}>
                {page.title || page.role || `View ${index + 1}`}
              </button>
            ))}
            </div>
            <Button
              label="Use this style"
              variant="primary"
              size="sm"
              className="min-h-11 shrink-0 whitespace-nowrap md:min-h-0"
              onClick={onUse}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-white">
          {pages[Math.min(tab, pages.length - 1)].path ? (
            <iframe
              title={`${entry.name} ${pages[Math.min(tab, pages.length - 1)].title} preview`}
              src={`/design-systems/${entry.id}/${pages[Math.min(tab, pages.length - 1)].path}`}
              sandbox="allow-scripts"
              className="h-[60dvh] w-full"
            />
          ) : (
            <iframe
              title={`${entry.name} sample preview`}
              srcDoc={buildSamplePreviewHtml(tokens ?? DEFAULT_TOKENS_CSS, "Your app")}
              sandbox="allow-scripts"
              className="h-[60dvh] w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
