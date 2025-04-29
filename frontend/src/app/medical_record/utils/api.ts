import axios, { AxiosError } from 'axios';
import { getBackendUrl } from '../../../libs/apiClient';
import { cleanMedicalRecordData, cleanStringField } from './formHelpers';

// 全局儲存中藥資料
let allHerbs: any[] = [];

// 從環境變數獲取API基礎URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

// 創建axios實例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10秒超時
  headers: {
    'Content-Type': 'application/json',
  },
});

// 創建帶重試機制的axios請求
const apiClientWithRetry = async (
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  data?: any,
  retries = 3,
  delay = 1000
) => {
  let retryCount = 0;
  let lastError: AxiosError | null = null;

  while (retryCount < retries) {
    try {
      const url = getBackendUrl(endpoint);
      console.log(`嘗試 ${method.toUpperCase()} 請求到: ${url}`);

      let response;
      if (method.toLowerCase() === 'get') {
        response = await axios.get(url, {
          params: data,
          timeout: 10000
        });
      } else if (method.toLowerCase() === 'post') {
        response = await axios.post(url, data, {
          timeout: 10000
        });
      } else if (method.toLowerCase() === 'put') {
        response = await axios.put(url, data, {
          timeout: 10000
        });
      } else if (method.toLowerCase() === 'patch') {
        response = await axios.patch(url, data, {
          timeout: 10000
        });
      } else if (method.toLowerCase() === 'delete') {
        response = await axios.delete(url, {
          timeout: 10000
        });
      } else {
        throw new Error(`不支持的HTTP方法: ${method}`);
      }

      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      lastError = err;

      // 對於404錯誤，直接返回一個友好的錯誤，不進行重試
      if (err.response?.status === 404) {
        console.log(`資源不存在: ${endpoint}`, err.response?.data);
        const errorDetail = err.response?.data as any;
        const errorMessage = errorDetail?.detail || '資源不存在';
        throw new Error(`找不到資源: ${errorMessage}`);
      }

      // 對於400錯誤（錯誤請求），直接拋出錯誤，不進行重試
      if (err.response?.status === 400) {
        console.log(`請求參數錯誤: ${endpoint}`, err.response?.data);
        const errorDetail = err.response?.data as any;
        const errorMessage = errorDetail?.detail || '請求參數錯誤';
        throw new Error(`請求參數錯誤: ${errorMessage}`);
      }

      // 對於401錯誤（未授權），可能需要重新登錄
      if (err.response?.status === 401) {
        console.log(`未授權訪問: ${endpoint}`);
        throw new Error('您的登錄狀態已過期，請重新登錄');
      }

      // 如果錯誤是客戶端錯誤（4xx）且不是上述處理的錯誤，直接拋出
      if (
        err.response?.status &&
        err.response.status >= 400 &&
        err.response.status < 500
      ) {
        console.log(`客戶端錯誤: ${endpoint}`, err.response?.data);
        const errorDetail = err.response?.data as any;
        const errorMessage = errorDetail?.detail || '請求出現錯誤';
        throw new Error(`請求錯誤: ${errorMessage}`);
      }

      retryCount++;
      console.log(`API請求失敗 (${retryCount}/${retries})...`, err);
      console.log(`請求URL: ${endpoint}`);
      console.log(`錯誤詳情:`, err.response?.data || err.message);

      // 等待一段時間再重試
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, retryCount - 1)));
    }
  }

  // 重試用盡後，提供更友好的錯誤訊息
  let errorMessage = '系統暫時無法連接，請稍後再試';

  if (lastError?.response?.status === 500) {
    errorMessage = '系統內部錯誤，請聯繫技術支持';
  } else if (lastError?.code === 'ECONNABORTED') {
    errorMessage = '連接超時，請檢查網絡連接';
  } else if (lastError?.message) {
    errorMessage = `請求失敗: ${lastError.message}`;
  }

  console.error(`重試 ${retries} 次後仍然失敗:`, endpoint, lastError);
  throw new Error(errorMessage);
};

// 參考資料API
export const referenceDataApi = {
  // 獲取指定類型的參考資料
  getByType: async (dataType: string) => {
    try {
      console.log(`正在獲取參考資料：${dataType}`);
      return await apiClientWithRetry('get', `/reference-data/${dataType}`);
    } catch (error) {
      console.error(`獲取參考資料失敗：${dataType}`, error);
      throw error;
    }
  },

  // 搜尋參考資料
  search: async (dataType: string, query: string, limit: number = 10) => {
    try {
      console.log(`正在搜尋參考資料：${dataType}, 關鍵字: ${query}`);
      return await apiClientWithRetry('get', `/reference-data/search/${dataType}?q=${encodeURIComponent(query)}&limit=${limit}`);
    } catch (error) {
      console.error(`搜尋參考資料失敗：${dataType}`, error);
      return []; // 搜尋失敗時返回空數組
    }
  },

  // 獲取舌診參考資料
  getTongueReference: async () => {
    try {
      console.log('正在獲取舌診參考資料');
      return await apiClientWithRetry('get', '/reference-data/tongue-reference');
    } catch (error) {
      console.error('獲取舌診參考資料失敗:', error);

      // 如果API調用失敗，嘗試從本地數據獲取
      try {
        const response = await fetch('/data/tongue_reference.json');
        if (response.ok) {
          return await response.json();
        }
      } catch (localError) {
        console.error('讀取本地舌診數據失敗:', localError);
      }

      // 都失敗時返回null
      return null;
    }
  },

  // 獲取脈診參考資料
  getPulseReference: async () => {
    try {
      console.log('正在獲取脈診參考資料');
      return await apiClientWithRetry('get', '/reference-data/pulse-reference');
    } catch (error) {
      console.error('獲取脈診參考資料失敗:', error);

      // 如果API調用失敗，嘗試從本地數據獲取
      try {
        const response = await fetch('/data/pulse_reference.json');
        if (response.ok) {
          return await response.json();
        }
      } catch (localError) {
        console.error('讀取本地脈診數據失敗:', localError);
      }

      // 都失敗時返回null
      return null;
    }
  }
};

// 醫療記錄API
export const medicalRecordApi = {
  // 獲取患者的所有醫療記錄
  getPatientRecords: async (patientId: number) => {
    try {
      console.log('正在獲取患者病歷，患者ID:', patientId);
      return await apiClientWithRetry('get', `/medical-records/by-patient/${patientId}`);
    } catch (error) {
      console.error(`獲取患者病歷失敗，患者ID: ${patientId}:`, error);
      throw error;
    }
  },

  // 獲取單條醫療記錄詳情
  getRecordById: async (recordId: string) => {
    try {
      console.log('正在獲取病歷詳情，記錄ID:', recordId);
      return await apiClientWithRetry('get', `/medical-records/${recordId}`);
    } catch (error) {
      console.error(`獲取病歷詳情失敗，記錄ID: ${recordId}:`, error);
      throw error;
    }
  },

  // 創建新醫療記錄
  createRecord: async (recordData: any) => {
    try {
      console.log('收到病歷資料，準備清洗資料並轉換格式:', recordData);

      // 先清理所有字串欄位，將空物件、null 等轉換為空字串
      const cleanedData = cleanMedicalRecordData(recordData);
      console.log('清理後的資料:', cleanedData);

      // 轉換診斷資料為後端所需的格式
      let transformedData = { ...cleanedData };

      // 如果有診斷結構資料，轉換為後端要求格式
      if (cleanedData.diagnosis_structured) {
        const diagnosisData = cleanedData.diagnosis_structured;

        transformedData.diagnosis = {
          modern_diseases: (diagnosisData.modernDiseases || []).map(d => d.code || d.name || ''),
          cm_syndromes: (diagnosisData.cmSyndromes || []).map(d => d.code || d.name || ''),
          cm_principle: diagnosisData.cmPrinciple?.[0]?.code || diagnosisData.cmPrinciple?.[0]?.name || undefined
        };

        // 移除原始結構化診斷數據
        delete transformedData.diagnosis_structured;
      } else if (!transformedData.diagnosis) {
        // 如果沒有診斷資料，創建空的診斷結構
        transformedData.diagnosis = {
          modern_diseases: [],
          cm_syndromes: [],
          cm_principle: ''
        };
      }

      // 轉換處方藥材為後端所需格式
      if (cleanedData.prescription && Array.isArray(cleanedData.prescription)) {
        transformedData.prescription = {
          instructions: cleanStringField(cleanedData.prescription_instructions || ""),
          structured_instructions: cleanedData.prescription_structured_instructions || {
            total_days: 7,
            times_per_day: 2,
            timing: '早晚服'
          },
          herbs: cleanedData.prescription.map((herb, index) => ({
            herb_name: herb.name || '',
            amount: herb.amount || herb.powder_amount || '0',
            unit: herb.unit || "g",
            sequence: index,
            source: "manual",
            structured_data: {
              price_per_gram: herb.price_per_gram || 0,
              total_price: herb.total_price || 0,
              brand: herb.brand || '',
              is_compound: herb.is_compound || false,
              code: herb.code || ''
            }
          }))
        };
      }

      // 確保將藥物從陣列轉換為物件
      if (!transformedData.prescription) {
        transformedData.prescription = {
          instructions: "",
          structured_instructions: {
            total_days: 7,
            times_per_day: 2,
            timing: '早晚服'
          },
          herbs: []
        };
      } else if (transformedData.prescription && !transformedData.prescription.herbs) {
        transformedData.prescription = {
          instructions: transformedData.prescription_instructions || "",
          structured_instructions: transformedData.prescription_structured_instructions || {
            total_days: 7,
            times_per_day: 2,
            timing: '早晚服'
          },
          herbs: transformedData.prescription
        };
      }

      // 移除不需要的欄位
      delete transformedData.prescription_instructions;
      delete transformedData.prescription_structured_instructions;

      console.log('轉換後準備發送的病歷資料:', transformedData);
      return await apiClientWithRetry('post', '/medical-records', transformedData);
    } catch (error) {
      console.error('創建病歷失敗:', error);
      throw error;
    }
  },

  // 更新醫療記錄
  updateRecord: async (recordId: string, recordData: any) => {
    try {
      console.log(`正在更新病歷，記錄ID: ${recordId}:`, recordData);
      return await apiClientWithRetry('put', `/medical-records/${recordId}`, recordData);
    } catch (error) {
      console.error(`更新病歷失敗，記錄ID: ${recordId}:`, error);
      throw error;
    }
  }
};

// 病人API
export const patientApi = {
  // 獲取患者詳情（通過ID）
  getPatientById: async (patientId: number) => {
    try {
      console.log('正在獲取患者資料，患者ID:', patientId);

      if (!patientId) {
        throw new Error('缺少有效的患者ID');
      }

      const response = await apiClientWithRetry('get', `/patient_registration/${patientId}`);

      // 增強的資料清理，確保關鍵欄位格式正確
      const cleanedData = defensiveDataCleaning(response);
      console.log('清理後的患者資料:', cleanedData);
      return cleanedData;
    } catch (error) {
      console.error(`獲取患者資料失敗，患者ID: ${patientId}:`, error);

      // 提供更詳細的錯誤信息
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
        throw new Error(`獲取患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      throw error;
    }
  },

  // 獲取患者詳情（通過電話號碼）
  getPatientByPhoneNumber: async (phoneNumber: string) => {
    try {
      console.log('正在獲取患者資料，電話號碼:', phoneNumber);
      // 格式化電話號碼，移除空格和特殊字符
      const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

      // 嘗試使用新 API 端點格式
      try {
        console.log('嘗試使用查詢參數格式 API 端點');
        const response = await axios.get(getBackendUrl(`/patients/by-phone-number?phone=${formattedPhone}`), {
          timeout: 5000
        });
        console.log('成功獲取患者資料（查詢參數格式）');

        // 增強的資料清理，確保關鍵欄位格式正確
        const cleanedData = defensiveDataCleaning(response.data);
        console.log('清理後的患者資料:', cleanedData);
        return cleanedData;
      } catch (fallbackError: any) {
        // 記錄新 API 嘗試的錯誤
        console.warn('使用新 API 端點失敗，嘗試舊式端點格式:', fallbackError?.message);

        // 嘗試使用原始 API 端點格式 (路徑參數) - 僅作為臨時後備方案
        console.log('嘗試使用原始路徑參數格式 API 端點（即將淘汰）');
        const response = await apiClientWithRetry('get', `/patient_registration/by-phone-number/${formattedPhone}/`);

        // 增強的資料清理，確保關鍵欄位格式正確
        const cleanedData = defensiveDataCleaning(response);
        console.log('清理後的患者資料:', cleanedData);
        return cleanedData;
      }
    } catch (error) {
      console.error(`獲取患者資料失敗，電話號碼: ${phoneNumber}:`, error);

      // 提供更詳細的錯誤信息
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
        throw new Error(`獲取患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      throw error;
    }
  },

  // 更新患者資料
  updatePatient: async (patientId: number, updateData: any) => {
    try {
      console.log(`正在更新患者資料，患者ID: ${patientId}:`, updateData);
      return await apiClientWithRetry('patch', `/patients/${patientId}`, updateData);
    } catch (error) {
      console.error(`更新患者資料失敗，患者ID: ${patientId}:`, error);

      // 提供更詳細的錯誤信息
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
        throw new Error(`更新患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      throw error;
    }
  },

  // 更新患者特殊標記
  updatePatientMarkers: async (patientId: number, markers: {
    is_troublesome: number;
    is_contagious: number;
    special_note: string;
  }) => {
    try {
      const response = await fetch(`${getBackendUrl(`/patients/${patientId}`)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(markers),
      });

      if (!response.ok) {
        console.error(`API響應狀態: ${response.status}`);
        console.error(`請求URL: ${getBackendUrl(`/patients/${patientId}`)}`);
        throw new Error(`更新患者標記失敗(${response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      return await response.json();
    } catch (error) {
      console.error('更新患者標記時出錯:', error);
      throw error;
    }
  },
};

// 增強型資料清理函數，提供更強的容錯性
function defensiveDataCleaning(data: any): any {
  if (!data) {
    return {};
  }

  const cleanedData = { ...data };

  // 確保 basic_diseases, drug_allergies, food_allergies 始終為陣列
  ['basic_diseases', 'drug_allergies', 'food_allergies'].forEach(field => {
    if (!(field in cleanedData) || cleanedData[field] === null || cleanedData[field] === undefined) {
      cleanedData[field] = [];
    } else if (!Array.isArray(cleanedData[field])) {
      cleanedData[field] = [cleanedData[field]];
    }
  });

  // 清理字符串欄位
  ['note', 'chief_complaint', 'special_note'].forEach(field => {
    if (field in cleanedData && (cleanedData[field] === null || cleanedData[field] === undefined)) {
      cleanedData[field] = '';
    }
  });

  // 特殊處理 observation 欄位
  if ('observation' in cleanedData) {
    if (cleanedData.observation === null ||
      cleanedData.observation === undefined ||
      (typeof cleanedData.observation === 'object' && Object.keys(cleanedData.observation).length === 0)) {
      cleanedData.observation = '';
    } else if (typeof cleanedData.observation === 'object') {
      try {
        cleanedData.observation = JSON.stringify(cleanedData.observation);
      } catch (error) {
        console.warn('將 observation 對象轉換為字符串時出錯:', error);
        cleanedData.observation = '';
      }
    }
  }

  // 處理醫療記錄中的診斷欄位
  if (cleanedData.medical_records && Array.isArray(cleanedData.medical_records)) {
    cleanedData.medical_records = cleanedData.medical_records.map((record: any) => {
      if (!record) {
        return record;
      }

      // 清理 observation
      if ('observation' in record) {
        if (record.observation === null ||
          record.observation === undefined ||
          (typeof record.observation === 'object' && Object.keys(record.observation).length === 0)) {
          record.observation = '';
        } else if (typeof record.observation === 'object') {
          try {
            record.observation = JSON.stringify(record.observation);
          } catch (error) {
            console.warn('將醫療記錄中的 observation 對象轉換為字符串時出錯:', error);
            record.observation = '';
          }
        }
      }

      // 處理診斷欄位
      if (record.diagnosis) {
        if (!record.diagnosis.modern_diseases || record.diagnosis.modern_diseases === null) {
          record.diagnosis.modern_diseases = [];
        }
        if (!record.diagnosis.cm_syndromes || record.diagnosis.cm_syndromes === null) {
          record.diagnosis.cm_syndromes = [];
        }
      }

      return record;
    });
  }

  // 處理特殊標記欄位
  if ('is_troublesome' in cleanedData && cleanedData.is_troublesome === null) {
    cleanedData.is_troublesome = 0;
  }
  if ('is_contagious' in cleanedData && cleanedData.is_contagious === null) {
    cleanedData.is_contagious = 0;
  }

  return cleanedData;
}

// 預約API
export const appointmentApi = {
  // 獲取當日候診名單
  getWaitingList: async () => {
    try {
      console.log('正在從掛號系統獲取候診名單');

      const endpoint = `/patient_registration/waiting-list`;
      console.log(`使用候診清單端點: ${endpoint}`);
      console.log(`完整 URL: ${getBackendUrl(endpoint)}`);

      const response = await apiClientWithRetry('get', endpoint);
      console.log(`候診清單響應:`, response);

      if (!Array.isArray(response)) {
        console.warn('候診名單響應不是數組格式:', response);
        return [];
      }

      return response;
    } catch (error) {
      console.error('獲取候診名單失敗:', error);

      // 加強錯誤處理
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
      }

      // 返回空陣列避免UI崩潰
      return [];
    }
  },

  // 從候診清單中移除患者
  removePatientFromWaitingList: async (patientId: number) => {
    try {
      console.log(`正在從候診清單中移除患者，ID: ${patientId}`);
      const endpoint = `/patient_registration/waiting-list/${patientId}`;
      return await apiClientWithRetry('delete', endpoint);
    } catch (error) {
      console.error(`從候診清單中移除患者失敗，ID: ${patientId}:`, error);

      // 加強錯誤處理
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
        throw new Error(`從候診清單中移除患者失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      throw error;
    }
  },

  // 更新預約狀態
  updateStatus: async (appointmentId: number, status: string) => {
    try {
      console.log(`正在更新預約狀態：ID=${appointmentId}, 狀態=${status}`);
      return await apiClientWithRetry('patch', `/appointments/${appointmentId}/status`, { status });
    } catch (error) {
      console.error(`更新預約狀態失敗：ID=${appointmentId}`, error);

      // 加強錯誤處理
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
        throw new Error(`更新預約狀態失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      throw error;
    }
  },

  // 創建覆診預約
  createFollowUp: async (appointmentData: any) => {
    try {
      console.log('正在創建覆診預約:', appointmentData);
      return await apiClientWithRetry('post', '/appointments', appointmentData);
    } catch (error) {
      console.error('創建覆診預約失敗:', error);

      // 加強錯誤處理
      if (error.response) {
        console.error(`API響應狀態: ${error.response.status}`);
        console.error(`請求URL: ${error.config?.url}`);
        console.error(`回應數據: `, error.response.data);
        throw new Error(`創建覆診預約失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
      }

      throw error;
    }
  },
};

// 診斷資料API
export const diagnosisDataApi = {
  // 獲取所有現代病名
  getAllModernDiseases: async () => {
    try {
      console.log('正在獲取所有現代病名資料');
      const response = await apiClientWithRetry('get', '/reference-data/modern-diseases');
      return response?.data || [];
    } catch (error) {
      console.error('獲取現代病名資料失敗:', error);
      // 如果API調用失敗，返回空陣列避免UI崩潰
      return [];
    }
  },

  // 獲取現代病名樹狀數據
  getModernDiseaseTree: async () => {
    try {
      console.log('正在獲取現代病名樹狀數據');
      const response = await apiClientWithRetry('get', '/reference-data/modern-disease-tree');
      return response || [];
    } catch (error) {
      console.error('獲取現代病名樹狀數據失敗:', error);
      return [];
    }
  },

  // 獲取所有中醫證候
  getAllCMSyndromes: async () => {
    try {
      console.log('正在獲取所有中醫證候資料');
      const response = await apiClientWithRetry('get', '/reference-data/cm-syndromes');
      return response?.data || [];
    } catch (error) {
      console.error('獲取中醫證候資料失敗:', error);
      // 如果API調用失敗，返回空陣列避免UI崩潰
      return [];
    }
  },

  // 獲取中醫證候樹狀數據
  getCMSyndromeTree: async () => {
    try {
      console.log('正在獲取中醫證候樹狀數據');
      const response = await apiClientWithRetry('get', '/reference-data/cm-syndrome-tree');
      return response || [];
    } catch (error) {
      console.error('獲取中醫證候樹狀數據失敗:', error);
      return [];
    }
  },

  // 獲取所有中醫治則
  getAllTreatmentPrinciples: async () => {
    try {
      console.log('正在獲取所有中醫治則資料');
      const response = await apiClientWithRetry('get', '/reference-data/tcm-principles');
      return response?.data || [];
    } catch (error) {
      console.error('獲取中醫治則資料失敗:', error);
      // 如果API調用失敗，返回空陣列避免UI崩潰
      return [];
    }
  },

  // 獲取中醫治則樹狀數據
  getTreatmentPrincipleTree: async () => {
    try {
      console.log('正在獲取中醫治則樹狀數據');
      const response = await apiClientWithRetry('get', '/reference-data/cm-treatment-rule-tree');
      return response || [];
    } catch (error) {
      console.error('獲取中醫治則樹狀數據失敗:', error);
      return [];
    }
  },

  // 獲取中醫辨證自動完成數據
  getCMSyndromeAutocomplete: async () => {
    try {
      console.log('正在獲取中醫辨證自動完成數據');
      const response = await apiClientWithRetry('get', '/reference-data/cm-syndrome-autocomplete');
      return response || [];
    } catch (error) {
      console.error('獲取中醫辨證自動完成數據失敗:', error);
      return [];
    }
  },

  // 獲取現代病名自動完成數據
  getModernDiseaseAutocomplete: async () => {
    try {
      console.log('正在獲取現代病名自動完成數據');
      const response = await apiClientWithRetry('get', '/reference-data/modern-disease-autocomplete');
      return response || [];
    } catch (error) {
      console.error('獲取現代病名自動完成數據失敗:', error);
      return [];
    }
  },

  // 獲取中醫治則自動完成數據
  getTreatmentPrincipleAutocomplete: async () => {
    try {
      console.log('正在獲取中醫治則自動完成數據');
      const response = await apiClientWithRetry('get', '/reference-data/cm-treatment-rule-autocomplete');
      return response || [];
    } catch (error) {
      console.error('獲取中醫治則自動完成數據失敗:', error);
      return [];
    }
  },

  // 搜尋現代病名
  searchModernDiseases: async (query: string) => {
    try {
      console.log(`正在搜尋現代病名: ${query}`);
      if (!query) {
        return [];
      }
      const response = await apiClientWithRetry('get', `/reference-data/search/modern-diseases?q=${encodeURIComponent(query)}`);
      return response?.data || [];
    } catch (error) {
      console.error(`搜尋現代病名失敗: ${query}`, error);
      return [];
    }
  },

  // 搜尋中醫證候
  searchCMSyndromes: async (query: string) => {
    try {
      console.log(`正在搜尋中醫證候: ${query}`);
      if (!query) {
        return [];
      }
      const response = await apiClientWithRetry('get', `/reference-data/search/cm-syndromes?q=${encodeURIComponent(query)}`);
      return response?.data || [];
    } catch (error) {
      console.error(`搜尋中醫證候失敗: ${query}`, error);
      return [];
    }
  },

  // 搜尋中醫治則
  searchTreatmentRules: async (query: string) => {
    try {
      console.log(`正在搜尋中醫治則: ${query}`);
      if (!query) {
        return [];
      }
      const response = await apiClientWithRetry('get', `/reference-data/search/tcm-principles?q=${encodeURIComponent(query)}`);
      return response?.data || [];
    } catch (error) {
      console.error(`搜尋中醫治則失敗: ${query}`, error);
      return [];
    }
  },

  // 搜尋中藥
  searchMedicines: async (query: string) => {
    try {
      console.log(`正在搜尋中藥: ${query}`);

      // 先從本地已載入的數據搜尋
      if (allHerbs && allHerbs.length > 0) {
        const filteredHerbs = allHerbs.filter(herb =>
          herb.name.toLowerCase().includes(query.toLowerCase()) ||
          (herb.aliases?.some(alias => alias.toLowerCase().includes(query.toLowerCase())))
        );

        console.log(`從已載入的中藥資料中找到 ${filteredHerbs.length} 筆結果`);
        return filteredHerbs;
      }

      // 嘗試從本地檔案載入並搜尋
      try {
        const response = await fetch('/data/powder_ratio_price.json');
        if (response.ok) {
          const herbs = await response.json();

          const filteredHerbs = herbs.filter((herb: any) =>
            herb.name.toLowerCase().includes(query.toLowerCase()) ||
            (herb.aliases?.some((alias: string) =>
              alias.toLowerCase().includes(query.toLowerCase())
            ))
          );
          console.log(`從本地檔案搜尋中藥結果: ${filteredHerbs.length} 筆`);
          return filteredHerbs;
        }
      } catch (localError) {
        console.error('讀取或搜尋本地中藥數據失敗:', localError);
      }

      // 如果本地搜尋失敗，則調用API
      const endpoint = `/herbs?search=${encodeURIComponent(query)}&limit=50`;
      console.log(`使用中藥搜尋端點: ${endpoint}`);

      const response = await apiClientWithRetry('get', endpoint);
      if (response?.items && Array.isArray(response.items)) {
        console.log(`API返回中藥搜尋結果: ${response.items.length} 筆`);
        return response.items || [];
      } else if (Array.isArray(response)) {
        console.log(`API返回中藥搜尋結果: ${response.length} 筆`);
        return response;
      } else {
        console.warn('API返回的中藥搜尋結果格式不正確:', response);
        return [];
      }
    } catch (error) {
      console.error(`搜尋中藥失敗: ${query}`, error);
      return [];
    }
  },

  // 獲取中藥粉末與飲片換算資料
  getPowderRatioPrice: async () => {
    try {
      // 先嘗試從本地檔案獲取
      try {
        console.log('嘗試從本地檔案獲取中藥資料');
        const response = await fetch('/data/powder_ratio_price.json');
        if (response.ok) {
          const data = await response.json();
          console.log('成功從本地檔案獲取中藥資料，共', data.length, '筆');
          if (data && data.length > 0) {
            allHerbs = data;
          }
          return data;
        } else {
          console.error('本地檔案獲取失敗:', response.statusText);
        }
      } catch (localError) {
        console.error('讀取本地中藥數據失敗:', localError);
      }

      // 如果本地獲取失敗，再嘗試API
      console.log('正在從API獲取中藥粉末與飲片換算資料');
      const response = await apiClientWithRetry('get', '/herbs/powder-ratio-price');
      console.log('成功從API獲取中藥資料，共', response.length, '筆');
      if (response && response.length > 0) {
        allHerbs = response;
      }
      return response || [];
    } catch (error) {
      console.error('從API獲取中藥粉末與飲片換算資料失敗:', error);
      // 如果之前沒有嘗試本地檔案，再次嘗試
      try {
        console.log('再次嘗試從本地檔案獲取中藥資料');
        const response = await fetch('/data/powder_ratio_price.json');
        if (response.ok) {
          const data = await response.json();
          console.log('成功從本地檔案獲取中藥資料，共', data.length, '筆');
          if (data && data.length > 0) {
            allHerbs = data;
          }
          return data;
        }
      } catch (localError) {
        console.error('讀取本地中藥數據失敗:', localError);
      }
      return [];
    }
  }
};

// 統一導出
export default {
  referenceData: referenceDataApi,
  medicalRecord: medicalRecordApi,
  patient: patientApi,
  appointment: appointmentApi,
  diagnosisData: diagnosisDataApi
}; 