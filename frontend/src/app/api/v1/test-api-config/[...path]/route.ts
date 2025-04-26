import { getBackendUrl } from '../../../../../libs/apiClient';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const apiPath = pathSegments.join('/');
  
  console.log(`處理 API 代理請求: /api/v1/test-api-config/${apiPath}`);
  
  try {
    // 測試配置請求
    if (apiPath === 'settings') {
      return NextResponse.json({
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
        environment: process.env.NODE_ENV,
        version: '1.0.0'
      });
    }
    
    // 獲取靜態 JSON 數據檔案
    if (apiPath.startsWith('data/') && apiPath.endsWith('.json')) {
      const filePath = path.resolve('./public', apiPath);
      console.log(`嘗試讀取靜態檔案: ${filePath}`);
      
      try {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          return NextResponse.json(jsonData);
        }
      } catch (fileError) {
        console.error(`讀取或解析 JSON 檔案失敗: ${filePath}`, fileError);
        return NextResponse.json(
          { error: '無法讀取或解析 JSON 檔案' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: '檔案不存在' },
        { status: 404 }
      );
    }
    
    // 代理到後端 API
    const backendUrl = getBackendUrl(`test-config/${apiPath}`);
    console.log(`代理請求到: ${backendUrl}`);
    
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key !== 'host' && key !== 'connection') {
        headers[key] = value;
      }
    });
    
    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error(`處理 API 代理請求 /api/v1/test-api-config/${apiPath} 時出錯:`, error);
    return NextResponse.json(
      { error: '處理請求時發生錯誤' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const apiPath = pathSegments.join('/');
  
  console.log(`處理 POST API 代理請求: /api/v1/test-api-config/${apiPath}`);
  
  try {
    const backendUrl = getBackendUrl(`test-config/${apiPath}`);
    console.log(`代理 POST 請求到: ${backendUrl}`);
    
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (key !== 'host' && key !== 'connection') {
        headers[key] = value;
      }
    });
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: await req.text(),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error(`處理 POST API 代理請求 /api/v1/test-api-config/${apiPath} 時出錯:`, error);
    return NextResponse.json(
      { error: '處理請求時發生錯誤' },
      { status: 500 }
    );
  }
} 