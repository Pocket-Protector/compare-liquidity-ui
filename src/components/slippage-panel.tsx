"use client";

import type { ConsoleMode } from "./mode-selector";
import type { SpreadTimeframe } from "@/lib/timeframes";
import { TIMEFRAME_LABELS } from "@/lib/timeframes";
import type {
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  SpreadUnit,
  TickerKey,
} from "@/lib/types";
import { useSlippageHistory } from "@/hooks/use-slippage-history";
import { SlippageChart } from "./slippage-chart";
import { SpreadCompareChart } from "./spread-compare-chart";
import { SpreadHistoryChart } from "./spread-history-chart";

interface SlippagePanelProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  ticker: TickerKey;
  spreadUnit: SpreadUnit;
  activeExchanges: ExchangeKey[];
  consoleMode: ConsoleMode;
  timeframe: SpreadTimeframe;
}

export function SlippagePanel({
  statuses,
  ticker,
  spreadUnit,
  activeExchanges,
  consoleMode,
  timeframe,
}: SlippagePanelProps) {
  const isHistorical = consoleMode === "historical";
  const tfLabel = TIMEFRAME_LABELS[timeframe];

  const {
    askData,
    bidData,
    isLoading: slippageLoading,
  } = useSlippageHistory(
    ticker,
    timeframe,
    isHistorical ? activeExchanges : [],
  );

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {/* ── Spread monitor ───────────────────────────────────────── */}
      <article className="panel xl:col-span-2">
        <div className="mb-4 space-y-1">
          <p className="label">Spread monitor</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {ticker}{" "}
            {isHistorical
              ? `Historical Spread — ${tfLabel}`
              : "Live Spread Comparison"}
          </h3>
        </div>
        {isHistorical ? (
          <SpreadHistoryChart
            ticker={ticker}
            activeExchanges={activeExchanges}
            timeframe={timeframe}
          />
        ) : (
          <SpreadCompareChart
            statuses={statuses}
            spreadUnit={spreadUnit}
            activeExchanges={activeExchanges}
          />
        )}
      </article>

      {/* ── Ask slippage ─────────────────────────────────────────── */}
      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Buying pressure</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {ticker} Ask Slippage{isHistorical ? ` — ${tfLabel} (Median)` : ""}
          </h3>
        </div>
        {slippageLoading && isHistorical && (
          <p className="mb-2 text-xs text-[var(--text-muted)] animate-pulse">
            Loading…
          </p>
        )}
        <SlippageChart
          side="ask"
          statuses={statuses}
          spreadUnit={spreadUnit}
          activeExchanges={activeExchanges}
          historicalData={isHistorical ? askData : undefined}
        />
      </article>

      {/* ── Bid slippage ─────────────────────────────────────────── */}
      <article className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Selling pressure</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {ticker} Bid Slippage{isHistorical ? ` — ${tfLabel} (Median)` : ""}
          </h3>
        </div>
        {slippageLoading && isHistorical && (
          <p className="mb-2 text-xs text-[var(--text-muted)] animate-pulse">
            Loading…
          </p>
        )}
        <SlippageChart
          side="bid"
          statuses={statuses}
          spreadUnit={spreadUnit}
          activeExchanges={activeExchanges}
          historicalData={isHistorical ? bidData : undefined}
        />
      </article>
    </section>
  );
}
