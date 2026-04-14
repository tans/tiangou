import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  base: '/tiangou/',
  integrations: [react(), tailwind()],
  vite: {
    ssr: {
      noExternal: ['viem', 'wagmi', '@tanstack/react-query']
    }
  }
});
