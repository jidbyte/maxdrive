import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  index,
  primaryKey,
  jsonb,
} from "drizzle-orm/pg-core";

import { timestamps } from "./store";

/**
 * Local mirror of a Firebase Auth user, keyed by the Firebase UID.
 * Created lazily on first authenticated request (see shared/authz/session.ts).
 *
 * Everyone who signs in — customers and staff — gets an app_user row.
 * A user is STAFF if and only if they have a staff_member row; their
 * permissions come from that row's role. Never infer staff-ness from
 * anything else (email domain, Firebase custom claims, …).
 */
export const appUser = pgTable(
  "app_user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    authUid: text("auth_uid").notNull().unique(),
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    photoUrl: text("photo_url"),
    lastSignInAt: timestamp("last_sign_in_at"),
    ...timestamps,
  },
  (table) => [
    index("appUser_authUid_idx").on(table.authUid),
    index("appUser_email_idx").on(table.email),
  ],
);

export const ROLE_NAMES = [
  "Owner",
  "Admin",
  "Manager",
  "Cashier",
  "Technician",
  "Viewer",
] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const role = pgTable("role", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name", { enum: ROLE_NAMES }).notNull().unique(),
  description: text("description"),
  ...timestamps,
});

// Permission keys are plain strings rather than an enum so new permissions
// can be added without a migration — only role_permission rows change.
export const permission = pgTable("permission", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  description: text("description"),
  ...timestamps,
});

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("rolePermission_roleId_idx").on(table.roleId),
  ],
);

/** Staff membership. One row per staff user (single-tenant: no account id). */
export const staffMember = pgTable(
  "staff_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => appUser.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "restrict" }),
    jobTitle: text("job_title"),
    ...timestamps,
  },
  (table) => [index("staffMember_roleId_idx").on(table.roleId)],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "restrict" }),
    token: text("token").notNull().unique(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "accepted", "revoked", "expired"],
    })
      .notNull()
      .default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    ...timestamps,
  },
  (table) => [
    index("invitation_email_idx").on(table.email),
    index("invitation_token_idx").on(table.token),
  ],
);

/** Append-only audit trail of sensitive staff actions (prices, stock, roles, refunds…). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorUid: text("actor_uid"),
    action: text("action").notNull(), // e.g. "product.update", "staff.role_change"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("auditLog_entity_idx").on(table.entityType, table.entityId),
    index("auditLog_createdAt_idx").on(table.createdAt),
  ],
);

export const appUserRelations = relations(appUser, ({ one }) => ({
  staff: one(staffMember, {
    fields: [appUser.id],
    references: [staffMember.userId],
  }),
}));

export const roleRelations = relations(role, ({ many }) => ({
  rolePermissions: many(rolePermission),
  staff: many(staffMember),
}));

export const permissionRelations = relations(permission, ({ many }) => ({
  rolePermissions: many(rolePermission),
}));

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
  role: one(role, { fields: [rolePermission.roleId], references: [role.id] }),
  permission: one(permission, {
    fields: [rolePermission.permissionId],
    references: [permission.id],
  }),
}));

export const staffMemberRelations = relations(staffMember, ({ one }) => ({
  user: one(appUser, { fields: [staffMember.userId], references: [appUser.id] }),
  role: one(role, { fields: [staffMember.roleId], references: [role.id] }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  role: one(role, { fields: [invitation.roleId], references: [role.id] }),
  invitedBy: one(appUser, {
    fields: [invitation.invitedByUserId],
    references: [appUser.id],
  }),
}));

// ─── Permission matrix (seeded by `npm run db:seed`) ─────────────────────
export const PERMISSION_KEYS = [
  "products.read",
  "products.manage",
  "inventory.adjust",
  "orders.read",
  "orders.manage",
  "purchases.manage",
  "suppliers.manage",
  "customers.manage",
  "services.manage",
  "bookings.manage",
  "workorders.manage",
  "finance.view",
  "finance.manage",
  "reports.view",
  "reviews.moderate",
  "settings.manage",
  "users.invite",
  "users.remove",
  "billing.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  Owner: "Full access, including billing and payment settings.",
  Admin: "Full access except billing.",
  Manager: "Runs day-to-day operations: catalog, stock, orders, workshop, reports.",
  Cashier: "Point of sale, orders, customers and bookings.",
  Technician: "Workshop bookings and work orders.",
  Viewer: "Read-only access to catalog, orders and reports.",
};

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  Owner: [...PERMISSION_KEYS],
  Admin: PERMISSION_KEYS.filter((k) => k !== "billing.manage"),
  Manager: [
    "products.read",
    "products.manage",
    "inventory.adjust",
    "orders.read",
    "orders.manage",
    "purchases.manage",
    "suppliers.manage",
    "customers.manage",
    "services.manage",
    "bookings.manage",
    "workorders.manage",
    "finance.view",
    "reports.view",
    "reviews.moderate",
  ],
  Cashier: [
    "products.read",
    "orders.read",
    "orders.manage",
    "customers.manage",
    "bookings.manage",
  ],
  Technician: ["products.read", "bookings.manage", "workorders.manage"],
  Viewer: ["products.read", "orders.read", "reports.view", "finance.view"],
};
