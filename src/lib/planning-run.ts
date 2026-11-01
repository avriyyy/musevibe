/**
 * Small memory for one first-run planning pass.
 *
 * The journal is written to localStorage alongside the documents, and every
 * unit is only marked settled after its text is actually stored. That buys
 * two things a component-level progress bar cannot:
 *
 * - A refresh mid-generation resumes with real knowledge of which units were
 *   in flight, so they are retried instead of being shown as finished.
 * - Failed document units stay unsettled and can be retried on a later mount.
 */

import { DOC_TYPES } from "./docs";

export type PlanningUnitStatus =
  | "queued"
  | "generating"
  | "checking"
  | "retrying"
  | "failed"
  | "done"
  | "local";

export interface PlanningUnitRecord {
  status: PlanningUnitStatus;
  percent: number;
  /** When the current attempt started; the unit is in flight until settled. */
  startedAt?: string;
  /** Set only once this unit's final text is committed. */
  settledAt?: string;
}

export interface PlanningRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  units: Record<string, PlanningUnitRecord>;
}

/** Every unit one pass can touch: six plan documents, tasks, page plan. */
export const PLANNING_UNIT_IDS: string[] = [
  ...DOC_TYPES.map((entry) => `doc-${entry.kind}`),
  "tasks",
  "pages",
];

export function planningUnitId(kind: string): string {
  return `doc-${kind}`;
}

export function isSettledStatus(status: PlanningUnitStatus): boolean {
  return status === "done" || status === "local";
}

let runSeq = 0;
function runId(now: string): string {
  runSeq += 1;
  return `run-${now}-${runSeq}`;
}

export function startPlanningRun(
  unitIds: string[] = PLANNING_UNIT_IDS,
  now: string = new Date().toISOString(),
): PlanningRun {
  return {
    id: runId(now),
    startedAt: now,
    units: Object.fromEntries(
      unitIds.map((id) => [id, { status: "queued", percent: 0 }]),
    ),
  };
}

/**
 * Continue an unfinished run instead of starting over, so settled documents
 * keep their status and only the in-flight units are retried.
 */
export function resumePlanningRun(
  previous: PlanningRun | undefined,
  unitIds: string[] = PLANNING_UNIT_IDS,
  now: string = new Date().toISOString(),
): PlanningRun {
  if (!previous || previous.finishedAt) return startPlanningRun(unitIds, now);
  const units: Record<string, PlanningUnitRecord> = {};
  for (const id of unitIds) {
    const unit = previous.units?.[id];
    units[id] = unit && isSettledStatus(unit.status)
      ? unit
      : { status: "queued", percent: 0 };
  }
  return { ...previous, units };
}

function patchUnit(
  run: PlanningRun,
  id: string,
  patch: Partial<PlanningUnitRecord>,
): PlanningRun {
  const previous = run.units[id] ?? { status: "queued", percent: 0 };
  return {
    ...run,
    units: { ...run.units, [id]: { ...previous, ...patch } },
  };
}

/** Mark a unit as in flight right before its model request starts. */
export function beginUnit(
  run: PlanningRun,
  id: string,
  percent = 20,
  now: string = new Date().toISOString(),
): PlanningRun {
  return patchUnit(run, id, {
    status: "generating",
    percent,
    startedAt: now,
    settledAt: undefined,
  });
}

/** Intermediate progress (checking, repairing) inside the same attempt. */
export function noteUnitProgress(
  run: PlanningRun,
  id: string,
  status: PlanningUnitStatus,
  percent: number,
): PlanningRun {
  return patchUnit(run, id, { status, percent });
}

/** Mark a unit final. Only call this after the text is in the store. */
export function settleUnit(
  run: PlanningRun,
  id: string,
  status: "done" | "local",
  percent = 100,
  now: string = new Date().toISOString(),
): PlanningRun {
  return patchUnit(run, id, { status, percent, settledAt: now });
}

export function finishPlanningRun(
  run: PlanningRun,
  now: string = new Date().toISOString(),
): PlanningRun {
  return { ...run, finishedAt: now };
}

export function unsettledUnitIds(run: PlanningRun | undefined): string[] {
  if (!run) return [];
  return Object.entries(run.units ?? {})
    .filter(([, unit]) => !isSettledStatus(unit.status))
    .map(([id]) => id);
}

/**
 * Progress to paint on mount. Only completed units remain complete; failed or
 * interrupted units are shown as queued for their next bounded attempt.
 */
export function resumeProgress(
  run: PlanningRun | undefined,
): Record<string, { status: PlanningUnitStatus; percent: number }> {
  if (!run) return {};
  const progress: Record<string, { status: PlanningUnitStatus; percent: number }> = {};
  for (const [id, unit] of Object.entries(run.units ?? {})) {
    progress[id] =
      unit.status === "done"
        ? { status: "done", percent: 100 }
        : { status: "queued", percent: 0 };
  }
  return progress;
}
