"use server";

import { desc, eq, isNull } from "drizzle-orm";

import { db } from "@/shared/db";
import { income } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { revalidateFinance } from "@/shared/lib/revalidate";
import { incomeSchema, type IncomeInput } from "./schema";

export type { ActionResult };

export async function listIncome() {
  const auth = await requireCan("finance.view");
  if (!auth.ok) return [];
  return db.query.income.findMany({
    where: isNull(income.deletedAt),
    orderBy: [desc(income.incomeDate)],
  });
}

function values(d: IncomeInput) {
  return {
    source: d.source,
    description: d.description || null,
    amount: d.amount,
    incomeDate: new Date(d.incomeDate),
  };
}

export async function createIncome(input: IncomeInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [created] = await db
    .insert(income)
    .values(values(parsed.data))
    .returning({ id: income.id });

  revalidateFinance();
  return ok({ id: created.id });
}

export async function updateIncome(incomeId: string, input: IncomeInput): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [updated] = await db
    .update(income)
    .set(values(parsed.data))
    .where(eq(income.id, incomeId))
    .returning({ id: income.id });
  if (!updated) return fail("Income record not found.");

  revalidateFinance();
  return ok();
}

export async function deleteIncome(incomeId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const [updated] = await db
    .update(income)
    .set({ deletedAt: new Date() })
    .where(eq(income.id, incomeId))
    .returning({ id: income.id });
  if (!updated) return fail("Income record not found.");

  revalidateFinance();
  return ok();
}
