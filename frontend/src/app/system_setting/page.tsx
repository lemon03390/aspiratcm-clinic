"use client";

import Link from "next/link";

// 系統設定項目類型
interface SettingItem {
    title: string;
    description: string;
    path: string;
    icon: string;
    bgColor: string;
}

export default function SystemSettingPage() {
    // 系統設定選項
    const settingItems: SettingItem[] = [
        {
            title: '醫師管理',
            description: '管理診所醫師資料及應診時間',
            path: '/system_setting/doctors',
            icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
            bgColor: 'bg-blue-500'
        },
        {
            title: '預約類型設定',
            description: '設定診所提供的診療類型及時間',
            path: '/system_setting/consultation-types',
            icon: 'M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
            bgColor: 'bg-green-500'
        },
    ];

    // 打開新標籤頁函數
    const openInNewTab = (path: string) => {
        window.open(path, '_blank');
    };

    return (
        <div>
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800">系統管理</h1>
                <p className="text-gray-600 mt-2">管理診所系統設定</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settingItems.map((item, index) => (
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

            <div className="mt-8 text-center">
                <Link
                    href="/dashboard"
                    className="text-blue-500 hover:underline inline-flex items-center"
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
                            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                        />
                    </svg>
                    返回儀表板
                </Link>
            </div>
        </div>
    );
} 