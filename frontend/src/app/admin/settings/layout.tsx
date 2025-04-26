import React from 'react';
import Link from 'next/link';
import { Cog6ToothIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 側邊欄 */}
      <div className="w-64 bg-white shadow-md hidden md:block">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">中醫診所管理系統</h1>
          <p className="text-sm text-gray-500 mt-1">設定控制面板</p>
        </div>
        <div className="p-4">
          <Link 
            href="/dashboard" 
            className="flex items-center p-2 text-gray-700 rounded-md hover:bg-gray-100"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-2" />
            <span>返回儀表板</span>
          </Link>
          
          <div className="mt-6">
            <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              系統管理
            </h2>
            <div className="mt-2 space-y-1">
              <Link 
                href="/admin/settings" 
                className="flex items-center p-2 text-gray-700 rounded-md bg-blue-50 text-blue-700"
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                <span>TCM 參考資料</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1">
        {/* 移動端頂部導航 */}
        <div className="md:hidden bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">設定管理</h1>
          <Link href="/dashboard" className="text-blue-600">
            <ChevronLeftIcon className="h-6 w-6" />
          </Link>
        </div>
        
        {/* 內容 */}
        <div className="p-4 md:p-0">
          {children}
        </div>
      </div>
    </div>
  );
} 