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

export function buildPortalEventSummary(event: Pick<PortalStreamEvent, 'type' | 'symbol' | 'token' | 'details'>): string {
  const symbol = event.symbol || shortAddress(event.token);

  switch (event.type) {
    case 'TokenCreated':
      return `NEW ${symbol} ${shortAddress(event.token)} creator ${shortAddress(event.details.creator)}`;
    case 'TokenQuoteSet':
      return `QUOTE ${symbol} quote-> ${shortAddress(event.details.quoteToken)}`;
    case 'TokenCurveSetV2':
      return `CURVE ${symbol} r/h/k updated`;
    case 'TokenDexSupplyThreshSet':
      return `THRESH ${symbol} dex supply set`;
    case 'FlapTokenTaxSet':
      return `TAX ${symbol} ${String(event.details.tax ?? '?')}`;
    case 'FlapTokenAsymmetricTaxSet':
      return `ATAX ${symbol} buy ${String(event.details.buyTax ?? '?')} sell ${String(event.details.sellTax ?? '?')}`;
    case 'TokenBought':
      return `BUY ${symbol} ${String(event.details.amount ?? '?')} for ${formatBnb(event.details.eth)}`;
    case 'TokenSold':
      return `SELL ${symbol} ${String(event.details.amount ?? '?')} for ${formatBnb(event.details.eth)}`;
    case 'LaunchedToDEX':
      return `DEX ${symbol} pool ${shortAddress(event.details.pool)}`;
    default:
      return `${event.type} ${symbol}`;
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
