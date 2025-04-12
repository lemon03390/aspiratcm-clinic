"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 導航項目類型
interface NavItem {
  title: string;
  description: string;
  path: string;
  icon: string; // 這裡使用簡單的Heroicon名稱
  bgColor: string;
}

export default function DashboardPage() {
  const router = useRouter();
  
  // 導航項目列表
  const navItems: NavItem[] = [
    {
      title: '預約管理',
      description: '管理患者預約，查看日程，標記患者狀態',
      path: '/appointments',
      icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
      bgColor: 'bg-blue-500'
    },
    {
      title: '患者登記',
      description: '登記新患者，管理患者資料，查看患者歷史',
      path: '/patient_registration',
      icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
      bgColor: 'bg-green-500'
    },
    {
      title: '病歷系統',
      description: '查看和編輯患者病歷，管理診斷和處方',
      path: '/medical_record',
      icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
      bgColor: 'bg-purple-500'
    }
  ];

  // 打開新標籤頁函數
  const openInNewTab = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-800">中醫診所管理系統</h1>
          <p className="text-gray-600 mt-2">選擇以下功能開始使用</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className={`${item.bgColor} h-2`}></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`w-10 h-10 ${item.bgColor.replace('bg-', 'text-')} mr-3`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={item.icon}
                    />
                  </svg>
                  <h2 className="text-xl font-semibold text-gray-800">{item.title}</h2>
                </div>
                <p className="text-gray-600 mb-6">{item.description}</p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => openInNewTab(item.path)}
                    className={`px-4 py-2 rounded-md ${item.bgColor} text-white flex items-center`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 mr-1"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                    在新標籤開啟
                  </button>
                  <Link
                    href={item.path}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
                  >
                    直接前往
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">系統概覽</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-medium text-blue-700 mb-2">今日預約</h3>
              <div className="text-3xl font-bold text-blue-900">12</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-medium text-green-700 mb-2">新患者</h3>
              <div className="text-3xl font-bold text-green-900">5</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-lg font-medium text-purple-700 mb-2">已完成就診</h3>
              <div className="text-3xl font-bold text-purple-900">8</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 