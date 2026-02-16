import type { BookLevel, NormalizedBook } from "../types";

interface AsterdexBookResponse {
  E?: number;
  T?: number;
  bids?: [string, string][];
  asks?: [string, string][];
}

function parseLevels(levels: [string, string][] | undefined): BookLevel[] {
  if (!levels) return [];

  return levels
    .map(([price, qty]) => ({
      px: Number.parseFloat(price),
      sz: Number.parseFloat(qty),
    }))
    .filter(
      (level) =>
        Number.isFinite(level.px) &&
        Number.isFinite(level.sz) &&
        level.px > 0 &&
        level.sz > 0,
    );
}

export function parseAsterdexBook(raw: unknown): NormalizedBook {
  const data = raw as AsterdexBookResponse;
  if (!data || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
    throw new Error("Invalid AsterDEX order book response");
  }

  const bids = parseLevels(data.bids).sort((a, b) => b.px - a.px);
  const asks = parseLevels(data.asks).sort((a, b) => a.px - b.px);

  if (bids.length === 0 || asks.length === 0) {
    throw new Error("AsterDEX order book is empty");
  }

  return {
    bids,
    asks,
    timestamp: typeof data.T === "number" ? data.T : Date.now(),
  };
}
