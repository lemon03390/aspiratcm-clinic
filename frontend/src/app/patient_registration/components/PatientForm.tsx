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
      setOtherBasicDisease('');
      setOtherDrugAllergy('');
      setOtherFoodAllergy('');
      setMessage(null);
    } else {
      // 切換到覆診模式時清空搜索欄位
      setSearchQuery('');
      setMessage({
        type: 'info',
        text: '請輸入身份證號碼或電話號碼查詢現有患者'
      });
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
        basic_diseases: patient.basic_diseases,
        drug_allergies: patient.drug_allergies,
        food_allergies: patient.food_allergies,
        has_appointment: patient.has_appointment,
        doctor_id: patient.doctor_id,
        data_source: patient.data_source,
        region: patient.region,
        district: patient.district,
        sub_district: patient.sub_district,
      });
      
      // 檢查是否有「其他，請列明」項目，如有則提取內容到對應輸入框狀態
      processOtherItems(patient.basic_diseases, 'basic_diseases');
      processOtherItems(patient.drug_allergies, 'drug_allergies');
      processOtherItems(patient.food_allergies, 'food_allergies');

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
          '其他，請列明'
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
          '其他，請列明'
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
          '其他，請列明'
        ]
      }));
    }
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

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
      if (processedData.drug_allergies.includes('其他，請列明') && otherDrugAllergy.trim()) {
        // 創建新的陣列，避免修改原有陣列
        const newDrugAllergies = [...processedData.drug_allergies];
        // 找到「其他，請列明」的索引位置
        const otherIndex = newDrugAllergies.indexOf('其他，請列明');
        // 將「其他，請列明」替換為格式化的字符串 - 修正格式
        if (otherIndex !== -1) {
          newDrugAllergies[otherIndex] = `其他，請列明: ${otherDrugAllergy.trim()}`;
          processedData.drug_allergies = newDrugAllergies;
        }
      } else if (processedData.drug_allergies.includes('其他，請列明')) {
        // 若沒有填寫「其他」內容，則移除「其他」選項
        processedData.drug_allergies = processedData.drug_allergies.filter(d => d !== '其他，請列明');
        
        // 如果移除後沒有選項，則添加"無"選項
        if (processedData.drug_allergies.length === 0) {
          processedData.drug_allergies = ['我沒有任何藥物過敏'];
        }
      }
      
      // 處理食物過敏
      if (processedData.food_allergies.includes('其他，請列明') && otherFoodAllergy.trim()) {
        // 創建新的陣列，避免修改原有陣列
        const newFoodAllergies = [...processedData.food_allergies];
        // 找到「其他，請列明」的索引位置
        const otherIndex = newFoodAllergies.indexOf('其他，請列明');
        // 將「其他，請列明」替換為格式化的字符串 - 修正格式
        if (otherIndex !== -1) {
          newFoodAllergies[otherIndex] = `其他，請列明: ${otherFoodAllergy.trim()}`;
          processedData.food_allergies = newFoodAllergies;
        }
      } else if (processedData.food_allergies.includes('其他，請列明')) {
        // 若沒有填寫「其他」內容，則移除「其他」選項
        processedData.food_allergies = processedData.food_allergies.filter(d => d !== '其他，請列明');
        
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
        email: 'no@no.com', // 設置為 no@no.com 而非空字串
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
          text: error.message || '患者登記失敗，請稍後再試'
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

  if (!referenceData) {
    return <div className="p-4 text-center">加載中...</div>;
  }

  return (
    <ErrorBoundary fallback={<div className="p-4 text-center">加載中...</div>}>
      <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">患者登記表</h2>
        
        {/* 狀態消息 */}
        {message && (
          <div className={`p-4 mb-4 flex items-start rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : message.type === 'error' 
                ? 'bg-red-50 text-red-800 border border-red-200' 
                : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            <div className="mr-3 mt-0.5">
              {message.type === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {message.type === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {message.type === 'info' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1 whitespace-pre-wrap">
              {message.text}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="inline-flex items-center mr-6">
            <input
              type="radio"
              name="visit_type"
              checked={isInitialVisit}
              onChange={() => handleVisitTypeChange(true)}
              className="form-radio h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">初診</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="visit_type"
              checked={!isInitialVisit}
              onChange={() => handleVisitTypeChange(false)}
              className="form-radio h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">覆診</span>
          </label>
        </div>
        
        {!isInitialVisit && (
          <div className="mb-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-yellow-800 mb-2 flex items-center">
              <svg className="h-5 w-5 mr-2 text-yellow-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
              </svg>
              請輸入患者的身份證號碼或電話號碼查詢現有記錄。
            </p>
            <div className="flex space-x-4">
              <input
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLoading ? '搜尋中...' : '搜尋'}
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chinese_name" className="block text-sm font-medium text-gray-700 mb-1">
                中文姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="chinese_name"
                name="chinese_name"
                value={formData.chinese_name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={!isInitialVisit && Boolean(formData.id_number)}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="english_name" className="block text-sm font-medium text-gray-700 mb-1">
                英文姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="english_name"
                name="english_name"
                value={formData.english_name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={!isInitialVisit && Boolean(formData.id_number)}
                autoComplete="name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="id_number" className="block text-sm font-medium text-gray-700 mb-1">
                身份證/護照號碼 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="id_number"
                name="id_number"
                value={formData.id_number}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={!isInitialVisit && Boolean(formData.id_number)}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
                出生日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="birth_date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={!isInitialVisit && Boolean(formData.id_number)}
                autoComplete="bday"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                聯絡電話 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                autoComplete="tel"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                電郵地址
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email === 'no@no.com' ? '' : formData.email || ''}
                onChange={(e) => {
                  // 不接受 no@no.com，若用戶嘗試輸入，轉為空字串
                  const newValue = e.target.value === 'no@no.com' ? '' : e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    email: newValue
                  }));
                }}
                onFocus={(e) => {
                  // 獲得焦點時，如果是 no@no.com，清空顯示
                  if (formData.email === 'no@no.com') {
                    setFormData(prev => ({
                      ...prev,
                      email: ''
                    }));
                  }
                }}
                onBlur={(e) => {
                  // 失去焦點時，如果欄位為空，設置為 no@no.com
                  if (!e.target.value.trim()) {
                    console.log("Email 輸入框失去焦點，欄位為空，設置為 no@no.com");
                    setFormData(prev => ({
                      ...prev,
                      email: 'no@no.com'
                    }));
                  }
                }}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoComplete="email"
                placeholder="選填項目，如留空將自動填入 no@no.com"
              />
              <p className="mt-1 text-xs text-gray-500">選填項目，如留空將自動填入 no@no.com</p>
            </div>
          </div>
          
          {/* 醫師選擇（初診和覆診都需要） */}
          <div>
            <label htmlFor="doctor_select" className="block text-sm font-medium text-gray-700 mb-1">
              選擇醫師 <span className="text-red-500">*</span>
            </label>
            <select
              id="doctor_select"
              name="doctor_id"
              value={formData.doctor_id?.toString() || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                console.log('選擇醫師:', value);
                setFormData(prev => ({
                  ...prev,
                  doctor_id: value
                }));
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              autoComplete="off"
            >
              <option value="">請選擇醫師</option>
              {referenceData.doctors && Array.isArray(referenceData.doctors) && referenceData.doctors.length > 0 ? (
                referenceData.doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id.toString()}>
                    {doctor.name} {doctor.specialty ? `(${doctor.specialty})` : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>無可用醫師資料，請重新整理頁面</option>
              )}
            </select>
            {/* 顯示醫師數據調試信息與刷新按鈕 */}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                醫師數據: {referenceData.doctors && Array.isArray(referenceData.doctors) ? 
                  `已載入 ${referenceData.doctors.length} 位醫師` : 
                  '資料載入失敗'
                }
              </span>
              {(!referenceData.doctors || !Array.isArray(referenceData.doctors) || referenceData.doctors.length === 0) && (
                <button 
                  type="button" 
                  onClick={async () => {
                    try {
                      setMessage({
                        type: 'info',
                        text: '正在重新載入醫師資料...'
                      });
                      const data = await getReferenceData();
                      setReferenceData(data);
                      setMessage({
                        type: 'success',
                        text: '醫師資料重新載入成功'
                      });
                    } catch (error) {
                      console.error('重新載入醫師資料失敗:', error);
                      setMessage({
                        type: 'error',
                        text: '醫師資料重新載入失敗，請刷新頁面'
                      });
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  重新載入醫師資料
                </button>
              )}
            </div>
          </div>
          
          {/* 從哪裡認識我們（原資料來源） */}
          <div>
            <label htmlFor="data_source" className="block text-sm font-medium text-gray-700 mb-1">
              從哪裡認識我們 <span className="text-red-500">*</span>
            </label>
            <select
              id="data_source"
              name="data_source"
              value={formData.data_source}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              autoComplete="off"
            >
              <option value="">請選擇</option>
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
              {referenceData.basic_diseases.map((disease, idx) => (
                <label key={`basic_disease_${idx}`} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    id={`basic_disease_${idx}`}
                    name={`basic_disease_${disease.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    checked={formData.basic_diseases.includes(disease)}
                    onChange={(e) => handleCheckboxChange('basic_diseases', disease, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-indigo-600"
                  />
                  <span className="ml-2 text-gray-700">{disease}</span>
                </label>
              ))}
            </div>
            
            {/* 調試信息，始終顯示 */}
            <div className="mt-1 text-xs text-gray-400">
              已選擇基礎疾病: {formData.basic_diseases.join(', ')}
            </div>
            
            {/* 其他基礎疾病輸入框 - 永遠顯示 */}
            <div className="mt-2 grid grid-cols-1">
              <label htmlFor="other_basic_disease" className="block text-sm font-medium text-gray-700 mb-1">
                請列明其他基礎疾病（如有）
              </label>
              <input
                type="text"
                id="other_basic_disease"
                name="other_basic_disease"
                value={otherBasicDisease}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setOtherBasicDisease(newValue);
                  
                  // 如果輸入了內容，自動勾選「其他，請列明」選項
                  // 不論是否有內容，都確保選項被勾選
                  const otherOption = '其他，請列明';
                  if (!formData.basic_diseases.includes(otherOption)) {
                    const updatedOptions = formData.basic_diseases.filter(item => !item.includes('我沒有'));
                    updatedOptions.push(otherOption);
                    setFormData(prev => ({
                      ...prev,
                      basic_diseases: updatedOptions
                    }));
                  }
                }}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="請輸入其他基礎疾病（如選擇「其他，請列明」選項）"
                autoComplete="off"
              />
            </div>
          </div>
          
          {/* 藥物過敏 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              藥物過敏 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {referenceData.drug_allergies.map((allergy, idx) => (
                <label key={`drug_allergy_${idx}`} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    id={`drug_allergy_${idx}`}
                    name={`drug_allergy_${allergy.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    checked={formData.drug_allergies.includes(allergy)}
                    onChange={(e) => handleCheckboxChange('drug_allergies', allergy, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-indigo-600"
                  />
                  <span className="ml-2 text-gray-700">{allergy}</span>
                </label>
              ))}
            </div>
            
            {/* 調試信息，始終顯示 */}
            <div className="mt-1 text-xs text-gray-400">
              已選擇藥物過敏: {formData.drug_allergies.join(', ')}
            </div>
            
            {/* 其他藥物過敏輸入框 - 永遠顯示 */}
            <div className="mt-2 grid grid-cols-1">
              <label htmlFor="other_drug_allergy" className="block text-sm font-medium text-gray-700 mb-1">
                請列明其他藥物過敏（如有）
              </label>
              <input
                type="text"
                id="other_drug_allergy"
                name="other_drug_allergy"
                value={otherDrugAllergy}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setOtherDrugAllergy(newValue);
                  
                  // 不論是否有內容，都確保選項被勾選
                  const otherOption = '其他，請列明';
                  if (!formData.drug_allergies.includes(otherOption)) {
                    const updatedOptions = formData.drug_allergies.filter(item => !item.includes('我沒有'));
                    updatedOptions.push(otherOption);
                    setFormData(prev => ({
                      ...prev,
                      drug_allergies: updatedOptions
                    }));
                  }
                }}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="請輸入其他藥物過敏（如選擇「其他，請列明」選項）"
                autoComplete="off"
              />
            </div>
          </div>
          
          {/* 食物過敏 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              食物過敏 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {referenceData.food_allergies.map((allergy, idx) => (
                <label key={`food_allergy_${idx}`} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    id={`food_allergy_${idx}`}
                    name={`food_allergy_${allergy.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    checked={formData.food_allergies.includes(allergy)}
                    onChange={(e) => handleCheckboxChange('food_allergies', allergy, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-indigo-600"
                  />
                  <span className="ml-2 text-gray-700">{allergy}</span>
                </label>
              ))}
            </div>
            
            {/* 調試信息，始終顯示 */}
            <div className="mt-1 text-xs text-gray-400">
              已選擇食物過敏: {formData.food_allergies.join(', ')}
            </div>
            
            {/* 其他食物過敏輸入框 - 永遠顯示 */}
            <div className="mt-2 grid grid-cols-1">
              <label htmlFor="other_food_allergy" className="block text-sm font-medium text-gray-700 mb-1">
                請列明其他食物過敏（如有）
              </label>
              <input
                type="text"
                id="other_food_allergy"
                name="other_food_allergy"
                value={otherFoodAllergy}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setOtherFoodAllergy(newValue);
                  
                  // 不論是否有內容，都確保選項被勾選
                  const otherOption = '其他，請列明';
                  if (!formData.food_allergies.includes(otherOption)) {
                    const updatedOptions = formData.food_allergies.filter(item => !item.includes('我沒有'));
                    updatedOptions.push(otherOption);
                    setFormData(prev => ({
                      ...prev,
                      food_allergies: updatedOptions
                    }));
                  }
                }}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="請輸入其他食物過敏（如選擇「其他，請列明」選項）"
                autoComplete="off"
              />
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
    </ErrorBoundary>
  );
};

export default PatientForm; 