import React, { useEffect, useState } from 'react';
import { aiApi } from '../utils/aiApi';

interface AiSuggestion {
  name: string;
  code: string;
  recommended_amount?: string;
  reason?: string;
}

interface AiHerbSuggestionsProps {
  modernDiagnosis?: string[];
  cmSyndrome?: string[];
  onAddHerb?: (herbData: AiSuggestion) => void;
}

const AiHerbSuggestions: React.FC<AiHerbSuggestionsProps> = ({
  modernDiagnosis = [],
  cmSyndrome = [],
  onAddHerb
}) => {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiMode, setAiMode] = useState<'suggestions' | 'analysis'>('suggestions');

  // 當診斷變更時，獲取 AI 建議
  useEffect(() => {
    // 僅在有診斷資料時請求建議
    if ((modernDiagnosis.length > 0 || cmSyndrome.length > 0) && onAddHerb) {
      fetchAiSuggestions();
    }
  }, [modernDiagnosis, cmSyndrome]);

  // 獲取 AI 用藥建議
  const fetchAiSuggestions = async () => {
    if (!onAddHerb) {
      return; // 如果沒有處理函數，不進行請求
    }

    setIsLoading(true);
    try {
      const modernDiagnosisStr = modernDiagnosis.join(',');
      const cmSyndromeStr = cmSyndrome.join(',');

      const response = await aiApi.getRecommendations(
        modernDiagnosisStr,
        cmSyndromeStr
      );

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('獲取 AI 用藥建議失敗:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 處理添加藥材到處方
  const handleAddToHerbs = (suggestion: AiSuggestion) => {
    if (onAddHerb) {
      onAddHerb(suggestion);
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-md" id="ai-suggestions">
      <div className="flex items-center mb-2">
        <span className="text-gray-700 font-medium">🌿 AI 用藥建議</span>
        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">即將推出 🚀</span>
      </div>

      <div className="text-gray-500 text-sm italic">
        <p>未來將根據患者診斷資料，智能推薦適合的中藥處方。</p>
      </div>

      <div className="flex border-b mb-2">
        <button
          className={`px-3 py-1 ${aiMode === 'suggestions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setAiMode('suggestions')}
        >
          藥材建議
        </button>
        <button
          className={`px-3 py-1 ${aiMode === 'analysis' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setAiMode('analysis')}
        >
          處方分析
        </button>
      </div>

      {/* 顯示建議列表（當前版本為空） */}
      {isLoading ? (
        <div className="mt-2 flex items-center justify-center py-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-600">正在獲取建議...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="mt-2">
          <div className="text-sm font-medium mb-1">推薦用藥:</div>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                <div>
                  <span className="font-medium">{suggestion.name}</span>
                  <span className="text-xs text-gray-500 ml-1">({suggestion.recommended_amount}g)</span>
                  {suggestion.reason && (
                    <p className="text-xs text-gray-600 mt-0.5">{suggestion.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleAddToHerbs(suggestion)}
                  className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200"
                >
                  加入處方
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AiHerbSuggestions; 