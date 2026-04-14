import React from 'react';
import { useSniperStore, type Token } from '@/store/sniper';
import { formatAddress, formatTimestamp } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Bot, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenCardProps {
  token: Token;
  isRecent?: boolean;
}

export function TokenCard({ token, isRecent }: TokenCardProps) {
  const { filters } = useSniperStore();

  const passesFilters = 
    (!filters.requireTG || token.hasTG) &&
    token.buyTax <= filters.maxBuyTax &&
    token.sellTax <= filters.maxSellTax &&
    (!filters.checkHoneypot || !token.isHoneypot);

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
              <span>Buy: <span className={cn(
                "font-mono",
                token.buyTax > filters.maxBuyTax ? "text-neon-red" : "text-neon-green"
              )}>{token.buyTax.toFixed(1)}%</span></span>
              <span>Sell: <span className={cn(
                "font-mono",
                token.sellTax > filters.maxSellTax ? "text-neon-red" : "text-neon-green"
              )}>{token.sellTax.toFixed(1)}%</span></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={token.hasTG ? "default" : "secondary"} className="gap-1">
              <Bot className="h-3 w-3" />
              {token.hasTG ? 'TG' : 'No TG'}
            </Badge>
            {passesFilters ? (
              <CheckCircle className="h-5 w-5 text-neon-green" />
            ) : (
              <XCircle className="h-5 w-5 text-neon-red" />
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTimestamp(token.detectedAt)}</span>
          {token.isHoneypot && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Honeypot
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
