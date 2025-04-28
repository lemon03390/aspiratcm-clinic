import React, { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  GroupedOption
} from '../types/diagnosisReferenceTypes';
// 使用本地引入替代API
import {
  cmPrincipleOptions,
  cmSyndromeOptions,
  modernDiseaseOptions
} from '../data/referenceOptions';
import {
  buildAliasMapping,
  filterOptionsWithAlias
} from '../utils/diagnosisReferenceUtils';
import DiagnosisFormSelect, { MixedSelectOptions, SelectOption } from './DiagnosisFormSelect';

// 定義資料結構
interface DiagnosisItem {
  code: string;
  name: string;
}

interface DiagnosisData {
  modernDiseases: DiagnosisItem[];
  cmSyndromes: DiagnosisItem[];
  cmPrinciple: DiagnosisItem[];
}

interface DiagnosisFormProps {
  initialValues?: any;
  onSave: (data: DiagnosisData) => void;
}

// 輕量級的錯誤邊界組件
const DiagnosisErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="bg-red-50 p-4 rounded-md border border-red-300">
          <h3 className="text-lg font-medium text-red-800">診斷表單載入錯誤</h3>
          <p className="mt-2 text-sm text-red-700">資料異常，請重新載入頁面</p>
          <button
            onClick={resetErrorBoundary}
            className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
          >
            重試
          </button>
          <p className="mt-2 text-xs text-red-600">{error?.message || '未知錯誤'}</p>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// 將安全地處理初始值，確保永遠有正確的結構
const normalizeDiagnosisData = (initialValues?: any): DiagnosisData => {
  const normalizeItems = (items: any, prefix: string): DiagnosisItem[] => {
    if (!items) {
      return [];
    }

    if (Array.isArray(items)) {
      return items.map(item => {
        if (typeof item === 'string') {
          return { code: `${prefix}-${Math.random().toString(36).substring(2, 9)}`, name: item };
        } else if (item && typeof item === 'object') {
          return {
            code: item.code || `${prefix}-${Math.random().toString(36).substring(2, 9)}`,
            name: item.name || ''
          };
        }
        return { code: `${prefix}-${Math.random().toString(36).substring(2, 9)}`, name: String(item) };
      });
    } else if (typeof items === 'string' && items.trim()) {
      return [{ code: `${prefix}-${Math.random().toString(36).substring(2, 9)}`, name: items.trim() }];
    } else if (items && typeof items === 'object') {
      return [{
        code: items.code || `${prefix}-${Math.random().toString(36).substring(2, 9)}`,
        name: items.name || ''
      }];
    }

    return [];
  };

  return {
    modernDiseases: normalizeItems(initialValues?.modernDiseases, 'md'),
    cmSyndromes: normalizeItems(initialValues?.cmSyndromes, 'cs'),
    cmPrinciple: normalizeItems(initialValues?.cmPrinciple, 'cp')
  };
};

// 將 DiagnosisItem 轉換為 SelectOption
const convertDiagnosisItemsToOptions = (items: DiagnosisItem[]): SelectOption[] => {
  return items.map(item => ({
    label: item.name,
    value: item.code
  }));
};

// 將 SelectOption 轉換為 DiagnosisItem
const convertOptionsToDiagnosisItems = (options: SelectOption[]): DiagnosisItem[] => {
  return options.map(option => ({
    code: option.value,
    name: option.label
  }));
};

const DiagnosisForm: React.FC<DiagnosisFormProps> = ({
  initialValues,
  onSave
}) => {
  // 安全地處理初始值
  const safeInitialValues = useMemo(() => normalizeDiagnosisData(initialValues), [initialValues]);
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>(safeInitialValues);

  // 設置加載狀態，但因為使用本地資料，實際不需要長時間的加載
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 選項與別名映射
  const [localModernDiseaseOptions, setLocalModernDiseaseOptions] = useState<GroupedOption[]>(modernDiseaseOptions);
  const [localCmSyndromeOptions, setLocalCmSyndromeOptions] = useState<GroupedOption[]>(cmSyndromeOptions);
  const [localCmPrincipleOptions, setLocalCmPrincipleOptions] = useState<GroupedOption[]>(cmPrincipleOptions);

  // 別名映射
  const [modernDiseaseAliasMap, setModernDiseaseAliasMap] = useState<Record<string, string>>({});
  const [cmSyndromeAliasMap, setCmSyndromeAliasMap] = useState<Record<string, string>>({});
  const [cmPrincipleAliasMap, setCmPrincipleAliasMap] = useState<Record<string, string>>({});

  // 已選擇的選項
  const selectedModernDiseaseOptions = useMemo(() => {
    return convertDiagnosisItemsToOptions(diagnosisData.modernDiseases);
  }, [diagnosisData.modernDiseases]);

  const selectedCmSyndromeOptions = useMemo(() => {
    return convertDiagnosisItemsToOptions(diagnosisData.cmSyndromes);
  }, [diagnosisData.cmSyndromes]);

  const selectedCmPrincipleOptions = useMemo(() => {
    return convertDiagnosisItemsToOptions(diagnosisData.cmPrinciple);
  }, [diagnosisData.cmPrinciple]);

  // 初始化資料，從本地資料建立別名映射
  useEffect(() => {
    // 從選項數據中構建別名映射
    const extractOptionsForMapping = (groupedOptions: GroupedOption[]): Array<any> => {
      const result: Array<any> = [];
      groupedOptions.forEach(group => {
        group.options.forEach(option => {
          // 檢查是否為別名選項
          if (option.isAlias && option.originalName) {
            // 從標籤中提取別名（假設格式為 "別名 (又名: 原名)"）
            const aliasMatch = option.label.match(/^(.*?)\s*\(又名:/);
            if (aliasMatch && aliasMatch[1]) {
              result.push({
                name: option.originalName,
                code: option.value,
                aliases: [aliasMatch[1].trim()]
              });
            }
          } else {
            result.push({
              name: option.label,
              code: option.value,
              aliases: []
            });
          }
        });
      });
      return result;
    };

    // 為三種類型的診斷數據建立別名映射
    const modernDiseaseData = extractOptionsForMapping(modernDiseaseOptions);
    const modernAliasMap = buildAliasMapping(modernDiseaseData);
    setModernDiseaseAliasMap(modernAliasMap);

    const cmSyndromeData = extractOptionsForMapping(cmSyndromeOptions);
    const syndromeAliasMap = buildAliasMapping(cmSyndromeData);
    setCmSyndromeAliasMap(syndromeAliasMap);

    const cmPrincipleData = extractOptionsForMapping(cmPrincipleOptions);
    const principleAliasMap = buildAliasMapping(cmPrincipleData);
    setCmPrincipleAliasMap(principleAliasMap);

    console.log('診斷參考資料已載入，共計：', {
      '現代病名': modernDiseaseOptions.length,
      '中醫辨證': cmSyndromeOptions.length,
      '中醫治則': cmPrincipleOptions.length
    });
  }, []);

  // 當初始值變更時，更新診斷數據
  useEffect(() => {
    setDiagnosisData(safeInitialValues);
  }, [safeInitialValues]);

  // 各類診斷項目的本地搜尋過濾函數
  const loadModernDiseaseOptions = async (inputValue: string): Promise<MixedSelectOptions> => {
    if (!inputValue || inputValue.length < 2) {
      return localModernDiseaseOptions;
    }
    return filterOptionsWithAlias(inputValue, localModernDiseaseOptions);
  };

  const loadCmSyndromeOptions = async (inputValue: string): Promise<MixedSelectOptions> => {
    if (!inputValue || inputValue.length < 2) {
      return localCmSyndromeOptions;
    }
    return filterOptionsWithAlias(inputValue, localCmSyndromeOptions);
  };

  const loadCmPrincipleOptions = async (inputValue: string): Promise<MixedSelectOptions> => {
    if (!inputValue || inputValue.length < 2) {
      return localCmPrincipleOptions;
    }
    return filterOptionsWithAlias(inputValue, localCmPrincipleOptions);
  };

  // 處理各類診斷項目的選擇變更
  const handleModernDiseaseChange = (selected: SelectOption[]) => {
    setDiagnosisData(prev => ({
      ...prev,
      modernDiseases: convertOptionsToDiagnosisItems(selected)
    }));
  };

  const handleCmSyndromeChange = (selected: SelectOption[]) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmSyndromes: convertOptionsToDiagnosisItems(selected)
    }));
  };

  const handleCmPrincipleChange = (selected: SelectOption[]) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmPrinciple: convertOptionsToDiagnosisItems(selected)
    }));
  };

  // 處理表單提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(diagnosisData);
  };

  return (
    <DiagnosisErrorBoundary>
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">中醫診斷</h2>

        {isLoading ? (
          <div className="py-4 flex justify-center">
            <div className="animate-pulse flex space-x-2">
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
              <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            </div>
            <span className="ml-2 text-gray-500">載入診斷選項中...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 現代病名 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">現代病名（多選）</label>
              <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                <DiagnosisFormSelect
                  placeholder="搜尋或選擇現代病名..."
                  options={localModernDiseaseOptions}
                  loadOptions={loadModernDiseaseOptions}
                  value={selectedModernDiseaseOptions}
                  onChange={handleModernDiseaseChange}
                  isMulti={true}
                  allowCreation={true}
                  isAsync={true}
                  className="w-full"
                  noOptionsMessage="無符合的現代病名，可直接輸入新增"
                />
              </div>
            </div>

            {/* 中醫辨證 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">中醫辨證（多選）</label>
              <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                <DiagnosisFormSelect
                  placeholder="搜尋或選擇中醫辨證..."
                  options={localCmSyndromeOptions}
                  loadOptions={loadCmSyndromeOptions}
                  value={selectedCmSyndromeOptions}
                  onChange={handleCmSyndromeChange}
                  isMulti={true}
                  allowCreation={true}
                  isAsync={true}
                  className="w-full"
                  noOptionsMessage="無符合的中醫辨證，可直接輸入新增"
                />
              </div>
            </div>

            {/* 中醫治則 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">中醫治則（多選）</label>
              <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                <DiagnosisFormSelect
                  placeholder="搜尋或選擇中醫治則..."
                  options={localCmPrincipleOptions}
                  loadOptions={loadCmPrincipleOptions}
                  value={selectedCmPrincipleOptions}
                  onChange={handleCmPrincipleChange}
                  isMulti={true}
                  allowCreation={true}
                  isAsync={true}
                  className="w-full"
                  noOptionsMessage="無符合的中醫治則，可直接輸入新增"
                />
              </div>
            </div>

            {/* AI 推薦診斷與用藥建議 */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-md">
              <div className="flex items-center mb-2">
                <span className="text-gray-700 font-medium">🤖 AI 推薦診斷</span>
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">即將推出</span>
              </div>
              <div className="text-gray-500 text-sm italic">
                <p>未來將根據患者主訴與觀察資料，自動推薦適合的診斷選項。</p>
              </div>
            </div>

            {/* 表單提交按鈕 */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                儲存
              </button>
            </div>
          </form>
        )}
      </div>
    </DiagnosisErrorBoundary>
  );
};

export default DiagnosisForm;