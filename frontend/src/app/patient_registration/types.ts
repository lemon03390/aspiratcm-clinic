// 患者基本類型定義
export interface Patient {
  id: number;
  registration_number: string;
  chinese_name: string;
  english_name: string;
  id_number: string;
  birth_date: string;
  phone_number: string;
  email?: string;
  gender?: string;

  // 健康相關資訊
  basic_diseases: string[];
  drug_allergies: string[];
  food_allergies: string[];
  note?: string;

  // 預約相關
  registration_datetime: string;
  has_appointment: boolean;
  doctor_id?: number;
  data_source: string;

  // 地區資訊
  region: string;
  district: string;
  sub_district: string;

  // 系統欄位
  created_at: string;
  updated_at: string;
}

// 創建患者請求類型
export interface PatientCreateRequest {
  chinese_name: string;
  english_name: string;
  id_number: string;
  birth_date: string;
  phone_number: string;
  email?: string;
  gender?: string;

  basic_diseases: string[];
  drug_allergies: string[];
  food_allergies: string[];
  note?: string;
  chief_complaint?: string;

  has_appointment: boolean;
  doctor_id?: number;
  data_source: string;

  region: string;
  district: string;
  sub_district: string;
}

// 更新患者請求類型
export interface PatientUpdateRequest {
  chinese_name?: string;
  english_name?: string;
  birth_date?: string;
  phone_number?: string;
  email?: string;
  gender?: string;

  basic_diseases?: string[];
  drug_allergies?: string[];
  food_allergies?: string[];
  note?: string;
  chief_complaint?: string;

  doctor_id?: number;
  data_source?: string;

  region?: string;
  district?: string;
  sub_district?: string;
}

// 參考資料類型
export interface ReferenceData {
  basic_diseases: string[];
  drug_allergies: string[];
  food_allergies: string[];
  data_sources: string[];
  regions: RegionsData;
  doctors?: Doctor[];
}

// 地區資料類型
export interface RegionsData {
  [region: string]: {
    [district: string]: string[];
  };
}

// 檢查患者是否存在的回應
export interface CheckPatientResponse {
  exists: boolean;
  patient: Patient | null;
}

// API 錯誤類型
export interface ApiError {
  detail: string;
  message: string;
  errors?: any[];
  debugInfo?: any;
}

// 醫師資料類型
export interface Doctor {
  id: number;
  name: string;
  specialty?: string;
} 
