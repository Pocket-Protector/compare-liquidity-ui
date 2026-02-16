"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExchangeKey, TickerKey } from "@/lib/types";
import {
  fetchSlippageTimeSeriesForExchange,
  isSupabaseConfigured,
  type SlippageTimeSeriesRow,
} from "@/lib/supabase";
import { getFromDate, median, type SpreadTimeframe } from "@/lib/timeframes";

export type SlippageTier = "1k" | "10k" | "100k" | "1m";

/** One data point per timestamp. Keys: "hyperliquid_ask", "hyperliquid_bid", etc. */
export interface SlippageTsPoint {
  time: string;
  [key: string]: number | string | null;
}

const TIER_ASK_COL: Record<SlippageTier, keyof SlippageTimeSeriesRow> = {
  "1k": "ask_slip_1k",
  "10k": "ask_slip_10k",
  "100k": "ask_slip_100k",
  "1m": "ask_slip_1m",
};

const TIER_BID_COL: Record<SlippageTier, keyof SlippageTimeSeriesRow> = {
  "1k": "bid_slip_1k",
  "10k": "bid_slip_10k",
  "100k": "bid_slip_100k",
  "1m": "bid_slip_1m",
};

function toNum(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n === "number" && Number.isFinite(n)) return Math.abs(n);
  return null;
}

function toHourBucket(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function buildMinutePoints(
  allRows: { exchange: string; rows: SlippageTimeSeriesRow[] }[],
  tier: SlippageTier,
): SlippageTsPoint[] {
  const askCol = TIER_ASK_COL[tier];
  const bidCol = TIER_BID_COL[tier];
  const byTime = new Map<string, SlippageTsPoint>();

  for (const { exchange, rows } of allRows) {
    for (const row of rows) {
      const t = row.ts_minute_utc;
      if (!byTime.has(t)) byTime.set(t, { time: t });
      const pt = byTime.get(t)!;
      pt[`${exchange}_ask`] = toNum(row[askCol]);
      pt[`${exchange}_bid`] = toNum(row[bidCol]);
    }
  }

  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

function buildHourlyPoints(
  allRows: { exchange: string; rows: SlippageTimeSeriesRow[] }[],
  tier: SlippageTier,
): SlippageTsPoint[] {
  const askCol = TIER_ASK_COL[tier];
  const bidCol = TIER_BID_COL[tier];

  // bucket -> exchange_side -> values
  const groups = new Map<string, Map<string, number[]>>();

  for (const { exchange, rows } of allRows) {
    for (const row of rows) {
      const bucket = toHourBucket(row.ts_minute_utc);
      if (!groups.has(bucket)) groups.set(bucket, new Map());
      const map = groups.get(bucket)!;

      const askVal = toNum(row[askCol]);
      const bidVal = toNum(row[bidCol]);

      const askKey = `${exchange}_ask`;
      const bidKey = `${exchange}_bid`;
      if (askVal != null) {
        if (!map.has(askKey)) map.set(askKey, []);
        map.get(askKey)!.push(askVal);
      }
      if (bidVal != null) {
        if (!map.has(bidKey)) map.set(bidKey, []);
        map.get(bidKey)!.push(bidVal);
      }
    }
  }

  const points: SlippageTsPoint[] = [];
  for (const [bucket, map] of groups) {
    const pt: SlippageTsPoint = { time: bucket };
    for (const [key, values] of map) {
      pt[key] = median([...values]);
    }
    points.push(pt);
  }

  return points.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

export function useSlippageTimeSeries(
  ticker: TickerKey,
  timeframe: SpreadTimeframe,
  activeExchanges: ExchangeKey[],
  tier: SlippageTier,
) {
  const [data, setData] = useState<SlippageTsPoint[]>([]);
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

      const allRows = await Promise.all(
        exchanges.map(async (exchange) => ({
          exchange,
          rows: await fetchSlippageTimeSeriesForExchange(
            ticker,
            exchange,
            fromIso,
          ),
        })),
      );

      if (requestId !== requestIdRef.current) return;

      if (timeframe === "1h" || timeframe === "4h") {
        setData(buildMinutePoints(allRows, tier));
      } else {
        setData(buildHourlyPoints(allRows, tier));
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch slippage time series",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeframe, exchangesKey, tier]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
}
