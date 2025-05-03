import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理根據患者ID獲取患者資料的請求
 * 路徑: /api/v1/patients/{id}
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const patientId = params.id;
        console.log(`[患者API] 透過ID獲取患者資料: ID = ${patientId}`);

        // 使用統一函數獲取後端URL並添加路徑
        const url = getBackendUrl(`/patient_registration/${patientId}`);

        console.log('患者API代理請求到:', url);
        console.log('使用病患ID (patient_id):', patientId);

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
            timeout: 10000 // 設置超時，防止請求掛起
        });

        console.log('後端回應狀態:', response.status);
        console.log('後端回應數據類型:', typeof response.data);

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
                    detail: error.response.data?.detail || '獲取患者資料失敗',
                    message: error.message,
                    patientId: params.id,
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
                    patientId: params.id,
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
                    detail: '獲取患者資料失敗',
                    message: error.message,
                    patientId: params.id
                },
                { status: 500 }
            );
        }
    }
}

/**
 * 處理更新患者資料的PATCH請求
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const patientId = params.id;
        const data = await req.json();

        // 使用統一函數獲取後端URL並添加路徑
        const url = getBackendUrl(`/patient_registration/${patientId}`);

        console.log('患者API代理PATCH請求到:', url);
        console.log('請求資料:', JSON.stringify(data, null, 2));

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
        const response = await axios.patch(url, data, {
            headers,
            timeout: 10000
        });

        console.log('後端回應狀態:', response.status);
        console.log('後端回應數據:', response.data);

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('患者API代理PATCH請求錯誤:', error.message);

        if (error.response) {
            // 後端回應了錯誤
            console.error('錯誤狀態碼:', error.response.status);
            console.error('錯誤數據:', error.response.data);
            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '更新患者資料失敗',
                    message: error.message,
                    patientId: params.id,
                    debugInfo: {
                        status: error.response.status,
                        url: error.config?.url,
                        method: error.config?.method,
                    }
                },
                { status: error.response.status }
            );
        } else if (error.request) {
            // 請求已發送但未收到回應
            console.error('未收到回應的請求:', error.request);
            return NextResponse.json(
                {
                    detail: '無法連接到後端服務器',
                    message: error.message,
                    patientId: params.id,
                    debugInfo: {
                        isConnectionError: true,
                        url: error.config?.url,
                        method: error.config?.method,
                    }
                },
                { status: 503 }
            );
        } else {
            // 設置請求時發生錯誤
            console.error('其他錯誤:', error.message);
            return NextResponse.json(
                {
                    detail: '更新患者資料失敗',
                    message: error.message,
                    patientId: params.id
                },
                { status: 500 }
            );
        }
    }
}

/**
 * 處理刪除患者資料的DELETE請求
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const patientId = params.id;

        // 使用統一函數獲取後端URL並添加路徑
        const url = getBackendUrl(`/patient_registration/${patientId}`);

        console.log('患者API代理DELETE請求到:', url);

        // 收集並記錄原始請求頭
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            if (key !== 'host') {  // 排除host頭，避免衝突
                headers[key] = value;
            }
        });
        console.log('請求頭:', headers);

        // 轉發請求到後端
        const response = await axios.delete(url, {
            headers,
            timeout: 10000
        });

        console.log('後端回應狀態:', response.status);
        console.log('後端回應數據:', response.data);

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('患者API代理DELETE請求錯誤:', error.message);

        if (error.response) {
            // 後端回應了錯誤
            console.error('錯誤狀態碼:', error.response.status);
            console.error('錯誤數據:', error.response.data);
            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '刪除患者資料失敗',
                    message: error.message,
                    patientId: params.id,
                    debugInfo: {
                        status: error.response.status,
                        url: error.config?.url,
                        method: error.config?.method,
                    }
                },
                { status: error.response.status }
            );
        } else if (error.request) {
            // 請求已發送但未收到回應
            console.error('未收到回應的請求:', error.request);
            return NextResponse.json(
                {
                    detail: '無法連接到後端服務器',
                    message: error.message,
                    patientId: params.id,
                    debugInfo: {
                        isConnectionError: true,
                        url: error.config?.url,
                        method: error.config?.method,
                    }
                },
                { status: 503 }
            );
        } else {
            // 設置請求時發生錯誤
            console.error('其他錯誤:', error.message);
            return NextResponse.json(
                {
                    detail: '刪除患者資料失敗',
                    message: error.message,
                    patientId: params.id
                },
                { status: 500 }
            );
        }
    }
}