"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EXCHANGE_COLORS,
  EXCHANGE_LABELS,
  NOTIONAL_TIERS,
} from "@/lib/constants";
import { formatTier } from "@/lib/format";
import { getFeeBps } from "@/lib/fee-defaults";
import type {
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  FeeConfig,
  SpreadUnit,
} from "@/lib/types";
import type { SlippageMedianDatum } from "@/hooks/use-slippage-history";

interface SlippageChartProps {
  side: "ask" | "bid";
  statuses: ExchangeRecord<ExchangeStatus>;
  spreadUnit: SpreadUnit;
  activeExchanges: ExchangeKey[];
  feeConfig: FeeConfig;
  historicalData?: SlippageMedianDatum[];
}

type ChartDatum = {
  tier: string;
} & Partial<Record<ExchangeKey, number | null>>;

function CustomTooltip({ active, payload, label, spreadUnit }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#101c32",
        border: "1px solid rgba(141, 168, 213, 0.35)",
        borderRadius: "0.6rem",
        padding: "0.75rem 1rem",
      }}
    >
      <p
        style={{
          color: "#9fb0d1",
          fontSize: "11px",
          marginBottom: "8px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>
      {payload
        .filter((entry: any) => entry.value != null)
        .map((entry: any) => {
          const val =
            typeof entry.value === "number" ? entry.value : Number(entry.value);
          const display =
            spreadUnit === "pct"
              ? `${(val / 100).toFixed(4)}%`
              : `${val.toFixed(2)} bps`;

          return (
            <div
              key={entry.dataKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "3px 0",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: entry.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#e8eefb", fontSize: "12px", flex: 1 }}>
                {entry.name}
              </span>
              <span
                style={{
                  color: "#e8eefb",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono), monospace",
                  fontWeight: 500,
                }}
              >
                {display}
              </span>
            </div>
          );
        })}
    </div>
  );
}

export function SlippageChart({
  side,
  statuses,
  spreadUnit,
  activeExchanges,
  feeConfig,
  historicalData,
}: SlippageChartProps) {
  const data: ChartDatum[] = historicalData
    ? historicalData.map((row) => {
        const adjusted: ChartDatum = { tier: row.tier };
        for (const exchange of activeExchanges) {
          const raw = row[exchange];
          if (typeof raw === "number") {
            adjusted[exchange] = Number(
              (raw + getFeeBps(feeConfig, exchange)).toFixed(2),
            );
          } else {
            adjusted[exchange] = null;
          }
        }
        return adjusted;
      })
    : NOTIONAL_TIERS.map((tier, idx) => {
        const row: ChartDatum = { tier: formatTier(tier) };
        for (const exchange of activeExchanges) {
          const analysis = statuses[exchange].analysis;
          const point =
            side === "ask" ? analysis?.asks[idx] : analysis?.bids[idx];
          const feeBps = getFeeBps(feeConfig, exchange);
          row[exchange] = point
            ? Number((point.slippageBps + feeBps).toFixed(2))
            : null;
        }
        return row;
      });

  const hasData = data.some((row) =>
    activeExchanges.some((exchange) => typeof row[exchange] === "number"),
  );

  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
        Waiting for enough order book data to render chart.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ left: 4, right: 12, top: 6, bottom: 6 }}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(186, 213, 255, 0.12)"
          />
          <XAxis
            dataKey="tier"
            tick={{ fill: "#9fb0d1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
          />
          <YAxis
            tick={{ fill: "#9fb0d1", fontSize: 12 }}
            axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
            width={56}
            tickFormatter={(v: number) =>
              spreadUnit === "pct" ? `${(v / 100).toFixed(2)}%` : `${v}`
            }
          />
          <Tooltip
            cursor={{ fill: "rgba(79, 140, 255, 0.12)" }}
            content={<CustomTooltip spreadUnit={spreadUnit} />}
          />
          <Legend wrapperStyle={{ color: "#9fb0d1", fontSize: "12px" }} />

          {activeExchanges.map((exchange) => (
            <Bar
              key={exchange}
              dataKey={exchange}
              name={EXCHANGE_LABELS[exchange]}
              fill={EXCHANGE_COLORS[exchange]}
              radius={[4, 4, 0, 0]}
              minPointSize={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
