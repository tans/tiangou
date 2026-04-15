import React from 'react';

import { useSniperStore } from '@/store/sniper';
import { formatAddress, formatTimestamp } from '@/lib/utils';

function formatBnbPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  if (value === 0) {
    return '0 BNB';
  }

  if (value < 0.000001) {
    return `${value.toExponential(2)} BNB`;
  }

  if (value < 0.01) {
    return `${value.toFixed(8)} BNB`;
  }

  return `${value.toFixed(6)} BNB`;
}

export function LivePricePanel() {
  const { latestCreatedTokens, liveQuotes } = useSniperStore();

  return (
    <section className="flex min-h-[70vh] flex-col rounded-lg border border-border/60 bg-card/70 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">实时币价</h2>
          <span className="font-mono text-xs text-muted-foreground">{latestCreatedTokens.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {latestCreatedTokens.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            等待新币...
          </div>
        ) : (
          <div className="space-y-1">
            {latestCreatedTokens.map((token) => {
              const quote = liveQuotes.get(token.address);

              return (
                <div
                  key={token.address}
                  className="rounded-md border border-border/50 bg-background/40 px-2 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs text-foreground">
                        {token.symbol} <span className="text-muted-foreground">{token.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatAddress(token.address)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-neon-green">
                        {formatBnbPrice(quote?.priceInBnb ?? null)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {quote?.stale
                          ? '报价失败'
                          : quote?.updatedAt
                            ? `${formatTimestamp(quote.updatedAt)} · ${quote.quoteInputBnb} BNB`
                            : '未刷新'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
