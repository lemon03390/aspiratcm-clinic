import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../libs/apiClient';

/**
 * 測試API配置端點
 * 用於確認環境變數和API URL設置正確
 */
export async function GET(req: NextRequest) {
  try {
    // 獲取當前配置信息
    const configInfo = {
      processEnv: {
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '未設置',
        NODE_ENV: process.env.NODE_ENV || '未設置'
      },
      apiUrls: {
        '/doctors': getBackendUrl('/doctors'),
        '/appointments': getBackendUrl('/appointments'),
        '/appointments/1': getBackendUrl('/appointments/1'),
        '/appointments/by-phone': getBackendUrl('/appointments/by-phone')
      },
      request: {
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        time: new Date().toISOString()
      }
    };

    return NextResponse.json({
      status: 'success',
      message: 'API配置測試成功',
      config: configInfo
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: '測試失敗',
      error: error.message
    }, { status: 500 });
  }
} 