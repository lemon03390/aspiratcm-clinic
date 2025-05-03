import { useCallback, useState } from 'react';
import { diagnosisDataApi, referenceDataApi } from './api';

/**
 * 參考數據 hook，用於獲取、搜尋中醫相關參考數據
 */
function useReferenceData() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 搜尋參考數據
     * @param dataType 數據類型
     * @param searchTerm 搜尋詞
     * @param limit 結果數量限制
     */
    const searchReferenceData = useCallback(async (
        dataType: string,
        searchTerm: string,
        limit: number = 10
    ) => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return [];
        }

        setIsLoading(true);
        setError(null);

        try {
            return await referenceDataApi.search(dataType, searchTerm, limit);
        } catch (error) {
            console.error(`搜尋參考數據失敗: ${dataType}`, error);
            setError(`搜尋參考數據失敗: ${error}`);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 獲取現代病名數據
     */
    const getModernDiseases = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            return await diagnosisDataApi.getAllModernDiseases();
        } catch (error) {
            console.error('獲取現代病名數據失敗', error);
            setError(`獲取現代病名數據失敗: ${error}`);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 獲取中醫證候數據
     */
    const getCMSyndromes = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            return await diagnosisDataApi.getAllCMSyndromes();
        } catch (error) {
            console.error('獲取中醫證候數據失敗', error);
            setError(`獲取中醫證候數據失敗: ${error}`);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 獲取中醫治則數據
     */
    const getTreatmentPrinciples = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            return await diagnosisDataApi.getAllTreatmentPrinciples();
        } catch (error) {
            console.error('獲取中醫治則數據失敗', error);
            setError(`獲取中醫治則數據失敗: ${error}`);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 獲取舌診參考數據
     */
    const getTongueReference = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            return await referenceDataApi.getByType('tongue-reference');
        } catch (error) {
            console.error('獲取舌診參考數據失敗', error);
            setError(`獲取舌診參考數據失敗: ${error}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 獲取脈診參考數據
     */
    const getPulseReference = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            return await referenceDataApi.getByType('pulse-reference');
        } catch (error) {
            console.error('獲取脈診參考數據失敗', error);
            setError(`獲取脈診參考數據失敗: ${error}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        searchReferenceData,
        getModernDiseases,
        getCMSyndromes,
        getTreatmentPrinciples,
        getTongueReference,
        getPulseReference
    };
}

export default useReferenceData; 