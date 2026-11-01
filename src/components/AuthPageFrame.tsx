import type { ReactNode } from "react";

export default function AuthPageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0b0c10] px-4 py-10 text-[#f5f6f8] sm:px-6">
      <div className="w-full max-w-md">
        <header className="mb-7 text-center">
          <span aria-hidden className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-meta text-[13px] font-bold text-white">MV</span>
          <p className="mt-3 text-[15px] font-semibold tracking-tight">MuseVibe</p>
        </header>
        {children}
      </div>
    </main>
  );
}
