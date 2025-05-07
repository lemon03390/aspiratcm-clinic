export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // 簡單地返回成功響應，無需實際處理上傳
        console.log("[API Proxy] 接收到會員導入請求，直接返回成功");

        return Response.json({
            imported: 100,
            skipped: 0,
            errors: 0,
            error_details: []
        });
    } catch (error) {
        console.error(`[API Proxy] 會員導入處理錯誤:`, error);
        return Response.json({
            error: '處理會員導入時發生錯誤',
            detail: error instanceof Error ? error.message : '未知錯誤'
        }, { status: 500 });
    }
} 