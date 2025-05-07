import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getBackendUrl } from '../../../../libs/apiClient';

// 設置路由處理程序
export async function GET(
  request: NextRequest,
) {
  // 從請求中獲取查詢參數
  const { searchParams } = request.nextUrl;
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
      console.log('Falling back to local file...');

      // 回退到本地檔案
      try {
        const localFilePath = path.join(process.cwd(), 'public/data/powder_ratio_price.json');

        if (fs.existsSync(localFilePath)) {
          const localData = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
          console.log(`Found ${localData.length} herbs in local file`);

          // 如果有搜尋查詢，過濾結果
          let filteredData = localData;
          if (searchQuery) {
            filteredData = localData.filter((herb: any) =>
              herb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (herb.aliases?.some((alias: string) =>
                alias.toLowerCase().includes(searchQuery.toLowerCase())
              ))
            );
            console.log(`Filtered to ${filteredData.length} herbs matching "${searchQuery}"`);
          }

          // 套用分頁
          const skipNum = parseInt(skip);
          const limitNum = parseInt(limit);
          const paginatedData = filteredData.slice(skipNum, skipNum + limitNum);

          return NextResponse.json({
            items: paginatedData,
            total: filteredData.length,
            page: Math.floor(skipNum / limitNum) + 1,
            size: limitNum
          });
        }
      } catch (localError) {
        console.error('Error reading local file:', localError);
      }

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

    // 在返回錯誤前嘗試本地檔案
    try {
      const localFilePath = path.join(process.cwd(), 'public/data/powder_ratio_price.json');

      if (fs.existsSync(localFilePath)) {
        const localData = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
        console.log(`Found ${localData.length} herbs in local file`);

        // 如果有搜尋查詢，過濾結果
        let filteredData = localData;
        if (searchQuery) {
          filteredData = localData.filter((herb: any) =>
            herb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (herb.aliases?.some((alias: string) =>
              alias.toLowerCase().includes(searchQuery.toLowerCase())
            ))
          );
          console.log(`Filtered to ${filteredData.length} herbs matching "${searchQuery}"`);
        }

        // 套用分頁
        const skipNum = parseInt(skip);
        const limitNum = parseInt(limit);
        const paginatedData = filteredData.slice(skipNum, skipNum + limitNum);

        return NextResponse.json({
          items: paginatedData,
          total: filteredData.length,
          page: Math.floor(skipNum / limitNum) + 1,
          size: limitNum
        });
      }
    } catch (localError) {
      console.error('Error reading local file:', localError);
    }

    return NextResponse.json(
      { error: 'Failed to fetch herbs' },
      { status: 500 }
    );
  }
} 