"use client";

/**
 * The wizard's Design step: pick a design system, then make the mark.
 *
 * The system comes from a bundled template (with a live preview), an
 * uploaded design.md file, or a reference link the server fetches and the
 * model converts. Whatever the source, the wizard shows a rendered preview
 * before the project is finished, so the choice is seen, not guessed.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Banner } from "@astryxdesign/core/Banner";
import { DESIGN_SYSTEMS, type DesignSystemEntry } from "@/lib/design-systems-catalog";
import {
  DEFAULT_DESIGN_MD,
  DEFAULT_TOKENS_CSS,
  buildSamplePreviewHtml,
  type DesignSystemRef,
} from "@/lib/design-system";
import { initials, type LogoOrigin, type LogoStatus } from "@/lib/logo";

const fileCache = new Map<string, { designMd: string; tokensCss: string }>();

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
  idea: string;
  design: DesignSystemRef | null;
  onDesign: (next: DesignSystemRef | null) => void;
  logoUrl: string | null;
  logoOrigin: LogoOrigin;
  logoPrompt: string;
  onLogoPrompt: (value: string) => void;
  logoStatus: LogoStatus;
  logoError: string;
  logoBgNote: string;
  logoRemoveBg: boolean;
  onLogoRemoveBg: (value: boolean) => void;
  onGenerateLogo: () => void;
  onUploadLogo: (file: File | undefined) => void;
}

export default function DesignSetupStep({
  projectName,
  idea,
  design,
  onDesign,
  logoUrl,
  logoOrigin,
  logoPrompt,
  onLogoPrompt,
  logoStatus,
  logoError,
  logoBgNote,
  logoRemoveBg,
  onLogoRemoveBg,
  onGenerateLogo,
  onUploadLogo,
}: DesignSetupStepProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "loading" | "error">("idle");
  const [linkError, setLinkError] = useState("");
  const [draftMd, setDraftMd] = useState("");
  const [showMd, setShowMd] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);

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

  const convertLink = async () => {
    const url = linkUrl.trim();
    if (!url || linkStatus === "loading") return;
    setLinkStatus("loading");
    setLinkError("");
    try {
      const response = await fetch("/api/design/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, projectName, idea }),
      });
      const data = (await response.json()) as {
        name?: unknown;
        designMd?: unknown;
        tokensCss?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "The link could not be converted.",
        );
      }
      const converted: DesignSystemRef = {
        id: "custom",
        name: typeof data.name === "string" && data.name ? data.name : "Linked reference",
        designMd: typeof data.designMd === "string" ? data.designMd : DEFAULT_DESIGN_MD,
        tokensCss: typeof data.tokensCss === "string" && data.tokensCss ? data.tokensCss : DEFAULT_TOKENS_CSS,
        source: "link",
        refUrl: url,
      };
      setDraftMd(converted.designMd);
      onDesign(converted);
    } catch (error) {
      setLinkStatus("error");
      setLinkError(error instanceof Error ? error.message : "The link could not be converted.");
      return;
    }
    setLinkStatus("idle");
  };

  const uploadMd = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (text.trim().length < 50) {
      setLinkStatus("error");
      setLinkError("That file is too short to be a design system. Paste fuller DESIGN.md content.");
      return;
    }
    const css = text.match(/```css\s*\n?([\s\S]*?)```/i)?.[1]?.trim() ?? "";
    onDesign({
      id: "custom",
      name: file.name.replace(/\.md$/i, "") || "Uploaded system",
      designMd: text.slice(0, 12000),
      tokensCss: css || DEFAULT_TOKENS_CSS,
      source: "upload",
    });
    setDraftMd(text.slice(0, 12000));
  };

  const previewSrcDoc =
    design && (design.source === "upload" || design.source === "link" || design.source === "template")
      ? buildSamplePreviewHtml(design.tokensCss || DEFAULT_TOKENS_CSS, projectName)
      : null;

  const selectedLabel = design
    ? `${design.name} · ${design.source === "template" ? "template" : design.source === "link" ? "from link" : "uploaded"}`
    : "Minimal · template";

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>Set the look</Heading>
        <Text type="supporting" color="secondary">
          Pick a design system template and preview it, upload your own
          design.md, or paste a reference link to convert. The canvas renders
          this system first, before any app page.
        </Text>
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
          <pre className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-[12px] leading-5 text-[#c9cdd6] whitespace-pre-wrap">
            {design.designMd.slice(0, 4000)}
          </pre>
        )}
      </VStack>

      <VStack gap={2}>
        <Heading level={3}>Templates</Heading>
        <HStack gap={3}>
          <div className="min-w-0 flex-1">
            <TextInput
              label="Search styles"
              value={query}
              onChange={setQuery}
              placeholder="linear, playful, editorial…"
            />
          </div>
          <div className="w-44 shrink-0">
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
        </HStack>
        <div
          role="listbox"
          aria-label="Design system templates"
          className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map((entry) => {
            const selected = design?.id === entry.id && design.source === "template";
            return (
              <div
                key={entry.id}
                role="option"
                aria-selected={selected}
                className={`flex flex-col rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? "border-[#8ab4ff]/60 bg-[#8ab4ff]/[0.08]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25"
                }`}>
                <span className="truncate text-[13px] font-semibold text-[#f5f6f8]">{entry.name}</span>
                {!!entry.category && (
                  <span className="truncate text-[11px] text-[#9aa0ae]">{entry.category}</span>
                )}
                <span className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewId(entry.id)}
                    className="min-h-11 rounded-lg px-2 text-[12px] font-medium text-[#9aa0ae] underline hover:text-white md:min-h-0">
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={loadingId === entry.id || selected}
                    onClick={() => void applyTemplate(entry)}
                    className={`min-h-11 rounded-lg px-3 text-[12px] font-medium disabled:opacity-50 md:min-h-0 ${
                      selected
                        ? "border border-[#8ab4ff]/50 text-[#8ab4ff]"
                        : "bg-white text-[#0b0c10] hover:bg-white/90"
                    }`}>
                    {loadingId === entry.id ? "Loading…" : selected ? "✓ Selected" : "Use"}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <Text type="supporting" color="secondary">
            No template matches that search. Try another word, or upload your own file below.
          </Text>
        )}
      </VStack>

      <VStack gap={2}>
        <Heading level={3}>Or bring your own</Heading>
        <HStack gap={3}>
          <div className="min-w-0 flex-1">
            <TextInput
              label="Reference link"
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="https://example.com/design-guidelines"
              description="A visible page with real text, converted into DESIGN.md plus tokens."
            />
          </div>
          <div className="pt-6">
            <Button
              label={linkStatus === "loading" ? "Converting…" : "Convert link"}
              variant="secondary"
              className="min-h-11 md:min-h-0"
              isDisabled={!linkUrl.trim() || linkStatus === "loading"}
              onClick={() => void convertLink()}
            />
          </div>
        </HStack>
        {linkStatus === "error" && (
          <Banner status="error" title="Link not converted" description={linkError} collapsible={false} />
        )}
        <HStack gap={3} vAlign="center">
          <Button
            label="Upload design.md"
            variant="secondary"
            className="min-h-11 md:min-h-0"
            onClick={() => mdFileRef.current?.click()}
          />
          <input
            ref={mdFileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            aria-label="Upload a design.md file"
            onChange={(event) => {
              void uploadMd(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Text type="supporting" color="secondary">
            A DESIGN.md file from your own system. A fenced css block becomes the tokens.
          </Text>
        </HStack>
        {(design?.source === "upload" || design?.source === "link") && (
          <TextArea
            label="DESIGN.md content (editable)"
            rows={5}
            value={draftMd}
            onChange={(next) => {
              setDraftMd(next);
              if (design) onDesign({ ...design, designMd: next });
            }}
            description="Tune the converted text before finishing. The preview below follows it."
          />
        )}
      </VStack>

      {previewSrcDoc && (
        <VStack gap={2}>
          <Heading level={3}>Preview</Heading>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <iframe
              title={`${design?.name ?? "Design system"} preview`}
              srcDoc={previewSrcDoc}
              sandbox="allow-scripts"
              className="h-72 w-full bg-white"
            />
          </div>
          <Text type="supporting" color="secondary">
            Rendered from the token block. The full template preview with real
            components is one click away on any template card.
          </Text>
        </VStack>
      )}

      <VStack gap={2}>
        <Heading level={3}>Give it a mark</Heading>
        <Text type="supporting" color="secondary">
          Describe the logo and let the image model draw it, or upload your
          own. Skip to keep your initials as the mark.
        </Text>
        <HStack gap={4} vAlign="center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo for ${projectName.trim() || "the new project"}`}
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[24px] font-semibold text-[#c9cdd6]">
              {initials(projectName.trim() || "?")}
            </div>
          )}
          <VStack gap={1}>
            <Text type="label">
              {logoUrl
                ? logoOrigin === "ai"
                  ? "Drawn from your description"
                  : "Uploaded by you"
                : "Initials for now"}
            </Text>
            <Text type="supporting" color="secondary">
              {logoBgNote ||
                (logoUrl
                  ? "This is the mark stored on the project."
                  : "Generate or upload to replace it. Skipping is fine.")}
            </Text>
          </VStack>
        </HStack>

        <TextArea
          label="Describe the logo"
          rows={3}
          value={logoPrompt}
          onChange={onLogoPrompt}
          placeholder="A calm circle with a small sprout, deep green on transparent"
          description="One or two sentences: motif, colors, mood. Flat and minimal reads best at small sizes."
        />

        <HStack gap={3} vAlign="center">
          <Button
            label={logoStatus === "loading" ? "Drawing…" : "Generate logo"}
            variant="primary"
            className="min-h-11 md:min-h-0"
            isDisabled={!logoPrompt.trim() || logoStatus === "loading"}
            onClick={onGenerateLogo}
          />
          <Button
            label="Upload"
            variant="secondary"
            className="min-h-11 md:min-h-0"
            onClick={() => logoFileRef.current?.click()}
          />
          <input
            ref={logoFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            aria-label="Upload your own logo"
            onChange={(event) => {
              onUploadLogo(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </HStack>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 md:min-h-0">
          <input
            type="checkbox"
            checked={logoRemoveBg}
            onChange={(event) => onLogoRemoveBg(event.target.checked)}
            className="size-4 accent-black"
          />
          <span className="text-[14px] text-[#f5f6f8]">
            Remove background
            <span className="block text-[12px] text-[#9aa0ae]">
              On: the solid field behind the mark is cut so the logo sits clean on any surface.
            </span>
          </span>
        </label>

        {logoStatus === "loading" && (
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <Spinner size="md" />
            <Text type="supporting" color="secondary">
              Drawing your logo…
            </Text>
          </div>
        )}

        {logoError && (
          <Banner status="error" title="Logo unavailable" description={logoError} collapsible={false} />
        )}
      </VStack>

      {previewEntry && (
        <PreviewModal
          entry={previewEntry}
          projectName={projectName}
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
  projectName,
  onUse,
  onClose,
}: {
  entry: DesignSystemEntry;
  projectName: string;
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
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#f5f6f8]">{entry.name}</p>
            {!!entry.category && <p className="truncate text-[12px] text-[#9aa0ae]">{entry.category}</p>}
          </div>
          <div className="flex gap-1 rounded-full bg-white/5 p-1">
            {pages.map((page, index) => (
              <button
                key={`${page.path}-${index}`}
                type="button"
                onClick={() => setTab(index)}
                aria-pressed={tab === index}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  tab === index ? "bg-white text-[#0b0c10]" : "text-[#9aa0ae] hover:text-white"
                }`}>
                {page.title || page.role || `View ${index + 1}`}
              </button>
            ))}
          </div>
          <Button label="Use this style" variant="primary" size="sm" className="min-h-11 md:min-h-0" onClick={onUse} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex size-9 items-center justify-center rounded-full text-[18px] text-[#9aa0ae] hover:bg-white/10 hover:text-white">
            ×
          </button>
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
              srcDoc={buildSamplePreviewHtml(tokens ?? DEFAULT_TOKENS_CSS, projectName)}
              sandbox="allow-scripts"
              className="h-[60dvh] w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
