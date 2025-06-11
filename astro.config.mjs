// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    },
  }),

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['node:buffer', 'node:async_hooks'], // Potentially needed for other Node.js compat issues
    },
    resolve: {
      // This is the key part for MessageChannel issues
      alias: {
        'react-dom/server': 'react-dom/server.edge',
      },
    },
  },

  integrations: [react()]
});