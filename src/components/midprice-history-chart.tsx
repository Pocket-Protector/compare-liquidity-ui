"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EXCHANGE_COLORS, EXCHANGE_LABELS } from "@/lib/constants";
import type { ExchangeKey, TickerKey } from "@/lib/types";
import type { SpreadTimeframe } from "@/lib/timeframes";
import { useMidPriceHistory } from "@/hooks/use-midprice-history";

interface MidPriceHistoryChartProps {
  ticker: TickerKey;
  activeExchanges: ExchangeKey[];
  timeframe: SpreadTimeframe;
}

function formatXTick(isoString: string, timeframe: SpreadTimeframe): string {
  const d = new Date(isoString);
  if (timeframe === "7d") {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTooltipTime(isoString: string, timeframe: SpreadTimeframe): string {
  const d = new Date(isoString);
  if (timeframe === "1h" || timeframe === "4h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUsdCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function formatUsdPrecise(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
}

function MidPriceTooltip({
  active,
  payload,
  label,
  timeframe,
}: any & { timeframe: SpreadTimeframe }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#101c32",
        border: "1px solid rgba(141, 168, 213, 0.35)",
        borderRadius: "0.6rem",
        padding: "0.7rem 0.9rem",
        minWidth: 160,
      }}
    >
      <p style={{ color: "#e8eefb", fontSize: 11, marginBottom: 6, fontWeight: 600 }}>
        {formatTooltipTime(label, timeframe)}
      </p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ fontSize: 12, marginBottom: 2 }}>
          <span style={{ color: entry.color, fontWeight: 600 }}>
            {EXCHANGE_LABELS[entry.dataKey as ExchangeKey] ?? entry.dataKey}
          </span>
          <span style={{ color: "#9fb0d1", marginLeft: 8 }}>
            {formatUsdPrecise(Number(entry.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

export function MidPriceHistoryChart({ ticker, activeExchanges, timeframe }: MidPriceHistoryChartProps) {
  const { data, isLoading, error } = useMidPriceHistory(ticker, timeframe, activeExchanges);

  return (
    <div>
      {isLoading && (
        <p className="mb-2 text-xs text-[var(--text-muted)] animate-pulse">Loading…</p>
      )}
      {error ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
          {error}
        </div>
      ) : data.length === 0 && !isLoading ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
          No mid-price data available for this period.
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 4, right: 14, top: 6, bottom: 6 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(186, 213, 255, 0.12)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#9fb0d1", fontSize: 11 }}
                axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
                tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
                tickFormatter={(v: string) => formatXTick(v, timeframe)}
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: "#9fb0d1", fontSize: 11 }}
                axisLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
                tickLine={{ stroke: "rgba(186, 213, 255, 0.22)" }}
                tickFormatter={(v: number) => formatUsdCompact(v)}
                domain={["auto", "auto"]}
                label={{
                  value: "USD",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#9fb0d1", fontSize: 11 },
                }}
              />
              <Tooltip content={<MidPriceTooltip timeframe={timeframe} />} />

              {activeExchanges.map((exchange) => (
                <Line
                  key={exchange}
                  type="monotone"
                  dataKey={exchange}
                  stroke={EXCHANGE_COLORS[exchange]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  name={EXCHANGE_LABELS[exchange]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
