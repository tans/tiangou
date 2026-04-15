import React, { useState } from 'react';
import { type FlapTokenFeedItem } from '@/lib/flap/types';
import { formatAddress, formatTimestamp } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Tag, TrendingUp, ChevronDown, Flame, Users, Plus, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenCardProps {
  token: FlapTokenFeedItem;
  isRecent?: boolean;
}

function formatTaxPercent(bps: number | undefined): string {
  if (bps === undefined) return '-';
  return `${(bps / 100).toFixed(1)}%`;
}

export function TokenCard({ token, isRecent }: TokenCardProps) {
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const passesFilters = token.tradable;
  const hasTaxDistribution = token.taxBurn !== undefined || token.taxDividend !== undefined || token.taxAddPool !== undefined || token.taxTreasury !== undefined;

  return (
    <Card className={cn(
      "transition-all duration-300",
      isRecent && "animate-slide-in border-neon-green/50 neon-glow",
      passesFilters ? "border-neon-green/30" : "border-neon-red/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{token.name}</h3>
              <span className="text-muted-foreground font-mono text-sm">{token.symbol}</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground truncate">
              {formatAddress(token.address)}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                进度: <span className="font-mono text-neon-green">{token.progress}%</span>
              </span>
              <span className="flex items-center gap-1">
                版本: <span className="font-mono">{token.version}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {token.isTaxToken && (
              <Badge variant="default" className="gap-1">
                <Tag className="h-3 w-3" />
                税币
              </Badge>
            )}
            {token.isTaxToken && (token.buyTax !== undefined || token.sellTax !== undefined) && (
              <button
                onClick={() => setShowTaxDetails(!showTaxDetails)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-green transition-colors"
              >
                <span className="font-mono">
                  税:{formatTaxPercent(token.buyTax)}/{formatTaxPercent(token.sellTax)}
                </span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", showTaxDetails && "rotate-180")} />
              </button>
            )}
            {passesFilters ? (
              <CheckCircle className="h-5 w-5 text-neon-green" />
            ) : (
              <XCircle className="h-5 w-5 text-neon-red" />
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTimestamp(token.detectedAt)}</span>
          {token.tradable ? (
            <span className="text-neon-green">可交易</span>
          ) : (
            <span className="text-neon-red">不可交易</span>
          )}
        </div>

        {showTaxDetails && hasTaxDistribution && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="text-muted-foreground">销毁</span>
                <span className="ml-auto font-mono text-neon-green">{formatTaxPercent(token.taxBurn)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">分红</span>
                <span className="ml-auto font-mono text-neon-green">{formatTaxPercent(token.taxDividend)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3 text-purple-500" />
                <span className="text-muted-foreground">加池</span>
                <span className="ml-auto font-mono text-neon-green">{formatTaxPercent(token.taxAddPool)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-3 w-3 text-yellow-500" />
                <span className="text-muted-foreground">税收金库</span>
                <span className="ml-auto font-mono text-neon-green">{formatTaxPercent(token.taxTreasury)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
