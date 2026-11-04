"use client";
import { useRef, useState, type CSSProperties } from "react";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Icon } from "@astryxdesign/core/Icon";
import { Stepper, Step } from "@astryxdesign/core/Stepper";
import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import AccountShortcut from "@/components/AccountShortcut";
import IdeaComposer from "@/components/IdeaComposer";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { BoardPanel, DocsPanel, PagesPanel, WizardFigure } from "./showcase";
import { useLandingReveal } from "./reveal";
import "./reveal.css";

const SHOWCASE_CHIPS = [
  "A habit tracker that never guilt-trips",
  "An invoice tracker for solo founders",
  "A portfolio site for a freelance designer",
];

const STEPS = [
  "Describe it in one sentence",
  "Answer the four-step setup",
  "Build together in one workspace",
];

const FAQS = [
  {
    q: "Do I need an account to try it?",
    a: "Yes. Create an account with an email and password, and every new account starts with 10 free credits a day. That builds one full project.",
  },
  {
    q: "Do I need my own AI key?",
    a: "No. Every step ships a local draft, and live generation runs on the included Muse Spark model.",
  },
  {
    q: "Where does my work live?",
    a: "Signed-in workspaces sync to your own Neon database, and every read and write is owner-scoped. A recovery copy stays on your device.",
  },
  {
    q: "What can it build?",
    a: "Small web apps. The workspace produces planning documents, a task board, page prototypes, and starter code that share one context.",
  },
  {
    q: "What does it cost?",
    a: "New accounts get 10 free credits a day, enough to build one full project. Generation runs on Muse Spark, no key needed.",
  },
];

function Band({
  id,
  labelledBy,
  width = 1120,
  children,
}: {
  id?: string;
  labelledBy?: string;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      style={{ paddingBlock: 96, scrollMarginTop: 72 }}
    >
      <Layout
        height="auto"
        contentWidth={width}
        content={<LayoutContent>{children}</LayoutContent>}
      />
    </section>
  );
}

const splitStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
  gap: 56,
  alignItems: "center",
};

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const auth = useAuthSession();
  const showNavLinks = useMediaQuery("(min-width: 720px)");
  const [ctaIdea, setCtaIdea] = useState("");
  const [seed, setSeed] = useState({ text: "", nonce: 0 });
  useLandingReveal(rootRef);

  const sendToComposer = () => {
    const text = ctaIdea.trim();
    if (!text) return;
    setSeed({ text, nonce: Date.now() });
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" ref={rootRef} className="bg-body text-primary">
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--color-background-body)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            marginInline: "auto",
            paddingInline: 24,
            height: 64,
            display: "flex",
            alignItems: "center",
          }}
        >
          <HStack gap={2} vAlign="center" hAlign="between" style={{ flex: 1 }}>
            <HStack gap={2} vAlign="center">
              <Icon icon={SparklesIcon} size="sm" color="accent" />
              <Link href="#top" color="primary" isStandalone weight="semibold">
                MuseVibe
              </Link>
            </HStack>
            {showNavLinks && (
              <HStack gap={5} vAlign="center">
                <Link href="#workspace" isStandalone>
                  Workspace
                </Link>
                <Link href="#process" isStandalone>
                  Process
                </Link>
                <Link href="#faq" isStandalone>
                  FAQ
                </Link>
              </HStack>
            )}
            <HStack gap={4} vAlign="center">
              {auth.user ? (
                <AccountShortcut />
              ) : (
                <Link href="/sign-in" isStandalone>
                  Sign in
                </Link>
              )}
              <Button
                label="Start building"
                variant="primary"
                size="sm"
                href="#start"
              />
            </HStack>
          </HStack>
        </div>
      </header>

      <main>
        <section
          aria-labelledby="hero-title"
          style={{
            paddingTop: 96,
            paddingBottom: 64,
          }}
        >
          <Layout
            height="auto"
            contentWidth={1120}
            content={
              <LayoutContent>
                <VStack gap={8}>
                  <div
                    style={{ maxWidth: 760, marginInline: "auto", width: "100%" }}
                  >
                    <VStack gap={6}>
                      <VStack gap={3} hAlign="center">
                        <Heading
                          level={1}
                          type="display-1"
                          justify="center"
                          textWrap="balance"
                          id="hero-title"
                        >
                          Type an idea, get a workspace.
                        </Heading>
                        <Text
                          type="large"
                          justify="center"
                          textWrap="balance"
                          as="p"
                        >
                          MuseVibe turns one sentence into a PRD, task board,
                          designs, and starter code that all read the same
                          context.
                        </Text>
                      </VStack>
                      <div
                        id="start"
                        data-ui
                        style={{ scrollMarginTop: 80 }}
                      >
                        <IdeaComposer chips={SHOWCASE_CHIPS} seed={seed} />
                      </div>
                      <Text type="body" color="secondary" justify="center" as="p">
                        Sign in to start building. New accounts get 10 free
                        credits, reset every day.
                      </Text>
                    </VStack>
                  </div>
                  <div data-reveal data-ui>
                    <DocsPanel />
                  </div>
                </VStack>
              </LayoutContent>
            }
          />
        </section>

        <section aria-label="What one project includes" style={{ paddingBlock: 48 }}>
          <Layout
            height="auto"
            contentWidth={1120}
            content={
              <LayoutContent>
                <div data-reveal>
                  <Text type="large" weight="medium" justify="center" as="p">
                    Six documents. Three views. One context.
                  </Text>
                </div>
              </LayoutContent>
            }
          />
        </section>

        <Band id="workspace" labelledBy="workspace-title">
          <VStack gap={10}>
            <div data-reveal style={splitStyle}>
              <VStack gap={3}>
                <Heading level={2} id="workspace-title">
                  A task board that matches the plan
                </Heading>
                <Text type="large" as="p">
                  Tasks are generated from the documents you just approved, so
                  the board never drifts from the spec. Drag them across as
                  the build moves.
                </Text>
              </VStack>
              <div data-ui>
                <BoardPanel />
              </div>
            </div>
            <div data-reveal style={splitStyle}>
              <div data-ui>
                <PagesPanel />
              </div>
              <VStack gap={3}>
                <Heading level={2} id="workspace-design-title">
                  Prototypes you can click
                </Heading>
                <Text type="large" as="p">
                  Page previews and starter code come from the same context.
                  Open them in the workspace, edit, and export.
                </Text>
              </VStack>
            </div>
          </VStack>
        </Band>

        <Band id="process" labelledBy="process-title">
          <VStack gap={6}>
            <div data-reveal>
              <VStack gap={3}>
                <Heading level={2} id="process-title">
                  Idea to workspace
                </Heading>
                <Text type="large" as="p">
                  A minute to describe it, five to set it up, then the
                  workspace carries the weight.
                </Text>
              </VStack>
            </div>
            <div data-reveal style={splitStyle} data-ui>
              <Stepper
                label="From idea to workspace"
                orientation="vertical"
                activeStep={STEPS.length}
              >
                {STEPS.map((step, index) => (
                  <Step key={step} step={index} label={step} />
                ))}
              </Stepper>
              <WizardFigure />
            </div>
          </VStack>
        </Band>

        <Band id="faq" labelledBy="faq-title" width={800}>
          <VStack gap={6}>
            <div data-reveal>
              <VStack gap={3}>
                <Heading level={2} id="faq-title">
                  Questions
                </Heading>
                <Text type="large" as="p">
                  The short version of everything judges ask.
                </Text>
              </VStack>
            </div>
            <div data-reveal>
              <CollapsibleGroup type="single" defaultValue={FAQS[0].q}>
                {FAQS.map((item) => (
                  <Collapsible
                    key={item.q}
                    value={item.q}
                    trigger={
                      <Text type="large" weight="medium">
                        {item.q}
                      </Text>
                    }
                  >
                    <Text type="large" as="p">
                      {item.a}
                    </Text>
                  </Collapsible>
                ))}
              </CollapsibleGroup>
            </div>
          </VStack>
        </Band>

        <Band labelledBy="cta-title">
          <div style={{ maxWidth: 760, marginInline: "auto", width: "100%" }}>
            <VStack gap={6} hAlign="center">
              <div data-reveal>
                <VStack gap={3} hAlign="center">
                  <Heading
                    level={2}
                    justify="center"
                    textWrap="balance"
                    id="cta-title"
                  >
                    Your idea becomes a workspace.
                  </Heading>
                  <Text type="large" justify="center" as="p">
                    Type a few words, and they land in the composer ready to
                    build.
                  </Text>
                </VStack>
              </div>
              <div data-reveal style={{ width: "100%", maxWidth: 560 }}>
                <VStack gap={3}>
                  <TextInput
                    label="Your idea"
                    placeholder="a habit tracker"
                    value={ctaIdea}
                    onChange={setCtaIdea}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendToComposer();
                    }}
                  />
                  <HStack gap={3} hAlign="center">
                    <Button
                      label="Start building"
                      variant="primary"
                      onClick={sendToComposer}
                      endContent={
                        <Icon icon={ArrowRightIcon} size="sm" color="inherit" />
                      }
                    />
                  </HStack>
                </VStack>
              </div>
              <div data-reveal>
                <Text type="body" color="secondary" justify="center" as="p">
                  {ctaIdea.trim()
                    ? "Sending your words to the composer."
                    : "Sign in, and the composer is ready at the top of this page."}
                </Text>
              </div>
            </VStack>
          </div>
        </Band>
      </main>

      <footer style={{ paddingBottom: 48 }}>
        <Layout
          height="auto"
          contentWidth={1120}
          content={
            <LayoutContent>
              <VStack gap={6}>
                <div data-reveal>
                  <Heading level={2} type="display-3">
                    MuseVibe
                  </Heading>
                </div>
                <HStack
                  gap={4}
                  vAlign="center"
                  hAlign="between"
                  style={{ flexWrap: "wrap" }}
                >
                  <Text type="body" weight="medium">
                    MuseVibe — from idea to code for indie devs.
                  </Text>
                  <HStack gap={5} vAlign="center" style={{ flexWrap: "wrap" }}>
                    <Link href="#workspace" isStandalone>
                      Workspace
                    </Link>
                    <Link href="#process" isStandalone>
                      Process
                    </Link>
                    <Link href="#faq" isStandalone>
                      FAQ
                    </Link>
                    <Link
                      href="https://github.com/avriyyy/musevibe"
                      isStandalone
                      isExternalLink
                    >
                      Source
                    </Link>
                    <Link href="/sign-in" isStandalone>
                      Sign in
                    </Link>
                  </HStack>
                </HStack>
                <HStack
                  gap={4}
                  vAlign="center"
                  hAlign="between"
                  style={{ flexWrap: "wrap" }}
                >
                  <Text type="body" color="secondary">
                    Built for a 10-day hackathon.
                  </Text>
                  <Text type="body" color="secondary">
                    MuseVibe, 2026
                  </Text>
                </HStack>
              </VStack>
            </LayoutContent>
          }
        />
      </footer>
    </div>
  );
}
