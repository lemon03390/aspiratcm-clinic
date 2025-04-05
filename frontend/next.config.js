/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config) => {
    // 添加對 CSS 匯入的處理
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === 'object')
      .oneOf.filter((rule) => Array.isArray(rule.use));
    
    // 確保 CSS 規則能夠處理 @import
    rules.forEach((rule) => {
      if (rule.use.find((use) => use.loader && use.loader.includes('css-loader'))) {
        rule.use.forEach((use) => {
          if (use.loader && use.loader.includes('css-loader')) {
            use.options = {
              ...use.options,
              importLoaders: 1,
            };
          }
        });
      }
    });

    return config;
  },
  env: {
    // 確保 NEXT_PUBLIC_API_BASE_URL 環境變數可用，
    // 如果未設置，則在開發環境中默認使用 localhost:8000，在生產環境中默認使用相對路徑
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 
      (process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8000/api/v1' 
        : '/api/v1')
  },
  // 添加重寫規則，確保 Next.js 能夠代理 API 請求
  async rewrites() {
    console.log(`當前環境: ${process.env.NODE_ENV}`);
    console.log(`API基礎URL: ${process.env.NEXT_PUBLIC_API_BASE_URL || '未設置，使用默認值'}`);
    
    return [
      // 如果在開發環境，將 API 請求代理到後端
      ...(process.env.NODE_ENV === 'development' ? [
        {
          source: '/api/v1/:path*',
          destination: 'http://localhost:8000/api/v1/:path*' // 代理到本地後端
        }
      ] : [])
    ];
  }
};

module.exports = nextConfig; 