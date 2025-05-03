"use client";
import axios from "axios";
import { format, isSameDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useEffect, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ConsultationType, consultationTypes } from "../../constants/consultationTypes";
import { getBackendUrl } from "../../libs/apiClient";
import { formatTime } from "../../utils/timeFormatter";
// 導入香港假期相關函數
import { isHKHoliday } from "../../constants/hk-holidays";
// 在文件頂部的 import 部分添加
import React from "react";
import BatchReminderModal from "../components/BatchReminderModal";

// 註冊繁體中文語言環境
registerLocale("zh-TW", zhTW);

// 添加自定義日曆樣式
import "./datepicker-custom.css";

// API路徑設置
// 不再使用硬編碼的URL，改用getBackendUrl函數
const API_BASE_URL = "/api/v1";

interface Doctor {
  id: number;
  name: string;
  schedule: string[];
}

interface AppointmentConsultationType extends ConsultationType {
  selectedSubType?: { id: string; label: string };
  subTypeLabel?: string;
}

interface Appointment {
  id: number;
  patient_name: string;
  phone_number: string;
  appointment_time: string;
  doctor_name: string;
  status: string;
  next_appointment?: string;
  related_appointment_id?: number;
  consultation_type?: AppointmentConsultationType;
  created_at?: string;
  updated_at?: string;
  is_contagious?: number;
  is_troublesome?: number;
  is_first_time?: number;
  is_followup?: number;
  is_returning_patient?: number;
  referral_source?: string;  // 新增：介紹人
  referral_notes?: string;   // 新增：自定義備註
}

type ActionType = "new" | "reschedule" | "followup" | "edit" | null;

// 在 AppointmentsPage 元件中添加日期渲染函數
const renderDayContents = (day: number, date: Date) => {
  // 檢查是否為香港假期
  const holiday = isHKHoliday(date);
  const isHoliday = !!holiday;

  return (
    <div className="relative">
      <span>{day}</span>
      {isHoliday && (
        <div className="holiday-tooltip">{holiday.name}</div>
      )}
    </div>
  );
};

// 患者狀態顯示組件
const PatientStatusDisplay = ({ appointment }: { appointment: Appointment }) => {
  // 計算剩餘等待時間（分鐘）
  const calculateWaitingTime = () => {
    const currentTime = new Date();
    const appointmentTime = new Date(appointment.appointment_time);
    const diffMs = appointmentTime.getTime() - currentTime.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  };

  const waitingTime = calculateWaitingTime();

  if (appointment.status === "已到診") {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        已到診
      </span>
    );
  } else if (appointment.status === "未應診") {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          等候中
        </span>
        {waitingTime > 0 && (
          <div className="text-xs text-gray-500">
            預計還需等待 {waitingTime} 分鐘
          </div>
        )}
      </div>
    );
  } else {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
        ${appointment.status.includes("已改期")
          ? "bg-blue-100 text-blue-800 border border-blue-200"
          : appointment.status === "失約" || appointment.status === "失蹤人口"
            ? "bg-red-100 text-red-800 border border-red-200"
            : appointment.status.includes("覆診")
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : "bg-yellow-100 text-yellow-800 border border-yellow-200"
        }`}
      >
        {appointment.status}
      </span>
    );
  }
};

// WhatsApp 訊息發送相關函數
const sendWhatsAppNotification = (phone: string, message: string) => {
  // 目前僅生成訊息範本，實際發送將在後續整合
  console.log(`準備發送WhatsApp訊息到 ${phone}:`, message);

  // 打開網頁版WhatsApp並預填訊息（演示用）
  const encodedMessage = encodeURIComponent(message);
  const formattedPhone = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');

  return `【測試模式】WhatsApp訊息已準備: "${message}" 將發送到 ${phone}`;
};

// 生成預約提醒訊息
const generateAppointmentReminder = (appointment: Appointment) => {
  const appointmentDate = format(new Date(appointment.appointment_time), "yyyy年MM月dd日");
  const appointmentTime = format(new Date(appointment.appointment_time), "HH:mm");

  return `尊敬的${appointment.patient_name}，提醒您與承志中醫診所的預約：
日期：${appointmentDate}
時間：${appointmentTime}
醫師：${appointment.doctor_name}

請提前15分鐘到達診所。如需更改預約，請提前通知。`;
};

// 生成改期通知訊息
const generateRescheduledMessage = (appointment: Appointment, newDate: string, newTime: string) => {
  const originalDate = format(new Date(appointment.appointment_time), "yyyy年MM月dd日");
  const originalTime = format(new Date(appointment.appointment_time), "HH:mm");

  return `尊敬的${appointment.patient_name}，您在承志中醫診所的預約已更改：
原預約：${originalDate} ${originalTime}
新預約：${newDate} ${newTime}
醫師：${appointment.doctor_name}

如有任何疑問，請聯繫診所。`;
};

// 在 imports 下方定義 debounce 函數
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
      timeout = null;
    }, wait);
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDoctorManagement, setShowDoctorManagement] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 日曆相關狀態
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState("10");
  const [selectedMinute, setSelectedMinute] = useState("00");
  // 為月份選擇添加狀態
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "10", "20", "30", "40", "50"];
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [doctorAppointmentsMap, setDoctorAppointmentsMap] = useState<{
    [key: string]: Appointment[];
  }>({});
  const [filterText, setFilterText] = useState("");

  // 查詢預約相關狀態
  const [showQueryDialog, setShowQueryDialog] = useState(false);
  const [queryPhoneNumber, _setQueryPhoneNumber] = useState("");
  // 安全設置電話號碼的函數
  const setQueryPhoneNumber = (value: any) => {
    // 更徹底的類型檢查和安全處理

    // 處理函數類型（可能是事件處理函數或其他回調）
    if (typeof value === 'function') {
      console.error("警告: 嘗試將函數設置為電話號碼", value);
      _setQueryPhoneNumber("");
      return;
    }

    // 處理事件對象
    if (value && typeof value === 'object' && 'target' in value && value.target && 'value' in value.target) {
      // 如果傳入的是事件對象，取其 target.value
      const inputValue = (value.target as { value: any }).value;
      _setQueryPhoneNumber(String(inputValue || '').trim());
      return;
    }

    // 處理其他非原始值
    if (value && typeof value === 'object') {
      console.warn("嘗試將對象設置為電話號碼", value);
      _setQueryPhoneNumber("");
      return;
    }

    // 處理 null/undefined
    if (value === null || value === undefined) {
      _setQueryPhoneNumber("");
      return;
    }

    // 標準情況: 字串或數字轉為字串
    const phoneValue = String(value).trim();
    _setQueryPhoneNumber(phoneValue);
  };
  const [queryResults, setQueryResults] = useState<Appointment[]>([]);
  const [patientOptions, setPatientOptions] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [queryStep, setQueryStep] = useState<"phone" | "patient" | "results">(
    "phone",
  );

  const [newAppointmentData, setNewAppointmentData] = useState({
    patient_name: "",
    phone_number: "",
    doctor_name: "",
    consultation_type: {
      ...consultationTypes[0],
      selectedSubType: consultationTypes[0].subTypes &&
        consultationTypes[0].subTypes.length > 0 ?
        consultationTypes[0].subTypes[0] : undefined
    } as AppointmentConsultationType,
    is_first_time: 0,
    is_troublesome: 0,
    is_contagious: 0,
    referral_source: "",  // 介紹人
    referral_notes: ""    // 備註
  });
  const [phoneError, setPhoneError] = useState("");

  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [managementPassword, setManagementPassword] = useState("");
  const [newDoctorName, setNewDoctorName] = useState("");
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<{ [key: string]: boolean }>({});
  const [managementError, setManagementError] = useState("");
  const [confirmDeleteDoctor, setConfirmDeleteDoctor] = useState<Doctor | null>(null);
  // 新增一個確認刪除的狀態
  const [confirmDeleteAppointment, setConfirmDeleteAppointment] = useState<Appointment | null>(null);
  // 新增一個介紹人選項的狀態
  const [referralSources, setReferralSources] = useState<{ id: number; name: string }[]>([
    { id: 0, name: "無" },
    { id: 1, name: "小寶" }
  ]);

  // 定義星期對應表
  const weekDays = {
    monday: "星期一",
    tuesday: "星期二",
    wednesday: "星期三",
    thursday: "星期四",
    friday: "星期五",
    saturday: "星期六",
    sunday: "星期日",
  };

  // 在 AppointmentsPage 組件中添加狀態
  const [showBatchReminderModal, setShowBatchReminderModal] = useState(false);

  // 修改為防抖函數
  const debouncedFetchAppointments = debounce(() => {
    fetchAppointments();
  }, 2000);

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchReferralSources();

    // 設置自動刷新（每10分鐘）- 降低頻率以減少伺服器負載
    const intervalId = setInterval(
      () => {
        fetchAppointments();
      },
      10 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, []);

  // 添加點擊空白處關閉月份選擇器的處理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMonthYearPicker && !target.closest('.month-year-picker-container')) {
        setShowMonthYearPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthYearPicker]);

  // 當預約數據或選擇日期發生變化時，過濾預約
  useEffect(() => {
    // 創建一個函數來進行過濾
    const filterAppointments = (appointments: Appointment[], filterText: string) => {
      if (!filterText || filterText.trim() === "") {
        return appointments;
      }

      const trimmedFilter = filterText.trim().toLowerCase();
      return appointments.filter(
        (appointment) =>
          appointment.patient_name.toLowerCase().includes(trimmedFilter) ||
          appointment.phone_number.includes(trimmedFilter)
      );
    };

    if (selectedDate) {
      // 同步月份選擇器狀態
      setSelectedMonth(selectedDate.getMonth());
      setSelectedYear(selectedDate.getFullYear());

      // 過濾選定日期的預約
      let dateFiltered = appointments.filter((appointment) =>
        isSameDay(new Date(appointment.appointment_time), selectedDate),
      );

      // 如果有過濾文本，進一步過濾
      let filtered = filterText ? filterAppointments(dateFiltered, filterText) : dateFiltered;

      // 按照時間從早到晚排序
      filtered.sort((a, b) => {
        const timeA = new Date(a.appointment_time).getTime();
        const timeB = new Date(b.appointment_time).getTime();
        // 時間相同時按照創建時間排序
        if (timeA === timeB) {
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        }
        return timeA - timeB;
      });

      setFilteredAppointments(filtered);

      // 獲取選定日期的星期幾
      const dayOfWeek = selectedDate.getDay();
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const selectedDayName = dayNames[dayOfWeek];

      // 找出當天應診的所有醫師
      const availableDoctors = doctors.filter(
        (doctor) =>
          doctor.schedule && doctor.schedule.includes(selectedDayName),
      );

      // 按醫師分組
      const doctorMap: { [key: string]: Appointment[] } = {};

      // 首先將所有應診醫師添加到映射中（即使沒有預約）
      availableDoctors.forEach((doctor) => {
        doctorMap[doctor.name] = [];
      });

      // 然後添加預約數據
      filtered.forEach((appointment) => {
        if (!doctorMap[appointment.doctor_name]) {
          doctorMap[appointment.doctor_name] = [];
        }
        doctorMap[appointment.doctor_name].push(appointment);
      });

      setDoctorAppointmentsMap(doctorMap);
    } else {
      // 如果沒有選擇日期，使用所有預約
      let filtered = filterText ? filterAppointments(appointments, filterText) : appointments;

      // 按照時間從早到晚排序
      filtered.sort((a, b) => {
        const timeA = new Date(a.appointment_time).getTime();
        const timeB = new Date(b.appointment_time).getTime();
        return timeA - timeB;
      });

      setFilteredAppointments(filtered);

      // 重置醫師分組
      setDoctorAppointmentsMap({});
    }
  }, [appointments, selectedDate, doctors, filterText]);

  // 初始化時選擇子選項的預設值
  useEffect(() => {
    if (
      newAppointmentData.consultation_type.subTypes &&
      newAppointmentData.consultation_type.subTypes.length > 0 &&
      !newAppointmentData.consultation_type.selectedSubType
    ) {
      setNewAppointmentData({
        ...newAppointmentData,
        consultation_type: {
          ...newAppointmentData.consultation_type,
          selectedSubType: newAppointmentData.consultation_type.subTypes[0],
        },
      });
    }
  }, [newAppointmentData.consultation_type.id]);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(getBackendUrl("/doctors"));
      setDoctors(response.data);
      if (response.data.length > 0) {
        setNewAppointmentData((prev) => ({
          ...prev,
          doctor_name: response.data[0].name,
          consultation_type: {
            ...prev.consultation_type,
            selectedSubType: prev.consultation_type.subTypes &&
              prev.consultation_type.subTypes.length > 0 ?
              prev.consultation_type.subTypes[0] : undefined
          }
        }));
      }
    } catch (err) {
      setError("獲取醫師資料時出錯");
      console.error("獲取醫師資料時出錯:", err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(getBackendUrl("/appointments"));
      console.log("從API獲取的原始預約資料:", response.data);

      // 處理預約資料，添加覆診和舊症標記
      const processedAppointments = response.data.map((appointment: Appointment) => {
        // 預設值
        let is_followup = 0;
        let is_returning_patient = 0;

        // 根據狀態文字和相關預約ID判斷是否為覆診預約
        if (appointment.status.includes('覆診') ||
          (appointment.related_appointment_id &&
            (appointment.status === '未應診' || appointment.status === '已到診' ||
              appointment.status.includes('改期')))) {
          is_followup = 1;

          // 如果是覆診，不應該同時是首次求診
          if (appointment.is_first_time === 1) {
            appointment.is_first_time = 0;
          }
        }

        // 根據相關預約ID判斷是否為舊症患者
        // 不是覆診但有相關預約且「相關預約為已到診」的患者視為舊症
        if (appointment.related_appointment_id && is_followup === 0) {
          // 查找相關預約
          const relatedAppointment = response.data.find(
            (apt: Appointment) => apt.id === appointment.related_appointment_id
          );

          // 只有當相關預約是「已到診」時，才標記為舊症
          if (relatedAppointment && relatedAppointment.status === '已到診') {
            is_returning_patient = 1;
          }
        }

        // 尋找所有具有相同電話號碼的「已到診」預約紀錄
        // 如果有之前已到診的紀錄，且當前不是首次求診也不是覆診，則標記為舊症
        if (!is_followup && appointment.is_first_time !== 1 && is_returning_patient === 0) {
          const samePhoneCompletedAppointments = response.data.filter(
            (apt: Appointment) =>
              apt.phone_number === appointment.phone_number &&
              apt.id !== appointment.id &&
              apt.status === '已到診' &&
              new Date(apt.appointment_time) < new Date(appointment.appointment_time)
          );

          if (samePhoneCompletedAppointments.length > 0) {
            is_returning_patient = 1;
          }
        }

        // 直接保留API回傳的原始值，不覆蓋或做預設處理
        const result = {
          ...appointment,
          is_followup,
          is_returning_patient
        };

        console.log(`處理預約 ID:${appointment.id}, referral_source:${appointment.referral_source}, referral_notes:${appointment.referral_notes}`);

        return result;
      });

      console.log("處理後的預約資料:", processedAppointments);
      setAppointments(processedAppointments);
      setLoading(false);
    } catch (err) {
      setError("獲取預約資料時出錯");
      console.error("獲取預約資料時出錯:", err);
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: number, newStatus: string) => {
    try {
      console.log('準備更新預約狀態:', {
        appointmentId,
        newStatus
      });

      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        throw new Error('找不到該預約');
      }

      const response = await axios.put(
        getBackendUrl(`/appointments/${appointmentId}`),
        {
          ...appointment,
          status: newStatus
        }
      );

      if (response.status === 200) {
        console.log('預約狀態更新成功');
        // 使用防抖函數減少頻繁API呼叫
        debouncedFetchAppointments();
      }
    } catch (err: any) {
      console.error('更新預約狀態失敗:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("更新預約狀態失敗");
      }
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\d{8,}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneChange = (value: any) => {
    // 複用相同的安全參數處理邏輯
    let phoneValue = "";

    // 處理函數類型
    if (typeof value === 'function') {
      console.error("電話號碼是函數類型，無效", value);
      phoneValue = "";
    }
    // 處理事件對象
    else if (value && typeof value === 'object' && 'target' in value && value.target && 'value' in value.target) {
      const inputValue = (value.target as { value: any }).value;
      phoneValue = String(inputValue || '').trim();
    }
    // 處理其他非原始值
    else if (value && typeof value === 'object') {
      console.warn("嘗試將對象設置為電話號碼", value);
      phoneValue = "";
    }
    // 處理 null/undefined
    else if (value === null || value === undefined) {
      phoneValue = "";
    }
    // 標準情況
    else {
      phoneValue = String(value).trim();
    }

    // 更新預約數據
    setNewAppointmentData({
      ...newAppointmentData,
      phone_number: phoneValue,
    });

    // 電話號碼驗證
    if (phoneValue && !validatePhoneNumber(phoneValue)) {
      setPhoneError("聯絡電話必須至少包含8位數字");
    } else {
      setPhoneError("");
    }
  };

  const handleTimeSelect = async (selectedTime: Date) => {
    try {
      setIsSubmitting(true);
      setError("");

      if (selectedAction === "new") {
        if (!validatePhoneNumber(newAppointmentData.phone_number)) {
          setError("請輸入有效的聯絡電話");
          setIsSubmitting(false);
          return;
        }

        // 確保有選擇子選項
        const consultationTypeObj = {
          ...newAppointmentData.consultation_type,
          subType:
            newAppointmentData.consultation_type.selectedSubType ||
            (newAppointmentData.consultation_type.subTypes &&
              newAppointmentData.consultation_type.subTypes.length > 0
              ? newAppointmentData.consultation_type.subTypes[0]
              : undefined),
        };

        // 創建不包含時區信息的ISO字符串，保持本地時間
        const localTimeString = selectedTime.toISOString().replace('Z', '');

        const newAppointment = {
          patient_name: newAppointmentData.patient_name,
          phone_number: newAppointmentData.phone_number,
          doctor_name: newAppointmentData.doctor_name,
          appointment_time: localTimeString,
          consultation_type: consultationTypeObj,
          status: "未應診",
          is_first_time: newAppointmentData.is_first_time,
          is_troublesome: newAppointmentData.is_troublesome,
          is_contagious: newAppointmentData.is_contagious,
          referral_source: newAppointmentData.referral_source,
          referral_notes: newAppointmentData.referral_notes
        };

        console.log("提交新預約數據:", newAppointment);
        console.log("POST 請求目標:", getBackendUrl("/appointments"));

        try {
          // 使用更詳細的錯誤處理方式發送請求
          const response = await axios.post(
            getBackendUrl("/appointments"),
            newAppointment,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': `appointment-${Date.now()}` // 添加请求ID，便于跟踪
              },
              timeout: 10000, // 10秒超時
            }
          );

          console.log("預約創建成功，回應:", response.status, response.data);
          console.log("完整的預約創建回應資料:", response.data);

          if (response.status === 200 || response.status === 201) {
            setShowTimePicker(false);
            setSelectedAction(null);
            setNewAppointmentData({
              patient_name: "",
              phone_number: "",
              doctor_name: doctors.length > 0 ? doctors[0].name : "",
              consultation_type: {
                ...consultationTypes[0],
                selectedSubType: consultationTypes[0].subTypes &&
                  consultationTypes[0].subTypes.length > 0 ?
                  consultationTypes[0].subTypes[0] : undefined
              } as AppointmentConsultationType,
              is_first_time: 0,
              is_troublesome: 0,
              is_contagious: 0,
              referral_source: "",
              referral_notes: ""
            });
            fetchAppointments();

            // 強制重新獲取所有預約
            setTimeout(() => {
              console.log("強制刷新預約列表");
              fetchAppointments();
            }, 500);
          }
        } catch (error: any) {
          console.error("預約創建失敗，錯誤詳情:", error);

          // 記錄請求和响應的詳细信息
          if (error.response) {
            console.error("回應狀態:", error.response.status);
            console.error("回應內容:", error.response.data);

            setError(`預約創建失敗: ${error.response.data?.detail || error.response.statusText || '伺服器錯誤'}`);
          } else if (error.request) {
            console.error("未收到回應的請求:", error.request);
            setError("預約創建失敗: 無法連接到伺服器");
          } else {
            console.error("設置請求時發生錯誤:", error.message);
            setError(`預約創建失敗: ${error.message}`);
          }

          setIsSubmitting(false);
          return;
        }

        return;
      }

      // 其他邏輯保持不變
      if (selectedAction === "reschedule") {
        // 處理改期
        const originalAppointment = { ...selectedAppointment };

        // 更新原始預約的狀態
        const updatedOriginal = {
          ...originalAppointment,
          status: `已改期至 ${format(selectedTime, "MM月dd日 HH:mm")}`,
        };

        await axios.put(
          getBackendUrl(`/appointments/${originalAppointment.id}`),
          updatedOriginal
        );

        // 創建不包含時區信息的ISO字符串，保持本地時間
        const localTimeString = selectedTime.toISOString().replace('Z', '');

        // 創建新的預約
        const newAppointment = {
          patient_name: originalAppointment.patient_name,
          phone_number: originalAppointment.phone_number,
          doctor_name: originalAppointment.doctor_name,
          appointment_time: localTimeString,
          consultation_type: originalAppointment.consultation_type,
          status: "未應診",
          is_troublesome: originalAppointment.is_troublesome,
          is_first_time: originalAppointment.is_first_time || 0, // 保留首次求診標記
          is_contagious: originalAppointment.is_contagious,
          related_appointment_id: originalAppointment.id,
          referral_source: originalAppointment.referral_source,
          referral_notes: originalAppointment.referral_notes
        };

        await axios.post(getBackendUrl("/appointments"), newAppointment);

        // 在成功改期後發送WhatsApp通知
        const newDate = format(selectedTime, "yyyy年MM月dd日");
        const newTime = `${selectedHour}:${selectedMinute}`;
        const message = generateRescheduledMessage(originalAppointment, newDate, newTime);
        const result = sendWhatsAppNotification(originalAppointment.phone_number, message);
        setError(result);
      } else if (selectedAction === "followup") {
        // 處理覆診
        const originalAppointment = { ...selectedAppointment };

        // 創建不包含時區信息的ISO字符串，保持本地時間
        const localTimeString = selectedTime.toISOString().replace('Z', '');

        // 更新原始預約的狀態
        const updatedOriginal = {
          ...originalAppointment,
          status: `將於${format(selectedTime, "MM月dd日")}覆診`,
          next_appointment: localTimeString
        };

        await axios.put(
          getBackendUrl(`/appointments/${originalAppointment.id}`),
          updatedOriginal
        );

        // 創建新的覆診預約
        const newAppointment = {
          patient_name: originalAppointment.patient_name,
          phone_number: originalAppointment.phone_number,
          doctor_name: originalAppointment.doctor_name,
          appointment_time: localTimeString,
          consultation_type: originalAppointment.consultation_type,
          status: "未應診",
          is_troublesome: originalAppointment.is_troublesome,
          is_contagious: originalAppointment.is_contagious,
          related_appointment_id: originalAppointment.id,
          referral_source: originalAppointment.referral_source,
          referral_notes: originalAppointment.referral_notes
        };

        await axios.post(getBackendUrl("/appointments"), newAppointment);
      }

      setShowTimePicker(false);
      setSelectedAppointment(null);
      setSelectedAction(null);
      fetchAppointments();
    } catch (err: any) {
      console.error("操作失敗完整錯誤:", err);

      if (err.response) {
        console.error("錯誤響應數據:", err.response.data);
        console.error("錯誤響應狀態:", err.response.status);

        if (err.response.data?.detail) {
          setError(`操作失敗: ${err.response.data.detail}`);
        } else if (typeof err.response.data === 'string') {
          setError(`操作失敗: ${err.response.data}`);
        } else {
          setError(`操作失敗: 伺服器錯誤 (${err.response.status})`);
        }
      } else if (err.request) {
        setError("操作失敗: 無法連接到伺服器");
        console.error("無法連接到伺服器:", err.request);
      } else {
        setError(`操作失敗: ${err.message || "未知錯誤"}`);
      }
    } finally {
      // 無論成功或失敗，都重置提交狀態
      setIsSubmitting(false);
    }
  };

  const handleActionClick = (
    appointment: Appointment,
    action: "reschedule" | "followup" | "edit"
  ) => {
    setSelectedAppointment(appointment);
    setSelectedAction(action);
    if (action === "edit") {
      setNewAppointmentData({
        patient_name: appointment.patient_name,
        phone_number: appointment.phone_number,
        doctor_name: appointment.doctor_name,
        consultation_type: appointment.consultation_type || consultationTypes[0],
        is_first_time: appointment.is_first_time || 0,
        is_troublesome: appointment.is_troublesome || 0,
        is_contagious: appointment.is_contagious || 0,
        referral_source: appointment.referral_source || "",
        referral_notes: appointment.referral_notes || ""
      });
      setShowTimePicker(false);
    } else {
      setShowTimePicker(true);
    }
  };

  const handleQueryByPhone = async () => {
    try {
      setError("");
      // 清空之前的查詢結果
      setPatientOptions([]);
      setSelectedPatient("");
      setQueryResults([]);

      // 加強類型處理，確保安全的 phone_number 參數
      let safePhoneNumber = "";

      // 檢查 queryPhoneNumber 是否有效
      if (typeof queryPhoneNumber === 'function') {
        console.error("電話號碼是函數類型，無法查詢", queryPhoneNumber);
        setError("電話號碼格式無效，請輸入有效的電話號碼");
        return;
      } else if (queryPhoneNumber === null || queryPhoneNumber === undefined) {
        console.warn("電話號碼為 null 或 undefined");
        setError("請輸入電話號碼");
        return;
      } else {
        // 確保是字串並移除空白
        safePhoneNumber = String(queryPhoneNumber).trim();
      }

      if (!safePhoneNumber) {
        setError("請輸入電話號碼");
        return;
      }

      // 檢查是否是有效的電話號碼格式
      if (!/^\d{8,}$/.test(safePhoneNumber)) {
        setError("請輸入有效的電話號碼（至少8位數字）");
        return;
      }

      // 顯示加載提示
      setError("正在查詢中，請稍候...");

      console.log(`開始查詢電話號碼: ${safePhoneNumber}`);

      // 帶入更多請求診斷資訊
      const requestParams = { phone_number: safePhoneNumber };
      console.log(`發送請求參數: ${JSON.stringify(requestParams)}`);
      console.log(`API URL: ${getBackendUrl("/appointments/by-phone")}`);

      // 修正API路徑，使用正確的端點和更加安全的參數
      const response = await axios.get(getBackendUrl("/appointments/by-phone"), {
        params: requestParams,
        // 設置超時，避免請求無限等待
        timeout: 10000,
        // 添加請求頭以便後端診斷
        headers: {
          'X-Request-Source': 'frontend-query',
          'X-Request-Time': new Date().toISOString()
        }
      });

      console.log(`查詢完成，結果數量: ${response.data?.length || 0}`);

      // 清除加載提示
      setError("");

      const appointments = response.data;

      if (appointments.length === 0) {
        // 如果是在新增預約流程中，可以提供一個選項直接使用當前電話號碼
        if (showTimePicker && selectedAction === "new") {
          setNewAppointmentData(prev => ({
            ...prev,
            phone_number: safePhoneNumber,
            is_first_time: 1 // 因為沒有找到記錄，所以標記為首次求診
          }));
          setError("沒有找到相關記錄，已自動標記為首次求診患者");
          setShowQueryDialog(false);
          return;
        }

        setQueryStep("results");
        setQueryResults([]);
        setError("沒有找到符合條件的預約記錄");
        return;
      }

      // 按照患者姓名分組，避免Set類型問題
      const namesMap: { [key: string]: boolean } = {};
      appointments.forEach(a => {
        if (a.patient_name) {
          namesMap[a.patient_name] = true;
        }
      });
      const patientNames = Object.keys(namesMap);

      if (patientNames.length === 1) {
        // 只有一位患者的情況
        setQueryStep("results");
        setQueryResults(appointments);
      } else {
        // 多位患者的情況，需要選擇
        setQueryStep("patient");
        setPatientOptions(patientNames);
      }
    } catch (err: any) {
      console.error("查詢預約失敗詳細資訊:", err);

      // 處理 Not Found 錯誤
      if (err.response?.status === 404) {
        // 如果是在新增預約流程中，自動標記為首次求診
        if (showTimePicker && selectedAction === "new") {
          // 確保使用安全的字串值
          const safePhoneNumber = String(queryPhoneNumber || '').trim();
          setNewAppointmentData(prev => ({
            ...prev,
            phone_number: safePhoneNumber,
            is_first_time: 1 // 因為沒有找到記錄，所以標記為首次求診
          }));
          setError("沒有找到相關記錄，已自動標記為首次求診患者");
          setShowQueryDialog(false);
          return;
        }

        // 如果不是在新增預約流程中，顯示查詢結果為空
        setQueryStep("results");
        setQueryResults([]);
        setError("沒有找到相關記錄");
      } else if (err.code === 'ECONNABORTED') {
        // 處理請求超時
        setError("查詢請求超時，請檢查網絡連接並稍後再試");
      } else if (err.response?.status === 422) {
        // 加強422錯誤的詳細日誌，輸出所有內容
        console.error("422 參數驗證失敗:", err.response?.data);
        console.error("請求內容:", {
          url: err.config?.url,
          params: err.config?.params,
          method: err.config?.method
        });

        setError("查詢參數錯誤: 請輸入有效的電話號碼");
      } else if (err.response) {
        // 伺服器回應了錯誤訊息
        setError(`查詢預約失敗: ${err.response.data?.detail || err.response.statusText || '伺服器錯誤'}`);
      } else if (err.request) {
        // 請求發送但沒有收到回應
        setError("無法連接到伺服器，請檢查網絡連接");
      } else {
        // 其他錯誤
        setError(`查詢預約失敗: ${err.message || '未知錯誤'}`);
      }
    }
  };

  const handlePatientSelect = async () => {
    // 從現有數據中過濾選定患者的預約
    const patientAppointments = queryResults.filter(
      (a) => a.patient_name === selectedPatient,
    );

    // 按時間從新到舊排序
    patientAppointments.sort(
      (a, b) =>
        new Date(b.appointment_time).getTime() -
        new Date(a.appointment_time).getTime(),
    );

    setQueryResults(patientAppointments);
    setQueryStep("results");

    // 檢查我們是否在新增預約流程中
    const isInNewAppointmentFlow = showTimePicker && selectedAction === "new";

    // 如果在新增預約流程中且有患者預約記錄，自動填充患者資料
    if ((isInNewAppointmentFlow || selectedAction === "new") && patientAppointments.length > 0) {
      const latestAppointment = patientAppointments[0]; // 最新的預約
      setNewAppointmentData(prev => ({
        ...prev,
        patient_name: selectedPatient,
        phone_number: latestAppointment.phone_number,
        is_first_time: 0 // 如果已有記錄，默認不是首次求診
      }));

      // 檢查是否有已到診記錄
      const hasCompletedAppointment = patientAppointments.some(a => a.status === '已到診');
      if (!hasCompletedAppointment) {
        setNewAppointmentData(prev => ({
          ...prev,
          is_first_time: 1 // 如果沒有已到診記錄，可能是首次求診
        }));
        setError("注意：此電話號碼之前沒有成功就診記錄，已自動標記為首次求診患者");
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 直接在前端硬编码密码验证，而不是通过API调用
    if (managementPassword.trim() === "0000") {
      setIsPasswordVerified(true);
      setManagementError("");
    } else {
      setManagementError("密碼錯誤，請輸入正確的密碼");
    }
  };

  const handleAddDoctor = async () => {
    try {
      if (!newDoctorName || newDoctorName.trim() === "") {
        console.error("醫師名稱不能為空");
        setManagementError("醫師名稱不能為空");
        return;
      }

      console.log("正在新增醫師:", newDoctorName);
      console.log("使用API地址:", getBackendUrl("/doctors"));

      const response = await axios.post(
        getBackendUrl("/doctors"),
        { name: newDoctorName.trim() }
      );

      console.log("新增醫師API響應:", response);

      if (response.status === 200 || response.status === 201) {
        console.log("醫師新增成功:", response.data);
        setNewDoctorName("");
        fetchDoctors();
        setManagementError("");
      } else {
        console.error("非預期的響應狀態碼:", response.status);
        setManagementError(`新增醫師失敗: 狀態碼 ${response.status}`);
      }
    } catch (err: any) {
      console.error("新增醫師時出錯:", err);
      console.error("錯誤細節:", err.response?.data?.detail || err.message);
      if (err.response?.data?.detail) {
        setManagementError(`新增醫師失敗: ${err.response.data.detail}`);
      } else {
        setManagementError(`新增醫師失敗: ${err.message || "未知錯誤"}`);
      }
    }
  };

  const handleEditDoctorSchedule = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setDoctorSchedule(doctor.schedule.reduce((acc, day) => ({ ...acc, [day]: true }), {}));
  };

  const handleScheduleChange = (day: string, checked: boolean) => {
    setDoctorSchedule({ ...doctorSchedule, [day]: checked });
  };

  const handleSaveSchedule = async () => {
    try {
      const scheduleArray = Object.entries(doctorSchedule)
        .filter(([_, isChecked]) => isChecked)
        .map(([day]) => day);

      console.log('準備更新醫師應診時間:', {
        doctorId: editingDoctor?.id,
        schedule: scheduleArray
      });

      const response = await axios.put(
        getBackendUrl(`/doctors/${editingDoctor?.id}`),
        { schedule: scheduleArray }
      );

      if (response.status === 200) {
        console.log('醫師應診時間更新成功');
        setEditingDoctor(null);
        fetchDoctors();
      }
    } catch (err: any) {
      console.error('保存醫師應診時間失敗:', err);
      if (err.response?.data?.detail) {
        setManagementError(err.response.data.detail);
      } else {
        setManagementError("保存醫師應診時間失敗");
      }
    }
  };

  const handleDeleteDoctor = (id: number, name: string) => {
    // 創建一個符合Doctor類型的對象
    const doctorToDelete: Doctor = {
      id,
      name,
      schedule: [], // 提供空的schedule以滿足類型需求
    };
    setConfirmDeleteDoctor(doctorToDelete);
  };

  // 刪除預約函數
  const handleDeleteAppointment = async (appointmentId: number) => {
    try {
      setIsSubmitting(true);
      setError("");

      // 發送刪除請求
      await axios.delete(getBackendUrl(`/appointments/${appointmentId}`));

      // 成功後更新預約列表
      setAppointments(appointments.filter(app => app.id !== appointmentId));

      // 關閉確認對話框
      setConfirmDeleteAppointment(null);

      // 顯示成功訊息
      setError("預約已成功刪除");

      // 3秒後清除訊息
      setTimeout(() => {
        setError("");
      }, 3000);
    } catch (err) {
      console.error("刪除預約時出錯:", err);
      setError("刪除預約時出錯，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteDoctorAction = async () => {
    if (!confirmDeleteDoctor) {
      return;
    }

    try {
      setManagementError("");
      const response = await axios.delete(
        getBackendUrl(`/doctors/${confirmDeleteDoctor.id}`)
      );
      if (response.status === 200) {
        setConfirmDeleteDoctor(null);
        fetchDoctors();
      }
    } catch (err: any) {
      console.error("刪除醫師失敗:", err);
      if (err.response?.data?.detail) {
        setManagementError(err.response.data.detail);
      } else {
        setManagementError("刪除醫師失敗，請確保該醫師沒有相關的預約");
      }
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedAppointment) {
      return;
    }

    try {
      console.log('準備更新預約資訊:', {
        appointmentId: selectedAppointment.id,
        newData: newAppointmentData
      });

      // 更新當前預約
      const updatedAppointment = {
        ...selectedAppointment,
        patient_name: newAppointmentData.patient_name,
        phone_number: newAppointmentData.phone_number,
        doctor_name: newAppointmentData.doctor_name,
        consultation_type: newAppointmentData.consultation_type,
        is_first_time: newAppointmentData.is_first_time,
        is_troublesome: newAppointmentData.is_troublesome,
        is_contagious: newAppointmentData.is_contagious,
        referral_source: newAppointmentData.referral_source,
        referral_notes: newAppointmentData.referral_notes
      };

      // 更新當前預約
      const response = await axios.put(
        getBackendUrl(`/appointments/${selectedAppointment.id}`),
        updatedAppointment
      );

      if (response.status === 200) {
        console.log('預約資訊更新成功');
        setSelectedAppointment(null);
        setSelectedAction(null);
        fetchAppointments();
      }
    } catch (err: any) {
      console.error('更新預約資訊失敗:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("更新預約資訊失敗");
      }
    }
  };

  // 渲染頁面頂部導航與功能區
  const renderPageHeader = () => {
    return (
      <div className="flex flex-wrap justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-6">預約管理系統</h1>
          <div className="flex space-x-2 ml-4">
            <a
              href="/patient_registration"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                <path d="M16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              新增患者
            </a>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="搜尋患者姓名/電話..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="p-2 border rounded-md pl-8 w-full"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-2 top-2.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            onClick={() => setShowQueryDialog(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
          >
            查詢預約
          </button>
          <button
            onClick={() => setShowBatchReminderModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.415 14.382c-.298-.149-1.759-.89-2.032-1.002-.272-.106-.47-.17-.67.166-.198.334-.813 1.042-.994 1.254-.182.213-.364.242-.67.08-.303-.161-1.28-.483-2.442-1.543-.903-.818-1.507-1.83-1.685-2.137-.177-.309-.019-.475.133-.632.137-.142.308-.372.462-.56.155-.195.194-.333.294-.557.099-.228.05-.417-.025-.584-.075-.169-.669-1.66-.917-2.273-.241-.603-.485-.486-.67-.486-.171 0-.368-.011-.568-.011-.193 0-.507.074-.772.372-.265.296-1.016 1.019-1.016 2.487 0 1.467 1.047 2.881 1.193 3.081.145.196 2.044 3.19 5.06 4.36.71.27 1.262.434 1.69.557.722.243 1.376.208 1.896.124.578-.085 1.775-.729 2.022-1.425.251-.695.251-1.285.175-1.416-.074-.132-.272-.213-.57-.372Z" />
            </svg>
            批量提醒
          </button>
        </div>
      </div>
    );
  };

  // 獲取介紹人選項
  const fetchReferralSources = async () => {
    try {
      const response = await axios.get(getBackendUrl("/settings/referral_source"));
      if (response.data && Array.isArray(response.data)) {
        setReferralSources(response.data);
      }
    } catch (err) {
      console.error("獲取介紹人選項時出錯:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {renderPageHeader()}

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      {/* 日期與醫師選擇區域 */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">預約日期</h2>

        {/* 日期選擇 */}
        <div className="mb-4 flex flex-wrap">
          <div className="w-full md:w-auto">
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date) => setSelectedDate(date)}
              locale="zh-TW"
              dateFormat="yyyy/MM/dd"
              placeholderText="選擇日期"
              className="p-2 border rounded-md"
              renderDayContents={renderDayContents}
              calendarStartDay={0}
            />
          </div>

          <div className="mt-2 md:mt-0 md:ml-4 flex items-center">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            >
              今天
            </button>
            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 ml-2"
            >
              明天
            </button>
            <button
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedDate(nextWeek);
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 ml-2"
            >
              下週
            </button>
          </div>
        </div>
      </div>

      {/* 預約列表 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {selectedDate
              ? `${format(selectedDate, 'yyyy/MM/dd')} 預約列表`
              : '所有預約'}
          </h2>
          <button
            onClick={() => {
              setSelectedAppointment(null);
              setSelectedAction("new");
              setShowTimePicker(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            新增預約
          </button>
        </div>

        {/* 其他现有代码内容 */}

        {/* 以下是现有的预约列表显示逻辑 */}
        {selectedDate ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-indigo-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800">
                  {format(selectedDate, "yyyy年MM月dd日")} 預約
                </h2>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200 flex items-center">
                  <svg className="h-4 w-4 text-indigo-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  {Object.values(doctorAppointmentsMap).flat().length} 個預約
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {Object.keys(doctorAppointmentsMap).length > 0 ? (
                Object.entries(doctorAppointmentsMap).map(([doctorName, doctorAppointments]) => (
                  <div key={doctorName} className="p-4">
                    <h3 className="text-md font-medium mb-3 pb-2 border-b border-gray-200 text-gray-700 text-center bg-gray-50 py-2 rounded-lg shadow-sm flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {doctorName}
                    </h3>
                    {doctorAppointments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-fixed">
                          <thead>
                            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                              <th className="px-4 py-2 text-left w-[20%]">患者姓名</th>
                              <th className="px-4 py-2 text-left w-[15%]">電話</th>
                              <th className="px-4 py-2 text-left w-[10%]">時間</th>
                              <th className="px-4 py-2 text-left w-[20%]">求診內容</th>
                              <th className="px-4 py-2 text-left w-[15%]">狀態</th>
                              <th className="px-4 py-2 text-left w-[20%]">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doctorAppointments.map((appointment) => (
                              <React.Fragment key={appointment.id}>
                                {/* 第一行：主要預約信息 */}
                                <tr className="hover:bg-blue-50 transition-all duration-200">
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-800">{appointment.patient_name}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-gray-600 flex items-center">
                                      <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                      {appointment.phone_number}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col items-start">
                                      <span className="text-gray-900 font-medium">{formatTime(appointment.appointment_time)}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-gray-800 font-semibold">
                                        {appointment.consultation_type ? appointment.consultation_type.label : "未指定"}
                                      </span>
                                      {appointment.consultation_type?.selectedSubType && (
                                        <span className="text-xs text-gray-600 mt-0.5">
                                          {appointment.consultation_type.selectedSubType.label}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <PatientStatusDisplay appointment={appointment} />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      {(appointment.status === "未應診" || appointment.status === "已改期") && (
                                        <>
                                          <div className="flex flex-col gap-1 w-full">
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleStatusUpdate(appointment.id, "已到診")}
                                                className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 flex items-center justify-center text-sm"
                                              >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                到診
                                              </button>
                                              <button
                                                onClick={() => handleStatusUpdate(appointment.id, "失約")}
                                                className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 flex items-center justify-center text-sm"
                                              >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                失約
                                              </button>
                                            </div>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleActionClick(appointment, "edit")}
                                                className="flex-1 bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 flex items-center justify-center text-sm"
                                              >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                修改
                                              </button>
                                              <button
                                                onClick={() => handleActionClick(appointment, "reschedule")}
                                                className="flex-1 bg-yellow-500 text-white px-3 py-1.5 rounded hover:bg-yellow-600 flex items-center justify-center text-sm"
                                              >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                改期
                                              </button>
                                            </div>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => {
                                                  const message = generateAppointmentReminder(appointment);
                                                  const result = sendWhatsAppNotification(appointment.phone_number, message);
                                                  setError(result);
                                                }}
                                                className="flex-1 bg-purple-500 text-white px-3 py-1.5 rounded hover:bg-purple-600 flex items-center justify-center text-sm"
                                              >
                                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M17.415 14.382c-.298-.149-1.759-.89-2.032-1.002-.272-.106-.47-.17-.67.166-.198.334-.813 1.042-.994 1.254-.182.213-.364.242-.67.08-.303-.161-1.28-.483-2.442-1.543-.903-.818-1.507-1.83-1.685-2.137-.177-.309-.019-.475.133-.632.137-.142.308-.372.462-.56.155-.195.194-.333.294-.557.099-.228.05-.417-.025-.584-.075-.169-.669-1.66-.917-2.273-.241-.603-.485-.486-.67-.486-.171 0-.368-.011-.568-.011-.193 0-.507.074-.772.372-.265.296-1.016 1.019-1.016 2.487 0 1.467 1.047 2.881 1.193 3.081.145.196 2.044 3.19 5.06 4.36.71.27 1.262.434 1.69.557.722.243 1.376.208 1.896.124.578-.085 1.775-.729 2.022-1.425.251-.695.251-1.285.175-1.416-.074-.132-.272-.213-.57-.372Z" />
                                                </svg>
                                                提醒
                                              </button>
                                              <button
                                                onClick={() => setConfirmDeleteAppointment(appointment)}
                                                className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 flex items-center justify-center text-sm"
                                              >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                刪除
                                              </button>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                      {appointment.status === "已到診" && (
                                        <button
                                          onClick={() => handleActionClick(appointment, "followup")}
                                          className="w-full bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 flex items-center justify-center text-sm"
                                        >
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                          </svg>
                                          預約覆診
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* 第二行：標籤和備註信息 */}
                                < tr className="border-b border-gray-100" >
                                  <td colSpan={5} className="px-4 py-3">
                                    <div className="bg-gray-50 rounded-md px-4 py-3 mt-1 shadow-sm">
                                      <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className="text-sm font-medium text-gray-700">標籤:</span>
                                        <div className="flex flex-wrap gap-2">
                                          {appointment.is_first_time === 1 && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                              首診
                                            </span>
                                          )}
                                          {appointment.is_followup === 1 && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                              覆診
                                            </span>
                                          )}
                                          {appointment.is_returning_patient === 1 && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                              舊症
                                            </span>
                                          )}
                                          {appointment.is_troublesome === 1 && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                                              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                              </svg>
                                              麻煩症
                                            </span>
                                          )}
                                          {appointment.is_contagious === 1 && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                              </svg>
                                              傳染病
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-6 mt-2 text-sm">
                                        <div className="flex items-center">
                                          <span className="font-medium text-gray-700">介紹人:</span>
                                          <span className={appointment.referral_source ? "ml-2 text-blue-600" : "ml-2 text-gray-500 italic"}>
                                            {appointment.referral_source || "無"}
                                          </span>
                                        </div>

                                        <div className="flex items-center">
                                          <span className="font-medium text-gray-700">備註:</span>
                                          <span className={appointment.referral_notes ? "ml-2 text-gray-700" : "ml-2 text-gray-500 italic"}>
                                            {appointment.referral_notes || "無"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic py-4 text-center">
                        今天暫時未有預約
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic py-8 text-center">
                  這一天沒有安排任何預約
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-gray-100 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">所有預約</h2>
              <span className="text-sm text-gray-500">
                {filteredAppointments.length} 個預約
              </span>
            </div>
            {filterText && filteredAppointments.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-3">
                      <div>
                        <h5 className="font-semibold flex items-center gap-2">
                          {appointment.patient_name}
                          {appointment.is_troublesome === 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              麻煩症
                            </span>
                          )}
                          {appointment.is_contagious === 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              傳染病
                            </span>
                          )}
                        </h5>
                        <p className="text-sm text-gray-600">{appointment.phone_number}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <PatientStatusDisplay appointment={appointment} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-gray-500">預約時間</p>
                        <p className="font-medium">
                          {format(new Date(appointment.appointment_time), "yyyy年MM月dd日")}
                          <span className="ml-2 text-gray-700">
                            {format(new Date(appointment.appointment_time), "HH:mm")}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-gray-500">主診醫師</p>
                        <p className="font-medium">{appointment.doctor_name}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-gray-500">求診內容</p>
                        <p className="font-medium">
                          {appointment.consultation_type ? (
                            <div>
                              <div>{appointment.consultation_type.label}</div>
                              {appointment.consultation_type.selectedSubType && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {appointment.consultation_type.selectedSubType.label}
                                </div>
                              )}
                            </div>
                          ) : (
                            "未指定"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end gap-2">
                      {/* 如果是在新增預約流程中，顯示特殊按鈕 */}
                      {(showTimePicker && selectedAction === "new") && (
                        <button
                          onClick={() => {
                            setNewAppointmentData(prev => ({
                              ...prev,
                              patient_name: appointment.patient_name,
                              phone_number: appointment.phone_number,
                              is_first_time: 0 // 預設不是首次求診，因為已有記錄
                            }));

                            // 檢查是否有已到診記錄
                            const hasCompletedVisit = queryResults.some(
                              a => a.patient_name === appointment.patient_name && a.status === '已到診'
                            );

                            if (!hasCompletedVisit) {
                              setNewAppointmentData(prev => ({
                                ...prev,
                                is_first_time: 1 // 如果沒有已到診記錄，標記為首次求診
                              }));
                              setError("注意：此患者之前沒有成功就診記錄，已自動標記為首次求診");
                            }

                            setShowQueryDialog(false); // 關閉查詢對話框，返回新增預約對話框
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          選擇此患者
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedDate(new Date(appointment.appointment_time));
                          setShowQueryDialog(false);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        查看當日預約
                      </button>

                      {(appointment.status === "未應診" || appointment.status === "已改期") && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setSelectedAction("edit");
                              setShowQueryDialog(false);
                              setNewAppointmentData({
                                patient_name: appointment.patient_name,
                                phone_number: appointment.phone_number,
                                doctor_name: appointment.doctor_name,
                                consultation_type: appointment.consultation_type || consultationTypes[0],
                                is_first_time: appointment.is_first_time || 0,
                                is_troublesome: appointment.is_troublesome || 0,
                                is_contagious: appointment.is_contagious || 0,
                                referral_source: appointment.referral_source || "",
                                referral_notes: appointment.referral_notes || ""
                              });
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            修改
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4">
                {filterText ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg">未找到符合「{filterText}」的預約記錄</p>
                    <p className="text-gray-400 text-sm mt-2">請嘗試使用不同的關鍵字搜尋</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">請選擇日期或使用快速搜尋來查看預約</p>
                )}
              </div>
            )}
          </div>
        )
        }
      </div >

      {/* 新增預約對話框 */}
      {
        showTimePicker && selectedAction === "new" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-lg w-[90vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">新增預約</h3>
                <button
                  onClick={() => {
                    // 關閉對話框
                    setShowTimePicker(false);
                    setSelectedAction(null);
                    // 徹底重置新增預約數據
                    setNewAppointmentData({
                      patient_name: "",
                      phone_number: "",
                      doctor_name: doctors.length > 0 ? doctors[0].name : "",
                      consultation_type: {
                        ...consultationTypes[0],
                        selectedSubType: consultationTypes[0].subTypes &&
                          consultationTypes[0].subTypes.length > 0 ?
                          consultationTypes[0].subTypes[0] : undefined
                      } as AppointmentConsultationType,
                      is_first_time: 0,
                      is_troublesome: 0,
                      is_contagious: 0,
                      referral_source: "",
                      referral_notes: ""
                    });
                    // 清除錯誤信息
                    setError("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    患者姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAppointmentData.patient_name}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        patient_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    聯絡電話 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-grow">
                      <input
                        type="text"
                        value={newAppointmentData.phone_number}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {phoneError && (
                        <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (newAppointmentData.phone_number) {
                          setQueryPhoneNumber(newAppointmentData.phone_number);
                          setShowQueryDialog(true);
                          setQueryStep("phone");
                          setPatientOptions([]);
                          setSelectedPatient("");
                          setQueryResults([]);
                          setError("");
                        } else {
                          setError("請先輸入電話號碼");
                        }
                      }}
                      type="button"
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded border border-blue-300 hover:bg-blue-200 transition-colors flex items-center whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      查詢此電話
                    </button>
                  </div>
                </div>

                {/* 患者標記 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    患者標記
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`flex flex-col border rounded-lg overflow-hidden ${newAppointmentData.is_first_time === 1
                        ? 'border-blue-400 shadow-sm'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className={`px-3 py-2 ${newAppointmentData.is_first_time === 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">首次求診</span>
                          {newAppointmentData.is_first_time === 1 && (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="new_is_first_time"
                            checked={newAppointmentData.is_first_time === 1}
                            onChange={(e) =>
                              setNewAppointmentData({
                                ...newAppointmentData,
                                is_first_time: e.target.checked ? 1 : 0
                              })
                            }
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="new_is_first_time" className="ml-2 block text-sm text-gray-700">
                            {newAppointmentData.is_first_time === 1 ? '已標記為首次求診' : '標記為首次求診'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          首次求診患者需要填寫更多資料，請勾選以幫助醫師
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col border rounded-lg overflow-hidden ${newAppointmentData.is_troublesome === 1
                        ? 'border-red-400 shadow-sm'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className={`px-3 py-2 ${newAppointmentData.is_troublesome === 1
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">麻煩症患者</span>
                          {newAppointmentData.is_troublesome === 1 && (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="new_is_troublesome"
                            checked={newAppointmentData.is_troublesome === 1}
                            onChange={(e) =>
                              setNewAppointmentData({
                                ...newAppointmentData,
                                is_troublesome: e.target.checked ? 1 : 0
                              })
                            }
                            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <label htmlFor="new_is_troublesome" className="ml-2 block text-sm text-gray-700">
                            {newAppointmentData.is_troublesome === 1 ? '已標記' : '標記此選項'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          標記會提醒醫師這是需要特別關注的患者
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col border rounded-lg overflow-hidden ${newAppointmentData.is_contagious === 1
                        ? 'border-yellow-400 shadow-sm'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className={`px-3 py-2 ${newAppointmentData.is_contagious === 1
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">傳染病患者</span>
                          {newAppointmentData.is_contagious === 1 && (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="new_is_contagious"
                            checked={newAppointmentData.is_contagious === 1}
                            onChange={(e) =>
                              setNewAppointmentData({
                                ...newAppointmentData,
                                is_contagious: e.target.checked ? 1 : 0
                              })
                            }
                            className="h-5 w-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                          />
                          <label htmlFor="new_is_contagious" className="ml-2 block text-sm text-gray-700">
                            {newAppointmentData.is_contagious === 1 ? '已標記' : '標記此選項'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          注意進行消毒，以及做好個人防護措施
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    主診醫師 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newAppointmentData.doctor_name}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        doctor_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.name}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                  {newAppointmentData.doctor_name && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        醫師應診時間：
                        {doctors
                          .find((d) => d.name === newAppointmentData.doctor_name)
                          ?.schedule.map((day) => weekDays[day as keyof typeof weekDays])
                          .join("、")}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    求診內容 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newAppointmentData.consultation_type.id}
                    onChange={(e) => {
                      const selectedType = consultationTypes.find(
                        (type) => type.id === e.target.value,
                      );
                      if (selectedType) {
                        setNewAppointmentData({
                          ...newAppointmentData,
                          consultation_type: {
                            ...selectedType,
                            selectedSubType:
                              selectedType.subTypes &&
                                selectedType.subTypes.length > 0
                                ? selectedType.subTypes[0]
                                : undefined,
                          },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {consultationTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {newAppointmentData.consultation_type.subTypes &&
                    newAppointmentData.consultation_type.subTypes.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {newAppointmentData.consultation_type.subTypeLabel ||
                            "子類型"}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={
                            newAppointmentData.consultation_type.selectedSubType?.id || ""
                          }
                          onChange={(e) => {
                            const selectedSubType =
                              newAppointmentData.consultation_type.subTypes?.find(
                                (st) => st.id === e.target.value,
                              );
                            if (selectedSubType) {
                              setNewAppointmentData({
                                ...newAppointmentData,
                                consultation_type: {
                                  ...newAppointmentData.consultation_type,
                                  selectedSubType,
                                },
                              });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          {newAppointmentData.consultation_type.subTypes.map(
                            (subType) => (
                              <option key={subType.id} value={subType.id}>
                                {subType.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    選擇預約時間 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setSelectedDate(date);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    lang="zh-TW"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        時
                      </label>
                      <select
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {hours.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        分
                      </label>
                      <select
                        value={selectedMinute}
                        onChange={(e) => setSelectedMinute(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {minutes.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 介紹人選項 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    介紹人來源
                  </label>
                  <select
                    value={newAppointmentData.referral_source || ""}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        referral_source: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請選擇（非必填）</option>
                    {referralSources.map((source) => (
                      <option key={source.id} value={source.name}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 備註欄位 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備註
                  </label>
                  <textarea
                    value={newAppointmentData.referral_notes || ""}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        referral_notes: e.target.value,
                      })
                    }
                    placeholder="其他需要記錄的資訊"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  ></textarea>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100 mt-6">
                  <button
                    onClick={() => {
                      setShowTimePicker(false);
                      setSelectedAction(null);
                      setError("");
                      setNewAppointmentData({
                        patient_name: "",
                        phone_number: "",
                        doctor_name: doctors.length > 0 ? doctors[0].name : "",
                        consultation_type: {
                          ...consultationTypes[0],
                          selectedSubType: consultationTypes[0].subTypes &&
                            consultationTypes[0].subTypes.length > 0 ?
                            consultationTypes[0].subTypes[0] : undefined
                        } as AppointmentConsultationType,
                        is_first_time: 0,
                        is_troublesome: 0,
                        is_contagious: 0,
                        referral_source: "",
                        referral_notes: ""
                      });
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (!newAppointmentData.patient_name) {
                        setError("請輸入患者姓名");
                        return;
                      }
                      if (!validatePhoneNumber(newAppointmentData.phone_number)) {
                        setError("請輸入有效的聯絡電話");
                        return;
                      }
                      if (!selectedDate) {
                        setError("請選擇預約日期");
                        return;
                      }
                      const newDate = new Date(selectedDate);
                      newDate.setHours(parseInt(selectedHour));
                      newDate.setMinutes(parseInt(selectedMinute));
                      handleTimeSelect(newDate);
                    }}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    確認新增預約
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* 改期和覆診對話框 */}
      {
        showTimePicker && (selectedAction === "reschedule" || selectedAction === "followup") && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-lg w-[90vw] max-w-[500px]">
              <h2 className="text-xl font-bold mb-6">
                {selectedAction === "reschedule" ? "改期預約" : selectedAction === "followup" ? "預約覆診" : "預約"}
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選擇{selectedAction === "reschedule" ? "新的預約時間" :
                    selectedAction === "followup" ? "覆診時間" : "預約時間"}
                </label>
                <input
                  type="date"
                  value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setSelectedDate(date);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  lang="zh-TW"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      時
                    </label>
                    <select
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {hours.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分
                    </label>
                    <select
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {minutes.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {error && (
                <div className="mb-4 text-red-500 text-sm">{error}</div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTimePicker(false);
                    setSelectedAction(null);
                    setError("");
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (!selectedDate) {
                      setError("請選擇日期");
                      return;
                    }
                    const newDate = new Date(selectedDate);
                    newDate.setHours(parseInt(selectedHour));
                    newDate.setMinutes(parseInt(selectedMinute));
                    handleTimeSelect(newDate);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {selectedAction === "reschedule" ? "確認改期" :
                    selectedAction === "followup" ? "確認覆診" : "確認"}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 此功能已被移至系統管理*/}

      {/* 查詢預約對話框 */}
      {
        showQueryDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-lg w-[90vw] max-w-[500px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">查詢預約</h3>
                <button
                  onClick={() => {
                    setShowQueryDialog(false);
                    setQueryStep("phone");
                    setError("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {queryStep === "phone" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          輸入患者的電話號碼進行查詢，系統將顯示該電話號碼關聯的所有預約記錄。
                          <br /><span className="font-semibold">提示：請輸入完整8位電話號碼以獲得精確匹配結果</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 在新增預約流程中顯示特殊提示 */}
                  {(showTimePicker && selectedAction === "new") && (
                    <div className="bg-green-50 p-4 rounded-md mb-6 border-l-4 border-green-400">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">
                            您現在處於新增預約流程中。查詢後系統會自動判斷是否為首次求診患者。若找不到記錄，將自動標記為首次求診。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      患者聯絡電話
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={queryPhoneNumber}
                        onChange={(e) => setQueryPhoneNumber(e.target.value)}
                        placeholder="例如: 5177"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-900"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQueryByPhone();
                          }
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      如只記得部分電話號碼，也可輸入（例如: 5177）
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      onClick={() => setShowQueryDialog(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleQueryByPhone}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      查詢
                    </button>
                  </div>
                </div>
              )}

              {queryStep === "patient" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          找到多位患者使用同一電話號碼 {queryPhoneNumber}，請選擇要查詢的患者。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇患者
                    </label>
                    <div className="mt-1">
                      {patientOptions.map((name) => (
                        <div key={name} className="relative flex items-start mb-2">
                          <div className="flex items-center h-5">
                            <input
                              id={`patient-${name}`}
                              type="radio"
                              checked={selectedPatient === name}
                              onChange={() => setSelectedPatient(name)}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor={`patient-${name}`} className="font-medium text-gray-700">
                              {name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      onClick={() => setQueryStep("phone")}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      返回
                    </button>
                    <button
                      onClick={handlePatientSelect}
                      disabled={!selectedPatient}
                      className={`px-4 py-2 text-white rounded-md transition-colors flex items-center gap-2 ${selectedPatient
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-300 cursor-not-allowed"
                        }`}
                    >
                      確認
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {queryStep === "results" && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-md mb-6 ${queryResults.length > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {queryResults.length > 0 ? (
                          <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">
                          {queryResults.length > 0
                            ? `找到 ${queryResults.length} 個預約記錄，電話號碼：${queryPhoneNumber}`
                            : '沒有找到符合條件的預約記錄。'}
                        </p>
                        {queryResults.length === 0 && (
                          <p className="text-sm mt-1 text-gray-600">
                            {(showTimePicker && selectedAction === "new")
                              ? '您可以直接新增此病人的預約，系統會將其標記為首次求診。'
                              : '請檢查電話號碼是否正確，或嘗試使用其他搜尋條件。'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {queryResults.length > 0 ? (
                    <div className="space-y-4">
                      <div className="overflow-y-auto max-h-[50vh]">
                        {queryResults.map((appointment) => (
                          <div key={appointment.id} className="p-4 border rounded mb-3 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between">
                              <div>
                                <h5 className="font-medium flex items-center gap-2">
                                  {appointment.patient_name}
                                  <span className="text-sm text-gray-500">{appointment.phone_number}</span>
                                </h5>
                                <p className="text-sm my-1">
                                  {format(new Date(appointment.appointment_time), "yyyy年MM月dd日 HH:mm")}
                                </p>
                              </div>
                              <div>
                                <PatientStatusDisplay appointment={appointment} />
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p>主診醫師: {appointment.doctor_name}</p>
                              <p>
                                求診內容: {appointment.consultation_type
                                  ? `${appointment.consultation_type.label}${appointment.consultation_type.selectedSubType
                                    ? ` - ${appointment.consultation_type.selectedSubType.label}`
                                    : ''}`
                                  : '未指定'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    showTimePicker && selectedAction === "new" && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">系統未找到相關記錄</h3>
                            <div className="mt-2 text-sm text-green-700">
                              <p>您可以點擊下方按鈕，使用此電話號碼新增首次求診預約。</p>
                            </div>
                            <div className="mt-3">
                              <button
                                onClick={() => {
                                  setNewAppointmentData(prev => ({
                                    ...prev,
                                    phone_number: queryPhoneNumber,
                                    is_first_time: 1
                                  }));
                                  setShowQueryDialog(false);
                                }}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                使用此電話新增預約
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      onClick={() => setQueryStep("phone")}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      重新搜尋
                    </button>
                    <button
                      onClick={() => setShowQueryDialog(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      關閉
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* 編輯預約對話框 */}
      {
        selectedAppointment && selectedAction === "edit" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-lg w-[90vw] max-w-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">編輯預約資料</h3>
                <button
                  onClick={() => {
                    setSelectedAction(null);
                    setSelectedAppointment(null);
                    setError("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    患者姓名
                  </label>
                  <input
                    type="text"
                    value={newAppointmentData.patient_name}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        patient_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="請輸入患者姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    聯絡電話
                  </label>
                  <input
                    type="text"
                    value={newAppointmentData.phone_number}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        phone_number: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="請輸入聯絡電話"
                  />
                  {phoneError && (
                    <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    主診醫師
                  </label>
                  <select
                    value={newAppointmentData.doctor_name}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        doctor_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.name}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    求診內容
                  </label>
                  <select
                    value={newAppointmentData.consultation_type.id}
                    onChange={(e) => {
                      const selectedType = consultationTypes.find(
                        (type) => type.id === e.target.value,
                      );
                      if (selectedType) {
                        setNewAppointmentData({
                          ...newAppointmentData,
                          consultation_type: {
                            ...selectedType,
                            selectedSubType:
                              selectedType.subTypes &&
                                selectedType.subTypes.length > 0
                                ? selectedType.subTypes[0]
                                : undefined,
                          },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {consultationTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {newAppointmentData.consultation_type.subTypes &&
                    newAppointmentData.consultation_type.subTypes.length > 0 && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          求診子類別
                        </label>
                        <select
                          value={
                            newAppointmentData.consultation_type.selectedSubType?.id || ""
                          }
                          onChange={(e) => {
                            const subType =
                              newAppointmentData.consultation_type.subTypes?.find(
                                (subType) => subType.id === e.target.value
                              );
                            setNewAppointmentData({
                              ...newAppointmentData,
                              consultation_type: {
                                ...newAppointmentData.consultation_type,
                                selectedSubType: subType,
                              },
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {newAppointmentData.consultation_type.subTypes.map(
                            (subType) => (
                              <option key={subType.id} value={subType.id}>
                                {subType.label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
                </div>

                {/* 患者標記 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    患者標記
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`flex flex-col border rounded-lg overflow-hidden ${newAppointmentData.is_first_time === 1
                        ? 'border-blue-400 shadow-sm'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className={`px-3 py-2 ${newAppointmentData.is_first_time === 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">首次求診</span>
                          {newAppointmentData.is_first_time === 1 && (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="edit_is_first_time"
                            checked={newAppointmentData.is_first_time === 1}
                            onChange={(e) =>
                              setNewAppointmentData({
                                ...newAppointmentData,
                                is_first_time: e.target.checked ? 1 : 0
                              })
                            }
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="edit_is_first_time" className="ml-2 block text-sm text-gray-700">
                            {newAppointmentData.is_first_time === 1 ? '已標記為首次求診' : '標記為首次求診'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          首次求診患者需要填寫更多資料，請勾選以幫助醫師
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col border rounded-lg overflow-hidden ${newAppointmentData.is_troublesome === 1
                        ? 'border-red-400 shadow-sm'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className={`px-3 py-2 ${newAppointmentData.is_troublesome === 1
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">麻煩症患者</span>
                          {newAppointmentData.is_troublesome === 1 && (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="edit_is_troublesome"
                            checked={newAppointmentData.is_troublesome === 1}
                            onChange={(e) =>
                              setNewAppointmentData({
                                ...newAppointmentData,
                                is_troublesome: e.target.checked ? 1 : 0
                              })
                            }
                            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <label htmlFor="edit_is_troublesome" className="ml-2 block text-sm text-gray-700">
                            {newAppointmentData.is_troublesome === 1 ? '已標記' : '標記此選項'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          標記會提醒醫師這是特別需要關注的患者
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex flex-col border rounded-lg overflow-hidden ${newAppointmentData.is_contagious === 1
                        ? 'border-yellow-400 shadow-sm'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className={`px-3 py-2 ${newAppointmentData.is_contagious === 1
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">傳染病患者</span>
                          {newAppointmentData.is_contagious === 1 && (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="edit_is_contagious"
                            checked={newAppointmentData.is_contagious === 1}
                            onChange={(e) =>
                              setNewAppointmentData({
                                ...newAppointmentData,
                                is_contagious: e.target.checked ? 1 : 0
                              })
                            }
                            className="h-5 w-5 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                          />
                          <label htmlFor="edit_is_contagious" className="ml-2 block text-sm text-gray-700">
                            {newAppointmentData.is_contagious === 1 ? '已標記' : '標記此選項'}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          需要特殊處理的患者，院方會做好隔離安排
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 介紹人選項 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    介紹人來源
                  </label>
                  <select
                    value={newAppointmentData.referral_source || ""}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        referral_source: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">請選擇（非必填）</option>
                    {referralSources.map((source) => (
                      <option key={source.id} value={source.name}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 備註欄位 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備註
                  </label>
                  <textarea
                    value={newAppointmentData.referral_notes || ""}
                    onChange={(e) =>
                      setNewAppointmentData({
                        ...newAppointmentData,
                        referral_notes: e.target.value,
                      })
                    }
                    placeholder="其他需要記錄的資訊"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  ></textarea>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100 mt-6">
                  <button
                    onClick={() => {
                      setSelectedAction(null);
                      setSelectedAppointment(null);
                      setError("");
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-200 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      <BatchReminderModal
        isOpen={showBatchReminderModal}
        onClose={() => setShowBatchReminderModal(false)}
      />

      {/* 刪除預約確認對話框 */}
      {
        confirmDeleteAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white p-6 rounded-lg w-[90vw] max-w-[500px]">
              <div className="mb-4">
                <div className="flex items-center justify-center text-red-600 mb-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-center mb-2">確認刪除預約</h3>
                <p className="text-gray-600 text-center">
                  您確定要刪除以下患者的預約嗎？此操作無法撤銷。
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <p className="font-medium">{confirmDeleteAppointment.patient_name}</p>
                <p className="text-sm text-gray-500">{confirmDeleteAppointment.phone_number}</p>
                <p className="text-sm mt-2">
                  預約時間：{format(new Date(confirmDeleteAppointment.appointment_time), "yyyy年MM月dd日 HH:mm")}
                </p>
                <p className="text-sm">主診醫師：{confirmDeleteAppointment.doctor_name}</p>
                {confirmDeleteAppointment.referral_source && (
                  <p className="text-sm text-gray-600 mt-1">介紹人：{confirmDeleteAppointment.referral_source || "-"}</p>
                )}
                {confirmDeleteAppointment.referral_notes && (
                  <p className="text-sm text-gray-600 mt-1">備註：{confirmDeleteAppointment.referral_notes || "-"}</p>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setConfirmDeleteAppointment(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDeleteAppointment(confirmDeleteAppointment.id)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      處理中...
                    </>
                  ) : (
                    <>
                      確認刪除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
