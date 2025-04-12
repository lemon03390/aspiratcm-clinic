"use client";
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PatientCreateRequest, ReferenceData } from '../types';
import RegionSelector from './RegionSelector';
import { createPatient, getReferenceData, checkIdNumber, getPatientByPhoneNumber } from '../services/api';
import { getBackendUrl } from '../../../libs/apiClient';

// 錯誤邊界組件
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PatientForm 錯誤邊界捕獲到錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <h3 className="text-lg font-medium mb-2">發生錯誤</h3>
          <p className="mb-4">很抱歉，表單處理過程中發生錯誤。</p>
          <details className="text-sm text-red-600">
            <summary>錯誤詳情</summary>
            <pre className="mt-2 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重新載入頁面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PatientForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [isInitialVisit, setIsInitialVisit] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fieldsReadOnly, setFieldsReadOnly] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    chinese_name: string;
    registration_number: string;
    doctor_name: string;
    registration_time: string;
  } | null>(null);
  
  // 添加健康資訊顯示控制
  const [hasBasicDisease, setHasBasicDisease] = useState<boolean>(false);
  const [hasDrugAllergy, setHasDrugAllergy] = useState<boolean>(false);
  const [hasFoodAllergy, setHasFoodAllergy] = useState<boolean>(false);
  
  // 添加其他描述輸入框狀態
  const [otherBasicDisease, setOtherBasicDisease] = useState<string>('');
  const [otherDrugAllergy, setOtherDrugAllergy] = useState<string>('');
  const [otherFoodAllergy, setOtherFoodAllergy] = useState<string>('');
  
  // 表單數據
  const [formData, setFormData] = useState<PatientCreateRequest>({
    chinese_name: '',
    english_name: '',
    id_number: '',
    birth_date: '',
    phone_number: '',
    email: 'no@no.com', // 確保初始值為 no@no.com
    gender: '',
    basic_diseases: ['我沒有任何基礎病'],
    drug_allergies: ['我沒有任何藥物過敏'],
    food_allergies: ['我沒有任何食物過敏'],
    note: '', // 新增備註欄位
    has_appointment: false,
    doctor_id: undefined,
    data_source: '',
    region: '',
    district: '',
    sub_district: '',
    chief_complaint: '', // 新增主訴欄位
  });

  // 加載參考數據
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        // 清除可能的 Service Worker 緩存
        if ('serviceWorker' in navigator) {
          try {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              registrations.forEach(registration => {
                console.log('🧹 清除 Service Worker 緩存:', registration);
                registration.unregister();
              });
            });
          } catch (e) {
            console.warn('無法清除 Service Worker 緩存:', e);
          }
        }

        // 測試 URL 生成
        const testUrl = getBackendUrl('/patient_registration/reference-data/');
        console.log("🔍 測試 URL 生成:", testUrl);
        console.log("🔍 window.location.origin =", window.location.origin);
        console.log("🔍 window.location.protocol =", window.location.protocol);
        
        if (testUrl.startsWith('http:')) {
          console.error("⛔ URL 協議錯誤，使用了 HTTP:", testUrl);
        }
        
        // 附加時間戳以避免緩存
        console.log("🕒 正在請求參考數據，時間戳:", new Date().toISOString());
        const data = await getReferenceData();
        console.log("✅ 成功獲取參考數據!", data);
        
        // 如果 API 返回的 doctors 不是數組或為空，嘗試從直接獲取醫師資料
        let doctorsData = data.doctors;
        
        if (!doctorsData || !Array.isArray(doctorsData) || doctorsData.length === 0) {
          console.warn("⚠️ 未能從 API 獲取醫師數據，嘗試獲取緊急備用方案");
          try {
            // 方案一：直接添加已知的郭鎮峰醫師資料
            doctorsData = [
              { id: 1, name: "郭鎮峰", specialty: "中醫師" }
            ];
            console.log("✅ 使用硬編碼的醫師資料:", doctorsData);
            data.doctors = doctorsData;
          } catch (e) {
            console.error("❌ 緊急備用方案失敗:", e);
          }
        }
        
        // 新增：日誌醫師數據
        if (data.doctors && data.doctors.length > 0) {
          console.log("👨‍⚕️ 成功載入醫師數據:", data.doctors);
        } else {
          console.warn("⚠️ 醫師數據為空或不存在:", data.doctors);
        }
        
        setReferenceData(data);
      } catch (error) {
        console.error('❌ 獲取參考數據失敗:', error);
        // 嘗試記錄更多錯誤信息
        if (error instanceof Error) {
          console.error('錯誤名稱:', error.name);
          console.error('錯誤訊息:', error.message);
          console.error('錯誤堆疊:', error.stack);
        }
        
        // 創建一個基本的參考資料對象，包含默認醫師列表
        const fallbackData: ReferenceData = {
          basic_diseases: ['我沒有任何基礎病', '高血壓', '糖尿病', '心臟病', '其他，請列明'],
          drug_allergies: ['我沒有任何藥物過敏', '青黴素', '非類固醇消炎藥', '其他藥物，請列明'],
          food_allergies: ['我沒有任何食物過敏', '海鮮', '堅果', '其他食物，請列明'],
          data_sources: ['朋友介紹', '網絡', 'Instagram', 'Facebook'],
          regions: { '香港': { '中西區': ['中環', '上環'] } },
          doctors: [
            { id: 1, name: "郭鎮峰", specialty: "中醫師" }
          ]
        };
        console.log("🔄 使用後備參考資料:", fallbackData);
        setReferenceData(fallbackData);
        
        setMessage({
          type: 'error',
          text: '無法加載參考數據，已使用基本資料。您可以繼續填寫表單，但若無法提交請刷新頁面重試。'
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
    console.log(`複選框變更: ${field}, ${option}, ${isChecked}`); // 新增日誌
    
    setFormData(prev => {
      let updatedOptions = [...prev[field]];
      
      // 處理"無"選項與其他選項的互斥關係
      const isNoneOption = option.includes('我沒有');
      const isOtherOption = option.includes('其他');
      
      if (isChecked) {
        // 如果選中的是"無"選項，則清除其他所有選項
        if (isNoneOption) {
          updatedOptions = [option];
          
          // 清空所有「其他」輸入框的值
          if (field === 'basic_diseases') {
            setOtherBasicDisease('');
          } else if (field === 'drug_allergies') {
            setOtherDrugAllergy('');
          } else if (field === 'food_allergies') {
            setOtherFoodAllergy('');
          }
        } else {
          // 如果選中的是其他選項，則移除"無"選項
          updatedOptions = updatedOptions.filter(item => !item.includes('我沒有'));
          // 然後添加新選中的選項
          updatedOptions.push(option);
        }
      } else {
        // 取消選中時，從列表中移除該選項
        updatedOptions = updatedOptions.filter(item => item !== option);
        
        // 如果是取消勾選的是「其他」相關選項，清空對應的輸入框
        if (isOtherOption) {
          if (field === 'basic_diseases') {
            setOtherBasicDisease('');
          } else if (field === 'drug_allergies') {
            setOtherDrugAllergy('');
          } else if (field === 'food_allergies') {
            setOtherFoodAllergy('');
          }
        }
        
        // 如果移除後沒有選項，則添加"無"選項
        if (updatedOptions.length === 0) {
          updatedOptions = field === 'basic_diseases' 
            ? ['我沒有任何基礎病']
            : field === 'drug_allergies'
            ? ['我沒有任何藥物過敏']
            : ['我沒有任何食物過敏'];
        }
      }
      
      // 日誌最終選項狀態
      console.log(`${field} 最終選項:`, updatedOptions);
      
      return {
        ...prev,
        [field]: updatedOptions
      };
    });
  };

  // 處理「其他，請列明」的輸入變更
  const handleOtherInputChange = (
    field: 'basic_diseases' | 'drug_allergies' | 'food_allergies',
    value: string
  ) => {
    const otherOption = field === 'basic_diseases' 
      ? '其他，請列明' 
      : field === 'drug_allergies' 
      ? '其他藥物，請列明' 
      : '其他食物，請列明';
    
    console.log(`其他選項輸入變更: ${field}, "${otherOption}", 值: "${value}"`);
    
    // 更新相應的其他描述輸入框狀態
    if (field === 'basic_diseases') {
      setOtherBasicDisease(value);
    } else if (field === 'drug_allergies') {
      setOtherDrugAllergy(value);
    } else {
      setOtherFoodAllergy(value);
    }
    
    // 確保「其他，請列明」選項被選中
    if (!formData[field].includes(otherOption)) {
      console.log(`強制將 "${otherOption}" 選項添加到 ${field}`);
      
      // 修改：無論有沒有值，都確保選項被選中
      setFormData(prev => {
        // 先移除「我沒有...」選項
        const filteredOptions = prev[field].filter(item => !item.includes('我沒有'));
        
        // 然後添加「其他」選項（如果尚未存在）
        if (!filteredOptions.includes(otherOption)) {
          return {
            ...prev,
            [field]: [...filteredOptions, otherOption]
          };
        }
        
        return prev;
      });
    }
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

  // 處理模式切換 - 初診/覆診
  const handleVisitTypeChange = (isInitial: boolean) => {
    setIsInitialVisit(isInitial);
    if (isInitial) {
      // 切換到初診模式時重置表單
      setFormData({
        chinese_name: '',
        english_name: '',
        id_number: '',
        birth_date: '',
        phone_number: '',
        email: 'no@no.com', // 設置為 no@no.com 而非空字串
        gender: '',
        basic_diseases: ['我沒有任何基礎病'],
        drug_allergies: ['我沒有任何藥物過敏'],
        food_allergies: ['我沒有任何食物過敏'],
        note: '',
        has_appointment: false,
        doctor_id: undefined,
        data_source: '',
        region: '',
        district: '',
        sub_district: '',
        chief_complaint: '', // 重置主訴欄位
      });
      setOtherBasicDisease('');
      setOtherDrugAllergy('');
      setOtherFoodAllergy('');
      setMessage(null);
      // 重要：清除唯讀狀態
      setFieldsReadOnly(false);
      // 重設健康資訊狀態
      setHasBasicDisease(false);
      setHasDrugAllergy(false);
      setHasFoodAllergy(false);
    } else {
      // 切換到覆診模式時清空搜索欄位
      setSearchQuery('');
      setMessage({
        type: 'info',
        text: '請輸入身份證號碼或電話號碼查詢現有患者'
      });
      
      // 自動聚焦到搜索欄
      setTimeout(() => {
        const searchInput = document.getElementById('patient-search');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  };

  // 處理覆診患者搜索
  const handlePatientSearch = async () => {
    if (!searchQuery || searchQuery.length < 5) {
      setMessage({
        type: 'error',
        text: '請輸入有效的身份證號碼或電話號碼'
      });
      return;
    }

    setIsLoading(true);
    try {
      let patient;
      
      // 判斷是身份證還是電話號碼
      if (/^\d+$/.test(searchQuery)) {
        // 全數字，可能是電話號碼
        patient = await getPatientByPhoneNumber(searchQuery);
      } else {
        // 否則視為身份證號碼
        const response = await checkIdNumber(searchQuery);
        if (response.exists && response.patient) {
          patient = response.patient;
        } else {
          throw new Error('找不到此身份證對應的患者記錄');
        }
      }

      // 填充表單數據
      setFormData({
        chinese_name: patient.chinese_name,
        english_name: patient.english_name,
        id_number: patient.id_number,
        birth_date: patient.birth_date,
        phone_number: patient.phone_number,
        email: patient.email || '',
        gender: patient.gender || '',
        basic_diseases: patient.basic_diseases,
        drug_allergies: patient.drug_allergies,
        food_allergies: patient.food_allergies,
        note: patient.note || '',
        has_appointment: patient.has_appointment,
        doctor_id: patient.doctor_id,
        data_source: patient.data_source,
        region: patient.region,
        district: patient.district,
        sub_district: patient.sub_district,
        chief_complaint: patient.chief_complaint || '', // 設置主訴欄位
      });
      
      // 檢查是否有「其他，請列明」項目，如有則提取內容到對應輸入框狀態
      processOtherItems(patient.basic_diseases, 'basic_diseases');
      processOtherItems(patient.drug_allergies, 'drug_allergies');
      processOtherItems(patient.food_allergies, 'food_allergies');
      
      // 設置健康資訊狀態
      setHasBasicDisease(!patient.basic_diseases.some(d => d.includes('我沒有')));
      setHasDrugAllergy(!patient.drug_allergies.some(d => d.includes('我沒有')));
      setHasFoodAllergy(!patient.food_allergies.some(d => d.includes('我沒有')));

      // 設置欄位為唯讀，但主診醫師可選
      setFieldsReadOnly(true);

      setMessage({
        type: 'success',
        text: `已找到患者: ${patient.chinese_name} (${patient.registration_number})`
      });
    } catch (error: any) {
      console.error('查詢患者失敗:', error);
      setMessage({
        type: 'error',
        text: error.message || '無法找到患者記錄，請檢查輸入或轉為初診'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 允許重新編輯覆診患者資料
  const handleEditFields = () => {
    setFieldsReadOnly(false);
    setMessage({
      type: 'info',
      text: '您現在可以編輯患者資料'
    });
  };

  // 從現有數據中提取「其他，請列明」的內容
  const processOtherItems = (items: string[], field: 'basic_diseases' | 'drug_allergies' | 'food_allergies') => {
    // 檢查不同格式的「其他」選項
    const otherItem = items.find(item => 
      item.startsWith('其他:') || 
      item.startsWith('其他，請列明:') || 
      item.startsWith('其他藥物:') || 
      item.startsWith('其他食物:')
    );
    
    if (!otherItem) {
      return;
    }
    
    let otherValue = '';
    if (otherItem.startsWith('其他:')) {
      otherValue = otherItem.replace('其他:', '').trim();
    } else if (otherItem.startsWith('其他，請列明:')) {
      otherValue = otherItem.replace('其他，請列明:', '').trim();
    } else if (otherItem.startsWith('其他藥物:')) {
      otherValue = otherItem.replace('其他藥物:', '').trim();
    } else if (otherItem.startsWith('其他食物:')) {
      otherValue = otherItem.replace('其他食物:', '').trim();
    }
    
    if (field === 'basic_diseases') {
      setOtherBasicDisease(otherValue);
      // 在表單數據中替換為「其他，請列明」選項
      setFormData(prev => ({
        ...prev,
        [field]: [
          ...prev[field].filter(item => 
            !item.startsWith('其他:') && 
            !item.startsWith('其他，請列明:')
          ), 
          '其他疾病，請列明'
        ]
      }));
    } else if (field === 'drug_allergies') {
      setOtherDrugAllergy(otherValue);
      setFormData(prev => ({
        ...prev,
        [field]: [
          ...prev[field].filter(item => 
            !item.startsWith('其他藥物:') && 
            !item.startsWith('其他，請列明:')
          ), 
          '其他藥物，請列明'
        ]
      }));
    } else if (field === 'food_allergies') {
      setOtherFoodAllergy(otherValue);
      setFormData(prev => ({
        ...prev,
        [field]: [
          ...prev[field].filter(item => 
            !item.startsWith('其他食物:') && 
            !item.startsWith('其他，請列明:')
          ), 
          '其他食物，請列明'
        ]
      }));
    }
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setSuccessData(null); // 重置成功數據

    try {
      // 初診和覆診都需要選擇醫師
      if (!formData.doctor_id) {
        setMessage({
          type: 'error',
          text: '請選擇醫師'
        });
        setIsLoading(false);
        return;
      }

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
      
      // 新增: 使用正則表達式驗證中英文姓名格式
      const chineseNameRegex = /^[\u4e00-\u9fa5]{2,10}$/;
      if (!chineseNameRegex.test(formData.chinese_name)) {
        setMessage({
          type: 'error',
          text: '中文姓名必須為2-10個中文字'
        });
        setIsLoading(false);
        return;
      }

      const englishNameRegex = /^[A-Za-z\s]+$/;
      if (!englishNameRegex.test(formData.english_name)) {
        setMessage({
          type: 'error',
          text: '英文姓名只能包含英文字母和空格'
        });
        setIsLoading(false);
        return;
      }

      // 初始化處理後的數據
      const processedData = { ...formData };

      // 強制處理 email 欄位 - 確保空欄位轉為 no@no.com
      console.log("處理 email 之前:", processedData.email, typeof processedData.email);
      
      // 明確檢查所有可能的空值情況，並確保使用特定的 no@no.com 值
      if (processedData.email === undefined || 
          processedData.email === null || 
          processedData.email === '' || 
          processedData.email === 'undefined' ||
          (typeof processedData.email === 'string' && processedData.email.trim() === '')) {
        console.log("Email 欄位無效，設置為 no@no.com");
        processedData.email = 'no@no.com';
      } else if (typeof processedData.email === 'string' && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(processedData.email)) {
        console.log("Email 格式不正確:", processedData.email);
        console.log("自動轉換為 no@no.com");
        processedData.email = 'no@no.com';
      }
      
      console.log("處理 email 之後:", processedData.email);

      // 處理基礎疾病
      if (processedData.basic_diseases.includes('其他，請列明') && otherBasicDisease.trim()) {
        // 創建新的陣列，避免修改原有陣列
        const newBasicDiseases = [...processedData.basic_diseases];
        // 找到「其他，請列明」的索引位置
        const otherIndex = newBasicDiseases.indexOf('其他，請列明');
        // 將「其他，請列明」替換為格式化的字符串 - 修正格式
        if (otherIndex !== -1) {
          newBasicDiseases[otherIndex] = `其他，請列明: ${otherBasicDisease.trim()}`;
          processedData.basic_diseases = newBasicDiseases;
        }
      } else if (processedData.basic_diseases.includes('其他，請列明')) {
        // 若沒有填寫「其他」內容，則移除「其他」選項
        processedData.basic_diseases = processedData.basic_diseases.filter(d => d !== '其他，請列明');
        
        // 如果移除後沒有選項，則添加"無"選項
        if (processedData.basic_diseases.length === 0) {
          processedData.basic_diseases = ['我沒有任何基礎病'];
        }
      }
      
      // 處理藥物過敏
      if (processedData.drug_allergies.includes('其他藥物，請列明') && otherDrugAllergy.trim()) {
        // 創建新的陣列，避免修改原有陣列
        const newDrugAllergies = [...processedData.drug_allergies];
        // 找到「其他藥物，請列明」的索引位置
        const otherIndex = newDrugAllergies.indexOf('其他藥物，請列明');
        // 將「其他藥物，請列明」替換為格式化的字符串
        if (otherIndex !== -1) {
          newDrugAllergies[otherIndex] = `其他藥物: ${otherDrugAllergy.trim()}`;
          processedData.drug_allergies = newDrugAllergies;
        }
      } else if (processedData.drug_allergies.includes('其他藥物，請列明')) {
        // 若沒有填寫「其他」內容，則移除「其他」選項
        processedData.drug_allergies = processedData.drug_allergies.filter(d => d !== '其他藥物，請列明');
        
        // 如果移除後沒有選項，則添加"無"選項
        if (processedData.drug_allergies.length === 0) {
          processedData.drug_allergies = ['我沒有任何藥物過敏'];
        }
      }
      
      // 處理食物過敏
      if (processedData.food_allergies.includes('其他食物，請列明') && otherFoodAllergy.trim()) {
        // 創建新的陣列，避免修改原有陣列
        const newFoodAllergies = [...processedData.food_allergies];
        // 找到「其他食物，請列明」的索引位置
        const otherIndex = newFoodAllergies.indexOf('其他食物，請列明');
        // 將「其他食物，請列明」替換為格式化的字符串
        if (otherIndex !== -1) {
          newFoodAllergies[otherIndex] = `其他食物: ${otherFoodAllergy.trim()}`;
          processedData.food_allergies = newFoodAllergies;
        }
      } else if (processedData.food_allergies.includes('其他食物，請列明')) {
        // 若沒有填寫「其他」內容，則移除「其他」選項
        processedData.food_allergies = processedData.food_allergies.filter(d => d !== '其他食物，請列明');
        
        // 如果移除後沒有選項，則添加"無"選項
        if (processedData.food_allergies.length === 0) {
          processedData.food_allergies = ['我沒有任何食物過敏'];
        }
      }

      console.log('✅ 嘗試提交表單數據:', JSON.stringify(processedData));
      console.log('確認 Email 值:', processedData.email);
      
      // 最終安全檢查，確保 email 存在且格式正確
      if (!processedData.email || processedData.email === '' || typeof processedData.email !== 'string') {
        processedData.email = 'no@no.com';
        console.log('最終安全檢查: 設置 email 為 no@no.com');
      }
      
      // 提交表單數據
      const response = await createPatient(processedData);
      
      console.log('✅ 患者創建成功:', response);
      
      // 保存成功的數據，用於顯示成功卡片
      const doctorName = referenceData?.doctors?.find(d => d.id === formData.doctor_id)?.name || '未知醫師';
      setSuccessData({
        chinese_name: formData.chinese_name,
        registration_number: response.registration_number,
        doctor_name: doctorName,
        registration_time: new Date().toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      setMessage({
        type: 'success',
        text: `患者登記成功！掛號編號: ${response.registration_number}`
      });
      
      // 清空基本表單狀態
      setFieldsReadOnly(false);
      setOtherBasicDisease('');
      setOtherDrugAllergy('');
      setOtherFoodAllergy('');
      
    } catch (error: any) {
      console.error('❌ 提交患者登記表單錯誤:', error);
      
      // 處理驗證錯誤 - 來自我們的增強型 API 錯誤
      if (error.isValidationError || (error.response && error.response.status === 422)) {
        // 檢查是否有結構化的驗證錯誤
        if (error.validationErrors && Object.keys(error.validationErrors).length > 0) {
          // 格式化驗證錯誤信息
          const errorDetails = Object.entries(error.validationErrors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n');
          
          setMessage({
            type: 'error',
            text: `請檢查以下欄位:\n${errorDetails}`
          });
        } else if (error.response?.data?.detail) {
          // 後端返回的詳細錯誤
          let errorMsg = '';
          
          // 處理 Pydantic 驗證錯誤數組
          if (Array.isArray(error.response.data.detail)) {
            errorMsg = error.response.data.detail
              .map((err: any) => {
                const field = err.loc && err.loc.length > 1 
                  ? err.loc.slice(1).join('.') 
                  : '未知欄位';
                return `${field}: ${err.msg}`;
              })
              .join('\n');
          } else {
            errorMsg = error.response.data.detail;
          }
          
          setMessage({
            type: 'error',
            text: `資料驗證失敗:\n${errorMsg}`
          });
        } else {
          // 一般驗證錯誤
          setMessage({
            type: 'error',
            text: error.message || '資料驗證失敗，請檢查輸入'
          });
        }
      } else if (error.isNetworkError) {
        // 網絡錯誤
        setMessage({
          type: 'error',
          text: '連接伺服器失敗，請檢查網絡連接並稍後再試'
        });
      } else if (error.response) {
        // 其他 HTTP 錯誤
        setMessage({
          type: 'error',
          text: `伺服器錯誤 (${error.response.status}): ${
            error.response.data?.detail || 
            error.response.data?.message || 
            error.message || 
            '請稍後再試'
          }`
        });
      } else {
        // 未知錯誤
        setMessage({
          type: 'error',
          text: `錯誤: ${error.message || '提交表單時發生未知錯誤'}`
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 在 render 函數部分加入調試輸出
  useEffect(() => {
    // 輸出當前表單中與"其他"選項相關的狀態
    console.log('當前表單狀態:');
    console.log('- 基礎疾病:', formData.basic_diseases);
    console.log('- 藥物過敏:', formData.drug_allergies);
    console.log('- 食物過敏:', formData.food_allergies);
    console.log('- 其他基礎疾病值:', otherBasicDisease);
    console.log('- 其他藥物過敏值:', otherDrugAllergy);
    console.log('- 其他食物過敏值:', otherFoodAllergy);
  }, [formData.basic_diseases, formData.drug_allergies, formData.food_allergies, 
      otherBasicDisease, otherDrugAllergy, otherFoodAllergy]);

  // 添加測試用的渲染檢查
  useEffect(() => {
    // 檢查藥物過敏和食物過敏的「其他」選項是否被正確處理
    const hasDrugOther = formData.drug_allergies.includes('其他藥物，請列明');
    const hasFoodOther = formData.food_allergies.includes('其他食物，請列明');
    
    console.log('渲染檢查:');
    console.log('- 藥物過敏包含「其他」選項:', hasDrugOther);
    console.log('- 食物過敏包含「其他」選項:', hasFoodOther);
    
    // 檢查醫師下拉選單
    if (referenceData) {
      console.log('- 醫師列表狀態:', 
        referenceData.doctors ? 
        `有效 (${Array.isArray(referenceData.doctors) ? referenceData.doctors.length : '非數組'})` : 
        '無效'
      );
    }
  }, [formData.drug_allergies, formData.food_allergies, referenceData]);

  // 在頁面加載時添加錯誤處理與自動重試機制
  useEffect(() => {
    // 每次頁面加載時輸出當前的資料狀態
    console.log('初始化頁面狀態:');
    console.log('- 參考資料:', referenceData);
    console.log('- 表單數據:', formData);
    
    // 檢查醫師資料是否成功載入
    if (referenceData && (!referenceData.doctors || !Array.isArray(referenceData.doctors) || referenceData.doctors.length === 0)) {
      console.warn('⚠️ 醫師資料加載失敗，嘗試重新載入');
      
      // 設置自動重試計時器
      const retryTimer = setTimeout(async () => {
        try {
          console.log('🔄 自動重試載入醫師資料');
          const data = await getReferenceData();
          
          // 檢查重試後的資料是否有醫師
          if (data.doctors && Array.isArray(data.doctors) && data.doctors.length > 0) {
            console.log('✅ 重試成功，載入了醫師資料:', data.doctors);
            setReferenceData(data);
            setMessage({
              type: 'success',
              text: '醫師資料已自動更新'
            });
          } else {
            console.error('❌ 重試後仍無法獲取醫師資料');
            setMessage({
              type: 'error',
              text: '無法載入醫師資料，請點擊「重新載入醫師資料」按鈕嘗試手動更新'
            });
          }
        } catch (error) {
          console.error('❌ 自動重試載入醫師資料失敗:', error);
        }
      }, 3000); // 3秒後自動重試
      
      // 清除計時器
      return () => clearTimeout(retryTimer);
    }
  }, [referenceData]);

  // 處理健康資訊選擇
  const handleHealthOptionChange = (
    field: 'basic_diseases' | 'drug_allergies' | 'food_allergies',
    hasCondition: boolean
  ) => {
    if (field === 'basic_diseases') {
      setHasBasicDisease(hasCondition);
      if (!hasCondition) {
        // 重置為無疾病
        setFormData(prev => ({
          ...prev,
          basic_diseases: ['我沒有任何基礎病']
        }));
        setOtherBasicDisease('');
      } else {
        // 設置為空，等待用戶選擇
        setFormData(prev => ({
          ...prev,
          basic_diseases: []
        }));
      }
    } else if (field === 'drug_allergies') {
      setHasDrugAllergy(hasCondition);
      if (!hasCondition) {
        // 重置為無過敏
        setFormData(prev => ({
          ...prev,
          drug_allergies: ['我沒有任何藥物過敏']
        }));
        setOtherDrugAllergy('');
      } else {
        // 設置為空，等待用戶選擇
        setFormData(prev => ({
          ...prev,
          drug_allergies: []
        }));
      }
    } else if (field === 'food_allergies') {
      setHasFoodAllergy(hasCondition);
      if (!hasCondition) {
        // 重置為無過敏
        setFormData(prev => ({
          ...prev,
          food_allergies: ['我沒有任何食物過敏']
        }));
        setOtherFoodAllergy('');
      } else {
        // 設置為空，等待用戶選擇
        setFormData(prev => ({
          ...prev,
          food_allergies: []
        }));
      }
    }
  };

  // 顯示成功卡片
  const renderSuccessCard = () => {
    if (!successData) {
      return null;
    }
    
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6 border-2 border-green-500">
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">掛號成功</h2>
        </div>
        
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">患者姓名</p>
              <p className="text-lg font-medium">{successData.chinese_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">掛號編號</p>
              <p className="text-lg font-medium">{successData.registration_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">主診醫師</p>
              <p className="text-lg font-medium">{successData.doctor_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">登記時間</p>
              <p className="text-lg font-medium">{successData.registration_time}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setFormData({
                chinese_name: '',
                english_name: '',
                id_number: '',
                birth_date: '',
                phone_number: '',
                email: 'no@no.com',
                gender: '',
                basic_diseases: ['我沒有任何基礎病'],
                drug_allergies: ['我沒有任何藥物過敏'],
                food_allergies: ['我沒有任何食物過敏'],
                note: '',
                has_appointment: false,
                doctor_id: undefined,
                data_source: '',
                region: '',
                district: '',
                sub_district: '',
                chief_complaint: '', // 重置主訴欄位
              });
              setHasBasicDisease(false);
              setHasDrugAllergy(false);
              setHasFoodAllergy(false);
              setSuccessData(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            再登記一位病人
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            返回首頁
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (successData.registration_number) {
                router.push(`/patients/${successData.registration_number}`);
              } else {
                setMessage({
                  type: 'error',
                  text: '無法查看患者詳情：掛號編號不存在'
                });
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            查看患者詳情
          </button>
        </div>
      </div>
    );
  };

  if (!referenceData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-blue-200 mb-4"></div>
            <div className="h-4 w-48 bg-blue-200 rounded mb-2"></div>
            <div className="h-3 w-32 bg-blue-100 rounded"></div>
          </div>
        </div>
        <p className="text-center text-gray-500 mt-4">載入中，請稍候...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white shadow-md rounded-lg p-6">
        {/* 顯示成功卡片 */}
        {successData ? (
          renderSuccessCard()
        ) : (
          <form onSubmit={handleSubmit}>
            {message && (
              <div className={`mb-4 p-3 rounded-md ${
                message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <p className="whitespace-pre-line">{message.text}</p>
              </div>
            )}
            
            {/* 初診/複診切換 */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-lg font-bold">患者登記表</div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-md ${
                    isInitialVisit 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => handleVisitTypeChange(true)}
                >
                  初診
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-md ${
                    isInitialVisit 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white'
                  }`}
                  onClick={() => handleVisitTypeChange(false)}
                >
                  複診
                </button>
              </div>
            </div>
            
            {/* 複診搜尋 */}
            {!isInitialVisit && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-blue-700 mb-2">覆診病人需先輸入身份證或電話搜尋現有紀錄</div>
                <div className="flex gap-2">
                  <input
                    id="patient-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="輸入身份證號碼或電話號碼"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handlePatientSearch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isLoading ? '搜尋中...' : '搜尋'}
                  </button>
                </div>
              </div>
            )}
            
            {/* 覆診資料編輯控制 */}
            {!isInitialVisit && fieldsReadOnly && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleEditFields}
                  className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  重新編輯
                </button>
              </div>
            )}
            
            <h2 className="text-xl font-bold mb-4">基本資料</h2>
            
            {/* 基本資料區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 姓名欄位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  中文姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="chinese_name"
                  value={formData.chinese_name}
                  onChange={handleInputChange}
                  readOnly={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
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
                  readOnly={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  身份證號碼 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  readOnly={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
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
                  readOnly={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手機號碼 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  readOnly={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電子郵件 (選填)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email === 'no@no.com' ? '' : formData.email}
                  onChange={handleInputChange}
                  readOnly={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="輸入電子郵件或留空"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  性別 <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">請選擇</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  從何得知本診所 <span className="text-red-500">*</span>
                </label>
                <select
                  name="data_source"
                  value={formData.data_source}
                  onChange={handleInputChange}
                  disabled={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                >
                  <option value="">請選擇</option>
                  {referenceData.data_sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-4">居住地區</h2>
            
            {/* 區域選擇器 */}
            <div className="mb-6">
              <RegionSelector
                regions={referenceData.regions}
                onChange={handleRegionChange}
                value={{
                  region: formData.region,
                  district: formData.district,
                  subDistrict: formData.sub_district
                }}
                required
                readOnly={fieldsReadOnly}
              />
            </div>
            
            <h2 className="text-xl font-bold mb-4">健康資訊</h2>
            
            {/* 健康資訊區塊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 健康資訊選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  是否有基礎疾病 <span className="text-red-500">*</span>
                </label>
                <select
                  name="has_basic_disease"
                  value={hasBasicDisease ? '是' : '否'}
                  onChange={(e) => {
                    const value = e.target.value === '是';
                    setHasBasicDisease(value);
                    if (!value) {
                      setFormData(prev => ({
                        ...prev,
                        basic_diseases: ['我沒有任何基礎病']
                      }));
                      setOtherBasicDisease('');
                    }
                  }}
                  disabled={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                >
                  <option value="">請選擇</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  是否有藥物過敏 <span className="text-red-500">*</span>
                </label>
                <select
                  name="has_drug_allergy"
                  value={hasDrugAllergy ? '是' : '否'}
                  onChange={(e) => {
                    const value = e.target.value === '是';
                    setHasDrugAllergy(value);
                    if (!value) {
                      setFormData(prev => ({
                        ...prev,
                        drug_allergies: ['我沒有任何藥物過敏']
                      }));
                      setOtherDrugAllergy('');
                    }
                  }}
                  disabled={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                >
                  <option value="">請選擇</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  是否有食物過敏 <span className="text-red-500">*</span>
                </label>
                <select
                  name="has_food_allergy"
                  value={hasFoodAllergy ? '是' : '否'}
                  onChange={(e) => {
                    const value = e.target.value === '是';
                    setHasFoodAllergy(value);
                    if (!value) {
                      setFormData(prev => ({
                        ...prev,
                        food_allergies: ['我沒有任何食物過敏']
                      }));
                      setOtherFoodAllergy('');
                    }
                  }}
                  disabled={fieldsReadOnly}
                  className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                >
                  <option value="">請選擇</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
            </div>
            
            {/* 基礎疾病詳細選項 */}
            {hasBasicDisease && (
              <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="mb-2 font-medium">請選擇基礎疾病（可多選）</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {referenceData.basic_diseases
                    .filter(disease => !disease.includes('我沒有'))
                    .map((disease, idx) => (
                    <label key={`basic_disease_${idx}`} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.basic_diseases.includes(disease)}
                        onChange={(e) => handleCheckboxChange('basic_diseases', disease, e.target.checked)}
                        disabled={fieldsReadOnly}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{disease}</span>
                    </label>
                  ))}
                </div>
                
                {/* 其他基礎疾病輸入框 */}
                {formData.basic_diseases.includes('其他，請列明') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      其他基礎疾病，請列明
                    </label>
                    <input
                      type="text"
                      value={otherBasicDisease}
                      onChange={(e) => handleOtherInputChange('basic_diseases', e.target.value)}
                      disabled={fieldsReadOnly}
                      className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-gray-50'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="請詳細說明其他基礎疾病"
                    />
                    {formData.basic_diseases.includes('其他，請列明') && !otherBasicDisease && (
                      <p className="text-sm text-red-600 mt-1">請填寫基礎疾病細節</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* 藥物過敏詳細選項 */}
            {hasDrugAllergy && (
              <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="mb-2 font-medium">請選擇藥物過敏（可多選）</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {referenceData.drug_allergies
                    .filter(allergy => !allergy.includes('我沒有'))
                    .map((allergy, idx) => (
                    <label key={`drug_allergy_${idx}`} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.drug_allergies.includes(allergy)}
                        onChange={(e) => handleCheckboxChange('drug_allergies', allergy, e.target.checked)}
                        disabled={fieldsReadOnly}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{allergy}</span>
                    </label>
                  ))}
                </div>
                
                {/* 其他藥物過敏輸入框 */}
                {formData.drug_allergies.includes('其他藥物，請列明') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      其他藥物過敏，請列明
                    </label>
                    <input
                      type="text"
                      value={otherDrugAllergy}
                      onChange={(e) => handleOtherInputChange('drug_allergies', e.target.value)}
                      disabled={fieldsReadOnly}
                      className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-gray-50'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="請詳細說明其他藥物過敏"
                    />
                    {formData.drug_allergies.includes('其他藥物，請列明') && !otherDrugAllergy && (
                      <p className="text-sm text-red-600 mt-1">請填寫藥物過敏細節</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* 食物過敏詳細選項 */}
            {hasFoodAllergy && (
              <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="mb-2 font-medium">請選擇食物過敏（可多選）</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {referenceData.food_allergies
                    .filter(allergy => !allergy.includes('我沒有'))
                    .map((allergy, idx) => (
                    <label key={`food_allergy_${idx}`} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.food_allergies.includes(allergy)}
                        onChange={(e) => handleCheckboxChange('food_allergies', allergy, e.target.checked)}
                        disabled={fieldsReadOnly}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{allergy}</span>
                    </label>
                  ))}
                </div>
                
                {/* 其他食物過敏輸入框 */}
                {formData.food_allergies.includes('其他食物，請列明') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      其他食物過敏，請列明
                    </label>
                    <input
                      type="text"
                      value={otherFoodAllergy}
                      onChange={(e) => handleOtherInputChange('food_allergies', e.target.value)}
                      disabled={fieldsReadOnly}
                      className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-gray-50'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="請詳細說明其他食物過敏"
                    />
                    {formData.food_allergies.includes('其他食物，請列明') && !otherFoodAllergy && (
                      <p className="text-sm text-red-600 mt-1">請填寫食物過敏細節</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* 備註欄位 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註（選填）
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                disabled={fieldsReadOnly}
                rows={3}
                className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="例如：偏好女醫師，懂英語，請準備輪椅"
              />
            </div>
            
            {/* 主訴欄位 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自述主訴（選填）
              </label>
              <textarea
                name="chief_complaint"
                value={formData.chief_complaint}
                onChange={handleInputChange}
                disabled={fieldsReadOnly}
                rows={3}
                className={`mt-1 block w-full px-3 py-2 border ${fieldsReadOnly ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                placeholder="請簡述您的不適或求診原因"
              />
            </div>
            
            {/* 診所資訊 */}
            <h2 className="text-xl font-bold mb-4">診所資訊</h2>
            
            {/* 醫師選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主診醫師 <span className="text-red-500">*</span>
              </label>
              <select
                name="doctor_id"
                value={formData.doctor_id?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  setFormData(prev => ({
                    ...prev,
                    doctor_id: value
                  }));
                }}
                className="mt-1 block w-full px-3 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="">請選擇醫師</option>
                {referenceData.doctors?.map((doctor) => (
                  <option key={doctor.id} value={doctor.id.toString()}>
                    {doctor.name} {doctor.specialty ? `(${doctor.specialty})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 提交按鈕 */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    處理中...
                  </>
                ) : '提交表單'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PatientForm; 
