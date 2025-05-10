import { getBackendUrl } from '@/utils/api-helpers';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const url = `${getBackendUrl()}/memberships/${id}`;

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
                { detail: `獲取會員詳情失敗: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('[API Proxy] 獲取會員詳情失敗:', error);
        return Response.json(
            { detail: '內部伺服器錯誤' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const url = `${getBackendUrl()}/memberships/${id}`;

        console.log(`[API Proxy] PUT ${url}`, body);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API Proxy] Error ${response.status}: ${errorText}`);
            return Response.json(
                { detail: `更新會員失敗: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('[API Proxy] 更新會員失敗:', error);
        return Response.json(
            { detail: '內部伺服器錯誤' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const url = `${getBackendUrl()}/memberships/${id}`;

        console.log(`[API Proxy] DELETE ${url}`);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies().toString(),
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API Proxy] Error ${response.status}: ${errorText}`);
            return Response.json(
                { detail: `刪除會員失敗: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('[API Proxy] 刪除會員失敗:', error);
        return Response.json(
            { detail: '內部伺服器錯誤' },
            { status: 500 }
        );
    }
} 