// Run with: npm run db:seed
// Idempotent — safe to re-run (upserts by unique key, never overwrites
// data staff have since edited).
import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "./index";
import {
  role,
  permission,
  rolePermission,
  storeSettings,
  category,
  service,
  vehicleMake,
  vehicleModel,
  PERMISSION_KEYS,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  STORE_SETTINGS_ID,
} from "./schema";
import { slugify } from "../lib/slug";

const CATEGORIES: Array<{ name: string; icon: string }> = [
  { name: "Brakes", icon: "disc" },
  { name: "Oils & Fluids", icon: "droplet" },
  { name: "Filters", icon: "filter" },
  { name: "Batteries & Electrical", icon: "battery" },
  { name: "Ignition", icon: "zap" },
  { name: "Suspension & Steering", icon: "gauge" },
  { name: "Engine Parts", icon: "cog" },
  { name: "Cooling", icon: "thermometer" },
  { name: "Lighting", icon: "lightbulb" },
  { name: "Tyres & Wheels", icon: "circle-dot" },
  { name: "Body parts", icon: "car" },
  { name: "Accessories", icon: "component" },
];

const SERVICES: Array<{
  name: string;
  category: string;
  summary: string;
  durationMinutes: number;
  basePrice: number;
  priceIsFrom: boolean;
  icon: string;
}> = [
  {
    name: "Oil & Filter Change",
    category: "Maintenance",
    summary: "Synthetic oil, new filter and a 25-point inspection.",
    durationMinutes: 45,
    basePrice: 550,
    priceIsFrom: true,
    icon: "droplet",
  },
  {
    name: "Computer Diagnostics",
    category: "Diagnostics",
    summary: "Full OBD-II scan with a written fault report.",
    durationMinutes: 30,
    basePrice: 300,
    priceIsFrom: false,
    icon: "gauge",
  },
  {
    name: "Brake Service",
    category: "Brakes",
    summary: "Pads/discs inspection and replacement, brake fluid check.",
    durationMinutes: 90,
    basePrice: 400,
    priceIsFrom: true,
    icon: "disc",
  },
  {
    name: "AC Service & Regas",
    category: "Air Conditioning",
    summary: "Leak test, refrigerant recharge and cabin filter.",
    durationMinutes: 60,
    basePrice: 650,
    priceIsFrom: true,
    icon: "snowflake",
  },
  {
    name: "Wheel Alignment & Balancing",
    category: "Tyres",
    summary: "Four-wheel alignment and balancing.",
    durationMinutes: 60,
    basePrice: 350,
    priceIsFrom: false,
    icon: "circle-dot",
  },
  {
    name: "Full Vehicle Service",
    category: "Maintenance",
    summary: "Manufacturer-schedule service: oil, filters, plugs, fluids, inspection.",
    durationMinutes: 180,
    basePrice: 1500,
    priceIsFrom: true,
    icon: "wrench",
  },
];

const VEHICLES: Record<string, string[]> = {
  Toyota: ["Corolla", "Camry", "RAV4", "Yaris", "Hilux", "Land Cruiser", "Highlander", "Vitz"],
  Honda: ["Civic", "Accord", "CR-V", "Fit", "Pilot"],
  Subaru: ["Legacy", "Outback", "Crosstrek", "Forester", "Impreza"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Accent"],
  Kia: ["Rio", "Picanto", "Sportage", "Sorento", "Cerato"],
  Nissan: ["Almera", "Sentra", "X-Trail", "Pathfinder", "Navara"],
  Benz: ["C-Class", "E-Class", "GLE", "ML"],
  BMW: ["3 Series", "5 Series", "X3", "X5"],
  Ford: ["Focus", "Ranger", "Explorer", "Escape"],
  Volkswagen: ["Golf", "Passat", "Tiguan", "Polo"],
  Mitsubishi: ["L200", "Pajero", "Outlander"],
  Mazda: ["Mazda3", "Mazda6", "CX-5"],
  Lexus: ["RX", "ES", "GX"],
};

async function seedRbac() {
  console.log("• roles & permissions");
  const permissionIdByKey = new Map<string, string>();
  for (const key of PERMISSION_KEYS) {
    const [row] = await db
      .insert(permission)
      .values({ key })
      .onConflictDoUpdate({ target: permission.key, set: { key } })
      .returning({ id: permission.id });
    permissionIdByKey.set(key, row.id);
  }

  for (const name of ROLE_NAMES) {
    const [row] = await db
      .insert(role)
      .values({ name, description: ROLE_DESCRIPTIONS[name] })
      .onConflictDoUpdate({
        target: role.name,
        set: { description: ROLE_DESCRIPTIONS[name] },
      })
      .returning({ id: role.id });

    // Re-sync grants so the matrix in schema/users.ts is the source of truth.
    await db.delete(rolePermission).where(eq(rolePermission.roleId, row.id));
    await db.insert(rolePermission).values(
      ROLE_PERMISSIONS[name].map((key) => ({
        roleId: row.id,
        permissionId: permissionIdByKey.get(key)!,
      })),
    );
  }
}

async function seedStore() {
  console.log("• store settings");
  await db
    .insert(storeSettings)
    .values({
      id: STORE_SETTINGS_ID,
      name: "MAXDRIVE",
      legalName: "MAXDRIVE Autoparts & Service",
      tagline: "Parts that fit. Service you trust.",
      email: "hello@maxdrive.com",
      currency: "GHS",
      country: "GH",
      city: "Accra",
      deliveryFee: 50,
      freeDeliveryThreshold: 800,
    })
    .onConflictDoNothing();
}

async function seedCatalog() {
  console.log("• categories");
  for (const [i, c] of CATEGORIES.entries()) {
    await db
      .insert(category)
      .values({ name: c.name, slug: slugify(c.name), icon: c.icon, sortOrder: i })
      .onConflictDoNothing();
  }

  console.log("• workshop services");
  for (const [i, s] of SERVICES.entries()) {
    await db
      .insert(service)
      .values({ ...s, slug: slugify(s.name), sortOrder: i })
      .onConflictDoNothing();
  }

  console.log("• vehicle makes & models");
  for (const [makeName, models] of Object.entries(VEHICLES)) {
    const [make] = await db
      .insert(vehicleMake)
      .values({ name: makeName, slug: slugify(makeName) })
      .onConflictDoUpdate({ target: vehicleMake.name, set: { name: makeName } })
      .returning({ id: vehicleMake.id });
    for (const modelName of models) {
      await db
        .insert(vehicleModel)
        .values({ makeId: make.id, name: modelName, slug: slugify(modelName) })
        .onConflictDoNothing();
    }
  }
}

async function main() {
  console.log("Seeding MAXDRIVE…");
  await seedRbac();
  await seedStore();
  await seedCatalog();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
