import { NextRequest, NextResponse } from "next/server";
import { isExchangeKey, isTickerKey, TICKER_MAP } from "@/lib/constants";
import { isTickerSupportedOnExchange } from "@/lib/pair-mapping";
import type { ExchangeKey } from "@/lib/types";

const HYPERLIQUID_URL = "https://api.hyperliquid.xyz/info";
const DYDX_BASE_URL = "https://indexer.dydx.trade/v4";
const LIGHTER_BASE_URL = "https://mainnet.zklighter.elliot.ai/api/v1";
const ASTERDEX_BASE_URL = "https://fapi.asterdex.com";
const BINANCE_BASE_URL = "https://fapi.binance.com";
const BYBIT_BASE_URL = "https://api.bybit.com";
const LIGHTER_CACHE_MS = 5 * 60 * 1000;

type LighterMarketsResponse = {
  order_books?: Array<{
    symbol: string;
    market_id: number;
  }>;
};

let lighterMarketCache: {
  expiresAt: number;
  bySymbol: Record<string, number>;
} | null = null;

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function refreshLighterMarketCache(): Promise<void> {
  const response = await fetch(`${LIGHTER_BASE_URL}/orderBooks`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Lighter market list fetch failed (${response.status})`);
  }

  const payload = (await response.json()) as LighterMarketsResponse;
  if (!payload.order_books || !Array.isArray(payload.order_books)) {
    throw new Error("Lighter market list is malformed");
  }

  const bySymbol: Record<string, number> = {};
  for (const market of payload.order_books) {
    const symbol = market.symbol?.toUpperCase();
    if (!symbol || typeof market.market_id !== "number") continue;
    bySymbol[symbol] = market.market_id;
  }

  lighterMarketCache = {
    expiresAt: Date.now() + LIGHTER_CACHE_MS,
    bySymbol,
  };
}

async function resolveLighterMarketId(symbol: string): Promise<number> {
  if (!lighterMarketCache || lighterMarketCache.expiresAt < Date.now()) {
    await refreshLighterMarketCache();
  }

  const marketId = lighterMarketCache?.bySymbol[symbol.toUpperCase()];
  if (typeof marketId !== "number") {
    throw new Error(`Unknown Lighter market symbol: ${symbol}`);
  }

  return marketId;
}

async function buildUpstreamRequest(
  exchange: ExchangeKey,
  symbol: string,
): Promise<{ url: string; init?: RequestInit }> {
  switch (exchange) {
    case "hyperliquid":
      return {
        url: HYPERLIQUID_URL,
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "l2Book",
            coin: symbol,
          }),
        },
      };
    case "dydx":
      return {
        url: `${DYDX_BASE_URL}/orderbooks/perpetualMarket/${encodeURIComponent(symbol)}`,
      };
    case "lighter": {
      const marketId = await resolveLighterMarketId(symbol);
      return {
        url: `${LIGHTER_BASE_URL}/orderBookOrders?market_id=${marketId}&limit=250`,
      };
    }
    case "asterdex":
      return {
        url: `${ASTERDEX_BASE_URL}/fapi/v1/depth?symbol=${encodeURIComponent(symbol)}&limit=1000`,
      };
    case "binance":
      return {
        url: `${BINANCE_BASE_URL}/fapi/v1/depth?symbol=${encodeURIComponent(symbol)}&limit=1000`,
      };
    case "bybit":
      return {
        url: `${BYBIT_BASE_URL}/v5/market/orderbook?category=linear&symbol=${encodeURIComponent(symbol)}&limit=1000`,
      };
    default:
      throw new Error(`Unsupported exchange: ${exchange}`);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const exchangeParam = request.nextUrl.searchParams.get("exchange");
  const tickerParam = request.nextUrl.searchParams.get("ticker");

  if (!exchangeParam || !tickerParam) {
    return badRequest("Missing required query params: exchange and ticker");
  }

  if (!isExchangeKey(exchangeParam)) {
    return badRequest(`Unknown exchange: ${exchangeParam}`);
  }

  const ticker = tickerParam.toUpperCase();
  if (!isTickerKey(ticker)) {
    return badRequest(`Unknown ticker: ${tickerParam}`);
  }

  if (!isTickerSupportedOnExchange(ticker, exchangeParam)) {
    return badRequest(`Ticker ${ticker} is not listed on ${exchangeParam}`);
  }

  const symbol = TICKER_MAP[ticker][exchangeParam];

  try {
    const upstream = await buildUpstreamRequest(exchangeParam, symbol);
    const response = await fetch(upstream.url, {
      ...(upstream.init ?? {}),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: `Upstream ${exchangeParam} request failed with status ${response.status}`,
          details: details.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected proxy error";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 502 },
    );
  }
}
