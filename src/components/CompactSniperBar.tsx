import React from 'react';

import { useSniperStore } from '@/store/sniper';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

function NumberField({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: string;
  min?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
      <span>{label}</span>
      <Input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(event) => onChange(Number.parseFloat(event.target.value) || 0)}
        className="h-8 rounded-md px-2 py-1 font-mono text-xs"
      />
    </label>
  );
}

export function CompactSniperBar() {
  const { config, setConfig } = useSniperStore();

  return (
    <section className="rounded-lg border border-border/60 bg-card/70 p-3 backdrop-blur">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <NumberField
          label="买入 BNB"
          value={config.buyAmount}
          step="0.001"
          min="0"
          onChange={(buyAmount) => setConfig({ buyAmount })}
        />
        <NumberField
          label="滑点 %"
          value={config.slippage}
          step="0.1"
          min="0"
          onChange={(slippage) => setConfig({ slippage })}
        />
        <NumberField
          label="止损 %"
          value={config.stopLossPercent}
          step="1"
          min="0"
          onChange={(stopLossPercent) => setConfig({ stopLossPercent })}
        />
        <NumberField
          label="TP1 利润%"
          value={config.takeProfitStep1.profitPercent}
          step="5"
          min="0"
          onChange={(profitPercent) => setConfig({
            takeProfitStep1: { ...config.takeProfitStep1, profitPercent },
          })}
        />
        <NumberField
          label="TP1 卖出%"
          value={config.takeProfitStep1.sellPercent}
          step="5"
          min="0"
          onChange={(sellPercent) => setConfig({
            takeProfitStep1: { ...config.takeProfitStep1, sellPercent },
          })}
        />
        <NumberField
          label="TP2 利润%"
          value={config.takeProfitStep2.profitPercent}
          step="5"
          min="0"
          onChange={(profitPercent) => setConfig({
            takeProfitStep2: { ...config.takeProfitStep2, profitPercent },
          })}
        />
        <NumberField
          label="TP2 卖出%"
          value={config.takeProfitStep2.sellPercent}
          step="5"
          min="0"
          onChange={(sellPercent) => setConfig({
            takeProfitStep2: { ...config.takeProfitStep2, sellPercent },
          })}
        />
        <label className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-2 py-2 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">自动狙击</span>
          <Switch
            checked={config.autoSnipe}
            onCheckedChange={(autoSnipe) => setConfig({ autoSnipe })}
            className="scale-90"
          />
        </label>
      </div>
    </section>
  );
}
