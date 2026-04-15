import type { PortalStreamEvent, PortalTokenMeta } from './types';

function shortAddress(value: unknown): string {
  if (typeof value !== 'string' || value.length < 10) {
    return 'unknown';
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatBnb(value: unknown): string {
  if (typeof value !== 'bigint') {
    return '? BNB';
  }

  return `${(Number(value) / 1e18).toFixed(4)} BNB`;
}

export interface PortalEventSummary {
  summary: string;
  tooltip: string;
}

export function buildPortalEventSummary(event: Pick<PortalStreamEvent, 'type' | 'symbol' | 'token' | 'details'>): PortalEventSummary {
  const symbol = event.symbol || shortAddress(event.token);

  switch (event.type) {
    case 'TokenCreated':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `${shortAddress(event.token)} creator ${shortAddress(event.details.creator)}`,
      };
    case 'TokenQuoteSet':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `quote → ${shortAddress(event.details.quoteToken)}`,
      };
    case 'TokenCurveSetV2':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `r/h/k updated`,
      };
    case 'TokenDexSupplyThreshSet':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `dex supply thresh set`,
      };
    case 'FlapTokenTaxSet':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `tax ${String(event.details.tax ?? '?')}`,
      };
    case 'FlapTokenAsymmetricTaxSet':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `buy ${String(event.details.buyTax ?? '?')} / sell ${String(event.details.sellTax ?? '?')}`,
      };
    case 'TokenBought':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `${String(event.details.amount ?? '?')} for ${formatBnb(event.details.eth)}`,
      };
    case 'TokenSold':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `${String(event.details.amount ?? '?')} for ${formatBnb(event.details.eth)}`,
      };
    case 'LaunchedToDEX':
      return {
        summary: `❗ ${symbol}`,
        tooltip: `pool ${shortAddress(event.details.pool)}`,
      };
    default:
      return {
        summary: `❗ ${symbol}`,
        tooltip: event.type,
      };
  }
}

export function mergeLatestCreatedTokens(
  current: PortalTokenMeta[],
  incoming: PortalTokenMeta[],
): PortalTokenMeta[] {
  const deduped = new Map<string, PortalTokenMeta>();

  [...incoming, ...current]
    .sort((left, right) => right.detectedAt - left.detectedAt)
    .forEach((token) => {
      if (!deduped.has(token.address)) {
        deduped.set(token.address, token);
      }
    });

  return Array.from(deduped.values()).slice(0, 20);
}
