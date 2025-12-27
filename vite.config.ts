import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext', // 关键配置：允许在依赖中使用新特性
    },
  },
  build: {
    target: 'esnext', // 关键配置：构建目标设为支持顶级 await 的版本
  },
  server: {
    host: true,
    port: 3000,
  }
});