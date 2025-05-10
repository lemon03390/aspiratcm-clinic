import { getBackendUrl } from '@/utils/api-helpers';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const hkid = searchParams.get('hkid');

        if (!hkid) {
            return Response.json(
                { detail: '必須提供身份證號碼' },
                { status: 400 }
            );
        }

        const url = `${getBackendUrl()}/memberships/search/by-hkid?hkid=${encodeURIComponent(hkid)}`;

        console.log(`[API Proxy] GET ${url}`);

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`[API Proxy] Error ${response.status}: ${await response.text()}`);
            return Response.json(
                { detail: `透過身份證搜尋會員失敗: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('[API Proxy] 透過身份證搜尋會員失敗:', error);
        return Response.json(
            { detail: '內部伺服器錯誤' },
            { status: 500 }
        );
    }
} 