import { defineConfig } from 'vite';

export default defineConfig({
  base: './' // 빌드 시 파일 경로를 상대 경로로 변환하여 서브디렉토리 배포 지원
});
