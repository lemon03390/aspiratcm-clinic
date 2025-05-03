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
 * 通用的建立階層分類樹結構函數
 * @param items 資料項目
 * @param getRootItems 獲取根節點的函數
 * @param getItemChildren 獲取子項目的函數
 * @returns 
 */
function buildHierarchyTree<T extends { code: string, name: string, parent: string | null }>(
    items: T[],
    getRootItems: (items: T[]) => T[],
    getItemChildren: (parent: string, items: T[]) => T[]
): Map<string, T[]> {
    const result = new Map<string, T[]>();

    // 獲取所有根節點
    const rootItems = getRootItems(items);

    // 如果沒有根節點，返回空映射
    if (rootItems.length === 0) {
        return result;
    }

    // 對於每個根節點，創建一個分類，並放入所有直接子項
    rootItems.forEach(rootItem => {
        const children = getItemChildren(rootItem.code, items);
        if (children.length > 0) {
            result.set(rootItem.code, children);
        }
    });

    return result;
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

    // 建立 code 到項目的映射
    const codeToItemMap = new Map<string, ModernDisease>();
    data.forEach(item => {
        if (item.code) {
            codeToItemMap.set(item.code, item);
        }
    });

    // 獲取所有頂層節點 (parent === null)
    const getRootItems = (items: ModernDisease[]) => {
        return items.filter(item => item.parent === null);
    };

    // 獲取某個節點的直接子項目
    const getItemChildren = (parentCode: string, items: ModernDisease[]) => {
        return items.filter(item => item.parent === parentCode);
    };

    // 建立階層樹結構
    const hierarchy = buildHierarchyTree(data, getRootItems, getItemChildren);

    // 將項目轉換為 SelectOption (包括處理其所有別名)
    const convertItemToOptions = (item: ModernDisease): SelectOption[] => {
        const options: SelectOption[] = [];

        // 新增主選項
        options.push({
            label: item.name,
            value: item.code,
            notes: item.notes,
            originalName: item.name,
            isAlias: false
        });

        // 新增別名選項
        if (item.aliases && item.aliases.length > 0) {
            item.aliases.forEach(alias => {
                if (alias) {
                    options.push({
                        label: `${alias} (又名: ${item.name})`,
                        value: item.code,
                        notes: item.notes,
                        originalName: item.name,
                        isAlias: true
                    });
                }
            });
        }

        return options;
    };

    // 生成最終的分組選項
    const groupedOptions: GroupedOption[] = [];
    const uncategorizedOptions: SelectOption[] = [];

    // 處理所有項目
    data.forEach(item => {
        // 跳過無效項目
        if (!item.name) {
            return;
        }

        // 處理這個項目的所有選項
        const options = convertItemToOptions(item);

        // 如果這是一個頂層項目，它自己就是一個分類
        if (item.parent === null) {
            // 查找此頂層項目是否有子項
            const categoryOptions = hierarchy.get(item.code) || [];

            // 收集所有子項的選項
            const allOptions: SelectOption[] = [];
            categoryOptions.forEach(child => {
                allOptions.push(...convertItemToOptions(child));
            });

            // 根據選項數量決定是否建立分組
            if (allOptions.length > 0) {
                groupedOptions.push({
                    label: item.name,
                    options: allOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
                });
            }
        } else if (!hierarchy.has(item.parent)) {
            // 如果父節點不在分類中，則歸入未分類
            uncategorizedOptions.push(...options);
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        groupedOptions.push({
            label: '未分類',
            options: uncategorizedOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
        });
    }

    // 排序分類
    return groupedOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
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

    // 建立 code 到項目的映射
    const codeToItemMap = new Map<string, Syndrome>();
    data.forEach(item => {
        if (item.code) {
            codeToItemMap.set(item.code, item);
        }
    });

    // 獲取所有頂層節點 (parent === null)
    const getRootItems = (items: Syndrome[]) => {
        return items.filter(item => item.parent === null);
    };

    // 獲取某個節點的直接子項目
    const getItemChildren = (parentCode: string, items: Syndrome[]) => {
        return items.filter(item => item.parent === parentCode);
    };

    // 建立階層樹結構
    const hierarchy = buildHierarchyTree(data, getRootItems, getItemChildren);

    // 將項目轉換為 SelectOption (包括處理其所有別名)
    const convertItemToOptions = (item: Syndrome): SelectOption[] => {
        const options: SelectOption[] = [];

        // 新增主選項
        options.push({
            label: item.name,
            value: item.code,
            notes: item.notes,
            originalName: item.name,
            isAlias: false
        });

        // 新增別名選項
        if (item.aliases && item.aliases.length > 0) {
            item.aliases.forEach(alias => {
                if (alias) {
                    options.push({
                        label: `${alias} (又名: ${item.name})`,
                        value: item.code,
                        notes: item.notes,
                        originalName: item.name,
                        isAlias: true
                    });
                }
            });
        }

        return options;
    };

    // 生成最終的分組選項
    const groupedOptions: GroupedOption[] = [];
    const uncategorizedOptions: SelectOption[] = [];

    // 處理所有項目
    data.forEach(item => {
        // 跳過無效項目
        if (!item.name) {
            return;
        }

        // 處理這個項目的所有選項
        const options = convertItemToOptions(item);

        // 如果這是一個頂層項目，它自己就是一個分類
        if (item.parent === null) {
            // 查找此頂層項目是否有子項
            const categoryOptions = hierarchy.get(item.code) || [];

            // 收集所有子項的選項
            const allOptions: SelectOption[] = [];
            categoryOptions.forEach(child => {
                allOptions.push(...convertItemToOptions(child));
            });

            // 根據選項數量決定是否建立分組
            if (allOptions.length > 0) {
                groupedOptions.push({
                    label: item.name,
                    options: allOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
                });
            }
        } else if (!hierarchy.has(item.parent)) {
            // 如果父節點不在分類中，則歸入未分類
            uncategorizedOptions.push(...options);
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        groupedOptions.push({
            label: '未分類',
            options: uncategorizedOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
        });
    }

    // 排序分類
    return groupedOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
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

    // 建立 code 到項目的映射
    const codeToItemMap = new Map<string, Principle>();
    data.forEach(item => {
        if (item.code) {
            codeToItemMap.set(item.code, item);
        }
    });

    // 獲取所有頂層節點 (parent === null)
    const getRootItems = (items: Principle[]) => {
        return items.filter(item => item.parent === null);
    };

    // 獲取某個節點的直接子項目
    const getItemChildren = (parentCode: string, items: Principle[]) => {
        return items.filter(item => item.parent === parentCode);
    };

    // 建立階層樹結構
    const hierarchy = buildHierarchyTree(data, getRootItems, getItemChildren);

    // 將項目轉換為 SelectOption (包括處理其所有別名)
    const convertItemToOptions = (item: Principle): SelectOption[] => {
        const options: SelectOption[] = [];

        // 新增主選項
        options.push({
            label: item.name,
            value: item.code,
            notes: item.notes,
            originalName: item.name,
            isAlias: false
        });

        // 新增別名選項
        if (item.aliases && item.aliases.length > 0) {
            item.aliases.forEach(alias => {
                if (alias) {
                    options.push({
                        label: `${alias} (又名: ${item.name})`,
                        value: item.code,
                        notes: item.notes,
                        originalName: item.name,
                        isAlias: true
                    });
                }
            });
        }

        return options;
    };

    // 生成最終的分組選項
    const groupedOptions: GroupedOption[] = [];
    const uncategorizedOptions: SelectOption[] = [];

    // 處理所有項目
    data.forEach(item => {
        // 跳過無效項目
        if (!item.name) {
            return;
        }

        // 處理這個項目的所有選項
        const options = convertItemToOptions(item);

        // 如果這是一個頂層項目，它自己就是一個分類
        if (item.parent === null) {
            // 查找此頂層項目是否有子項
            const categoryOptions = hierarchy.get(item.code) || [];

            // 收集所有子項的選項
            const allOptions: SelectOption[] = [];
            categoryOptions.forEach(child => {
                allOptions.push(...convertItemToOptions(child));
            });

            // 根據選項數量決定是否建立分組
            if (allOptions.length > 0) {
                groupedOptions.push({
                    label: item.name,
                    options: allOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
                });
            }
        } else if (!hierarchy.has(item.parent)) {
            // 如果父節點不在分類中，則歸入未分類
            uncategorizedOptions.push(...options);
        }
    });

    // 處理未分類項目
    if (uncategorizedOptions.length > 0) {
        groupedOptions.push({
            label: '未分類',
            options: uncategorizedOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
        });
    }

    // 排序分類
    return groupedOptions.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
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