import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { sniperEngine } from './lib/sniper-engine';

export default function App() {
  useEffect(() => {
    // Check if wallet was previously connected and auto-start monitoring
    sniperEngine.checkAutoStart();
  }, []);

  return <Dashboard />;
}
