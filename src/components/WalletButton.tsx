import React, { useState } from 'react';
import { useSniperStore } from '@/store/sniper';
import { initWalletClient, getAccountAddress, isWalletConnected, AVAILABLE_RPC_URLS, setRpcUrl } from '@/lib/flap/client';
import { getBnbBalance } from '@/lib/flap/trading';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Key, LogOut, AlertCircle, Settings } from 'lucide-react';
import { useEffect } from 'react';

export function WalletButton() {
  const { address, bnbBalance, isConnected, status, config, setAddress, setBnbBalance, setStatus, setConfig } = useSniperStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [rpcUrl, setRpcUrlState] = useState(config.rpcUrl);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!privateKey.trim()) {
      setError('请输入私钥');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setStatus('connecting');

    try {
      initWalletClient(privateKey.trim(), config.rpcUrl);
      const addr = getAccountAddress();
      if (!addr) {
        throw new Error('无效的私钥');
      }

      setAddress(addr as `0x${string}`);
      setStatus('idle');

      const balance = await getBnbBalance(addr);
      setBnbBalance(balance);

      setShowImportModal(false);
      setPrivateKey('');
    } catch (err) {
      setError((err as Error).message || '连接失败');
      setStatus('idle');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveSettings = () => {
    setRpcUrl(rpcUrl);
    setConfig({ rpcUrl });
    setShowSettingsModal(false);
  };

  const handleDisconnect = () => {
    setAddress(null);
    setBnbBalance(0n);
    setStatus('idle');
  };

  const formatShortAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  useEffect(() => {
    if (address && isWalletConnected()) {
      getBnbBalance(address).then(setBnbBalance).catch(console.error);
    }
  }, [address, isConnected]);

  if (showSettingsModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-neon-green" />
            <h2 className="text-xl font-bold">节点设置</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rpc-url">RPC 节点地址</Label>
            <Input
              id="rpc-url"
              type="text"
              placeholder="https://bsc-dataseed.binance.org/"
              value={rpcUrl}
              onChange={(e) => setRpcUrlState(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              输入你的 BSC 节点地址，或选择下方预设节点
            </p>
          </div>

          <div className="space-y-2">
            <Label>预设节点</Label>
            <div className="space-y-2">
              {AVAILABLE_RPC_URLS.map((url) => (
                <button
                  key={url}
                  onClick={() => setRpcUrlState(url)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-mono text-sm transition-colors ${
                    rpcUrl === url
                      ? 'bg-neon-green/20 border border-neon-green text-neon-green'
                      : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                  }`}
                >
                  {url}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowSettingsModal(false)}
            >
              取消
            </Button>
            <Button
              variant="neon"
              className="flex-1"
              onClick={handleSaveSettings}
            >
              保存
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showImportModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <Key className="h-6 w-6 text-neon-green" />
            <h2 className="text-xl font-bold">导入私钥</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="private-key">私钥</Label>
            <Input
              id="private-key"
              type="password"
              placeholder="输入私钥 (64个字符)"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              警告：不要在不信任的网站上输入私钥。您的私钥仅存储在本地浏览器中。
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-neon-red text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setShowImportModal(false);
                setPrivateKey('');
                setError(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="neon"
              className="flex-1"
              onClick={handleImport}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  连接中...
                </>
              ) : (
                '导入'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'connecting' || isConnecting) {
    return (
      <Button disabled variant="neon" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        连接中...
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="flex gap-2">
        <Button onClick={() => setShowSettingsModal(true)} variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
        <Button onClick={() => setShowImportModal(true)} variant="neon" className="gap-2">
          <Key className="h-4 w-4" />
          导入私钥
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => setShowSettingsModal(true)} variant="ghost" size="icon">
        <Settings className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
        <div className="h-2 w-2 rounded-full bg-neon-green pulse-dot" />
        <span className="font-mono text-sm">{formatShortAddress(address)}</span>
      </div>
      <div className="rounded-lg bg-secondary px-4 py-2">
        <span className="font-mono text-sm text-neon-green">
          {formatNumber(Number(bnbBalance) / 1e18, 4)} BNB
        </span>
      </div>
      <Button onClick={handleDisconnect} variant="ghost" size="icon">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
