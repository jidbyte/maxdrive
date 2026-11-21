import { cookies } from "next/headers";

import type { VehicleSelection } from "./queries";

export const VEHICLE_COOKIE = "md_vehicle";

/** The shopper's selected vehicle ("Shopping for: 2017 Toyota Corolla"), if any. */
export async function getSelectedVehicle(): Promise<VehicleSelection | null> {
  const raw = (await cookies()).get(VEHICLE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<VehicleSelection>;
    if (typeof v.makeId !== "string" || typeof v.label !== "string") return null;
    return {
      makeId: v.makeId,
      modelId: typeof v.modelId === "string" ? v.modelId : null,
      year: typeof v.year === "number" ? v.year : null,
      label: v.label.slice(0, 80),
    };
  } catch {
    return null;
  }
}
