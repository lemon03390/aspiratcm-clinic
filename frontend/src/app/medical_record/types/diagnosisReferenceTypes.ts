export interface ModernDisease {
    code: string;
    name: string;
    aliases?: string[];
    category_code?: string;
    category_name?: string;
    notes?: string;
    parent: string | null;
}

export interface Syndrome {
    code: string;
    name: string;
    aliases?: string[];
    category_code?: string;
    category_name?: string;
    notes?: string;
    parent: string | null;
}

export interface Principle {
    code: string;
    name: string;
    aliases?: string[];
    category_code?: string;
    category_name?: string;
    notes?: string;
    parent: string | null;
}

export interface SelectOption {
    label: string;
    value: string;
    notes?: string; // 選項備註
    originalName?: string; // 原始正規名稱
    isAlias?: boolean; // 是否為別名
    category?: string; // 類別名稱
    categoryCode?: string; // 類別代碼
    parent?: string | null; // 父項目代碼
}

export interface GroupedOption {
    label: string;
    options: SelectOption[];
} 