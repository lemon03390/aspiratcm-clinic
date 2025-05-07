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