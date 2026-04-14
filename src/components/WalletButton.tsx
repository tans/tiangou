import React from 'react';
import { useSniperStore } from '@/store/sniper';
import { sniperEngine } from '@/lib/sniper-engine';
import { formatAddress, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WalletButton() {
  const { address, balance, isConnected, status } = useSniperStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await sniperEngine.initialize();
      await sniperEngine.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await sniperEngine.disconnect();
  };

  if (status === 'connecting' || isConnecting) {
    return (
      <Button disabled variant="neon" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <Button onClick={handleConnect} variant="neon" className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
        <div className="h-2 w-2 rounded-full bg-neon-green pulse-dot" />
        <span className="font-mono text-sm">{formatAddress(address)}</span>
      </div>
      <div className="rounded-lg bg-secondary px-4 py-2">
        <span className="font-mono text-sm text-neon-green">
          {formatNumber(Number(balance) / 1e18, 4)} ETH
        </span>
      </div>
      <Button onClick={handleDisconnect} variant="ghost" size="icon">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
