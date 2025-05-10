// 與後端 Membership 模型匹配的會員類型
export interface Member {
    id: number;
    patientName: string;
    phoneNumber: string | null;
    contactAddress: string | null;
    hkid: string | null;
    termsConsent: boolean;
    haveCard: boolean;
    created_at: string;
    updated_at: string;
    patient_id?: number | null;

    // 向後兼容舊界面的字段映射
    name?: string;
    phone?: string;
    id_number?: string;
    gender?: string | null;
    dob?: string | null;
    has_card?: boolean;
    has_signed_consent_form?: boolean;
}

export interface MemberList {
    items: Member[];
    total: number;
}

export interface MemberFormData {
    patientName: string;
    phoneNumber?: string;
    contactAddress?: string;
    hkid?: string;
    termsConsent?: boolean;
    haveCard?: boolean;
}

// 會員餘額類型
export interface MemberBalance {
    id: number;
    membership_id: number;
    storedValue: number;
    giftedValue: number;
    created_at: string;
    updated_at: string;
}

// 會員交易記錄類型
export interface MemberTransaction {
    id: number;
    membership_id: number;
    amount: number;
    giftAmount: number;
    type: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface MemberTransactionList {
    logs: MemberTransaction[];
    total: number;
}

// 會員增值請求類型
export interface MemberTopUpRequest {
    amount: number;
    gift_amount: number;
    plan_id?: number;
}

// 會員消費請求類型
export interface MemberSpendRequest {
    amount: number;
}

// 會員增值計劃類型 (舊API)
export interface MemberTopUpPlan {
    id: number;
    name: string;
    stored_value: number;
    gifted_value: number;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface MemberTopUpPlanList {
    items: MemberTopUpPlan[];
    total: number;
}

// 新的會員增值計劃類型 (新API)
export interface MemberPlan {
    id: number;
    name: string;
    description: string | null;
    base_amount: number;
    bonus_amount: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface MemberPlanList {
    items: MemberPlan[];
    total: number;
}