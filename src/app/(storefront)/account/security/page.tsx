import { eq } from "drizzle-orm";

import { db } from "@/shared/db";
import { appUser } from "@/shared/db/schema";
import { getCurrentUser } from "@/shared/authz/session";
import { SecurityPanel } from "@/features/auth/client/security-panel";

export const metadata = { title: "Sign-in & security" };

export default async function AccountSecurityPage() {
  const user = (await getCurrentUser())!;
  const row = await db.query.appUser.findFirst({
    where: eq(appUser.id, user.id),
    columns: { lastSignInAt: true },
  });
  return (
    <SecurityPanel
      user={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        lastSignInAt: row?.lastSignInAt?.toISOString() ?? null,
      }}
    />
  );
}
