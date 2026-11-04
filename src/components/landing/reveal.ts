import { useEffect, type RefObject } from "react";

// Entrance reveals, added from script only: without JS the page renders
// fully visible. Elements below the fold hide on mount, then rise once as
// they enter. Honors prefers-reduced-motion via reveal.css.
export function useLandingReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    for (const el of els) {
      const delay = Number(el.dataset.revealDelay ?? 0);
      if (Number.isFinite(delay) && delay > 0) {
        el.style.transitionDelay = `${delay}ms`;
      }
      el.classList.add("ax-reveal");
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);
}
