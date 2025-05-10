import { getBackendUrl } from '@/utils/api-helpers';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const url = `${getBackendUrl()}/memberships/${id}/balance`;

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
                { detail: `獲取會員餘額失敗: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('[API Proxy] 獲取會員餘額失敗:', error);
        return Response.json(
            { detail: '內部伺服器錯誤' },
            { status: 500 }
        );
    }
} 