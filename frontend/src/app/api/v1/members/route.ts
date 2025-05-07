export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../../utils/api';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        // 轉發到memberships端點
        const url = getBackendUrl(`/memberships`);

        // 加上搜尋參數
        if (searchParams.toString()) {
            url.search = searchParams.toString();
        }

        console.log(`[API Proxy] 根查詢 - 發送 GET 請求至: ${url.toString()} (從/members轉發到/memberships)`);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 嘗試獲取和返回數據
        try {
            const data = await res.json();
            return Response.json(data);
        } catch (error) {
            console.error(`[API Proxy] 無法解析JSON響應:`, error);
            const text = await res.text();
            console.error(`[API Proxy] 原始響應內容: ${text}`);
            return Response.json({ error: '無法解析服務器響應' }, { status: 500 });
        }
    } catch (error) {
        console.error(`[API Proxy] 獲取會員數據錯誤:`, error);
        return Response.json({ error: '取得會員資料時發生錯誤' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // 轉發到memberships端點
        const url = getBackendUrl(`/memberships`);
        const body = await request.json();

        console.log(`[API Proxy] 根查詢 - 發送 POST 請求至: ${url.toString()} (從/members轉發到/memberships)`);

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return Response.json(data, { status: res.status });
    } catch (error) {
        console.error(`[API Proxy] 建立會員數據錯誤:`, error);
        return Response.json({ error: '建立會員資料時發生錯誤' }, { status: 500 });
    }
} 