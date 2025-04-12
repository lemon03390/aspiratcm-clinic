import React, { useState, useEffect } from 'react';

interface HistoryInputFormProps {
  onSave: (data: { chiefComplaint: string; presentIllness: string }) => void;
  initialChiefComplaint?: string;
}

const HistoryInputForm: React.FC<HistoryInputFormProps> = ({ 
  onSave,
  initialChiefComplaint = ''
}) => {
  const [chiefComplaint, setChiefComplaint] = useState(initialChiefComplaint);
  const [presentIllness, setPresentIllness] = useState('');
  const [errors, setErrors] = useState({
    chiefComplaint: '',
    presentIllness: ''
  });
  
  // 當initialChiefComplaint變化時更新表單
  useEffect(() => {
    setChiefComplaint(initialChiefComplaint);
  }, [initialChiefComplaint]);
  
  const validate = () => {
    let isValid = true;
    const newErrors = {
      chiefComplaint: '',
      presentIllness: ''
    };
    
    if (!chiefComplaint.trim()) {
      newErrors.chiefComplaint = '請填寫主訴';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSave({
        chiefComplaint,
        presentIllness
      });
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">主訴與現病史</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            主訴
          </label>
          <textarea
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="請輸入患者的主要症狀和不適"
            className={`w-full p-2 border ${errors.chiefComplaint ? 'border-red-500' : 'border-gray-300'} rounded-md min-h-[80px]`}
          />
          {errors.chiefComplaint && (
            <p className="mt-1 text-sm text-red-600">{errors.chiefComplaint}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            現病史
          </label>
          <textarea
            value={presentIllness}
            onChange={(e) => setPresentIllness(e.target.value)}
            placeholder="請輸入患者的發病時間、經過、治療史等"
            className={`w-full p-2 border ${errors.presentIllness ? 'border-red-500' : 'border-gray-300'} rounded-md min-h-[120px]`}
          />
          {errors.presentIllness && (
            <p className="mt-1 text-sm text-red-600">{errors.presentIllness}</p>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default HistoryInputForm; 