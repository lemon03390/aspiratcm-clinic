export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../../utils/api';

/**
 * 處理對 /api/v1/doctors 的GET請求
 * 代理到FastAPI後端服務
 */
export async function GET(request: NextRequest) {
  try {
    console.log('開始處理 /api/v1/doctors 的 GET 請求');

    const { searchParams } = request.nextUrl;
    const url = getBackendUrl('/doctors/');

    // 加上搜尋參數
    if (searchParams.toString()) {
      url.search = searchParams.toString();
    }

    console.log(`[API Proxy] 發送 GET 請求至: ${url.toString()}`);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[API Proxy] 取得醫師列表錯誤: ${res.status} ${res.statusText}`);
      return Response.json(
        { error: `取得醫師列表失敗: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error: any) {
    console.error('[API Proxy] 取得醫師列表錯誤:', error.message);
    return Response.json({ error: '取得醫師列表時發生錯誤' }, { status: 500 });
  }
}

/**
 * 處理對 /api/v1/doctors 的POST請求
 * 代理到FastAPI後端服務
 */
export async function POST(request: NextRequest) {
  try {
    console.log('開始處理 /api/v1/doctors 的 POST 請求');

    // 獲取請求體
    const body = await request.json();

    // 使用統一函數獲取後端URL
    const url = getBackendUrl('/doctors/');

    console.log(`[API Proxy] 發送 POST 請求至: ${url.toString()}`);
    console.log('[API Proxy] 醫師資料:', body);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[API Proxy] 新增醫師錯誤: ${res.status} ${res.statusText}`);
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      return Response.json(
        { error: '新增醫師失敗', detail: errorData.detail },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error: any) {
    console.error('[API Proxy] 建立醫師資料錯誤:', error.message);
    return Response.json({ error: '建立醫師資料時發生錯誤' }, { status: 500 });
  }
} 