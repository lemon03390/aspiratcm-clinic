"use client";
import { useConfirm } from "@/app/components/Modal";
import { useToast } from "@/app/components/Toast";
import { getBackendUrl } from "@/libs/apiClient";
import axios from "axios";
import React, { useState } from "react";

interface Doctor {
    id: number;
    name: string;
    schedule: string[];
    email?: string;
    phone?: string;
}

interface DoctorManagementProps {
    onClose?: () => void;
    doctors: Doctor[];
    onDoctorsUpdate: () => void;
    isModal?: boolean;
}

export default function DoctorManagement({
    onClose,
    doctors,
    onDoctorsUpdate,
    isModal = true,
}: DoctorManagementProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [newDoctorName, setNewDoctorName] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [doctorSchedule, setDoctorSchedule] = useState<{ [key: string]: boolean }>({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
    });

    const { confirm, ConfirmDialog } = useConfirm();
    const { ToastContainer, success, error: showError } = useToast();

    const weekDays = {
        monday: "星期一",
        tuesday: "星期二",
        wednesday: "星期三",
        thursday: "星期四",
        friday: "星期五",
        saturday: "星期六",
        sunday: "星期日",
    };

    const fetchDoctorDetails = async (doctorId: number): Promise<Doctor | null> => {
        try {
            const response = await axios.get(getBackendUrl(`/doctors/${doctorId}`));
            console.log("獲取醫師詳細資料:", response.data);
            return response.data;
        } catch (err) {
            console.error("獲取醫師詳細資料失敗:", err);
            return null;
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim() === "0000") {
            setIsAuthenticated(true);
            setError("");
        } else {
            setError("密碼錯誤，請輸入正確的密碼");
        }
    };

    const handleAddDoctor = async () => {
        if (!newDoctorName.trim()) {
            setError("請輸入醫師名稱");
            return;
        }

        try {
            const payload = {
                name: newDoctorName.trim(),
                phone: "",
                schedule: [],
            };

            const response = await axios.post(getBackendUrl("/doctors"), payload, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            });

            if (response.status === 200 || response.status === 201) {
                setNewDoctorName("");
                onDoctorsUpdate();
                setError("");
            } else {
                setError("新增醫師失敗: 狀態碼 " + response.status);
            }
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err.message || "未知錯誤";
            setError("新增醫師失敗: " + detail);
            console.error("新增醫師失敗:", err);
        }
    };

    const handleSelectDoctor = async (doctor: Doctor) => {
        try {
            setError("");

            const fullDoctorDetails = await fetchDoctorDetails(doctor.id);

            if (fullDoctorDetails) {
                setSelectedDoctor(fullDoctorDetails);

                const schedule = fullDoctorDetails.schedule || [];
                setDoctorSchedule({
                    monday: schedule.includes("monday"),
                    tuesday: schedule.includes("tuesday"),
                    wednesday: schedule.includes("wednesday"),
                    thursday: schedule.includes("thursday"),
                    friday: schedule.includes("friday"),
                    saturday: schedule.includes("saturday"),
                    sunday: schedule.includes("sunday"),
                });
            } else {
                setSelectedDoctor({
                    ...doctor,
                    email: doctor.email || "",
                    phone: doctor.phone || ""
                });

                const schedule = doctor.schedule || [];
                setDoctorSchedule({
                    monday: schedule.includes("monday"),
                    tuesday: schedule.includes("tuesday"),
                    wednesday: schedule.includes("wednesday"),
                    thursday: schedule.includes("thursday"),
                    friday: schedule.includes("friday"),
                    saturday: schedule.includes("saturday"),
                    sunday: schedule.includes("sunday"),
                });
            }
        } catch (err) {
            console.error("選擇醫師時出錯:", err);
            showError("無法獲取醫師資料，請重試");
        }
    };

    const handleSaveSchedule = async () => {
        if (!selectedDoctor) {
            return;
        }

        const selectedSchedule = Object.entries(doctorSchedule)
            .filter(([_, isSelected]) => isSelected)
            .map(([day]) => day);

        try {
            setIsSubmitting(true);

            const doctorData = {
                name: selectedDoctor.name || "",
                email: selectedDoctor.email || "",
                phone: selectedDoctor.phone || "",
                schedule: selectedSchedule
            };

            console.log("即將發送 PUT 請求至", getBackendUrl(`/doctors/${selectedDoctor.id}`));
            console.log("請求 payload:", JSON.stringify(doctorData, null, 2));

            const response = await axios.put(getBackendUrl(`/doctors/${selectedDoctor.id}`), doctorData);

            console.log("更新醫師排班成功:", response.data);

            onDoctorsUpdate();
            setSelectedDoctor(null);
            success("醫師排班已更新");
        } catch (error: any) {
            console.error("更新排班失敗:", error);
            if (error.response) {
                console.error("錯誤狀態:", error.response.status);
                console.error("錯誤詳情:", error.response.data);
            }
            showError(`更新排班失敗：${error.response?.data?.detail || error.message || "請稍後再試"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDoctor = async (doctor: Doctor) => {
        try {
            confirm(
                `確定要刪除醫師 ${doctor.name} 嗎？`,
                "此操作無法復原",
                async () => {
                    try {
                        const response = await axios.delete(getBackendUrl(`/doctors/${doctor.id}`));
                        if (response.status === 200) {
                            onDoctorsUpdate();
                            success("醫師已成功刪除");
                        }
                    } catch (err: any) {
                        console.error("刪除醫師失敗:", err);
                        showError(
                            `刪除醫師失敗: ${err.response?.data?.detail || err.message || "未知錯誤"
                            }`
                        );
                    }
                },
                {
                    confirmText: "確認刪除",
                    cancelText: "取消",
                    confirmButtonColor: "red"
                }
            );
        } catch (err: any) {
            console.error("刪除醫師對話框出錯:", err);
            showError(`操作失敗: ${err.message || "未知錯誤"}`);
        }
    };

    if (!isAuthenticated && isModal) {
        return (
            <div className="bg-white p-6 rounded-lg w-96">
                <h2 className="text-xl font-bold mb-4">醫師管理</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-2">請輸入密碼：</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border p-2 rounded w-full"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1 italic">
                            提示：系統默認密碼為 0000
                        </p>
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 text-white px-4 py-2 rounded"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            確認
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    const content = (
        <div className={isModal ? "space-y-6" : "space-y-6 max-w-4xl mx-auto"}>
            <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-2">新增醫師</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newDoctorName}
                        onChange={(e) => setNewDoctorName(e.target.value)}
                        placeholder="請輸入醫師名稱"
                        className="border p-2 rounded flex-1"
                    />
                    <button
                        onClick={handleAddDoctor}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        新增
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-2">醫師列表</h3>
                <div className="space-y-2">
                    {doctors.map((doctor) => (
                        <div
                            key={doctor.id}
                            className="flex items-center justify-between border p-2 rounded"
                        >
                            <span>{doctor.name}</span>
                            <div className="space-x-2">
                                <button
                                    onClick={() => handleSelectDoctor(doctor)}
                                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                                >
                                    調整應診時間
                                </button>
                                <button
                                    onClick={() => handleDeleteDoctor(doctor)}
                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    刪除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedDoctor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-lg font-semibold mb-4">
                            {selectedDoctor.name} - 應診時間
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(weekDays).map(([day, label]) => (
                                <label key={day} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={doctorSchedule[day]}
                                        onChange={(e) =>
                                            setDoctorSchedule({
                                                ...doctorSchedule,
                                                [day]: e.target.checked,
                                            })
                                        }
                                        className="mr-2"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => setSelectedDoctor(null)}
                                className="bg-gray-500 text-white px-4 py-2 rounded"
                                disabled={isSubmitting}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveSchedule}
                                className="bg-blue-500 text-white px-4 py-2 rounded"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "處理中..." : "確認"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
            {isModal && (
                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="bg-gray-500 text-white px-4 py-2 rounded"
                    >
                        關閉
                    </button>
                </div>
            )}
        </div>
    );

    if (isModal) {
        return (
            <div className="bg-white p-6 rounded-lg w-[800px] max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">醫師管理</h2>
                {content}
                <ToastContainer />
                <ConfirmDialog />
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">醫師管理</h2>
            {content}
            <ToastContainer />
            <ConfirmDialog />
        </div>
    );
} 