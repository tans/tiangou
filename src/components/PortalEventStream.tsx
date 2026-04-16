import React, { useMemo } from 'react';

import { useSniperStore } from '@/store/sniper';
import { formatAddress } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { PortalStreamEvent } from '@/lib/flap/types';

interface TokenTradeEvent {
  event: PortalStreamEvent;
  side: 'buy' | 'sell';
}

export function PortalEventStream() {
  const { portalEvents, status } = useSniperStore();

  // Filter to only TokenBought/TokenSold, group by token, keep latest event per token
  const tradeEvents = useMemo(() => {
    const seen = new Map<string, TokenTradeEvent>();
    // traverse in reverse chronological order so first seen = latest
    for (const ev of portalEvents) {
      if (ev.type !== 'TokenBought' && ev.type !== 'TokenSold') continue;
      const addr = ev.token;
      if (seen.has(addr)) continue;
      const side = ev.type === 'TokenBought' ? 'buy' : 'sell';
      seen.set(addr, { event: ev, side });
    }
    return Array.from(seen.values());
  }, [portalEvents]);

  return (
    <TooltipProvider>
      <section className="flex min-h-[70vh] flex-col rounded-lg border border-border/60 bg-card/70 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">交易事件</h2>
            <p className="text-[11px] text-muted-foreground">币名 + 事件名 + 区块号</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{tradeEvents.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {status !== 'monitoring' ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              监控未启动
            </div>
          ) : tradeEvents.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              等待买卖事件...
            </div>
          ) : (
            <div className="space-y-1">
              {tradeEvents.map(({ event, side }) => (
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
                      区块 {event.blockNumber?.toString() || '?'}
                    </span>
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