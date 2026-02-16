"use client";

import { useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { EXCHANGE_COLORS, EXCHANGE_LABELS, NOTIONAL_TIERS } from "@/lib/constants";
import { formatTier } from "@/lib/format";
import { useSlippageHistory } from "@/hooks/use-slippage-history";
import type { SpreadTimeframe } from "@/lib/timeframes";
import type { ExchangeKey, TickerKey } from "@/lib/types";

interface HistoricalDepthChartProps {
  ticker: TickerKey;
  timeframe: SpreadTimeframe;
  activeExchanges: ExchangeKey[];
}

type DepthPoint = [number, number];

interface ExchangeDepthCurve {
  exchange: ExchangeKey;
  ask: DepthPoint[];
  bid: DepthPoint[];
}

type DepthTargetNotional = (typeof NOTIONAL_TIERS)[number];

function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value)) return "--";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatBps(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)} bps`;
}

function toFinite(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

export function HistoricalDepthChart({ ticker, timeframe, activeExchanges }: HistoricalDepthChartProps) {
  const { askData, bidData, isLoading, error } = useSlippageHistory(ticker, timeframe, activeExchanges);
  const [depthTargetNotional, setDepthTargetNotional] = useState<DepthTargetNotional>(1_000_000);

  const selectedTierIndex = useMemo(() => {
    const idx = NOTIONAL_TIERS.findIndex((tier) => tier === depthTargetNotional);
    return idx >= 0 ? idx : NOTIONAL_TIERS.length - 1;
  }, [depthTargetNotional]);

  const tiersToUse = useMemo(
    () => NOTIONAL_TIERS.slice(0, selectedTierIndex + 1),
    [selectedTierIndex]
  );

  const tierToY = useMemo(() => {
    const map = new Map<number, number>();
    tiersToUse.forEach((tier, idx) => map.set(tier, idx + 1));
    return map;
  }, [tiersToUse]);

  const yToTier = useMemo(() => {
    const map = new Map<number, number>();
    tiersToUse.forEach((tier, idx) => map.set(idx + 1, tier));
    return map;
  }, [tiersToUse]);

  const curves = useMemo<ExchangeDepthCurve[]>(() => {
    return activeExchanges.flatMap((exchange) => {
      const askPoints: DepthPoint[] = [[0, 0]];
      const bidPoints: DepthPoint[] = [[0, 0]];

      tiersToUse.forEach((tier, idx) => {
        const yPos = tierToY.get(tier);
        if (yPos == null) return;
        const askBps = toFinite(askData[idx]?.[exchange]);
        const bidBps = toFinite(bidData[idx]?.[exchange]);
        if (askBps != null) askPoints.push([askBps, yPos]);
        if (bidBps != null) bidPoints.push([-Math.abs(bidBps), yPos]);
      });

      if (askPoints.length === 1 && bidPoints.length === 1) return [];

      return [{ exchange, ask: askPoints, bid: bidPoints }];
    });
  }, [activeExchanges, askData, bidData, tierToY, tiersToUse]);

  const maxAbsBps = useMemo(() => {
    return curves.reduce((acc, curve) => {
      const local = [...curve.ask, ...curve.bid].reduce((m, [x]) => Math.max(m, Math.abs(x)), 0);
      return Math.max(acc, local);
    }, 0);
  }, [curves]);

  const axisLimit = useMemo(() => Math.max(2, Number((maxAbsBps * 1.2).toFixed(2))), [maxAbsBps]);

  const options = useMemo<Highcharts.Options>(() => {
    const yTickPositions = [0, ...tiersToUse.map((_, idx) => idx + 1)];

    const series: Highcharts.SeriesOptionsType[] = curves.flatMap((curve) => {
      const exchange = curve.exchange;
      const color = EXCHANGE_COLORS[exchange];
      const label = EXCHANGE_LABELS[exchange];

      const out: Highcharts.SeriesOptionsType[] = [];

      if (curve.ask.length > 1) {
        out.push({
          type: "line",
          name: `${label} ask`,
          data: curve.ask,
          color,
          lineWidth: 1.8,
          marker: { enabled: true, radius: 2.5 },
          step: "left",
          dashStyle: "Solid",
          turboThreshold: 0,
        } satisfies Highcharts.SeriesLineOptions);
      }

      if (curve.bid.length > 1) {
        out.push({
          type: "line",
          name: `${label} bid`,
          data: curve.bid,
          color,
          lineWidth: 1.8,
          marker: { enabled: true, radius: 2.5 },
          step: "left",
          dashStyle: "ShortDash",
          turboThreshold: 0,
          showInLegend: false,
        } satisfies Highcharts.SeriesLineOptions);
      }

      return out;
    });

    return {
      chart: {
        backgroundColor: "transparent",
        animation: false,
        marginBottom: 68,
        marginLeft: 72,
        marginRight: 16,
        marginTop: 12,
        height: 460,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        min: -axisLimit,
        max: axisLimit,
        tickAmount: 9,
        lineWidth: 1,
        tickWidth: 1,
        tickLength: 6,
        title: {
          text: "Distance From Mid (bps)",
          margin: 18,
          style: { color: "#9fb0d1", fontSize: "11px" },
        },
        labels: {
          style: { color: "#9fb0d1", fontSize: "11px" },
          formatter() {
            return Number(this.value).toFixed(1);
          },
        },
        plotLines: [
          {
            color: "rgba(232, 238, 251, 0.32)",
            value: 0,
            width: 1,
            dashStyle: "ShortDot",
            zIndex: 3,
          },
        ],
        gridLineColor: "rgba(186, 213, 255, 0.12)",
        lineColor: "rgba(186, 213, 255, 0.22)",
        tickColor: "rgba(186, 213, 255, 0.22)",
      },
      yAxis: {
        min: 0,
        max: tiersToUse.length,
        tickPositions: yTickPositions,
        title: {
          text: "Fill Notional (Tier-Spaced)",
          margin: 12,
          style: { color: "#9fb0d1", fontSize: "11px" },
        },
        labels: {
          style: { color: "#9fb0d1", fontSize: "11px" },
          formatter() {
            const yPos = Number(this.value);
            if (yPos === 0) return "$0";
            const tier = yToTier.get(Math.round(yPos));
            return tier != null ? formatTier(tier) : "";
          },
        },
        gridLineColor: "rgba(186, 213, 255, 0.12)",
      },
      tooltip: {
        shared: false,
        useHTML: true,
        backgroundColor: "#101c32",
        borderColor: "rgba(141, 168, 213, 0.35)",
        style: { color: "#e8eefb", fontSize: "12px" },
        formatter() {
          const ctx = this as any;
          const x = Number(ctx.x);
          const yPos = Number(ctx.y);
          const seriesName = typeof ctx.series?.name === "string" ? ctx.series.name : "";
          const markerColor = ctx.color ? String(ctx.color) : "#9fb0d1";
          const marker = `<span style="color:${markerColor}">\u25CF</span>`;
          const tier = yToTier.get(Math.round(yPos));
          const fillNotional = yPos === 0 ? "$0" : tier != null ? formatTier(tier) : formatUsdCompact(yPos);

          return `${marker} ${seriesName}<br/><span style="color:#9fb0d1">From mid: ${formatBps(x)}</span><br/><span style="color:#9fb0d1">Fill notional: ${fillNotional}</span>`;
        },
      },
      plotOptions: {
        series: {
          animation: false,
          states: {
            inactive: { opacity: 1 },
          },
        },
      },
      series,
    };
  }, [axisLimit, curves, tiersToUse, yToTier]);

  if (error) {
    return (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
        {error}
      </div>
    );
  }

  if (!isLoading && curves.length === 0) {
    return (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
        No historical depth proxies available for {ticker} in this timeframe.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--text-muted)]">
        Historical depth proxy from median slippage tiers, using equal vertical spacing between tier levels. Curves step through each tier level ($1K, $10K, $100K, $1M). Solid lines are ask-side and dashed lines are bid-side.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">Per-side depth cap:</span>
        {NOTIONAL_TIERS.map((tier) => {
          const isActive = depthTargetNotional === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setDepthTargetNotional(tier)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                isActive
                  ? "border-[color:var(--accent)] bg-[color:rgba(79,140,255,0.16)] text-[var(--text-primary)]"
                  : "border-[color:var(--border)] text-[var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[var(--text-primary)]"
              }`}
            >
              {formatTier(tier)}
            </button>
          );
        })}
      </div>
      {isLoading ? (
        <p className="text-xs text-[var(--text-muted)] animate-pulse">Loading historical depth data...</p>
      ) : null}
      <div className="h-[460px] w-full rounded-xl border border-[color:var(--border)]">
        <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: "100%" } }} />
      </div>
    </div>
  );
}
