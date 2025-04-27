import React from 'react';

interface OperationButtonsProps {
  onSave: () => void;
  onPrint: () => void;
  onScheduleFollowUp: () => void;
  onNextPatient: () => void;
  onCopyLastPrescription?: () => void;
  isLoading?: boolean;
}

const OperationButtons: React.FC<OperationButtonsProps> = ({
  onSave,
  onPrint,
  onScheduleFollowUp,
  onNextPatient,
  onCopyLastPrescription,
  isLoading = false
}) => {
  return (
    <div className="bg-white p-4 rounded-md shadow">
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isLoading}
          className={`px-5 py-2 rounded ${isLoading
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {isLoading ? '保存中...' : '保存病歷'}
        </button>

        <button
          type="button"
          onClick={onPrint}
          disabled={isLoading}
          className={`px-5 py-2 rounded ${isLoading
            ? 'bg-green-300 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'} text-white`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
          列印藥方
        </button>

        <button
          type="button"
          onClick={onScheduleFollowUp}
          disabled={isLoading}
          className={`px-5 py-2 rounded ${isLoading
            ? 'bg-purple-300 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700'} text-white`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          預約覆診
        </button>

        <button
          type="button"
          onClick={onNextPatient}
          disabled={isLoading}
          className={`px-5 py-2 rounded ${isLoading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-gray-600 hover:bg-gray-700'} text-white`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          下一位患者
        </button>

        {onCopyLastPrescription && (
          <button
            type="button"
            onClick={onCopyLastPrescription}
            className="py-2 px-4 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            title="複製上次處方"
          >
            <span className="flex items-center">
              複製上次處方
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default OperationButtons; 