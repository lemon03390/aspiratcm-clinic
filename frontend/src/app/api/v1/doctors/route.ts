import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getBackendUrl } from '../../../../libs/apiClient';

/**
 * 處理對 /api/v1/doctors 的GET請求
 * 代理到FastAPI後端服務
 */
export async function GET(req: NextRequest) {
  try {
    console.log('開始處理 /api/v1/doctors 的 GET 請求');
    
    // 使用統一函數獲取後端URL並添加路徑
    let url;
    try {
      url = getBackendUrl('/doctors');
      console.log('代理GET請求到:', url);
    } catch (error: any) {
      console.error('生成後端URL時發生錯誤:', error.message);
      console.error('環境設置:', {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'undefined'
      });
      // 使用後備 URL
      url = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8000/api/v1/doctors'
        : '/api/v1/doctors';
      console.log('使用後備URL:', url);
    }
    
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
    console.log('後端回應數據:', response.data);
    
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

/**
 * 處理對 /api/v1/doctors 的POST請求
 * 代理到FastAPI後端服務
 */
export async function POST(req: NextRequest) {
  try {
    console.log('開始處理 /api/v1/doctors 的 POST 請求');
    
    // 獲取請求體
    const data = await req.json();
    
    // 使用統一函數獲取後端URL並添加路徑
    const url = getBackendUrl('/doctors');
    
    console.log('代理POST請求到:', url);
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
    const response = await axios.post(url, data, {
      headers,
      timeout: 10000  // 10秒超時
    });
    
    console.log('後端回應狀態:', response.status);
    console.log('後端回應數據:', response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('代理POST請求錯誤:', error.message);
    
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
          detail: '請求處理失敗',
          message: error.message
        },
        { status: 500 }
      );
    }
  }
} 