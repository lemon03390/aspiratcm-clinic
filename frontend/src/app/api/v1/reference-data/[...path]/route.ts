import { getBackendUrl } from '../../../../../libs/apiClient';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// 參考資料映射
const DATA_MAPPING = {
  'modern-diseases': {
    apiPath: '/reference-data/modern-diseases',
    fallbackFile: 'data/modern_chinese_disease_name.json'
  },
  'cm-syndromes': {
    apiPath: '/reference-data/cm-syndromes',
    fallbackFile: 'data/cm_syndrome_list.json'
  },
  'tcm-principles': {
    apiPath: '/reference-data/tcm-principles',
    fallbackFile: 'data/tcm_treatment_rule.json'
  }
};

// 從靜態檔案獲取數據
async function getDataFromFile(filePath: string) {
  try {
    const fullPath = path.resolve('./public', filePath);
    console.log(`嘗試從靜態檔案讀取: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(fileContent);
    }
    
    console.warn(`檔案不存在: ${fullPath}`);
    return null;
  } catch (error) {
    console.error(`讀取或解析 JSON 檔案失敗: ${filePath}`, error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const apiPath = pathSegments.join('/');
  
  console.log(`處理參考資料請求: /api/v1/reference-data/${apiPath}`);
  
  try {
    // 搜尋請求
    if (apiPath === 'search') {
      const searchParams = req.nextUrl.searchParams;
      const dataType = searchParams.get('type') || '';
      const query = searchParams.get('q') || '';
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      
      console.log(`搜尋參考資料: 類型=${dataType}, 關鍵字=${query}, 限制=${limit}`);
      
      // 嘗試從 API 獲取搜尋結果
      try {
        const backendUrl = getBackendUrl(`/reference-data/search?type=${dataType}&q=${encodeURIComponent(query)}&limit=${limit}`);
        const response = await fetch(backendUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (apiError) {
        console.warn('從 API 搜尋失敗，將嘗試本地搜尋:', apiError);
      }
      
      // API 不可用時，從靜態檔案中搜尋
      const dataTypeMapping = Object.entries(DATA_MAPPING).find(([key]) => key === dataType);
      
      if (dataTypeMapping) {
        const [, config] = dataTypeMapping;
        const allData = await getDataFromFile(config.fallbackFile);
        
        if (allData) {
          // 根據不同類型的資料結構進行搜尋
          let results = [];
          
          if (dataType === 'modern-diseases') {
            // 搜尋現代病名
            results = allData.filter((item: any) => 
              item.name.includes(query) || 
              item.code.includes(query) ||
              (item.aliases && item.aliases.some((alias: string) => alias.includes(query)))
            ).slice(0, limit);
          } else if (dataType === 'cm-syndromes') {
            // 搜尋中醫證候
            results = allData.filter((item: any) => 
              typeof item === 'string' 
                ? item.includes(query) 
                : (item.name?.includes(query) || item.code?.includes(query))
            ).slice(0, limit);
          } else if (dataType === 'tcm-principles') {
            // 搜尋中醫治則
            results = allData.filter((item: any) => 
              item.name.includes(query) || 
              item.code.includes(query) ||
              (item.aliases && item.aliases.some((alias: string) => alias.includes(query)))
            ).slice(0, limit);
          }
          
          return NextResponse.json(results);
        }
      }
      
      // 如果所有方法都失敗，返回空數組
      return NextResponse.json([]);
    }
    
    // 獲取特定類型的參考資料
    const dataTypeMapping = Object.entries(DATA_MAPPING).find(([key]) => key === apiPath);
    
    if (dataTypeMapping) {
      const [, config] = dataTypeMapping;
      
      // 嘗試從 API 獲取
      try {
        const backendUrl = getBackendUrl(config.apiPath);
        console.log(`從 API 獲取參考資料: ${backendUrl}`);
        
        const response = await fetch(backendUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (apiError) {
        console.warn(`從 API 獲取失敗: ${apiPath}，將嘗試從靜態檔案獲取`, apiError);
      }
      
      // API 不可用時，從靜態檔案獲取
      const data = await getDataFromFile(config.fallbackFile);
      if (data) {
        return NextResponse.json(data);
      }
      
      // 如果都失敗，返回空數組
      return NextResponse.json([]);
    }
    
    // 直接代理到後端API
    try {
      const backendUrl = getBackendUrl(`/reference-data/${apiPath}`);
      console.log(`代理參考資料請求到: ${backendUrl}`);
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (proxyError) {
      console.error(`代理參考資料請求失敗: ${apiPath}`, proxyError);
      return NextResponse.json(
        { error: '無法連接到後端 API' },
        { status: 502 }
      );
    }
    
  } catch (error) {
    console.error(`處理參考資料請求 /api/v1/reference-data/${apiPath} 時出錯:`, error);
    return NextResponse.json(
      { error: '處理請求時發生錯誤' },
      { status: 500 }
    );
  }
} 