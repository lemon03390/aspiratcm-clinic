import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理對 /api/v1/appointments/tomorrow 的GET請求
 * 代理到FastAPI後端服務
 */
export async function GET(req: NextRequest) {
    try {
        console.log('開始處理 /api/v1/appointments/tomorrow 的 GET 請求');

        // 使用統一函數獲取後端URL並添加路徑
        const url = getBackendUrl('/appointments/tomorrow');
        console.log('代理GET請求到:', url);

        // 收集並記錄原始請求頭
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            if (key !== 'host') {  // 排除host頭，避免衝突
                headers[key] = value;
            }
        });
        headers['Accept'] = 'application/json';
        console.log('請求頭:', headers);

        // 轉發請求到後端
        const response = await axios.get(url, {
            headers,
            timeout: 10000  // 10秒超時
        });

        console.log('後端回應狀態:', response.status);
        console.log('後端回應數據長度:', response.data?.length || '無數據');

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('代理GET請求錯誤詳細信息:', error);

        // 提取並記錄更詳細的錯誤信息
        let errorDetail = '未知錯誤';
        let errorMessage = error.message || '未知錯誤信息';
        let statusCode = 500;

        if (error.response) {
            // 後端回應了錯誤
            statusCode = error.response.status;
            errorDetail = error.response.data?.detail || '請求處理失敗';

            console.error('錯誤狀態碼:', statusCode);
            console.error('錯誤數據:', error.response.data);
            console.error('請求配置:', {
                url: error.config?.url,
                method: error.config?.method,
                params: error.config?.params
            });
        } else if (error.request) {
            // 請求已發送但未收到回應
            statusCode = 503;
            errorDetail = '無法連接到後端服務器';

            console.error('未收到回應的請求:', error.request);
            console.error('請求URL:', error.config?.url);
        } else {
            // 設置請求時發生錯誤
            errorDetail = '請求處理失敗';

            console.error('其他錯誤:', errorMessage);
            console.error('環境信息:', {
                NODE_ENV: process.env.NODE_ENV,
                API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
            });
        }

        return NextResponse.json(
            {
                detail: errorDetail,
                message: errorMessage,
                timestamp: new Date().toISOString(),
                debugInfo: {
                    status: statusCode,
                    url: error.config?.url,
                    method: error.config?.method,
                    requestId: req.headers.get('x-request-id') || 'unknown'
                }
            },
            { status: statusCode }
        );
    }
} 