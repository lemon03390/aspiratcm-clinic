/**
 * 將空或無效的字串欄位轉為空字串
 */
export function cleanStringField(value: any): string {
    // 使用更可靠的方式來檢查 null、undefined 或空值
    if (value === null || value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
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

    // 如果是陣列，嘗試將其轉為 JSON 字串
    if (Array.isArray(value)) {
        try {
            if (value.length === 0) {
                return '';
            }
            if (typeof value[0] === 'string') {
                return value.join('、');
            }
            return JSON.stringify(value);
        } catch (e) {
            console.warn('無法將陣列轉為 JSON 字串:', e);
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
        return value.filter(item => item !== null && item !== undefined);
    }

    if (value === null || value === undefined || value === '') {
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
        'chief_complaint', 'present_illness',
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
        // 如果 observation 是字串但看起來像 JSON
        if (typeof result.observation === 'string' &&
            (result.observation.startsWith('{') || result.observation.startsWith('['))) {
            try {
                // 嘗試解析 JSON 字符串
                const parsedObs = JSON.parse(result.observation);
                // 如果解析成功但是空對象/空數組，設置為空字串
                if (!parsedObs ||
                    (typeof parsedObs === 'object' && Object.keys(parsedObs).length === 0) ||
                    (Array.isArray(parsedObs) && parsedObs.length === 0)) {
                    result.observation = '';
                } else {
                    // 如果成功解析為非空對象，保持 JSON 字串
                    result.observation = typeof result.observation === 'string' ?
                        result.observation : JSON.stringify(parsedObs);
                }
            } catch (e) {
                // 如果解析失敗，保留原字串
                console.warn('無法解析 observation JSON 字串:', e);
            }
        } else if (typeof result.observation === 'object' && result.observation !== null) {
            try {
                // 檢查是否為空對象
                if (Object.keys(result.observation).length === 0) {
                    result.observation = '';
                } else {
                    // 非空物件轉為 JSON 字串
                    result.observation = JSON.stringify(result.observation);
                }
            } catch (e) {
                console.warn('無法將 observation 物件轉為 JSON 字串:', e);
                result.observation = '';
            }
        } else if (result.observation === null || result.observation === undefined) {
            result.observation = '';
        }
    }

    // 確保診斷資料結構正確
    if (!result.diagnosis) {
        result.diagnosis = {
            modern_diseases: [],
            cm_syndromes: [],
            cm_principle: ''
        };
    } else if (typeof result.diagnosis === 'object' && result.diagnosis !== null) {
        // 標準化欄位名稱 (現代疾病)
        if ('modern_diseases' in result.diagnosis) {
            result.diagnosis.modern_diseases = ensureArray(result.diagnosis.modern_diseases).filter(
                (item: any) => item && (typeof item === 'string' ? item.trim() !== '' : false)
            );
        } else if ('modernDiseases' in result.diagnosis) {
            result.diagnosis.modern_diseases = ensureArray(result.diagnosis.modernDiseases).filter(
                (item: any) => item && (typeof item === 'string' ? item.trim() !== '' : (item.code || item.name))
            );
            delete result.diagnosis.modernDiseases;
        } else {
            result.diagnosis.modern_diseases = [];
        }

        // 標準化欄位名稱 (中醫證候)
        if ('cm_syndromes' in result.diagnosis) {
            result.diagnosis.cm_syndromes = ensureArray(result.diagnosis.cm_syndromes).filter(
                (item: any) => item && (typeof item === 'string' ? item.trim() !== '' : false)
            );
        } else if ('cmSyndromes' in result.diagnosis) {
            result.diagnosis.cm_syndromes = ensureArray(result.diagnosis.cmSyndromes).filter(
                (item: any) => item && (typeof item === 'string' ? item.trim() !== '' : (item.code || item.name))
            );
            delete result.diagnosis.cmSyndromes;
        } else {
            result.diagnosis.cm_syndromes = [];
        }

        // 標準化欄位名稱 (中醫治則)
        if (!('cm_principle' in result.diagnosis) && 'cmPrinciple' in result.diagnosis) {
            if (Array.isArray(result.diagnosis.cmPrinciple) && result.diagnosis.cmPrinciple.length > 0) {
                const principle = result.diagnosis.cmPrinciple[0];
                result.diagnosis.cm_principle = typeof principle === 'object' ?
                    (principle.code || principle.name || '') : principle;
            } else {
                result.diagnosis.cm_principle = '';
            }
            delete result.diagnosis.cmPrinciple;
        }
    }

    // 處理處方資料，確保存在且有正確結構
    if (!result.prescription) {
        result.prescription = [];
    } else if (Array.isArray(result.prescription)) {
        // 處理處方作為陣列的情況，確保每個項目有必須的欄位
        result.prescription = result.prescription
            .filter(herb => herb && (herb.name || herb.herb_name))
            .map(herb => {
                // 確保所有必要欄位都有值
                return {
                    id: herb.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)),
                    name: herb.name || herb.herb_name || '',
                    code: herb.code || '',
                    amount: herb.amount || herb.powder_amount || '0',
                    powder_amount: herb.powder_amount || herb.amount || '0',
                    decoction_amount: herb.decoction_amount || '',
                    brand: herb.brand || '',
                    price_per_gram: herb.price_per_gram || 0,
                    total_price: herb.total_price || 0,
                    unit: herb.unit || 'g',
                    is_compound: herb.is_compound || false
                };
            });
    } else if (typeof result.prescription === 'object' && result.prescription.herbs) {
        // 處方是含有herbs屬性的對象
        if (Array.isArray(result.prescription.herbs)) {
            result.prescription.herbs = result.prescription.herbs
                .filter(herb => herb && (herb.name || herb.herb_name))
                .map(herb => {
                    return {
                        herb_name: herb.name || herb.herb_name || '',
                        amount: herb.amount || herb.powder_amount || '0',
                        unit: herb.unit || 'g',
                        structured_data: herb.structured_data || {
                            code: herb.code || '',
                            brand: herb.brand || '',
                            price_per_gram: herb.price_per_gram || 0,
                            total_price: herb.total_price || 0,
                            is_compound: herb.is_compound || false
                        }
                    };
                });
        } else {
            result.prescription.herbs = [];
        }

        // 確保處方指導有值
        result.prescription.instructions = result.prescription.instructions || '';

        // 確保結構化服藥指示有值
        if (!result.prescription.structured_instructions) {
            result.prescription.structured_instructions = {
                total_days: 7,
                times_per_day: 2,
                timing: '早晚服'
            };
        }
    }

    // 處理治療方法資料
    if (!result.treatment) {
        result.treatment = {
            treatment_items: []
        };
    } else if (typeof result.treatment === 'object' && !Array.isArray(result.treatment)) {
        if (result.treatment.treatment_items && Array.isArray(result.treatment.treatment_items)) {
            // 確保治療項目有有效數據
            result.treatment.treatment_items = result.treatment.treatment_items
                .filter(item => item && item.method)
                .map(item => ({
                    method: item.method,
                    target: item.target || '',
                    description: item.description || '',
                    sequence: item.sequence || 0
                }));
        } else {
            result.treatment.treatment_items = [];
        }
    } else if (Array.isArray(result.treatment)) {
        // 如果治療方法是陣列，轉換為標準格式
        result.treatment = {
            treatment_items: result.treatment.map((item, idx) => {
                if (typeof item === 'string') {
                    // 解析如 "方法: 目標" 格式的字串
                    const parts = item.split(':', 2);
                    return {
                        method: parts[0].trim(),
                        target: parts.length > 1 ? parts[1].trim() : '',
                        sequence: idx
                    };
                } else if (typeof item === 'object' && item) {
                    return {
                        method: item.method || '',
                        target: item.target || '',
                        description: item.description || '',
                        sequence: idx
                    };
                } else {
                    return {
                        method: '',
                        target: '',
                        sequence: idx
                    };
                }
            }).filter(item => item.method.trim() !== '')
        };
    } else if (result.treatmentMethods && Array.isArray(result.treatmentMethods)) {
        // 如果只有 treatmentMethods 陣列，從中構建標準格式
        result.treatment = {
            treatment_items: result.treatmentMethods.map((item, idx) => {
                if (typeof item === 'string') {
                    // 解析如 "方法: 目標" 格式的字串
                    const parts = item.split(':', 2);
                    return {
                        method: parts[0].trim(),
                        target: parts.length > 1 ? parts[1].trim() : '',
                        sequence: idx
                    };
                } else {
                    return {
                        method: '',
                        target: '',
                        sequence: idx
                    };
                }
            }).filter(item => item.method.trim() !== '')
        };
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