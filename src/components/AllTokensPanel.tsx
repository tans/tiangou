import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { Address } from 'viem';

import { useSniperStore } from '@/store/sniper';
import { formatAddress } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, TrendingUp } from 'lucide-react';
import type { PortalStreamEvent } from '@/lib/flap/types';
import { getTokenMeta, type TokenMeta } from '@/lib/token-cache';

interface TokenInfo {
  token: string;
  name?: string;
  symbol?: string;
  price?: number; // BNB per token
  lastEvent?: PortalStreamEvent;
  eventCount: number;
}

export function AllTokensPanel() {
  const { portalEvents, status, filters } = useSniperStore();
  const [resolvedMeta, setResolvedMeta] = useState<Map<string, TokenMeta>>(new Map());
  const [tokenPrices, setTokenPrices] = useState<Map<string, number>>(new Map());
  const resolvedMetaRef = useRef(resolvedMeta);
  const tokenPricesRef = useRef(tokenPrices);

  // Keep refs in sync with state
  useEffect(() => { resolvedMetaRef.current = resolvedMeta; }, [resolvedMeta]);
  useEffect(() => { tokenPricesRef.current = tokenPrices; }, [tokenPrices]);

  // Resolve token metadata when events come in
  useEffect(() => {
    const currentMeta = resolvedMetaRef.current;
    const uniqueTokens = [...new Set(portalEvents.map(ev => ev.token))].filter(
      addr => !currentMeta.has(addr.toLowerCase())
    );

    if (uniqueTokens.length === 0) return;

    Promise.all(
      uniqueTokens.map(async (addr) => {
        const meta = await getTokenMeta(addr as Address);
        if (meta) return { addr: addr.toLowerCase(), meta };
        return null;
      })
    ).then(results => {
      if (results.some(r => r !== null)) {
        setResolvedMeta(prev => {
          const next = new Map(prev);
          results.forEach(r => { if (r) next.set(r.addr, r.meta); });
          return next;
        });
      }
    });
  }, [portalEvents]);

  // Calculate prices from trade events
  useEffect(() => {
    const currentPrices = tokenPricesRef.current;
    const tradeEvents = portalEvents.filter(
      ev => ev.type === 'TokenBought' || ev.type === 'TokenSold'
    );

    const newPrices = new Map(currentPrices);
    for (const ev of tradeEvents) {
      const addr = ev.token.toLowerCase();
      const amount = ev.details?.amount as bigint | undefined;
      const eth = ev.details?.eth as bigint | undefined;
      if (amount && eth && amount > 0n) {
        const price = Number(eth) / Number(amount);
        // Only update if we don't have a price yet (first trade is most reliable)
        if (!newPrices.has(addr)) {
          newPrices.set(addr, price);
        }
      }
    }

    if (newPrices.size !== currentPrices.size) {
      setTokenPrices(newPrices);
    }
  }, [portalEvents]);

  // Group all tokens from events, keep latest event per token
  const allTokens = useMemo(() => {
    const seen = new Map<string, TokenInfo>();
    const suffix = filters.tokenAddressSuffix;
    // traverse in reverse chronological order so first seen = latest
    for (const ev of portalEvents) {
      const addr = ev.token;
      // Filter by tokenAddressSuffix if configured
      if (suffix && !addr.toLowerCase().endsWith(suffix.toLowerCase())) continue;
      if (seen.has(addr)) {
        const existing = seen.get(addr)!;
        existing.eventCount++;
        // Keep reference to most recent event
        if (!existing.lastEvent || (ev.ts && existing.lastEvent.ts && ev.ts > existing.lastEvent.ts)) {
          existing.lastEvent = ev;
        }
      } else {
        const resolved = resolvedMeta.get(addr.toLowerCase());
        const price = tokenPrices.get(addr.toLowerCase());
        seen.set(addr, {
          token: addr,
          name: ev.name || resolved?.name,
          symbol: ev.symbol || resolved?.symbol,
          price,
          lastEvent: ev,
          eventCount: 1,
        });
      }
    }
    return Array.from(seen.values());
  }, [portalEvents, filters, resolvedMeta, tokenPrices]);

  const getEventTypeBadge = (event?: PortalStreamEvent) => {
    if (!event) return null;
    const typeColors: Record<string, string> = {
      TokenCreated: 'bg-blue-500/20 text-blue-400',
      TokenBought: 'bg-green-500/20 text-green-400',
      TokenSold: 'bg-red-500/20 text-red-400',
      LaunchedToDEX: 'bg-purple-500/20 text-purple-400',
      FlapTokenTaxSet: 'bg-yellow-500/20 text-yellow-400',
      FlapTokenAsymmetricTaxSet: 'bg-yellow-500/20 text-yellow-400',
    };
    const colorClass = typeColors[event.type] || 'bg-gray-500/20 text-gray-400';
    return (
      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
        {event.type.replace('Token', '').replace('Flap', '')}
      </span>
    );
  };

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-neon-green" />
            <span className="text-sm">全部代币</span>
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {allTokens.length} 个
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status !== 'monitoring' ? (
          <div className="flex h-[60vh] items-center justify-center text-xs text-muted-foreground">
            监控未启动
          </div>
        ) : allTokens.length === 0 ? (
          <div className="flex h-[60vh] items-center justify-center text-xs text-muted-foreground">
            等待事件...
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {allTokens.map((tokenInfo) => (
              <div
                key={tokenInfo.token}
                className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <TrendingUp className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tokenInfo.name || tokenInfo.symbol || formatAddress(tokenInfo.token)}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground font-mono">
                      {tokenInfo.symbol || formatAddress(tokenInfo.token)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getEventTypeBadge(tokenInfo.lastEvent)}
                  {tokenInfo.price !== undefined && (
                    <span className="text-[10px] font-mono text-neon-green">
                      {tokenInfo.price.toExponential(2)} BNB
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {tokenInfo.eventCount}事件
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}