export const dynamic = 'force-dynamic';

import { getBackendUrl } from '@/utils/api-helpers';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        // 構建URL
        const url = `${getBackendUrl()}/memberships`;

        // 加上搜尋參數
        const finalUrl = searchParams.toString()
            ? `${url}?${searchParams.toString()}`
            : url;

        console.log(`[API Proxy] GET ${finalUrl}`);

        const res = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error(`[API Proxy] Error ${res.status}: ${await res.text()}`);
            return Response.json(
                { detail: `取得會員資料失敗: ${res.statusText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 獲取會員數據錯誤:`, error);
        return Response.json(
            { detail: '取得會員資料時發生錯誤' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url = `${getBackendUrl()}/memberships`;

        console.log(`[API Proxy] POST ${url}`, body);

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[API Proxy] Error ${res.status}: ${errorText}`);
            return Response.json(
                { detail: `建立會員失敗: ${errorText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 建立會員數據錯誤:`, error);
        return Response.json(
            { detail: '建立會員資料時發生錯誤' },
            { status: 500 }
        );
    }
} 