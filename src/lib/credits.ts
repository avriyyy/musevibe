/**
 * Daily credits: every account gets DAILY_CREDITS each UTC day, and creating
 * a project costs PROJECT_CREATION_COST. The two numbers are equal on
 * purpose: one day builds exactly one full project, and every AI generation
 * inside that project is included.
 */

export const DAILY_CREDITS = 10;
export const PROJECT_CREATION_COST = 10;

export function utcTodayString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Pure reset math: stale rows refill to the daily budget. */
export function balanceAfterReset(
  balance: number,
  resetDate: string,
  today: string = utcTodayString(),
): { balance: number; resetDate: string; reset: boolean } {
  if (resetDate < today) {
    return { balance: DAILY_CREDITS, resetDate: today, reset: true };
  }
  return { balance, resetDate, reset: false };
}

export function canAffordProject(balance: number): boolean {
  return balance >= PROJECT_CREATION_COST;
}

export function insufficientCreditsMessage(): string {
  return "Not enough credits to create a project. New credits arrive tomorrow.";
}
