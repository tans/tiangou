import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import type { Address } from 'viem';

import { useSniperStore } from '@/store/sniper';
import { formatAddress } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import type { PortalStreamEvent } from '@/lib/flap/types';
import { getTokenMeta, type TokenMeta } from '@/lib/token-cache';
import { RefreshCw, Loader2 } from 'lucide-react';

interface TokenTradeEvent {
  event: PortalStreamEvent;
  side: 'buy' | 'sell';
}

export function PortalEventStream() {
  // Subscribe to portalEventsVersion to force re-render when events update
  const portalEventsVersion = useSniperStore((state) => state.portalEventsVersion);
  const { portalEvents, status, setPortalEvents } = useSniperStore();
  const [resolvedMeta, setResolvedMeta] = useState<Map<string, TokenMeta>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const resolvedMetaRef = useRef(resolvedMeta);
  const processingTokensRef = useRef<Set<string>>(new Set());
  const prevEventsLengthRef = useRef(portalEvents.length);

  // Keep ref in sync with state
  useEffect(() => { resolvedMetaRef.current = resolvedMeta; }, [resolvedMeta]);

  // Update prevEventsLengthRef when portalEvents changes
  useEffect(() => {
    const prevLength = prevEventsLengthRef.current;
    const nowLength = portalEvents.length;
    prevEventsLengthRef.current = nowLength;
    if (prevLength !== nowLength) {
      console.log('[PortalEventStream] Events updated:', { prev: prevLength, now: nowLength, change: nowLength - prevLength });
    }
  }, [portalEvents, portalEventsVersion]);

  // Detect loading state: connecting with no events yet, or just started monitoring
  const isLoading = useMemo(() => {
    if (status === 'connecting') return true;
    if (status === 'monitoring' && portalEvents.length === 0) return true;
    return false;
  }, [status, portalEvents.length]);

  // Handle refresh - clear events and wait for new ones
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPortalEvents([]);
    // Reset refresh state after a short delay
    setTimeout(() => setIsRefreshing(false), 500);
  }, [setPortalEvents]);

  // Resolve token metadata when new events arrive
  useEffect(() => {
    const uniqueTokens = [...new Set(portalEvents.map(ev => ev.token))];

    // Filter to tokens not yet resolved AND not currently being processed
    const tokensToFetch = uniqueTokens.filter(addr => {
      const addrLower = addr.toLowerCase();
      if (resolvedMetaRef.current.has(addrLower)) return false;
      if (processingTokensRef.current.has(addrLower)) return false;
      return true;
    });

    if (tokensToFetch.length === 0) return;

    // Mark as processing
    tokensToFetch.forEach(addr => processingTokensRef.current.add(addr.toLowerCase()));

    Promise.all(
      tokensToFetch.map(async (addr) => {
        const addrLower = addr.toLowerCase();
        const meta = await getTokenMeta(addr as Address);
        return { addr: addrLower, meta };
      })
    ).then(results => {
      const newEntries = results.filter((r): r is { addr: string; meta: TokenMeta } => r !== null && r.meta !== null);
      if (newEntries.length > 0) {
        setResolvedMeta(prev => {
          const next = new Map(prev);
          newEntries.forEach(r => next.set(r.addr, r.meta));
          return next;
        });
      }
    }).finally(() => {
      // Clear processing flag
      tokensToFetch.forEach(addr => processingTokensRef.current.delete(addr.toLowerCase()));
    });
  }, [portalEvents.length]);

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
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <span className="font-mono text-xs text-muted-foreground">{tradeEvents.length}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing || status === 'connecting'}
              title="清空事件"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
                            {event.name || resolvedMeta.get(event.token.toLowerCase())?.name || event.symbol || resolvedMeta.get(event.token.toLowerCase())?.symbol || formatAddress(event.token)}
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