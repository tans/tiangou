import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Flame, Tag, TrendingUp, Layers, DollarSign, MessageCircle, Percent, Hash } from 'lucide-react';

const VERSIONS = ['v1', 'v2', 'v3', 'v4', 'v5'];

export function FilterPanel() {
  const { filters, config, setFilters, setConfig } = useSniperStore();

  const toggleVersion = (version: string) => {
    const newVersions = filters.allowedVersions.includes(version)
      ? filters.allowedVersions.filter((v) => v !== version)
      : [...filters.allowedVersions, version];
    setFilters({ allowedVersions: newVersions });
  };

  const selectAllVersions = () => {
    setFilters({ allowedVersions: [...VERSIONS] });
  };

  const deselectAllVersions = () => {
    setFilters({ allowedVersions: [] });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          过滤器
        </CardTitle>
        <CardDescription>配置代币筛选规则</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-neon-green" />
            <Label htmlFor="filters-enabled">启用过滤器</Label>
          </div>
          <Switch
            id="filters-enabled"
            checked={filters.enabled}
            onCheckedChange={(checked) => setFilters({ enabled: checked })}
          />
        </div>

        <div className={filters.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
          {/* Tax Token Only */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="only-tax-token">仅显示税币</Label>
            </div>
            <Switch
              id="only-tax-token"
              checked={filters.onlyTaxToken}
              onCheckedChange={(checked) => setFilters({ onlyTaxToken: checked })}
            />
          </div>

          {/* Min Progress */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <Label>最低进度</Label>
              </div>
              <span className="font-mono text-neon-green">{filters.minProgress}%</span>
            </div>
            <Slider
              value={[filters.minProgress]}
              onValueChange={([value]) => setFilters({ minProgress: value })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Max Progress */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <Label>最高进度</Label>
              </div>
              <span className="font-mono text-neon-green">{filters.maxProgress}%</span>
            </div>
            <Slider
              value={[filters.maxProgress]}
              onValueChange={([value]) => setFilters({ maxProgress: value })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Versions */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <Label>版本筛选</Label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllVersions}
                  className="px-2 py-1 rounded text-xs bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                >
                  全部选中
                </button>
                <button
                  onClick={deselectAllVersions}
                  className="px-2 py-1 rounded text-xs bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                >
                  全部取消
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {VERSIONS.map((version) => (
                <button
                  key={version}
                  onClick={() => toggleVersion(version)}
                  className={`px-3 py-1 rounded-full text-sm font-mono transition-colors ${
                    filters.allowedVersions.includes(version)
                      ? 'bg-neon-green text-black'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {version}
                </button>
              ))}
            </div>
          </div>

          {/* Max Tax Rate */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label>最高税率 (≥5.25%不买)</Label>
              </div>
              <span className="font-mono text-neon-green">{filters.maxTaxRate}%</span>
            </div>
            <Slider
              value={[filters.maxTaxRate]}
              onValueChange={([value]) => setFilters({ maxTaxRate: value })}
              min={0}
              max={20}
              step={0.25}
              className="w-full"
            />
          </div>

          {/* Max Market Cap */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="max-market-cap">最大市值 (USD)</Label>
              </div>
              <Input
                id="max-market-cap"
                type="number"
                value={filters.maxMarketCap ?? ''}
                onChange={(e) => setFilters({ maxMarketCap: Number(e.target.value) || undefined })}
                className="w-28 h-8 text-right font-mono text-sm"
                placeholder="50k"
              />
            </div>
          </div>

          {/* Require TG Group */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="require-tg">必须有TG群</Label>
            </div>
            <Switch
              id="require-tg"
              checked={filters.requireTgGroup}
              onCheckedChange={(checked) => setFilters({ requireTgGroup: checked })}
            />
          </div>

          {/* Exclude Pure Wallet Tax */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="exclude-pure-wallet-tax">过滤纯私钱包税</Label>
                <p className="text-xs text-muted-foreground mt-0.5">过滤税收100%进私人钱包的CA</p>
              </div>
            </div>
            <Switch
              id="exclude-pure-wallet-tax"
              checked={filters.excludePureWalletTax}
              onCheckedChange={(checked) => setFilters({ excludePureWalletTax: checked })}
            />
          </div>

          {/* Token Address Suffix */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="token-suffix">代币尾号筛选</Label>
              </div>
              <Input
                id="token-suffix"
                type="text"
                value={filters.tokenAddressSuffix ?? ''}
                onChange={(e) => setFilters({ tokenAddressSuffix: e.target.value || null })}
                className="w-28 h-8 text-right font-mono text-sm"
                placeholder="7777"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">为空时不过滤，例如: 7777</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
