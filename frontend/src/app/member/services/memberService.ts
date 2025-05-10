import { Member, MemberBalance, MemberFormData, MemberList, MemberPlan, MemberPlanList, MemberSpendRequest, MemberTopUpPlanList, MemberTopUpRequest, MemberTransactionList } from '../types';

// 從本地 API 代理獲取前端 API URL
function getFrontendApiUrl(path: string = ''): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/api/v1${cleanPath}`;
}

/**
 * 獲取會員列表
 */
export async function getMembers(page: number = 1, limit: number = 10, search?: string): Promise<MemberList> {
    const searchParams = new URLSearchParams();
    searchParams.append('skip', ((page - 1) * limit).toString());
    searchParams.append('limit', limit.toString());

    if (search) {
        searchParams.append('search', search);
    }

    const url = `${getFrontendApiUrl('memberships')}?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        console.error('獲取會員失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '取得會員資料失敗');
        } catch (e) {
            throw new Error('取得會員資料失敗');
        }
    }

    const data = await response.json();
    return adaptMemberResponse(data);
}

/**
 * 獲取單一會員
 */
export async function getMember(id: number): Promise<Member> {
    const response = await fetch(getFrontendApiUrl(`memberships/${id}`));

    if (!response.ok) {
        console.error('獲取單一會員失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '取得會員資料失敗');
        } catch (e) {
            throw new Error('取得會員資料失敗');
        }
    }

    return adaptMemberData(await response.json());
}

/**
 * 建立新會員
 */
export async function createMember(member: MemberFormData): Promise<Member> {
    const response = await fetch(getFrontendApiUrl('memberships'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(member),
    });

    if (!response.ok) {
        console.error('創建會員失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '建立會員失敗');
        } catch (e) {
            throw new Error('建立會員失敗');
        }
    }

    return adaptMemberData(await response.json());
}

/**
 * 更新會員
 */
export async function updateMember(id: number, member: Partial<MemberFormData>): Promise<Member> {
    const response = await fetch(getFrontendApiUrl(`memberships/${id}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(member),
    });

    if (!response.ok) {
        console.error('更新會員失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '更新會員失敗');
        } catch (e) {
            throw new Error('更新會員失敗');
        }
    }

    return adaptMemberData(await response.json());
}

/**
 * 刪除會員
 */
export async function deleteMember(id: number): Promise<Member> {
    const response = await fetch(getFrontendApiUrl(`memberships/${id}`), {
        method: 'DELETE',
    });

    if (!response.ok) {
        console.error('刪除會員失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '刪除會員失敗');
        } catch (e) {
            throw new Error('刪除會員失敗');
        }
    }

    return adaptMemberData(await response.json());
}

/**
 * 通過電話號碼搜尋會員
 */
export async function searchMemberByPhone(phone: string): Promise<Member> {
    const response = await fetch(getFrontendApiUrl(`memberships/search/by-phone?phone=${encodeURIComponent(phone)}`));

    if (!response.ok) {
        console.error('透過電話搜尋會員失敗:', response.status, response.statusText);
        throw new Error('找不到符合此電話號碼的會員');
    }

    return adaptMemberData(await response.json());
}

/**
 * 通過身份證號碼搜尋會員
 */
export async function searchMemberByHKID(hkid: string): Promise<Member> {
    const response = await fetch(getFrontendApiUrl(`memberships/search/by-hkid?hkid=${encodeURIComponent(hkid)}`));

    if (!response.ok) {
        console.error('透過身份證搜尋會員失敗:', response.status, response.statusText);
        throw new Error('找不到符合此身份證號碼的會員');
    }

    return adaptMemberData(await response.json());
}

/**
 * 通過病人ID搜尋會員
 */
export async function searchMemberByPatientId(patientId: number): Promise<Member> {
    const response = await fetch(getFrontendApiUrl(`memberships/search/by-patient-id?patient_id=${patientId}`));

    if (!response.ok) {
        console.error('透過病人ID搜尋會員失敗:', response.status, response.statusText);
        throw new Error('找不到符合此病人ID的會員');
    }

    return adaptMemberData(await response.json());
}

/**
 * 獲取會員餘額
 */
export async function getMemberBalance(memberId: number): Promise<MemberBalance> {
    const response = await fetch(getFrontendApiUrl(`memberships/${memberId}/balance`));

    if (!response.ok) {
        console.error('獲取會員餘額失敗:', response.status, response.statusText);
        throw new Error('無法獲取會員餘額資料');
    }

    return await response.json();
}

/**
 * 獲取會員交易記錄
 */
export async function getMemberTransactions(
    memberId: number,
    page: number = 1,
    limit: number = 10
): Promise<MemberTransactionList> {
    const searchParams = new URLSearchParams();
    searchParams.append('skip', ((page - 1) * limit).toString());
    searchParams.append('limit', limit.toString());

    const response = await fetch(
        getFrontendApiUrl(`memberships/${memberId}/logs?${searchParams.toString()}`)
    );

    if (!response.ok) {
        console.error('獲取會員交易記錄失敗:', response.status, response.statusText);
        throw new Error('無法獲取會員交易記錄');
    }

    return await response.json();
}

/**
 * 會員增值
 */
export async function topUpMemberAccount(memberId: number, data: MemberTopUpRequest): Promise<MemberBalance> {
    const response = await fetch(getFrontendApiUrl(`memberships/${memberId}/balance/topup`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        console.error('會員增值失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '會員增值失敗');
        } catch (e) {
            throw new Error('會員增值失敗');
        }
    }

    return await response.json();
}

/**
 * 會員消費
 */
export async function spendMemberAccount(memberId: number, data: MemberSpendRequest): Promise<MemberBalance> {
    const response = await fetch(getFrontendApiUrl(`memberships/${memberId}/balance/spend`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        console.error('會員消費失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '會員消費失敗');
        } catch (e) {
            throw new Error('會員消費失敗');
        }
    }

    return await response.json();
}

/**
 * 獲取增值計劃列表
 */
export async function getTopUpPlans(showInactive: boolean = false): Promise<MemberTopUpPlanList> {
    const searchParams = new URLSearchParams();
    if (showInactive) {
        searchParams.append('show_inactive', 'true');
    }

    const response = await fetch(
        getFrontendApiUrl(`settings/member-topup-plans?${searchParams.toString()}`)
    );

    if (!response.ok) {
        console.error('獲取增值計劃失敗:', response.status, response.statusText);
        throw new Error('無法獲取增值計劃');
    }

    return await response.json();
}

/**
 * 獲取增值計劃列表 (新API)
 */
export async function getMemberPlans(isActive?: boolean): Promise<MemberPlanList> {
    const searchParams = new URLSearchParams();
    if (isActive !== undefined) {
        searchParams.append('is_active', isActive.toString());
    }

    const response = await fetch(
        getFrontendApiUrl(`member-plans?${searchParams.toString()}`)
    );

    if (!response.ok) {
        console.error('獲取增值計劃失敗:', response.status, response.statusText);
        throw new Error('無法獲取增值計劃');
    }

    return await response.json();
}

/**
 * 獲取單個增值計劃
 */
export async function getMemberPlan(id: number): Promise<MemberPlan> {
    const response = await fetch(getFrontendApiUrl(`member-plans/${id}`));

    if (!response.ok) {
        console.error('獲取增值計劃失敗:', response.status, response.statusText);
        throw new Error('無法獲取增值計劃詳情');
    }

    return await response.json();
}

/**
 * 創建增值計劃
 */
export async function createMemberPlan(plan: {
    name: string;
    description?: string;
    base_amount: number;
    bonus_amount: number;
    is_active?: boolean;
    sort_order?: number;
}): Promise<MemberPlan> {
    const response = await fetch(getFrontendApiUrl('member-plans'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(plan),
    });

    if (!response.ok) {
        console.error('創建增值計劃失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '創建增值計劃失敗');
        } catch (e) {
            throw new Error('創建增值計劃失敗');
        }
    }

    return await response.json();
}

/**
 * 更新增值計劃
 */
export async function updateMemberPlan(id: number, plan: {
    name?: string;
    description?: string;
    base_amount?: number;
    bonus_amount?: number;
    is_active?: boolean;
    sort_order?: number;
}): Promise<MemberPlan> {
    const response = await fetch(getFrontendApiUrl(`member-plans/${id}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(plan),
    });

    if (!response.ok) {
        console.error('更新增值計劃失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '更新增值計劃失敗');
        } catch (e) {
            throw new Error('更新增值計劃失敗');
        }
    }

    return await response.json();
}

/**
 * 刪除增值計劃
 */
export async function deleteMemberPlan(id: number): Promise<MemberPlan> {
    const response = await fetch(getFrontendApiUrl(`member-plans/${id}`), {
        method: 'DELETE',
    });

    if (!response.ok) {
        console.error('刪除增值計劃失敗:', response.status, response.statusText);
        try {
            const error = await response.json();
            throw new Error(error.detail || error.error || '刪除增值計劃失敗');
        } catch (e) {
            throw new Error('刪除增值計劃失敗');
        }
    }

    return await response.json();
}

/**
 * 適配會員數據，確保兼容舊UI
 */
function adaptMemberData(data: any): Member {
    if (!data) {
        return data;
    }

    // 添加向後兼容性字段
    return {
        ...data,
        // 從新欄位映射到舊欄位（用於保持UI兼容性）
        name: data.name || data.patientName,
        phone: data.phone || data.phoneNumber,
        id_number: data.id_number || data.hkid,
        has_card: data.has_card !== undefined ? data.has_card : data.haveCard,
        has_signed_consent_form: data.has_signed_consent_form !== undefined ? data.has_signed_consent_form : data.termsConsent
    };
}

/**
 * 適配會員列表響應
 */
function adaptMemberResponse(data: any): MemberList {
    if (!data || !data.items) {
        // 如果是舊格式，轉換為新格式
        if (Array.isArray(data)) {
            return {
                items: data.map(adaptMemberData),
                total: data.length
            };
        }
        return { items: [], total: 0 };
    }

    return {
        items: Array.isArray(data.items) ? data.items.map(adaptMemberData) : [],
        total: data.total || 0
    };
} 