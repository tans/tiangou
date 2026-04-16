import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings, Crosshair, Filter } from 'lucide-react';

export function CompactSniperBar() {
  const { config, filters, setConfig, setFilters } = useSniperStore();

  // Format filter summary text
  const filterSummary = [
    filters.enabled ? '过滤器ON' : '过滤器OFF',
    filters.onlyTaxToken ? '仅税币' : null,
    `进度${filters.minProgress}-${filters.maxProgress}%`,
    `v${filters.allowedVersions.join('/')}`,
    `税率≤${filters.maxTaxRate}%`,
    filters.requireTgGroup ? 'TG' : null,
    filters.tokenAddressSuffix ? `尾号${filters.tokenAddressSuffix}` : null,
    filters.excludePureWalletTax ? '过滤私钱包' : null,
  ].filter(Boolean).join(' | ');

  // Format snipe summary text
  const snipeSummary = [
    `${config.buyAmount}BNB`,
    `滑点${config.slippage}%`,
    `止损${config.stopLossPercent}%`,
    config.takeProfitSteps.map((tp, i) => `TP${i+1}:${tp.profitPercent}%@${tp.sellPercent}%`).join(' '),
    config.autoSnipe ? '自动狙击ON' : '自动狙击OFF',
  ].join(' | ');

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-neon-green" />
            <CardTitle className="text-sm">狙击配置</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">自动狙击</span>
            <Switch
              checked={config.autoSnipe}
              onCheckedChange={(autoSnipe) => setConfig({ autoSnipe })}
              className="scale-90"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs font-mono text-neon-green leading-relaxed">
          {snipeSummary}
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground leading-relaxed">
          <Filter className="h-3 w-3 shrink-0" />
          <span className="truncate">{filterSummary}</span>
        </div>
      </CardContent>
    </Card>
  );
}
