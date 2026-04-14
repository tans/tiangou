import React from 'react';

import { useSniperStore } from '@/store/sniper';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const VERSIONS = ['v1', 'v2', 'v3', 'v4', 'v5'];

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
  const { config, filters, setConfig, setFilters } = useSniperStore();

  const toggleVersion = (version: string) => {
    const next = filters.allowedVersions.includes(version)
      ? filters.allowedVersions.filter((item) => item !== version)
      : [...filters.allowedVersions, version];

    setFilters({ allowedVersions: next });
  };

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

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-[auto_auto_120px_120px_1fr]">
        <label className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-2 py-2 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">过滤器</span>
          <Switch
            checked={filters.enabled}
            onCheckedChange={(enabled) => setFilters({ enabled })}
            className="scale-90"
          />
        </label>

        <label className="flex items-center justify-between rounded-md border border-border/60 bg-background/50 px-2 py-2 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">仅税币</span>
          <Switch
            checked={filters.onlyTaxToken}
            onCheckedChange={(onlyTaxToken) => setFilters({ onlyTaxToken })}
            className="scale-90"
            disabled={!filters.enabled}
          />
        </label>

        <NumberField
          label="最小进度%"
          value={filters.minProgress}
          step="1"
          min="0"
          onChange={(minProgress) => setFilters({ minProgress })}
        />

        <NumberField
          label="最大进度%"
          value={filters.maxProgress}
          step="1"
          min="0"
          onChange={(maxProgress) => setFilters({ maxProgress })}
        />

        <div className="rounded-md border border-border/60 bg-background/50 px-2 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            版本
          </div>
          <div className="flex flex-wrap gap-1">
            {VERSIONS.map((version) => (
              <button
                key={version}
                type="button"
                onClick={() => toggleVersion(version)}
                disabled={!filters.enabled}
                className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${
                  filters.allowedVersions.includes(version)
                    ? 'bg-neon-green text-black'
                    : 'bg-secondary text-muted-foreground'
                } ${!filters.enabled ? 'opacity-50' : ''}`}
              >
                {version}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
