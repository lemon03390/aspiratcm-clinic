import { ConsultationType, consultationTypes } from "../constants/consultationTypes";

// 前端使用的擴展診療類型，包含 selectedSubType
export interface ExtendedConsultationType extends ConsultationType {
  selectedSubType?: { id: string; label: string };
}

/**
 * 將前端擴展的診療類型轉換為後端需要的格式
 * @param consultationType 前端擴展的診療類型
 * @returns 後端需要的診療類型格式
 */
export function formatConsultationTypeForBackend(consultationType: ExtendedConsultationType): any {
  if (!consultationType) {
    console.warn('診療類型為空');
    return null;
  }

  // 基本格式
  const formatted = {
    id: consultationType.id,
    label: consultationType.label,
    // 使用 selectedSubType 作為 subType，如果沒有則使用第一個子類型
    subType: consultationType.selectedSubType ||
      (consultationType.subTypes && consultationType.subTypes.length > 0 ?
        consultationType.subTypes[0] : undefined)
  };

  // 記錄診療類型轉換
  console.log('診療類型後端格式:', JSON.stringify(formatted, null, 2));

  return formatted;
}

/**
 * 從原始數據中解析診療類型
 * @param data 可能來自後端的診療類型數據
 * @returns 標準化的診療類型對象
 */
export function parseConsultationType(data: any): ExtendedConsultationType {
  // 如果是字符串，嘗試解析為 JSON
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error('解析診療類型失敗:', e);
      return consultationTypes[0]; // 使用默認值
    }
  }

  // 處理 null 或不是對象的情況
  if (!data || typeof data !== 'object') {
    console.warn('診療類型數據無效:', data);
    return consultationTypes[0]; // 使用默認值
  }

  // 確認數據有基本結構
  if (!data.id || !data.label) {
    console.warn('診療類型數據缺少必要欄位:', data);

    // 尋找有相似 ID 或 label 的預定義類型
    if (data.id) {
      const found = consultationTypes.find(type => type.id === data.id);
      if (found) {
        return { ...found };
      }
    }

    if (data.label) {
      const found = consultationTypes.find(type => type.label === data.label);
      if (found) {
        return { ...found };
      }
    }

    return consultationTypes[0]; // 使用默認值
  }

  // 基本結構
  const result: ExtendedConsultationType = {
    id: data.id,
    label: data.label,
    // 複製 subTypes，優先使用預定義類型中的 subTypes
  };

  // 尋找匹配的預定義類型
  const predefinedType = consultationTypes.find(type => type.id === data.id);
  if (predefinedType) {
    result.subTypes = predefinedType.subTypes;
  }

  // 處理 subType 欄位
  if (data.subType) {
    // 確保 subType 有 id 和 label
    if (data.subType.id && data.subType.label) {
      result.selectedSubType = data.subType;
    } else {
      console.warn('診療子類型數據缺少必要欄位:', data.subType);
    }
  }

  return result;
}

/**
 * 將診療類型格式化為顯示字符串
 * @param consultationType 診療類型對象
 * @returns 格式化的顯示文本
 */
export function formatConsultationTypeForDisplay(consultationType: any): string {
  if (!consultationType) {
    return '未指定';
  }

  const parsed = parseConsultationType(consultationType);

  // 基本類型文本
  let display = parsed.label || '未指定類型';

  // 如果有子類型，添加子類型信息
  if (parsed.selectedSubType) {
    display += ` - ${parsed.selectedSubType.label}`;
  } else if (consultationType.subType) {
    // 這裡直接使用原始數據中的 subType，因為 ExtendedConsultationType 沒有這個屬性
    display += ` - ${consultationType.subType.label}`;
  }

  return display;
}

/**
 * 查找預約類型名稱
 * @param typeId 預約類型 ID
 * @returns 預約類型名稱
 */
export function findConsultationTypeName(typeId: string): string {
  const type = consultationTypes.find(t => t.id === typeId);
  return type ? type.label : '未知類型';
}

/**
 * 查找預約子類型名稱
 * @param typeId 預約類型 ID
 * @param subTypeId 預約子類型 ID
 * @returns 預約子類型名稱
 */
export function findConsultationSubTypeName(typeId: string, subTypeId: string): string {
  const type = consultationTypes.find(t => t.id === typeId);
  if (!type || !type.subTypes) {
    return '未知子類型';
  }

  const subType = type.subTypes.find(st => st.id === subTypeId);
  return subType ? subType.label : '未知子類型';
}

export default {
  formatConsultationTypeForBackend,
  parseConsultationType,
  formatConsultationTypeForDisplay,
  findConsultationTypeName,
  findConsultationSubTypeName
}; 