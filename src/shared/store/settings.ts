import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import {
  storeSettings,
  STORE_SETTINGS_ID,
  type StoreSettings,
} from "@/shared/db/schema";

/**
 * The single MAXDRIVE store configuration, read once per request (React
 * `cache`). It's one primary-key lookup, so per-request reads keep settings
 * changes instantly visible without a cross-request cache to invalidate.
 * (If this ever needs cross-request caching, adopt Next.js 16 Cache
 * Components with `"use cache"` + `cacheTag`, not `unstable_cache`.)
 */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const row = await db.query.storeSettings.findFirst({
    where: eq(storeSettings.id, STORE_SETTINGS_ID),
  });
  if (row) return row;

  // First boot before `db:seed`: create the singleton with defaults.
  const [created] = await db
    .insert(storeSettings)
    .values({ id: STORE_SETTINGS_ID })
    .onConflictDoNothing()
    .returning();
  return (
    created ??
    (await db.query.storeSettings.findFirst({
      where: eq(storeSettings.id, STORE_SETTINGS_ID),
    }))!
  );
});
