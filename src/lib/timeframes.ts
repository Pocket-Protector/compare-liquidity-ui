export type SpreadTimeframe = "1h" | "4h" | "1d" | "7d";

export const TIMEFRAME_LABELS: Record<SpreadTimeframe, string> = {
  "1h": "1 Hour",
  "4h": "4 Hours",
  "1d": "1 Day",
  "7d": "7 Days",
};

export function getFromDate(timeframe: SpreadTimeframe): Date {
  const now = new Date();
  switch (timeframe) {
    case "1h":
      return new Date(now.getTime() - 60 * 60 * 1000);
    case "4h":
      return new Date(now.getTime() - 4 * 60 * 60 * 1000);
    case "1d":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

export function median(values: number[]): number {
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 !== 0
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2;
}
