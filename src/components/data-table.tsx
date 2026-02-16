"use client";

import { Fragment, type CSSProperties } from "react";
import {
  EXCHANGE_COLORS,
  EXCHANGE_LABELS,
  NOTIONAL_TIERS,
} from "@/lib/constants";
import { formatTier, formatUsd } from "@/lib/format";
import type {
  ExchangeKey,
  ExchangeRecord,
  ExchangeStatus,
  LiquidityAnalysis,
  SlippageResult,
  SpreadUnit,
  TickerKey,
} from "@/lib/types";
import { PulseDot } from "./pulse-dot";

function formatHyperliquidMeta(analysis: LiquidityAnalysis): string {
  const perTier = analysis.meta?.hyperliquidNSigFigsPerTier;
  if (!perTier) {
    return `Aggregated estimate (nSigFigs ${analysis.meta?.hyperliquidNSigFigs ?? 4})`;
  }

  // Group consecutive tiers that switched away from nSigFigs=5
  // e.g. [5, 5, 4, 3] → "$100K: nSigFigs 4 · $1M: nSigFigs 3"
  const parts: string[] = [];
  for (let i = 0; i < perTier.length; i++) {
    if (perTier[i] < 5) {
      const tier = NOTIONAL_TIERS[i];
      parts.push(`${formatTier(tier)}: nSigFigs ${perTier[i]}`);
    }
  }

  if (parts.length === 0) return "";
  return `Coarser depth used — ${parts.join(" · ")}`;
}

interface DataTableProps {
  statuses: ExchangeRecord<ExchangeStatus>;
  ticker: TickerKey;
  lastRefreshAt: number | null;
  spreadUnit: SpreadUnit;
  activeExchanges: ExchangeKey[];
  onToggleUnit: () => void;
}

function renderCell(
  point: SlippageResult | undefined,
  unit: SpreadUnit,
): string {
  if (!point) return "--";

  const value =
    unit === "pct"
      ? `${(point.slippageBps / 100).toFixed(4)}%`
      : `${point.slippageBps.toFixed(2)} bps`;

  if (point.filled) return value;
  return `${value} (partial ${formatUsd(point.filledNotional, true)})`;
}

export function DataTable({
  statuses,
  ticker,
  lastRefreshAt,
  spreadUnit,
  activeExchanges,
  onToggleUnit,
}: DataTableProps) {
  return (
    <section className="panel">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="label">Detailed analytics</p>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {ticker} Slippage Breakdown
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Spread and execution depth for selected exchanges, refreshed every
            1.5s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleUnit}
            className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {spreadUnit === "bps" ? "Show %" : "Show bps"}
          </button>
          <PulseDot timestamp={lastRefreshAt} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-[color:rgba(79,140,255,0.08)]">
            <tr className="border-b border-[color:var(--border)]">
              <th
                rowSpan={2}
                className="px-3 py-3 font-medium text-[var(--text-secondary)]"
              >
                Exchange
              </th>
              {NOTIONAL_TIERS.map((tier) => (
                <th
                  key={`group-${tier}`}
                  colSpan={2}
                  className="px-3 py-3 text-center font-medium text-[var(--text-secondary)]"
                >
                  {formatTier(tier)}
                </th>
              ))}
            </tr>
            <tr className="border-b border-[color:var(--border)]">
              {NOTIONAL_TIERS.map((tier) => (
                <Fragment key={`sub-${tier}`}>
                  <th className="px-3 py-2 text-center font-medium text-[var(--text-muted)]">
                    Bid
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-[var(--text-muted)]">
                    Ask
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {activeExchanges.map((exchange) => {
              const analysis = statuses[exchange].analysis;
              const rowHoverStyle = {
                "--exchange-row-hover": `${EXCHANGE_COLORS[exchange]}3d`,
              } as CSSProperties;

              return (
                <tr
                  key={exchange}
                  className="group border-b border-[color:var(--border)] transition-colors hover:bg-[color:var(--exchange-row-hover)] last:border-0"
                  style={rowHoverStyle}
                >
                  <td className="px-3 py-3 transition-colors group-hover:bg-[color:var(--exchange-row-hover)]">
                    <div className="space-y-1">
                      <p className="font-medium text-[var(--text-primary)]">
                        {EXCHANGE_LABELS[exchange]}
                      </p>
                      {exchange === "hyperliquid" &&
                      analysis?.meta?.isAggregatedEstimate ? (
                        <p className="text-xs text-[var(--warning)]">
                          {formatHyperliquidMeta(analysis)}
                        </p>
                      ) : null}
                      {exchange === "lighter" &&
                      analysis?.meta?.lighterWsFallback ? (
                        <p className="text-xs text-[var(--warning)]">
                          Switched to WebSocket depth (REST API capped at 250
                          orders)
                        </p>
                      ) : null}
                      {statuses[exchange].error ? (
                        <p className="text-xs text-[var(--danger)]">
                          {statuses[exchange].error}
                        </p>
                      ) : null}
                    </div>
                  </td>

                  {NOTIONAL_TIERS.map((tier, idx) => {
                    const bidPoint = analysis?.bids[idx];
                    const askPoint = analysis?.asks[idx];

                    return (
                      <Fragment key={`${exchange}-${tier}`}>
                        <td
                          className={`data-mono px-3 py-3 text-center transition-colors group-hover:bg-[color:var(--exchange-row-hover)] ${bidPoint && !bidPoint.filled ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}`}
                        >
                          {renderCell(bidPoint, spreadUnit)}
                        </td>
                        <td
                          className={`data-mono px-3 py-3 text-center transition-colors group-hover:bg-[color:var(--exchange-row-hover)] ${askPoint && !askPoint.filled ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}`}
                        >
                          {renderCell(askPoint, spreadUnit)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Amber cells indicate partial fills where available depth could not
        satisfy the full target notional.
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Hyperliquid may auto-switch to coarser aggregation when fine view
        (nSigFigs=5) is partial; this is a bucketed estimate, not deeper raw
        levels.
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Lighter REST API is capped at 250 orders per side; when partial, the app
        switches to a WebSocket snapshot for full book depth.
      </p>
    </section>
  );
}
