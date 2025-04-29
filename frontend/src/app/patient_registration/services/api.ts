import axios from 'axios';
import { getBackendUrl } from '../../../libs/apiClient';
import {
  CheckPatientResponse,
  Patient,
  PatientCreateRequest,
  PatientUpdateRequest,
  ReferenceData
} from '../types';

// 確保 URL 使用 HTTPS
function ensureHttps(url: string): string {
  // 如果是相對路徑，直接返回
  if (url.startsWith('/')) {
    return url;
  }
  // 如果是 HTTP URL，替換為 HTTPS
  if (url.startsWith('http:')) {
    console.log('⚠️ 將 HTTP URL 替換為 HTTPS:', url);
    return url.replace('http:', 'https:');
  }
  return url;
}

// 獲取參考資料（疾病列表，過敏列表等）
export async function getReferenceData(): Promise<ReferenceData> {
  // 備用數據結構 - 僅在完全無法獲取數據時使用
  const fallbackData: ReferenceData = {
    basic_diseases: ['我沒有任何基礎病', '高血壓', '糖尿病', '心臟病', '其他，請列明'],
    drug_allergies: ['我沒有任何藥物過敏', '青黴素', '非類固醇消炎藥', '其他藥物，請列明'],
    food_allergies: ['我沒有任何食物過敏', '海鮮', '堅果', '其他食物，請列明'],
    data_sources: ['朋友介紹', '網絡', 'Instagram', 'Facebook'],
    regions: { '香港': { '中西區': ['中環', '上環'] } },
    doctors: [] // 不包含硬編碼醫師，完全依賴 API
  };

  // 定義重試函數
  const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retries <= 1) {
        throw error;
      }

      console.log(`重試請求 (${4 - retries}/3): ${url}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
  };

  try {
    // 使用動態生成的 URL
    const url = ensureHttps(getBackendUrl('/patient_registration/reference-data/'));
    console.log('🔒 請求參考資料:', url);

    // 嘗試獲取完整參考數據，使用重試機制
    const response = await fetchWithRetry(url);
    const data = await response.json();
    console.log('📊 成功獲取參考資料，資料結構:', Object.keys(data));

    // 如果獲取參考數據中沒有醫師資料，嘗試從專用醫師 API 獲取
    if (!data.doctors || !Array.isArray(data.doctors) || data.doctors.length === 0) {
      console.warn('⚠️ 參考資料中沒有醫師資料，嘗試從醫師 API 獲取');

      try {
        const doctorsUrl = ensureHttps(getBackendUrl('/doctors/'));
        const doctorsResponse = await fetchWithRetry(doctorsUrl);
        const doctorsData = await doctorsResponse.json();

        console.log('✅ 成功從專用 API 獲取醫師資料:', doctorsData);

        if (Array.isArray(doctorsData) && doctorsData.length > 0) {
          data.doctors = doctorsData;
        } else {
          console.warn('⚠️ 醫師 API 返回空數據或格式錯誤');
        }
      } catch (doctorError) {
        console.error('❌ 無法從專用 API 獲取醫師資料:', doctorError);
        // 不強制添加醫師數據，讓用戶界面顯示提示
      }
    } else {
      console.log('✅ 參考資料中已包含醫師資料，數量:', data.doctors.length);
    }

    // 確保必要的字段存在，使用備用數據填充缺失字段
    for (const field of ['basic_diseases', 'drug_allergies', 'food_allergies', 'data_sources']) {
      if (!data[field] || !Array.isArray(data[field]) || data[field].length === 0) {
        console.warn(`⚠️ 參考資料中缺少 ${field}，使用備用數據`);
        data[field] = fallbackData[field];
      }
    }

    if (!data.regions || Object.keys(data.regions).length === 0) {
      console.warn('⚠️ 參考資料中缺少 regions，使用備用數據');
      data.regions = fallbackData.regions;
    }

    return data as ReferenceData;
  } catch (error) {
    console.error('❌ 獲取參考資料失敗:', error);

    // 嘗試最後一次從醫師 API 獲取醫師資料
    try {
      const doctorsUrl = ensureHttps(getBackendUrl('/doctors/'));
      console.log('🔄 嘗試從醫師 API 獲取醫師資料（最後嘗試）:', doctorsUrl);

      const doctorsResponse = await fetchWithRetry(doctorsUrl, 2);
      const doctorsData = await doctorsResponse.json();

      if (Array.isArray(doctorsData) && doctorsData.length > 0) {
        console.log('✅ 成功獲取醫師資料:', doctorsData);
        fallbackData.doctors = doctorsData;
      }
    } catch (finalError) {
      console.error('❌ 最終嘗試獲取醫師資料失敗');
    }

    // 返回後備資料
    console.log('🔄 使用後備參考資料:', fallbackData);
    return fallbackData;
  }
}

// 檢查患者是否存在
export async function checkPatient(
  params: { chinese_name?: string; id_number?: string; phone_number?: string }
): Promise<CheckPatientResponse> {
  try {
    const url = ensureHttps(getBackendUrl('/patient_registration/check-patient/'));
    const response = await axios.get<CheckPatientResponse>(url, { params });
    return response.data;
  } catch (error) {
    console.error('檢查患者失敗:', error);
    throw error;
  }
}

// 檢查身份證號碼是否已註冊
export async function checkIdNumber(idNumber: string): Promise<CheckPatientResponse> {
  try {
    // 格式化身份證號碼，移除特殊字符
    const formattedId = idNumber.replace(/[\(\)]/g, '').trim();
    console.log('🔍 格式化後的身份證號碼:', formattedId);

    const url = ensureHttps(getBackendUrl('/patient_registration/check-id-number/'));
    const response = await axios.get<CheckPatientResponse>(url, {
      params: { id_number: formattedId }
    });

    return response.data;
  } catch (error: any) {
    console.error('檢查身份證號碼失敗:', error);

    // 處理特定錯誤情況
    if (error.response) {
      // 若服務器返回404，表示未找到患者
      if (error.response.status === 404) {
        return { exists: false, patient: null };
      }

      // 若返回500，可能是後端錯誤，返回特定消息
      if (error.response.status === 500) {
        console.error('後端處理身份證號碼時出錯:', error.response.data);
        throw new Error('系統處理身份證號碼時出錯，請稍後再試或聯絡客服');
      }
    }

    throw error;
  }
}

// 創建新患者
export async function createPatient(patientData: PatientCreateRequest): Promise<Patient> {
  try {
    // 最終檢查所有欄位，特別是 email
    const processedData = { ...patientData };

    // 處理 email
    if (!processedData.email ||
      processedData.email === "" ||
      processedData.email === "undefined" ||
      (typeof processedData.email === "string" && processedData.email.trim() === "")) {
      console.log("API 調用前檢查: email 欄位為空，設置為 no@no.com");
      processedData.email = "no@no.com";
    }

    console.log("API 最終請求數據:", JSON.stringify(processedData));

    // 先嘗試直接檢查患者是否存在 - 不論是初診還是覆診，都先檢查身份證和電話
    try {
      // 方法1: 檢查身份證號碼
      if (processedData.id_number) {
        console.log(`首先嘗試通過身份證號碼檢查患者是否存在: ${processedData.id_number}`);
        const checkResponse = await checkIdNumber(processedData.id_number);

        if (checkResponse.exists && checkResponse.patient) {
          console.log('發現患者已存在，自動處理為覆診流程');
          const patientId = checkResponse.patient.id;

          // 使用updatePatient函數更新現有患者資料
          const updateData: PatientUpdateRequest = {
            // 注意：只更新允許在覆診時修改的欄位
            doctor_id: processedData.doctor_id,
            note: processedData.note,
            // 更新健康資訊
            basic_diseases: processedData.basic_diseases,
            drug_allergies: processedData.drug_allergies,
            food_allergies: processedData.food_allergies,
            // 添加主訴
            chief_complaint: processedData.chief_complaint,
          };

          const updatedPatient = await updatePatient(patientId, updateData);
          console.log('✅ 患者覆診資料更新成功:', updatedPatient);
          return updatedPatient;
        }
      }

      // 方法2: 檢查電話號碼
      if (processedData.phone_number) {
        console.log(`嘗試通過電話號碼檢查患者是否存在: ${processedData.phone_number}`);
        try {
          const patient = await getPatientByPhoneNumber(processedData.phone_number);
          if (patient) {
            console.log('通過電話號碼找到現有患者，自動處理為覆診流程');
            const patientId = patient.id;

            // 使用updatePatient函數更新現有患者資料
            const updateData: PatientUpdateRequest = {
              doctor_id: processedData.doctor_id,
              note: processedData.note,
              basic_diseases: processedData.basic_diseases,
              drug_allergies: processedData.drug_allergies,
              food_allergies: processedData.food_allergies,
              chief_complaint: processedData.chief_complaint,
            };

            const updatedPatient = await updatePatient(patientId, updateData);
            console.log('✅ 通過電話號碼找到患者並更新成功:', updatedPatient);
            return updatedPatient;
          }
        } catch (phoneError) {
          console.log('使用電話號碼查詢患者失敗，繼續嘗試其他方法:', phoneError);
        }
      }
    } catch (preCheckError) {
      // 直接檢查失敗，記錄錯誤並繼續嘗試提交流程
      console.log('預先檢查患者是否存在時出錯，繼續嘗試提交流程:', preCheckError);
    }

    // 如果患者不存在或前期檢查失敗，則嘗試創建新患者或處理衝突
    const url = ensureHttps(getBackendUrl('/patient_registration/'));
    console.log('🔷 提交患者數據到:', url);

    try {
      const response = await axios.post<Patient>(url, processedData);
      console.log('✅ 患者創建成功:', response.data);
      return response.data;
    } catch (postError: any) {
      console.error('❌ POST 請求失敗，檢查錯誤類型:', postError);

      // 處理 409 衝突錯誤（患者已存在） - 增強處理邏輯
      if (postError.response && postError.response.status === 409) {
        console.log('處理409衝突: 患者已存在，嘗試獲取患者信息並自動處理為覆診流程');

        try {
          // 嘗試通過多種方式獲取患者信息
          let patient = null;
          let patientId = null;

          // 方法1: 從錯誤響應中提取患者ID
          if (postError.response.data && postError.response.data.patient_id) {
            patientId = postError.response.data.patient_id;
            console.log(`從409響應中獲取患者ID: ${patientId}`);
            try {
              patient = await getPatientById(patientId);
            } catch (idError) {
              console.log(`通過ID ${patientId} 獲取患者失敗:`, idError);
            }
          }

          // 方法2: 從錯誤響應中提取詳細數據
          if (!patient && postError.response.data && postError.response.data.detail) {
            const detailText = postError.response.data.detail;
            console.log('分析錯誤詳情尋找患者ID:', detailText);

            // 嘗試從detail文本中提取患者ID
            const idMatch = /patient_id: (\d+)/.exec(detailText) || /patient id: (\d+)/.exec(detailText) || /id: (\d+)/.exec(detailText);
            if (idMatch && idMatch[1]) {
              patientId = parseInt(idMatch[1]);
              console.log(`從錯誤詳情中提取到患者ID: ${patientId}`);
              try {
                patient = await getPatientById(patientId);
              } catch (idError) {
                console.log(`通過提取的ID ${patientId} 獲取患者失敗:`, idError);
              }
            }
          }

          // 方法3: 使用身份證檢查
          if (!patient && processedData.id_number) {
            console.log(`使用身份證再次檢查獲取患者: ${processedData.id_number}`);
            try {
              const checkResponse = await checkIdNumber(processedData.id_number);
              if (checkResponse.exists && checkResponse.patient) {
                patient = checkResponse.patient;
                patientId = patient.id;
              }
            } catch (idError) {
              console.log('使用身份證查詢失敗:', idError);
            }
          }

          // 方法4: 使用電話號碼查詢
          if (!patient && processedData.phone_number) {
            console.log(`使用電話號碼再次嘗試獲取患者: ${processedData.phone_number}`);
            try {
              patient = await getPatientByPhoneNumber(processedData.phone_number);
              if (patient) {
                patientId = patient.id;
              }
            } catch (phoneError) {
              console.log('使用電話號碼查詢失敗:', phoneError);
            }
          }

          // 如果找到患者，更新資料
          if (patient && patientId) {
            console.log('成功找到現有患者記錄:', patient);

            // 準備更新數據 - 只更新允許的欄位
            const updateData: PatientUpdateRequest = {
              // 不更新個人基本資料
              doctor_id: processedData.doctor_id,
              note: processedData.note,
              // 添加主訴
              chief_complaint: processedData.chief_complaint,
              // 更新健康資訊
              basic_diseases: processedData.basic_diseases,
              drug_allergies: processedData.drug_allergies,
              food_allergies: processedData.food_allergies,
            };

            // 嘗試使用多個 API 路徑
            try {
              console.log(`嘗試使用主要 API 路徑更新患者 ID ${patientId}`);
              // 使用 patient_registration API 端點更新患者資料
              const updatedPatient = await updatePatient(patientId, updateData);
              console.log('✅ 成功處理409衝突並更新患者覆診資料:', updatedPatient);
              return updatedPatient;
            } catch (updateError) {
              console.error('使用主要 API 路徑更新患者失敗，嘗試備用方法:', updateError);

              // 備用方法: 嘗試覆診專用端點
              try {
                const revisitUrl = ensureHttps(getBackendUrl('/patients/revisit'));
                console.log('嘗試使用覆診專用端點:', revisitUrl);

                // 將完整數據發送到覆診端點
                const fullRevisitData = {
                  ...processedData,
                  patient_id: patientId
                };

                const revisitResponse = await axios.post<Patient>(revisitUrl, fullRevisitData);
                console.log('✅ 使用覆診專用端點成功:', revisitResponse.data);
                return revisitResponse.data;
              } catch (revisitError) {
                console.error('覆診專用端點也失敗:', revisitError);
                throw new Error('此患者已存在，但系統無法自動完成掛號。請先切換到覆診模式，然後搜尋此患者資料再提交。');
              }
            }
          } else {
            console.warn('409錯誤處理: 仍然無法找到相關患者信息，嘗試最後的應急方法');

            // 最後嘗試: 使用另一個端點進行覆診更新
            try {
              const fallbackUrl = ensureHttps(getBackendUrl('/patients/revisit'));
              console.log('嘗試使用覆診專用端點:', fallbackUrl);
              const fallbackResponse = await axios.post<Patient>(fallbackUrl, processedData);
              console.log('✅ 使用覆診專用端點成功:', fallbackResponse.data);
              return fallbackResponse.data;
            } catch (fallbackError) {
              console.error('覆診專用端點也失敗:', fallbackError);
              // 繼續拋出友善的錯誤信息而非原始錯誤
              throw new Error('此患者已存在，但系統無法自動完成掛號。請先切換到覆診模式，然後搜尋此患者資料再提交。');
            }
          }
        } catch (recoveryError) {
          console.error('恢復409衝突時出錯:', recoveryError);
          // 提供更友好的錯誤信息
          throw new Error('此患者已在系統中，但系統無法自動處理為覆診流程。請切換到覆診模式，搜尋患者後再提交。');
        }
      }

      // 非409錯誤，繼續處理其他類型錯誤
      throw postError;
    }
  } catch (error: any) {
    console.error('❌ 創建患者失敗，處理各種錯誤情況:', error);

    // 處理 404 錯誤 - 患者不存在
    if (error.response && error.response.status === 404) {
      // 患者可能不存在，轉為創建流程
      console.log('患者不存在，嘗試創建新患者');
      try {
        // 嘗試使用另一個 endpoint 來創建
        const altUrl = ensureHttps(getBackendUrl('/patients/'));
        console.log('🔷 使用替代 API 端點嘗試創建患者:', altUrl);
        const response = await axios.post<Patient>(altUrl, patientData);
        console.log('✅ 使用替代端點成功創建患者:', response.data);
        return response.data;
      } catch (altError) {
        console.error('使用替代端點創建患者失敗:', altError);
        // 使用更友善的錯誤信息
        throw new Error('無法創建患者記錄，請稍後再試或聯絡櫃檯人員協助。');
      }
    }

    // 處理 422 驗證錯誤
    if (error.response && error.response.status === 422) {
      const validationErrors = error.response.data?.detail || [];
      let errorDetails: Record<string, string> = {};
      let errorMessage = '資料驗證失敗';

      // 解析 Pydantic 驗證錯誤格式
      if (Array.isArray(validationErrors)) {
        validationErrors.forEach((err: any) => {
          if (err.loc && Array.isArray(err.loc) && err.loc.length > 1) {
            const fieldName = err.loc.slice(1).join('.');
            errorDetails[fieldName] = err.msg;
            console.error(`欄位 "${fieldName}" 驗證失敗:`, err.msg);
          }
        });

        if (Object.keys(errorDetails).length > 0) {
          errorMessage = `資料驗證失敗: ${Object.keys(errorDetails).map(k =>
            `${k} (${errorDetails[k]})`).join(', ')}`;
        }
      } else if (typeof error.response.data === 'object') {
        // 其他格式的驗證錯誤
        errorMessage = error.response.data.detail || '資料驗證失敗，請檢查輸入';
        errorDetails = error.response.data;
      }

      // 創建具有更多信息的自定義錯誤
      const enhancedError: any = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.validationErrors = errorDetails;
      enhancedError.isValidationError = true;
      enhancedError.status = 422;
      throw enhancedError;
    }

    // 處理其他類型的錯誤
    if (error.response) {
      console.error(`服務器回應 ${error.response.status} 錯誤:`, error.response.data);
      // 提供更友善的錯誤信息
      let errorMessage = '系統處理請求時發生錯誤，請稍後再試';

      // 根據不同錯誤狀態提供不同的友好信息
      if (error.response.status === 401 || error.response.status === 403) {
        errorMessage = '您沒有權限執行此操作，請聯絡系統管理員';
      } else if (error.response.status >= 500) {
        errorMessage = '系統內部錯誤，請稍後再試或聯絡技術支援';
      }

      const enhancedError: any = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.status = error.response.status;
      throw enhancedError;
    }

    // 網絡或其他錯誤
    const networkError: any = new Error('連接伺服器失敗，請檢查網絡連接');
    networkError.isNetworkError = true;
    throw networkError;
  }
}

// 獲取所有患者
export async function getPatients(params?: { skip?: number; limit?: number }): Promise<Patient[]> {
  try {
    const url = ensureHttps(getBackendUrl('/patient_registration/'));
    const response = await axios.get<Patient[]>(url, { params });
    return response.data;
  } catch (error) {
    console.error('獲取患者列表失敗:', error);
    throw error;
  }
}

// 通過ID獲取患者
export async function getPatientById(id: number): Promise<Patient> {
  try {
    const url = ensureHttps(getBackendUrl(`/patient_registration/${id}`));
    const response = await axios.get<Patient>(url);
    return response.data;
  } catch (error) {
    console.error(`獲取患者 ID ${id} 失敗:`, error);

    // 提供更詳細的錯誤信息
    if (error.response) {
      console.error(`API響應狀態: ${error.response.status}`);
      console.error(`請求URL: ${error.config?.url}`);
      console.error(`回應數據: `, error.response.data);
      throw new Error(`獲取患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
    }

    throw error;
  }
}

// 通過掛號編號獲取患者
export async function getPatientByRegistrationNumber(registrationNumber: string): Promise<Patient> {
  try {
    const url = ensureHttps(getBackendUrl(`/patients/by-registration-number/${registrationNumber}`));
    const response = await axios.get<Patient>(url);
    return response.data;
  } catch (error) {
    console.error(`通過掛號編號 ${registrationNumber} 獲取患者失敗:`, error);

    // 提供更詳細的錯誤信息
    if (error.response) {
      console.error(`API響應狀態: ${error.response.status}`);
      console.error(`請求URL: ${error.config?.url}`);
      console.error(`回應數據: `, error.response.data);
      throw new Error(`獲取患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
    }

    throw error;
  }
}

// 通過電話號碼獲取患者
export async function getPatientByPhoneNumber(phoneNumber: string): Promise<Patient> {
  try {
    // 格式化電話號碼，移除空格和特殊字符
    const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('🔍 格式化後的電話號碼:', formattedPhone);

    // 嘗試使用新 API 路徑格式
    try {
      const url = ensureHttps(getBackendUrl(`/patients/by-phone-number?phone=${formattedPhone}`));
      console.log('嘗試使用查詢參數格式 API 端點:', url);
      const response = await axios.get<Patient>(url, { timeout: 5000 });
      return response.data;
    } catch (primaryError) {
      console.warn('使用新 API 路徑失敗，嘗試舊路徑格式:', primaryError.message);

      // 嘗試使用舊 API 路徑格式作為後備
      const backupUrl = ensureHttps(getBackendUrl(`/patient_registration/by-phone-number/${formattedPhone}/`));
      console.log('嘗試使用原始路徑參數格式 API 端點（即將淘汰）:', backupUrl);
      const backupResponse = await axios.get<Patient>(backupUrl);
      return backupResponse.data;
    }
  } catch (error: any) {
    console.error(`通過電話號碼 ${phoneNumber} 獲取患者失敗:`, error);

    // 增強錯誤信息
    if (error.response) {
      console.error(`API響應狀態: ${error.response.status}`);
      console.error(`請求URL: ${error.config?.url}`);
      console.error(`回應數據: `, error.response.data);

      if (error.response.status === 404) {
        throw new Error(`未找到電話號碼為 ${phoneNumber} 的患者記錄`);
      }

      if (error.response.status === 500) {
        console.error('後端處理電話號碼時出錯:', error.response.data);
        throw new Error('系統處理電話號碼時出錯 (500): 可能是程式邏輯錯誤，請通知技術人員');
      }

      if (error.response.data && error.response.data.detail) {
        throw new Error(error.response.data.detail);
      }
    }

    throw new Error('無法查詢電話號碼，請確認格式正確或稍後再試');
  }
}

// 更新患者資料
export async function updatePatient(id: number, updateData: PatientUpdateRequest): Promise<Patient> {
  try {
    const url = ensureHttps(getBackendUrl(`/patient_registration/${id}`));
    console.log(`嘗試更新患者 ID ${id}，URL: ${url}`);
    const response = await axios.patch<Patient>(url, updateData);
    return response.data;
  } catch (error) {
    console.error(`更新患者 ID ${id} 失敗:`, error);

    // 提供更詳細的錯誤信息
    if (error.response) {
      console.error(`API響應狀態: ${error.response.status}`);
      console.error(`請求URL: ${error.config?.url}`);
      console.error(`回應數據: `, error.response.data);

      // 如果是 404 錯誤，嘗試使用備用端點
      if (error.response.status === 404) {
        console.log(`主要患者更新端點返回 404，嘗試備用端點...`);
        try {
          // 嘗試使用備用 API 路徑
          const fallbackUrl = ensureHttps(getBackendUrl(`/patients/update/${id}`));
          console.log(`嘗試使用備用 API 路徑更新患者 ID ${id}，URL: ${fallbackUrl}`);
          const response = await axios.patch<Patient>(fallbackUrl, updateData);
          return response.data;
        } catch (fallbackError) {
          console.error(`備用患者更新端點也失敗:`, fallbackError);
          throw new Error(`更新患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
        }
      }

      throw new Error(`更新患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
    }

    throw error;
  }
}

// 刪除患者
export async function deletePatient(id: number): Promise<void> {
  try {
    // 先嘗試使用 patient_registration 端點
    const url = ensureHttps(getBackendUrl(`/patient_registration/${id}`));
    console.log(`嘗試刪除患者 ID ${id}，URL: ${url}`);
    await axios.delete(url);
  } catch (error) {
    console.error(`刪除患者 ID ${id} 失敗:`, error);

    // 提供更詳細的錯誤信息
    if (error.response) {
      console.error(`API響應狀態: ${error.response.status}`);
      console.error(`請求URL: ${error.config?.url}`);
      console.error(`回應數據: `, error.response.data);

      // 如果是 404 錯誤，嘗試使用備用端點
      if (error.response.status === 404) {
        try {
          // 嘗試使用備用 API 路徑
          const fallbackUrl = ensureHttps(getBackendUrl(`/patients/${id}`));
          console.log(`嘗試使用備用 API 路徑刪除患者，URL: ${fallbackUrl}`);
          await axios.delete(fallbackUrl);
          return;
        } catch (fallbackError) {
          console.error(`備用患者刪除端點也失敗:`, fallbackError);
        }
      }

      throw new Error(`刪除患者資料失敗(${error.response.status}): 可能是程式邏輯錯誤，請通知技術人員`);
    }

    throw error;
  }
}
