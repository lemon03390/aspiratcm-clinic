/**
 * timeFormatter.ts
 * 用於處理時間格式化、時區轉換的工具函數
 * 統一使用香港時區 Asia/Hong_Kong (GMT+8)
 */

/**
 * 將任意時間字串轉換為香港時間格式
 * @param timeString 時間字串
 * @param format 輸出格式 (short, long, datetime, time)
 * @returns 格式化後的香港時間字串
 */
export function formatToHKTime(timeString: string | Date | null | undefined, format: 'short' | 'long' | 'datetime' | 'time' = 'datetime'): string {
  if (!timeString) {
    return '';
  }
  
  try {
    const date = new Date(timeString);
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
      console.error('無效的日期:', timeString);
      return '';
    }
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Hong_Kong',
      hour12: false,
    };
    
    switch (format) {
      case 'short':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        break;
      case 'long':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      case 'datetime':
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
    }
    
    return new Intl.DateTimeFormat('zh-HK', options).format(date);
  } catch (error) {
    console.error('格式化時間錯誤:', error);
    return '';
  }
}

/**
 * 將日期或時間格式化為 YYYY-MM-DD HH:mm 格式
 * @param dateTimeStr 日期時間字串
 * @returns 格式化後的字串
 */
export function formatDateTime(dateTimeStr: string | Date | null | undefined): string {
  if (!dateTimeStr) {
    return '';
  }
  
  try {
    return formatToHKTime(dateTimeStr, 'datetime');
  } catch (error) {
    console.error('格式化日期時間錯誤:', error);
    return '';
  }
}

/**
 * 將日期格式化為 YYYY-MM-DD 格式
 * @param dateStr 日期字串
 * @returns 格式化後的字串
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) {
    return '';
  }
  
  try {
    return formatToHKTime(dateStr, 'short');
  } catch (error) {
    console.error('格式化日期錯誤:', error);
    return '';
  }
}

/**
 * 將時間格式化為 HH:mm 格式
 * @param timeStr 時間字串
 * @returns 格式化後的字串
 */
export function formatTime(timeStr: string | Date | null | undefined): string {
  if (!timeStr) {
    return '';
  }
  
  try {
    return formatToHKTime(timeStr, 'time');
  } catch (error) {
    console.error('格式化時間錯誤:', error);
    return '';
  }
}

/**
 * 將 ISO 格式的日期時間轉換為本地格式
 * 使用於 API 日期輸入
 * @param date 要轉換的日期
 * @returns ISO 格式的日期字串
 */
export function toISOString(date: Date): string {
  try {
    return date.toISOString();
  } catch (error) {
    console.error('轉換ISO日期錯誤:', error);
    return new Date().toISOString();
  }
} 