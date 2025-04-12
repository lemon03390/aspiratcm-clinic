import axios, { AxiosError } from 'axios';

/**
 * 提供API客戶端相關工具函數
 */

/**
 * 獲取完整的後端API URL
 * @param {string} path - API路徑，例如 '/patient/1'
 * @returns {string} 完整的API URL
 */
export const getBackendUrl = (path: string = ''): string => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
  
  // 確保路徑以/開頭，避免重複斜線
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 日誌記錄最終使用的URL（僅開發環境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`API 完整路徑: ${apiBaseUrl}${normalizedPath}`);
  }
  
  return `${apiBaseUrl}${normalizedPath}`;
};

/**
 * 錯誤處理工具類，提供統一的錯誤處理邏輯
 */
export class ErrorHandler {
  static handleApiError(error: AxiosError, context: string = '') {
    console.error(`[API錯誤] 操作: ${context || '未指定操作'}`, error);

    if (error.response) {
      const statusCode = error.response.status;
      console.error(`[${statusCode}錯誤] URL: ${error.config?.url}`);

      if (statusCode === 422) {
        return ErrorHandler.handleValidationError(error, context);
      }
      if (statusCode === 401) {
        return {
          message: '認證已過期或無效，請重新登入',
          detail: '需要有效的認證才能繼續操作',
          statusCode: 401,
          isServerError: false
        };
      }
      if (statusCode === 404) {
        return {
          message: '請求的資源不存在',
          detail: `找不到指定的${context}資源`,
          statusCode: 404,
          isServerError: false
        };
      }
      if (statusCode >= 500) {
        return {
          message: '伺服器處理請求時出錯',
          detail: (error.response.data as any)?.detail || '服務暫時不可用，請稍後再試',
          statusCode,
          isServerError: true,
          rawError: error.response.data
        };
      }

      return {
        message: '請求處理失敗',
        detail: (error.response.data as any)?.detail || error.message,
        statusCode,
        isServerError: statusCode >= 500,
        rawError: error.response.data
      };
    }

    if (error.request) {
      console.error('[網絡錯誤] 未收到服務器回應:', error.request);
      return {
        message: '連接伺服器失敗',
        detail: '無法連接到伺服器，請檢查網絡連接並稍後再試',
        isNetworkError: true,
        isServerError: false
      };
    }

    console.error('[請求錯誤]', error.message);
    return {
      message: '無法完成請求',
      detail: error.message,
      isServerError: false
    };
  }

  static handleValidationError(error: AxiosError, context: string = '') {
    console.error('[驗證錯誤] 數據驗證失敗:', error.response?.data);
    const validationErrors = (error.response?.data as any)?.detail || [];
    const fieldErrors: Record<string, string> = {};

    if (Array.isArray(validationErrors)) {
      validationErrors.forEach((err: any) => {
        if (err.loc && Array.isArray(err.loc) && err.loc.length > 1) {
          const fieldPath = err.loc.slice(1).join('.');
          fieldErrors[fieldPath] = err.msg;
        }
      });
    }

    const detailMessage = Object.keys(fieldErrors).length > 0
      ? `有 ${Object.keys(fieldErrors).length} 個欄位驗證失敗`
      : '資料格式不符合要求';

    return {
      message: '提交的資料有誤，請檢查並修正',
      detail: detailMessage,
      fieldErrors,
      statusCode: 422,
      isServerError: false,
      rawError: validationErrors
    };
  }

  static formatErrorForDisplay(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
      return Object.entries(error.fieldErrors)
        .map(([field, msg]) => `${this.formatFieldName(field)}: ${msg}`)
        .join('\n');
    }

    return error.detail || error.message || '發生未知錯誤';
  }

  private static formatFieldName(fieldName: string): string {
    const fieldNameMap: Record<string, string> = {
      'patient_name': '患者姓名',
      'phone_number': '聯絡電話',
      'appointment_time': '預約時間',
      'doctor_name': '醫師姓名',
      'consultation_type': '診療類型',
      'status': '狀態',
      'is_first_time': '首次求診標記',
      'is_troublesome': '麻煩症標記',
      'is_contagious': '傳染病標記'
    };

    return fieldNameMap[fieldName] || fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// 創建 API 客戶端
const apiClient = axios.create({
  baseURL: getBackendUrl(), // 統一使用部署相對路徑
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// 攔截器
apiClient.interceptors.request.use((config) => {
  console.log(`[API請求] ${config.method?.toUpperCase()} ${config.url}`);
  if (config.params) {
    console.log(`[請求參數] ${JSON.stringify(config.params)}`);
  }
  if (config.data && typeof config.data !== 'string') {
    try {
      console.log(`[請求數據] ${JSON.stringify(config.data)}`);
    } catch {
      console.log('[請求數據] 無法序列化');
    }
  }
  return config;
}, (error) => {
  console.error('[API請求錯誤]', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
  console.log(`[API響應] ${response.status} ${response.config.url}`);
  return response;
}, (error) => {
  const status = error?.response?.status;
  const url = error?.config?.url;
  const method = error?.config?.method?.toUpperCase();
  if (status) {
    console.error(`[${method} ${url}] 錯誤 ${status}`, error.response.data);
  } else {
    console.error('[API錯誤]', error.message);
  }
  return Promise.reject(error);
});

// ✅ API 封裝
export const api = {
  appointments: {
    getAll: () => apiClient.get('/appointments'),
    getByPhone: (phone: string) =>
      apiClient.get('/appointments/by-phone', { params: { phone_number: phone } }),
    getById: (id: number) => apiClient.get(`/appointments/${id}`),
    create: (data: any) => apiClient.post('/appointments', data),
    update: (id: number, data: any) => apiClient.put(`/appointments/${id}`, data),
    delete: (id: number) => apiClient.delete(`/appointments/${id}`),
  },
  doctors: {
    getAll: () => apiClient.get('/doctors'),
    getById: (id: number) => apiClient.get(`/doctors/${id}`),
    create: (data: any) => apiClient.post('/doctors', data),
    update: (id: number, data: any) => apiClient.put(`/doctors/${id}`, data),
    delete: (id: number) => apiClient.delete(`/doctors/${id}`),
  }
};

export default apiClient;
