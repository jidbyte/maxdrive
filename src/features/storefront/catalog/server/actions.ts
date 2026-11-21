"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { vehicleMake, vehicleModel } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";
import { listModelsForMake, searchCatalog, type CatalogProduct } from "./queries";
import { getSelectedVehicle, VEHICLE_COOKIE } from "./vehicle";

export async function getModelsForMake(makeId: string) {
  if (typeof makeId !== "string" || makeId.length > 64) return [];
  return listModelsForMake(makeId);
}

/** Saves the shopper's vehicle in a cookie (works for guests too). */
export async function selectVehicle(input: {
  makeId: string;
  modelId?: string | null;
  year?: number | null;
}): Promise<ActionResult<{ label: string }>> {
  const make = await db.query.vehicleMake.findFirst({ where: eq(vehicleMake.id, input.makeId) });
  if (!make) return fail("Choose a vehicle make.");

  let modelName: string | null = null;
  if (input.modelId) {
    const model = await db.query.vehicleModel.findFirst({
      where: eq(vehicleModel.id, input.modelId),
    });
    if (!model || model.makeId !== make.id) return fail("Choose a valid model.");
    modelName = model.name;
  }

  const year =
    input.year && Number.isInteger(input.year) && input.year > 1950 && input.year < 2100
      ? input.year
      : null;
  const label = [year, make.name, modelName].filter(Boolean).join(" ");

  (await cookies()).set(
    VEHICLE_COOKIE,
    JSON.stringify({ makeId: make.id, modelId: input.modelId || null, year, label }),
    { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/", httpOnly: false },
  );
  revalidatePath("/", "layout");
  return ok({ label });
}

export async function clearVehicle(): Promise<ActionResult> {
  (await cookies()).delete(VEHICLE_COOKIE);
  revalidatePath("/", "layout");
  return ok();
}

/** Typeahead for the ⌘K / header search. */
export async function quickSearch(q: string): Promise<CatalogProduct[]> {
  const term = typeof q === "string" ? q.trim().slice(0, 80) : "";
  if (term.length < 2) return [];
  const vehicle = await getSelectedVehicle();
  const result = await searchCatalog({ q: term, vehicle, pageSize: 8, sort: "relevance" });
  return result.items;
}
