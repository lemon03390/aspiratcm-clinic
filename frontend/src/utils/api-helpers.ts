// 從環境變數獲取 API 基礎 URL
export function getBackendUrl(path: string = ''): string {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
