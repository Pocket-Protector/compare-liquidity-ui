"use client";

import { EXCHANGES, EXCHANGE_COLORS, EXCHANGE_LABELS } from "@/lib/constants";
import type { ExchangeKey, ExchangeRecord, ExchangeStatus } from "@/lib/types";
import { PulseDot } from "./pulse-dot";

interface SpreadCardsProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  activeExchanges: ExchangeKey[];
  onToggleExchange: (exchange: ExchangeKey) => void;
}

export function SpreadCards({
  statuses,
  activeExchanges,
  onToggleExchange,
}: SpreadCardsProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Enable or disable each exchange
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXCHANGES.map((exchange) => {
          const status = statuses[exchange];
          const isActive = activeExchanges.includes(exchange);
          const color = EXCHANGE_COLORS[exchange];

          return (
            <button
              key={exchange}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggleExchange(exchange)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition ${
                isActive
                  ? "text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(232,238,251,0.08)_inset]"
                  : "text-[var(--text-secondary)] opacity-70 hover:opacity-100"
              }`}
              style={{
                borderColor: isActive ? color : "var(--border)",
                backgroundColor: isActive ? `${color}1f` : "transparent",
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium">
                {EXCHANGE_LABELS[exchange]}
              </span>
              <PulseDot timestamp={status.lastUpdated} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
