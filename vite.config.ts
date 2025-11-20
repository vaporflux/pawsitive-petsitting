import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // 1. Polyfill process.env as an empty object so third-party libs don't crash
      'process.env': {},
      // 2. Hard-replace process.env.API_KEY with the string value (or empty string)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    }
  };
});