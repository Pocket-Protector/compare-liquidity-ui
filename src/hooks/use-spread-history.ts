"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExchangeKey, TickerKey } from "@/lib/types";
import {
  fetchMinuteSpreadData,
  streamMinuteSpreadForExchange,
  isSupabaseConfigured,
  type DepthMetricRow,
} from "@/lib/supabase";
import { getFromDate, median, type SpreadTimeframe } from "@/lib/timeframes";

// Re-export for consumers that already import from here
export type { SpreadTimeframe } from "@/lib/timeframes";

export interface SpreadHistoryPoint {
  time: string;
  [exchange: string]: number | string | null;
}

/** Truncate an ISO timestamp to the hour bucket (":00:00"). */
function toHourBucket(isoString: string): string {
  const d = new Date(isoString);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function computeHourlyMedians(
  rows: DepthMetricRow[],
): { time: string; exchange: string; spread_bps: number }[] {
  const groups = new Map<string, Map<string, number[]>>();

  for (const row of rows) {
    if (row.spread_bps == null) continue;
    const bucket = toHourBucket(row.ts_minute_utc);

    let exchangeMap = groups.get(bucket);
    if (!exchangeMap) {
      exchangeMap = new Map();
      groups.set(bucket, exchangeMap);
    }

    let values = exchangeMap.get(row.exchange);
    if (!values) {
      values = [];
      exchangeMap.set(row.exchange, values);
    }
    values.push(row.spread_bps);
  }

  const result: { time: string; exchange: string; spread_bps: number }[] = [];
  for (const [bucket, exchangeMap] of groups) {
    for (const [exchange, values] of exchangeMap) {
      result.push({ time: bucket, exchange, spread_bps: median([...values]) });
    }
  }
  return result;
}

function pivotByTime(
  rows: { time: string; exchange: string; spread_bps: number }[],
): SpreadHistoryPoint[] {
  const byTime = new Map<string, SpreadHistoryPoint>();
  for (const row of rows) {
    if (!byTime.has(row.time)) byTime.set(row.time, { time: row.time });
    byTime.get(row.time)![row.exchange] = row.spread_bps;
  }
  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

export function useSpreadHistory(
  ticker: TickerKey,
  timeframe: SpreadTimeframe,
  activeExchanges: ExchangeKey[],
) {
  const [data, setData] = useState<SpreadHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchangesRef = useRef(activeExchanges);
  exchangesRef.current = activeExchanges;

  const exchangesKey = activeExchanges.slice().sort().join(",");

  // Monotonic counter to discard stale responses when inputs change rapidly.
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.",
      );
      return;
    }

    const exchanges = exchangesRef.current;
    if (exchanges.length === 0) return;

    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const from = getFromDate(timeframe);
      const fromIso = from.toISOString();

      if (timeframe === "1h" || timeframe === "4h") {
        const rows = await fetchMinuteSpreadData(ticker, exchanges, fromIso);

        if (requestId !== requestIdRef.current) return;

        const flat = rows
          .filter((r) => r.spread_bps != null)
          .map((r) => ({
            time: r.ts_minute_utc,
            exchange: r.exchange,
            spread_bps: r.spread_bps as number,
          }));

        setData(pivotByTime(flat));
      } else {
        // Stream each exchange page by page, updating the chart after every page.
        const accumulated: DepthMetricRow[] = [];

        for (const ex of exchanges) {
          for await (const page of streamMinuteSpreadForExchange(
            ticker,
            ex,
            fromIso,
          )) {
            if (requestId !== requestIdRef.current) return;
            accumulated.push(...page);
            setData(pivotByTime(computeHourlyMedians(accumulated)));
          }
        }
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to fetch historical data",
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

  return { data, isLoading, error, refetch: fetchData };
}
