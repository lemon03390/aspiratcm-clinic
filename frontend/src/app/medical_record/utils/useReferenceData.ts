import { useState, useEffect } from 'react';
import { diagnosisDataApi } from './api';

interface ReferenceDataState {
  modernDiseases: { code: string; name: string }[];
  cmSyndromes: { code: string; name: string }[];
  tcmPrinciples: { code: string; name: string }[];
  isLoading: boolean;
  error: string | null;
}

export const useReferenceData = () => {
  const [state, setState] = useState<ReferenceDataState>({
    modernDiseases: [],
    cmSyndromes: [],
    tcmPrinciples: [],
    isLoading: false,
    error: null
  });

  const loadAllReferenceData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 並行請求所有參考數據
      const [modernDiseasesResponse, cmSyndromesResponse, tcmPrinciplesResponse] = await Promise.all([
        diagnosisDataApi.getAllModernDiseases(),
        diagnosisDataApi.getAllCMSyndromes(),
        diagnosisDataApi.getAllTreatmentPrinciples()
      ]);
      
      // 更新狀態
      setState({
        modernDiseases: Array.isArray(modernDiseasesResponse) ? modernDiseasesResponse : [],
        cmSyndromes: Array.isArray(cmSyndromesResponse) ? cmSyndromesResponse : [],
        tcmPrinciples: Array.isArray(tcmPrinciplesResponse) ? tcmPrinciplesResponse : [],
        isLoading: false,
        error: null
      });
      
    } catch (error) {
      console.error('載入參考數據失敗:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '無法載入參考數據，請稍後再試'
      }));
    }
  };

  // 單獨載入現代病名
  const loadModernDiseases = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const data = await diagnosisDataApi.getAllModernDiseases();
      setState(prev => ({
        ...prev,
        modernDiseases: Array.isArray(data) ? data : [],
        isLoading: false
      }));
    } catch (error) {
      console.error('載入現代病名數據失敗:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '無法載入現代病名數據'
      }));
    }
  };

  // 單獨載入中醫證候
  const loadCmSyndromes = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const data = await diagnosisDataApi.getAllCMSyndromes();
      setState(prev => ({
        ...prev,
        cmSyndromes: Array.isArray(data) ? data : [],
        isLoading: false
      }));
    } catch (error) {
      console.error('載入中醫證候數據失敗:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '無法載入中醫證候數據'
      }));
    }
  };

  // 單獨載入中醫治則
  const loadTcmPrinciples = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const data = await diagnosisDataApi.getAllTreatmentPrinciples();
      setState(prev => ({
        ...prev,
        tcmPrinciples: Array.isArray(data) ? data : [],
        isLoading: false
      }));
    } catch (error) {
      console.error('載入中醫治則數據失敗:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '無法載入中醫治則數據'
      }));
    }
  };

  // 初始載入所有參考數據
  useEffect(() => {
    loadAllReferenceData();
  }, []);

  return {
    ...state,
    loadAllReferenceData,
    loadModernDiseases,
    loadCmSyndromes,
    loadTcmPrinciples
  };
};

export default useReferenceData; 