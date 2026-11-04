"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChatComposer,
  ChatComposerInput,
  type ChatComposerInputHandle,
} from "@astryxdesign/core/Chat";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { CheckIcon, LockClosedIcon, PlusIcon } from "@heroicons/react/24/outline";
import { createDraftProject } from "@/lib/draft";
import { blobToWav } from "@/lib/audio";
import {
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  type AiModelOption,
} from "@/lib/models";
import { authFetch } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

const PHRASES = [
  "A habit tracker that never guilt-trips",
  "A portfolio site for a freelance designer",
  "An invoice tracker for solo founders",
  "A Discord bot for async standups",
];

const PLACEHOLDER = "Describe your project idea…";

type MicState = "idle" | "recording" | "transcribing";

export default function IdeaComposer({
  chips,
  seed,
}: {
  chips?: string[];
  seed?: { text: string; nonce: number };
}) {
  const router = useRouter();
  const auth = useAuthSession();
  const [idea, setIdea] = useState("");
  const [typed, setTyped] = useState("");
  const [models, setModels] = useState<AiModelOption[]>(FALLBACK_MODELS);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<ChatComposerInputHandle>(null);
  const modelTouchedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // The closing CTA prefills this composer.
  const seedNonce = seed?.nonce ?? 0;
  const seedText = seed?.text ?? "";
  useEffect(() => {
    if (seedNonce === 0) return;
    const frame = requestAnimationFrame(() => {
      if (seedText.trim()) setIdea(seedText);
      composerRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [seedNonce, seedText]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await authFetch("/api/ai/models");
        if (!response.ok) return;
        const data = (await response.json()) as {
          models?: AiModelOption[];
          default?: string;
        };
        if (!alive) return;
        const list =
          Array.isArray(data.models) && data.models.length
            ? data.models
            : FALLBACK_MODELS;
        setModels(list);
        const fallback =
          typeof data.default === "string" &&
          list.some((entry) => entry.id === data.default)
            ? data.default
            : list[0].id;
        if (modelTouchedRef.current) return;
        let saved = "";
        try {
          saved = window.localStorage.getItem("musevibe:model") ?? "";
        } catch {
          // Private mode can block storage; the discovered default still wins.
        }
        const usable = (id: string) =>
          list.some((entry) => entry.id === id && !entry.locked);
        setModel(usable(saved) ? saved : fallback);
      } catch {
        // Signed out, or the curated list is already on screen.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (idea) return;
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = PHRASES[phrase];
      if (!deleting) {
        char += 1;
        setTyped(current.slice(0, char));
        if (char >= current.length) {
          deleting = true;
          timer = setTimeout(tick, 1400);
          return;
        }
        timer = setTimeout(tick, 45);
      } else {
        char -= 1;
        setTyped(current.slice(0, char));
        if (char <= 0) {
          deleting = false;
          phrase = (phrase + 1) % PHRASES.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 20);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [idea]);

  const submitInFlight = useRef(false);
  const [naming, setNaming] = useState(false);
  const [namingStage, setNamingStage] = useState(0);
  const [createError, setCreateError] = useState("");

  // While the model names the project the screen shows a modal dialog, so
  // the wait is visible from the first frame. The second stage only describes
  // the handoff to the wizard; nothing is reported as done before it happens.
  useEffect(() => {
    if (!naming) return;
    const timer = setTimeout(() => setNamingStage(1), 4000);
    return () => clearTimeout(timer);
  }, [naming]);

  const pickModel = (id: string) => {
    if (models.some((entry) => entry.id === id && entry.locked)) return;
    modelTouchedRef.current = true;
    setModel(id);
    try {
      window.localStorage.setItem("musevibe:model", id);
    } catch {
      // Storage can be blocked; the choice still applies to this session.
    }
  };

  const transcribeClip = async (mimeType: string) => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
    if (blob.size < 1200) {
      setMicError("Too short. Hold the mic and speak.");
      setMicState("idle");
      return;
    }

    setMicError("");
    setMicState("transcribing");
    try {
      const wav = await blobToWav(blob);
      const body = new FormData();
      body.append("audio", wav, "prompt.wav");
      const response = await authFetch("/api/ai/transcribe", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as {
        transcript?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Transcription failed.",
        );
      }
      const transcript =
        typeof data.transcript === "string" ? data.transcript.trim() : "";
      if (!transcript) {
        setMicError("Nothing heard. Try again.");
        return;
      }
      setIdea((previous) =>
        previous.trim() ? `${previous.trimEnd()} ${transcript}` : transcript,
      );
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : "Could not transcribe. Try again.",
      );
    } finally {
      setMicState("idle");
    }
  };

  const toggleMic = async () => {
    if (micState === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (micState === "transcribing" || naming) return;

    setMicError("");
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMicError("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        void transcribeClip(recorder.mimeType);
      };
      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      setMicState("recording");
    } catch {
      setMicError("Microphone blocked. Allow access in the browser.");
    }
  };

  const stashAndSignIn = (text: string) => {
    try {
      window.sessionStorage.setItem("musevibe:pending-idea", text);
    } catch {
      // Private mode can block storage; the visitor retypes after sign-in.
    }
    router.push(`/sign-in?${new URLSearchParams({ next: "/" })}`);
  };

  // Restore an idea stashed before the sign-in wall, after hydration.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const pending = window.sessionStorage.getItem("musevibe:pending-idea");
        if (pending?.trim()) {
          window.sessionStorage.removeItem("musevibe:pending-idea");
          setIdea(pending);
        }
      } catch {
        // Storage can be blocked; the composer simply starts empty.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const submit = async () => {
    const text = idea.trim();
    if (!text || submitInFlight.current) return;
    if (auth.ready && !auth.user) {
      stashAndSignIn(text);
      return;
    }
    submitInFlight.current = true;
    setCreateError("");
    setNamingStage(0);
    setNaming(true);

    let id = "";
    try {
      id = await createDraftProject(text, model);
    } catch (error) {
      setNaming(false);
      submitInFlight.current = false;
      const message =
        error instanceof Error
          ? error.message
          : "Could not create the project. Check your connection and try again.";
      // The session may have expired mid-flight; keep the idea and sign in again.
      if (message.includes("Sign in")) {
        stashAndSignIn(text);
        return;
      }
      setCreateError(message);
      return;
    }

    setIdea("");
    if (fileRef.current) fileRef.current.value = "";
    setNaming(false);
    submitInFlight.current = false;
    router.push(`/form-wizard?id=${id}`);
  };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.((txt)|(md)|(markdown))$/i.test(f.name)) return;
    const text = await f.text();
    setIdea((prev) => (prev ? prev + "\n\n" : "") + `--- ${f.name} ---\n` + text.slice(0, 2000));
  };

  const activeModel = models.find((entry) => entry.id === model) ?? models[0];
  const statusMessage = createError || micError;

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          void attach(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <ChatComposer
        value={idea}
        onChange={(value) => {
          setIdea(value);
          if (createError) setCreateError("");
          if (micError) setMicError("");
        }}
        onSubmit={() => void submit()}
        placeholder={idea ? PLACEHOLDER : typed ? `${typed}▍` : PLACEHOLDER}
        isDisabled={naming}
        input={
          <ChatComposerInput
            handleRef={composerRef}
            onFiles={(files) => void attach(files[0])}
          />
        }
        headerActions={
          <IconButton
            label="Attach a text or markdown file to this idea"
            icon={<Icon icon={PlusIcon} size="sm" />}
            variant="ghost"
            size="sm"
            isDisabled={naming}
            onClick={() => fileRef.current?.click()}
          />
        }
        footerActions={
          <DropdownMenu
            button={{
              label: activeModel?.label ?? "Model",
              variant: "ghost",
              size: "sm",
            }}
            menuWidth={288}
            items={models.map((entry) => ({
              label: entry.label,
              description: entry.hint,
              onClick: entry.locked ? undefined : () => pickModel(entry.id),
              isDisabled: entry.locked,
              endContent: entry.locked ? (
                <Icon icon={LockClosedIcon} size="sm" />
              ) : entry.id === model ? (
                <Icon icon={CheckIcon} size="sm" color="accent" />
              ) : undefined,
            }))}
          />
        }
        sendActions={
          <IconButton
            label={
              micState === "recording"
                ? "Stop recording and transcribe"
                : micState === "transcribing"
                  ? "Transcribing your recording"
                  : auth.user
                    ? "Dictate your idea with the microphone"
                    : "Sign in to dictate your idea"
            }
            icon={
              <Icon
                icon={micState === "recording" ? "stop" : "microphone"}
                size="sm"
                color={micState === "recording" ? "error" : undefined}
              />
            }
            variant="ghost"
            size="sm"
            aria-pressed={micState === "recording"}
            isDisabled={micState === "transcribing" || !auth.user || naming}
            onClick={() => void toggleMic()}
          />
        }
        status={
          statusMessage
            ? { type: "error", message: statusMessage }
            : undefined
        }
      />

      {micState !== "idle" && !micError && (
        <Text type="supporting" as="p" justify="center">
          <span role="status">
            {micState === "recording"
              ? "Listening. Tap stop when you finish."
              : "Transcribing with Muse Voice."}
          </span>
        </Text>
      )}

      {chips && chips.length > 0 && !idea.trim() && (
        <div className="mt-4">
          <Grid columns={{ minWidth: 220, max: 3 }} gap={3}>
            {chips.map((chip) => (
              <ClickableCard
                key={chip}
                label={`Use example: ${chip}`}
                variant="default"
                padding={3}
                onClick={() => {
                  setIdea(chip);
                  if (createError) setCreateError("");
                }}
              >
                <Text type="body" as="p">
                  {chip}
                </Text>
              </ClickableCard>
            ))}
          </Grid>
        </div>
      )}

      <Dialog
        isOpen={naming}
        onOpenChange={() => {}}
        purpose="required"
        width={400}
      >
        <DialogHeader
          title="Creating your project"
          subtitle={
            namingStage === 0
              ? `Naming it with ${activeModel?.label ?? "Muse"}…`
              : "Opening the setup wizard…"
          }
        />
        <VStack hAlign="center" style={{ paddingBlock: 24 }}>
          <Spinner size="lg" />
        </VStack>
      </Dialog>
    </div>
  );
}
