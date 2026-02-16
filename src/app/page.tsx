"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import { ModeSelector, type ConsoleMode } from "@/components/mode-selector";
import { SpreadCards } from "@/components/spread-cards";
import { TickerSelector } from "@/components/ticker-selector";
import { TimeframeSelector } from "@/components/timeframe-selector";
import { useLiquidityPoll } from "@/hooks/use-liquidity-poll";
import type { SpreadTimeframe } from "@/lib/timeframes";
import { EXCHANGES } from "@/lib/constants";
import type { ExchangeKey, TickerKey } from "@/lib/types";

const HISTORICAL_TICKERS: TickerKey[] = ["BTC", "ETH", "SOL", "PAXG", "ZEC", "BONK", "XRP"];
const HISTORICAL_TICKER_SET = new Set<TickerKey>(HISTORICAL_TICKERS);

export default function HomePage() {
  const [ticker, setTicker] = useState<TickerKey>("BTC");
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>("realtime");
  const [timeframe, setTimeframe] = useState<SpreadTimeframe>("1h");
  const [activeExchanges, setActiveExchanges] = useState<ExchangeKey[]>(EXCHANGES);
  const { statuses, lastRefreshAt, hasData, isLoading } = useLiquidityPoll(ticker);

  useEffect(() => {
    if (consoleMode !== "historical") return;
    if (HISTORICAL_TICKER_SET.has(ticker)) return;
    setTicker(HISTORICAL_TICKERS[0]);
  }, [consoleMode, ticker]);

  const toggleExchange = (exchange: ExchangeKey) => {
    setActiveExchanges((current) => {
      if (current.includes(exchange)) {
        if (current.length === 1) return current;
        return current.filter((key) => key !== exchange);
      }
      return [...current, exchange];
    });
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Header />

        <section className="panel relative z-10 space-y-4">
          <div className="space-y-2">
            <p className="label">Console</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">{ticker} Liquidity Dashboard</h2>
            <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
              Monitoring Hyperliquid, dYdX, Lighter, AsterDEX, Binance, and Bybit in near real time.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <TickerSelector
              label="Select Ticker"
              value={ticker}
              onChange={setTicker}
              allowedTickers={consoleMode === "historical" ? HISTORICAL_TICKERS : undefined}
            />
            <ModeSelector value={consoleMode} onChange={setConsoleMode} />
            <TimeframeSelector value={timeframe} onChange={setTimeframe} disabled={consoleMode !== "historical"} />
          </div>

          <SpreadCards
            statuses={statuses}
            activeExchanges={activeExchanges}
            onToggleExchange={toggleExchange}
          />
        </section>

        {isLoading && !hasData ? (
          <section className="panel faint-grid min-h-56 animate-pulse">
            <p className="label">Loading market depth</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Fetching initial order books and computing slippage tiers.</p>
          </section>
        ) : (
          <Dashboard
            ticker={ticker}
            statuses={statuses}
            lastRefreshAt={lastRefreshAt}
            activeExchanges={activeExchanges}
            consoleMode={consoleMode}
            timeframe={timeframe}
          />
        )}
      </div>
    </main>
  );
}
