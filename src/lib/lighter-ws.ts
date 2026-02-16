import { TICKER_MAP } from "./constants";
import { resolveLighterMarketId } from "./orderbook-client";
import type { BookLevel, NormalizedBook, TickerKey } from "./types";

const LIGHTER_WS_URL = "wss://mainnet.zklighter.elliot.ai/stream";
const WS_TIMEOUT_MS = 8_000;

interface LighterWsLevel {
  price: string;
  size: string;
}

interface LighterWsMessage {
  type?: string;
  order_book?: {
    bids?: LighterWsLevel[];
    asks?: LighterWsLevel[];
  };
}

function parseLevels(levels: LighterWsLevel[] | undefined): BookLevel[] {
  if (!levels) return [];

  return levels
    .map((l) => ({
      px: Number.parseFloat(l.price),
      sz: Number.parseFloat(l.size),
    }))
    .filter(
      (l) =>
        Number.isFinite(l.px) && Number.isFinite(l.sz) && l.px > 0 && l.sz > 0,
    );
}

/**
 * Opens a one-shot WebSocket to Lighter, subscribes to the full aggregated
 * order book for the given ticker, captures the first snapshot, and disconnects.
 *
 * The WS endpoint returns all price levels with no depth cap, unlike the REST
 * API which is hard-limited to 250 individual orders per side.
 */
export async function fetchLighterBookWs(
  ticker: TickerKey,
): Promise<NormalizedBook> {
  const symbol = TICKER_MAP[ticker].lighter;
  const marketId = await resolveLighterMarketId(symbol);

  return new Promise<NormalizedBook>((resolve, reject) => {
    const ws = new WebSocket(LIGHTER_WS_URL);

    const timeout = window.setTimeout(() => {
      ws.close();
      reject(new Error("Lighter WebSocket snapshot timed out"));
    }, WS_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          channel: `order_book/${marketId}`,
        }),
      );
    });

    ws.addEventListener("message", (event) => {
      let msg: LighterWsMessage;
      try {
        msg = JSON.parse(
          typeof event.data === "string" ? event.data : "{}",
        ) as LighterWsMessage;
      } catch {
        return;
      }

      if (!msg.order_book) return;

      window.clearTimeout(timeout);

      const bids = parseLevels(msg.order_book.bids).sort((a, b) => b.px - a.px);
      const asks = parseLevels(msg.order_book.asks).sort((a, b) => a.px - b.px);

      ws.close();

      if (bids.length === 0 || asks.length === 0) {
        reject(new Error("Lighter WebSocket book snapshot is empty"));
        return;
      }

      resolve({ bids, asks, timestamp: Date.now() });
    });

    ws.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Lighter WebSocket connection failed"));
    });
  });
}
