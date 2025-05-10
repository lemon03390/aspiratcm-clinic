"use client";

import { useState } from "react";

export default function ConsultationTypesPage() {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="p-6">
            <div className="bg-white rounded-lg p-8 mb-6">
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-12 h-12 text-blue-500"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-3">診症類型管理</h2>
                    <p className="text-gray-600 text-center max-w-md mb-6">
                        您可以在此設定診所提供的各種診症類型，包括價格、時長、描述等資訊。
                    </p>
                    <div className="flex gap-3 mt-2">
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                            onClick={() => { /* 功能尚未實現 */ }}
                        >
                            新增診症類型
                        </button>
                        <button
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                            onClick={() => { /* 功能尚未實現 */ }}
                        >
                            查看使用情況
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800">開發中功能</h3>
                    <p className="text-gray-600 mt-1">此功能目前正在開發中，即將推出。</p>
                </div>
                <div className="p-6">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    診症類型管理功能正在開發中，此頁面僅為預覽。完整功能將在後續版本中推出。
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
} 