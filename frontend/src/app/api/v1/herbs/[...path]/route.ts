import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const path = params.path || [];
        const searchParams = request.nextUrl.searchParams;

        // 構建後端 API URL
        let backendPath = `/herbs`;
        if (path.length > 0) {
            backendPath += `/${path.join('/')}`;
        }

        // 處理查詢參數
        const queryString = searchParams.toString();
        if (queryString) {
            backendPath += `?${queryString}`;
        }

        const backendUrl = getBackendUrl(backendPath);
        console.log(`中藥 API 代理: ${backendUrl}`);

        // 發送請求到後端
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        // 獲取響應資料
        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('中藥 API 代理出錯:', error);
        return NextResponse.json(
            { error: `中藥 API 請求失敗: ${error}` },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const path = params.path || [];

        // 構建後端 API URL
        let backendPath = `/herbs`;
        if (path.length > 0) {
            backendPath += `/${path.join('/')}`;
        }

        const backendUrl = getBackendUrl(backendPath);
        console.log(`中藥 API 代理 POST: ${backendUrl}`);

        // 獲取請求體
        const body = await request.json();

        // 發送請求到後端
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // 獲取響應資料
        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('中藥 API 代理出錯:', error);
        return NextResponse.json(
            { error: `中藥 API 請求失敗: ${error}` },
            { status: 500 }
        );
    }
} 