import {
    SelectOption as BaseSelectOption,
    GroupedOption,
    ModernDisease,
    Principle,
    Syndrome
} from '../types/diagnosisReferenceTypes';

// 擴展 SelectOption 類型以包含所需的屬性
interface SelectOption extends BaseSelectOption {
    aliases?: string[];
}

/**
 * 將現代病名轉換為分組選項格式
 * @param data 現代病名資料陣列
 * @returns 分組後的選項格式
 */
export const convertModernDiseasesToGroupedOptions = (data: ModernDisease[]): GroupedOption[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 分類映射
    const categoryMap = new Map<string, SelectOption[]>();

    // 處理沒有分類的項目
    const uncategorizedOptions: SelectOption[] = [];

    // 第一階段：收集所有主選項
    data.forEach(disease => {
        // 只處理有名稱的項目
        if (!disease.name) {
            return;
        }

        // 創建選項
        const option: SelectOption = {
            label: disease.name,
            value: disease.code,
            notes: disease.notes,
            originalName: disease.name,
            isAlias: false
        };

        // 根據分類進行分組
        const categoryName = disease.category_name || '未分類';

        if (!categoryName || categoryName === '未分類') {
            uncategorizedOptions.push(option);
            return;
        }

        if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
        }
        categoryMap.get(categoryName)?.push(option);
    });

    // 第二階段：處理所有別名
    data.forEach(disease => {
        if (!disease.aliases || disease.aliases.length === 0) {
            return;
        }

        disease.aliases.forEach(alias => {
            if (!alias) {
                return;
            }

            const aliasOption: SelectOption = {
                label: `${alias} (又名: ${disease.name})`,
                value: disease.code,
                notes: disease.notes,
                originalName: disease.name,
                isAlias: true
            };

            // 分類處理邏輯與上面相同
            const categoryName = disease.category_name || '未分類';

            if (!categoryName || categoryName === '未分類') {
                uncategorizedOptions.push(aliasOption);
                return;
            }

            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, []);
            }
            categoryMap.get(categoryName)?.push(aliasOption);
        });
    });

    // 將 Map 轉換為最終的分組選項格式
    const groupedOptions: GroupedOption[] = [];

    // 按照分類名稱排序
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(category => {
        const options = categoryMap.get(category) || [];
        if (options.length > 0) {
            // 對選項進行排序
            const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
            groupedOptions.push({
                label: category,
                options: sortedOptions
            });
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        const sortedUncategorized = uncategorizedOptions.sort((a, b) =>
            a.label.localeCompare(b.label, 'zh-Hant'));

        groupedOptions.push({
            label: '未分類',
            options: sortedUncategorized
        });
    }

    return groupedOptions;
};

/**
 * 將中醫辨證轉換為分組選項格式
 * @param data 中醫辨證資料陣列
 * @returns 分組後的選項格式
 */
export const convertCmsyndromesToGroupedOptions = (data: Syndrome[]): GroupedOption[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 分類映射
    const categoryMap = new Map<string, SelectOption[]>();

    // 處理沒有分類的項目
    const uncategorizedOptions: SelectOption[] = [];

    // 第一階段：收集所有主選項
    data.forEach(syndrome => {
        // 只處理有名稱的項目
        if (!syndrome.name) {
            return;
        }

        // 創建選項
        const option: SelectOption = {
            label: syndrome.name,
            value: syndrome.code,
            notes: syndrome.notes,
            originalName: syndrome.name,
            isAlias: false
        };

        // 根據分類進行分組
        const categoryName = syndrome.category_name || '未分類';

        if (!categoryName || categoryName === '未分類') {
            uncategorizedOptions.push(option);
            return;
        }

        if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
        }
        categoryMap.get(categoryName)?.push(option);
    });

    // 第二階段：處理所有別名
    data.forEach(syndrome => {
        if (!syndrome.aliases || syndrome.aliases.length === 0) {
            return;
        }

        syndrome.aliases.forEach(alias => {
            if (!alias) {
                return;
            }

            const aliasOption: SelectOption = {
                label: `${alias} (又名: ${syndrome.name})`,
                value: syndrome.code,
                notes: syndrome.notes,
                originalName: syndrome.name,
                isAlias: true
            };

            // 分類處理邏輯與上面相同
            const categoryName = syndrome.category_name || '未分類';

            if (!categoryName || categoryName === '未分類') {
                uncategorizedOptions.push(aliasOption);
                return;
            }

            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, []);
            }
            categoryMap.get(categoryName)?.push(aliasOption);
        });
    });

    // 將 Map 轉換為最終的分組選項格式
    const groupedOptions: GroupedOption[] = [];

    // 按照分類名稱排序
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(category => {
        const options = categoryMap.get(category) || [];
        if (options.length > 0) {
            // 對選項進行排序
            const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
            groupedOptions.push({
                label: category,
                options: sortedOptions
            });
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        const sortedUncategorized = uncategorizedOptions.sort((a, b) =>
            a.label.localeCompare(b.label, 'zh-Hant'));

        groupedOptions.push({
            label: '未分類',
            options: sortedUncategorized
        });
    }

    return groupedOptions;
};

/**
 * 將中醫治則轉換為分組選項格式
 * @param data 中醫治則資料陣列
 * @returns 分組後的選項格式
 */
export const convertCmPrinciplesToGroupedOptions = (data: Principle[]): GroupedOption[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 分類映射
    const categoryMap = new Map<string, SelectOption[]>();

    // 處理沒有分類的項目
    const uncategorizedOptions: SelectOption[] = [];

    // 第一階段：收集所有主選項
    data.forEach(principle => {
        // 只處理有名稱的項目
        if (!principle.name) {
            return;
        }

        // 創建選項
        const option: SelectOption = {
            label: principle.name,
            value: principle.code,
            notes: principle.notes,
            originalName: principle.name,
            isAlias: false
        };

        // 根據分類進行分組
        const categoryName = principle.category_name || '未分類';

        if (!categoryName || categoryName === '未分類') {
            uncategorizedOptions.push(option);
            return;
        }

        if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
        }
        categoryMap.get(categoryName)?.push(option);
    });

    // 第二階段：處理所有別名
    data.forEach(principle => {
        if (!principle.aliases || principle.aliases.length === 0) {
            return;
        }

        principle.aliases.forEach(alias => {
            if (!alias) {
                return;
            }

            const aliasOption: SelectOption = {
                label: `${alias} (又名: ${principle.name})`,
                value: principle.code,
                notes: principle.notes,
                originalName: principle.name,
                isAlias: true
            };

            // 分類處理邏輯與上面相同
            const categoryName = principle.category_name || '未分類';

            if (!categoryName || categoryName === '未分類') {
                uncategorizedOptions.push(aliasOption);
                return;
            }

            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, []);
            }
            categoryMap.get(categoryName)?.push(aliasOption);
        });
    });

    // 將 Map 轉換為最終的分組選項格式
    const groupedOptions: GroupedOption[] = [];

    // 按照分類名稱排序
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(category => {
        const options = categoryMap.get(category) || [];
        if (options.length > 0) {
            // 對選項進行排序
            const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
            groupedOptions.push({
                label: category,
                options: sortedOptions
            });
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        const sortedUncategorized = uncategorizedOptions.sort((a, b) =>
            a.label.localeCompare(b.label, 'zh-Hant'));

        groupedOptions.push({
            label: '未分類',
            options: sortedUncategorized
        });
    }

    return groupedOptions;
};

/**
 * 建立別名映射表，可以快速從別名找到對應的標準名稱或代碼
 * @param data 原始資料陣列
 * @returns 別名映射表：別名 => 代碼
 */
export const buildAliasMapping = (data: any[]): Record<string, string> => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return {};
    }

    const aliasMap: Record<string, string> = {};

    data.forEach(item => {
        // 跳過沒有名稱或代碼的項目
        if (!item.name || !item.code) {
            return;
        }

        // 先將主名稱映射到代碼
        aliasMap[item.name] = item.code;

        // 再處理所有別名
        if (item.aliases && Array.isArray(item.aliases)) {
            item.aliases.forEach((alias: string) => {
                if (alias) {
                    aliasMap[alias] = item.code;
                }
            });
        }
    });

    return aliasMap;
};

/**
 * 根據代碼查找對應的名稱
 * @param code 代碼
 * @param data 原始資料陣列
 * @returns 名稱，如果找不到則返回 null
 */
export const findNameByCode = (code: string, data: any[]): string | null => {
    if (!code || !data || !Array.isArray(data)) {
        return null;
    }

    const item = data.find(item => item.code === code);
    return item ? item.name : null;
};

/**
 * 根據代碼查找完整的項目資料
 * @param code 代碼
 * @param data 原始資料陣列
 * @returns 項目資料，如果找不到則返回 null
 */
export const findItemByCode = (code: string, data: any[]): any | null => {
    if (!code || !data || !Array.isArray(data)) {
        return null;
    }

    return data.find(item => item.code === code) || null;
};

/**
 * 針對帶有別名的選項進行篩選，支援模糊搜尋
 * @param input 搜尋關鍵字
 * @param options 選項列表，可以是 SelectOption 或 GroupedOption 的混合陣列
 * @returns 過濾後的選項，保持原始的分組結構
 */
export function filterOptionsWithAlias(
    input: string,
    options: (SelectOption | GroupedOption)[]
): (SelectOption | GroupedOption)[] {
    // 如果沒有輸入或關鍵字太短，直接返回原始選項
    if (!input || input.length < 2) {
        return options;
    }

    const lowerInput = input.toLowerCase();

    // 處理過濾邏輯
    return options.map(option => {
        // 判斷是否為分組選項
        if ('options' in option) {
            // 這是一個 GroupedOption
            const filteredSubOptions = option.options.filter(subOption => {
                // 檢查標籤（主名稱）是否符合
                const labelMatch = subOption.label.toLowerCase().includes(lowerInput);

                // 檢查備註是否符合
                const notesMatch = subOption.notes
                    ? subOption.notes.toLowerCase().includes(lowerInput)
                    : false;

                // 檢查原始名稱是否符合 (適用於別名選項)
                const originalNameMatch = 'originalName' in subOption && subOption.originalName
                    ? subOption.originalName.toLowerCase().includes(lowerInput)
                    : false;

                return labelMatch || notesMatch || originalNameMatch;
            });

            // 只返回有符合項目的分組
            if (filteredSubOptions.length > 0) {
                return {
                    ...option,
                    options: filteredSubOptions
                };
            }
            return null;
        } else {
            // 這是一個普通的 SelectOption
            const labelMatch = option.label.toLowerCase().includes(lowerInput);

            // 檢查備註是否符合
            const notesMatch = option.notes
                ? option.notes.toLowerCase().includes(lowerInput)
                : false;

            // 檢查原始名稱是否符合 (適用於別名選項)
            const originalNameMatch = 'originalName' in option && option.originalName
                ? option.originalName.toLowerCase().includes(lowerInput)
                : false;

            return (labelMatch || notesMatch || originalNameMatch) ? option : null;
        }
    }).filter(Boolean) as (SelectOption | GroupedOption)[];
} 