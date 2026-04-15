import React from 'react';

import { useSniperStore } from '@/store/sniper';
import { formatAddress, formatTimestamp } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function PortalEventStream() {
  const { portalEvents, status } = useSniperStore();

  return (
    <TooltipProvider>
      <section className="flex min-h-[70vh] flex-col rounded-lg border border-border/60 bg-card/70 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">事件流</h2>
            <p className="text-[11px] text-muted-foreground">Portal 全事件监听</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{portalEvents.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {portalEvents.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {status === 'monitoring' ? '等待事件...' : '监控未启动'}
            </div>
          ) : (
            <div className="space-y-1">
              {portalEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-border/50 bg-background/40 px-2 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help font-mono text-xs text-foreground">
                            {event.summary}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{event.tooltip || event.type}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {event.ts ? formatTimestamp(event.ts) : '--:--:--'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>{event.symbol || '???'} · {formatAddress(event.token)}</span>
                    <span className="truncate">{event.txHash ? formatAddress(event.txHash) : ''}</span>
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
