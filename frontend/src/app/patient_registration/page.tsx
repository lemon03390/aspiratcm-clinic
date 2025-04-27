"use client";
import { Component, ErrorInfo, ReactNode } from 'react';
import PatientForm from './components/PatientForm';
import { Patient } from './types';

// 頁面級錯誤邊界
class PageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('患者登記頁面錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto p-8 bg-red-50 border border-red-200 rounded-lg shadow text-red-800">
            <h2 className="text-2xl font-bold mb-4">頁面載入錯誤</h2>
            <p className="mb-4">很抱歉，患者登記系統暫時無法使用，請稍後再試。</p>
            <details className="mb-4">
              <summary className="cursor-pointer font-medium">技術詳情</summary>
              <pre className="mt-2 p-4 bg-red-100 rounded text-sm overflow-auto">{this.state.error?.toString()}</pre>
            </details>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                重新載入
              </button>
              <a
                href="/appointments"
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                返回預約系統
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 在掛號成功頁面添加跳轉到病歷系統按鈕
const RegistrationSuccess = ({ patient, onRegisterAnother, onViewDetails }: {
  patient: Patient,
  onRegisterAnother: () => void,
  onViewDetails: () => void
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center text-green-600 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h2 className="text-xl font-semibold">掛號成功</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-600">患者姓名</p>
          <p className="font-medium">{patient.chinese_name}</p>
        </div>
        <div>
          <p className="text-gray-600">掛號編號</p>
          <p className="font-medium">{patient.registration_number}</p>
        </div>
        <div>
          <p className="text-gray-600">主診醫師</p>
          <p className="font-medium">{patient.doctor_id ? `醫師ID: ${patient.doctor_id}` : '未指定'}</p>
        </div>
        <div>
          <p className="text-gray-600">登記時間</p>
          <p className="font-medium">
            {new Date(patient.registration_datetime).toLocaleString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={onRegisterAnother}
          className="flex-1 min-w-[120px] py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          再登記一位病人
        </button>
        <button
          onClick={onViewDetails}
          className="flex-1 min-w-[120px] py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          查看患者詳情
        </button>
        <a
          href="/medical_record"
          className="flex-1 min-w-[120px] py-2 px-4 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-center"
        >
          前往病歷系統
        </a>
        <a
          href={`/appointments?patient_name=${encodeURIComponent(patient.chinese_name)}&phone_number=${encodeURIComponent(patient.phone_number)}`}
          className="flex-1 min-w-[120px] py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-center"
        >
          為此患者預約
        </a>
      </div>
    </div>
  );
};

export default function PatientRegistrationPage() {
  return (
    <PageErrorBoundary>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-8">患者登記系統</h1>
        <PatientForm />
      </div>
    </PageErrorBoundary>
  );
} 
