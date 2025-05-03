/**
 * 統一的API錯誤處理工具
 */

type ErrorInfo = {
  message: string;
  statusCode?: number;
  fieldErrors?: Record<string, string[]>;
  isNetworkError?: boolean;
};

class ErrorHandler {
  /**
   * 處理API錯誤，返回標準化的錯誤信息
   */
  static handleApiError(error: any, context: string = ''): ErrorInfo {
    console.error(`API錯誤 [${context}]:`, error);
    
    if (!error) {
      return { message: '發生未知錯誤' };
    }
    
    // 網絡錯誤
    if (error.message === 'Network Error') {
      return {
        message: '無法連接到伺服器，請檢查網絡連接',
        isNetworkError: true
      };
    }
    
    // Axios 錯誤
    if (error.response) {
      const { status, data } = error.response;
      
      // 422 表單驗證錯誤
      if (status === 422 && data.detail) {
        const fieldErrors = typeof data.detail === 'object' ? data.detail : {};
        return {
          message: '表單驗證失敗，請檢查輸入',
          statusCode: status,
          fieldErrors
        };
      }
      
      // 其他HTTP錯誤
      return {
        message: data.detail || data.message || `請求失敗 (${status})`,
        statusCode: status
      };
    }
    
    // 一般JS錯誤
    return {
      message: error.message || '發生未知錯誤'
    };
  }
  
  /**
   * 格式化錯誤信息以便於顯示
   */
  static formatErrorForDisplay(errorInfo: ErrorInfo): string {
    if (errorInfo.fieldErrors) {
      // 組合所有欄位錯誤為一個字串
      const fieldErrorMessages = Object.entries(errorInfo.fieldErrors)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('\n');
      
      return fieldErrorMessages || errorInfo.message;
    }
    
    return errorInfo.message;
  }
}

export default ErrorHandler; 