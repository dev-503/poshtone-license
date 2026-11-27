import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    // import only the lucide icons actually used instead of the whole icon barrel
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
