import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  // 相対パスにしておくと、ドメイン直下でもサブフォルダでも配信できる
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Lulus Nihongo',
        short_name: 'Lulus Nihongo',
        description: 'Latihan soal dan simulasi ujian JFT-Basic (tidak resmi) dengan pembahasan Bahasa Indonesia',
        lang: 'id',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1f5fbf',
        background_color: '#f5f7fb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // BR-O1: アプリ本体と問題データ(JS に同梱)は事前に保存する
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // 記事のページ(/panduan/…)は、アプリの画面に差し替えずにそのまま表示する
        navigateFallbackDenylist: [/^\/panduan(\/|$)/],
        // BR-O2: 音声と画像は最初に使ったときに保存する
        runtimeCaching: [
          {
            urlPattern: /\/(audio|images)\/.+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 600 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
