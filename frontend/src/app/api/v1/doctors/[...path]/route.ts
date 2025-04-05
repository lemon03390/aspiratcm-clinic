import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理動態路徑的DELETE請求，例如:
 * - /api/v1/doctors/{id}
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 獲取路徑參數（醫生ID）
    const subPath = params.path.join('/');
    
    // 使用統一函數獲取後端URL並添加路徑
    const url = getBackendUrl(`/doctors/${subPath}`);
    
    console.log('代理DELETE請求到:', url);
    
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
      timeout: 10000  // 10秒超時
    });
    
    console.log('後端回應狀態:', response.status);
    console.log('後端回應數據:', response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('代理DELETE請求錯誤:', error.message);
    
    if (error.response) {
      // 後端回應了錯誤
      console.error('錯誤狀態碼:', error.response.status);
      console.error('錯誤數據:', error.response.data);
      return NextResponse.json(
        { 
          detail: error.response.data?.detail || '刪除失敗',
          message: error.message,
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
          detail: '刪除失敗',
          message: error.message
        },
        { status: 500 }
      );
    }
  }
}

/**
 * 處理動態路徑的PUT請求，例如:
 * - /api/v1/doctors/{id}
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 獲取路徑參數（醫生ID）和請求體
    const subPath = params.path.join('/');
    const data = await req.json();
    
    // 使用統一函數獲取後端URL並添加路徑
    const url = getBackendUrl(`/doctors/${subPath}`);
    
    console.log('代理PUT請求到:', url);
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
    const response = await axios.put(url, data, {
      headers,
      timeout: 10000  // 10秒超時
    });
    
    console.log('後端回應狀態:', response.status);
    console.log('後端回應數據:', response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('代理PUT請求錯誤:', error.message);
    
    if (error.response) {
      // 後端回應了錯誤
      console.error('錯誤狀態碼:', error.response.status);
      console.error('錯誤數據:', error.response.data);
      return NextResponse.json(
        { 
          detail: error.response.data?.detail || '更新失敗',
          message: error.message,
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
          detail: '更新失敗',
          message: error.message
        },
        { status: 500 }
      );
    }
  }
} 