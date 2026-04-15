import React from 'react';
import { useSniperStore, TakeProfitStep } from '@/store/sniper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Crosshair, ShieldAlert, Target, Zap, Plus, Trash2 } from 'lucide-react';

const STEP_COLORS = [
  'text-neon-green',
  'text-neon-blue',
  'text-neon-yellow',
  'text-neon-red',
  'text-neon-purple',
];

export function SniperConfigPanel() {
  const { config, setConfig } = useSniperStore();

  const updateTakeProfitStep = (index: number, updates: Partial<TakeProfitStep>) => {
    const newSteps = [...config.takeProfitSteps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setConfig({ takeProfitSteps: newSteps });
  };

  const addTakeProfitStep = () => {
    if (config.takeProfitSteps.length >= 5) return;
    const newId = `tp${config.takeProfitSteps.length + 1}`;
    const lastStep = config.takeProfitSteps[config.takeProfitSteps.length - 1];
    const newStep: TakeProfitStep = {
      id: newId,
      profitPercent: lastStep ? lastStep.profitPercent + 50 : 100,
      sellPercent: lastStep ? lastStep.sellPercent : 30,
      executed: false,
    };
    setConfig({ takeProfitSteps: [...config.takeProfitSteps, newStep] });
  };

  const removeTakeProfitStep = (index: number) => {
    if (config.takeProfitSteps.length <= 1) return;
    const newSteps = config.takeProfitSteps.filter((_, i) => i !== index);
    setConfig({ takeProfitSteps: newSteps });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-neon-green" />
          狙击配置
        </CardTitle>
        <CardDescription>导入私钥后可自动狙击</CardDescription>
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

        {/* Take Profit Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-neon-green" />
              <Label>止盈策略</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addTakeProfitStep}
              disabled={config.takeProfitSteps.length >= 5}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              添加
            </Button>
          </div>

          {config.takeProfitSteps.map((step, index) => (
            <div key={step.id} className="p-3 rounded-lg bg-secondary/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className={`h-4 w-4 ${STEP_COLORS[index % STEP_COLORS.length]}`} />
                  <Label className="text-sm">止盈 {index + 1}</Label>
                </div>
                {config.takeProfitSteps.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTakeProfitStep(index)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-neon-red"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">利润达到</span>
                <span className={`font-mono ${STEP_COLORS[index % STEP_COLORS.length]}`}>
                  {step.profitPercent}%
                </span>
              </div>
              <Slider
                value={[step.profitPercent]}
                onValueChange={([value]) => updateTakeProfitStep(index, { profitPercent: value })}
                min={10}
                max={500}
                step={5}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">卖出仓位</span>
                <span className="font-mono text-neon-blue">{step.sellPercent}%</span>
              </div>
              <Slider
                value={[step.sellPercent]}
                onValueChange={([value]) => updateTakeProfitStep(index, { sellPercent: value })}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          ))}
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