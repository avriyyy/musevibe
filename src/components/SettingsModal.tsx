"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuChipIcon,
  CreditCardIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Spinner } from "@astryxdesign/core/Spinner";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { useCreditBalance } from "@/components/CreditBalance";
import {
  FALLBACK_MODELS,
  DEFAULT_MODEL,
  LOCKED_MODEL_MESSAGE,
  isModelAllowed,
  modelHint,
  type AiModelOption,
} from "@/lib/models";
import { canAffordProject } from "@/lib/credits";
import { safeReturnTo } from "@/lib/auth-routes";
import { authFetch, supabaseBrowser } from "@/lib/supabase/client";
import { authRedirectUrl } from "@/lib/supabase/redirect-url";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { useCloudSyncStatus } from "@/lib/supabase/sync";
import { useVibe } from "@/lib/store";

type SectionId = "profile" | "credits" | "sync" | "model";

const SECTIONS: Array<{ id: SectionId; label: string; description: string; icon: typeof UserCircleIcon }> = [
  { id: "profile", label: "Profile", description: "Name and account identity", icon: UserCircleIcon },
  { id: "credits", label: "Credits", description: "Daily allowance and usage", icon: CreditCardIcon },
  { id: "sync", label: "Sync", description: "Cloud backup status", icon: ArrowPathIcon },
  { id: "model", label: "Model", description: "Default AI model", icon: CpuChipIcon },
];

function resolveSection(value: string | null): SectionId {
  return SECTIONS.some((entry) => entry.id === value) ? (value as SectionId) : "profile";
}

function profileNameOf(user: { user_metadata?: Record<string, unknown> }): string {
  const name = user.user_metadata?.full_name;
  return typeof name === "string" ? name : "";
}

function formatJoined(createdAt: string): string {
  const parsed = Date.parse(createdAt);
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(parsed);
}

export default function SettingsModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWide = useMediaQuery("(min-width: 720px)");
  const [section, setSection] = useState<SectionId>(() => resolveSection(searchParams.get("section")));
  const [mobileSection, setMobileSection] = useState<SectionId | null>(() =>
    searchParams.get("section") ? resolveSection(searchParams.get("section")) : null,
  );
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const close = () => {
    const returnTo = searchParams.get("returnTo");
    router.push(returnTo ? safeReturnTo(returnTo) : "/projects");
  };
  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await supabaseBrowser().auth.signOut({ scope: "local" });
      if (error) throw error;
      router.push("/");
    } catch {
      setSignOutError("We could not sign out. Please try again.");
      setSigningOut(false);
    }
  };

  const visibleSections = query.trim()
    ? SECTIONS.filter((entry) => `${entry.label} ${entry.description}`.toLowerCase().includes(query.trim().toLowerCase()))
    : SECTIONS;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) close();
      }}
      purpose="form"
      width={880}
      maxHeight="min(640px, calc(100dvh - 2rem))"
      padding={0}
    >
      <Layout
        start={
          isWide ? (
            <SideNav
              header={<Heading level={1}>Settings</Heading>}
              footer={
                <Button
                  variant="secondary"
                  label="Close settings"
                  isIconOnly
                  icon={<Icon icon={XMarkIcon} size="sm" />}
                  onClick={close}
                />
              }
            >
              <SideNavSection title="Settings" isHeaderHidden>
                {SECTIONS.map((entry) => (
                  <SideNavItem
                    key={entry.id}
                    label={entry.label}
                    icon={<Icon icon={entry.icon} size="sm" color="primary" />}
                    isSelected={section === entry.id}
                    onClick={() => setSection(entry.id)}
                  />
                ))}
              </SideNavSection>
            </SideNav>
          ) : undefined
        }
        content={
          <LayoutContent isScrollable padding={5}>
            {isWide ? (
              <SectionPanel id={section} onNavigate={setSection} />
            ) : mobileSection === null ? (
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="center">
                  <Heading level={1}>Settings</Heading>
                  <Button
                    variant="secondary"
                    label="Close settings"
                    isIconOnly
                    icon={<Icon icon={XMarkIcon} size="sm" />}
                    onClick={close}
                  />
                </HStack>
                <TextInput label="Search settings" value={query} onChange={setQuery} />
                <VStack gap={2}>
                  {visibleSections.map((entry) => (
                    <Button
                      key={entry.id}
                      variant="secondary"
                      label={entry.label}
                      icon={<Icon icon={entry.icon} size="sm" color="primary" />}
                      endContent={<Icon icon={ChevronRightIcon} size="sm" />}
                      width="100%"
                      onClick={() => setMobileSection(entry.id)}
                    />
                  ))}
                  {visibleSections.length === 0 && (
                    <Text color="secondary">No settings match “{query.trim()}”.</Text>
                  )}
                </VStack>
              </VStack>
            ) : (
              <VStack gap={4}>
                <HStack hAlign="start" vAlign="center">
                  <Button
                    variant="secondary"
                    label="All settings"
                    icon={<Icon icon={ChevronLeftIcon} size="sm" />}
                    onClick={() => setMobileSection(null)}
                  />
                </HStack>
                <SectionPanel id={mobileSection} onNavigate={setMobileSection} />
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
            <Text color="secondary">This signs out this device only. Other sessions remain active.</Text>
            <VStack gap={1}>
              <Button
                variant="secondary"
                label={signingOut ? "Signing out…" : "Sign out"}
                icon={<Icon icon={ArrowRightOnRectangleIcon} size="sm" />}
                isDisabled={signingOut}
                onClick={() => void signOut()}
              />
              {signOutError && <Text color="secondary">{signOutError}</Text>}
            </VStack>
          </HStack>
        }
      />
    </Dialog>
  );
}

function SectionPanel({ id, onNavigate }: { id: SectionId; onNavigate: (next: SectionId) => void }) {
  switch (id) {
    case "profile":
      return <ProfilePanel onOpenSync={() => onNavigate("sync")} />;
    case "credits":
      return <CreditsPanel />;
    case "sync":
      return <SyncPanel />;
    case "model":
      return <ModelPanel />;
  }
}

function ProfilePanel({ onOpenSync }: { onOpenSync: () => void }) {
  const auth = useAuthSession();
  const [nameDraft, setNameDraft] = useState<{ userId: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  if (!auth.configured) {
    return <PanelFallback title="Profile unavailable" body="Supabase Auth is not configured in this deployment. A verified account is required to use MuseVibe." />;
  }
  if (!auth.ready) {
    return (
      <VStack gap={3}>
        <Heading level={2}>Profile</Heading>
        <Spinner label="Checking your account session…" />
      </VStack>
    );
  }
  if (!auth.user) {
    return <PanelFallback title="Sign-in required" body="A verified account is required to view your profile." />;
  }

  const user = auth.user;
  const name = nameDraft?.userId === user.id ? nameDraft.value : profileNameOf(user);
  const title = name.trim() || user.email || "MuseVibe member";

  const sendPasswordReset = async () => {
    if (!user.email) return;
    setResetBusy(true);
    setResetNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(user.email, {
        redirectTo: authRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      setResetNotice("Password reset link sent. Check your inbox to continue.");
    } catch {
      setResetNotice("We could not send the reset email. Please try again.");
    } finally {
      setResetBusy(false);
    }
  };

  const save = async () => {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (normalizedName.length > 80) {
      setNotice({ kind: "error", text: "Keep your display name to 80 characters or fewer." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({
        data: { ...user.user_metadata, full_name: normalizedName },
      });
      if (error) throw error;
      setNameDraft({ userId: user.id, value: normalizedName });
      setNotice({ kind: "success", text: "Your profile was updated." });
    } catch {
      setNotice({ kind: "error", text: "We could not save your profile. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center">
        <Avatar name={title} />
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          <Text color="secondary">{user.email ?? "Email unavailable"}</Text>
        </VStack>
      </HStack>
      <Divider />
      <VStack gap={2}>
        <TextInput
          label="Display name"
          value={name}
          onChange={(value) => setNameDraft({ userId: user.id, value })}
          isDisabled={busy}
        />
        <Text color="secondary">Stored as profile metadata for display only; workspace access is still checked server-side.</Text>
        {notice && <Text color="secondary">{notice.text}</Text>}
        <HStack hAlign="start">
          <Button
            variant="primary"
            label={busy ? "Saving…" : "Save profile"}
            isDisabled={busy}
            onClick={() => void save()}
          />
        </HStack>
      </VStack>
      <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Text>Password</Text>
          <Text color="secondary">Send a secure reset link to your account email.</Text>
        </VStack>
        <VStack gap={1}>
          <Button
            variant="secondary"
            label={resetBusy ? "Sending…" : "Send reset link"}
            isDisabled={resetBusy}
            onClick={() => void sendPasswordReset()}
          />
          {resetNotice && <Text color="secondary">{resetNotice}</Text>}
        </VStack>
      </HStack>
      <MetadataList title="Account details">
        <MetadataListItem label="Email">{user.email ?? "—"}</MetadataListItem>
        <MetadataListItem label="Member since">{formatJoined(user.created_at)}</MetadataListItem>
        <MetadataListItem label="Sign-in method">Email and password</MetadataListItem>
        <MetadataListItem label="Workspace storage">
          Account-owned workspaces sync to Neon. Existing browser data remains untouched and is not uploaded automatically.
        </MetadataListItem>
      </MetadataList>
      <HStack hAlign="start">
        <Button variant="secondary" label="Open sync status" onClick={onOpenSync} />
      </HStack>
    </VStack>
  );
}

function CreditsPanel() {
  const { state: credits, failed } = useCreditBalance();
  if (!credits) {
    if (failed) {
      return (
        <PanelFallback
          title="Credits unavailable"
          body="We could not load your credit balance. Check your connection, then reopen settings."
        />
      );
    }
    return (
      <VStack gap={3}>
        <Heading level={2}>Credits</Heading>
        <Spinner label="Loading credit balance…" />
      </VStack>
    );
  }
  const afford = canAffordProject(credits.balance);
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Credits</Heading>
        <Text color="secondary">New accounts receive {credits.daily} credits, resetting every day.</Text>
      </VStack>
      <HStack gap={3} vAlign="center">
        <Heading level={1}>{credits.balance}</Heading>
        <Text color="secondary">credit{credits.balance === 1 ? "" : "s"} available today</Text>
      </HStack>
      {!afford && (
        <Text color="secondary">
          Creating a project uses {credits.projectCost} credits. Your balance refills automatically — come back tomorrow to start a new project.
        </Text>
      )}
      <Divider />
      <MetadataList title="Allowance">
        <MetadataListItem label="Daily allowance">{credits.daily} credits</MetadataListItem>
        <MetadataListItem label="Cost per project">{credits.projectCost} credits, generation included</MetadataListItem>
        <MetadataListItem label="Resets">Daily (UTC)</MetadataListItem>
      </MetadataList>
    </VStack>
  );
}

function SyncPanel() {
  const auth = useAuthSession();
  const syncStatus = useCloudSyncStatus();
  const workspaceCount = useVibe((state) =>
    state.projects.filter((project) =>
      auth.user ? state.cloudOwnerByProject[project.id] === auth.user.id : false,
    ).length,
  );
  const meta: Record<string, { label: string; variant: "neutral" | "accent" | "success" | "error"; detail: string }> = {
    local: { label: "Waiting for connection", variant: "neutral", detail: "Link a workspace to your account to start the cloud backup." },
    syncing: { label: "Syncing", variant: "accent", detail: "Uploading your latest workspace changes…" },
    synced: { label: "Up to date", variant: "success", detail: "Your account workspaces are backed up in Neon." },
    error: { label: "Needs attention", variant: "error", detail: "We could not reach your cloud vault. The recovery copy on this device is unchanged." },
  };
  const current = meta[syncStatus] ?? meta.local;

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Workspace sync</Heading>
        <Text color="secondary">
          Account-owned workspaces are stored in Neon and checked against your Supabase account on the server. A recovery
          copy stays on this device and is not uploaded automatically if it is not linked to your account.
        </Text>
      </VStack>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <StatusDot variant={current.variant} label={current.label} />
        <Text>{current.label}</Text>
        <Text color="secondary">
          · {workspaceCount} account {workspaceCount === 1 ? "workspace" : "workspaces"}
        </Text>
      </HStack>
      <Text color="secondary">{current.detail}</Text>
      <HStack hAlign="start">
        <Link href="/projects">View projects</Link>
      </HStack>
    </VStack>
  );
}

function ModelPanel() {
  const [models, setModels] = useState<AiModelOption[]>(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [modelsReady, setModelsReady] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      let available = FALLBACK_MODELS;
      let fallback = DEFAULT_MODEL;
      try {
        const response = await authFetch("/api/ai/models", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { models?: AiModelOption[]; default?: string };
          if (Array.isArray(data.models) && data.models.length) available = data.models;
          if (typeof data.default === "string" && available.some((entry) => entry.id === data.default)) fallback = data.default;
        }
      } catch {
        // Built-in model choices remain available without a remote AI provider.
      }
      if (!active) return;
      setModels(available);
      let saved = "";
      try {
        saved = window.localStorage.getItem("musevibe:model") ?? "";
      } catch {
        // Local storage may be unavailable in private browsing.
      }
      const allowed = available.filter((entry) => isModelAllowed(entry.id));
      const resolved = available.some((entry) => entry.id === saved) && isModelAllowed(saved)
        ? saved
        : allowed.some((entry) => entry.id === fallback)
          ? fallback
          : (allowed[0]?.id ?? fallback);
      setSelectedModel(resolved);
      setModelsReady(true);
    };
    void loadModels();
    return () => {
      active = false;
    };
  }, []);

  if (!modelsReady) {
    return (
      <VStack gap={3}>
        <Heading level={2}>Default AI model</Heading>
        <Spinner label="Loading available models…" />
      </VStack>
    );
  }

  const selectModel = (value: string) => {
    if (!models.some((entry) => entry.id === value)) return;
    if (!isModelAllowed(value)) {
      setNotice({ kind: "error", text: LOCKED_MODEL_MESSAGE });
      return;
    }
    setSelectedModel(value);
    try {
      window.localStorage.setItem("musevibe:model", value);
      setNotice({ kind: "success", text: "Default model saved on this device." });
    } catch {
      setNotice({ kind: "error", text: "The model changed for this session but could not be saved in this browser." });
    }
  };

  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Default AI model</Heading>
        <Text color="secondary">
          Choose the chat model preselected in the New project composer. This preference is saved only in this browser.
        </Text>
      </VStack>
      <RadioList label="Model" value={selectedModel} onChange={selectModel}>
        {models.map((model) => {
          const locked = !isModelAllowed(model.id);
          return (
            <RadioListItem
              key={model.id}
              value={model.id}
              label={locked ? `${model.label} (locked)` : model.label}
              description={locked ? LOCKED_MODEL_MESSAGE : modelHint(model.id)}
              isDisabled={locked}
            />
          );
        })}
      </RadioList>
      {notice && <Text color="secondary">{notice.text}</Text>}
    </VStack>
  );
}

function PanelFallback({ title, body }: { title: string; body: string }) {
  return (
    <VStack gap={2}>
      <Heading level={2}>{title}</Heading>
      <Text color="secondary">{body}</Text>
    </VStack>
  );
}
