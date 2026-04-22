import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { sniperEngine } from './lib/sniper-engine';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from './components/ui/Toast';

export default function App() {
  useEffect(() => {
    // Auto-start monitoring on page load (no wallet required)
    sniperEngine.startMonitoringWithoutWallet();
  }, []);

  return (
    <ErrorBoundary>
      <Dashboard />
      <Toaster />
    </ErrorBoundary>
  );
}
