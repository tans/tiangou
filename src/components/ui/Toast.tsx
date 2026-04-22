import React, { useEffect } from 'react';
import { useToastStore, toastIcons, toastStyles, type Toast } from '@/store/toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = toastIcons[toast.type];
  const styles = toastStyles[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-right-5 fade-in duration-300',
        styles.bg,
        styles.border
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', styles.icon)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
