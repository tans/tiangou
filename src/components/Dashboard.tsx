import React from 'react';
import { WalletButton } from './WalletButton';
import { StatusIndicator } from './StatusIndicator';
import { TokenMonitor } from './TokenMonitor';
import { FilterPanel } from './FilterPanel';
import { SniperConfigPanel } from './SniperConfigPanel';
import { TransactionTable } from './TransactionTable';
import { useSniperStore } from '@/store/sniper';
import { formatNumber } from '@/lib/utils';
import { Zap, Activity } from 'lucide-react';

export function Dashboard() {
  const { transactions, gasPrice, filters, detectedTokens } = useSniperStore();

  // Calculate stats
  const successCount = transactions.filter(tx => tx.status === 'success').length;
  const failCount = transactions.filter(tx => tx.status === 'failed').length;
  const pendingCount = transactions.filter(tx => tx.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="h-8 w-8 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="22" y1="12" x2="18" y2="12" />
                  <line x1="6" y1="12" x2="2" y2="12" />
                  <line x1="12" y1="6" x2="12" y2="2" />
                  <line x1="12" y1="22" x2="12" y2="18" />
                </svg>
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-neon-green pulse-dot" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Sniper Bot</h1>
                <p className="text-xs text-muted-foreground">Auto-buy new tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator />
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Activity className="h-4 w-4" />
              Total Sniped
            </div>
            <p className="text-2xl font-bold font-mono text-neon-green">{transactions.length}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <svg className="h-4 w-4 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Success
            </div>
            <p className="text-2xl font-bold font-mono text-neon-green">{successCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <svg className="h-4 w-4 text-neon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Failed
            </div>
            <p className="text-2xl font-bold font-mono text-neon-red">{failCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Zap className="h-4 w-4" />
              Gas Price
            </div>
            <p className="text-2xl font-bold font-mono text-neon-blue">
              {formatNumber(Number(gasPrice) / 1e9, 1)} <span className="text-sm">Gwei</span>
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Token Monitor */}
          <div className="lg:col-span-2 space-y-6">
            <TokenMonitor />
            <TransactionTable />
          </div>

          {/* Right Column - Config */}
          <div className="space-y-6">
            <SniperConfigPanel />
            <FilterPanel />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>Built with Astro + Viem + shadcn/ui</p>
          <p className="mt-1 text-xs">
            Detected {detectedTokens.length} tokens • Filters: {filters.enabled ? 'Active' : 'Disabled'}
          </p>
        </footer>
      </main>
    </div>
  );
}
