"use client";

import { useState } from "react";
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
import { useSlippageTimeSeries, type SlippageTier } from "@/hooks/use-slippage-timeseries";

interface SlippageHistoryChartProps {
  ticker: TickerKey;
  activeExchanges: ExchangeKey[];
  timeframe: SpreadTimeframe;
}

const TIER_OPTIONS: { value: SlippageTier; label: string }[] = [
  { value: "1k", label: "$1K" },
  { value: "10k", label: "$10K" },
  { value: "100k", label: "$100K" },
  { value: "1m", label: "$1M" },
];

function formatXTick(iso: string, tf: SpreadTimeframe): string {
  const d = new Date(iso);
  if (tf === "7d") return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTooltipTime(iso: string, tf: SpreadTimeframe): string {
  const d = new Date(iso);
  if (tf === "1h" || tf === "4h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ChartTooltip({ active, payload, label, timeframe }: any & { timeframe: SpreadTimeframe }) {
  if (!active || !payload?.length) return null;

  // Group entries by exchange for cleaner display
  const grouped = new Map<string, { ask?: number; bid?: number; color: string }>();
  for (const entry of payload) {
    if (entry.value == null) continue;
    const key = entry.dataKey as string; // e.g. "binance_ask"
    const [exchange, side] = key.split("_");
    if (!grouped.has(exchange)) {
      grouped.set(exchange, { color: EXCHANGE_COLORS[exchange as ExchangeKey] ?? "#888" });
    }
    const g = grouped.get(exchange)!;
    if (side === "ask") g.ask = Number(entry.value);
    if (side === "bid") g.bid = Number(entry.value);
  }

  return (
    <div
      style={{
        background: "#101c32",
        border: "1px solid rgba(141, 168, 213, 0.35)",
        borderRadius: "0.6rem",
        padding: "0.7rem 0.9rem",
        minWidth: 180,
      }}
    >
      <p style={{ color: "#e8eefb", fontSize: 11, marginBottom: 6, fontWeight: 600 }}>
        {formatTooltipTime(label, timeframe)}
      </p>
      {Array.from(grouped.entries()).map(([exchange, g]) => (
        <div key={exchange} style={{ marginBottom: 4 }}>
          <p style={{ color: g.color, fontSize: 12, fontWeight: 600, marginBottom: 1 }}>
            {EXCHANGE_LABELS[exchange as ExchangeKey] ?? exchange}
          </p>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9fb0d1" }}>
            {g.ask != null && <span>Ask: {g.ask.toFixed(2)} bps</span>}
            {g.bid != null && <span>Bid: {g.bid.toFixed(2)} bps</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SlippageHistoryChart({ ticker, activeExchanges, timeframe }: SlippageHistoryChartProps) {
  const [tier, setTier] = useState<SlippageTier>("10k");
  const { data, isLoading, error } = useSlippageTimeSeries(ticker, timeframe, activeExchanges, tier);

  return (
    <div>
      {/* Tier selector */}
      <div className="mb-4 flex items-center gap-1">
        {TIER_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setTier(o.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              o.value === tier
                ? "bg-[color:rgba(79,140,255,0.22)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[color:rgba(79,140,255,0.1)]"
            }`}
          >
            {o.label}
          </button>
        ))}
        {isLoading && (
          <span className="ml-2 text-xs text-[var(--text-muted)] animate-pulse">Loading…</span>
        )}
      </div>

      {error ? (
        <div className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
          {error}
        </div>
      ) : data.length === 0 && !isLoading ? (
        <div className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
          No slippage data available for this period.
        </div>
      ) : (
        <div className="h-[340px] w-full">
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
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                label={{
                  value: "bps",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#9fb0d1", fontSize: 11 },
                }}
              />
              <Tooltip content={<ChartTooltip timeframe={timeframe} />} />

              {activeExchanges.map((exchange) => (
                <Line
                  key={`${exchange}_ask`}
                  type="monotone"
                  dataKey={`${exchange}_ask`}
                  stroke={EXCHANGE_COLORS[exchange]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  name={`${EXCHANGE_LABELS[exchange]} Ask`}
                />
              ))}
              {activeExchanges.map((exchange) => (
                <Line
                  key={`${exchange}_bid`}
                  type="monotone"
                  dataKey={`${exchange}_bid`}
                  stroke={EXCHANGE_COLORS[exchange]}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  name={`${EXCHANGE_LABELS[exchange]} Bid`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Solid lines = Ask slippage · Dashed lines = Bid slippage
      </p>
    </div>
  );
}
