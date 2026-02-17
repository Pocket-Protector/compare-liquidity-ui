"use client";

import { useState } from "react";
import { EXCHANGE_LABELS } from "@/lib/constants";
import { TIMEFRAME_LABELS, type SpreadTimeframe } from "@/lib/timeframes";
import type { ConsoleMode } from "./mode-selector";
import type {
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  SpreadUnit,
  TickerKey,
} from "@/lib/types";
import { DataTable } from "./data-table";
import { DepthChart } from "./depth-chart";
import { HistoricalDepthChart } from "./historical-depth-chart";
import { MidPriceHistoryChart } from "./midprice-history-chart";
import { SlippageHistoryChart } from "./slippage-history-chart";
import { SlippagePanel } from "./slippage-panel";

interface DashboardProps {
  ticker: TickerKey;
  statuses: ExchangeRecord<ExchangeStatus>;
  lastRefreshAt: number | null;
  activeExchanges: ExchangeKey[];
  consoleMode: ConsoleMode;
  timeframe: SpreadTimeframe;
}

export function Dashboard({
  ticker,
  statuses,
  lastRefreshAt,
  activeExchanges,
  consoleMode,
  timeframe,
}: DashboardProps) {
  const [spreadUnit, setSpreadUnit] = useState<SpreadUnit>("bps");
  const failedExchanges = activeExchanges.filter((exchange) =>
    Boolean(statuses[exchange].error),
  );
  const isHistorical = consoleMode === "historical";

  return (
    <section className="space-y-5">
      {failedExchanges.length > 0 ? (
        <div className="panel border-[color:rgba(255,111,124,0.5)] text-sm text-[var(--text-secondary)]">
          Some exchanges are currently unavailable:{" "}
          {failedExchanges
            .map((exchange) => EXCHANGE_LABELS[exchange])
            .join(", ")}
          .
        </div>
      ) : null}

      <SlippagePanel
        statuses={statuses}
        ticker={ticker}
        spreadUnit={spreadUnit}
        activeExchanges={activeExchanges}
        consoleMode={consoleMode}
        timeframe={timeframe}
      />

      {isHistorical ? (
        <section className="panel">
          <div className="mb-4 space-y-1">
            <p className="label">Detailed analytics</p>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {ticker} Slippage Time Series — {TIMEFRAME_LABELS[timeframe]}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Ask and bid slippage over time per exchange. Select a notional
              tier to compare.
            </p>
          </div>
          <SlippageHistoryChart
            ticker={ticker}
            activeExchanges={activeExchanges}
            timeframe={timeframe}
          />
        </section>
      ) : (
        <DataTable
          statuses={statuses}
          ticker={ticker}
          lastRefreshAt={lastRefreshAt}
          spreadUnit={spreadUnit}
          activeExchanges={activeExchanges}
          onToggleUnit={() =>
            setSpreadUnit((u) => (u === "bps" ? "pct" : "bps"))
          }
        />
      )}

      {isHistorical && (
        <section className="panel">
          <div className="mb-4 space-y-1">
            <p className="label">Price tracker</p>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {ticker} Mid-Price History — {TIMEFRAME_LABELS[timeframe]}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Mid-price (best bid + best ask) / 2 over time per exchange.
            </p>
          </div>
          <MidPriceHistoryChart
            ticker={ticker}
            activeExchanges={activeExchanges}
            timeframe={timeframe}
          />
        </section>
      )}

      <section className="panel">
        <div className="mb-4 space-y-1">
          <p className="label">Order book depth</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {ticker} Multi-Exchange Depth Curves
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {isHistorical
              ? "Historical median depth proxy using $1K, $10K, $100K, and $1M fill tiers for the selected timeframe."
              : "Compare bid/ask cumulative depth by exchange, with per-side cap presets from $1K to $1M."}
          </p>
        </div>
        {isHistorical ? (
          <HistoricalDepthChart
            ticker={ticker}
            timeframe={timeframe}
            activeExchanges={activeExchanges}
          />
        ) : (
          <DepthChart
            statuses={statuses}
            ticker={ticker}
            activeExchanges={activeExchanges}
          />
        )}
      </section>
    </section>
  );
}
