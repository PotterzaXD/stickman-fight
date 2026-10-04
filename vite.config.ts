import { defineConfig } from 'vite';

export default defineConfig({
  // Firebase is only downloaded when someone uses Google sign-in.
  build: { chunkSizeWarningLimit: 700 },
});
