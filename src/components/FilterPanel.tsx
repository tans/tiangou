import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Bot, Percent, Droplet, AlertTriangle, Flame } from 'lucide-react';

export function FilterPanel() {
  const { filters, config, setFilters, setConfig } = useSniperStore();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
        </CardTitle>
        <CardDescription>Configure token filtering rules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-neon-green" />
            <Label htmlFor="filters-enabled">Enable Filters</Label>
          </div>
          <Switch
            id="filters-enabled"
            checked={filters.enabled}
            onCheckedChange={(checked) => setFilters({ enabled: checked })}
          />
        </div>

        <div className={filters.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
          {/* TG Bot Required */}
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="require-tg">Require TG Bot</Label>
            </div>
            <Switch
              id="require-tg"
              checked={filters.requireTG}
              onCheckedChange={(checked) => setFilters({ requireTG: checked })}
            />
          </div>

          {/* Max Buy Tax */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label>Max Buy Tax</Label>
              </div>
              <span className="font-mono text-neon-green">{filters.maxBuyTax}%</span>
            </div>
            <Slider
              value={[filters.maxBuyTax]}
              onValueChange={([value]) => setFilters({ maxBuyTax: value })}
              min={0}
              max={50}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Max Sell Tax */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label>Max Sell Tax</Label>
              </div>
              <span className="font-mono text-neon-green">{filters.maxSellTax}%</span>
            </div>
            <Slider
              value={[filters.maxSellTax]}
              onValueChange={([value]) => setFilters({ maxSellTax: value })}
              min={0}
              max={50}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Min Liquidity */}
          <div className="py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-muted-foreground" />
                <Label>Min Liquidity (ETH)</Label>
              </div>
              <span className="font-mono text-neon-green">{filters.minLiquidity.toFixed(2)}</span>
            </div>
            <Slider
              value={[filters.minLiquidity]}
              onValueChange={([value]) => setFilters({ minLiquidity: value })}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Honeypot Check */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="honeypot-check">Block Honeypots</Label>
            </div>
            <Switch
              id="honeypot-check"
              checked={filters.checkHoneypot}
              onCheckedChange={(checked) => setFilters({ checkHoneypot: checked })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
