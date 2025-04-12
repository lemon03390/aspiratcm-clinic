import React, { useState } from 'react';
import FuzzySearchInput from './FuzzySearchInput';
import { pulsePositions, pulseQualities, tongueQualities, tongueShapes, tongueColors, tongueCoatings } from '../data';

interface MenstrualPeriod {
  startDate: string;
  endDate: string;
}

interface ObservationData {
  observation: string;
  leftPulse: string[];
  rightPulse: string[];
  tongueQuality: string[];
  tongueShape: string[];
  tongueColor: string[];
  tongueCoating: string[];
  menstrualPeriod?: MenstrualPeriod;
}

interface ObservationFormProps {
  initialValues?: ObservationData;
  onSave: (data: ObservationData) => void;
  showMenstrualField?: boolean;
}

const ObservationForm: React.FC<ObservationFormProps> = ({
  initialValues = {
    observation: '',
    leftPulse: [],
    rightPulse: [],
    tongueQuality: [],
    tongueShape: [],
    tongueColor: [],
    tongueCoating: [],
    menstrualPeriod: { startDate: '', endDate: '' }
  },
  onSave,
  showMenstrualField = false
}) => {
  const [observationData, setObservationData] = useState<ObservationData>(initialValues);
  
  // 計算月經天數
  const calculateDays = (): number => {
    if (!observationData.menstrualPeriod?.startDate || !observationData.menstrualPeriod?.endDate) {
      return 0;
    }
    
    const start = new Date(observationData.menstrualPeriod.startDate);
    const end = new Date(observationData.menstrualPeriod.endDate);
    
    // 計算日期差
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };
  
  // 處理添加項目到多選字段
  const handleAddItem = (field: keyof ObservationData, value: string) => {
    setObservationData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }));
  };
  
  // 處理從多選字段移除項目
  const handleRemoveItem = (field: keyof ObservationData, value: string) => {
    setObservationData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter(item => item !== value)
    }));
  };
  
  const handleChange = (field: 'observation', value: string) => {
    setObservationData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleMenstrualChange = (field: 'startDate' | 'endDate', value: string) => {
    setObservationData(prev => ({
      ...prev,
      menstrualPeriod: {
        ...prev.menstrualPeriod!,
        [field]: value
      }
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(observationData);
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">醫師觀察</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 望診觀察 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">望診觀察</label>
          <textarea
            value={observationData.observation}
            onChange={(e) => handleChange('observation', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="請輸入望診觀察內容"
            rows={3}
          />
        </div>
        
        {/* 脈象區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">左手脈象（多選）</label>
            <FuzzySearchInput
              options={pulseQualities.map(quality => 
                pulsePositions.map(position => `${position}${quality}`)).flat()}
              placeholder="請選擇左手脈象"
              onSelect={(value) => handleAddItem('leftPulse', value)}
              multiple={true}
              selectedItems={observationData.leftPulse}
              onRemove={(value) => handleRemoveItem('leftPulse', value)}
              className="border-gray-300"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">右手脈象（多選）</label>
            <FuzzySearchInput
              options={pulseQualities.map(quality => 
                pulsePositions.map(position => `${position}${quality}`)).flat()}
              placeholder="請選擇右手脈象"
              onSelect={(value) => handleAddItem('rightPulse', value)}
              multiple={true}
              selectedItems={observationData.rightPulse}
              onRemove={(value) => handleRemoveItem('rightPulse', value)}
              className="border-gray-300"
            />
          </div>
        </div>
        
        {/* 舌診區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌質（多選）</label>
            <FuzzySearchInput
              options={tongueQualities}
              placeholder="請選擇舌質"
              onSelect={(value) => handleAddItem('tongueQuality', value)}
              multiple={true}
              selectedItems={observationData.tongueQuality}
              onRemove={(value) => handleRemoveItem('tongueQuality', value)}
              className="border-gray-300"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌型（多選）</label>
            <FuzzySearchInput
              options={tongueShapes}
              placeholder="請選擇舌型"
              onSelect={(value) => handleAddItem('tongueShape', value)}
              multiple={true}
              selectedItems={observationData.tongueShape}
              onRemove={(value) => handleRemoveItem('tongueShape', value)}
              className="border-gray-300"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌色（多選）</label>
            <FuzzySearchInput
              options={tongueColors}
              placeholder="請選擇舌色"
              onSelect={(value) => handleAddItem('tongueColor', value)}
              multiple={true}
              selectedItems={observationData.tongueColor}
              onRemove={(value) => handleRemoveItem('tongueColor', value)}
              className="border-gray-300"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌苔（多選）</label>
            <FuzzySearchInput
              options={tongueCoatings}
              placeholder="請選擇舌苔"
              onSelect={(value) => handleAddItem('tongueCoating', value)}
              multiple={true}
              selectedItems={observationData.tongueCoating}
              onRemove={(value) => handleRemoveItem('tongueCoating', value)}
              className="border-gray-300"
            />
          </div>
        </div>
        
        {/* 月經區 - 僅顯示於女性患者 */}
        {showMenstrualField && (
          <div className="border p-3 rounded-md bg-gray-50">
            <h3 className="text-md font-medium mb-2">上次月經</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-sm text-gray-600">起始日</label>
                <input
                  type="date"
                  value={observationData.menstrualPeriod?.startDate || ''}
                  onChange={(e) => handleMenstrualChange('startDate', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm text-gray-600">結束日</label>
                <input
                  type="date"
                  value={observationData.menstrualPeriod?.endDate || ''}
                  onChange={(e) => handleMenstrualChange('endDate', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="space-y-1 flex items-end">
                <div className="p-2 bg-white border border-gray-300 rounded-md w-full">
                  <span className="font-medium">{calculateDays()}</span> 天
                </div>
              </div>
            </div>
          </div>
        )}
        
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

export default ObservationForm; 