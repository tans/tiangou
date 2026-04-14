import React from 'react';

import { CompactSniperBar } from './CompactSniperBar';
import { LivePricePanel } from './LivePricePanel';
import { PortalEventStream } from './PortalEventStream';
import { StatusIndicator } from './StatusIndicator';
import { WalletButton } from './WalletButton';

export function Dashboard() {
  return (
    <div className="min-h-screen bg-background grid-pattern">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between gap-3 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <svg className="h-7 w-7 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
              </svg>
              <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-neon-green pulse-dot" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">Flap Portal 控制台</h1>
              <p className="text-[11px] text-muted-foreground">全事件流 + 最新 20 币价</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusIndicator />
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-3 px-3 py-3">
        <CompactSniperBar />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.7fr_1fr]">
          <PortalEventStream />
          <LivePricePanel />
        </div>
      </main>
    </div>
  );
}
