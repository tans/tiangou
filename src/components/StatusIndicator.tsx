import React from 'react';
import { useSniperStore, type MonitorStatus } from '@/store/sniper';
import { getRpcStatus, getRpcUrl, type RpcStatus } from '@/lib/flap/client';
import { cn } from '@/lib/utils';

const statusConfig: Record<MonitorStatus, { label: string; color: string; animation: string }> = {
  idle: {
    label: '空闲',
    color: 'bg-muted',
    animation: '',
  },
  connecting: {
    label: '连接中',
    color: 'bg-neon-yellow',
    animation: 'animate-pulse',
  },
  monitoring: {
    label: '监控中',
    color: 'bg-neon-green',
    animation: 'pulse-dot',
  },
  sniping: {
    label: '狙击中',
    color: 'bg-neon-blue',
    animation: 'animate-pulse',
  },
  error: {
    label: '错误',
    color: 'bg-neon-red',
    animation: '',
  },
};

const rpcStatusConfig: Record<RpcStatus, { label: string; color: string }> = {
  connected: {
    label: 'RPC正常',
    color: 'bg-neon-green',
  },
  degraded: {
    label: 'RPC延迟',
    color: 'bg-neon-yellow',
  },
  disconnected: {
    label: 'RPC断开',
    color: 'bg-neon-red',
  },
};

export function StatusIndicator() {
  const { status } = useSniperStore();
  const config = statusConfig[status];
  const rpcStatus = getRpcStatus();
  const rpcConfig = rpcStatusConfig[rpcStatus];
  const rpcUrl = getRpcUrl();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={cn('h-3 w-3 rounded-full', config.color, config.animation)} />
        <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5" title={`RPC: ${rpcUrl}`}>
        <div className={cn('h-2 w-2 rounded-full', rpcConfig.color)} />
        <span className="text-xs text-muted-foreground">{rpcConfig.label}</span>
      </div>
    </div>
  );
}
