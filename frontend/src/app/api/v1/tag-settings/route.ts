import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../../utils/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 禁用快取

export async function GET(request: NextRequest) {
    try {
        const url = getBackendUrl('/tag-settings');

        console.log(`[API Proxy] 發送 GET 請求至: ${url.toString()}`);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        const data = await res.json();
        console.log(`[API Proxy] 獲取標籤成功:`, data);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error(`[API Proxy] 取得標籤失敗:`, error);
        return Response.json({ error: '取得標籤失敗' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const url = getBackendUrl('/tag-settings');
        const body = await request.json();

        console.log(`[API Proxy] 發送 POST 請求至: ${url.toString()}`);

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 創建標籤失敗:`, error);
        return Response.json({ error: '創建標籤失敗' }, { status: 500 });
    }
}

// 添加 PUT 和 DELETE 方法以支持標籤的更新和刪除
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return Response.json({ error: '缺少標籤ID' }, { status: 400 });
        }

        const url = getBackendUrl(`/tag-settings/${id}`);
        const body = await request.json();

        console.log(`[API Proxy] 發送 PUT 請求至: ${url.toString()}`);

        const res = await fetch(url.toString(), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 更新標籤失敗:`, error);
        return Response.json({ error: '更新標籤失敗' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return Response.json({ error: '缺少標籤ID' }, { status: 400 });
        }

        const url = getBackendUrl(`/tag-settings/${id}`);

        console.log(`[API Proxy] 發送 DELETE 請求至: ${url.toString()}`);

        const res = await fetch(url.toString(), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 刪除標籤失敗:`, error);
        return Response.json({ error: '刪除標籤失敗' }, { status: 500 });
    }
} 