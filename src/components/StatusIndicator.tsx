import React from 'react';
import { useSniperStore, type MonitorStatus } from '@/store/sniper';
import { cn } from '@/lib/utils';

const statusConfig: Record<MonitorStatus, { label: string; color: string; animation: string }> = {
  idle: {
    label: 'Offline',
    color: 'bg-muted',
    animation: '',
  },
  connecting: {
    label: 'Connecting...',
    color: 'bg-neon-yellow',
    animation: 'animate-pulse',
  },
  monitoring: {
    label: 'Monitoring',
    color: 'bg-neon-green',
    animation: 'pulse-dot',
  },
  error: {
    label: 'Error',
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
