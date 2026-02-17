import type { ExchangeKey, ExchangeRecord, TickerKey } from "./types";

export type QuoteCurrency = "USD" | "USDT" | "USDC";
type SymbolStyle = "baseOnly" | "baseDashQuote" | "baseQuote";

export interface TrackedTickerDefinition {
  base: string;
  canonicalQuote: QuoteCurrency;
  quoteByExchange?: Partial<ExchangeRecord<QuoteCurrency>>;
  symbolByExchange?: Partial<ExchangeRecord<string>>;
  excludedExchanges?: ExchangeKey[];
}

type ExchangeSymbolConfig = {
  style: SymbolStyle;
  defaultQuote?: QuoteCurrency;
};

type AssetVariantAliasMap = Partial<
  Record<ExchangeKey, Record<string, AssetVariant>>
>;

export interface AssetVariant {
  baseAsset: string;
  contractMultiplier: number;
}

export interface ParsedVenueSymbol {
  exchange: ExchangeKey;
  originalSymbol: string;
  normalizedSymbol: string;
  originalBaseToken: string;
  canonicalBaseAsset: string;
  quoteAsset: QuoteCurrency | null;
  contractMultiplier: number;
}

// Single source of truth for tracked tickers and optional per-exchange symbol overrides.
// Verified across Hyperliquid, dYdX, Lighter, AsterDEX, Binance, and Bybit on 2026-02-11
export const TRACKED_TICKER_DEFINITIONS: Record<
  TickerKey,
  TrackedTickerDefinition
> = {
  "2Z": {
    base: "2Z",
    canonicalQuote: "USD",
  },
  AAVE: {
    base: "AAVE",
    canonicalQuote: "USD",
  },
  ADA: {
    base: "ADA",
    canonicalQuote: "USD",
  },
  APT: {
    base: "APT",
    canonicalQuote: "USD",
  },
  ARB: {
    base: "ARB",
    canonicalQuote: "USD",
  },
  ASTER: {
    base: "ASTER",
    canonicalQuote: "USD",
  },
  AVAX: {
    base: "AVAX",
    canonicalQuote: "USD",
  },
  AVNT: {
    base: "AVNT",
    canonicalQuote: "USD",
  },
  AXS: {
    base: "AXS",
    canonicalQuote: "USD",
  },
  BCH: {
    base: "BCH",
    canonicalQuote: "USD",
  },
  BERA: {
    base: "BERA",
    canonicalQuote: "USD",
  },
  BNB: {
    base: "BNB",
    canonicalQuote: "USD",
  },
  BONK: {
    base: "BONK",
    canonicalQuote: "USD",
    symbolByExchange: {
      hyperliquid: "kBONK",
      dydx: "BONK-USD",
      lighter: "1000BONK",
      asterdex: "1000BONKUSDT",
      binance: "1000BONKUSDT",
      bybit: "1000BONKUSDT",
    },
  },
  BTC: {
    base: "BTC",
    canonicalQuote: "USD",
  },
  CRV: {
    base: "CRV",
    canonicalQuote: "USD",
  },
  DASH: {
    base: "DASH",
    canonicalQuote: "USD",
  },
  DOGE: {
    base: "DOGE",
    canonicalQuote: "USD",
  },
  DOT: {
    base: "DOT",
    canonicalQuote: "USD",
  },
  DYDX: {
    base: "DYDX",
    canonicalQuote: "USD",
  },
  EIGEN: {
    base: "EIGEN",
    canonicalQuote: "USD",
  },
  ENA: {
    base: "ENA",
    canonicalQuote: "USD",
  },
  ETH: {
    base: "ETH",
    canonicalQuote: "USD",
  },
  ETHFI: {
    base: "ETHFI",
    canonicalQuote: "USD",
  },
  FIL: {
    base: "FIL",
    canonicalQuote: "USD",
  },
  GRASS: {
    base: "GRASS",
    canonicalQuote: "USD",
  },
  HBAR: {
    base: "HBAR",
    canonicalQuote: "USD",
  },
  HYPE: {
    base: "HYPE",
    canonicalQuote: "USD",
  },
  ICP: {
    base: "ICP",
    canonicalQuote: "USD",
  },
  IP: {
    base: "IP",
    canonicalQuote: "USD",
  },
  JUP: {
    base: "JUP",
    canonicalQuote: "USD",
  },
  LDO: {
    base: "LDO",
    canonicalQuote: "USD",
  },
  LINEA: {
    base: "LINEA",
    canonicalQuote: "USD",
  },
  LINK: {
    base: "LINK",
    canonicalQuote: "USD",
  },
  LIT: {
    base: "LIT",
    canonicalQuote: "USD",
  },
  LTC: {
    base: "LTC",
    canonicalQuote: "USD",
  },
  MET: {
    base: "MET",
    canonicalQuote: "USD",
  },
  MON: {
    base: "MON",
    canonicalQuote: "USD",
  },
  NEAR: {
    base: "NEAR",
    canonicalQuote: "USD",
  },
  ONDO: {
    base: "ONDO",
    canonicalQuote: "USD",
  },
  OP: {
    base: "OP",
    canonicalQuote: "USD",
  },
  PAXG: {
    base: "PAXG",
    canonicalQuote: "USD",
    symbolByExchange: {
      hyperliquid: "PAXG",
      dydx: "PAXG-USD",
      lighter: "PAXG",
      binance: "PAXGUSDT",
      bybit: "PAXGUSDT",
    },
    excludedExchanges: ["asterdex"],
  },
  PENDLE: {
    base: "PENDLE",
    canonicalQuote: "USD",
  },
  PENGU: {
    base: "PENGU",
    canonicalQuote: "USD",
  },
  POL: {
    base: "POL",
    canonicalQuote: "USD",
  },
  PROVE: {
    base: "PROVE",
    canonicalQuote: "USD",
  },
  PYTH: {
    base: "PYTH",
    canonicalQuote: "USD",
  },
  SEI: {
    base: "SEI",
    canonicalQuote: "USD",
  },
  SKY: {
    base: "SKY",
    canonicalQuote: "USD",
  },
  SOL: {
    base: "SOL",
    canonicalQuote: "USD",
  },
  SPX: {
    base: "SPX",
    canonicalQuote: "USD",
  },
  STRK: {
    base: "STRK",
    canonicalQuote: "USD",
  },
  SUI: {
    base: "SUI",
    canonicalQuote: "USD",
  },
  TAO: {
    base: "TAO",
    canonicalQuote: "USD",
  },
  TIA: {
    base: "TIA",
    canonicalQuote: "USD",
  },
  TON: {
    base: "TON",
    canonicalQuote: "USD",
  },
  TRUMP: {
    base: "TRUMP",
    canonicalQuote: "USD",
  },
  TRX: {
    base: "TRX",
    canonicalQuote: "USD",
  },
  UNI: {
    base: "UNI",
    canonicalQuote: "USD",
  },
  VIRTUAL: {
    base: "VIRTUAL",
    canonicalQuote: "USD",
  },
  VVV: {
    base: "VVV",
    canonicalQuote: "USD",
  },
  WLD: {
    base: "WLD",
    canonicalQuote: "USD",
  },
  WLFI: {
    base: "WLFI",
    canonicalQuote: "USD",
  },
  XLM: {
    base: "XLM",
    canonicalQuote: "USD",
  },
  XMR: {
    base: "XMR",
    canonicalQuote: "USD",
  },
  XPL: {
    base: "XPL",
    canonicalQuote: "USD",
  },
  XRP: {
    base: "XRP",
    canonicalQuote: "USD",
  },
  ZEC: {
    base: "ZEC",
    canonicalQuote: "USD",
  },
  ZK: {
    base: "ZK",
    canonicalQuote: "USD",
  },
  ZORA: {
    base: "ZORA",
    canonicalQuote: "USD",
  },
  ZRO: {
    base: "ZRO",
    canonicalQuote: "USD",
  },
};

const EXCHANGE_SYMBOL_CONFIG: ExchangeRecord<ExchangeSymbolConfig> = {
  hyperliquid: { style: "baseOnly" },
  dydx: { style: "baseDashQuote", defaultQuote: "USD" },
  lighter: { style: "baseOnly" },
  asterdex: { style: "baseQuote", defaultQuote: "USDT" },
  binance: { style: "baseQuote", defaultQuote: "USDT" },
  bybit: { style: "baseQuote", defaultQuote: "USDT" },
};

const QUOTE_SUFFIXES: QuoteCurrency[] = ["USDT", "USDC", "USD"];

// Keep this explicit to avoid over-normalizing unrelated assets (for example 1INCH).
const GLOBAL_ASSET_VARIANT_ALIASES: Record<string, AssetVariant> = {
  KBONK: { baseAsset: "BONK", contractMultiplier: 1_000 },
  BONK1000: { baseAsset: "BONK", contractMultiplier: 1_000 },
  "1000BONK": { baseAsset: "BONK", contractMultiplier: 1_000 },
};

const EXCHANGE_ASSET_VARIANT_ALIASES: AssetVariantAliasMap = {};

function normalizeSymbolToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function splitQuoteSuffix(symbol: string): {
  baseToken: string;
  quoteAsset: QuoteCurrency | null;
} {
  for (const quote of QUOTE_SUFFIXES) {
    if (symbol.endsWith(quote) && symbol.length > quote.length) {
      return {
        baseToken: symbol.slice(0, -quote.length),
        quoteAsset: quote,
      };
    }
  }

  return { baseToken: symbol, quoteAsset: null };
}

function resolveAssetVariant(
  exchange: ExchangeKey,
  baseToken: string,
): AssetVariant {
  const normalizedBaseToken = normalizeSymbolToken(baseToken);
  const exchangeAlias =
    EXCHANGE_ASSET_VARIANT_ALIASES[exchange]?.[normalizedBaseToken];
  if (exchangeAlias) return exchangeAlias;

  const globalAlias = GLOBAL_ASSET_VARIANT_ALIASES[normalizedBaseToken];
  if (globalAlias) return globalAlias;

  return {
    baseAsset: normalizedBaseToken,
    contractMultiplier: 1,
  };
}

export function parseVenueSymbol(
  exchange: ExchangeKey,
  symbol: string,
): ParsedVenueSymbol {
  const normalizedSymbol = normalizeSymbolToken(symbol);
  const split = splitQuoteSuffix(normalizedSymbol);
  const variant = resolveAssetVariant(exchange, split.baseToken);

  return {
    exchange,
    originalSymbol: symbol,
    normalizedSymbol,
    originalBaseToken: split.baseToken,
    canonicalBaseAsset: variant.baseAsset,
    quoteAsset: split.quoteAsset,
    contractMultiplier: variant.contractMultiplier,
  };
}

export function buildCanonicalMarketId(parsed: ParsedVenueSymbol): string {
  const quote = parsed.quoteAsset ?? "NA";
  return `${parsed.canonicalBaseAsset}-${quote}-x${parsed.contractMultiplier}`;
}

function formatSymbol(
  base: string,
  quote: QuoteCurrency | undefined,
  style: SymbolStyle,
): string {
  switch (style) {
    case "baseOnly":
      return base;
    case "baseDashQuote":
      if (!quote)
        throw new Error("quote currency is required for baseDashQuote");
      return `${base}-${quote}`;
    case "baseQuote":
      if (!quote) throw new Error("quote currency is required for baseQuote");
      return `${base}${quote}`;
    default:
      throw new Error(`Unsupported symbol style: ${String(style)}`);
  }
}

export function resolveExchangeSymbol(
  exchange: ExchangeKey,
  ticker: TickerKey,
): string {
  const pair = TRACKED_TICKER_DEFINITIONS[ticker];
  const manualSymbol = pair.symbolByExchange?.[exchange];
  if (manualSymbol) return manualSymbol;
  const exchangeConfig = EXCHANGE_SYMBOL_CONFIG[exchange];
  const quote =
    pair.quoteByExchange?.[exchange] ??
    exchangeConfig.defaultQuote ??
    pair.canonicalQuote;

  return formatSymbol(pair.base, quote, exchangeConfig.style);
}

export function isTickerSupportedOnExchange(
  ticker: TickerKey,
  exchange: ExchangeKey,
): boolean {
  const pair = TRACKED_TICKER_DEFINITIONS[ticker];
  if (!pair) return false;
  return !pair.excludedExchanges?.includes(exchange);
}

function buildExchangeSymbolRecord(ticker: TickerKey): ExchangeRecord<string> {
  return {
    hyperliquid: resolveExchangeSymbol("hyperliquid", ticker),
    dydx: resolveExchangeSymbol("dydx", ticker),
    lighter: resolveExchangeSymbol("lighter", ticker),
    asterdex: resolveExchangeSymbol("asterdex", ticker),
    binance: resolveExchangeSymbol("binance", ticker),
    bybit: resolveExchangeSymbol("bybit", ticker),
  };
}

export function listTrackedTickers(): TickerKey[] {
  return Object.keys(TRACKED_TICKER_DEFINITIONS) as TickerKey[];
}

export function buildTickerMap(
  tickers: readonly TickerKey[],
): Record<TickerKey, ExchangeRecord<string>> {
  const tickerMap: Partial<Record<TickerKey, ExchangeRecord<string>>> = {};

  for (const ticker of tickers) {
    tickerMap[ticker] = buildExchangeSymbolRecord(ticker);
  }

  return tickerMap as Record<TickerKey, ExchangeRecord<string>>;
}

export function resolveTickerFromExchangeSymbol(
  exchange: ExchangeKey,
  symbol: string,
): TickerKey | null {
  const parsedInput = parseVenueSymbol(exchange, symbol);
  const tickers = listTrackedTickers();

  for (const ticker of tickers) {
    const mapped = resolveExchangeSymbol(exchange, ticker);
    const parsedMapped = parseVenueSymbol(exchange, mapped);

    if (
      parsedMapped.canonicalBaseAsset === parsedInput.canonicalBaseAsset &&
      parsedMapped.quoteAsset === parsedInput.quoteAsset &&
      parsedMapped.contractMultiplier === parsedInput.contractMultiplier
    ) {
      return ticker;
    }
  }

  return null;
}

export type PairMappingRow = {
  ticker: TickerKey;
  symbols: ExchangeRecord<string>;
};

export function listPairMappings(
  tickers: readonly TickerKey[],
): PairMappingRow[] {
  return tickers.map((ticker) => {
    const symbols = buildExchangeSymbolRecord(ticker);
    const pair = TRACKED_TICKER_DEFINITIONS[ticker];

    for (const exchange of pair.excludedExchanges ?? []) {
      symbols[exchange] = "N/A";
    }

    return {
      ticker,
      symbols,
    };
  });
}
