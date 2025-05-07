import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../libs/apiClient';

export async function GET(req: NextRequest) {
    try {
        console.log('[儀表板API] 收到請求');

        // 獲取查詢參數
        const { searchParams } = new URL(req.url);
        const queryParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            queryParams[key] = value;
        });

        // 獲取後端URL
        const url = getBackendUrl('/dashboard/stats');

        console.log('轉發儀表板請求到:', url);

        // 收集原始請求頭
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            if (key !== 'host') {  // 排除host頭，避免衝突
                headers[key] = value;
            }
        });
        headers['Accept'] = 'application/json';

        // 轉發請求到後端
        const response = await axios.get(url, {
            params: queryParams,
            headers,
            timeout: 10000 // 設置10秒超時
        });

        console.log('後端儀表板API回應:', response.status);

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('儀表板API請求錯誤:', error.message);

        if (error.response) {
            console.error('錯誤狀態碼:', error.response.status);
            console.error('錯誤數據:', error.response.data);

            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '請求處理失敗',
                    message: error.message
                },
                { status: error.response.status }
            );
        } else if (error.request) {
            console.error('沒有收到響應，請求發送失敗');

            return NextResponse.json(
                {
                    detail: '無法連接到後端服務',
                    message: error.message
                },
                { status: 503 }
            );
        } else {
            return NextResponse.json(
                {
                    detail: '請求處理失敗',
                    message: error.message
                },
                { status: 500 }
            );
        }
    }
} 