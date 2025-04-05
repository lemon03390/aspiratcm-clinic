"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PatientCreateRequest, ReferenceData } from '../types';
import RegionSelector from './RegionSelector';
import { createPatient, getReferenceData, checkIdNumber } from '../services/api';

const PatientForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [isInitialVisit, setIsInitialVisit] = useState<boolean>(true);
  
  // 表單數據
  const [formData, setFormData] = useState<PatientCreateRequest>({
    chinese_name: '',
    english_name: '',
    id_number: '',
    birth_date: '',
    phone_number: '',
    email: '',
    basic_diseases: ['我沒有任何基礎病'],
    drug_allergies: ['我沒有任何藥物過敏'],
    food_allergies: ['我沒有任何食物過敏'],
    has_appointment: false,
    doctor_id: undefined,
    data_source: '',
    region: '',
    district: '',
    sub_district: '',
  });

  // 加載參考數據
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const data = await getReferenceData();
        setReferenceData(data);
      } catch (error) {
        console.error('獲取參考數據失敗:', error);
        setMessage({
          type: 'error',
          text: '無法加載參考數據，請刷新頁面重試。'
        });
      }
    };

    fetchReferenceData();
  }, []);

  // 每次修改身份證號碼後，自動檢查是否已存在
  useEffect(() => {
    const checkExistingPatient = async () => {
      if (formData.id_number.length >= 8) {
        try {
          const response = await checkIdNumber(formData.id_number);
          if (response.exists) {
            setMessage({
              type: 'error',
              text: '此身份證/護照號碼已存在，請選擇複診或修改號碼。'
            });
            // 可以選擇在這裡自動切換到複診模式並加載患者資料
            // setIsInitialVisit(false);
            // setFormData({...response.patient});
          } else {
            setMessage(null);
          }
        } catch (error) {
          console.error('檢查患者錯誤:', error);
        }
      }
    };
    
    if (isInitialVisit) {
      const debounceTimeout = setTimeout(checkExistingPatient, 500);
      return () => clearTimeout(debounceTimeout);
    }
  }, [formData.id_number, isInitialVisit]);

  // 處理表單輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 處理複選框變更
  const handleCheckboxChange = (
    field: 'basic_diseases' | 'drug_allergies' | 'food_allergies',
    option: string,
    isChecked: boolean
  ) => {
    setFormData(prev => {
      let updatedOptions = [...prev[field]];
      
      // 處理"無"選項與其他選項的互斥關係
      const isNoneOption = option.includes('我沒有');
      
      if (isChecked) {
        // 如果選中的是"無"選項，則清除其他所有選項
        if (isNoneOption) {
          updatedOptions = [option];
        } else {
          // 如果選中的是其他選項，則移除"無"選項
          updatedOptions = updatedOptions.filter(item => !item.includes('我沒有'));
          // 然後添加新選中的選項
          updatedOptions.push(option);
        }
      } else {
        // 取消選中時，從列表中移除該選項
        updatedOptions = updatedOptions.filter(item => item !== option);
        
        // 如果移除後沒有選項，則添加"無"選項
        if (updatedOptions.length === 0) {
          updatedOptions = field === 'basic_diseases' 
            ? ['我沒有任何基礎病']
            : field === 'drug_allergies'
            ? ['我沒有任何藥物過敏']
            : ['我沒有任何食物過敏'];
        }
      }
      
      return {
        ...prev,
        [field]: updatedOptions
      };
    });
  };

  // 處理地區選擇變更
  const handleRegionChange = (value: { region: string; district: string; subDistrict: string }) => {
    setFormData(prev => ({
      ...prev,
      region: value.region,
      district: value.district,
      sub_district: value.subDistrict
    }));
  };

  // 表單提交處理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // 驗證必填欄位
      const requiredFields: (keyof PatientCreateRequest)[] = [
        'chinese_name', 'english_name', 'id_number', 'birth_date', 
        'phone_number', 'data_source', 'region', 'district', 'sub_district'
      ];
      
      const missingFields = requiredFields.filter(field => !formData[field]);
      if (missingFields.length > 0) {
        setMessage({
          type: 'error',
          text: `以下欄位為必填: ${missingFields.join(', ')}`
        });
        setIsLoading(false);
        return;
      }
      
      // 驗證至少有一個選擇
      if (formData.basic_diseases.length === 0 || 
          formData.drug_allergies.length === 0 || 
          formData.food_allergies.length === 0) {
        setMessage({
          type: 'error',
          text: '基礎疾病、藥物過敏和食物過敏欄位必須至少選擇一項'
        });
        setIsLoading(false);
        return;
      }

      // 提交表單數據
      const response = await createPatient(formData);
      
      setMessage({
        type: 'success',
        text: `患者登記成功！掛號編號: ${response.registration_number}`
      });
      
      // 重置表單
      setFormData({
        chinese_name: '',
        english_name: '',
        id_number: '',
        birth_date: '',
        phone_number: '',
        email: '',
        basic_diseases: ['我沒有任何基礎病'],
        drug_allergies: ['我沒有任何藥物過敏'],
        food_allergies: ['我沒有任何食物過敏'],
        has_appointment: false,
        doctor_id: undefined,
        data_source: '',
        region: '',
        district: '',
        sub_district: '',
      });
      
      // 可選: 跳轉到患者詳情頁
      // router.push(`/patient_registration/${response.id}`);
    } catch (error: any) {
      console.error('提交患者登記表單錯誤:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || '患者登記失敗，請稍後再試'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!referenceData) {
    return <div className="p-4 text-center">加載中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">患者登記表</h2>
      
      {/* 狀態消息 */}
      {message && (
        <div className={`p-4 mb-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="mb-4">
        <label className="inline-flex items-center mr-6">
          <input
            type="radio"
            name="visit_type"
            checked={isInitialVisit}
            onChange={() => setIsInitialVisit(true)}
            className="form-radio h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-gray-700">初診</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="visit_type"
            checked={!isInitialVisit}
            onChange={() => setIsInitialVisit(false)}
            className="form-radio h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-gray-700">複診</span>
        </label>
      </div>
      
      {!isInitialVisit && (
        <div className="mb-4 p-4 bg-yellow-50 rounded-md">
          <p className="text-yellow-800">請輸入患者的身份證號碼或掛號編號查詢現有記錄。</p>
          {/* 這裡可以添加查詢界面 */}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              中文姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="chinese_name"
              value={formData.chinese_name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              英文姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="english_name"
              value={formData.english_name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              身份證/護照號碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="id_number"
              value={formData.id_number}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              出生日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              聯絡電話 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電郵地址
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        {/* 資料來源 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            資料來源 <span className="text-red-500">*</span>
          </label>
          <select
            name="data_source"
            value={formData.data_source}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          >
            <option value="">請選擇資料來源</option>
            {referenceData.data_sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>
        
        {/* 基礎疾病 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            基礎疾病 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {referenceData.basic_diseases.map((disease) => (
              <label key={disease} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.basic_diseases.includes(disease)}
                  onChange={(e) => handleCheckboxChange('basic_diseases', disease, e.target.checked)}
                  className="form-checkbox h-5 w-5 text-indigo-600"
                />
                <span className="ml-2 text-gray-700">{disease}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 藥物過敏 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            藥物過敏 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {referenceData.drug_allergies.map((allergy) => (
              <label key={allergy} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.drug_allergies.includes(allergy)}
                  onChange={(e) => handleCheckboxChange('drug_allergies', allergy, e.target.checked)}
                  className="form-checkbox h-5 w-5 text-indigo-600"
                />
                <span className="ml-2 text-gray-700">{allergy}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 食物過敏 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            食物過敏 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {referenceData.food_allergies.map((allergy) => (
              <label key={allergy} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.food_allergies.includes(allergy)}
                  onChange={(e) => handleCheckboxChange('food_allergies', allergy, e.target.checked)}
                  className="form-checkbox h-5 w-5 text-indigo-600"
                />
                <span className="ml-2 text-gray-700">{allergy}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 區域選擇器 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            居住地區 <span className="text-red-500">*</span>
          </label>
          <RegionSelector
            regions={referenceData.regions}
            value={{
              region: formData.region,
              district: formData.district,
              subDistrict: formData.sub_district
            }}
            onChange={handleRegionChange}
            required
          />
        </div>
        
        {/* 提交按鈕 */}
        <div className="pt-4 flex justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '處理中...' : '提交患者登記'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm; 