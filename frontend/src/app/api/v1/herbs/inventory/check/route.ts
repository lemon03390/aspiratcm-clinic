import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../../libs/apiClient';

export async function POST(request: NextRequest) {
  try {
    // 從請求中獲取 JSON 數據
    const requestData = await request.json();

    // 構建後端 API URL
    const apiUrl = getBackendUrl(`/herbs/inventory/check`);
    
    console.log('Checking herb inventory:', apiUrl, requestData);

    // 向後端 API 發送請求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    // 檢查響應
    if (!response.ok) {
      console.error('Error checking herb inventory:', response.statusText);
      return NextResponse.json(
        { error: `Failed to check herb inventory: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 解析 JSON 響應
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // 處理錯誤
    console.error('Error checking herb inventory:', error);
    return NextResponse.json(
      { error: 'Failed to check herb inventory' },
      { status: 500 }
    );
  }
} 