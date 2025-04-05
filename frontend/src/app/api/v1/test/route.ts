import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * 測試API端點，用於診斷前端API路由功能
 */
export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get('endpoint') || 'test';

  try {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      throw new Error('❌ NEXT_PUBLIC_API_BASE_URL 未設置，請檢查環境變數');
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    let backendUrl = apiBaseUrl;

    if (backendUrl === '/api/v1') {
      // 如果是相對路徑，替換為正式路徑
      backendUrl = 'https://clinic.aspiratcm.com/api/v1';
    }

    const config = {
      frontendApiPrefix: '/api/v1',
      apiBaseUrl,
      backendUrl,
      process_env: {
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      },
      requestInfo: {
        url: req.url,
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
      }
    };

    if (endpoint === 'backend') {
      try {
        const response = await axios.get(`${backendUrl}/docs`, {
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

