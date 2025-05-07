export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../../../utils/api';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const url = getBackendUrl(`/patient_registration/reference-data/`);

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
            console.error(`[API Proxy] 取得參考資料錯誤: ${res.status} ${res.statusText}`);
            return Response.json(
                { error: `取得參考資料失敗: ${res.statusText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 取得參考資料錯誤:`, error);
        return Response.json({ error: '取得參考資料時發生錯誤' }, { status: 500 });
    }
} 