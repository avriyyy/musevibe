import { neon } from "@neondatabase/serverless";
import { DAILY_CREDITS, PROJECT_CREATION_COST } from "@/lib/credits";

export type CreditSpendResult = "ok" | "insufficient";

export interface CreditRepository {
  getBalanceWithReset(userId: string): Promise<{ balance: number; resetDate: string }>;
  spendForProject(userId: string): Promise<CreditSpendResult>;
  refund(userId: string, amount: number): Promise<void>;
}

const schemaReadyByDatabase = new Map<string, Promise<void>>();

/**
 * Neon-backed daily credits. Rows are provisioned lazily: the first touch
 * for a user creates a full daily balance, and every touch refills stale
 * rows. Spending is a single guarded UPDATE, so concurrent creates cannot
 * overspend the same balance.
 */
export function createNeonCreditRepository(connectionString: string): CreditRepository {
  const sql = neon(connectionString);
  let schemaPromise = schemaReadyByDatabase.get(connectionString);
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS public.musevibe_credits (
          user_id uuid PRIMARY KEY,
          balance integer NOT NULL DEFAULT 0,
          reset_date date NOT NULL DEFAULT CURRENT_DATE,
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT musevibe_credits_balance_nonnegative CHECK (balance >= 0)
        )
      `;
    })().catch((error: unknown) => {
      schemaReadyByDatabase.delete(connectionString);
      throw error;
    });
    schemaReadyByDatabase.set(connectionString, schemaPromise);
  }
  const ensureSchema = async () => {
    await schemaPromise;
  };

  const getBalanceWithReset = async (userId: string) => {
    await ensureSchema();
    // The UI promises a UTC daily reset; CURRENT_DATE would follow the
    // database session timezone instead.
    const rows = await sql`
      INSERT INTO public.musevibe_credits (user_id, balance, reset_date, updated_at)
      VALUES (${userId}::uuid, ${DAILY_CREDITS}, (now() AT TIME ZONE 'UTC')::date, now())
      ON CONFLICT (user_id) DO UPDATE SET
        balance = CASE
          WHEN public.musevibe_credits.reset_date < (now() AT TIME ZONE 'UTC')::date THEN ${DAILY_CREDITS}
          ELSE public.musevibe_credits.balance
        END,
        reset_date = (now() AT TIME ZONE 'UTC')::date,
        updated_at = now()
      RETURNING balance, reset_date
    `;
    const row = rows[0] as { balance: number; reset_date: string | Date } | undefined;
    const resetDate =
      row?.reset_date instanceof Date
        ? row.reset_date.toISOString().slice(0, 10)
        : String(row?.reset_date ?? "");
    return { balance: Number(row?.balance ?? 0), resetDate };
  };

  return {
    getBalanceWithReset,

    async spendForProject(userId) {
      await getBalanceWithReset(userId);
      const rows = await sql`
        UPDATE public.musevibe_credits
        SET balance = balance - ${PROJECT_CREATION_COST}, updated_at = now()
        WHERE user_id = ${userId}::uuid AND balance >= ${PROJECT_CREATION_COST}
        RETURNING balance
      `;
      return rows.length > 0 ? "ok" : "insufficient";
    },

    async refund(userId, amount) {
      await ensureSchema();
      await sql`
        UPDATE public.musevibe_credits
        SET balance = balance + ${amount}, updated_at = now()
        WHERE user_id = ${userId}::uuid
      `;
    },
  };
}
