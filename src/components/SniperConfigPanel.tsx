import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Crosshair, ShieldAlert, Target, Zap } from 'lucide-react';

export function SniperConfigPanel() {
  const { config, setConfig } = useSniperStore();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-neon-green" />
          狙击配置
        </CardTitle>
              </CardHeader>
      <CardContent className="space-y-6">
        {/* Buy Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="buy-amount">买入金额 (BNB)</Label>
          </div>
          <Input
            id="buy-amount"
            type="number"
            step="0.001"
            min="0.001"
            max="10"
            value={config.buyAmount}
            onChange={(e) => setConfig({ buyAmount: parseFloat(e.target.value) || 0 })}
            className="font-mono"
          />
        </div>

        {/* Slippage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>滑点</Label>
            <span className="font-mono text-neon-green">{config.slippage}%</span>
          </div>
          <Slider
            value={[config.slippage]}
            onValueChange={([value]) => setConfig({ slippage: value })}
            min={0.1}
            max={50}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Stop Loss */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-neon-red" />
              <Label>止损</Label>
            </div>
            <span className="font-mono text-neon-red">{config.stopLossPercent}%</span>
          </div>
          <Slider
            value={[config.stopLossPercent]}
            onValueChange={([value]) => setConfig({ stopLossPercent: value })}
            min={5}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Take Profit Step 1 */}
        <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-neon-green" />
            <Label className="text-sm">止盈 1</Label>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">利润达到</span>
            <span className="font-mono text-neon-green">{config.takeProfitStep1.profitPercent}%</span>
          </div>
          <Slider
            value={[config.takeProfitStep1.profitPercent]}
            onValueChange={([value]) => setConfig({
              takeProfitStep1: { ...config.takeProfitStep1, profitPercent: value }
            })}
            min={10}
            max={200}
            step={5}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">卖出仓位</span>
            <span className="font-mono text-neon-blue">{config.takeProfitStep1.sellPercent}%</span>
          </div>
          <Slider
            value={[config.takeProfitStep1.sellPercent]}
            onValueChange={([value]) => setConfig({
              takeProfitStep1: { ...config.takeProfitStep1, sellPercent: value }
            })}
            min={10}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Take Profit Step 2 */}
        <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-neon-blue" />
            <Label className="text-sm">止盈 2</Label>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">利润达到</span>
            <span className="font-mono text-neon-green">{config.takeProfitStep2.profitPercent}%</span>
          </div>
          <Slider
            value={[config.takeProfitStep2.profitPercent]}
            onValueChange={([value]) => setConfig({
              takeProfitStep2: { ...config.takeProfitStep2, profitPercent: value }
            })}
            min={50}
            max={500}
            step={10}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">卖出仓位</span>
            <span className="font-mono text-neon-blue">{config.takeProfitStep2.sellPercent}%</span>
          </div>
          <Slider
            value={[config.takeProfitStep2.sellPercent]}
            onValueChange={([value]) => setConfig({
              takeProfitStep2: { ...config.takeProfitStep2, sellPercent: value }
            })}
            min={10}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Auto Snipe */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-neon-yellow" />
            <Label htmlFor="auto-snipe">自动狙击</Label>
          </div>
          <Switch
            id="auto-snipe"
            checked={config.autoSnipe}
            onCheckedChange={(checked) => setConfig({ autoSnipe: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
