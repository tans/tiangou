import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { sniperEngine } from '@/lib/sniper-engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Crosshair, Shield, Zap, Play, Square } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export function SniperConfigPanel() {
  const { config, status, setConfig } = useSniperStore();

  const handleStartMonitoring = () => {
    sniperEngine.startMonitoring();
  };

  const handleStopMonitoring = () => {
    sniperEngine.stopMonitoring();
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-neon-green" />
          Sniper Config
        </CardTitle>
        <CardDescription>Configure buy parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Buy Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="buy-amount">Buy Amount (ETH)</Label>
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
            <Label>Slippage</Label>
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

        {/* Auto Snipe */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-neon-yellow" />
            <Label htmlFor="auto-snipe">Auto Snipe</Label>
          </div>
          <Switch
            id="auto-snipe"
            checked={config.autoSnipe}
            onCheckedChange={(checked) => setConfig({ autoSnipe: checked })}
          />
        </div>

        {/* MEV Protection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="mev-protection">MEV Protection</Label>
          </div>
          <Switch
            id="mev-protection"
            checked={config.mevProtection}
            onCheckedChange={(checked) => setConfig({ mevProtection: checked })}
          />
        </div>

        {/* Gas Price */}
        <div className="p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gas Price</span>
            <span className="font-mono text-neon-blue">
              {formatNumber(Number(config.gasPrice) / 1e9, 1)} Gwei
            </span>
          </div>
        </div>

        {/* Start/Stop Button */}
        <Button
          onClick={status === 'monitoring' ? handleStopMonitoring : handleStartMonitoring}
          variant={status === 'monitoring' ? 'destructive' : 'neon'}
          className="w-full gap-2"
        >
          {status === 'monitoring' ? (
            <>
              <Square className="h-4 w-4" />
              Stop Monitoring
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Monitoring
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
