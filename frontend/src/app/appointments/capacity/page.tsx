'use client';

import axios from 'axios';
import { addDays, format, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { getBackendUrl } from '../../../utils/api-helpers';

interface TimeSlot {
    start_time: string;
    end_time: string;
    capacity: number;
    booked: number;
    available: number;
    doctor_id: number;
    doctor_name: string;
}

interface DailyCapacity {
    date: string;
    day_of_week: number;
    day_name: string;
    time_slots: TimeSlot[];
}

export default function CapacityManagementPage() {
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    const [doctorId, setDoctorId] = useState<string>('');
    const [capacityData, setCapacityData] = useState<DailyCapacity[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCapacityData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                date_from: `${startDate}T00:00:00`,
                date_to: `${endDate}T23:59:59`
            });

            if (doctorId) {
                params.append('doctor_id', doctorId);
            }

            const response = await axios.get(`${getBackendUrl('/appointment-slots/daily-capacity')}?${params.toString()}`);
            setCapacityData(response.data);
        } catch (err) {
            console.error('獲取預約容量數據失敗:', err);
            setError('無法載入預約容量數據，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCapacityData();
    }, []);

    const handleDateRangeChange = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCapacityData();
    };

    // 設定容量顏色
    const getCapacityColor = (available: number, capacity: number) => {
        const ratio = available / capacity;
        if (ratio === 0) {
            return 'bg-red-100 text-red-800';
        } else if (ratio <= 0.3) {
            return 'bg-orange-100 text-orange-800';
        } else if (ratio <= 0.6) {
            return 'bg-yellow-100 text-yellow-800';
        } else {
            return 'bg-green-100 text-green-800';
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">預約容量管理</h1>

            {/* 篩選表單 */}
            <form onSubmit={handleDateRangeChange} className="mb-6 bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">醫師</label>
                        <select
                            value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                        >
                            <option value="">所有醫師</option>
                            {/* 這裡需要從API獲取醫師列表 */}
                        </select>
                    </div>
                </div>
                <div className="mt-4">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        查詢
                    </button>
                </div>
            </form>

            {/* 容量顯示 */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-10">
                    <div className="spinner"></div>
                    <p className="mt-2 text-gray-600">正在載入容量數據...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {capacityData.map((day) => (
                        <div key={day.date} className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="bg-blue-600 text-white p-3">
                                <h2 className="font-bold">
                                    {format(parseISO(day.date), 'yyyy年MM月dd日')} ({day.day_name})
                                </h2>
                            </div>
                            <div className="p-3">
                                {day.time_slots.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">當日無預約時段</p>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {day.time_slots.map((slot, index) => (
                                            <li key={index} className="py-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">
                                                            {slot.start_time} - {slot.end_time}
                                                        </p>
                                                        <p className="text-sm text-gray-600">{slot.doctor_name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span
                                                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getCapacityColor(
                                                                slot.available,
                                                                slot.capacity
                                                            )}`}
                                                        >
                                                            剩餘: {slot.available}/{slot.capacity}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
