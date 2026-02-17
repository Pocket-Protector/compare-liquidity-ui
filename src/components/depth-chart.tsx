"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  EXCHANGES,
  EXCHANGE_COLORS,
  EXCHANGE_LABELS,
  NOTIONAL_TIERS,
} from "@/lib/constants";
import { EXCHANGE_REGISTRY } from "@/lib/exchanges";
import { fetchOrderbookRaw } from "@/lib/orderbook-client";
import type {
  BookLevel,
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  NormalizedBook,
  TickerKey,
} from "@/lib/types";

interface DepthChartProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  ticker: TickerKey;
  activeExchanges: ExchangeKey[];
}

interface AxisDebugSnapshot {
  chartWidth: number;
  chartHeight: number;
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
  xMin: number | null;
  xMax: number | null;
  xTicks: number[];
  yMin: number | null;
  yMax: number | null;
  yTicks: number[];
}

const FALLBACK_POLL_MS = 5_000;
const DEPTH_TARGET_OPTIONS = NOTIONAL_TIERS;

type DepthPoint = [number, number];
type BookSide = "bid" | "ask";
type DepthTargetNotional = (typeof DEPTH_TARGET_OPTIONS)[number];

function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value)) return "--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatBps(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(2)} bps`;
}

function formatBpsTick(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(1);
}

function formatTargetLabel(value: number): string {
  if (value >= 1_000_000) return `$${value / 1_000_000}M`;
  if (value >= 1_000) return `$${value / 1_000}K`;
  return `$${value}`;
}

function buildCumulativeNotional(
  levels: BookLevel[],
  midPrice: number,
  side: BookSide,
  depthTargetNotional: number,
): DepthPoint[] {
  let cumulative = 0;
  const points: DepthPoint[] = [[0, 0]];

  for (const level of levels) {
    if (cumulative >= depthTargetNotional) break;

    const levelNotional = level.px * level.sz;
    const remainingNotional = depthTargetNotional - cumulative;
    const usedNotional = Math.min(levelNotional, remainingNotional);
    cumulative += usedNotional;

    const signedBps = ((level.px - midPrice) / midPrice) * 10_000;
    if (side === "bid" && signedBps >= 0) continue;
    if (side === "ask" && signedBps <= 0) continue;

    points.push([Number(signedBps.toFixed(4)), Number(cumulative.toFixed(2))]);

    if (usedNotional < levelNotional) break;
  }

  // Keep x values monotonic for stable depth-shape rendering.
  points.sort((a, b) => a[0] - b[0]);

  return points;
}

interface ExchangeDepthSeries {
  exchange: ExchangeKey;
  bid: DepthPoint[];
  ask: DepthPoint[];
}

export function DepthChart({
  statuses,
  ticker,
  activeExchanges,
}: DepthChartProps) {
  const [fallbackBooks, setFallbackBooks] = useState<
    Partial<Record<ExchangeKey, NormalizedBook>>
  >({});
  const [depthTargetNotional, setDepthTargetNotional] =
    useState<DepthTargetNotional>(1_000_000);
  const [debugMode, setDebugMode] = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<AxisDebugSnapshot | null>(
    null,
  );
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const [chartInstance, setChartInstance] = useState<Highcharts.Chart | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("depthDebug") === "1") {
      setDebugMode(true);
    }
  }, []);

  const statusDepth = useMemo<ExchangeDepthSeries[]>(() => {
    return EXCHANGES.flatMap((exchange) => {
      const book = statuses[exchange].book;
      if (!book) return [];
      if (book.bids.length === 0 || book.asks.length === 0) return [];
      const midPrice = (book.bids[0].px + book.asks[0].px) / 2;

      const bid = buildCumulativeNotional(
        book.bids,
        midPrice,
        "bid",
        depthTargetNotional,
      );
      const ask = buildCumulativeNotional(
        book.asks,
        midPrice,
        "ask",
        depthTargetNotional,
      );
      if (bid.length === 0 || ask.length === 0) return [];

      return [{ exchange, bid, ask }];
    });
  }, [depthTargetNotional, statuses]);

  useEffect(() => {
    if (statusDepth.length > 0) return;

    let active = true;

    const pollFallbackBooks = async () => {
      const settled = await Promise.allSettled(
        EXCHANGES.map(async (exchange) => {
          const raw = await fetchOrderbookRaw(exchange, ticker);
          const book = EXCHANGE_REGISTRY[exchange].parse(raw);
          return { exchange, book };
        }),
      );

      if (!active) return;

      const next: Partial<Record<ExchangeKey, NormalizedBook>> = {};
      settled.forEach((result, idx) => {
        if (result.status !== "fulfilled") return;
        const exchange = EXCHANGES[idx];
        next[exchange] = result.value.book;
      });

      setFallbackBooks(next);
    };

    void pollFallbackBooks();
    const timer = window.setInterval(() => {
      void pollFallbackBooks();
    }, FALLBACK_POLL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [statusDepth.length, ticker]);

  const depthByExchange = useMemo<ExchangeDepthSeries[]>(() => {
    if (statusDepth.length > 0) return statusDepth;

    return EXCHANGES.flatMap((exchange) => {
      const book = fallbackBooks[exchange];
      if (!book) return [];
      if (book.bids.length === 0 || book.asks.length === 0) return [];
      const midPrice = (book.bids[0].px + book.asks[0].px) / 2;

      const bid = buildCumulativeNotional(
        book.bids,
        midPrice,
        "bid",
        depthTargetNotional,
      );
      const ask = buildCumulativeNotional(
        book.asks,
        midPrice,
        "ask",
        depthTargetNotional,
      );
      if (bid.length === 0 || ask.length === 0) return [];

      return [{ exchange, bid, ask }];
    });
  }, [depthTargetNotional, fallbackBooks, statusDepth]);

  const visibleDepth = useMemo(
    () =>
      depthByExchange.filter((entry) =>
        activeExchanges.includes(entry.exchange),
      ),
    [activeExchanges, depthByExchange],
  );

  const maxAbsBps = useMemo(() => {
    return visibleDepth.reduce((acc, entry) => {
      const localMax = [...entry.bid, ...entry.ask].reduce(
        (m, point) => Math.max(m, Math.abs(point[0])),
        0,
      );
      return Math.max(acc, localMax);
    }, 0);
  }, [visibleDepth]);

  const axisLimit = useMemo(
    () => Math.max(5, Number((maxAbsBps * 1.12).toFixed(2))),
    [maxAbsBps],
  );

  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el) return;

    const update = () => {
      setContainerSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!debugMode || !chartInstance) return;

    const capture = () => {
      const xAxis = chartInstance.xAxis[0];
      const yAxis = chartInstance.yAxis[0];

      setDebugSnapshot({
        chartWidth: chartInstance.chartWidth,
        chartHeight: chartInstance.chartHeight,
        plotLeft: chartInstance.plotLeft,
        plotTop: chartInstance.plotTop,
        plotWidth: chartInstance.plotWidth,
        plotHeight: chartInstance.plotHeight,
        xMin: Number.isFinite(xAxis?.min ?? NaN) ? Number(xAxis.min) : null,
        xMax: Number.isFinite(xAxis?.max ?? NaN) ? Number(xAxis.max) : null,
        xTicks: Array.isArray(xAxis?.tickPositions)
          ? [...xAxis.tickPositions]
          : [],
        yMin: Number.isFinite(yAxis?.min ?? NaN) ? Number(yAxis.min) : null,
        yMax: Number.isFinite(yAxis?.max ?? NaN) ? Number(yAxis.max) : null,
        yTicks: Array.isArray(yAxis?.tickPositions)
          ? [...yAxis.tickPositions]
          : [],
      });
    };

    capture();
    const timer = window.setInterval(capture, 700);
    return () => window.clearInterval(timer);
  }, [debugMode, chartInstance]);

  const options = useMemo<Highcharts.Options>(() => {
    const chartHeight = Math.max(320, Math.floor(containerSize.height || 460));

    const series: Highcharts.SeriesOptionsType[] = visibleDepth.flatMap(
      ({ exchange, bid, ask }) => {
        const color = EXCHANGE_COLORS[exchange];
        const label = EXCHANGE_LABELS[exchange];

        const bidSeries: Highcharts.SeriesAreaOptions = {
          type: "area",
          name: `${label} bid`,
          data: bid,
          color,
          lineWidth: 1.1,
          fillOpacity: 0.08,
          threshold: null,
          turboThreshold: 0,
        };

        const askSeries: Highcharts.SeriesAreaOptions = {
          type: "area",
          name: `${label} ask`,
          data: ask,
          color,
          lineWidth: 1.1,
          fillOpacity: 0.02,
          dashStyle: "ShortDash",
          showInLegend: false,
          threshold: null,
          turboThreshold: 0,
        };

        return [bidSeries, askSeries];
      },
    );

    return {
      chart: {
        backgroundColor: "transparent",
        animation: false,
        marginBottom: 86,
        marginLeft: 68,
        marginRight: 18,
        marginTop: 12,
        height: chartHeight,
        spacing: [8, 8, 28, 8],
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      legend: {
        enabled: false,
      },
      xAxis: {
        min: -axisLimit,
        max: axisLimit,
        tickAmount: 9,
        lineWidth: 1,
        tickWidth: 1,
        tickLength: 6,
        tickPosition: "outside",
        startOnTick: false,
        endOnTick: false,
        title: {
          text: "Distance From Mid (bps)",
          margin: 20,
          style: { color: "#9fb0d1", fontSize: "11px" },
        },
        labels: {
          style: { color: "#9fb0d1", fontSize: "11px" },
          y: 18,
          formatter() {
            return formatBpsTick(Number(this.value));
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
        max: depthTargetNotional,
        tickInterval: depthTargetNotional / 4,
        title: {
          text: "Cumulative Notional",
          margin: 10,
          style: { color: "#9fb0d1", fontSize: "11px" },
        },
        labels: {
          style: { color: "#9fb0d1", fontSize: "11px" },
          x: -6,
          formatter() {
            return formatUsdCompact(Number(this.value));
          },
        },
        gridLineColor: "rgba(186, 213, 255, 0.12)",
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "#101c32",
        borderColor: "rgba(141, 168, 213, 0.35)",
        style: { color: "#e8eefb", fontSize: "12px" },
        formatter() {
          const ctx = this as {
            x?: number;
            points?: Array<{
              color?: string;
              y?: number;
              series: { name: string };
            }>;
          };
          const bps = formatBps(Number(ctx.x));
          const lines = (ctx.points ?? [])
            .map(
              (point: {
                color?: string;
                y?: number;
                series: { name: string };
              }) => {
                const marker = `<span style="color:${point.color}">\u25CF</span>`;
                return `${marker} ${point.series.name}: <b>${formatUsdCompact(Number(point.y))}</b>`;
              },
            )
            .join("<br/>");

          return `<span style="color:#9fb0d1">From mid: ${bps}</span><br/><span style="color:#9fb0d1">Per-side cap ${formatUsdCompact(depthTargetNotional)} | Live updates</span><br/>${lines}`;
        },
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
          step: "left",
          states: {
            inactive: { opacity: 1 },
          },
        },
      },
      series,
    };
  }, [axisLimit, containerSize.height, depthTargetNotional, visibleDepth]);

  const manualRulerTicks = useMemo(() => {
    const fractions = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
    return fractions.map((f) => Number((f * axisLimit).toFixed(1)));
  }, [axisLimit]);

  if (depthByExchange.length === 0) {
    return (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-sm text-[var(--text-muted)]">
        Waiting for live order book depth to render {ticker} depth chart.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--text-muted)]">
        Each exchange contributes bid/ask cumulative notional curves up to{" "}
        {formatUsdCompact(depthTargetNotional)} per side.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">
          Per-side depth cap:
        </span>
        {DEPTH_TARGET_OPTIONS.map((target) => {
          const isActive = depthTargetNotional === target;
          return (
            <button
              key={target}
              type="button"
              onClick={() => setDepthTargetNotional(target)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                isActive
                  ? "border-[color:var(--accent)] bg-[color:rgba(79,140,255,0.16)] text-[var(--text-primary)]"
                  : "border-[color:var(--border)] text-[var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[var(--text-primary)]"
              }`}
            >
              {formatTargetLabel(target)}
            </button>
          );
        })}
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] opacity-45"
          title="Debug toggle is disabled"
        >
          Debug
        </button>
      </div>
      <div
        ref={chartWrapperRef}
        className="h-[460px] w-full rounded-xl border border-[color:var(--border)]"
      >
        {visibleDepth.length > 0 ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            containerProps={{ style: { height: "100%" } }}
            callback={(chart: Highcharts.Chart) => setChartInstance(chart)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            No active exchange has depth data for {ticker}.
          </div>
        )}
      </div>
      {debugMode ? (
        <div className="space-y-2 rounded-lg border border-[color:rgba(255,111,124,0.4)] bg-[color:rgba(255,111,124,0.08)] p-3 text-xs text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">
            Depth Debug Mode
          </p>
          <p>
            Container: {containerSize.width}px x {containerSize.height}px,
            visible exchanges: {visibleDepth.length}, axisLimit: +/-
            {axisLimit.toFixed(2)} bps, cap:{" "}
            {formatUsdCompact(depthTargetNotional)}
          </p>
          {debugSnapshot ? (
            <p>
              Plot box: left {debugSnapshot.plotLeft}, top{" "}
              {debugSnapshot.plotTop}, width {debugSnapshot.plotWidth}, height{" "}
              {debugSnapshot.plotHeight}; chart {debugSnapshot.chartWidth} x{" "}
              {debugSnapshot.chartHeight}
            </p>
          ) : (
            <p>Chart snapshot unavailable yet.</p>
          )}
          {debugSnapshot ? (
            <p>
              X ticks:{" "}
              {debugSnapshot.xTicks.map((v) => formatBpsTick(v)).join(", ")} | Y
              ticks:{" "}
              {debugSnapshot.yTicks.map((v) => formatUsdCompact(v)).join(", ")}
            </p>
          ) : null}
          <div>
            <p className="mb-1">Manual X ruler (bps)</p>
            <div className="grid grid-cols-9 gap-1">
              {manualRulerTicks.map((tick, idx) => (
                <div
                  key={`${tick}-${idx}`}
                  className="rounded border border-[color:var(--border)] px-1 py-0.5 text-center"
                >
                  {formatBpsTick(tick)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
