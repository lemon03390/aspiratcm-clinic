import { getBackendUrl } from '../../../libs/apiClient';
import axios from 'axios';

// AI 推薦 API
export const aiApi = {
  /**
   * 獲取 AI 用藥建議
   * @param modernDiagnosis - 現代疾病診斷
   * @param cmSyndrome - 中醫證型診斷
   * @returns Promise<{ suggestions: any[] }> - 建議的藥方列表
   */
  getRecommendations: async (modernDiagnosis: string, cmSyndrome: string) => {
    try {
      console.log('正在獲取 AI 用藥建議', { modernDiagnosis, cmSyndrome });
      
      // 建構查詢參數
      let queryParams = new URLSearchParams();
      if (modernDiagnosis) {
        queryParams.append('modern_diagnosis', modernDiagnosis);
      }
      if (cmSyndrome) {
        queryParams.append('cm_syndrome', cmSyndrome);
      }
      
      // 構建 API URL
      const endpoint = `/ai/recommendations?${queryParams.toString()}`;
      const url = getBackendUrl(endpoint);
      
      console.log(`AI 建議 API 請求 URL: ${url}`);
      
      // 發送請求
      const response = await axios.get(url, {
        timeout: 10000
      });
      
      console.log('AI 用藥建議響應:', response.data);
      return response.data;
    } catch (error) {
      console.error('獲取 AI 用藥建議失敗:', error);
      // 失敗時返回空陣列
      return { suggestions: [] };
    }
  }
};

export default aiApi; 