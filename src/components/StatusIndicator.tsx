import React from 'react';
import { useSniperStore, type MonitorStatus } from '@/store/sniper';
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

export function StatusIndicator() {
  const { status } = useSniperStore();
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-3 w-3 rounded-full', config.color, config.animation)} />
      <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
    </div>
  );
}
