import React from 'react';

interface PastRecord {
  id: string;
  date: string;
  diagnosis: string;
  prescription: string;
}

interface PastRecordListProps {
  records: PastRecord[];
  onViewRecord: (recordId: string) => void;
  patientName?: string;
}

const PastRecordList: React.FC<PastRecordListProps> = ({
  records,
  onViewRecord,
  patientName
}) => {
  return (
    <div className="bg-white rounded-md shadow overflow-hidden">
      <div className="p-3 bg-green-500 text-white font-medium">
        {patientName ? `${patientName} 的過往病歷` : '過往病歷'}
      </div>
      
      <div className="overflow-y-auto max-h-[calc(100vh-10rem)]">
        {records.length > 0 ? (
          <div className="divide-y">
            {records.map(record => (
              <div 
                key={record.id}
                className="p-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => onViewRecord(record.id)}
              >
                <div className="font-medium mb-1 text-gray-800">
                  {record.date}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">診斷: </span>
                  {record.diagnosis}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">處方: </span>
                  <span className="text-gray-500">{record.prescription}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 italic">
            {patientName ? '此患者無過往病歷' : '請先選擇患者'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PastRecordList; 