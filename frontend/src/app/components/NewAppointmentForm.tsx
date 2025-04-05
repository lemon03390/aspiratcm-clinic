"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  consultationTypes,
  ConsultationType,
} from "../../constants/consultationTypes";
import { getBackendUrl, ErrorHandler } from "../../libs/apiClient";
import { normalizeSchedule, formatScheduleForDisplay, isDayInSchedule } from "../../utils/scheduleFormatter";
import { formatConsultationTypeForBackend, ExtendedConsultationType } from "../../utils/consultationTypeFormatter";
import { toISOString } from "../../utils/timeFormatter";

interface Doctor {
  id: number;
  name: string;
  schedule: string[];
}

interface AppointmentConsultationType extends ConsultationType {
  selectedSubType?: { id: string; label: string };
  subTypeLabel?: string;
}

interface NewAppointmentFormProps {
  doctors: Doctor[];
  onAppointmentCreated: () => void;
}

export default function NewAppointmentForm({
  doctors,
  onAppointmentCreated,
}: NewAppointmentFormProps) {
  const [appointmentData, setAppointmentData] = useState({
    patient_name: "",
    phone_number: "",
    doctor_name: doctors.length > 0 ? doctors[0].name : "",
    consultation_type: {
      ...consultationTypes[0],
    } as AppointmentConsultationType,
    is_first_time: false,
    is_troublesome: false,
    is_contagious: false
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedHour, setSelectedHour] = useState("10");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當醫師列表變化時更新預設醫師
  useEffect(() => {
    if (doctors.length > 0 && !appointmentData.doctor_name) {
      setAppointmentData((prev) => ({
        ...prev,
        doctor_name: doctors[0].name,
      }));
    }
  }, [doctors]);

  // 初始化時選擇子選項的預設值
  useEffect(() => {
    if (
      appointmentData.consultation_type.subTypes &&
      appointmentData.consultation_type.subTypes.length > 0
    ) {
      setAppointmentData({
        ...appointmentData,
        consultation_type: {
          ...appointmentData.consultation_type,
          selectedSubType: appointmentData.consultation_type.subTypes[0],
        },
      });
    }
  }, [appointmentData.consultation_type.id]);

  // 可選擇的小時和分鐘
  const hours = Array.from({ length: 12 }, (_, i) => i + 9).map((h) =>
    h.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0"),
  );

  // 設置最小日期為今天
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  // 設置最大日期為三個月後
  const maxDate = new Date(
    today.getFullYear(),
    today.getMonth() + 3,
    today.getDate(),
  )
    .toISOString()
    .split("T")[0];

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\d{8,}$/;
    return phoneRegex.test(phone);
  };

  const validateDateTime = (
    date: Date,
    hour: string,
    minute: string,
  ): boolean => {
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(parseInt(hour, 10), parseInt(minute, 10), 0);
    const now = new Date();

    // 檢查是否是過去的時間
    if (selectedDateTime < now) {
      setError("不能選擇過去的時間");
      return false;
    }

    // 檢查醫師排班
    const selectedDoctor = doctors.find(
      (d) => d.name === appointmentData.doctor_name,
    );
    console.log('選中醫師:', selectedDoctor?.name, '排班:', selectedDoctor?.schedule);
    
    if (
      selectedDoctor &&
      selectedDoctor.schedule
    ) {
      const dayOfWeek = selectedDateTime.getDay();
      console.log('選中日期星期:', dayOfWeek);
      
      // 使用排班格式轉換工具處理排班數據
      try {
        // 檢查選擇的星期是否在醫師排班內
        if (!isDayInSchedule(selectedDoctor.schedule, dayOfWeek)) {
          const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
          const errorMsg = `醫師星期${weekdayNames[dayOfWeek]}放緊假，麻煩約第二日`;
          setError(errorMsg);
          console.error(errorMsg);
          return false;
        }
      } catch (e) {
        console.error('排班驗證出錯:', e);
        // 安全起見，如果出錯，假設醫師有排班
      }
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      // 驗證電話
      if (!validatePhoneNumber(appointmentData.phone_number)) {
        setError("聯絡電話必須至少包含8位數字");
        setIsSubmitting(false);
        return;
      }

      // 驗證時間
      if (
        !selectedDate ||
        !validateDateTime(selectedDate, selectedHour, selectedMinute)
      ) {
        setIsSubmitting(false);
        return;
      }

      // 準備預約時間
      const appointmentTime = new Date(selectedDate);
      appointmentTime.setHours(
        parseInt(selectedHour, 10),
        parseInt(selectedMinute, 10),
        0,
      );
      
      // 確保使用標準 ISO 時間格式，避免時區問題
      const appointmentTimeISO = toISOString(appointmentTime);
      
      console.log('正在創建預約，時間為:', appointmentTimeISO);

      // 使用診療類型轉換工具格式化數據
      const consultationTypeObj = formatConsultationTypeForBackend(appointmentData.consultation_type as ExtendedConsultationType);

      // 建立預約
      const response = await axios.post(
        getBackendUrl("/appointments"),
        {
          patient_name: appointmentData.patient_name,
          phone_number: appointmentData.phone_number,
          appointment_time: appointmentTimeISO,
          doctor_name: appointmentData.doctor_name,
          status: "未應診",
          consultation_type: consultationTypeObj,
          is_first_time: appointmentData.is_first_time ? 1 : 0,
          is_troublesome: appointmentData.is_troublesome ? 1 : 0,
          is_contagious: appointmentData.is_contagious ? 1 : 0
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status >= 200 && response.status < 300) {
        setSuccess("預約已成功創建！");
        // 重置表單
        setAppointmentData({
          patient_name: "",
          phone_number: "",
          doctor_name: doctors.length > 0 ? doctors[0].name : "",
          consultation_type: { ...consultationTypes[0] },
          is_first_time: false,
          is_troublesome: false,
          is_contagious: false
        });
        setSelectedDate(new Date());
        setSelectedHour("10");
        setSelectedMinute("00");

        // 通知父組件更新
        onAppointmentCreated();
      }
    } catch (err: any) {
      // 使用全局錯誤處理工具
      const errorInfo = ErrorHandler.handleApiError(err, '創建預約');
      
      // 設置錯誤信息
      setError(ErrorHandler.formatErrorForDisplay(errorInfo));
      
      // 添加詳細日誌
      console.error('創建預約時發生錯誤:', errorInfo);
      
      // 針對特定錯誤類型顯示友好信息
      if (errorInfo.statusCode === 422) {
        console.table(errorInfo.fieldErrors || {});
      } else if (errorInfo.isNetworkError) {
        console.error('網絡錯誤，無法連接到服務器');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctorSchedule =
    doctors.find((d) => d.name === appointmentData.doctor_name)?.schedule || [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-indigo-800 mb-6">新增預約</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 病人資料 */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-indigo-700 mb-4">病人資料</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                病人姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={appointmentData.patient_name}
                onChange={(e) =>
                  setAppointmentData({
                    ...appointmentData,
                    patient_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                聯絡電話 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={appointmentData.phone_number}
                onChange={(e) =>
                  setAppointmentData({
                    ...appointmentData,
                    phone_number: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">至少8位數字</p>
            </div>
            
            {/* 患者標記 */}
            <div className="md:col-span-2 mt-3">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_first_time"
                    checked={appointmentData.is_first_time}
                    onChange={(e) => 
                      setAppointmentData({
                        ...appointmentData,
                        is_first_time: e.target.checked
                      })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_first_time" className="ml-2 block text-sm text-gray-700">
                    首次求診
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_troublesome"
                    checked={appointmentData.is_troublesome}
                    onChange={(e) => 
                      setAppointmentData({
                        ...appointmentData,
                        is_troublesome: e.target.checked
                      })
                    }
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_troublesome" className="ml-2 block text-sm text-gray-700">
                    麻煩症患者
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_contagious"
                    checked={appointmentData.is_contagious}
                    onChange={(e) => 
                      setAppointmentData({
                        ...appointmentData,
                        is_contagious: e.target.checked
                      })
                    }
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_contagious" className="ml-2 block text-sm text-gray-700">
                    傳染病患者
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 預約資料 */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-indigo-700 mb-4">預約資料</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主診醫師 <span className="text-red-500">*</span>
              </label>
              <select
                value={appointmentData.doctor_name}
                onChange={(e) =>
                  setAppointmentData({
                    ...appointmentData,
                    doctor_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name}>
                    {doctor.name}
                  </option>
                ))}
              </select>

              {selectedDoctorSchedule.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-indigo-700">
                    醫師應診時間：
                    {formatScheduleForDisplay(selectedDoctorSchedule)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                診症類型 <span className="text-red-500">*</span>
              </label>
              <select
                value={appointmentData.consultation_type.id}
                onChange={(e) => {
                  const selectedType = consultationTypes.find(
                    (t) => t.id === e.target.value,
                  );
                  if (selectedType) {
                    setAppointmentData({
                      ...appointmentData,
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {consultationTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {appointmentData.consultation_type.subTypes &&
              appointmentData.consultation_type.subTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {appointmentData.consultation_type.subTypeLabel || "子類型"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      appointmentData.consultation_type.selectedSubType?.id ||
                      ""
                    }
                    onChange={(e) => {
                      const selectedSubType =
                        appointmentData.consultation_type.subTypes?.find(
                          (st) => st.id === e.target.value,
                        );
                      if (selectedSubType) {
                        setAppointmentData({
                          ...appointmentData,
                          consultation_type: {
                            ...appointmentData.consultation_type,
                            selectedSubType,
                          },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {appointmentData.consultation_type.subTypes.map(
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
        </div>

        {/* 預約時間 */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-indigo-700 mb-4">預約時間</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={
                  selectedDate ? selectedDate.toISOString().split("T")[0] : ""
                }
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value ? new Date(e.target.value) : null,
                  )
                }
                min={minDate}
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                時 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
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

        {/* 錯誤和成功訊息 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
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
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* 送出按鈕 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium 
              hover:bg-indigo-700 transition duration-300 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "處理中..." : "建立預約"}
          </button>
        </div>
      </form>
    </div>
  );
}
