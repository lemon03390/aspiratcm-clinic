"use client";
import { getBackendUrl } from '@/libs/apiClient';
import axios from 'axios';
import { useState } from 'react';

interface Appointment {
    id: number;
    patient_name: string;
    appointment_time: string;
    status: string;
}

interface AppointmentActionsProps {
    appointment: Appointment;
    onSuccess: () => void;
}

export default function AppointmentActions({ appointment, onSuccess }: AppointmentActionsProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        // 確認刪除
        if (!window.confirm(`確定要刪除 ${appointment.patient_name} 的預約嗎？此操作不可恢復。`)) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await axios.delete(getBackendUrl(`/appointments/${appointment.id}`));
            onSuccess();
        } catch (err: any) {
            console.error('刪除預約時出錯:', err);
            setError(err.response?.data?.detail || '刪除預約時發生錯誤');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-2 py-1 text-xs rounded 
          ${isDeleting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                title="刪除預約"
            >
                {isDeleting ? '刪除中...' : '刪除'}
            </button>

            {error && (
                <div className="text-red-500 text-xs">
                    {error}
                </div>
            )}
        </div>
    );
} 