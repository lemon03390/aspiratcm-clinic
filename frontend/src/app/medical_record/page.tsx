'use client';

import React, { useState, useEffect } from 'react';
import {
  PatientInfoDisplay,
  HistoryInputForm,
  ObservationForm,
  DiagnosisForm,
  HerbalPrescriptionForm,
  TreatmentMethodForm,
  OperationButtons,
  WaitingList,
  PastRecordList
} from './components';
import { getBackendUrl } from '../../libs/apiClient';
import axios from 'axios';
import { patientApi, appointmentApi, medicalRecordApi } from './utils/api';

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
}

// 候診名單中的患者類型
interface PatientInWaiting {
  id: string;
  name: string;
  isFirstVisit: boolean;
  waitingSince: string;
  registration_number: string;
  patient_id: number;
}

// 過往病歷類型
interface PastRecord {
  id: string;
  date: string;
  diagnosis: string;
  prescription: string;
}

export default function MedicalRecordPage() {
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [showFemaleFields, setShowFemaleFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingPatients, setWaitingPatients] = useState<PatientInWaiting[]>([]);
  const [currentPatient, setCurrentPatient] = useState<PatientInfo | null>(null);
  const [pastRecords, setPastRecords] = useState<PastRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 添加表單資料狀態
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    presentIllness: '',
    observation: {},
    diagnosis: {
      modernDiseases: [] as string[],
      cmSyndromes: [] as string[],
      cmPrinciple: ''
    },
    prescription: [] as { name: string; amount: string; id: string }[],
    treatmentMethods: [] as string[]
  });
  
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
            { id: '1', name: '張三', isFirstVisit: false, waitingSince: '09:30', registration_number: 'PT00001', patient_id: 1 },
            { id: '2', name: '李四', isFirstVisit: true, waitingSince: '10:15', registration_number: 'PT00002', patient_id: 2 },
            { id: '3', name: '王五', isFirstVisit: false, waitingSince: '10:45', registration_number: 'PT00003', patient_id: 3 }
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
      
      setCurrentPatient(patientData);
      
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
          registration_number: registrationNumber
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
  
  const handleDiagnosisFormSave = (data: { modernDiseases: string[]; cmSyndromes: string[]; cmPrinciple: string[] }) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: {
        modernDiseases: data.modernDiseases,
        cmSyndromes: data.cmSyndromes,
        // 中醫治則現在是數組，需要合併
        cmPrinciple: data.cmPrinciple.join('、')
      }
    }));
    console.log('已更新中醫診斷:', data);
  };
  
  const handlePrescriptionFormSave = (data: { herbs: any[] }) => {
    setFormData(prev => ({
      ...prev,
      prescription: data.herbs
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
  
  // 保存病歷函數
  const handleSaveRecord = async () => {
    if (!currentPatient) {
      alert('請先選擇患者');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 將結構化的診斷數據轉換為字符串
      const diagnosisText = [
        formData.diagnosis.modernDiseases.length > 0 ? `現代病名: ${formData.diagnosis.modernDiseases.join('、')}` : '',
        formData.diagnosis.cmSyndromes.length > 0 ? `中醫辨證: ${formData.diagnosis.cmSyndromes.join('、')}` : '',
        formData.diagnosis.cmPrinciple ? `中醫治則: ${formData.diagnosis.cmPrinciple}` : ''
      ].filter(Boolean).join('；');
      
      // 收集所有表單數據
      const recordData = {
        patient_id: currentPatient.id,
        doctor_id: currentPatient.doctor_id,
        chief_complaint: formData.chiefComplaint,
        present_illness: formData.presentIllness,
        observation: formData.observation,
        diagnosis: diagnosisText || '無診斷',
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
          </div>
          
          {/* 中間主內容區 */}
          <div className="col-span-12 md:col-span-6 space-y-6">
            {currentPatient ? (
              <>
                {/* 患者基本資料 */}
                <PatientInfoDisplay patientInfo={{
                  name: currentPatient.chinese_name,
                  gender: currentPatient.gender,
                  birthDate: currentPatient.birth_date,
                  phone: currentPatient.phone_number,
                  region: currentPatient.region,
                  doctor: currentPatient.doctor_name || '未指定',
                  basicDiseases: currentPatient.basic_diseases,
                  drugAllergies: currentPatient.drug_allergies,
                  foodAllergies: currentPatient.food_allergies,
                  selfDescription: currentPatient.chief_complaint,
                  notes: currentPatient.note
                }} />
                
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
                  onSave={handleDiagnosisFormSave}
                />
                
                {/* 中藥處方區 */}
                <HerbalPrescriptionForm
                  onSave={handlePrescriptionFormSave}
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
          
          {/* 右側過往病歷區 */}
          <div className="col-span-12 md:col-span-3">
            <PastRecordList
              records={pastRecords}
              onViewRecord={handleViewPastRecord}
              patientName={currentPatient?.chinese_name}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 