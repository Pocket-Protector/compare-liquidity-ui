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
import { useSpreadHistory, type SpreadTimeframe } from "@/hooks/use-spread-history";

interface SpreadHistoryChartProps {
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

function HistoryTooltip({
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
            {Number(entry.value).toFixed(2)} bps
          </span>
        </p>
      ))}
    </div>
  );
}

export function SpreadHistoryChart({ ticker, activeExchanges, timeframe }: SpreadHistoryChartProps) {
  const { data, isLoading, error } = useSpreadHistory(ticker, timeframe, activeExchanges);

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
          No historical spread data available for this period.
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
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                label={{
                  value: "bps",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#9fb0d1", fontSize: 11 },
                }}
              />
              <Tooltip content={<HistoryTooltip timeframe={timeframe} />} />

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
