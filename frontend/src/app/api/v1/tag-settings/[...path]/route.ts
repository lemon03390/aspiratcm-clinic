import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const headersList = headers();
    const path = params.path ? `/${params.path.join("/")}` : "";
    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/tag-settings${path}`;

    console.log(`[GET] 參數化標籤API: ${apiUrl}`);
    console.log(`參數: ${JSON.stringify(params.path)}`);
    console.log(`環境變數: NEXT_PUBLIC_API_BASE_URL = ${process.env.NEXT_PUBLIC_API_BASE_URL}`);

    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store"
        });

        if (!response.ok) {
            console.error(`API響應錯誤 ${response.status}: ${response.statusText}`);
            console.error(`完整URL: ${apiUrl}`);

            // 檢查是否有響應內容
            const errorText = await response.text();
            console.error(`錯誤響應內容: ${errorText}`);

            return NextResponse.json(
                { detail: `標籤API錯誤: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[成功] 標籤API返回數據: ${JSON.stringify(data)}`);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error(`標籤API請求失敗: ${error.message}`);
        console.error(`堆疊信息: ${error.stack}`);
        return NextResponse.json(
            { detail: `標籤API請求失敗: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const headersList = headers();
    const path = params.path ? `/${params.path.join("/")}` : "";
    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/tag-settings${path}`;

    console.log(`[POST] 參數化標籤API: ${apiUrl}`);
    console.log(`參數: ${JSON.stringify(params.path)}`);

    try {
        const body = await request.json();
        console.log(`[POST] 請求體: ${JSON.stringify(body)}`);

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error(`API響應錯誤 ${response.status}: ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            console.error(`錯誤數據: ${JSON.stringify(errorData)}`);

            return NextResponse.json(
                { detail: errorData.detail || `標籤API錯誤: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[成功] POST請求成功返回: ${JSON.stringify(data)}`);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error(`標籤API請求失敗: ${error.message}`);
        console.error(`堆疊信息: ${error.stack}`);
        return NextResponse.json(
            { detail: `標籤API請求失敗: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const headersList = headers();
    const path = params.path ? `/${params.path.join("/")}` : "";
    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/tag-settings${path}`;

    console.log(`[PUT] 參數化標籤API: ${apiUrl}`);
    console.log(`參數: ${JSON.stringify(params.path)}`);

    try {
        const body = await request.json();
        console.log(`[PUT] 請求體: ${JSON.stringify(body)}`);

        const response = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error(`API響應錯誤 ${response.status}: ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            console.error(`錯誤數據: ${JSON.stringify(errorData)}`);

            return NextResponse.json(
                { detail: errorData.detail || `標籤API錯誤: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[成功] PUT請求成功返回: ${JSON.stringify(data)}`);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error(`標籤API請求失敗: ${error.message}`);
        console.error(`堆疊信息: ${error.stack}`);
        return NextResponse.json(
            { detail: `標籤API請求失敗: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const headersList = headers();
    const path = params.path ? `/${params.path.join("/")}` : "";
    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/tag-settings${path}`;

    console.log(`[DELETE] 參數化標籤API: ${apiUrl}`);
    console.log(`參數: ${JSON.stringify(params.path)}`);

    try {
        const response = await fetch(apiUrl, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store"
        });

        if (!response.ok) {
            console.error(`API響應錯誤 ${response.status}: ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            console.error(`錯誤數據: ${JSON.stringify(errorData)}`);

            return NextResponse.json(
                { detail: errorData.detail || `標籤API錯誤: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[成功] DELETE請求成功返回: ${JSON.stringify(data)}`);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error(`標籤API請求失敗: ${error.message}`);
        console.error(`堆疊信息: ${error.stack}`);
        return NextResponse.json(
            { detail: `標籤API請求失敗: ${error.message}` },
            { status: 500 }
        );
    }
} 