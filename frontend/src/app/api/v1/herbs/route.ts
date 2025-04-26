import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../libs/apiClient';

// 設置路由處理程序
export async function GET(
  request: NextRequest,
) {
  // 從請求中獲取查詢參數
  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get('search') || '';
  const isCompound = searchParams.get('is_compound');
  const skip = searchParams.get('skip') || '0';
  const limit = searchParams.get('limit') || '100';

  // 構建後端 API URL 和查詢參數
  let apiUrl = getBackendUrl(`/herbs?skip=${skip}&limit=${limit}`);
  
  if (searchQuery) {
    apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
  }
  
  if (isCompound !== null) {
    apiUrl += `&is_compound=${isCompound}`;
  }

  console.log('Fetching herbs from backend:', apiUrl);

  try {
    // 向後端 API 發送請求
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 檢查響應
    if (!response.ok) {
      console.error('Error fetching herbs:', response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch herbs: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 解析 JSON 響應
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // 處理錯誤
    console.error('Error fetching herbs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch herbs' },
      { status: 500 }
    );
  }
} 