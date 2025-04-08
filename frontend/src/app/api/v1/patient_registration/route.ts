import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getBackendUrl } from '../../../../libs/apiClient';

/**
 * 處理患者登記路由的 GET 請求
 * 獲取患者列表
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // 使用統一函數獲取後端URL
    const url = getBackendUrl('/patient_registration');
    console.log('患者登記代理GET請求到:', url);
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
      timeout: 10000
    });
    
    console.log('後端回應:', response.status, typeof response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('患者登記代理GET請求錯誤:', error.message);
    
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
 * 處理患者登記路由的 POST 請求
 * 創建新患者
 */
export async function POST(req: NextRequest) {
  try {
    // 獲取請求體
    const body = await req.json();
    console.log('患者登記 POST 請求數據:', body);
    
    // 處理 email 欄位，確保格式正確
    if (body && typeof body === 'object' && (!body.email || 
        body.email === "" || 
        body.email === "undefined" || 
        (typeof body.email === "string" && body.email.trim() === ""))) {
      console.log("API 代理層處理: email 欄位為空，設置為 no@no.com");
      body.email = "no@no.com";
    }
    
    // 構建後端 URL
    const url = getBackendUrl('/patient_registration/');
    console.log('患者登記代理 POST 請求到:', url);
    console.log('處理後的請求數據:', JSON.stringify(body));
    
    // 收集並記錄請求頭
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key !== 'host') {
        headers[key] = value;
      }
    });
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
    console.log('請求頭:', headers);
    
    // 轉發請求到後端
    const response = await axios.post(url, body, { 
      headers,
      timeout: 15000 // 增加超時時間避免大請求超時
    });
    
    console.log('後端回應狀態:', response.status);
    console.log('後端回應數據:', response.data);
    
    // 返回後端的回應
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error('處理患者登記 POST 請求錯誤:', error);
    
    // 檢查是否有響應
    if (error.response) {
      const { status, data } = error.response;
      console.error(`後端回應錯誤 ${status}:`, data);
      
      // 特別處理驗證錯誤，確保詳細錯誤訊息傳遞給前端
      if (status === 422) {
        console.log('檢測到 422 驗證錯誤，完整錯誤數據:', data);
        return NextResponse.json(data, { status });
      }
      
      // 其他錯誤狀態
      return NextResponse.json(
        { 
          detail: data.detail || '處理請求時發生錯誤',
          message: data.message || '後端服務錯誤'
        }, 
        { status }
      );
    }
    
    // 網絡或其他錯誤
    return NextResponse.json(
      { detail: error.message || '無法連接到後端服務' }, 
      { status: 500 }
    );
  }
} 