import type { BookLevel, NormalizedBook } from "../types";

interface DydxLevel {
  price: string;
  size: string;
}

interface DydxBookResponse {
  bids?: DydxLevel[];
  asks?: DydxLevel[];
}

function parseLevels(levels: DydxLevel[] | undefined): BookLevel[] {
  if (!levels) return [];

  return levels
    .map((level) => ({
      px: Number.parseFloat(level.price),
      sz: Number.parseFloat(level.size),
    }))
    .filter(
      (level) =>
        Number.isFinite(level.px) &&
        Number.isFinite(level.sz) &&
        level.px > 0 &&
        level.sz > 0,
    );
}

export function parseDydxBook(raw: unknown): NormalizedBook {
  const data = raw as DydxBookResponse;
  if (!data || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
    throw new Error("Invalid dYdX order book response");
  }

  const bids = parseLevels(data.bids).sort((a, b) => b.px - a.px);
  const asks = parseLevels(data.asks).sort((a, b) => a.px - b.px);

  if (bids.length === 0 || asks.length === 0) {
    throw new Error("dYdX order book is empty");
  }

  return {
    bids,
    asks,
    timestamp: Date.now(),
  };
}
