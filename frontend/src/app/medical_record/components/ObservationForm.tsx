import React, { useState } from 'react';
import { pulsePositions, pulseQualities, tongueCoatings, tongueColors, tongueQualities, tongueShapes } from '../data';
import {
  tongueCoatingCategories,
  tongueColorCategories,
  tongueQualityCategories,
  tongueShapeCategories
} from '../data/tongueCategories';
import { groupPulseOptionsByPosition, groupTongueOptionsByCategory } from '../utils/diagnosisUtils';
import DiagnosisFormSelect, { SelectOption } from './DiagnosisFormSelect';

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

// 將平面數組轉換為樹狀結構
const convertToTreeData = (items: string[]): any[] => {
  return items.map(item => ({
    label: item,
    value: item,
    isLeaf: true
  }));
};

// 組合脈象資料為樹狀結構
const getPulseTreeData = (): any[] => {
  const data: any[] = [];

  // 調整脈位順序：整體 > 寸 > 關 > 尺
  const orderedPositions = ['整體', '寸', '關', '尺'];

  orderedPositions.forEach(position => {
    const positionNode: any = {
      label: position,
      value: `${position}`,
      children: pulseQualities.map(quality => ({
        label: quality,
        value: `${position}${quality}`,
        isLeaf: true
      })),
      isLeaf: false
    };
    data.push(positionNode);
  });

  return data;
};

// 準備下拉選單的數據
const getPulseOptions = () => {
  // 使用新的按脈位分組函數
  return groupPulseOptionsByPosition(pulseQualities, pulsePositions);
};

const getTongueQualityOptions = () => {
  // 使用新的舌質分類
  return groupTongueOptionsByCategory(tongueQualities, tongueQualityCategories);
};

const getTongueShapeOptions = () => {
  // 使用新的舌型分類
  return groupTongueOptionsByCategory(tongueShapes, tongueShapeCategories);
};

const getTongueColorOptions = () => {
  // 使用新的舌色分類
  return groupTongueOptionsByCategory(tongueColors, tongueColorCategories);
};

const getTongueCoatingOptions = () => {
  // 使用新的舌苔分類
  return groupTongueOptionsByCategory(tongueCoatings, tongueCoatingCategories);
};

// 組合舌診資料為樹狀結構
const getTongueQualityTreeData = (): any[] => {
  return convertToTreeData(tongueQualities);
};

const getTongueShapeTreeData = (): any[] => {
  return convertToTreeData(tongueShapes);
};

const getTongueColorTreeData = (): any[] => {
  return convertToTreeData(tongueColors);
};

const getTongueCoatingTreeData = (): any[] => {
  return convertToTreeData(tongueCoatings);
};

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

  // 記錄下拉選單數據是否已加載
  const [pulseOptions] = useState(getPulseOptions());
  const [tongueQualityOptions] = useState(getTongueQualityOptions());
  const [tongueShapeOptions] = useState(getTongueShapeOptions());
  const [tongueColorOptions] = useState(getTongueColorOptions());
  const [tongueCoatingOptions] = useState(getTongueCoatingOptions());

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

  // 處理多選字段變更
  const handleMultiSelectChange = (field: keyof ObservationData, values: string[]) => {
    setObservationData(prev => ({
      ...prev,
      [field]: values
    }));
  };

  // 處理 DiagnosisFormSelect 變更
  const handleDiagnosisSelectChange = (field: keyof ObservationData, selectedOptions: SelectOption[]) => {
    const values = selectedOptions.map(option => option.value);
    setObservationData(prev => ({
      ...prev,
      [field]: values
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
            <div>
              {/* 優化後的選擇器，只保留一個分類選擇 */}
              <DiagnosisFormSelect
                placeholder="從分類選擇左手脈象"
                options={pulseOptions}
                value={observationData.leftPulse.map(value => ({ label: value, value }))}
                onChange={(selected) => handleDiagnosisSelectChange('leftPulse', selected)}
                isMulti={true}
                allowCreation={true}
                className="w-full"
                noOptionsMessage="無符合的脈象，可直接輸入新增"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">右手脈象（多選）</label>
            <div>
              {/* 優化後的選擇器，只保留一個分類選擇 */}
              <DiagnosisFormSelect
                placeholder="從分類選擇右手脈象"
                options={pulseOptions}
                value={observationData.rightPulse.map(value => ({ label: value, value }))}
                onChange={(selected) => handleDiagnosisSelectChange('rightPulse', selected)}
                isMulti={true}
                allowCreation={true}
                className="w-full"
                noOptionsMessage="無符合的脈象，可直接輸入新增"
              />
            </div>
          </div>
        </div>

        {/* 舌診區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌質（多選）</label>
            <div>
              {/* 優化後的選擇器，只保留一個分類選擇 */}
              <DiagnosisFormSelect
                placeholder="從分類選擇舌質"
                options={tongueQualityOptions}
                value={observationData.tongueQuality.map(value => ({ label: value, value }))}
                onChange={(selected) => handleDiagnosisSelectChange('tongueQuality', selected)}
                isMulti={true}
                allowCreation={true}
                className="w-full"
                noOptionsMessage="無符合的舌質，可直接輸入新增"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌型（多選）</label>
            <div>
              {/* 優化後的選擇器，只保留一個分類選擇 */}
              <DiagnosisFormSelect
                placeholder="從分類選擇舌型"
                options={tongueShapeOptions}
                value={observationData.tongueShape.map(value => ({ label: value, value }))}
                onChange={(selected) => handleDiagnosisSelectChange('tongueShape', selected)}
                isMulti={true}
                allowCreation={true}
                className="w-full"
                noOptionsMessage="無符合的舌型，可直接輸入新增"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌色（多選）</label>
            <div>
              {/* 優化後的選擇器，只保留一個分類選擇 */}
              <DiagnosisFormSelect
                placeholder="從分類選擇舌色"
                options={tongueColorOptions}
                value={observationData.tongueColor.map(value => ({ label: value, value }))}
                onChange={(selected) => handleDiagnosisSelectChange('tongueColor', selected)}
                isMulti={true}
                allowCreation={true}
                className="w-full"
                noOptionsMessage="無符合的舌色，可直接輸入新增"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">舌苔（多選）</label>
            <div>
              {/* 優化後的選擇器，只保留一個分類選擇 */}
              <DiagnosisFormSelect
                placeholder="從分類選擇舌苔"
                options={tongueCoatingOptions}
                value={observationData.tongueCoating.map(value => ({ label: value, value }))}
                onChange={(selected) => handleDiagnosisSelectChange('tongueCoating', selected)}
                isMulti={true}
                allowCreation={true}
                className="w-full"
                noOptionsMessage="無符合的舌苔，可直接輸入新增"
              />
            </div>
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