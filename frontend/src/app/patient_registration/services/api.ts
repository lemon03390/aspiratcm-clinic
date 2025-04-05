import axios from 'axios';
import { 
  Patient, 
  PatientCreateRequest, 
  PatientUpdateRequest, 
  ReferenceData,
  CheckPatientResponse
} from '../types';

// API 基礎路徑
const API_BASE_URL = '/api/v1/patient_registration';

// 獲取參考資料（疾病列表，過敏列表等）
export async function getReferenceData(): Promise<ReferenceData> {
  try {
    const response = await axios.get<ReferenceData>(`${API_BASE_URL}/reference-data`);
    return response.data;
  } catch (error) {
    console.error('獲取參考資料失敗:', error);
    throw error;
  }
}

// 檢查患者是否存在
export async function checkPatient(
  params: { chinese_name?: string; id_number?: string; phone_number?: string }
): Promise<CheckPatientResponse> {
  try {
    const response = await axios.get<CheckPatientResponse>(`${API_BASE_URL}/check-patient`, { params });
    return response.data;
  } catch (error) {
    console.error('檢查患者失敗:', error);
    throw error;
  }
}

// 檢查身份證號碼是否已註冊
export async function checkIdNumber(idNumber: string): Promise<CheckPatientResponse> {
  try {
    const response = await axios.get<CheckPatientResponse>(`${API_BASE_URL}/check-id-number`, { 
      params: { id_number: idNumber } 
    });
    return response.data;
  } catch (error) {
    console.error('檢查身份證號碼失敗:', error);
    throw error;
  }
}

// 創建新患者
export async function createPatient(patientData: PatientCreateRequest): Promise<Patient> {
  try {
    const response = await axios.post<Patient>(API_BASE_URL, patientData);
    return response.data;
  } catch (error) {
    console.error('創建患者失敗:', error);
    throw error;
  }
}

// 獲取所有患者
export async function getPatients(params?: { skip?: number; limit?: number }): Promise<Patient[]> {
  try {
    const response = await axios.get<Patient[]>(API_BASE_URL, { params });
    return response.data;
  } catch (error) {
    console.error('獲取患者列表失敗:', error);
    throw error;
  }
}

// 通過ID獲取患者
export async function getPatientById(id: number): Promise<Patient> {
  try {
    const response = await axios.get<Patient>(`${API_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`獲取患者 ID ${id} 失敗:`, error);
    throw error;
  }
}

// 通過掛號編號獲取患者
export async function getPatientByRegistrationNumber(registrationNumber: string): Promise<Patient> {
  try {
    const response = await axios.get<Patient>(`${API_BASE_URL}/by-registration-number/${registrationNumber}`);
    return response.data;
  } catch (error) {
    console.error(`通過掛號編號 ${registrationNumber} 獲取患者失敗:`, error);
    throw error;
  }
}

// 更新患者資料
export async function updatePatient(id: number, updateData: PatientUpdateRequest): Promise<Patient> {
  try {
    const response = await axios.patch<Patient>(`${API_BASE_URL}/${id}`, updateData);
    return response.data;
  } catch (error) {
    console.error(`更新患者 ID ${id} 失敗:`, error);
    throw error;
  }
}

// 刪除患者
export async function deletePatient(id: number): Promise<void> {
  try {
    await axios.delete(`${API_BASE_URL}/${id}`);
  } catch (error) {
    console.error(`刪除患者 ID ${id} 失敗:`, error);
    throw error;
  }
} 