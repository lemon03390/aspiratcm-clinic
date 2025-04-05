import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * 從環境變數獲取後端API基本URL
 * 處理尾部斜線問題，確保返回的URL不包含尾部斜線
 */
export function getBackendUrl(path: string = ""): string {
  // 從環境變數讀取API基本URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  
  if (!apiBaseUrl) {
    console.warn("警告: NEXT_PUBLIC_API_BASE_URL 未設置");
    const fallbackUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8000/api/v1' 
      : '/api/v1';
    console.log(`使用備用基礎URL: ${fallbackUrl}`);
    return path ? `${fallbackUrl}${path.startsWith('/') ? path : `/${path}`}` : fallbackUrl;
  }
  
  // 處理尾部斜線，確保 URL 格式正確
  const baseWithoutTrailingSlash = apiBaseUrl.endsWith('/')
    ? apiBaseUrl.slice(0, -1)
    : apiBaseUrl;
  
  // 處理路徑的前導斜線，確保正確連接
  const pathWithLeadingSlash = path 
    ? (path.startsWith('/') ? path : `/${path}`)
    : "";
  
  const finalUrl = `${baseWithoutTrailingSlash}${pathWithLeadingSlash}`;
  console.log("🔍 組合後的 API URL：", finalUrl);
  
  // 檢查 URL 格式
  try {
    new URL(finalUrl);
  } catch (error) {
    console.error("🚨 生成的 URL 格式無效:", finalUrl);
    console.error("錯誤詳情:", error);
    console.error("環境設置:", {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
    });
    // 返回一個可能有效的備用 URL
    if (process.env.NODE_ENV === 'development') {
      const backupUrl = `http://localhost:8000/api/v1${pathWithLeadingSlash}`;
      console.log("使用備用 URL:", backupUrl);
      return backupUrl;
    }
  }
  
  return finalUrl;
}

/**
 * 錯誤處理工具類，提供統一的錯誤處理邏輯
 */
export class ErrorHandler {
  /**
   * 處理API請求錯誤，並返回結構化的錯誤對象
   * @param error Axios錯誤對象
   * @param context 額外的上下文信息，如操作名稱
   * @returns 結構化的錯誤對象
   */
  static handleApiError(error: AxiosError, context: string = ''): { 
    message: string; 
    detail?: string; 
    fieldErrors?: Record<string, string>;
    statusCode?: number;
    isNetworkError?: boolean;
    isServerError?: boolean;
    rawError?: any;
  } {
    // 記錄詳細的錯誤信息
    console.error(`[API錯誤] 操作: ${context || '未指定操作'}`, error);
    
    // 處理請求被發送但服務器回應錯誤的情況
    if (error.response) {
      const statusCode = error.response.status;
      console.error(`[${statusCode}錯誤] URL: ${error.config?.url}`);
      
      // 處理422驗證錯誤
      if (statusCode === 422) {
        return ErrorHandler.handleValidationError(error, context);
      }
      
      // 處理401認證錯誤
      if (statusCode === 401) {
        return {
          message: '認證已過期或無效，請重新登入',
          detail: '需要有效的認證才能繼續操作',
          statusCode: 401,
          isServerError: false
        };
      }
      
      // 處理404資源不存在錯誤
      if (statusCode === 404) {
        return {
          message: '請求的資源不存在',
          detail: `找不到指定的${context}資源`,
          statusCode: 404,
          isServerError: false
        };
      }
      
      // 處理服務器內部錯誤
      if (statusCode >= 500) {
        return {
          message: '伺服器處理請求時出錯',
          detail: (error.response.data as any)?.detail || '服務暫時不可用，請稍後再試',
          statusCode: statusCode,
          isServerError: true,
          rawError: error.response.data
        };
      }
      
      // 處理其他HTTP錯誤
      return {
        message: '請求處理失敗',
        detail: (error.response.data as any)?.detail || error.message,
        statusCode: statusCode,
        isServerError: statusCode >= 500,
        rawError: error.response.data
      };
    }
    
    // 處理請求已發送但未收到回應的情況 (網絡錯誤)
    if (error.request) {
      console.error('[網絡錯誤] 未收到服務器回應:', error.request);
      return {
        message: '連接伺服器失敗',
        detail: '無法連接到伺服器，請檢查網絡連接並稍後再試',
        isNetworkError: true,
        isServerError: false
      };
    }
    
    // 請求設置階段的錯誤
    console.error('[請求錯誤]', error.message);
    return {
      message: '無法完成請求',
      detail: error.message,
      isServerError: false
    };
  }
  
  /**
   * 專門處理422驗證錯誤
   * @param error Axios錯誤對象
   * @param context 操作上下文
   * @returns 結構化的錯誤對象，包含字段錯誤信息
   */
  static handleValidationError(error: AxiosError, context: string = ''): {
    message: string;
    detail: string;
    fieldErrors: Record<string, string>;
    statusCode: number;
    isServerError: boolean;
    rawError: any;
  } {
    console.error('[驗證錯誤] 數據驗證失敗:', error.response?.data);
    
    const validationErrors = (error.response?.data as any)?.detail || [];
    const fieldErrors: Record<string, string> = {};
    
    // 處理FastAPI返回的驗證錯誤格式
    if (Array.isArray(validationErrors)) {
      validationErrors.forEach((err: any) => {
        if (err.loc && Array.isArray(err.loc) && err.loc.length > 1) {
          // 第一個元素通常是 'body'，我們要取第二個元素後的路徑
          const fieldPath = err.loc.slice(1).join('.');
          fieldErrors[fieldPath] = err.msg;
        }
      });
    }
    
    // 產生易讀的錯誤訊息
    const fieldErrorCount = Object.keys(fieldErrors).length;
    const detailMessage = fieldErrorCount > 0
      ? `有 ${fieldErrorCount} 個欄位驗證失敗`
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
  
  /**
   * 將錯誤信息格式化為易於顯示的字符串
   * @param error 錯誤對象
   * @returns 格式化的錯誤信息字符串
   */
  static formatErrorForDisplay(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
      // 對於字段錯誤，顯示具體的字段錯誤信息
      return Object.entries(error.fieldErrors)
        .map(([field, msg]) => `${this.formatFieldName(field)}: ${msg}`)
        .join('\n');
    }
    
    return error.detail || error.message || '發生未知錯誤';
  }
  
  /**
   * 將API的字段名格式化為更易讀的形式
   * @param fieldName API字段名
   * @returns 格式化後的字段名
   */
  private static formatFieldName(fieldName: string): string {
    // 欄位名稱中文化映射
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
    
    // 如果有預設的中文名稱，直接返回
    if (fieldNameMap[fieldName]) {
      return fieldNameMap[fieldName];
    }
    
    // 否則將欄位名轉為更易讀的格式
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// 創建統一的API客戶端
const apiClient = axios.create({
  // 在瀏覽器端使用相對路徑，確保請求由Next.js代理
  baseURL: typeof window !== 'undefined' 
    ? '/api/v1' 
    : getBackendUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // 15秒超時
});

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在這裡添加認證令牌等
    console.log(`[API請求] ${config.method?.toUpperCase()} ${config.url}`);
    
    // 記錄請求參數，方便排查問題
    if (config.params) {
      console.log(`[請求參數] ${JSON.stringify(config.params)}`);
    }
    
    if (config.data && typeof config.data !== 'string') {
      try {
        console.log(`[請求數據] ${JSON.stringify(config.data)}`);
      } catch (e) {
        console.log(`[請求數據] 無法序列化`);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('[API請求錯誤]', error);
    return Promise.reject(error);
  }
);

// 響應攔截器
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API響應] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[API錯誤] ${error.response.status}`, error.response.data);
      
      // 根據URL和狀態碼生成有意義的錯誤日誌
      const url = error.config?.url || '未知URL';
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
      console.error(`[${method} ${url}] 請求失敗，狀態碼: ${error.response.status}`);
      
      if (error.response.status === 422) {
        console.error('[驗證錯誤] 資料驗證失敗:', error.response.data);
      }
    } else if (error.request) {
      console.error('[API錯誤] 沒有收到響應', error.request);
    } else {
      console.error('[API錯誤]', error.message);
    }
    return Promise.reject(error);
  }
);

// API請求函數
export const api = {
  // 預約相關
  appointments: {
    // 獲取所有預約
    getAll: () => apiClient.get('/appointments'),
    
    // 通過電話查詢預約
    getByPhone: (phone: string) => 
      apiClient.get('/appointments/by-phone', { params: { phone_number: phone } }),
    
    // 通過ID獲取預約
    getById: (id: number) => apiClient.get(`/appointments/${id}`),
    
    // 創建新預約
    create: (data: any) => apiClient.post('/appointments', data),
    
    // 更新預約
    update: (id: number, data: any) => apiClient.put(`/appointments/${id}`, data),
    
    // 刪除預約
    delete: (id: number) => apiClient.delete(`/appointments/${id}`),
  },
  
  // 醫生相關
  doctors: {
    // 獲取所有醫生
    getAll: () => apiClient.get('/doctors'),
    
    // 通過ID獲取醫生
    getById: (id: number) => apiClient.get(`/doctors/${id}`),
    
    // 創建新醫生
    create: (data: any) => apiClient.post('/doctors', data),
    
    // 更新醫生信息
    update: (id: number, data: any) => apiClient.put(`/doctors/${id}`, data),
    
    // 刪除醫生
    delete: (id: number) => apiClient.delete(`/doctors/${id}`),
  },
};

export default apiClient; 
