"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';
import PatientForm from './components/PatientForm';

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