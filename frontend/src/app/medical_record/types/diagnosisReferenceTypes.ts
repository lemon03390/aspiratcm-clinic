export interface ModernDisease {
    code: string;
    name: string;
    aliases?: string[];
    category_code?: string;
    category_name?: string;
    notes?: string;
}

export interface Syndrome {
    code: string;
    name: string;
    aliases?: string[];
    category_code?: string;
    category_name?: string;
    notes?: string;
}

export interface Principle {
    code: string;
    name: string;
    aliases?: string[];
    category_code?: string;
    category_name?: string;
    notes?: string;
}

export interface SelectOption {
    label: string;
    value: string;
    notes?: string; // 選項備註
    originalName?: string; // 原始正規名稱
    isAlias?: boolean; // 是否為別名
}

export interface GroupedOption {
    label: string;
    options: SelectOption[];
} 