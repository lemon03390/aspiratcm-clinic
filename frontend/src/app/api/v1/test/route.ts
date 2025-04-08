import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getBackendUrl } from '../../../../libs/apiClient';

/**
 * 測試API端點，用於診斷前端API路由功能
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');
    
    // 使用getBackendUrl函數獲取後端URL基礎地址
    const backendUrl = getBackendUrl();
    
    // 收集環境配置信息
    const config = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      currentUrl: req.url,
      requestInfo: {
        url: req.url,
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
      }
    };

    if (endpoint === 'backend') {
      try {
        // 使用getBackendUrl函數獲取文檔URL
        const response = await axios.get(getBackendUrl('/docs/'), {
          timeout: 5000
        });

        return NextResponse.json({
          status: 'success',
          message: '成功連接到後端API',
          backendStatus: response.status,
          config
        });
      } catch (error: any) {
        return NextResponse.json({
          status: 'error',
          message: '無法連接到後端API',
          error: error.message,
          errorDetail: error.response?.data || '無詳細錯誤信息',
          config
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: '前端API路由正常工作',
      timestamp: new Date().toISOString(),
      config
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: '測試API端點發生錯誤',
      error: error.message,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    return NextResponse.json({
      status: 'success',
      message: 'POST測試成功',
      receivedData: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'POST測試失敗',
      error: error.message,
    }, { status: 500 });
  }
}

