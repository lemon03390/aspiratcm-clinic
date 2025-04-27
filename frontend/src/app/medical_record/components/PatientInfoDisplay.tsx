import React, { useState } from 'react';
import SpecialMarkerEditor from './SpecialMarkerEditor';

interface PatientInfo {
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  region: string;
  doctor: string;
  basicDiseases?: string[];
  drugAllergies?: string[];
  foodAllergies?: string[];
  selfDescription?: string;
  notes?: string;
  isContagious?: boolean;
  isTroublesome?: boolean;
  isFirstVisit?: boolean;
  specialNote?: string;
}

interface PatientInfoDisplayProps {
  patientInfo: PatientInfo;
  onUpdateSpecialMarkers?: (data: { isContagious: boolean; isTroublesome: boolean; specialNote: string }) => void;
}

const PatientInfoDisplay: React.FC<PatientInfoDisplayProps> = ({ patientInfo, onUpdateSpecialMarkers }) => {
  const [showSpecialMarkerEditor, setShowSpecialMarkerEditor] = useState(false);

  // 添加計算年齡函數
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  // 添加格式化日期函數
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleSaveSpecialMarkers = (data: { isContagious: boolean; isTroublesome: boolean; specialNote: string }) => {
    if (onUpdateSpecialMarkers) {
      onUpdateSpecialMarkers(data);
    }
    setShowSpecialMarkerEditor(false);
  };

  return (
    <div className="space-y-4">
      {/* 基本資料區 */}
      <div className={`p-4 rounded-md shadow ${patientInfo.isContagious
        ? 'bg-yellow-50 border border-yellow-200'
        : patientInfo.isTroublesome
          ? 'bg-red-50 border border-red-200'
          : 'bg-white'
        }`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">{patientInfo.name}</h2>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${patientInfo.gender === '女' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
              {patientInfo.gender}
            </span>
            <span className="ml-2 text-gray-500">{calculateAge(patientInfo.birthDate)}歲</span>

            {patientInfo.isFirstVisit && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                初診患者
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">就診醫師: {patientInfo.doctor}</p>
            <p className="text-sm text-gray-600">{formatDate(new Date())}</p>
            {onUpdateSpecialMarkers && (
              <button
                onClick={() => setShowSpecialMarkerEditor(!showSpecialMarkerEditor)}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {showSpecialMarkerEditor ? '取消編輯' : '編輯特殊標記'}
              </button>
            )}
          </div>
        </div>

        {showSpecialMarkerEditor && onUpdateSpecialMarkers && (
          <div className="mt-3">
            <SpecialMarkerEditor
              isContagious={!!patientInfo.isContagious}
              isTroublesome={!!patientInfo.isTroublesome}
              specialNote={patientInfo.specialNote || ''}
              onSave={handleSaveSpecialMarkers}
              onCancel={() => setShowSpecialMarkerEditor(false)}
            />
          </div>
        )}

        {!showSpecialMarkerEditor && (patientInfo.isContagious || patientInfo.isTroublesome) && (
          <div className={`mt-3 p-2 rounded-md ${patientInfo.isContagious ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            }`}>
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d={patientInfo.isContagious
                    ? "M12 9v2m0 4h.01M19 12a7 7 0 11-14 0 7 7 0 0114 0z"
                    : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
              </svg>
              <span className="font-medium">
                {patientInfo.isContagious && "注意：患者有傳染病記錄，請做好防護措施"}
                {patientInfo.isTroublesome && "注意：患者被標記為麻煩症，請耐心對待"}
              </span>
            </div>
          </div>
        )}

        {!showSpecialMarkerEditor && patientInfo.specialNote && (
          <div className="mt-3 p-2 rounded-md bg-orange-50 text-orange-800 border border-orange-200">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="font-medium">特殊註記：{patientInfo.specialNote}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">電話</label>
            <p className="font-medium">{patientInfo.phone}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">地區</label>
            <p className="font-medium">{patientInfo.region}</p>
          </div>
        </div>
      </div>

      {/* 健康摘要區 */}
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">健康摘要</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">基礎病</label>
            <div className="p-2 bg-gray-50 rounded min-h-[2.5rem]">
              {patientInfo.basicDiseases && patientInfo.basicDiseases.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {patientInfo.basicDiseases.map((disease, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                      {disease}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">無</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">藥物過敏</label>
            <div className="p-2 bg-gray-50 rounded min-h-[2.5rem]">
              {patientInfo.drugAllergies && patientInfo.drugAllergies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {patientInfo.drugAllergies.map((allergy, index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">無</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">食物過敏</label>
            <div className="p-2 bg-gray-50 rounded min-h-[2.5rem]">
              {patientInfo.foodAllergies && patientInfo.foodAllergies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {patientInfo.foodAllergies.map((allergy, index) => (
                    <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">無</p>
              )}
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-gray-600">自述主訴</label>
            <div className="p-2 bg-gray-50 rounded min-h-[2.5rem]">
              {patientInfo.selfDescription ? (
                <p>{patientInfo.selfDescription}</p>
              ) : (
                <p className="text-gray-500 italic">無</p>
              )}
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-gray-600">備註</label>
            <div className="p-2 bg-gray-50 rounded min-h-[2.5rem]">
              {patientInfo.notes ? (
                <p>{patientInfo.notes}</p>
              ) : (
                <p className="text-gray-500 italic">無</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientInfoDisplay; 