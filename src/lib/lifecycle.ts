/**
 * Page lifecycle guard for generation writes.
 *
 * A hard refresh kills an in-flight model request before React unmounts, and
 * the rejected fetch looks exactly like a provider outage. Without a guard the
 * failure handler can incorrectly persist an error result just before the new
 * page loads, making an interrupted generation look like a settled attempt.
 *
 * Three layers stop that:
 *
 * 1. `canCommitGeneration` waits one task turn before writing. A document that
 *    is being replaced never runs that turn, so a cancelled request is never
 *    mistaken for a model failure.
 * 2. `watchPageLifecycle` flips a flag on `pagehide` / `beforeunload` in the
 *    capture phase, so a write that already woke up still bails out.
 * 3. The persisted run journal (`planning-run.ts`) keeps a unit unsettled until
 *    its validated result is committed, so a later mount can retry it.
 */

let unloading = false;
let watching = false;

function markUnloading() {
  unloading = true;
}

/** True once this document has started to unload (refresh, close, navigate). */
export function isPageUnloading(): boolean {
  return unloading;
}

/** Arm the unload flag. Idempotent, and safe to call from a mount effect. */
export function watchPageLifecycle(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  window.addEventListener("pagehide", markUnloading, { capture: true });
  window.addEventListener("beforeunload", markUnloading, { capture: true });
}

/**
 * Whether this attempt may still persist its result.
 *
 * The timer is the part that survives a race: a navigation that starts after
 * the fetch rejects still cancels queued tasks, and the flag catches the case
 * where the timer does run. Only a live page with a live attempt returns true.
 */
export async function canCommitGeneration(
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted || unloading) return false;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  return !signal?.aborted && !unloading;
}
