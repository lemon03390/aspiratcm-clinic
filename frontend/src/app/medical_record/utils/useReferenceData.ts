import { useCallback, useState } from 'react';
import { referenceDataApi } from './api';

interface ReferenceDataHook {
    isLoading: boolean;
    error: Error | null;
    searchReferenceData: (dataType: string, query: string, limit?: number) => Promise<any[]>;
}

const useReferenceData = (): ReferenceDataHook => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const searchReferenceData = useCallback(async (
        dataType: string,
        query: string,
        limit: number = 20
    ): Promise<any[]> => {
        try {
            setIsLoading(true);
            setError(null);

            return await referenceDataApi.search(dataType, query, limit);
        } catch (err) {
            console.error(`參考資料搜尋失敗: ${dataType}`, err);
            setError(err instanceof Error ? err : new Error('參考資料搜尋失敗'));
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        searchReferenceData
    };
};

export default useReferenceData; 