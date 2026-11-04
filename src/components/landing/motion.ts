"use client";
import { useEffect, type RefObject } from "react";

/** Adds the ready flag for the hero shutter and reveals sections once. */
export function useLandingMotion<T extends HTMLElement>(rootRef: RefObject<T | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    document.documentElement.classList.add("mv-js");
    const frame = requestAnimationFrame(() => root.classList.add("is-ready"));
    const targets = Array.from(root.querySelectorAll(".mv-reveal"));
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((target) => target.classList.add("is-in"));
      return () => cancelAnimationFrame(frame);
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
      { threshold: 0.2 },
    );
    targets.forEach((target) => io.observe(target));
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [rootRef]);
}
