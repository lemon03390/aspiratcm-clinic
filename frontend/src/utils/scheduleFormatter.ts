/**
 * 醫生排班數據格式轉換工具
 * 用於確保前後端之間醫生排班數據的一致性
 */

/**
 * 將各種格式的排班數據轉換為標準的陣列格式
 * @param schedule 原始排班數據，可能是字符串、陣列或其他格式
 * @returns 標準格式的排班陣列
 */
export function normalizeSchedule(schedule: any): string[] {
  // 如果是 null 或 undefined，返回空陣列
  if (schedule == null) {
    console.warn('排班數據為空，返回空陣列');
    return [];
  }
  
  // 如果已經是陣列，檢查元素是否都是字符串
  if (Array.isArray(schedule)) {
    // 過濾並轉換非字符串元素
    const normalized = schedule
      .filter(day => day != null)
      .map(day => String(day).toLowerCase());
    
    // 檢查是否有無效星期幾
    const validDays = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    const invalidDays = normalized.filter(day => !validDays.has(day));
    
    if (invalidDays.length > 0) {
      console.warn(`發現無效的排班日: ${invalidDays.join(', ')}`);
    }
    
    return normalized.filter(day => validDays.has(day));
  }
  
  // 如果是字符串，嘗試解析為 JSON
  if (typeof schedule === 'string') {
    try {
      // 嘗試解析為 JSON
      const parsed = JSON.parse(schedule);
      // 遞歸調用以處理解析後的值
      return normalizeSchedule(parsed);
    } catch (e) {
      console.error('解析排班數據字符串失敗:', e);
      
      // 可能是逗號分隔的字符串
      if (schedule.includes(',')) {
        return normalizeSchedule(schedule.split(',').map(s => s.trim()));
      }
      
      // 作為單個值處理
      return [schedule.toLowerCase()];
    }
  }
  
  // 對於對象類型，可能是特殊格式
  if (typeof schedule === 'object') {
    // 可能是包含 days 字段的對象
    if (schedule.days && Array.isArray(schedule.days)) {
      return normalizeSchedule(schedule.days);
    }
    
    // 可能是以星期幾為鍵的對象 { monday: true, ... }
    const days = Object.entries(schedule)
      .filter(([_, value]) => value === true || value === 1 || value === 'true')
      .map(([key, _]) => key.toLowerCase());
    
    if (days.length > 0) {
      return normalizeSchedule(days);
    }
  }
  
  // 無法理解的格式，記錄錯誤並返回空陣列
  console.error('無法識別的排班數據格式:', schedule, 'type:', typeof schedule);
  return [];
}

/**
 * 將陣列格式的排班數據轉換為中文顯示
 * @param schedule 排班陣列
 * @returns 格式化的中文排班字符串
 */
export function formatScheduleForDisplay(schedule: string[]): string {
  if (!schedule || schedule.length === 0) {
    return '未設置排班';
  }
  
  const dayLabels: { [key: string]: string } = {
    'monday': '星期一',
    'tuesday': '星期二',
    'wednesday': '星期三',
    'thursday': '星期四',
    'friday': '星期五',
    'saturday': '星期六',
    'sunday': '星期日',
  };
  
  return normalizeSchedule(schedule)
    .map(day => dayLabels[day.toLowerCase()] || day)
    .join('、');
}

/**
 * 檢查特定的星期幾是否在排班中
 * @param schedule 排班陣列
 * @param dayOfWeek 要檢查的星期幾（0-6，0表示星期日）
 * @returns 該星期是否在排班中
 */
export function isDayInSchedule(schedule: any, dayOfWeek: number): boolean {
  const normalizedSchedule = normalizeSchedule(schedule);
  
  // 將 JavaScript 的星期日(0)到星期六(6)轉換為系統中的星期一到星期日
  const dayMapping: { [key: number]: string } = {
    0: 'sunday',    // 週日 = 0
    1: 'monday',    // 週一 = 1
    2: 'tuesday',   // 週二 = 2
    3: 'wednesday', // 週三 = 3
    4: 'thursday',  // 週四 = 4
    5: 'friday',    // 週五 = 5
    6: 'saturday',  // 週六 = 6
  };
  
  const dayName = dayMapping[dayOfWeek];
  return normalizedSchedule.includes(dayName);
}

/**
 * 獲取未來7天中醫師可應診的日期列表
 * @param schedule 醫師排班
 * @returns 未來7天內可應診的日期
 */
export function getAvailableDatesInWeek(schedule: any): Date[] {
  const availableDates: Date[] = [];
  const normalizedSchedule = normalizeSchedule(schedule);
  
  if (normalizedSchedule.length === 0) {
    return [];
  }
  
  const today = new Date();
  
  // 檢查未來7天
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    if (isDayInSchedule(normalizedSchedule, date.getDay())) {
      availableDates.push(date);
    }
  }
  
  return availableDates;
}

export default {
  normalizeSchedule,
  formatScheduleForDisplay,
  isDayInSchedule,
  getAvailableDatesInWeek
}; 