import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.giffordconnect',
  appName: 'Gifford Connect',
  webDir: 'dist',
  server: {
    url: 'https://5050c73e-0d06-4f2b-b0a3-1e986daecc2f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
