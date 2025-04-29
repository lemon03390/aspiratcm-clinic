/**
 * 將空或無效的字串欄位轉為空字串
 */
export function cleanStringField(value: any): string {
    if (value === null || value === undefined ||
        (typeof value === 'object' && (
            Object.keys(value).length === 0 ||
            (Array.isArray(value) && value.length === 0)
        ))) {
        return '';
    }

    // 如果是物件但非空物件，嘗試將其轉為 JSON 字串
    if (typeof value === 'object' && !Array.isArray(value)) {
        try {
            return JSON.stringify(value);
        } catch (e) {
            console.warn('無法將物件轉為 JSON 字串:', e);
            return '';
        }
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    return String(value);
}

/**
 * 確保數組欄位始終為數組
 */
export function ensureArray<T>(value: any): T[] {
    if (Array.isArray(value)) {
        return value;
    }

    if (value === null || value === undefined) {
        return [];
    }

    return [value] as T[];
}

/**
 * 清理醫療記錄數據
 * 確保所有字串欄位格式正確，轉換空物件、null 等為空字串
 */
export function cleanMedicalRecordData(data: any): any {
    if (!data) {
        return {};
    }

    const result: any = { ...data };

    // 清理主要字串欄位
    const stringFields = [
        'chief_complaint', 'present_illness', 'observation',
        'left_pulse', 'right_pulse', 'tongue_quality',
        'tongue_shape', 'tongue_color', 'tongue_coating',
        'prescription_instructions'
    ];

    stringFields.forEach(field => {
        if (field in result) {
            result[field] = cleanStringField(result[field]);
        }
    });

    // 特殊處理 observation 欄位
    if ('observation' in result) {
        if (typeof result.observation === 'object' && result.observation !== null) {
            try {
                result.observation = JSON.stringify(result.observation);
            } catch (e) {
                console.warn('無法將 observation 物件轉為 JSON 字串:', e);
                result.observation = '';
            }
        } else if (result.observation === null || result.observation === undefined) {
            result.observation = '';
        }
    }

    // 確保診斷相關欄位為陣列
    if (result.diagnosis_structured) {
        if (result.diagnosis_structured.modernDiseases === null || result.diagnosis_structured.modernDiseases === undefined) {
            result.diagnosis_structured.modernDiseases = [];
        } else {
            result.diagnosis_structured.modernDiseases = ensureArray(result.diagnosis_structured.modernDiseases);
        }

        if (result.diagnosis_structured.cmSyndromes === null || result.diagnosis_structured.cmSyndromes === undefined) {
            result.diagnosis_structured.cmSyndromes = [];
        } else {
            result.diagnosis_structured.cmSyndromes = ensureArray(result.diagnosis_structured.cmSyndromes);
        }

        if (result.diagnosis_structured.cmPrinciple === null || result.diagnosis_structured.cmPrinciple === undefined) {
            result.diagnosis_structured.cmPrinciple = [];
        } else {
            result.diagnosis_structured.cmPrinciple = ensureArray(result.diagnosis_structured.cmPrinciple);
        }
    }

    // 直接處理診斷欄位
    if (result.diagnosis && (typeof result.diagnosis === 'object' && result.diagnosis !== null)) {
        if (result.diagnosis.modern_diseases === null || result.diagnosis.modern_diseases === undefined) {
            result.diagnosis.modern_diseases = [];
        } else {
            result.diagnosis.modern_diseases = ensureArray(result.diagnosis.modern_diseases);
        }

        if (result.diagnosis.cm_syndromes === null || result.diagnosis.cm_syndromes === undefined) {
            result.diagnosis.cm_syndromes = [];
        } else {
            result.diagnosis.cm_syndromes = ensureArray(result.diagnosis.cm_syndromes);
        }
    }

    return result;
}

/**
 * 清理患者數據
 * 確保所有字串欄位格式正確，轉換空物件、null 等為空字串
 */
export function cleanPatientData(data: any): any {
    if (!data) {
        return {};
    }

    const result: any = { ...data };

    // 確保陣列字段始終為陣列
    const arrayFields = ['basic_diseases', 'drug_allergies', 'food_allergies'];
    arrayFields.forEach(field => {
        if (field in result) {
            result[field] = ensureArray(result[field]);
        }
    });

    // 清理字串欄位
    const stringFields = [
        'chinese_name', 'english_name', 'id_number', 'phone_number',
        'email', 'gender', 'note', 'region', 'district', 'sub_district',
        'chief_complaint', 'special_note'
    ];

    stringFields.forEach(field => {
        if (field in result) {
            result[field] = cleanStringField(result[field]);
        }
    });

    return result;
} 