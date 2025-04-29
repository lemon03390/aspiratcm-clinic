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

      // 如果錯誤是客戶端錯誤（4xx），直接拋出錯誤
      if (
        err.response?.status &&
        err.response.status >= 400 &&
        err.response.status < 500
      ) {
        throw err;
      }

      retryCount++;
      console.log(`API請求失敗，正在重試 (${retryCount}/${retries})...`, err);

      // 等待一段時間再重試
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, retryCount - 1)));
    }
  }

  // 重試用盡後，拋出最後一個錯誤
  throw lastError;
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
      }

      // 轉換處方藥材為後端所需格式
      if (cleanedData.prescription && Array.isArray(cleanedData.prescription)) {
        transformedData.prescription = {
          instructions: cleanStringField(cleanedData.prescription_instructions || ""),
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
      if (transformedData.prescription && !transformedData.prescription.herbs) {
        transformedData.prescription = {
          instructions: "",
          herbs: transformedData.prescription
        };
      }

      // 移除不需要的欄位
      delete transformedData.prescription_instructions;

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
  // 獲取患者詳情（通過掛號編號）
  getPatientByRegistrationNumber: async (registrationNumber: string) => {
    try {
      console.log('正在獲取患者資料，掛號編號:', registrationNumber);
      return await apiClientWithRetry('get', `/patient_registration/by-registration-number/${registrationNumber}/`);
    } catch (error) {
      console.error(`獲取患者資料失敗，掛號編號: ${registrationNumber}:`, error);
      throw error;
    }
  },

  // 獲取患者詳情（通過ID）
  getPatientById: async (patientId: number) => {
    try {
      console.log('正在獲取患者資料，患者ID:', patientId);
      return await apiClientWithRetry('get', `/patient_registration/${patientId}/`);
    } catch (error) {
      console.error(`獲取患者資料失敗，患者ID: ${patientId}:`, error);
      throw error;
    }
  },

  // 獲取患者詳情（通過電話號碼）
  getPatientByPhoneNumber: async (phoneNumber: string) => {
    try {
      console.log('正在獲取患者資料，電話號碼:', phoneNumber);
      // 格式化電話號碼，移除空格和特殊字符
      const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      return await apiClientWithRetry('get', `/patient_registration/by-phone-number/${formattedPhone}/`);
    } catch (error) {
      console.error(`獲取患者資料失敗，電話號碼: ${phoneNumber}:`, error);
      throw error;
    }
  },

  // 更新患者資料
  updatePatient: async (patientId: number, updateData: any) => {
    try {
      console.log(`正在更新患者資料，患者ID: ${patientId}:`, updateData);
      return await apiClientWithRetry('patch', `/patient_registration/${patientId}`, updateData);
    } catch (error) {
      console.error(`更新患者資料失敗，患者ID: ${patientId}:`, error);
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
      const response = await fetch(`${getBackendUrl(`/patient_registration/${patientId}`)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(markers),
      });

      if (!response.ok) {
        throw new Error(`更新患者標記失敗: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('更新患者標記時出錯:', error);
      throw error;
    }
  },
};

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