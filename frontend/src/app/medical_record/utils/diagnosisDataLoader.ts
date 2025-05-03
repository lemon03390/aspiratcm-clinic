import { ModernDisease, Principle, Syndrome } from '../types/diagnosisReferenceTypes';
import { prepareReferenceData } from './diagnosisTreeUtils';

/**
 * 從公共文件夾加載現代病名的原始資料
 * @returns Promise<ModernDisease[]> 現代病名資料
 */
export const loadModernDiseases = async (): Promise<ModernDisease[]> => {
    try {
        const response = await fetch('/data/modern_chinese_disease_name.json');
        if (!response.ok) {
            throw new Error('Failed to load modern diseases data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading modern diseases data:', error);
        return [];
    }
};

/**
 * 從公共文件夾加載中醫辨證的原始資料
 * @returns Promise<Syndrome[]> 中醫辨證資料
 */
export const loadCmSyndromes = async (): Promise<Syndrome[]> => {
    try {
        const response = await fetch('/data/tcm_codes_fung_version_full.json');
        if (!response.ok) {
            throw new Error('Failed to load TCM syndromes data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading TCM syndromes data:', error);
        return [];
    }
};

/**
 * 從公共文件夾加載中醫治則的原始資料
 * @returns Promise<Principle[]> 中醫治則資料
 */
export const loadCmPrinciples = async (): Promise<Principle[]> => {
    try {
        const response = await fetch('/data/tcm_treatment_rule.json');
        if (!response.ok) {
            throw new Error('Failed to load TCM principles data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading TCM principles data:', error);
        return [];
    }
};

/**
 * 組合處理所有診斷參考數據
 * @returns Promise 包含處理後的所有診斷數據
 */
export const loadAllDiagnosisData = async () => {
    // 並行加載所有診斷數據
    const [modernDiseases, cmSyndromes, cmPrinciples] = await Promise.all([
        loadModernDiseases(),
        loadCmSyndromes(),
        loadCmPrinciples()
    ]);

    // 預處理參考數據
    const processedModernDiseases = prepareReferenceData(modernDiseases);
    const processedCmSyndromes = prepareReferenceData(cmSyndromes);
    const processedCmPrinciples = prepareReferenceData(cmPrinciples);

    return {
        modernDiseases: processedModernDiseases,
        cmSyndromes: processedCmSyndromes,
        cmPrinciples: processedCmPrinciples
    };
}; 