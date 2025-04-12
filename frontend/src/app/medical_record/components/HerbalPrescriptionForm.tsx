import React, { useState } from 'react';
import FuzzySearchInput from './FuzzySearchInput';
import { acupoints } from '../data'; // 暫用穴位參考替代中藥名，實際應該使用中藥名稱列表

interface HerbItem {
  name: string;
  amount: string;
  id: string; // 用於唯一識別每一行
}

interface HerbalPrescriptionData {
  herbs: HerbItem[];
  instructions: string; // 服法說明
}

interface HerbalPrescriptionFormProps {
  initialValues?: HerbalPrescriptionData;
  onSave: (data: HerbalPrescriptionData) => void;
}

const HerbalPrescriptionForm: React.FC<HerbalPrescriptionFormProps> = ({
  initialValues = {
    herbs: [{ name: '', amount: '', id: '0' }],
    instructions: ''
  },
  onSave
}) => {
  const [prescription, setPrescription] = useState<HerbalPrescriptionData>(initialValues);
  
  // 處理新增藥材行
  const handleAddHerb = () => {
    setPrescription(prev => ({
      ...prev,
      herbs: [...prev.herbs, { name: '', amount: '', id: Date.now().toString() }]
    }));
  };
  
  // 處理刪除藥材行
  const handleRemoveHerb = (id: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.filter(herb => herb.id !== id)
    }));
  };
  
  // 處理藥材名稱選擇
  const handleHerbNameSelect = (id: string, name: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => 
        herb.id === id ? { ...herb, name } : herb
      )
    }));
  };
  
  // 處理藥材份量輸入
  const handleHerbAmountChange = (id: string, amount: string) => {
    setPrescription(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => 
        herb.id === id ? { ...herb, amount } : herb
      )
    }));
  };
  
  // 處理服法說明輸入
  const handleInstructionsChange = (instructions: string) => {
    setPrescription(prev => ({
      ...prev,
      instructions
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(prescription);
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">中藥處方</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 藥材列表 */}
        <div className="border rounded-md overflow-hidden">
          {/* 表頭 */}
          <div className="grid grid-cols-12 bg-gray-100 p-3 border-b font-medium">
            <div className="col-span-6">中藥名稱</div>
            <div className="col-span-5">份量</div>
            <div className="col-span-1 text-center">操作</div>
          </div>
          
          {/* 藥材行 */}
          <div className="divide-y">
            {prescription.herbs.map((herb, index) => (
              <div key={herb.id} className="grid grid-cols-12 p-2 items-center">
                <div className="col-span-6 pr-2">
                  <FuzzySearchInput
                    options={acupoints} // 暫用穴位參考替代中藥名
                    placeholder="請選擇中藥名稱"
                    value={herb.name}
                    onSelect={(value) => handleHerbNameSelect(herb.id, value)}
                    className="border-gray-300"
                  />
                </div>
                <div className="col-span-5 pr-2">
                  <input
                    type="text"
                    value={herb.amount}
                    onChange={(e) => handleHerbAmountChange(herb.id, e.target.value)}
                    placeholder="請輸入份量"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {prescription.herbs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHerb(herb.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* 新增按鈕 */}
          <div className="p-2 bg-gray-50 flex justify-center">
            <button
              type="button"
              onClick={handleAddHerb}
              className="px-4 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              + 新增藥材
            </button>
          </div>
        </div>
        
        {/* 服法說明 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">服法</label>
          <textarea
            value={prescription.instructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder="例如：共7天，每日兩次，早晚服"
            className="w-full p-2 border border-gray-300 rounded-md"
            rows={2}
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

export default HerbalPrescriptionForm; 