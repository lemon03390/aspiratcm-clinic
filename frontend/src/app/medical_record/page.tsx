'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import PatientBadges from '../components/PatientBadges';
import SpecialMarkerEditor from '../components/SpecialMarkerEditor';
import {
  DiagnosisForm,
  HerbalPrescriptionForm,
  HistoryInputForm,
  ObservationForm,
  OperationButtons,
  PastRecordList,
  TreatmentMethodForm,
  WaitingList
} from './components';
import AiHerbSuggestions from './components/AiHerbSuggestions';
import { InventoryStatus } from './components/HerbalPrescriptionForm';
import { appointmentApi, medicalRecordApi, patientApi } from './utils/api';

// 定義患者資料類型
interface PatientInfo {
  id: number;
  chinese_name: string;
  gender: string;
  birth_date: string;
  phone_number: string;
  region: string;
  doctor_name?: string;
  doctor_id?: number;
  basic_diseases: string[];
  drug_allergies: string[];
  food_allergies: string[];
  note?: string;
  chief_complaint?: string;
  registration_number: string;
  isContagious: boolean;
  isTroublesome: boolean;
  isFirstVisit: boolean;
  special_note?: string; // 特殊情況註記
}

// 候診名單中的患者類型
interface PatientInWaiting {
  id: string;
  name: string;
  isFirstVisit: boolean;
  waitingSince: string;
  registration_number: string;
  patient_id: number;
  is_contagious: number;
  is_troublesome: number;
  special_note?: string;
}

// 過往病歷類型
interface PastRecord {
  id: string;
  date: string;
  diagnosis: string;
  prescription: string;
}

// 添加格式化日期函數
const formatDate = (date: Date): string => {
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 在檔案頂部添加 calculateAge 函數（其他 import 之後）
const calculateAge = (birthDate: string | undefined): string => {
  if (!birthDate) {
    return '不詳';
  }

  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return `${age}歲`;
};

export default function MedicalRecordPage() {
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [showFemaleFields, setShowFemaleFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingPatients, setWaitingPatients] = useState<PatientInWaiting[]>([]);
  const [currentPatient, setCurrentPatient] = useState<PatientInfo | null>(null);
  const [pastRecords, setPastRecords] = useState<PastRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMarkerEditor, setShowMarkerEditor] = useState(false);

  // 修改 formData 的 prescription 屬性類型定義
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    presentIllness: '',
    observation: {},
    diagnosis: {
      modernDiseases: [] as string[],
      cmSyndromes: [] as string[],
      cmPrinciple: ''
    },
    prescription: [] as {
      id: string;
      name: string;
      code: string;
      amount: string;
      brand?: string;
      decoction_amount?: string;
      price_per_gram?: number;
      total_price?: number;
      is_compound?: boolean;
    }[],
    treatmentMethods: [] as string[]
  });

  // 新增參考用藥處方實例
  const herbPrescriptionRef = React.useRef<any>(null);

  // 當現有患者變化時重置表單
  useEffect(() => {
    if (currentPatient) {
      setFormData({
        chiefComplaint: currentPatient.chief_complaint || '',
        presentIllness: '',
        observation: {},
        diagnosis: {
          modernDiseases: [],
          cmSyndromes: [],
          cmPrinciple: ''
        },
        prescription: [],
        treatmentMethods: []
      });
    }
  }, [currentPatient]);

  // 獲取候診名單
  useEffect(() => {
    const fetchWaitingList = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // 從掛號系統獲取候診名單
        const response = await appointmentApi.getWaitingList();
        console.log('獲取到候診名單:', response);

        if (!response || response.length === 0) {
          console.warn('候診名單為空或未獲取到數據');
          setWaitingPatients([]);
          // 設置提示信息而非錯誤
          setErrorMessage('目前沒有已掛號的病人在候診');
        } else {
          // 直接使用掛號系統返回的數據格式
          setWaitingPatients(response);
          setErrorMessage(null);
        }

        // 設置定時刷新
        const interval = setInterval(fetchWaitingList, 300000); // 每5分鐘刷新一次
        return () => clearInterval(interval);

      } catch (error) {
        console.error('獲取候診名單失敗:', error);
        setErrorMessage('無法連接掛號系統，請確認網絡連接或聯繫技術支持');

        // 在開發環境中使用模擬數據僅供測試
        if (process.env.NODE_ENV === 'development') {
          console.log('使用臨時模擬數據（僅用於開發環境）');
          const mockData = [
            { id: '1', name: '張三', isFirstVisit: false, waitingSince: '09:30', registration_number: 'PT00001', patient_id: 1, is_contagious: 0, is_troublesome: 0 },
            { id: '2', name: '李四', isFirstVisit: true, waitingSince: '10:15', registration_number: 'PT00002', patient_id: 2, is_contagious: 0, is_troublesome: 0 },
            { id: '3', name: '王五', isFirstVisit: false, waitingSince: '10:45', registration_number: 'PT00003', patient_id: 3, is_contagious: 0, is_troublesome: 0 }
          ];

          setWaitingPatients(mockData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWaitingList();
  }, []);

  // 手動刷新候診名單
  const handleRefreshWaitingList = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 從掛號系統獲取候診名單
      const response = await appointmentApi.getWaitingList();
      console.log('手動刷新獲取到候診名單:', response);

      if (!response || response.length === 0) {
        console.warn('候診名單為空或未獲取到數據');
        // 設置提示信息而非錯誤
        setErrorMessage('目前沒有已掛號的病人在候診區');
        setWaitingPatients([]);
      } else {
        // 直接使用掛號系統返回的數據格式
        setWaitingPatients(response);
        setErrorMessage(null);
      }
    } catch (error) {
      console.error('手動刷新候診名單失敗:', error);
      setErrorMessage('刷新候診名單失敗，請確認掛號系統是否正常運作');
    } finally {
      setIsLoading(false);
    }
  };

  // 自動保存表單到本地存儲
  useEffect(() => {
    // 定時保存表單數據到本地存儲
    const interval = setInterval(() => {
      if (currentPatient && formData) {
        try {
          localStorage.setItem(
            `draft_${currentPatient.id}`,
            JSON.stringify({
              formData,
              timestamp: new Date().toISOString()
            })
          );
          console.log('表單數據已自動保存');
        } catch (error) {
          console.error('自動保存表單數據失敗:', error);
        }
      }
    }, 60000); // 每分鐘保存一次

    return () => clearInterval(interval);
  }, [currentPatient, formData]);

  // 添加載入草稿函數
  const loadDraft = (patientId: number) => {
    try {
      const savedData = localStorage.getItem(`draft_${patientId}`);
      if (!savedData) {
        return false;
      }

      const parsedData = JSON.parse(savedData);
      if (!parsedData || !parsedData.formData || !parsedData.timestamp) {
        console.error('草稿資料格式不正確');
        return false;
      }

      const timestamp = new Date(parsedData.timestamp);
      if (isNaN(timestamp.getTime())) {
        console.error('草稿時間戳格式不正確');
        return false;
      }

      const now = new Date();
      // 檢查草稿是否在24小時內
      if ((now.getTime() - timestamp.getTime()) < 24 * 60 * 60 * 1000 && window.confirm(`發現${formatDate(timestamp)}的未完成記錄，是否恢復？`)) {
        setFormData(parsedData.formData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('載入草稿失敗:', error);
      return false;
    }
  };

  // 根據候診名單中的患者ID獲取患者詳細資料
  const fetchPatientDetails = async (registrationNumber: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 從患者登記系統獲取患者詳細資料
      console.log('獲取患者詳細資料，掛號編號:', registrationNumber);

      // 實際API調用
      const patientData = await patientApi.getPatientByRegistrationNumber(registrationNumber);
      console.log('獲取到患者資料:', patientData);

      // 查找有無該患者對應的特殊標記
      const selectedPatient = waitingPatients.find(p => p.registration_number === registrationNumber);

      // 設置特殊標記
      const isContagious = selectedPatient?.is_contagious === 1;
      const isTroublesome = selectedPatient?.is_troublesome === 1;
      const specialNote = selectedPatient?.special_note || patientData.special_note || '';

      setCurrentPatient({
        ...patientData,
        // 添加特殊標記標志
        isContagious,
        isTroublesome,
        isFirstVisit: selectedPatient?.isFirstVisit || false,
        special_note: specialNote
      });

      // 設置是否顯示女性專用欄位
      setShowFemaleFields(patientData.gender === '女');

      // 獲取過往病歷記錄
      if (patientData.id) {
        try {
          const pastRecordsData = await medicalRecordApi.getPatientRecords(patientData.id);
          console.log('獲取到過往病歷:', pastRecordsData);

          // 轉換API響應格式為組件所需格式
          const formattedRecords = pastRecordsData.map((record: any) => ({
            id: record.id.toString(),
            date: new Date(record.created_at).toLocaleDateString('zh-TW'),
            diagnosis: record.diagnosis || '無診斷',
            prescription: record.prescription || '無處方'
          }));

          setPastRecords(formattedRecords);
        } catch (recordError) {
          console.error('獲取過往病歷失敗:', recordError);
          setPastRecords([]);
        }
      }

      // 嘗試載入草稿
      if (!loadDraft(patientData.id)) {
        // 如果沒有草稿或用戶拒絕恢復，則使用默認值
        setFormData({
          chiefComplaint: patientData.chief_complaint || '',
          presentIllness: '',
          observation: {},
          diagnosis: {
            modernDiseases: [],
            cmSyndromes: [],
            cmPrinciple: ''
          },
          prescription: [],
          treatmentMethods: []
        });
      }

    } catch (error) {
      console.error('獲取患者詳細資料失敗:', error);
      setErrorMessage('無法載入患者詳細資料');
      setCurrentPatient(null);
      setPastRecords([]);

      // 如果 API 調用失敗，使用臨時模擬數據（僅用於開發）
      if (process.env.NODE_ENV === 'development') {
        const mockPatientData = {
          id: 1,
          chinese_name: '張三',
          gender: '男',
          birth_date: '1980-01-01',
          phone_number: '0912-345-678',
          region: '台北市',
          doctor_name: '李醫師',
          doctor_id: 1,
          basic_diseases: ['高血壓', '糖尿病'],
          drug_allergies: ['青黴素'],
          food_allergies: [],
          note: '需要定期追蹤血壓',
          chief_complaint: '經常頭痛，伴隨頸部不適',
          registration_number: registrationNumber,
          isContagious: false,
          isTroublesome: false,
          isFirstVisit: true
        };

        setCurrentPatient(mockPatientData);
        setShowFemaleFields(mockPatientData.gender === '女');

        const mockPastRecords = [
          { id: '101', date: '2023-06-15', diagnosis: '頭痛、頸痛', prescription: '川芎10g, 白芍10g, 天麻15g' },
          { id: '102', date: '2023-05-22', diagnosis: '胃脘痛', prescription: '陳皮10g, 炙甘草6g, 白芍12g' },
          { id: '103', date: '2023-04-10', diagnosis: '腰痛', prescription: '杜仲12g, 牛膝10g, 續斷15g' }
        ];

        setPastRecords(mockPastRecords);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 更新處理各表單組件的數據
  const handleHistoryFormSave = (data: { chiefComplaint: string; presentIllness: string }) => {
    setFormData(prev => ({
      ...prev,
      chiefComplaint: data.chiefComplaint,
      presentIllness: data.presentIllness
    }));
    console.log('已更新主訴與現病史:', data);
  };

  const handleObservationFormSave = (data: any) => {
    setFormData(prev => ({
      ...prev,
      observation: {
        ...data,
        // 將多選數組轉換為字符串，便於存儲
        leftPulse: data.leftPulse?.join('、') || '',
        rightPulse: data.rightPulse?.join('、') || '',
        tongueQuality: data.tongueQuality?.join('、') || '',
        tongueShape: data.tongueShape?.join('、') || '',
        tongueColor: data.tongueColor?.join('、') || '',
        tongueCoating: data.tongueCoating?.join('、') || ''
      }
    }));
    console.log('已更新醫師觀察:', data);
  };

  const handleDiagnosisFormSave = (data: {
    modernDiseases: { code: string, name: string }[];
    cmSyndromes: { code: string, name: string }[];
    cmPrinciple: { code: string, name: string }[]
  }) => {
    // 安全處理 data，避免 undefined 或 null
    const safeData = {
      modernDiseases: Array.isArray(data.modernDiseases) ? data.modernDiseases : [],
      cmSyndromes: Array.isArray(data.cmSyndromes) ? data.cmSyndromes : [],
      cmPrinciple: Array.isArray(data.cmPrinciple) ? data.cmPrinciple : []
    };

    setFormData(prev => ({
      ...prev,
      diagnosis: {
        modernDiseases: safeData.modernDiseases.map(d => d.name || ''),
        cmSyndromes: safeData.cmSyndromes.map(d => d.name || ''),
        cmPrinciple: safeData.cmPrinciple.map(d => d.name || '').join('、') || ''
      }
    }));
    console.log('已更新中醫診斷:', data);
  };

  const handlePrescriptionFormSave = (data: {
    herbs: any[];
    instructions: string;
    total_price: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      prescription: data.herbs.map(herb => ({
        id: herb.id,
        name: herb.name,
        code: herb.code || '',
        amount: herb.amount,
        decoction_amount: herb.decoction_amount,
        brand: herb.brand,
        price_per_gram: herb.price_per_gram,
        total_price: herb.total_price,
        is_compound: herb.is_compound
      }))
    }));
    console.log('已更新中藥處方:', data);
  };

  const handleTreatmentFormSave = (data: { treatments: { method: string; targets: string[]; id: string }[] }) => {
    setFormData(prev => ({
      ...prev,
      treatmentMethods: data.treatments.map(t =>
        `${t.method}${t.targets?.length > 0 ? `: ${t.targets.join('、')}` : ''}`
      )
    }));
    console.log('已更新治療方法:', data);
  };

  // 從 AI 建議添加藥材到處方
  const handleAddHerbFromAi = (herbData: any) => {
    if (herbPrescriptionRef.current && typeof herbPrescriptionRef.current.addHerb === 'function') {
      herbPrescriptionRef.current.addHerb({
        ...herbData,
        source: 'AI_suggested'
      });
    } else {
      console.warn('無法添加 AI 建議藥材：處方表單引用不可用');
    }
  };

  // 保存病歷函數
  const handleSaveRecord = async () => {
    if (!currentPatient) {
      alert('請先選擇患者');
      return;
    }

    try {
      setIsLoading(true);

      // 將結構化的診斷數據轉換為字符串，同時保留原始結構
      const diagnosisText = [
        formData.diagnosis.modernDiseases.length > 0 ?
          `現代病名: ${formData.diagnosis.modernDiseases.join('、')}` : '',
        formData.diagnosis.cmSyndromes.length > 0 ?
          `中醫辨證: ${formData.diagnosis.cmSyndromes.join('、')}` : '',
        formData.diagnosis.cmPrinciple ?
          `中醫治則: ${formData.diagnosis.cmPrinciple}` : ''
      ].filter(Boolean).join('；');

      // 收集所有表單數據
      const recordData = {
        patient_id: currentPatient.id,
        doctor_id: currentPatient.doctor_id,
        chief_complaint: formData.chiefComplaint,
        present_illness: formData.presentIllness,
        observation: formData.observation,
        diagnosis: diagnosisText || '無診斷',
        diagnosis_structured: {
          modernDiseases: formData.diagnosis.modernDiseases.map(name => ({ name })),
          cmSyndromes: formData.diagnosis.cmSyndromes.map(name => ({ name })),
          cmPrinciple: formData.diagnosis.cmPrinciple ? [{ name: formData.diagnosis.cmPrinciple }] : []
        },
        prescription: formData.prescription.map(herb => `${herb.name} ${herb.amount}`).join('、'),
        treatment_methods: formData.treatmentMethods
      };

      console.log('提交完整病歷數據:', recordData);

      // 實際保存病歷到API
      const response = await medicalRecordApi.createRecord(recordData);
      console.log('病歷保存成功:', response);

      // 從候診清單中移除患者
      try {
        console.log(`嘗試從候診清單中移除患者 ID: ${currentPatient.id}`);
        await appointmentApi.removePatientFromWaitingList(currentPatient.id);
        console.log(`已從候診清單中移除患者 ID: ${currentPatient.id}`);

        // 刷新候診清單
        handleRefreshWaitingList();
      } catch (removeError) {
        console.error('從候診清單中移除患者失敗:', removeError);
        // 繼續主流程，不中斷儲存功能
      }

      alert('病歷已成功保存');

      // 重新獲取過往病歷列表
      const updatedRecords = await medicalRecordApi.getPatientRecords(currentPatient.id);
      const formattedRecords = updatedRecords.map((record: any) => ({
        id: record.id.toString(),
        date: new Date(record.created_at).toLocaleDateString('zh-TW'),
        diagnosis: record.diagnosis || '無診斷',
        prescription: record.prescription || '無處方'
      }));

      setPastRecords(formattedRecords);

    } catch (error) {
      console.error('保存病歷失敗:', error);
      alert('保存病歷失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPrescription = () => {
    if (!currentPatient) {
      alert('請先選擇患者');
      return;
    }
    alert('藥方已送出列印');
  };

  const handleScheduleFollowUp = () => {
    if (!currentPatient) {
      alert('請先選擇患者');
      return;
    }
    alert('開啟預約覆診表單');
  };

  const handleNextPatient = () => {
    if (waitingPatients.length === 0) {
      alert('候診名單已空');
      return;
    }

    // 如果有當前患者，先從候診清單中移除
    if (currentPatientId && currentPatient) {
      try {
        // 嘗試移除當前患者
        appointmentApi.removePatientFromWaitingList(currentPatient.id)
          .then(() => {
            console.log(`已從候診清單中移除患者 ID: ${currentPatient.id}`);
          })
          .catch(error => {
            console.error('從候診清單中移除患者失敗:', error);
          });
      } catch (error) {
        console.error('移至下一位患者時出錯:', error);
      }
    }

    // 找出目前患者的下一位
    if (currentPatientId) {
      const currentIndex = waitingPatients.findIndex(p => p.id === currentPatientId);
      if (currentIndex !== -1 && currentIndex < waitingPatients.length - 1) {
        const nextPatient = waitingPatients[currentIndex + 1];
        handleSelectPatient(nextPatient.id);

        // 刷新候診清單
        setTimeout(() => {
          handleRefreshWaitingList();
        }, 500);

        return;
      }
    }

    // 如果沒有找到下一位或尚未選擇患者，選擇第一位
    if (waitingPatients.length > 0) {
      handleSelectPatient(waitingPatients[0].id);

      // 刷新候診清單
      setTimeout(() => {
        handleRefreshWaitingList();
      }, 500);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setCurrentPatientId(patientId);

    // 從候診名單中找到對應的患者
    const selectedPatient = waitingPatients.find(p => p.id === patientId);
    if (selectedPatient?.registration_number) {
      // 同時傳遞特殊標記
      fetchPatientDetails(selectedPatient.registration_number);
    }
  };

  const handleViewPastRecord = async (recordId: string) => {
    try {
      setIsLoading(true);

      // 從API獲取過往病歷詳情
      const recordDetail = await medicalRecordApi.getRecordById(recordId);
      console.log('病歷詳情:', recordDetail);

      // 在實際應用中，可以顯示病歷詳情彈窗或跳轉到詳情頁面
      alert(`病歷詳情已獲取，ID: ${recordId}`);

    } catch (error) {
      console.error(`獲取病歷詳情失敗，ID: ${recordId}:`, error);
      alert('獲取病歷詳情失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 複製上次處方
  const handleCopyLastPrescription = () => {
    if (!currentPatient || pastRecords.length === 0) {
      alert('沒有可複製的處方');
      return;
    }

    // 獲取最近一次的病歷記錄
    const latestRecordId = pastRecords[0].id;

    setIsLoading(true);
    medicalRecordApi.getRecordById(latestRecordId)
      .then(record => {
        // 假設 record 中有 prescription_structured 欄位包含結構化的處方資料
        if (record.prescription_structured && Array.isArray(record.prescription_structured)) {
          // 更新處方資料
          setFormData(prev => ({
            ...prev,
            prescription: record.prescription_structured
          }));
          alert('已成功複製上次處方');
        } else {
          // 如果沒有結構化資料，顯示提示
          alert('無法複製上次處方，因為缺少結構化資料');
        }
      })
      .catch(error => {
        console.error('複製上次處方失敗:', error);
        alert('複製上次處方失敗');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // 在提交前驗證資料
  const validatePrescription = (): boolean => {
    let isValid = true;
    const invalidHerbs = formData.prescription.filter(herb =>
      !herb.name || !herb.code || !herb.amount
    );

    if (invalidHerbs.length > 0) {
      alert('請完成所有藥材資料填寫');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePrescription()) {
      handleSaveRecord();
    }
  };

  // 在應診系統中設置特殊標記
  const handleUpdateSpecialMarkers = async (markers) => {
    try {
      if (!currentPatient?.id) {
        console.error('患者資料不存在');
        return;
      }

      await patientApi.updatePatientMarkers(currentPatient.id, markers);

      // 更新當前患者資料
      if (currentPatient) {
        setCurrentPatient({
          ...currentPatient,
          ...markers
        });
      }

      setShowMarkerEditor(false);
      toast.success('患者特殊標記已更新');
    } catch (error) {
      console.error('更新患者標記時出錯:', error);
      toast.error('更新患者標記失敗');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">中醫病歷系統</h1>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* 左側候診區 */}
          <div className="col-span-12 md:col-span-3">
            <WaitingList
              patients={waitingPatients}
              onSelectPatient={handleSelectPatient}
              currentPatientId={currentPatientId}
              onRefresh={handleRefreshWaitingList}
            />

            {/* 過往病歷區 - 移至左側適當位置 */}
            {currentPatient && (
              <div className="mt-6">
                <PastRecordList
                  records={pastRecords}
                  onViewRecord={handleViewPastRecord}
                  patientName={currentPatient?.chinese_name}
                />
              </div>
            )}
          </div>

          {/* 右側診療區 */}
          <div className="col-span-12 md:col-span-9 space-y-6">
            {currentPatient ? (
              <>
                {/* 患者基本資料 */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold">患者信息</h2>
                    <button
                      onClick={() => setShowMarkerEditor(!showMarkerEditor)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showMarkerEditor ? '取消編輯' : '編輯特殊標記'}
                    </button>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-700"><span className="font-medium">姓名:</span> {currentPatient?.chinese_name}</p>
                      <p className="text-gray-700"><span className="font-medium">年齡:</span> {calculateAge(currentPatient?.birth_date)}</p>
                      <p className="text-gray-700"><span className="font-medium">性別:</span> {currentPatient?.gender}</p>
                    </div>
                    <div>
                      <p className="text-gray-700"><span className="font-medium">電話:</span> {currentPatient?.phone_number}</p>
                      <p className="text-gray-700"><span className="font-medium">過敏藥物:</span> {currentPatient?.drug_allergies?.join(', ')}</p>
                    </div>
                  </div>

                  {/* 添加特殊患者標記顯示 */}
                  <div className="mt-2">
                    <PatientBadges
                      isTroublesome={currentPatient?.isTroublesome ? 1 : 0}
                      isContagious={currentPatient?.isContagious ? 1 : 0}
                      specialNote={currentPatient?.special_note}
                    />
                  </div>
                </div>

                {showMarkerEditor && (
                  <SpecialMarkerEditor
                    isTroublesome={currentPatient?.isTroublesome ? 1 : 0}
                    isContagious={currentPatient?.isContagious ? 1 : 0}
                    specialNote={currentPatient?.special_note || ''}
                    onUpdate={handleUpdateSpecialMarkers}
                  />
                )}

                {/* 主訴與現病史 */}
                <HistoryInputForm
                  initialChiefComplaint={currentPatient.chief_complaint || ''}
                  onSave={handleHistoryFormSave}
                />

                {/* 醫師觀察區 */}
                <ObservationForm
                  onSave={handleObservationFormSave}
                  showMenstrualField={showFemaleFields}
                />

                {/* 中醫診斷區 */}
                <DiagnosisForm
                  initialValues={formData.diagnosis}
                  onSave={handleDiagnosisFormSave}
                />

                {/* AI 用藥建議 */}
                <AiHerbSuggestions
                  modernDiagnosis={formData.diagnosis.modernDiseases}
                  cmSyndrome={formData.diagnosis.cmSyndromes}
                  onAddHerb={handleAddHerbFromAi}
                />

                {/* 中藥處方區 */}
                <HerbalPrescriptionForm
                  initialValues={{
                    herbs: formData.prescription.map(item => ({
                      id: item.id || Date.now().toString(),
                      code: item.code || '',
                      name: item.name || '',
                      brand: item.brand || '',
                      powder_amount: item.amount || '',
                      decoction_amount: item.decoction_amount || '',
                      price_per_gram: item.price_per_gram || 0,
                      total_price: item.total_price || 0,
                      unit: 'g',
                      is_compound: item.is_compound || false,
                      concentration_ratio: 1,
                      decoction_equivalent_per_g: 1,
                      inventory_status: 'normal' as InventoryStatus
                    })),
                    instructions: '',
                    total_price: formData.prescription.reduce((sum, item) => sum + (item.total_price || 0), 0)
                  }}
                  onSave={handlePrescriptionFormSave}
                  ref={herbPrescriptionRef}
                />

                {/* 中醫治療方法 */}
                <TreatmentMethodForm
                  onSave={handleTreatmentFormSave}
                />

                {/* 操作按鈕區 */}
                <OperationButtons
                  onSave={handleSaveRecord}
                  onPrint={handlePrintPrescription}
                  onScheduleFollowUp={handleScheduleFollowUp}
                  onNextPatient={handleNextPatient}
                  onCopyLastPrescription={handleCopyLastPrescription}
                  isLoading={isLoading}
                />
              </>
            ) : (
              <div className="bg-white p-6 rounded-md shadow text-center">
                <p className="text-gray-500 mb-4">請從候診名單中選擇患者</p>
                {waitingPatients.length === 0 && !isLoading && (
                  <p className="text-sm text-gray-400">候診名單為空</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 