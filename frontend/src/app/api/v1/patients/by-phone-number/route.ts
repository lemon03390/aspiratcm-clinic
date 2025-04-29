import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理通過電話號碼查詢患者的GET請求
 * 路徑: /api/v1/patients/by-phone-number
 */
export async function GET(
    req: NextRequest
) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { detail: '未提供電話號碼參數' },
                { status: 400 }
            );
        }

        console.log(`[患者API] 透過電話號碼獲取患者資料: 電話 = ${phone}`);

        // 使用統一函數獲取後端URL
        const url = getBackendUrl(`/patients/by-phone-number?phone=${phone}`);

        console.log('患者API代理請求到:', url);

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

            // 如果是404，嘗試舊的API端點格式
            if (error.response.status === 404 && error.config?.url) {
                try {
                    console.log('嘗試使用舊API端點格式...');

                    const { searchParams } = new URL(req.url);
                    const phone = searchParams.get('phone');

                    // 格式化電話號碼，移除特殊字符
                    const formattedPhone = phone ? phone.replace(/[\s\-\(\)]/g, '') : '';

                    // 使用舊API端點格式
                    const fallbackUrl = getBackendUrl(`/patient_registration/by-phone-number/${formattedPhone}/`);
                    console.log('使用舊API端點:', fallbackUrl);

                    const fallbackResponse = await axios.get(fallbackUrl, {
                        headers: { Accept: 'application/json' },
                        timeout: 10000
                    });

                    console.log('舊API端點回應狀態:', fallbackResponse.status);
                    return NextResponse.json(fallbackResponse.data, { status: fallbackResponse.status });
                } catch (fallbackError: any) {
                    console.error('使用舊API端點也失敗:', fallbackError.message);

                    // 繼續返回原始錯誤
                    const urlParams = new URL(req.url).searchParams;
                    return NextResponse.json(
                        {
                            detail: error.response.data?.detail || '獲取患者資料失敗',
                            message: error.message,
                            phone: urlParams.get('phone'),
                            debugInfo: {
                                status: error.response.status,
                                url: error.config?.url,
                            }
                        },
                        { status: error.response.status }
                    );
                }
            }

            const urlParams = new URL(req.url).searchParams;
            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '獲取患者資料失敗',
                    message: error.message,
                    phone: urlParams.get('phone'),
                    debugInfo: {
                        status: error.response.status,
                        url: error.config?.url,
                    }
                },
                { status: error.response.status }
            );
        } else if (error.request) {
            console.error('沒有收到響應，請求發送失敗');

            const urlParams = new URL(req.url).searchParams;
            return NextResponse.json(
                {
                    detail: '無法連接到後端服務',
                    message: error.message,
                    phone: urlParams.get('phone'),
                    debugInfo: {
                        isConnectionError: true,
                        url: error.config?.url,
                    }
                },
                { status: 503 }
            );
        } else {
            const urlParams = new URL(req.url).searchParams;
            return NextResponse.json(
                {
                    detail: '獲取患者資料失敗',
                    message: error.message,
                    phone: urlParams.get('phone')
                },
                { status: 500 }
            );
        }
    }
} 