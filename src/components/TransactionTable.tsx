import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { formatAddress, formatTimestamp, formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle, XCircle, Clock, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TransactionTable() {
  const { transactions } = useSniperStore();

  const statusConfig = {
    pending: { label: 'Pending', icon: Clock, className: 'text-neon-yellow' },
    success: { label: 'Success', icon: CheckCircle, className: 'text-neon-green' },
    failed: { label: 'Failed', icon: XCircle, className: 'text-neon-red' },
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-neon-green" />
          Transactions
          <Badge variant="secondary" className="ml-2">{transactions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Start monitoring to see your sniper activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const status = statusConfig[tx.status];
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={tx.hash}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{tx.token.symbol}</span>
                      <Badge variant={tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'destructive' : 'secondary'}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatTimestamp(tx.timestamp)}</span>
                      <span className="font-mono">
                        {formatNumber(Number(tx.amountIn) / 1e18, 4)} ETH
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.hash && (
                      <a
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-neon-green" />
                      </a>
                    )}
                    <StatusIcon className={cn('h-5 w-5', status.className)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
