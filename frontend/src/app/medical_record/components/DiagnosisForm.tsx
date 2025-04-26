import React, { useState, useEffect } from 'react';
import { diagnosisDataApi } from '../utils/api';
import useReferenceData from '../utils/useReferenceData';

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
  initialValues?: DiagnosisData;
  onSave: (data: DiagnosisData) => void;
}

const DiagnosisForm: React.FC<DiagnosisFormProps> = ({
  initialValues = {
    modernDiseases: [],
    cmSyndromes: [],
    cmPrinciple: []
  },
  onSave
}) => {
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>(initialValues);
  const [searchTerms, setSearchTerms] = useState({ 
    modernDisease: '',
    cmSyndrome: '',
    cmPrinciple: '' 
  });
  const [aiSuggestions, setAiSuggestions] = useState<{
    modernDiseases: DiagnosisItem[];
    cmSyndromes: DiagnosisItem[];
    cmPrinciple: DiagnosisItem[];
  } | null>(null);

  // 使用統一的參考數據 hook
  const { 
    modernDiseases: modernDiseaseOptions, 
    cmSyndromes: cmSyndromeOptions, 
    tcmPrinciples: cmPrincipleOptions,
    isLoading,
    error
  } = useReferenceData();

  // 搜尋現代病名
  const searchModernDiseases = async (query: string) => {
    if (!query || query.length < 2) {
      return [];
    }
    
    try {
      // 本地搜尋，未來可改為API搜尋
      return modernDiseaseOptions.filter(
        item => item.name.includes(query) || 
               (item.code && item.code.includes(query))
      ).slice(0, 10);
    } catch (error) {
      console.error('搜尋現代病名失敗:', error);
      return [];
    }
  };

  // 搜尋中醫證候
  const searchCMSyndromes = async (query: string) => {
    if (!query || query.length < 2) {
      return [];
    }
    
    try {
      // 本地搜尋，未來可改為API搜尋
      return cmSyndromeOptions.filter(
        item => item.name.includes(query) || 
               (item.code && item.code.includes(query))
      ).slice(0, 10);
    } catch (error) {
      console.error('搜尋中醫證候失敗:', error);
      return [];
    }
  };

  // 搜尋中醫治則
  const searchCMPrinciples = async (query: string) => {
    if (!query || query.length < 2) {
      return [];
    }
    
    try {
      // 本地搜尋，未來可改為API搜尋
      return cmPrincipleOptions.filter(
        item => item.name.includes(query) || 
               (item.code && item.code.includes(query))
      ).slice(0, 10);
    } catch (error) {
      console.error('搜尋中醫治則失敗:', error);
      return [];
    }
  };

  // 處理現代病名選擇
  const handleModernDiseaseSelect = (selectedItem: DiagnosisItem) => {
    setDiagnosisData(prev => ({
      ...prev,
      modernDiseases: [...prev.modernDiseases, selectedItem]
    }));
    setSearchTerms(prev => ({ ...prev, modernDisease: '' }));
  };

  // 處理中醫證候選擇
  const handleCmSyndromeSelect = (selectedItem: DiagnosisItem) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmSyndromes: [...prev.cmSyndromes, selectedItem]
    }));
    setSearchTerms(prev => ({ ...prev, cmSyndrome: '' }));
  };

  // 處理中醫治則選擇
  const handleCmPrincipleSelect = (selectedItem: DiagnosisItem) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmPrinciple: [...prev.cmPrinciple, selectedItem]
    }));
    setSearchTerms(prev => ({ ...prev, cmPrinciple: '' }));
  };

  // 處理項目移除
  const handleModernDiseaseRemove = (codeToRemove: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      modernDiseases: prev.modernDiseases.filter(item => item.code !== codeToRemove)
    }));
  };

  const handleCmSyndromeRemove = (codeToRemove: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmSyndromes: prev.cmSyndromes.filter(item => item.code !== codeToRemove)
    }));
  };

  const handleCmPrincipleRemove = (codeToRemove: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmPrinciple: prev.cmPrinciple.filter(item => item.code !== codeToRemove)
    }));
  };

  // 應用 AI 建議
  const applyAiSuggestion = () => {
    if (!aiSuggestions) {
      return;
    }
    
    setDiagnosisData(prev => ({
      modernDiseases: [...prev.modernDiseases, ...aiSuggestions.modernDiseases],
      cmSyndromes: [...prev.cmSyndromes, ...aiSuggestions.cmSyndromes],
      cmPrinciple: [...prev.cmPrinciple, ...aiSuggestions.cmPrinciple]
    }));
    
    // 清空建議以避免重複應用
    setAiSuggestions(null);
  };

  // 表單提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(diagnosisData);
  };

  return (
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
            <div className="relative">
              <input
                type="text"
                value={searchTerms.modernDisease}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, modernDisease: e.target.value }))}
                placeholder="搜尋現代病名..."
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {searchTerms.modernDisease.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(async () => {
                    const results = await searchModernDiseases(searchTerms.modernDisease);
                    return results.length > 0 ? (
                      results.map(item => (
                        <div
                          key={item.code}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleModernDiseaseSelect(item)}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 ml-2 text-xs">{item.code}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">無符合結果</div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* 已選擇項目 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {diagnosisData.modernDiseases.map(item => (
                <div 
                  key={item.code} 
                  className="flex items-center bg-blue-100 px-2 py-1 rounded"
                >
                  <span>{item.name}</span>
                  <button 
                    type="button"
                    onClick={() => handleModernDiseaseRemove(item.code)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* 中醫辨證 - 多選 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">中醫辨證（多選）</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerms.cmSyndrome}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, cmSyndrome: e.target.value }))}
                placeholder="搜尋中醫辨證..."
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {searchTerms.cmSyndrome.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(async () => {
                    const results = await searchCMSyndromes(searchTerms.cmSyndrome);
                    return results.length > 0 ? (
                      results.map(item => (
                        <div
                          key={item.code || item.name}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleCmSyndromeSelect(item)}
                        >
                          <span className="font-medium">{item.name}</span>
                          {item.code && <span className="text-gray-500 ml-2 text-xs">{item.code}</span>}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">無符合結果</div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* 已選擇項目 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {diagnosisData.cmSyndromes.map(item => (
                <div 
                  key={item.code || item.name} 
                  className="flex items-center bg-blue-100 px-2 py-1 rounded"
                >
                  <span>{item.name}</span>
                  <button 
                    type="button"
                    onClick={() => handleCmSyndromeRemove(item.code)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* 中醫治則 - 多選 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">中醫治則（多選）</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerms.cmPrinciple}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, cmPrinciple: e.target.value }))}
                placeholder="搜尋中醫治則..."
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {searchTerms.cmPrinciple.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(async () => {
                    const results = await searchCMPrinciples(searchTerms.cmPrinciple);
                    return results.length > 0 ? (
                      results.map(item => (
                        <div
                          key={item.code}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleCmPrincipleSelect(item)}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 ml-2 text-xs">{item.code}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">無符合結果</div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* 已選擇項目 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {diagnosisData.cmPrinciple.map(item => (
                <div 
                  key={item.code} 
                  className="flex items-center bg-blue-100 px-2 py-1 rounded"
                >
                  <span>{item.name}</span>
                  <button 
                    type="button"
                    onClick={() => handleCmPrincipleRemove(item.code)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
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
                {aiSuggestions.modernDiseases.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">現代病名：</span>
                    <span className="text-sm">{aiSuggestions.modernDiseases.map(item => item.name).join('、')}</span>
                  </div>
                )}
                
                {aiSuggestions.cmSyndromes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">中醫辨證：</span>
                    <span className="text-sm">{aiSuggestions.cmSyndromes.map(item => item.name).join('、')}</span>
                  </div>
                )}
                
                {aiSuggestions.cmPrinciple.length > 0 && (
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
  );
};

export default DiagnosisForm; 