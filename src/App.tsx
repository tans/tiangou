import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { sniperEngine } from './lib/sniper-engine';

export default function App() {
  useEffect(() => {
    // Auto-start monitoring on page load (no wallet required)
    sniperEngine.startMonitoringWithoutWallet();
  }, []);

  return <Dashboard />;
}
