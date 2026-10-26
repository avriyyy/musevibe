"use client";

import { useEffect } from "react";

const STORAGE_KEY = "musevibe-prd-step1-v1";

/** Muat state workspace dari localStorage (frontend saja, tanpa backend). */
export function muatState<T>(awal: T): T {
  if (typeof window === "undefined") return awal;
  try {
    const mentah = window.localStorage.getItem(STORAGE_KEY);
    if (!mentah) return awal;
    return { ...awal, ...(JSON.parse(mentah) as Partial<T>) };
  } catch {
    return awal;
  }
}

/** Simpan state workspace ke localStorage setiap kali berubah. */
export function useSimpanLokal<T>(state: T) {
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Penyimpanan penuh/dibatasi: abaikan, state React tetap jalan.
    }
  }, [state]);
}

export function hapusStateLokal() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Abaikan.
  }
}
