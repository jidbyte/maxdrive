"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLine, ChartColumn } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

export type RevenueProfitPoint = {
  date: string;
  revenue: number;
  profit: number;
};

type ChartVariant = "line" | "bar";

function tickFormatter(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function tooltipFormatter(value: unknown, name: string, currency: string) {
  return [
    `${currency} ${Number(value ?? 0).toLocaleString()}`,
    name === "revenue" ? "Revenue" : "Profit (est.)",
  ];
}

function legendFormatter(value: string) {
  return (
    <span style={{ color: "var(--neutral)", fontSize: 12 }}>
      {value === "revenue" ? "Revenue" : "Profit (est.)"}
    </span>
  );
}

export function RevenueProfitChart({
  data,
  currency,
  variant = "line",
}: {
  data: RevenueProfitPoint[];
  currency: string;
  variant?: ChartVariant;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12, fill: "var(--neutral)" }}
              stroke="var(--border)"
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--neutral)" }}
              stroke="var(--border)"
              width={50}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              formatter={(value, name) =>
                tooltipFormatter(value, String(name), currency)
              }
              labelFormatter={(label) =>
                new Date(String(label)).toLocaleDateString()
              }
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--ink)",
              }}
              labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
            />
            <Legend
              formatter={legendFormatter}
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="revenue"
              fill="var(--danger)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="profit"
              fill="var(--success)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        ) : (
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12, fill: "var(--neutral)" }}
              stroke="var(--border)"
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--neutral)" }}
              stroke="var(--border)"
              width={50}
            />
            <Tooltip
              formatter={(value, name) =>
                tooltipFormatter(value, String(name), currency)
              }
              labelFormatter={(label) =>
                new Date(String(label)).toLocaleDateString()
              }
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--ink)",
              }}
              labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
            />
            <Legend
              formatter={legendFormatter}
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--danger)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="var(--success)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueProfitChartCard({
  data,
  currency,
}: {
  data: RevenueProfitPoint[];
  currency: string;
}) {
  const [variant, setVariant] = useState<ChartVariant>("line");

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Revenue &amp; profit</CardTitle>

        <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
          <button
            aria-label="Line chart"
            aria-pressed={variant === "line"}
            onClick={() => setVariant("line")}
            className={cn(
              "grid size-8 place-items-center rounded-full text-neutral",
              variant === "line" && "bg-card text-ink shadow-card",
            )}
          >
            <ChartLine className="size-4" />
          </button>

          <button
            aria-label="Bar chart"
            aria-pressed={variant === "bar"}
            onClick={() => setVariant("bar")}
            className={cn(
              "grid size-8 place-items-center rounded-full text-neutral",
              variant === "bar" && "bg-card text-ink shadow-card",
            )}
          >
            <ChartColumn className="size-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <RevenueProfitChart data={data} currency={currency} variant={variant} />
      </CardContent>
    </Card>
  );
}
