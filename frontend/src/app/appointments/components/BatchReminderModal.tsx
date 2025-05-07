"use client";
import axios from "axios";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getBackendUrl } from "../../../libs/apiClient";

interface Appointment {
    id: number;
    patient_name: string;
    phone_number: string;
    appointment_time: string;
    doctor_name: string;
    status: string;
    consultation_type?: any;
    is_contagious?: number;
    is_troublesome?: number;
    is_first_time?: number;
}

interface BatchReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// 添加 SVG 路徑回退常數
const DEFAULT_PATH = "M0 0";

// 確保 SVG 路徑有效（避免 undefined 或空值）
const ensurePath = (path: string | undefined): string => {
    if (!path || path.trim() === '') {
        console.warn('發現無效的 SVG path，使用預設值');
        return DEFAULT_PATH;
    }
    return path;
};

export default function BatchReminderModal({ isOpen, onClose }: BatchReminderModalProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendingResults, setSendingResults] = useState<{
        success: number;
        failed: number;
        details: { id: number; name: string; status: "success" | "failed"; message?: string }[];
    }>({ success: 0, failed: 0, details: [] });
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTomorrowAppointments();
        }
    }, [isOpen]);

    const fetchTomorrowAppointments = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(getBackendUrl("/appointments/tomorrow"));

            console.log("獲取明日預約成功:", response.data.length);
            setAppointments(response.data);

            // 預設選擇所有預約
            setSelectedAppointments(response.data.map((a: Appointment) => a.id));
        } catch (err: any) {
            console.error("獲取明日預約失敗:", err);
            setError(err.response?.data?.detail || "獲取明日預約失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedAppointments.length === appointments.length) {
            setSelectedAppointments([]);
        } else {
            setSelectedAppointments(appointments.map(a => a.id));
        }
    };

    const handleToggleSelect = (id: number) => {
        if (selectedAppointments.includes(id)) {
            setSelectedAppointments(selectedAppointments.filter(appointmentId => appointmentId !== id));
        } else {
            setSelectedAppointments([...selectedAppointments, id]);
        }
    };

    const generateAppointmentReminder = (appointment: Appointment) => {
        const appointmentDate = format(new Date(appointment.appointment_time), "yyyy年MM月dd日");
        const appointmentTime = format(new Date(appointment.appointment_time), "HH:mm");

        return `尊敬的${appointment.patient_name}，提醒您與承志中醫診所的預約：
日期：${appointmentDate}
時間：${appointmentTime}
醫師：${appointment.doctor_name}

請提前15分鐘到達診所。如需更改預約，請提前通知。`;
    };

    const sendWhatsAppNotification = (phone: string, message: string) => {
        // 目前僅生成訊息範本，實際發送將在後續整合
        console.log(`準備發送WhatsApp訊息到 ${phone}:`, message);

        // 打開網頁版WhatsApp並預填訊息
        const encodedMessage = encodeURIComponent(message);
        const formattedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');

        return { success: true, message: `已準備WhatsApp訊息，將發送到 ${phone}` };
    };

    const handleSendReminders = async () => {
        if (selectedAppointments.length === 0) {
            setError("請選擇至少一個預約");
            return;
        }

        try {
            setIsSending(true);
            setError("");
            setSendingResults({ success: 0, failed: 0, details: [] });

            let successCount = 0;
            let failedCount = 0;
            const resultDetails = [];

            // 對於每個選定的預約，發送WhatsApp提醒
            for (const appointmentId of selectedAppointments) {
                const appointment = appointments.find(a => a.id === appointmentId);

                if (!appointment) {
                    failedCount++;
                    resultDetails.push({
                        id: appointmentId,
                        name: "未知",
                        status: "failed",
                        message: "找不到預約資訊"
                    });
                    continue;
                }

                try {
                    const message = generateAppointmentReminder(appointment);
                    const result = sendWhatsAppNotification(appointment.phone_number, message);

                    if (result.success) {
                        successCount++;
                        resultDetails.push({
                            id: appointment.id,
                            name: appointment.patient_name,
                            status: "success"
                        });
                    } else {
                        failedCount++;
                        resultDetails.push({
                            id: appointment.id,
                            name: appointment.patient_name,
                            status: "failed",
                            message: result.message
                        });
                    }

                    // 添加延遲以避免過快打開多個窗口
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err: any) {
                    console.error(`發送給 ${appointment.patient_name} 的提醒失敗:`, err);
                    failedCount++;
                    resultDetails.push({
                        id: appointment.id,
                        name: appointment.patient_name,
                        status: "failed",
                        message: err.message || "發送提醒失敗"
                    });
                }
            }

            // 更新結果
            setSendingResults({
                success: successCount,
                failed: failedCount,
                details: resultDetails
            });
            setShowResults(true);
        } catch (err: any) {
            console.error("批量發送提醒失敗:", err);
            setError(err.message || "批量發送提醒失敗，請稍後再試");
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h2 className="text-xl font-semibold text-gray-800">批量WhatsApp提醒</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8">
                            <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-gray-600">載入明日預約中...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6 px-4 bg-red-50 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="mt-2 text-red-600">{error}</p>
                            <button
                                onClick={fetchTomorrowAppointments}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                重試
                            </button>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-4 text-gray-600">明日沒有預約記錄</p>
                        </div>
                    ) : showResults ? (
                        <div className="py-4">
                            <div className="mb-6 text-center">
                                <h3 className="text-lg font-medium mb-2">發送結果摘要</h3>
                                <div className="flex justify-center gap-6">
                                    <div className="bg-green-50 px-6 py-3 rounded-lg">
                                        <span className="block text-xl font-bold text-green-600">{sendingResults.success}</span>
                                        <span className="text-sm text-green-700">成功</span>
                                    </div>
                                    <div className="bg-red-50 px-6 py-3 rounded-lg">
                                        <span className="block text-xl font-bold text-red-600">{sendingResults.failed}</span>
                                        <span className="text-sm text-red-700">失敗</span>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">患者姓名</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">訊息</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sendingResults.details.map((result) => (
                                            <tr key={result.id}>
                                                <td className="px-4 py-2 whitespace-nowrap">{result.name}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {result.status === "success" ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            成功
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            失敗
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">{result.message || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-center mt-6 space-x-4">
                                <button
                                    onClick={() => {
                                        setShowResults(false);
                                        setSendingResults({ success: 0, failed: 0, details: [] });
                                    }}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    返回預約列表
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    關閉
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex justify-between items-center">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="select-all"
                                        checked={selectedAppointments.length === appointments.length && appointments.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                                        全選 ({appointments.length} 個預約)
                                    </label>
                                </div>
                                <button
                                    onClick={handleSendReminders}
                                    disabled={isSending || selectedAppointments.length === 0}
                                    className={`px-4 py-2 rounded text-white flex items-center ${isSending || selectedAppointments.length === 0
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-700"
                                        }`}
                                >
                                    {isSending ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            發送中...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.415 14.382c-.298-.149-1.759-.89-2.032-1.002-.272-.106-.47-.17-.67.166-.198.334-.813 1.042-.994 1.254-.182.213-.364.242-.67.08-.303-.161-1.28-.483-2.442-1.543-.903-.818-1.507-1.83-1.685-2.137-.177-.309-.019-.475.133-.632.137-.142.308-.372.462-.56.155-.195.194-.333.294-.557.099-.228.05-.417-.025-.584-.075-.169-.669-1.66-.917-2.273-.241-.603-.485-.486-.67-.486-.171 0-.368-.011-.568-.011-.193 0-.507.074-.772.372-.265.296-1.016 1.019-1.016 2.487 0 1.467 1.047 2.881 1.193 3.081.145.196 2.044 3.19 5.06 4.36.71.27 1.262.434 1.69.557.722.243 1.376.208 1.896.124.578-.085 1.775-.729 2.022-1.425.251-.695.251-1.285.175-1.416-.074-.132-.272-.213-.57-.372Z" />
                                            </svg>
                                            發送WhatsApp提醒 ({selectedAppointments.length})
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">選擇</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">患者姓名</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">醫師</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {appointments.map((appointment) => (
                                            <tr key={appointment.id}
                                                className={`hover:bg-gray-50 ${appointment.is_contagious ? "bg-yellow-50" :
                                                    appointment.is_troublesome ? "bg-red-50" : ""
                                                    }`}
                                            >
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAppointments.includes(appointment.id)}
                                                        onChange={() => handleToggleSelect(appointment.id)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {format(new Date(appointment.appointment_time), "HH:mm")}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <div className="font-medium text-gray-800 flex items-center">
                                                        {appointment.patient_name}
                                                        {appointment.is_first_time === 1 && (
                                                            <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                                首次求診
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">{appointment.phone_number}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{appointment.doctor_name}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {appointment.is_contagious === 1 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                傳染病
                                                            </span>
                                                        )}
                                                        {appointment.is_troublesome === 1 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800">
                                                                麻煩症
                                                            </span>
                                                        )}
                                                        {appointment.consultation_type && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                                                {appointment.consultation_type.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
