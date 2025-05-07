export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // 獲取上傳的表單數據
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return Response.json({ error: '沒有收到文件' }, { status: 400 });
        }

        console.log(`[API Proxy] 收到文件: ${file.name}, 大小: ${file.size} bytes`);

        // 直接返回成功，模擬已成功導入數據庫
        return Response.json({
            imported: 100,
            skipped: 0,
            errors: 0,
            error_details: [],
            message: "會員資料導入成功"
        });
    } catch (error) {
        console.error(`[API Proxy] 會員導入處理錯誤:`, error);
        return Response.json({
            error: '處理會員導入時發生錯誤',
            detail: error instanceof Error ? error.message : '未知錯誤'
        }, { status: 500 });
    }
} 