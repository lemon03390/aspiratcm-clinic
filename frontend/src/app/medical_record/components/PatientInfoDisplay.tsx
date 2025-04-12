import React from 'react';

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
}

interface PatientInfoDisplayProps {
  patientInfo: PatientInfo;
}

const PatientInfoDisplay: React.FC<PatientInfoDisplayProps> = ({ patientInfo }) => {
  return (
    <div className="space-y-4">
      {/* 基本資料區 */}
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">患者基本資料</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">姓名</label>
            <p className="font-medium">{patientInfo.name}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">性別</label>
            <p className="font-medium">{patientInfo.gender}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">出生日期</label>
            <p className="font-medium">{patientInfo.birthDate}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">電話</label>
            <p className="font-medium">{patientInfo.phone}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">地區</label>
            <p className="font-medium">{patientInfo.region}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">主治醫師</label>
            <p className="font-medium">{patientInfo.doctor}</p>
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