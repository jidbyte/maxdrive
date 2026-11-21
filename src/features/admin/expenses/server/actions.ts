"use server";

import { desc, eq, isNull } from "drizzle-orm";

import { db } from "@/shared/db";
import { expense } from "@/shared/db/schema";
import { requireCan } from "@/shared/authz/can";
import { type ActionResult, fail, ok, zodMessage } from "@/shared/lib/action-result";
import { revalidateFinance } from "@/shared/lib/revalidate";
import { expenseSchema, type ExpenseInput } from "./schema";

export type { ActionResult };

export async function listExpenses() {
  const auth = await requireCan("finance.view");
  if (!auth.ok) return [];
  return db.query.expense.findMany({
    where: isNull(expense.deletedAt),
    orderBy: [desc(expense.expenseDate)],
  });
}

function values(d: ExpenseInput) {
  return {
    category: d.category,
    description: d.description,
    amount: d.amount,
    expenseDate: new Date(d.expenseDate),
  };
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [created] = await db
    .insert(expense)
    .values(values(parsed.data))
    .returning({ id: expense.id });

  revalidateFinance();
  return ok({ id: created.id });
}

export async function updateExpense(expenseId: string, input: ExpenseInput): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));

  const [updated] = await db
    .update(expense)
    .set(values(parsed.data))
    .where(eq(expense.id, expenseId))
    .returning({ id: expense.id });
  if (!updated) return fail("Expense not found.");

  revalidateFinance();
  return ok();
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const auth = await requireCan("finance.manage");
  if (!auth.ok) return fail(auth.error);

  const [updated] = await db
    .update(expense)
    .set({ deletedAt: new Date() })
    .where(eq(expense.id, expenseId))
    .returning({ id: expense.id });
  if (!updated) return fail("Expense not found.");

  revalidateFinance();
  return ok();
}
