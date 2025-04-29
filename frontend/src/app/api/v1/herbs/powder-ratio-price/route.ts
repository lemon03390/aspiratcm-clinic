import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { getBackendUrl } from '../../../../../libs/apiClient';

export async function GET() {
    try {
        // 嘗試從後端 API 獲取資料
        const apiUrl = getBackendUrl('/herbs/powder-ratio-price');
        console.log('Fetching herbs powder ratio price from backend:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            next: { revalidate: 3600 } // 1小時快取
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched ${data.length} herbs from API`);
            return NextResponse.json(data);
        }

        console.log('API request failed, trying local file');

        // 如果 API 請求失敗，從本地檔案讀取
        const localFilePath = path.join(process.cwd(), 'public/data/powder_ratio_price.json');

        if (fs.existsSync(localFilePath)) {
            const fileContent = fs.readFileSync(localFilePath, 'utf8');
            const data = JSON.parse(fileContent);
            console.log(`Successfully read ${data.length} herbs from local file`);
            return NextResponse.json(data);
        }

        // 如果本地檔案也不存在，返回空陣列
        return NextResponse.json([]);
    } catch (error) {
        console.error('Error fetching herbs powder ratio price:', error);

        // 發生錯誤時嘗試從本地檔案讀取
        try {
            const localFilePath = path.join(process.cwd(), 'public/data/powder_ratio_price.json');

            if (fs.existsSync(localFilePath)) {
                const fileContent = fs.readFileSync(localFilePath, 'utf8');
                const data = JSON.parse(fileContent);
                console.log(`Successfully read ${data.length} herbs from local file after error`);
                return NextResponse.json(data);
            }
        } catch (localError) {
            console.error('Error reading local file:', localError);
        }

        return NextResponse.json(
            { error: 'Failed to fetch herbs powder ratio price' },
            { status: 500 }
        );
    }
}
