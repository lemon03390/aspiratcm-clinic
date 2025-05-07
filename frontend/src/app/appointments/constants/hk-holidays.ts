/**
 * 香港法定公眾假期 (2024-2025年)
 */
export interface HolidayInfo {
  date: string; // ISO 格式日期 (YYYY-MM-DD)
  name: string; // 假期名稱
}

// 2024年香港法定公眾假期清單
export const HK_HOLIDAYS_2024: HolidayInfo[] = [
  { date: "2024-01-01", name: "元旦" },
  { date: "2024-02-10", name: "農曆年初一" },
  { date: "2024-02-12", name: "農曆年初三" },
  { date: "2024-02-13", name: "農曆年初四" },
  { date: "2024-03-29", name: "耶穌受難節" },
  { date: "2024-03-30", name: "耶穌受難節翌日" },
  { date: "2024-04-01", name: "復活節星期一" },
  { date: "2024-04-04", name: "清明節" },
  { date: "2024-05-01", name: "勞動節" },
  { date: "2024-05-15", name: "佛誕" },
  { date: "2024-06-10", name: "端午節" },
  { date: "2024-07-01", name: "香港特別行政區成立紀念日" },
  { date: "2024-09-18", name: "中秋節翌日" },
  { date: "2024-10-01", name: "國慶日" },
  { date: "2024-10-11", name: "重陽節" },
  { date: "2024-12-25", name: "聖誕節" },
  { date: "2024-12-26", name: "聖誕節後第一個週日" }
];

// 2025年香港法定公眾假期清單
export const HK_HOLIDAYS_2025: HolidayInfo[] = [
  { date: "2025-01-01", name: "元旦" },
  { date: "2025-01-29", name: "農曆年初一" },
  { date: "2025-01-30", name: "農曆年初二" },
  { date: "2025-01-31", name: "農曆年初三" },
  { date: "2025-04-05", name: "清明節" },
  { date: "2025-04-18", name: "耶穌受難節" },
  { date: "2025-04-19", name: "耶穌受難節翌日" },
  { date: "2025-04-21", name: "復活節星期一" },
  { date: "2025-05-01", name: "勞動節" },
  { date: "2025-05-12", name: "佛誕" },
  { date: "2025-06-25", name: "端午節" },
  { date: "2025-07-01", name: "香港特別行政區成立紀念日" },
  { date: "2025-09-01", name: "中秋節翌日" },
  { date: "2025-10-01", name: "國慶日" },
  { date: "2025-10-02", name: "重陽節" },
  { date: "2025-12-25", name: "聖誕節" },
  { date: "2025-12-26", name: "聖誕節後第一個週日" }
];

// 合併所有年份的假期
export const ALL_HK_HOLIDAYS: HolidayInfo[] = [
  ...HK_HOLIDAYS_2024,
  ...HK_HOLIDAYS_2025
];

/**
 * 檢查指定日期是否為香港法定公眾假期
 * @param date Date 對象或日期字串
 * @returns 假期資訊或 null
 */
export function isHKHoliday(date: Date | string): HolidayInfo | null {
  // 將日期轉換為 YYYY-MM-DD 格式字串
  const dateStr = typeof date === 'string'
    ? date
    : date.toISOString().split('T')[0];

  // 查找匹配的假期
  return ALL_HK_HOLIDAYS.find(holiday => holiday.date === dateStr) || null;
}

/**
 * 檢查指定日期是否為週末 (星期六或星期日)
 * @param date Date 對象
 * @returns 是否為週末
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 為星期日，6 為星期六
}

/**
 * 取得香港假期名稱
 * @param date Date 對象或日期字串
 * @returns 假期名稱，若非假期則返回空字串
 */
export function getHolidayName(date: Date | string): string {
  const holiday = isHKHoliday(date);
  return holiday ? holiday.name : '';
}
