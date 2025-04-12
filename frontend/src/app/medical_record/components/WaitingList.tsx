import React from 'react';

type PatientInWaiting = {
  id: string;
  name: string;
  isFirstVisit: boolean;
  waitingSince: string;
  registration_number: string;
  patient_id: number;
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
              className={`cursor-pointer hover:bg-blue-50 transition-colors duration-150 ${
                currentPatientId === patient.id ? 'bg-blue-100' : ''
              }`}
              onClick={() => onSelectPatient(patient.id)}
            >
              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-lg font-medium text-gray-800">{patient.name}</span>
                    <span className="text-gray-500 text-sm">等候時間: {patient.waitingSince}</span>
                  </div>
                  <div>
                    {patient.isFirstVisit ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        初診
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        覆診
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