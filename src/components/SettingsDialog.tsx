import React, { useState } from 'react';
import { FilterPanel } from './FilterPanel';
import { SniperConfigPanel } from './SniperConfigPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

type Tab = 'filter' | 'snipe';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('filter');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings className="h-4 w-4 mr-1" />
          设置
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>配置设置</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button
            variant={tab === 'filter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('filter')}
          >
            过滤器
          </Button>
          <Button
            variant={tab === 'snipe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('snipe')}
          >
            狙击配置
          </Button>
        </div>
        {tab === 'filter' ? <FilterPanel /> : <SniperConfigPanel />}
      </DialogContent>
    </Dialog>
  );
}