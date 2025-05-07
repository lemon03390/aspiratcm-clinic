export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getBackendUrl } from '../../../../../utils/api';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const { searchParams } = request.nextUrl;
        const url = getBackendUrl(`/memberships/${params.path.join('/')}`);

        // 加上搜尋參數
        if (searchParams.toString()) {
            url.search = searchParams.toString();
        }

        console.log(`[API Proxy] 發送 GET 請求至: ${url.toString()} (從/members轉發到/memberships)`);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 取得會員資料錯誤:`, error);
        return Response.json({ error: '取得會員資料時發生錯誤' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        // 特殊處理：CSV文件上傳
        const pathStr = params.path.join('/');
        if (pathStr === 'import') {
            const formData = await request.formData();
            const url = getBackendUrl(`/memberships/import`);

            console.log(`[API Proxy] 發送檔案上傳請求至: ${url.toString()} (從/members/import轉發到/memberships/import)`);

            const res = await fetch(url.toString(), {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            return Response.json(data);
        }

        // 常規JSON請求處理
        const url = getBackendUrl(`/memberships/${pathStr}`);
        const body = await request.json();

        console.log(`[API Proxy] 發送 POST 請求至: ${url.toString()} (從/members轉發到/memberships)`);

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 處理會員資料錯誤:`, error);
        return Response.json({ error: '處理會員資料時發生錯誤' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const url = getBackendUrl(`/memberships/${params.path.join('/')}`);
        const body = await request.json();

        console.log(`[API Proxy] 發送 PUT 請求至: ${url.toString()} (從/members轉發到/memberships)`);

        const res = await fetch(url.toString(), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 更新會員資料錯誤:`, error);
        return Response.json({ error: '更新會員資料時發生錯誤' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const url = getBackendUrl(`/memberships/${params.path.join('/')}`);

        console.log(`[API Proxy] 發送 DELETE 請求至: ${url.toString()} (從/members轉發到/memberships)`);

        const res = await fetch(url.toString(), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        console.error(`[API Proxy] 刪除會員資料錯誤:`, error);
        return Response.json({ error: '刪除會員資料時發生錯誤' }, { status: 500 });
    }
} 