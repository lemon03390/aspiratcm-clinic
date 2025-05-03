import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getBackendUrl } from '../../../../../libs/apiClient';

/**
 * 處理動態路徑的請求，例如:
 * - /api/v1/appointments/by-phone
 * - /api/v1/appointments/{id}
 * 
 * 注意: 此處理器不應響應 /api/v1/appointments 的根路徑請求，
 * 這些請求應由 route.ts 處理
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 記錄動態路徑
    console.log(`[動態路由] GET 請求路徑: /api/v1/appointments/${params.path.join('/')}`);
    
    // 獲取路徑和查詢參數
    const subPath = params.path.join('/');
    const { searchParams } = new URL(req.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // 使用統一函數獲取後端URL並添加路徑
    const url = getBackendUrl(`/appointments/${subPath}`);
    
    console.log('動態路由代理GET請求到:', url);
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
    
    console.log('後端回應:', response.status, typeof response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('動態路由代理GET請求錯誤:', error.message);
    
    if (error.response) {
      console.error('錯誤狀態碼:', error.response.status);
      console.error('錯誤數據:', error.response.data);
      
      return NextResponse.json(
        { 
          detail: error.response.data?.detail || '請求處理失敗',
          message: error.message,
          path: params.path
        },
        { status: error.response.status }
      );
    } else if (error.request) {
      console.error('沒有收到響應，請求發送失敗');
      
      return NextResponse.json(
        { 
          detail: '無法連接到後端服務',
          message: error.message,
          path: params.path
        },
        { status: 503 }
      );
    } else {
      return NextResponse.json(
        { 
          detail: '請求處理失敗',
          message: error.message,
          path: params.path
        },
        { status: 500 }
      );
    }
  }
}

/**
 * 處理動態路徑的PUT請求
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 獲取路徑和請求體
    const subPath = params.path.join('/');
    const data = await req.json();
    
    // 使用統一函數獲取後端URL並添加路徑
    const url = getBackendUrl(`/appointments/${subPath}`);
    
    console.log('動態路由代理PUT請求到:', url);
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
      timeout: 10000
    });
    
    console.log('後端回應狀態:', response.status);
    console.log('後端回應數據:', response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('動態路由代理PUT請求錯誤:', error.message);
    
    if (error.response) {
      // 後端回應了錯誤
      console.error('錯誤狀態碼:', error.response.status);
      console.error('錯誤數據:', error.response.data);
      return NextResponse.json(
        { 
          detail: error.response.data?.detail || '請求處理失敗',
          message: error.message,
          debugInfo: {
            status: error.response.status,
            url: error.config?.url,
            method: error.config?.method,
          },
          path: params.path
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
          },
          path: params.path
        },
        { status: 503 }
      );
    } else {
      // 設置請求時發生錯誤
      console.error('其他錯誤:', error.message);
      return NextResponse.json(
        { 
          detail: '請求處理失敗',
          message: error.message,
          path: params.path
        },
        { status: 500 }
      );
    }
  }
}

/**
 * 處理動態路徑的DELETE請求
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 獲取路徑
    const subPath = params.path.join('/');
    
    // 使用統一函數獲取後端URL並添加路徑
    const url = getBackendUrl(`/appointments/${subPath}`);
    
    console.log('動態路由代理DELETE請求到:', url);
    
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
    console.error('動態路由代理DELETE請求錯誤:', error.message);
    
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
          },
          path: params.path
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
          },
          path: params.path
        },
        { status: 503 }
      );
    } else {
      // 設置請求時發生錯誤
      console.error('其他錯誤:', error.message);
      return NextResponse.json(
        { 
          detail: '刪除失敗',
          message: error.message,
          path: params.path
        },
        { status: 500 }
      );
    }
  }
} 