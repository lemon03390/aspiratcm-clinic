import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../libs/apiClient';

/**
 * 處理獲取患者列表的GET請求
 * 路徑: /api/v1/patients
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const queryParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            queryParams[key] = value;
        });

        console.log('[患者API] 獲取患者列表，參數:', queryParams);

        // 使用統一函數獲取後端URL
        const url = getBackendUrl('/patient_registration');

        console.log('患者API代理請求到:', url);
        console.log('查詢參數:', queryParams);

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
            params: queryParams,
            headers,
            timeout: 10000 // 設置超時，防止請求掛起
        });

        console.log('後端回應狀態:', response.status);
        console.log('回應數據類型:', typeof response.data);

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('患者API代理GET請求錯誤:', error.message);

        if (error.response) {
            console.error('錯誤狀態碼:', error.response.status);
            console.error('錯誤數據:', error.response.data);
            console.error('請求URL:', error.config?.url);

            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '獲取患者列表失敗',
                    message: error.message,
                    debugInfo: {
                        status: error.response.status,
                        url: error.config?.url,
                    }
                },
                { status: error.response.status }
            );
        } else if (error.request) {
            console.error('沒有收到響應，請求發送失敗');

            return NextResponse.json(
                {
                    detail: '無法連接到後端服務',
                    message: error.message,
                    debugInfo: {
                        isConnectionError: true,
                        url: error.config?.url,
                    }
                },
                { status: 503 }
            );
        } else {
            return NextResponse.json(
                {
                    detail: '獲取患者列表失敗',
                    message: error.message
                },
                { status: 500 }
            );
        }
    }
}

/**
 * 處理創建患者的POST請求
 * 路徑: /api/v1/patients
 */
export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        console.log('[患者API] 創建新患者:', data);

        // 使用統一函數獲取後端URL
        const url = getBackendUrl('/patient_registration');

        console.log('患者API代理POST請求到:', url);
        console.log('請求數據:', JSON.stringify(data, null, 2));

        // 收集並記錄原始請求頭
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            if (key !== 'host') {  // 排除host頭，避免衝突
                headers[key] = value;
            }
        });
        headers['Content-Type'] = 'application/json';
        console.log('請求頭:', headers);

        // 轉發請求到後端
        const response = await axios.post(url, data, {
            headers,
            timeout: 10000
        });

        console.log('後端回應狀態:', response.status);
        console.log('回應數據:', response.data);

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('患者API代理POST請求錯誤:', error.message);

        if (error.response) {
            console.error('錯誤狀態碼:', error.response.status);
            console.error('錯誤數據:', error.response.data);
            console.error('請求URL:', error.config?.url);

            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '創建患者失敗',
                    message: error.message,
                    debugInfo: {
                        status: error.response.status,
                        url: error.config?.url,
                        method: error.config?.method,
                        data: error.response.data
                    }
                },
                { status: error.response.status }
            );
        } else if (error.request) {
            console.error('沒有收到響應，請求發送失敗');

            return NextResponse.json(
                {
                    detail: '無法連接到後端服務',
                    message: error.message,
                    debugInfo: {
                        isConnectionError: true,
                        url: error.config?.url,
                        method: error.config?.method,
                    }
                },
                { status: 503 }
            );
        } else {
            return NextResponse.json(
                {
                    detail: '創建患者失敗',
                    message: error.message
                },
                { status: 500 }
            );
        }
    }
} 