const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
 * Paginated GET against a PostgREST table endpoint.
 * Pages through 1000-row chunks until fewer than PAGE_SIZE rows are returned.
 */
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rangeEnd = offset + PAGE_SIZE - 1;
    const res = await fetch(url, {
      headers: {
        ...authHeaders(),
        Range: `${offset}-${rangeEnd}`,
        Prefer: "count=exact",
      },
    });

    // 416 = past the end of the result set
    if (res.status === 416) break;
    await throwOnError(res, "depth_metrics");

    const rows: T[] = await res.json();
    all.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
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

export async function fetchMinuteSpreadForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): Promise<DepthMetricRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=ts_minute_utc,exchange,spread_bps`,
  ].join("&");

  return fetchAllPages<DepthMetricRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}

/* ── Mid-price rows ─────────────────────────────────────────────── */

export interface MidPriceRow {
  ts_minute_utc: string;
  exchange: string;
  mid_price: number | null;
}

export async function fetchMidPriceForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): Promise<MidPriceRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=ts_minute_utc,exchange,mid_price`,
  ].join("&");

  return fetchAllPages<MidPriceRow>(
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

export async function fetchSlippageForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): Promise<SlippageMetricRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=${SLIPPAGE_COLS}`,
  ].join("&");

  return fetchAllPages<SlippageMetricRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}

export async function fetchSlippageTimeSeriesForExchange(
  ticker: string,
  exchange: string,
  fromUtc: string,
): Promise<SlippageTimeSeriesRow[]> {
  const qs = [
    `ticker=eq.${ticker}`,
    `exchange=eq.${exchange}`,
    `ts_minute_utc=gte.${fromUtc}`,
    `samples_success=gt.0`,
    `order=ts_minute_utc.asc`,
    `select=${SLIPPAGE_TS_COLS}`,
  ].join("&");

  return fetchAllPages<SlippageTimeSeriesRow>(
    `${SUPABASE_URL}/rest/v1/depth_metrics?${qs}`,
  );
}
