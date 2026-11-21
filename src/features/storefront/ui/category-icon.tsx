import {
  Battery,
  CircleDot,
  Cog,
  Disc,
  Droplet,
  Filter,
  Gauge,
  Lightbulb,
  Package,
  Snowflake,
  Sparkles,
  Thermometer,
  Wrench,
  Zap,
  Car,
  LifeBuoy,
  Component,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  disc: Disc,
  droplet: Droplet,
  filter: Filter,
  battery: Battery,
  zap: Zap,
  gauge: Gauge,
  cog: Cog,
  thermometer: Thermometer,
  lightbulb: Lightbulb,
  "circle-dot": CircleDot,
  sparkles: Sparkles,
  snowflake: Snowflake,
  wrench: Wrench,
  car: Car,
  lifeBuoy: LifeBuoy,
  component: Component,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Package;
  return <Icon className={className} />;
}
