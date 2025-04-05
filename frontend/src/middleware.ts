import { NextRequest, NextResponse } from 'next/server';

// API路由前綴
const API_ROUTE_PREFIX = '/api/v1';
// FastAPI後端地址
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * 中間件函數，處理所有請求
 * 將API請求代理到後端
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const { method } = request;
  
  // 只處理/api/v1路徑下的請求
  if (pathname.startsWith(API_ROUTE_PREFIX)) {
    console.log(`[Middleware] ${method} ${pathname} - 執行中間件`);
    
    // 記錄所有請求，有助於調試
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    console.log({
      url: request.url,
      method: request.method,
      pathname,
      search: Object.fromEntries(searchParams.entries()),
      headers: headers,
    });
    
    // 對於 POST /api/v1/appointments 特別記錄
    if (method === 'POST' && pathname === '/api/v1/appointments') {
      console.log('[Middleware] 捕獲到預約 POST 請求，應由 route.ts 處理');
    }
    
    // 對於API路由，我們讓Next.js的API路由處理代理，無需在中間件中處理
    // 這是因為在中間件中直接進行請求轉發比較複雜
    const response = NextResponse.next();
    
    // 增加回應頭，用於調試
    response.headers.set('X-Middleware-Cache', 'no-cache');
    response.headers.set('X-Middleware-Timestamp', Date.now().toString());
    
    return response;
  }
  
  // 對於其他請求，直接通過
  return NextResponse.next();
}

// 配置中間件匹配路徑
export const config = {
  matcher: [
    // 匹配所有API請求路徑
    '/api/v1/:path*',
  ],
}; 