import React, { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { diagnosisDataApi } from '../utils/api';
import useReferenceData from '../utils/useReferenceData';
import AsyncTreeSelect, { TreeNode } from './AsyncTreeSelect';

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

// 輔助函數：將任何值正規化為 DiagnosisItem
const normalizeToDiagnosisItem = (item: any, prefix: string): DiagnosisItem | null => {
  try {
    if (!item) {
      return null;
    }

    if (typeof item === 'object' && item !== null) {
      return {
        code: item.code || `${prefix}-${Math.random().toString(36).substring(2, 9)}`,
        name: typeof item.name === 'string' ? item.name : String(item.name || '')
      };
    } else if (typeof item === 'string' && item.trim() !== '') {
      return {
        code: `${prefix}-${Math.random().toString(36).substring(2, 9)}`,
        name: item.trim()
      };
    }
    return null;
  } catch (error) {
    console.error('正規化診斷項目失敗:', error);
    return null;
  }
};

// 輔助函數：將任何值正規化為 DiagnosisItem 陣列
const normalizeToArray = (items: any, prefix: string): DiagnosisItem[] => {
  try {
    if (!items) {
      return [];
    }

    if (Array.isArray(items)) {
      return items
        .map(item => normalizeToDiagnosisItem(item, prefix))
        .filter(Boolean) as DiagnosisItem[];
    } else if (typeof items === 'string' && items.trim() !== '') {
      const item = normalizeToDiagnosisItem(items, prefix);
      return item ? [item] : [];
    } else if (typeof items === 'object' && items !== null) {
      const item = normalizeToDiagnosisItem(items, prefix);
      return item ? [item] : [];
    }
    return [];
  } catch (error) {
    console.error('正規化診斷陣列失敗:', error);
    return [];
  }
};

// 輔助函數：將診斷項目轉換為樹結構
const convertToTreeNodes = (items: any[]): TreeNode[] => {
  try {
    if (!items || !Array.isArray(items)) {
      return [];
    }

    // 分組診斷項目，以句點分隔的代碼為基礎
    const groupedItems: Record<string, any[]> = {};

    items.forEach(item => {
      if (!item.code) {
        return;
      }

      const codeSegments = item.code.split('.');
      const parentCode = codeSegments.length > 1
        ? codeSegments.slice(0, codeSegments.length - 1).join('.') + '.'
        : '';

      if (!groupedItems[parentCode]) {
        groupedItems[parentCode] = [];
      }

      groupedItems[parentCode].push(item);
    });

    // 遞迴構建樹結構
    const buildTree = (parentCode: string = ''): TreeNode[] => {
      const children = groupedItems[parentCode] || [];
      return children.map((item): TreeNode => {
        const fullCode = item.code;
        const hasChildren = groupedItems[fullCode + '.'];

        return {
          label: item.name,
          value: fullCode,
          children: hasChildren ? buildTree(fullCode + '.') : undefined,
          isLeaf: !hasChildren
        };
      });
    };

    return buildTree();
  } catch (error) {
    console.error('轉換為樹結構失敗:', error);
    return [];
  }
};

// 輔助函數：將搜尋結果轉換為 TreeNode 格式
const convertSearchToTreeNodes = (items: any[]): TreeNode[] => {
  try {
    if (!items || !Array.isArray(items)) {
      return [];
    }

    return items.map(item => ({
      label: item.name,
      value: item.code,
      isLeaf: true
    }));
  } catch (error) {
    console.error('轉換搜尋結果失敗:', error);
    return [];
  }
};

const DiagnosisForm: React.FC<DiagnosisFormProps> = ({
  initialValues,
  onSave
}) => {
  // 安全地處理初始值，確保永遠有正確的結構
  const safeInitialValues = useMemo(() => ({
    modernDiseases: normalizeToArray(initialValues?.modernDiseases, 'md'),
    cmSyndromes: normalizeToArray(initialValues?.cmSyndromes, 'cs'),
    cmPrinciple: normalizeToArray(initialValues?.cmPrinciple, 'cp')
  }), [initialValues]);

  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>(safeInitialValues);
  const [aiSuggestions, setAiSuggestions] = useState<{
    modernDiseases: DiagnosisItem[];
    cmSyndromes: DiagnosisItem[];
    cmPrinciple: DiagnosisItem[];
  } | null>(null);

  // 將已選擇的項目轉換為值陣列
  const selectedModernDiseases = useMemo(() =>
    diagnosisData.modernDiseases.map(item => item.code),
    [diagnosisData.modernDiseases]
  );

  const selectedCmSyndromes = useMemo(() =>
    diagnosisData.cmSyndromes.map(item => item.code),
    [diagnosisData.cmSyndromes]
  );

  const selectedCmPrinciples = useMemo(() =>
    diagnosisData.cmPrinciple.map(item => item.code),
    [diagnosisData.cmPrinciple]
  );

  // 使用統一的參考數據 hook
  const {
    isLoading,
    error,
    searchReferenceData
  } = useReferenceData();

  // 載入現代病名樹狀數據
  const loadModernDiseaseTree = async (searchTerm: string): Promise<TreeNode[]> => {
    try {
      const results = await diagnosisDataApi.searchModernDiseases(searchTerm);
      return convertSearchToTreeNodes(results);
    } catch (error) {
      console.error('載入現代病名樹狀數據失敗:', error);
      return [];
    }
  };

  // 載入中醫證候樹狀數據
  const loadCmSyndromeTree = async (searchTerm: string): Promise<TreeNode[]> => {
    try {
      const results = await diagnosisDataApi.searchCMSyndromes(searchTerm);
      return convertSearchToTreeNodes(results);
    } catch (error) {
      console.error('載入中醫證候樹狀數據失敗:', error);
      return [];
    }
  };

  // 載入中醫治則樹狀數據
  const loadCmPrincipleTree = async (searchTerm: string): Promise<TreeNode[]> => {
    try {
      const results = await diagnosisDataApi.searchTreatmentRules(searchTerm);
      return convertSearchToTreeNodes(results);
    } catch (error) {
      console.error('載入中醫治則樹狀數據失敗:', error);
      return [];
    }
  };

  // 處理現代病名變更
  const handleModernDiseaseChange = (values: string[]) => {
    try {
      // 獲取新增的值
      const newValues = values.filter(value => !selectedModernDiseases.includes(value));

      // 處理新增的值
      if (newValues.length > 0) {
        // 對於每個新值，構建 DiagnosisItem
        const newItems = newValues.map(code => ({
          code,
          name: findNameByCode(code, 'modern-diseases') || code
        }));

        setDiagnosisData(prev => ({
          ...prev,
          modernDiseases: [...prev.modernDiseases, ...newItems]
        }));
      } else if (values.length < selectedModernDiseases.length) {
        // 處理移除的情況
        setDiagnosisData(prev => ({
          ...prev,
          modernDiseases: prev.modernDiseases.filter(item => values.includes(item.code))
        }));
      }
    } catch (error) {
      console.error('處理現代病名變更失敗:', error);
    }
  };

  // 處理中醫證候變更
  const handleCmSyndromeChange = (values: string[]) => {
    try {
      // 獲取新增的值
      const newValues = values.filter(value => !selectedCmSyndromes.includes(value));

      // 處理新增的值
      if (newValues.length > 0) {
        // 對於每個新值，構建 DiagnosisItem
        const newItems = newValues.map(code => ({
          code,
          name: findNameByCode(code, 'cm-syndromes') || code
        }));

        setDiagnosisData(prev => ({
          ...prev,
          cmSyndromes: [...prev.cmSyndromes, ...newItems]
        }));
      } else if (values.length < selectedCmSyndromes.length) {
        // 處理移除的情況
        setDiagnosisData(prev => ({
          ...prev,
          cmSyndromes: prev.cmSyndromes.filter(item => values.includes(item.code))
        }));
      }
    } catch (error) {
      console.error('處理中醫證候變更失敗:', error);
    }
  };

  // 處理中醫治則變更
  const handleCmPrincipleChange = (values: string[]) => {
    try {
      // 獲取新增的值
      const newValues = values.filter(value => !selectedCmPrinciples.includes(value));

      // 處理新增的值
      if (newValues.length > 0) {
        // 對於每個新值，構建 DiagnosisItem
        const newItems = newValues.map(code => ({
          code,
          name: findNameByCode(code, 'tcm-principles') || code
        }));

        setDiagnosisData(prev => ({
          ...prev,
          cmPrinciple: [...prev.cmPrinciple, ...newItems]
        }));
      } else if (values.length < selectedCmPrinciples.length) {
        // 處理移除的情況
        setDiagnosisData(prev => ({
          ...prev,
          cmPrinciple: prev.cmPrinciple.filter(item => values.includes(item.code))
        }));
      }
    } catch (error) {
      console.error('處理中醫治則變更失敗:', error);
    }
  };

  // 根據代碼查找名稱的輔助函數
  const findNameByCode = (code: string, dataType: string): string | null => {
    // 在這裡實現查找邏輯，如果有必要
    return code; // 臨時返回代碼作為名稱
  };

  // 應用 AI 建議
  const applyAiSuggestion = () => {
    try {
      if (!aiSuggestions) {
        return;
      }

      const normalizedModernDiseases = normalizeToArray(aiSuggestions.modernDiseases, 'md');
      const normalizedCmSyndromes = normalizeToArray(aiSuggestions.cmSyndromes, 'cs');
      const normalizedCmPrinciple = normalizeToArray(aiSuggestions.cmPrinciple, 'cp');

      setDiagnosisData(prev => ({
        modernDiseases: Array.isArray(prev.modernDiseases)
          ? [...prev.modernDiseases, ...normalizedModernDiseases]
          : [...normalizedModernDiseases],
        cmSyndromes: Array.isArray(prev.cmSyndromes)
          ? [...prev.cmSyndromes, ...normalizedCmSyndromes]
          : [...normalizedCmSyndromes],
        cmPrinciple: Array.isArray(prev.cmPrinciple)
          ? [...prev.cmPrinciple, ...normalizedCmPrinciple]
          : [...normalizedCmPrinciple]
      }));

      // 清空建議以避免重複應用
      setAiSuggestions(null);
    } catch (error) {
      console.error('應用 AI 建議失敗:', error);
    }
  };

  // 表單提交前確保資料安全
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 確保提交到父組件的資料一定是正確格式
      const safeDataToSubmit: DiagnosisData = {
        modernDiseases: Array.isArray(diagnosisData.modernDiseases)
          ? diagnosisData.modernDiseases
          : [],
        cmSyndromes: Array.isArray(diagnosisData.cmSyndromes)
          ? diagnosisData.cmSyndromes
          : [],
        cmPrinciple: Array.isArray(diagnosisData.cmPrinciple)
          ? diagnosisData.cmPrinciple
          : []
      };

      onSave(safeDataToSubmit);
    } catch (error) {
      console.error('提交診斷表單失敗:', error);
      // 儘管發生錯誤，仍嘗試提交一個空的但格式正確的對象
      onSave({
        modernDiseases: [],
        cmSyndromes: [],
        cmPrinciple: []
      });
    }
  };

  // 當 initialValues 改變時，更新狀態
  useEffect(() => {
    try {
      setDiagnosisData(safeInitialValues);
    } catch (error) {
      console.error('更新診斷資料失敗:', error);
      // 發生錯誤時，重置為安全的空值
      setDiagnosisData({
        modernDiseases: [],
        cmSyndromes: [],
        cmPrinciple: []
      });
    }
  }, [safeInitialValues]);

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
            {/* 現代病名 - 多選 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">現代病名（多選）</label>
              <AsyncTreeSelect
                placeholder="搜尋現代病名..."
                loadData={loadModernDiseaseTree}
                onChange={handleModernDiseaseChange}
                value={selectedModernDiseases}
                multiple={true}
                allowClear={true}
                treeDefaultExpandAll={false}
              />

              {/* 已選擇項目顯示 */}
              <div className="flex flex-wrap gap-2 mt-2">
                {diagnosisData.modernDiseases.map(item => (
                  <div
                    key={item.code}
                    className="flex items-center bg-blue-100 px-2 py-1 rounded"
                  >
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 中醫辨證 - 多選 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">中醫辨證（多選）</label>
              <AsyncTreeSelect
                placeholder="搜尋中醫辨證..."
                loadData={loadCmSyndromeTree}
                onChange={handleCmSyndromeChange}
                value={selectedCmSyndromes}
                multiple={true}
                allowClear={true}
                treeDefaultExpandAll={false}
              />

              {/* 已選擇項目顯示 */}
              <div className="flex flex-wrap gap-2 mt-2">
                {diagnosisData.cmSyndromes.map(item => (
                  <div
                    key={item.code}
                    className="flex items-center bg-blue-100 px-2 py-1 rounded"
                  >
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 中醫治則 - 多選 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">中醫治則（多選）</label>
              <AsyncTreeSelect
                placeholder="搜尋中醫治則..."
                loadData={loadCmPrincipleTree}
                onChange={handleCmPrincipleChange}
                value={selectedCmPrinciples}
                multiple={true}
                allowClear={true}
                treeDefaultExpandAll={false}
              />

              {/* 已選擇項目顯示 */}
              <div className="flex flex-wrap gap-2 mt-2">
                {diagnosisData.cmPrinciple.map(item => (
                  <div
                    key={item.code}
                    className="flex items-center bg-blue-100 px-2 py-1 rounded"
                  >
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI 建議診斷區塊 */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-md">
              <div className="flex items-center mb-2">
                <span className="text-gray-700 font-medium">🤖 AI 推薦診斷</span>
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">即將推出</span>
              </div>

              <div className="text-gray-500 text-sm italic">
                <p>未來將根據患者主訴與觀察資料，自動推薦適合的診斷選項。</p>
              </div>

              {/* 模擬未來的 AI 建議 */}
              {aiSuggestions && (
                <div className="mt-2 space-y-2">
                  {aiSuggestions.modernDiseases && aiSuggestions.modernDiseases.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">現代病名：</span>
                      <span className="text-sm">{aiSuggestions.modernDiseases.map(item => item.name).join('、')}</span>
                    </div>
                  )}

                  {aiSuggestions.cmSyndromes && aiSuggestions.cmSyndromes.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">中醫辨證：</span>
                      <span className="text-sm">{aiSuggestions.cmSyndromes.map(item => item.name).join('、')}</span>
                    </div>
                  )}

                  {aiSuggestions.cmPrinciple && aiSuggestions.cmPrinciple.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">治則：</span>
                      <span className="text-sm">{aiSuggestions.cmPrinciple.map(item => item.name).join('、')}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="mt-2 px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                    onClick={applyAiSuggestion}
                  >
                    應用 AI 建議
                  </button>
                </div>
              )}
            </div>

            {/* AI 用藥建議區塊 - 新增 */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-md" id="ai-suggestions">
              <div className="flex items-center mb-2">
                <span className="text-gray-700 font-medium">🌿 AI 用藥建議</span>
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">即將推出 🚀</span>
              </div>

              <div className="text-gray-500 text-sm italic">
                <p>未來將根據患者診斷資料，智能推薦適合的中藥處方。</p>
              </div>

              {/* TODO: 在此處顯示 AI 用藥建議 */}
              {/* TODO: 點擊建議藥物時，將自動加入到 HerbalPrescriptionForm 的草藥列表中 */}
            </div>

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