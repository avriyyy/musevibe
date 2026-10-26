"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PHRASES = [
  "A habit tracker that never guilt-trips",
  "A portfolio site for a freelance designer",
  "An invoice tracker for solo founders",
  "A Discord bot for async standups",
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (idea || focused) return;
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
  }, [idea, focused]);

  const submit = () => {
    if (!idea.trim()) return;
    setIdea("");
    fileRef.current && (fileRef.current.value = "");
  };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    setIdea((prev) => (prev ? prev + "\n\n" : "") + `--- ${f.name} ---\n` + text.slice(0, 2000));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0c10] text-[#f5f6f8]">
      <header className="px-5 py-3">
        <Link href="/" className="text-[15px] font-bold tracking-tight">
          MuseVibe
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-24">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight text-center">
          MuseVibe, what are we building?
        </h1>

        <div className="w-full max-w-[680px] mt-8 rounded-2xl border border-white/10 bg-[#17181d] shadow-2xl transition-colors focus-within:border-white/25">
          <textarea
            id="idea"
            aria-label="Describe your project idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder={idea || focused ? "" : `${typed}▍`}
            className="composer-scroll w-full bg-transparent px-5 pt-4 pb-2 text-[15px] placeholder:text-[#5b6472] focus:outline-none focus-visible:outline-none resize-none"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.markdown"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  attach(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Attach a text or markdown file to this idea"
                title="Attach a .txt or .md file"
                className="w-9 h-9 rounded-full bg-white/10 text-[20px] leading-none text-[#c9cdd6] hover:bg-white/15 hover:text-white"
              >
                +
              </button>
            </div>
            <button
              onClick={submit}
              disabled={!idea.trim()}
              aria-label="Create project from this idea"
              className="w-9 h-9 rounded-full bg-meta text-white text-[18px] leading-none hover:bg-meta-hover active:bg-meta-pressed disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
