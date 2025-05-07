"use client";

import { getBackendUrl } from "@/libs/apiClient";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import DoctorManagement from "./DoctorManagement";

interface Doctor {
    id: number;
    name: string;
    schedule: string[];
    email?: string;
    phone?: string;
}

export default function DoctorsManagementPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const response = await axios.get(getBackendUrl('/doctors'));
            console.log('獲取醫師數據:', response.data);
            setDoctors(response.data);
            setError(null);
        } catch (err: any) {
            console.error('獲取醫師數據失敗:', err);
            setError(`獲取醫師數據失敗：${err.message || '未知錯誤'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">醫師管理</h1>
                    <p className="text-gray-600 mt-1">管理診所醫師資料及應診時間</p>
                </div>
                <Link
                    href="/system_setting"
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
                    返回系統管理
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="p-6 text-red-500">{error}</div>
                ) : (
                    <DoctorManagement
                        doctors={doctors}
                        onDoctorsUpdate={fetchDoctors}
                        isModal={false}
                    />
                )}
            </div>
        </div>
    );
} 