// Bootstrap the first Owner on a fresh install:
//
//   1. Sign up on the site with the owner's email (creates the app_user row).
//   2. npm run db:grant-owner -- owner@maxdrive.com
//
// After that, the Owner invites everyone else from Admin → Settings → Team.
import "dotenv/config";
import { eq, ilike } from "drizzle-orm";

import { db } from "./index";
import { appUser, role, staffMember } from "./schema";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: npm run db:grant-owner -- <email>");
    process.exit(1);
  }

  const user = await db.query.appUser.findFirst({ where: ilike(appUser.email, email) });
  if (!user) {
    console.error(`No user with email ${email}. Sign up on the site first, then re-run.`);
    process.exit(1);
  }

  const owner = await db.query.role.findFirst({ where: eq(role.name, "Owner") });
  if (!owner) {
    console.error("Owner role missing — run `npm run db:seed` first.");
    process.exit(1);
  }

  await db
    .insert(staffMember)
    .values({ userId: user.id, roleId: owner.id, jobTitle: "Owner" })
    .onConflictDoUpdate({ target: staffMember.userId, set: { roleId: owner.id } });

  console.log(`${email} is now an Owner.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
