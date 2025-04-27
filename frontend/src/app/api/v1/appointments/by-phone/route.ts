// 導入必要的依賴
import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理 GET 請求，查詢特定電話號碼的預約
 * 支援完整匹配和部分號碼查詢（如後4位）
 */
export async function GET(request: Request) {
    try {
        console.log('API route 處理電話號碼查詢請求');

        // 解析URL查詢參數
        const url = new URL(request.url);
        const phoneNumber = url.searchParams.get('phone_number');

        if (!phoneNumber) {
            console.log('未提供電話號碼');
            return NextResponse.json(
                { detail: "缺少必要參數: phone_number" },
                { status: 400 }
            );
        }

        console.log(`查詢電話號碼: ${phoneNumber}`);

        // 構建後端API URL
        const backendUrl = getBackendUrl(`/appointments`);
        console.log(`後端API URL: ${backendUrl}`);

        // 從後端API獲取所有預約
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Source': 'frontend-api',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`後端API錯誤: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { detail: `無法從後端獲取預約數據: ${response.statusText}` },
                { status: response.status }
            );
        }

        // 解析所有預約數據
        const allAppointments = await response.json();
        console.log(`獲取到 ${allAppointments.length} 條預約記錄`);

        // 篩選符合電話號碼的預約
        // 支援完整號碼和部分號碼（如後4位）
        const filteredAppointments = allAppointments.filter((appointment: any) =>
            appointment.phone_number && appointment.phone_number.includes(phoneNumber)
        );

        console.log(`找到 ${filteredAppointments.length} 條匹配的預約記錄`);

        if (filteredAppointments.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(filteredAppointments, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        console.error('處理查詢請求時出錯:', error);
        return NextResponse.json(
            { detail: `處理查詢時發生錯誤: ${error.message || '未知錯誤'}` },
            { status: 500 }
        );
    }
} 