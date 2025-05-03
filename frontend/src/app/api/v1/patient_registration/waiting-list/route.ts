import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理掛號系統候診清單的 GET 請求
 * 獲取當前正在候診的患者列表
 */
export async function GET(req: NextRequest) {
    try {
        console.log('正在獲取候診清單數據');

        // 構建後端 URL
        const url = getBackendUrl('/patient_registration/waiting-list');
        console.log('候診清單請求到:', url);

        // 收集並記錄請求頭
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

        // 獲取後端返回的數據
        let data = response.data;

        // 確保數據是陣列格式
        if (!Array.isArray(data)) {
            console.warn('後端返回的候診清單非陣列格式:', data);
            data = [];
        }

        // 處理數據並添加時間戳（如果後端未提供）
        const processedData = data.map((patient: any) => {
            // 添加時間戳，如果後端沒有提供 waiting_since_timestamp
            if (!patient.waiting_since_timestamp) {
                // 如果後端提供了 created_at，使用該字段作為註冊時間
                if (patient.created_at) {
                    patient.waiting_since_timestamp = patient.created_at;
                } else {
                    // 如果後端沒有提供任何時間，使用當前時間往前推 waitingSince 時間
                    // 這只是一個臨時解決方案，最好由後端提供準確的等候開始時間
                    const waitingTimeMatch = patient.waitingSince?.match(/(\d+):(\d+)/);
                    if (waitingTimeMatch) {
                        const hours = parseInt(waitingTimeMatch[1]);
                        const minutes = parseInt(waitingTimeMatch[2]);

                        const now = new Date();
                        // 假設 waitingSince 是當日時間，計算推算出的等候開始時間
                        const waitingSinceDate = new Date();
                        waitingSinceDate.setHours(hours, minutes, 0, 0);

                        // 如果算出的時間比現在晚，則可能是昨天的掛號，減去一天
                        if (waitingSinceDate > now) {
                            waitingSinceDate.setDate(waitingSinceDate.getDate() - 1);
                        }

                        patient.waiting_since_timestamp = waitingSinceDate.toISOString();
                    } else {
                        // 如果無法解析時間，使用30分鐘前作為預設
                        const defaultTime = new Date();
                        defaultTime.setMinutes(defaultTime.getMinutes() - 30);
                        patient.waiting_since_timestamp = defaultTime.toISOString();
                    }
                }
            }

            return patient;
        });

        console.log('處理後的候診清單數據:', processedData);

        // 返回處理後的數據
        return NextResponse.json(processedData, { status: response.status });
    } catch (error: any) {
        console.error('獲取候診清單失敗:', error.message);

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

            // 開發環境返回模擬數據
            if (process.env.NODE_ENV === 'development') {
                const mockData = [
                    {
                        id: '1',
                        name: '張三',
                        isFirstVisit: false,
                        waitingSince: '09:30',
                        waiting_since_timestamp: new Date(new Date().setHours(9, 30, 0, 0)).toISOString(),
                        registration_number: 'PT00001',
                        patient_id: 1,
                        is_contagious: 0,
                        is_troublesome: 0
                    },
                    {
                        id: '2',
                        name: '李四',
                        isFirstVisit: true,
                        waitingSince: '10:15',
                        waiting_since_timestamp: new Date(new Date().setHours(10, 15, 0, 0)).toISOString(),
                        registration_number: 'PT00002',
                        patient_id: 2,
                        is_contagious: 0,
                        is_troublesome: 0
                    },
                    {
                        id: '3',
                        name: '王五',
                        isFirstVisit: false,
                        waitingSince: '10:45',
                        waiting_since_timestamp: new Date(new Date().setHours(10, 45, 0, 0)).toISOString(),
                        registration_number: 'PT00003',
                        patient_id: 3,
                        is_contagious: 0,
                        is_troublesome: 0
                    }
                ];

                console.log('返回開發環境模擬數據');
                return NextResponse.json(mockData, { status: 200 });
            }

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

/**
 * 處理掛號系統候診清單的 DELETE 請求
 * 從候診清單中移除患者
 */
export async function DELETE(req: NextRequest) {
    try {
        // 獲取要移除的患者ID
        const { searchParams } = new URL(req.url);
        const patientId = searchParams.get('patientId');

        if (!patientId) {
            return NextResponse.json(
                { detail: '缺少必要的 patientId 參數' },
                { status: 400 }
            );
        }

        // 構建後端 URL
        const url = getBackendUrl(`/patient_registration/waiting-list/${patientId}`);
        console.log('從候診清單移除患者請求到:', url);

        // 收集並記錄請求頭
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            if (key !== 'host') {  // 排除host頭，避免衝突
                headers[key] = value;
            }
        });
        headers['Accept'] = 'application/json';
        console.log('請求頭:', headers);

        // 轉發請求到後端
        const response = await axios.delete(url, {
            headers,
            timeout: 10000 // 設置超時，防止請求掛起
        });

        console.log('後端回應狀態:', response.status);
        console.log('後端回應數據:', response.data);

        // 返回後端的回應
        return NextResponse.json(response.data, { status: response.status });
    } catch (error: any) {
        console.error('從候診清單移除患者失敗:', error.message);

        if (error.response) {
            console.error('錯誤狀態碼:', error.response.status);
            console.error('錯誤數據:', error.response.data);

            return NextResponse.json(
                {
                    detail: error.response.data?.detail || '移除患者失敗',
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