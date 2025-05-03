import React, { useState } from 'react';
import FuzzySearchInput from './FuzzySearchInput';
import { treatmentMethods, acupoints, boneAdjustments } from '../data';

interface TreatmentItem {
  method: string;
  targets: string[]; // 穴位或部位，改為數組支持多選
  id: string; // 用於唯一識別每一行
}

interface TreatmentMethodData {
  treatments: TreatmentItem[];
}

interface TreatmentMethodFormProps {
  initialValues?: TreatmentMethodData;
  onSave: (data: TreatmentMethodData) => void;
}

const TreatmentMethodForm: React.FC<TreatmentMethodFormProps> = ({
  initialValues = {
    treatments: [{ method: '', targets: [], id: '0' }]
  },
  onSave
}) => {
  const [treatmentData, setTreatmentData] = useState<TreatmentMethodData>(initialValues);
  
  // 處理新增治療方法
  const handleAddTreatment = () => {
    setTreatmentData(prev => ({
      ...prev,
      treatments: [...prev.treatments, { method: '', targets: [], id: Date.now().toString() }]
    }));
  };
  
  // 處理刪除治療方法
  const handleRemoveTreatment = (id: string) => {
    setTreatmentData(prev => ({
      ...prev,
      treatments: prev.treatments.filter(treatment => treatment.id !== id)
    }));
  };
  
  // 處理治療方法選擇
  const handleMethodSelect = (id: string, method: string) => {
    setTreatmentData(prev => ({
      ...prev,
      treatments: prev.treatments.map(treatment => 
        treatment.id === id ? { ...treatment, method, targets: [] } : treatment
      )
    }));
  };
  
  // 處理穴位/部位多選
  const handleTargetSelect = (id: string, target: string) => {
    setTreatmentData(prev => ({
      ...prev,
      treatments: prev.treatments.map(treatment => 
        treatment.id === id ? { 
          ...treatment, 
          targets: [...treatment.targets, target] 
        } : treatment
      )
    }));
  };
  
  // 處理穴位/部位移除
  const handleTargetRemove = (id: string, target: string) => {
    setTreatmentData(prev => ({
      ...prev,
      treatments: prev.treatments.map(treatment => 
        treatment.id === id ? { 
          ...treatment, 
          targets: treatment.targets.filter(t => t !== target) 
        } : treatment
      )
    }));
  };
  
  // 處理自由輸入部位（僅適用於其他手法）
  const handleFreeTargetInput = (id: string, target: string) => {
    // 對於自由輸入，我們仍然使用單一值
    setTreatmentData(prev => ({
      ...prev,
      treatments: prev.treatments.map(treatment => 
        treatment.id === id ? { ...treatment, targets: [target] } : treatment
      )
    }));
  };
  
  // 獲取對應的選項列表
  const getOptionsForMethod = (method: string) => {
    switch (method) {
      case '正骨':
        return boneAdjustments;
      case '針灸':
      case '艾灸':
      case '天灸':
      case '穴位埋線':
      case '耳穴':
        return acupoints;
      default:
        return [];
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(treatmentData);
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">中醫治療方法</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 治療方法列表 */}
        <div className="space-y-4">
          {treatmentData.treatments.map((treatment, index) => (
            <div key={treatment.id} className="border rounded-md p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">治療方法 {index + 1}</h3>
                {treatmentData.treatments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTreatment(treatment.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    移除
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 治療方法選擇 */}
                <div className="space-y-1">
                  <label className="block text-sm text-gray-600">方法類別</label>
                  <FuzzySearchInput
                    options={treatmentMethods}
                    placeholder="請選擇治療方法"
                    value={treatment.method}
                    onSelect={(value) => handleMethodSelect(treatment.id, value)}
                    className="border-gray-300"
                  />
                </div>
                
                {/* 穴位或部位 - 改為多選 */}
                <div className="space-y-1">
                  <label className="block text-sm text-gray-600">
                    {treatment.method === '正骨' ? '部位（多選）' : '穴位（多選）'}
                  </label>
                  {treatment.method === '其他手法' ? (
                    <input
                      type="text"
                      value={treatment.targets[0] || ''}
                      onChange={(e) => handleFreeTargetInput(treatment.id, e.target.value)}
                      placeholder="請輸入治療部位或方法描述"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  ) : treatment.method ? (
                    <FuzzySearchInput
                      options={getOptionsForMethod(treatment.method)}
                      placeholder={`請選擇${treatment.method === '正骨' ? '部位' : '穴位'}`}
                      onSelect={(value) => handleTargetSelect(treatment.id, value)}
                      multiple={true}
                      selectedItems={treatment.targets}
                      onRemove={(value) => handleTargetRemove(treatment.id, value)}
                      className="border-gray-300"
                    />
                  ) : (
                    <div className="p-2 border border-gray-200 bg-gray-100 rounded-md text-gray-500">
                      請先選擇治療方法
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 新增按鈕 */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleAddTreatment}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            + 新增治療方法
          </button>
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

export default TreatmentMethodForm; 