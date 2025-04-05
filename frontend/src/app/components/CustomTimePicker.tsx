"use client";
import React, { useState, useEffect } from "react";

interface CustomTimePickerProps {
  onTimeSelect: (selectedTime: Date) => void;
  onClose: () => void;
  title?: string;
  selectedDoctorSchedule?: string[];
  parentError?: string;
}

export default function CustomTimePicker({
  onTimeSelect,
  onClose,
  title = "選擇時間",
  selectedDoctorSchedule,
  parentError,
}: CustomTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState("10");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [error, setError] = useState("");

  // 當父組件錯誤變化時，更新本地錯誤狀態
  useEffect(() => {
    if (parentError) {
      setError(parentError);
    }
  }, [parentError]);

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

  // 可選擇的小時和分鐘
  const hours = Array.from({ length: 12 }, (_, i) => i + 10).map((h) =>
    h.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0"),
  );

  const validateDateTime = (
    date: string,
    hour: string,
    minute: string,
  ): boolean => {
    const selectedDateTime = new Date(`${date}T${hour}:${minute}:00`);
    const now = new Date();

    // 檢查是否是過去的時間
    if (selectedDateTime < now) {
      setError("不能選擇過去的時間");
      return false;
    }

    // 檢查醫師排班
    if (selectedDoctorSchedule && selectedDoctorSchedule.length > 0) {
      const dayOfWeek = selectedDateTime.getDay();
      // 將 JavaScript 的星期日(0)到星期六(6)轉換為我們系統中的星期一到星期日
      const dayMapping: { [key: number]: string } = {
        0: "sunday", // 週日 = 0
        1: "monday", // 週一 = 1
        2: "tuesday", // 週二 = 2
        3: "wednesday", // 週三 = 3
        4: "thursday", // 週四 = 4
        5: "friday", // 週五 = 5
        6: "saturday", // 週六 = 6
      };

      const dayName = dayMapping[dayOfWeek];
      const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];

      if (!selectedDoctorSchedule.includes(dayName)) {
        setError(`醫師星期${weekdayNames[dayOfWeek]}放緊假，麻煩約第二日`);
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      selectedDate &&
      selectedHour &&
      selectedMinute &&
      validateDateTime(selectedDate, selectedHour, selectedMinute)
    ) {
      const dateTime = new Date(
        `${selectedDate}T${selectedHour}:${selectedMinute}:00`,
      );
      onTimeSelect(dateTime);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          日期：
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={minDate}
          max={maxDate}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            時：
          </label>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分：
          </label>
          <select
            value={selectedMinute}
            onChange={(e) => setSelectedMinute(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      {selectedDoctorSchedule && selectedDoctorSchedule.length > 0 && (
        <div className="mt-2 bg-blue-50 p-3 rounded-md border border-blue-100">
          <p className="text-sm text-blue-800 flex items-center">
            <svg
              className="h-4 w-4 mr-1 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            醫師只在
            {selectedDoctorSchedule
              .map((day) => {
                const dayLabels: { [key: string]: string } = {
                  monday: "星期一",
                  tuesday: "星期二",
                  wednesday: "星期三",
                  thursday: "星期四",
                  friday: "星期五",
                  saturday: "星期六",
                  sunday: "星期日",
                };
                return dayLabels[day] || day;
              })
              .join("、")}
            應診
          </p>
        </div>
      )}
      {(error || parentError) && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p className="text-sm">{parentError || error}</p>
        </div>
      )}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-300"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
        >
          確認
        </button>
      </div>
    </form>
  );
}
