/**
 * API 工具函數
 */

/**
 * 從環境變數獲取後端 API 基礎 URL 並構建完整 URL
 */
export function getBackendUrl(path: string = ''): URL {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return new URL(`${baseUrl}${cleanPath}`);
}

/**
 * 從本地 API 代理獲取前端 API URL
 */
export function getFrontendApiUrl(path: string = ''): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/api/v1${cleanPath}`;
}

/**
 * 格式化日期為本地日期字符串 (YYYY-MM-DD)
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) {
        return '-';
    }
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        return '-';
    }
    return d.toLocaleDateString('zh-TW');
}

/**
 * 格式化布爾值為狀態文字
 */
export function formatBoolean(value: boolean | undefined | null, trueText: string = '是', falseText: string = '否'): string {
    return value ? trueText : falseText;
} 