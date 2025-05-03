/**
 * 防抖函數 - 在指定時間內多次呼叫函數時，只執行最後一次呼叫
 * @param func 需要被防抖的函數
 * @param wait 等待時間（毫秒）
 * @returns 防抖處理後的函數
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func.apply(context, args);
            timeout = null;
        }, wait);
    };
} 