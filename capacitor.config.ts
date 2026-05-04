import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fakecall',
  appName: 'FakeCall',
  webDir: 'dist',
  server: {
    url: 'https://8fd92c6a-dd70-4bf0-9ee9-70a9147d9f88.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
