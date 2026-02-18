const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const PAGE_SIZE = 1000;

function authHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function throwOnError(res: Response, label: string): Promise<void> {
  if (res.ok) return;
  // 416 = range not satisfiable → no more rows, not an error
  if (res.status === 416) return;
  const body = await res.text().catch(() => "");
  throw new Error(`${label} ${res.status}: ${body}`);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Streams rows page by page (1 000 rows at a time).
 * Omits `count=exact` so PostgREST never runs a full COUNT(*) — that was
 * the cause of the statement-timeout errors on large timeframes.
 */
async function* streamPages<T>(url: string): AsyncGenerator<T[]> {
  let offset = 0;
  while (true) {
    const rangeEnd = offset + PAGE_SIZE - 1;
    const res = await fetch(url, {
      headers: {
        ...authHeaders(),
        Range: `${offset}-${rangeEnd}`,
      },
    });

    // 416 = past the end of the result set
    if (res.status === 416) break;
    await throwOnError(res, "depth_metrics");

    const rows: T[] = await res.json();
    if (rows.length > 0) yield rows;
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
}

/**
 * Collects all pages into a single array.
 * Used only for small timeframes (1 h / 4 h) where the full result fits
 * comfortably within the DB statement timeout.
 */
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  for await (const page of streamPages<T>(url)) {
    all.push(...page);
  }
  return all;
}

/* ── Spread rows ─────────────────────────────────────────────────── */

export interface DepthMetricRow {
  ts_minute_utc: string;
  exchange: string;
  spread_bps: number | null;
}

export async function fetchMinuteSpreadData(
  ticker: string,
  exchanges: string[],
  fromUtc: string,
): Promise<DepthMetricRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=in.(${exchanges.join(",")})`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=ts_minute_utc,exchange,spread_bps`,
  ].join("&");

  return fetchAllPages<DepthMetricRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}

export function streamMinuteSpreadForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): AsyncGenerator<DepthMetricRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=ts_minute_utc,exchange,spread_bps`,
  ].join("&");

  return streamPages<DepthMetricRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}

/* ── Mid-price rows ─────────────────────────────────────────────── */

export interface MidPriceRow {
  ts_minute_utc: string;
  exchange: string;
  mid_price: number | null;
}

export function streamMidPriceForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): AsyncGenerator<MidPriceRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=ts_minute_utc,exchange,mid_price`,
  ].join("&");

  return streamPages<MidPriceRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}

/* ── Slippage rows ───────────────────────────────────────────────── */

export interface SlippageMetricRow {
  exchange: string;
  ask_slip_1k: number | null;
  bid_slip_1k: number | null;
  ask_slip_10k: number | null;
  bid_slip_10k: number | null;
  ask_slip_100k: number | null;
  bid_slip_100k: number | null;
  ask_slip_1m: number | null;
  bid_slip_1m: number | null;
}

const SLIPPAGE_COLS =
  "exchange,ask_slip_1k,bid_slip_1k,ask_slip_10k,bid_slip_10k,ask_slip_100k,bid_slip_100k,ask_slip_1m,bid_slip_1m";

const SLIPPAGE_TS_COLS =
  "ts_minute_utc,exchange,ask_slip_1k,bid_slip_1k,ask_slip_10k,bid_slip_10k,ask_slip_100k,bid_slip_100k,ask_slip_1m,bid_slip_1m";

export interface SlippageTimeSeriesRow extends SlippageMetricRow {
  ts_minute_utc: string;
}

export function streamSlippageForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): AsyncGenerator<SlippageMetricRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=${SLIPPAGE_COLS}`,
  ].join("&");

  return streamPages<SlippageMetricRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}

export function streamSlippageTimeSeriesForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): AsyncGenerator<SlippageTimeSeriesRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=${SLIPPAGE_TS_COLS}`,
  ].join("&");

  return streamPages<SlippageTimeSeriesRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}
