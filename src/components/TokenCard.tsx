import React from 'react';
import { type FlapTokenFeedItem } from '@/lib/flap/types';
import { formatAddress, formatTimestamp } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Tag, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenCardProps {
  token: FlapTokenFeedItem;
  isRecent?: boolean;
}

export function TokenCard({ token, isRecent }: TokenCardProps) {
  const passesFilters = token.tradable;

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
      </CardContent>
    </Card>
  );
}
