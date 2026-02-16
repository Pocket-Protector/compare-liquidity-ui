"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EXCHANGE_COLORS, EXCHANGE_LABELS } from "@/lib/constants";
import type {
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  SpreadUnit,
} from "@/lib/types";

interface SpreadCompareChartProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  spreadUnit: SpreadUnit;
  activeExchanges: ExchangeKey[];
}

interface SpreadDatum {
  exchange: ExchangeKey;
  label: string;
  spreadBps: number;
  color: string;
}

function formatSpread(value: number, spreadUnit: SpreadUnit): string {
  return spreadUnit === "pct"
    ? `${(value / 100).toFixed(4)}%`
    : `${value.toFixed(2)} bps`;
}

function SpreadTooltip({ active, payload, spreadUnit }: any) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as SpreadDatum | undefined;
  if (!point) return null;

  return (
    <div
      style={{
        background: "#101c32",
        border: "1px solid rgba(141, 168, 213, 0.35)",
        borderRadius: "0.6rem",
        padding: "0.7rem 0.9rem",
      }}
    >
      <p
        style={{
          color: "#e8eefb",
          fontSize: "12px",
          marginBottom: "6px",
          fontWeight: 600,
        }}
      >
        {point.label}
      </p>
      <p style={{ color: "#9fb0d1", fontSize: "12px" }}>
        {formatSpread(point.spreadBps, spreadUnit)}
      </p>
    </div>
  );
}

export function SpreadCompareChart({
  statuses,
  spreadUnit,
  activeExchanges,
}: SpreadCompareChartProps) {
  const data: SpreadDatum[] = activeExchanges
    .map((exchange) => {
      const spreadBps = statuses[exchange].analysis?.spreadBps;
      if (!Number.isFinite(spreadBps)) return null;

      return {
        exchange,
        label: EXCHANGE_LABELS[exchange],
        spreadBps,
        color: EXCHANGE_COLORS[exchange],
      };
    })
    .filter((row): row is SpreadDatum => Boolean(row))
    .sort((a, b) => a.spreadBps - b.spreadBps);

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
        Waiting for live spread samples to render chart.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 14, top: 6, bottom: 6 }}
          barCategoryGap={10}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(186, 213, 255, 0.12)"
          />
          <XAxis
            type="number"
            tick={{ fill: "#9fb0d1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickFormatter={(v: number) =>
              spreadUnit === "pct"
                ? `${(v / 100).toFixed(2)}%`
                : `${v.toFixed(1)}`
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fill: "#9fb0d1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(79, 140, 255, 0.12)" }}
            content={<SpreadTooltip spreadUnit={spreadUnit} />}
          />

          <Bar
            dataKey="spreadBps"
            radius={[0, 6, 6, 0]}
            stroke="rgba(232, 238, 251, 0.18)"
            strokeWidth={1}
          >
            {data.map((entry) => (
              <Cell key={entry.exchange} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
