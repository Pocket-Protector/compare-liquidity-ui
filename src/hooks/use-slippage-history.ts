"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExchangeKey, TickerKey } from "@/lib/types";
import {
  fetchSlippageForExchange,
  isSupabaseConfigured,
  type SlippageMetricRow,
} from "@/lib/supabase";
import { getFromDate, median, type SpreadTimeframe } from "@/lib/timeframes";
import { NOTIONAL_TIERS } from "@/lib/constants";
import { formatTier } from "@/lib/format";

/** One bar-chart datum: tier label + median slippage per exchange. */
export type SlippageMedianDatum = {
  tier: string;
} & Partial<Record<ExchangeKey, number | null>>;

const ASK_KEYS: (keyof SlippageMetricRow)[] = [
  "ask_slip_1k",
  "ask_slip_10k",
  "ask_slip_100k",
  "ask_slip_1m",
];

const BID_KEYS: (keyof SlippageMetricRow)[] = [
  "bid_slip_1k",
  "bid_slip_10k",
  "bid_slip_100k",
  "bid_slip_1m",
];

function computeMedianSlippage(
  rows: SlippageMetricRow[],
  side: "ask" | "bid",
): (number | null)[] {
  const keys = side === "ask" ? ASK_KEYS : BID_KEYS;

  return keys.map((key) => {
    const values: number[] = [];
    for (const row of rows) {
      // PostgREST may return numeric as string; coerce and take abs
      // because the DB stores bid slippage as negative (vwap < mid).
      const raw = row[key];
      const n = typeof raw === "string" ? Number(raw) : raw;
      if (typeof n === "number" && Number.isFinite(n)) {
        values.push(Math.abs(n));
      }
    }
    return values.length > 0 ? median([...values]) : null;
  });
}

export function useSlippageHistory(
  ticker: TickerKey,
  timeframe: SpreadTimeframe,
  activeExchanges: ExchangeKey[],
) {
  const [askData, setAskData] = useState<SlippageMedianDatum[]>([]);
  const [bidData, setBidData] = useState<SlippageMedianDatum[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchangesRef = useRef(activeExchanges);
  exchangesRef.current = activeExchanges;
  const exchangesKey = activeExchanges.slice().sort().join(",");

  // Monotonic counter to discard stale responses when inputs change rapidly.
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.");
      return;
    }

    const exchanges = exchangesRef.current;
    if (exchanges.length === 0) return;

    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const fromIso = getFromDate(timeframe).toISOString();

      const perExchange = await Promise.all(
        exchanges.map(async (exchange) => {
          const rows = await fetchSlippageForExchange(
            ticker,
            exchange,
            fromIso,
          );
          return { exchange, rows };
        }),
      );

      if (requestId !== requestIdRef.current) return;

      const askRows: SlippageMedianDatum[] = NOTIONAL_TIERS.map((tier, idx) => {
        const datum: SlippageMedianDatum = { tier: formatTier(tier) };
        for (const { exchange, rows } of perExchange) {
          const medians = computeMedianSlippage(rows, "ask");
          datum[exchange as ExchangeKey] =
            medians[idx] != null ? Number(medians[idx]!.toFixed(2)) : null;
        }
        return datum;
      });

      const bidRows: SlippageMedianDatum[] = NOTIONAL_TIERS.map((tier, idx) => {
        const datum: SlippageMedianDatum = { tier: formatTier(tier) };
        for (const { exchange, rows } of perExchange) {
          const medians = computeMedianSlippage(rows, "bid");
          datum[exchange as ExchangeKey] =
            medians[idx] != null ? Number(medians[idx]!.toFixed(2)) : null;
        }
        return datum;
      });

      setAskData(askRows);
      setBidData(bidRows);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to fetch slippage data",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeframe, exchangesKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { askData, bidData, isLoading, error };
}
