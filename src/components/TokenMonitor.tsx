import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { TokenCard } from './TokenCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, TrendingUp } from 'lucide-react';

export function TokenMonitor() {
  const { detectedTokens, recentToken, status } = useSniperStore();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-neon-green" />
            Token Monitor
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {detectedTokens.length} detected
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'idle' ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Monitoring paused</p>
            <p className="text-sm">Start monitoring to detect new tokens</p>
          </div>
        ) : detectedTokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-neon-green/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-neon-green/50 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-neon-green/20 animate-pulse" />
            </div>
            <p className="text-muted-foreground">Listening for new tokens...</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Mempool monitoring active</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recent token highlight */}
            {recentToken && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Latest Detection</p>
                <TokenCard token={recentToken} isRecent />
              </div>
            )}
            
            {/* History */}
            {detectedTokens.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">History</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {detectedTokens.slice(1).map((token) => (
                    <TokenCard key={token.address} token={token} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
