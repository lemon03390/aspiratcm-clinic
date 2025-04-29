/**
 * 清理字串欄位，確保輸出為有效字串
 * 將空物件、null、undefined 等非字串值轉換為空字串
 * 
 * @param value 任何輸入值
 * @returns 清理後的字串
 */
export const cleanStringField = (value: any): string => {
    // 如果值為空 (null, undefined)，返回空字串
    if (value === null || value === undefined) {
        return '';
    }

    // 如果值已經是字串，直接返回
    if (typeof value === 'string') {
        return value;
    }

    // 判斷是否為空物件 {}
    if (typeof value === 'object' && Object.keys(value).length === 0) {
        return '';
    }

    // 其他非字串值，嘗試轉換為字串
    try {
        return String(value);
    } catch (error) {
        console.warn('無法轉換值為字串:', value);
        return '';
    }
};

/**
 * 清理醫療記錄表單中的所有字串欄位
 * 
 * @param formData 醫療記錄表單數據
 * @returns 清理後的表單數據
 */
export const cleanMedicalRecordData = (formData: any): any => {
    const cleanedData = { ...formData };

    // 清理主要文本欄位
    if (cleanedData.chief_complaint !== undefined) {
        cleanedData.chief_complaint = cleanStringField(cleanedData.chief_complaint);
    }

    if (cleanedData.present_illness !== undefined) {
        cleanedData.present_illness = cleanStringField(cleanedData.present_illness);
    }

    if (cleanedData.observation !== undefined) {
        cleanedData.observation = cleanStringField(cleanedData.observation);
    }

    // 清理脈診與舌診欄位
    if (cleanedData.left_pulse !== undefined) {
        cleanedData.left_pulse = cleanStringField(cleanedData.left_pulse);
    }

    if (cleanedData.right_pulse !== undefined) {
        cleanedData.right_pulse = cleanStringField(cleanedData.right_pulse);
    }

    if (cleanedData.tongue_quality !== undefined) {
        cleanedData.tongue_quality = cleanStringField(cleanedData.tongue_quality);
    }

    if (cleanedData.tongue_shape !== undefined) {
        cleanedData.tongue_shape = cleanStringField(cleanedData.tongue_shape);
    }

    if (cleanedData.tongue_color !== undefined) {
        cleanedData.tongue_color = cleanStringField(cleanedData.tongue_color);
    }

    if (cleanedData.tongue_coating !== undefined) {
        cleanedData.tongue_coating = cleanStringField(cleanedData.tongue_coating);
    }

    return cleanedData;
}; 