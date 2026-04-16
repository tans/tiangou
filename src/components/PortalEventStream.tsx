import React, { useMemo } from 'react';

import { useSniperStore } from '@/store/sniper';
import { formatAddress, formatTimestamp } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { PortalStreamEvent } from '@/lib/flap/types';

function formatBnbPrice(value: bigint | undefined, decimals = 6): string {
  if (value === undefined) return '?.?????? BNB';
  const bnb = Number(value) / 1e18;
  return `${bnb.toFixed(decimals)} BNB`;
}

function calcPrice(event: PortalStreamEvent): string {
  const amount = event.details.amount as bigint | undefined;
  const eth = event.details.eth as bigint | undefined;
  if (!amount || !eth || amount === 0n) return '? BNB';
  const price = Number(eth) / Number(amount);
  if (price < 0.000001) return `${price.toExponential(2)} BNB`;
  return `${price.toFixed(8)} BNB`;
}

interface TokenTradeEvent {
  event: PortalStreamEvent;
  price: string;
  side: 'buy' | 'sell';
}

export function PortalEventStream() {
  const { portalEvents, status, liveQuotes } = useSniperStore();

  // Filter to only TokenBought/TokenSold, group by token, keep latest event per token
  const tradeEvents = useMemo(() => {
    const seen = new Map<string, TokenTradeEvent>();
    // traverse in reverse chronological order so first seen = latest
    for (const ev of portalEvents) {
      if (ev.type !== 'TokenBought' && ev.type !== 'TokenSold') continue;
      const addr = ev.token;
      if (seen.has(addr)) continue;
      const side = ev.type === 'TokenBought' ? 'buy' : 'sell';
      seen.set(addr, { event: ev, price: calcPrice(ev), side });
    }
    return Array.from(seen.values());
  }, [portalEvents]);

  // try to enrich with live quote price when available
  const enriched = useMemo(() => {
    return tradeEvents.map((te) => {
      const quote = liveQuotes.get(te.event.token);
      const displayPrice = quote?.priceInBnb != null
        ? `${quote.priceInBnb.toFixed(8)} BNB`
        : te.price;
      return { ...te, displayPrice };
    });
  }, [tradeEvents, liveQuotes]);

  return (
    <TooltipProvider>
      <section className="flex min-h-[70vh] flex-col rounded-lg border border-border/60 bg-card/70 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">交易事件</h2>
            <p className="text-[11px] text-muted-foreground">有买卖的币 · 价格从事件计算</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{enriched.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {status !== 'monitoring' ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              监控未启动
            </div>
          ) : enriched.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              等待买卖事件...
            </div>
          ) : (
            <div className="space-y-1">
              {enriched.map(({ event, side, displayPrice }) => (
                <div
                  key={event.id}
                  className="rounded-md border border-border/50 bg-background/40 px-2 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`shrink-0 text-xs font-semibold ${side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {side === 'buy' ? '买' : '卖'}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help text-sm font-semibold text-foreground">
                            {event.name || event.symbol || formatAddress(event.token)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono text-xs">{event.tooltip || event.type}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-medium text-foreground">
                      {displayPrice}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>{event.symbol || '???'} · {formatAddress(event.token)}</span>
                    <span>{event.ts ? formatTimestamp(event.ts) : '--:--:--'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}