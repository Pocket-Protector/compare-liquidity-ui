"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExchangeKey, TickerKey } from "@/lib/types";
import {
  fetchMidPriceForExchange,
  isSupabaseConfigured,
  type MidPriceRow,
} from "@/lib/supabase";
import { getFromDate, median, type SpreadTimeframe } from "@/lib/timeframes";

export interface MidPriceHistoryPoint {
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
  rows: MidPriceRow[],
): { time: string; exchange: string; mid_price: number }[] {
  const groups = new Map<string, Map<string, number[]>>();

  for (const row of rows) {
    if (row.mid_price == null) continue;
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
    values.push(row.mid_price);
  }

  const result: { time: string; exchange: string; mid_price: number }[] = [];
  for (const [bucket, exchangeMap] of groups) {
    for (const [exchange, values] of exchangeMap) {
      result.push({ time: bucket, exchange, mid_price: median([...values]) });
    }
  }
  return result;
}

function pivotByTime(
  rows: { time: string; exchange: string; mid_price: number }[],
): MidPriceHistoryPoint[] {
  const byTime = new Map<string, MidPriceHistoryPoint>();
  for (const row of rows) {
    if (!byTime.has(row.time)) byTime.set(row.time, { time: row.time });
    byTime.get(row.time)![row.exchange] = row.mid_price;
  }
  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

export function useMidPriceHistory(
  ticker: TickerKey,
  timeframe: SpreadTimeframe,
  activeExchanges: ExchangeKey[],
) {
  const [data, setData] = useState<MidPriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchangesRef = useRef(activeExchanges);
  exchangesRef.current = activeExchanges;

  const exchangesKey = activeExchanges.slice().sort().join(",");

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.",
      );
      return;
    }

    const exchanges = exchangesRef.current;
    if (exchanges.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const from = getFromDate(timeframe);
      const fromIso = from.toISOString();

      // Always fetch per-exchange (needed for hourly medians on 1d/7d)
      const allRows = (
        await Promise.all(
          exchanges.map((ex) =>
            fetchMidPriceForExchange(ticker, ex, fromIso),
          ),
        )
      ).flat();

      if (timeframe === "1h" || timeframe === "4h") {
        const flat = allRows
          .filter((r) => r.mid_price != null)
          .map((r) => ({
            time: r.ts_minute_utc,
            exchange: r.exchange,
            mid_price: r.mid_price as number,
          }));

        setData(pivotByTime(flat));
      } else {
        const hourly = computeHourlyMedians(allRows);
        setData(pivotByTime(hourly));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch mid-price data",
      );
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeframe, exchangesKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
