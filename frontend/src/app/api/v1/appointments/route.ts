export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../../utils/api';

/**
 * 處理對 /api/v1/appointments 的POST請求
 * 代理到FastAPI後端服務
 */
export async function POST(request: NextRequest) {
  try {
    const url = getBackendUrl(`/appointments/`);
    const body = await request.json();

    console.log(`[API Proxy] 發送 POST 請求至: ${url.toString()}`);
    console.log(`[API Proxy] 預約資料:`, body);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[API Proxy] 新增預約錯誤: ${res.status} ${res.statusText}`);
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      return Response.json(
        { error: '新增預約失敗', detail: errorData.detail },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error(`[API Proxy] 建立預約資料錯誤:`, error);
    return Response.json({ error: '建立預約資料時發生錯誤' }, { status: 500 });
  }
}

/**
 * 處理對 /api/v1/appointments 的GET請求
 * 代理到FastAPI後端服務
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = getBackendUrl(`/appointments/`);

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
      console.error(`[API Proxy] 取得預約列表錯誤: ${res.status} ${res.statusText}`);
      return Response.json(
        { error: `取得預約列表失敗: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error(`[API Proxy] 取得預約列表錯誤:`, error);
    return Response.json({ error: '取得預約列表時發生錯誤' }, { status: 500 });
  }
} 