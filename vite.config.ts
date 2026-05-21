import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: "VouGanhei! - Sorteios em Tempo Real",
          short_name: "VouGanhei!",
          description: "Aplicativo de Sorteios e Rifas Interativo em Tempo Real",
          theme_color: "#0F1115",
          background_color: "#0F1115",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/icon.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "maskable"
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
