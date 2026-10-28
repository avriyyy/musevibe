"use client";

import { useLayoutEffect } from "react";
import { useVibe } from "@/lib/store";

/**
 * Loads the saved workspace after the server HTML has hydrated but before the
 * browser paints, so the project list never flashes the seed data. Reading
 * storage during the first render would break hydration instead.
 */
export default function StoreHydrator() {
  useLayoutEffect(() => {
    void useVibe.persist.rehydrate();
  }, []);

  return null;
}
