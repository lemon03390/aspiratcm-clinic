import { Member, MemberFormData, MemberList } from '../types';

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

    const url = `${getFrontendApiUrl('members')}?${searchParams.toString()}`;
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
    const response = await fetch(getFrontendApiUrl(`members/${id}`));

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
    const response = await fetch(getFrontendApiUrl('members'), {
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
    const response = await fetch(getFrontendApiUrl(`members/${id}`), {
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
    const response = await fetch(getFrontendApiUrl(`members/${id}`), {
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
 * 適配會員數據，確保兼容舊UI
 */
function adaptMemberData(data: any): Member {
    if (!data) return data;

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