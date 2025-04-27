import React from 'react';

type PatientInWaiting = {
  id: string;
  name: string;
  isFirstVisit: boolean;
  waitingSince: string;
  registration_number: string;
  patient_id: number;
  is_contagious?: number;  // 傳染病患者標記
  is_troublesome?: number; // 麻煩症患者標記
  chief_complaint?: string; // 主訴
  special_note?: string; // 特殊情況註記
  doctor_name?: string; // 主診醫師
};

type WaitingListProps = {
  patients: PatientInWaiting[];
  onSelectPatient: (id: string) => void;
  currentPatientId: string | null;
  onRefresh?: () => void;
};

const WaitingList: React.FC<WaitingListProps> = ({
  patients,
  onSelectPatient,
  currentPatientId,
  onRefresh
}) => {
  const isEmptyList = !patients || patients.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 font-bold flex justify-between items-center">
        <span>候診名單</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-white text-sm bg-blue-500 hover:bg-blue-700 rounded px-2 py-1"
            title="刷新候診名單"
          >
            刷新
          </button>
        )}
      </div>

      {isEmptyList ? (
        <div className="p-4 text-center text-gray-500">
          <p className="mb-2">目前沒有候診患者</p>
          <p className="text-sm">請確認是否有今日掛號患者</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 text-blue-500 hover:text-blue-700 text-sm underline"
            >
              點擊刷新候診名單
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {patients.map((patient) => (
            <li
              key={patient.id}
              className={`cursor-pointer transition-colors duration-150 ${currentPatientId === patient.id ? 'bg-blue-100' :
                patient.is_contagious ? 'bg-yellow-50 hover:bg-yellow-100' :
                  patient.is_troublesome ? 'bg-red-50 hover:bg-red-100' :
                    'hover:bg-blue-50'
                }`}
              onClick={() => onSelectPatient(patient.id)}
            >
              <div className="px-4 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="text-lg font-medium text-gray-800">{patient.name}</span>
                      {patient.doctor_name && (
                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {patient.doctor_name}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-sm block">等候時間: {patient.waitingSince}</span>
                    {patient.chief_complaint && (
                      <span className="text-xs text-gray-600 block mt-1 line-clamp-1">
                        主訴: {patient.chief_complaint}
                      </span>
                    )}
                    {patient.special_note && (
                      <span className="text-xs font-semibold text-orange-600 block mt-1 line-clamp-1">
                        註記: {patient.special_note}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {/* 患者狀態標記 */}
                    {patient.isFirstVisit ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                        初診
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                        覆診
                      </span>
                    )}

                    {/* 特殊狀態標記 */}
                    {patient.is_contagious === 1 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap flex items-center">
                        <svg className="h-3 w-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 19A7 7 0 1 0 12 5a7 7 0 0 0 0 14Z" />
                        </svg>
                        傳染病
                      </span>
                    )}

                    {patient.is_troublesome === 1 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 border border-red-200 whitespace-nowrap flex items-center">
                        <svg className="h-3 w-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        麻煩症
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WaitingList; 