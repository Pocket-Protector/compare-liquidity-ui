"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXCHANGES, NOTIONAL_TIERS, POLL_INTERVAL_MS } from "@/lib/constants";
import { EXCHANGE_REGISTRY } from "@/lib/exchanges";
import { fetchLighterBookWs } from "@/lib/lighter-ws";
import { fetchOrderbookRaw } from "@/lib/orderbook-client";
import { isTickerSupportedOnExchange } from "@/lib/pair-mapping";
import { analyzeBook } from "@/lib/slippage";
import type {
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  LiquidityAnalysis,
  NormalizedBook,
  SlippageResult,
  TickerKey,
} from "@/lib/types";

function createInitialStatuses(): ExchangeRecord<ExchangeStatus> {
  return EXCHANGES.reduce((acc, exchange) => {
    acc[exchange] = {
      exchange,
      loading: true,
      error: null,
      lastUpdated: null,
      analysis: null,
      book: null,
    };
    return acc;
  }, {} as ExchangeRecord<ExchangeStatus>);
}

type PollOutcome = {
  exchange: ExchangeKey;
  analysis: LiquidityAnalysis;
  book: NormalizedBook;
};

function hasPartialFill(analysis: LiquidityAnalysis): boolean {
  return [...analysis.bids, ...analysis.asks].some((point) => !point.filled);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    if (/^Timeout after \d+ms/.test(error.message)) {
      return "Request timed out";
    }
    return error.message;
  }
  return "Unknown polling error";
}

const HYPERLIQUID_SIG_FIGS = [5, 4, 3, 2] as const;

async function pollExchange(
  exchange: ExchangeKey,
  ticker: TickerKey,
): Promise<PollOutcome> {
  if (exchange === "hyperliquid") {
    return pollHyperliquid(ticker);
  }

  if (exchange === "lighter") {
    return pollLighter(ticker);
  }

  const raw = await fetchOrderbookRaw(exchange, ticker);
  const book = EXCHANGE_REGISTRY[exchange].parse(raw);
  const analysis = analyzeBook({ ticker, exchange, book });
  return { exchange, analysis, book };
}

async function pollHyperliquid(ticker: TickerKey): Promise<PollOutcome> {
  const exchange = "hyperliquid" as const;
  const tierCount = NOTIONAL_TIERS.length;

  const finalBids: SlippageResult[] = new Array(tierCount);
  const finalAsks: SlippageResult[] = new Array(tierCount);
  // Track which nSigFigs was used for each tier (take the coarser of bid/ask)
  const perTierSigFigs: number[] = new Array(tierCount).fill(5);
  let bidCursor = 0;
  let askCursor = 0;
  let baseAnalysis: LiquidityAnalysis | null = null;
  let lastAnalysis: LiquidityAnalysis | null = null;
  let baseBook: NormalizedBook | null = null;
  let lastBook: NormalizedBook | null = null;
  let coarsestUsed = 5;

  for (const nSigFigs of HYPERLIQUID_SIG_FIGS) {
    if (bidCursor >= tierCount && askCursor >= tierCount) break;

    let analysis: LiquidityAnalysis;
    let book: NormalizedBook;
    try {
      const raw = await fetchOrderbookRaw(exchange, ticker, {
        hyperliquid: { nSigFigs },
      });
      book = EXCHANGE_REGISTRY[exchange].parse(raw);
      analysis = analyzeBook({ ticker, exchange, book });
    } catch {
      break;
    }

    if (!baseAnalysis) baseAnalysis = analysis;
    if (!baseBook) baseBook = book;
    lastAnalysis = analysis;
    lastBook = book;

    while (bidCursor < tierCount && analysis.bids[bidCursor].filled) {
      finalBids[bidCursor] = analysis.bids[bidCursor];
      perTierSigFigs[bidCursor] = Math.min(perTierSigFigs[bidCursor], nSigFigs);
      bidCursor++;
      if (nSigFigs < coarsestUsed) coarsestUsed = nSigFigs;
    }

    while (askCursor < tierCount && analysis.asks[askCursor].filled) {
      finalAsks[askCursor] = analysis.asks[askCursor];
      perTierSigFigs[askCursor] = Math.min(perTierSigFigs[askCursor], nSigFigs);
      askCursor++;
      if (nSigFigs < coarsestUsed) coarsestUsed = nSigFigs;
    }
  }

  // Fill remaining unfilled tiers with the coarsest data we fetched (still partial)
  const fallback = lastAnalysis ?? baseAnalysis;
  if (!fallback) throw new Error("Hyperliquid orderbook fetch failed");
  const finalBook = lastBook ?? baseBook;
  if (!finalBook) throw new Error("Hyperliquid orderbook parse failed");

  const coarsest = HYPERLIQUID_SIG_FIGS[HYPERLIQUID_SIG_FIGS.length - 1];
  for (let i = bidCursor; i < tierCount; i++) {
    finalBids[i] = fallback.bids[i];
    perTierSigFigs[i] = Math.min(perTierSigFigs[i], coarsest);
  }
  for (let i = askCursor; i < tierCount; i++) {
    finalAsks[i] = fallback.asks[i];
    perTierSigFigs[i] = Math.min(perTierSigFigs[i], coarsest);
  }
  if (bidCursor < tierCount || askCursor < tierCount) {
    coarsestUsed = coarsest;
  }

  // Use nSigFigs=5 base for spread/mid (most accurate), merge per-tier slippage
  const base = baseAnalysis ?? fallback;
  return {
    exchange,
    book: finalBook,
    analysis: {
      ...base,
      bids: finalBids,
      asks: finalAsks,
      meta: {
        isAggregatedEstimate: coarsestUsed < 5,
        hyperliquidNSigFigs: coarsestUsed,
        hyperliquidNSigFigsPerTier: perTierSigFigs,
      },
    },
  };
}

async function pollLighter(ticker: TickerKey): Promise<PollOutcome> {
  const exchange = "lighter" as const;

  const raw = await fetchOrderbookRaw(exchange, ticker);
  const restBook = EXCHANGE_REGISTRY[exchange].parse(raw);
  const restAnalysis = analyzeBook({ ticker, exchange, book: restBook });

  if (!hasPartialFill(restAnalysis)) {
    return { exchange, analysis: restAnalysis, book: restBook };
  }

  try {
    const wsBook = await fetchLighterBookWs(ticker);
    const wsAnalysis = analyzeBook({
      ticker,
      exchange,
      book: wsBook,
      meta: { lighterWsFallback: true },
    });

    return { exchange, analysis: wsAnalysis, book: wsBook };
  } catch {
    return { exchange, analysis: restAnalysis, book: restBook };
  }
}

export function useLiquidityPoll(
  ticker: TickerKey,
  activeExchanges: readonly ExchangeKey[] = EXCHANGES,
): {
  statuses: ExchangeRecord<ExchangeStatus>;
  lastRefreshAt: number | null;
  hasData: boolean;
  isLoading: boolean;
} {
  const [statuses, setStatuses] = useState<ExchangeRecord<ExchangeStatus>>(() =>
    createInitialStatuses(),
  );
  const inFlightRef = useRef(false);
  const pollRunIdRef = useRef(0);
  const monitoredExchanges = useMemo(
    () =>
      EXCHANGES.filter(
        (exchange) =>
          activeExchanges.includes(exchange) &&
          isTickerSupportedOnExchange(ticker, exchange),
      ),
    [activeExchanges, ticker],
  );

  useEffect(() => {
    setStatuses(createInitialStatuses());
  }, [ticker]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const runId = ++pollRunIdRef.current;
      const monitoredSet = new Set(monitoredExchanges);

      setStatuses((prev) => {
        const next = { ...prev };
        for (const exchange of EXCHANGES) {
          const isMonitored = monitoredSet.has(exchange);
          next[exchange] = {
            ...next[exchange],
            loading: isMonitored,
            error: isMonitored ? null : next[exchange].error,
          };
        }
        return next;
      });

      let pending = monitoredExchanges.length;
      if (pending === 0) {
        if (pollRunIdRef.current === runId) {
          inFlightRef.current = false;
        }
        return;
      }

      const markDone = () => {
        pending -= 1;
        if (pending === 0 && pollRunIdRef.current === runId) {
          inFlightRef.current = false;
        }
      };

      for (const exchange of monitoredExchanges) {
        void pollExchange(exchange, ticker)
          .then(({ analysis, book }) => {
            if (!active || pollRunIdRef.current !== runId) return;
            const now = Date.now();
            setStatuses((prev) => ({
              ...prev,
              [exchange]: {
                exchange,
                loading: false,
                error: null,
                lastUpdated: now,
                analysis,
                book,
              },
            }));
          })
          .catch((error: unknown) => {
            if (!active || pollRunIdRef.current !== runId) return;
            setStatuses((prev) => ({
              ...prev,
              [exchange]: {
                ...prev[exchange],
                loading: false,
                error: formatError(error),
              },
            }));
          })
          .finally(markDone);
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      pollRunIdRef.current += 1;
      inFlightRef.current = false;
      window.clearInterval(timer);
    };
  }, [monitoredExchanges, ticker]);

  const lastRefreshAt = useMemo(() => {
    const refreshes = monitoredExchanges
      .map((exchange) => statuses[exchange].lastUpdated)
      .filter((value): value is number => typeof value === "number");
    if (refreshes.length === 0) return null;
    return Math.max(...refreshes);
  }, [monitoredExchanges, statuses]);

  const hasData = useMemo(
    () =>
      monitoredExchanges.some((exchange) =>
        Boolean(statuses[exchange].analysis),
      ),
    [monitoredExchanges, statuses],
  );

  const isLoading = useMemo(() => {
    if (monitoredExchanges.length === 0) return false;
    return monitoredExchanges.every(
      (exchange) => statuses[exchange].loading && !statuses[exchange].analysis,
    );
  }, [monitoredExchanges, statuses]);

  return {
    statuses,
    lastRefreshAt,
    hasData,
    isLoading,
  };
}
