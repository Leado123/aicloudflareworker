// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  adapter: node({
    mode: 'standalone'
  }),


  server: {
    
    port: 4321,
    host: '0.0.0.0'
  },

  vite: {
    server: {
      allowedHosts: ["code.sharesyllabus.me"]
    },
    plugins: [tailwindcss()],
    ssr: {
      external: ['node:buffer', 'node:async_hooks', "react-dom"], // Potentially needed for other Node.js compat issues
    },
    resolve: {
      // This is the key part for MessageChannel issues

    },
  },

  integrations: [react()]
});