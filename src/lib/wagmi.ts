import { http, createConfig, createStorage } from 'wagmi';
import { mainnet, sepolia, arbitrum, optimism, base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID'; // Replace with your WalletConnect project ID

export const config = createConfig({
  chains: [mainnet, sepolia, arbitrum, optimism, base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }),
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
