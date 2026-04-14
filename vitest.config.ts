import { defineConfig } from 'vitest/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import astro from 'astro/config';

export default defineConfig({
  plugins: [react(), tailwind(), astro()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/styles/'],
    },
  },
});
