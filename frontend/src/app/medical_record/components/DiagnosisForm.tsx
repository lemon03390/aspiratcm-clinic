import React, { useState } from 'react';
import FuzzySearchInput from './FuzzySearchInput';
import SyndromeSelector from './SyndromeSelector';
import { modernDiseases, cmPrinciples } from '../data';

interface DiagnosisData {
  modernDiseases: string[];
  cmSyndromes: string[];
  cmPrinciple: string[];
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
  
  const handleModernDiseaseSelect = (disease: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      modernDiseases: [...prev.modernDiseases, disease]
    }));
  };
  
  const handleModernDiseaseRemove = (disease: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      modernDiseases: prev.modernDiseases.filter(d => d !== disease)
    }));
  };
  
  const handleCmSyndromeSelect = (syndromeCodes: string[]) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmSyndromes: syndromeCodes
    }));
  };
  
  const handleCmPrincipleSelect = (principle: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmPrinciple: [...prev.cmPrinciple, principle]
    }));
  };
  
  const handleCmPrincipleRemove = (principle: string) => {
    setDiagnosisData(prev => ({
      ...prev,
      cmPrinciple: prev.cmPrinciple.filter(p => p !== principle)
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(diagnosisData);
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">中醫診斷</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 現代病名 - 多選 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">現代病名（多選）</label>
          <FuzzySearchInput
            options={modernDiseases}
            placeholder="請選擇現代病名"
            onSelect={handleModernDiseaseSelect}
            multiple={true}
            selectedItems={diagnosisData.modernDiseases}
            onRemove={handleModernDiseaseRemove}
            className="border-gray-300"
          />
        </div>
        
        {/* 中醫辨證 - 多選 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">中醫辨證（多選）</label>
          <SyndromeSelector
            selectedCodes={diagnosisData.cmSyndromes}
            onChange={handleCmSyndromeSelect}
            placeholder="請選擇中醫辨證"
            className="border-gray-300"
          />
        </div>
        
        {/* 中醫治則 - 多選 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">中醫治則（多選）</label>
          <FuzzySearchInput
            options={cmPrinciples}
            placeholder="請選擇中醫治則"
            onSelect={handleCmPrincipleSelect}
            multiple={true}
            selectedItems={diagnosisData.cmPrinciple}
            onRemove={handleCmPrincipleRemove}
            className="border-gray-300"
          />
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
    </div>
  );
};

export default DiagnosisForm; 