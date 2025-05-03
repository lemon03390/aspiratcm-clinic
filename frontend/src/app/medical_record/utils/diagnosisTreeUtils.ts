import {
    GroupedOption,
    SelectOption
} from '../types/diagnosisReferenceTypes';

/**
 * 表示參考數據的通用介面
 */
interface ReferenceItem {
    code: string;
    name: string;
    aliases?: string[];
    parent?: string | null;
    category_code?: string;
    category_name?: string;
    notes?: string;
}

/**
 * 樹節點結構，用於層級數據處理
 */
interface TreeNode {
    code: string;
    name: string;
    aliases?: string[];
    notes?: string;
    parent?: string | null;
    children: TreeNode[];
    level: number;
    category_code?: string;
    category_name?: string;
}

/**
 * 將平面參考數據轉換為樹形結構
 * @param data 參考數據陣列
 * @returns 樹狀結構的數據
 */
export const buildReferenceDataTree = (data: ReferenceItem[]): TreeNode[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 創建節點映射，用於快速查找和引用
    const nodeMap = new Map<string, TreeNode>();

    // 首先創建所有節點
    data.forEach(item => {
        nodeMap.set(item.code, {
            code: item.code,
            name: item.name,
            aliases: item.aliases || [],
            notes: item.notes,
            parent: item.parent,
            children: [],
            level: 0,
            category_code: item.category_code,
            category_name: item.category_name
        });
    });

    // 構建樹狀結構
    const roots: TreeNode[] = [];

    // 遍歷節點，建立父子關係
    nodeMap.forEach(node => {
        if (!node.parent) {
            // 這是一個根節點
            node.level = 0;
            roots.push(node);
        } else if (nodeMap.has(node.parent)) {
            // 將節點添加為其父節點的子節點
            const parent = nodeMap.get(node.parent);
            if (parent) {
                node.level = parent.level + 1;
                parent.children.push(node);
            }
        } else {
            // 父節點不存在，將節點視為根節點
            node.level = 0;
            node.parent = null;
            roots.push(node);
        }
    });

    // 對每個層級的節點按名稱排序
    const sortNodesByName = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        nodes.forEach(node => {
            if (node.children.length > 0) {
                sortNodesByName(node.children);
            }
        });
    };

    sortNodesByName(roots);
    return roots;
};

/**
 * 基於樹狀結構構建分組選項
 * @param treeNodes 樹節點陣列
 * @returns 分組選項陣列，保持層級結構
 */
export const buildTreeOptionsFromReferenceData = (
    data: ReferenceItem[]
): GroupedOption[] => {
    // 構建樹狀結構
    const tree = buildReferenceDataTree(data);

    // 遞迴將樹轉換為分組選項
    const convertTreeToGroupedOptions = (nodes: TreeNode[], level = 0): GroupedOption[] => {
        const result: GroupedOption[] = [];

        nodes.forEach(node => {
            // 為當前節點創建選項
            const option: SelectOption = {
                label: node.name,
                value: node.code,
                notes: node.notes,
                originalName: node.name,
                isAlias: false
            };

            // 處理別名
            const aliasOptions: SelectOption[] = [];
            if (node.aliases && node.aliases.length > 0) {
                node.aliases.forEach(alias => {
                    aliasOptions.push({
                        label: `${alias} (又名: ${node.name})`,
                        value: node.code,
                        notes: node.notes,
                        originalName: node.name,
                        isAlias: true
                    });
                });
            }

            // 如果有子節點，遞迴處理
            if (node.children && node.children.length > 0) {
                const childOptions = convertTreeToGroupedOptions(node.children, level + 1);

                // 創建一個分組，包含當前節點和其別名的選項
                const currentOptions: SelectOption[] = [option, ...aliasOptions];

                // 將所有子分組添加到結果中
                result.push({
                    label: node.name,
                    options: currentOptions
                });

                result.push(...childOptions);
            }
            else if (level === 0) {
                // 如果是頂層葉節點，創建單獨的分組
                result.push({
                    label: node.name,
                    options: [option, ...aliasOptions]
                });
            }
            else {
                // 非頂層葉節點的處理應該由父節點處理
            }
        });

        return result;
    };

    return convertTreeToGroupedOptions(tree);
};

/**
 * 基於類別代碼構建分組選項
 * @param data 參考數據陣列
 * @returns 按類別分組的選項陣列
 */
export const buildCategoryOptionsFromReferenceData = (
    data: ReferenceItem[]
): GroupedOption[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    // 按類別分組
    const categoryMap = new Map<string, SelectOption[]>();
    const uncategorizedOptions: SelectOption[] = [];

    // 將數據按類別分組
    data.forEach(item => {
        // 創建主選項
        const option: SelectOption = {
            label: item.name + (item.notes ? ` （${item.notes}）` : ''),
            value: item.code,
            notes: item.notes,
            originalName: item.name,
            isAlias: false
        };

        const categoryName = item.category_name || '未分類';

        if (!categoryName || categoryName === '未分類') {
            uncategorizedOptions.push(option);
        } else {
            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, []);
            }
            categoryMap.get(categoryName)?.push(option);
        }

        // 處理別名
        if (item.aliases && item.aliases.length > 0) {
            item.aliases.forEach(alias => {
                const aliasOption: SelectOption = {
                    label: `${alias} (又名: ${item.name})` + (item.notes ? ` （${item.notes}）` : ''),
                    value: item.code,
                    notes: item.notes,
                    originalName: item.name,
                    isAlias: true
                };

                if (!categoryName || categoryName === '未分類') {
                    uncategorizedOptions.push(aliasOption);
                } else {
                    categoryMap.get(categoryName)?.push(aliasOption);
                }
            });
        }
    });

    // 將Map轉換為分組選項
    const groupedOptions: GroupedOption[] = [];

    // 按類別名排序
    const sortedCategories = Array.from(categoryMap.keys()).sort();

    // 建立各分類分組
    sortedCategories.forEach(category => {
        const options = categoryMap.get(category) || [];
        if (options.length > 0) {
            const sortedOptions = options.sort((a, b) =>
                a.label.localeCompare(b.label, 'zh-Hant'));
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
 * 將所有參考數據攤平為可搜尋的選項列表
 * @param data 參考數據陣列
 * @returns 攤平的選項列表，包含所有資訊
 */
export const flattenReferenceDataToSearchableList = (
    data: ReferenceItem[]
): SelectOption[] => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
    }

    const result: SelectOption[] = [];

    data.forEach(item => {
        // 添加主選項
        result.push({
            label: item.name + (item.notes ? ` （${item.notes}）` : ''),
            value: item.code,
            notes: item.notes,
            originalName: item.name,
            isAlias: false,
            category: item.category_name,
            categoryCode: item.category_code,
            parent: item.parent
        });

        // 添加別名選項
        if (item.aliases && item.aliases.length > 0) {
            item.aliases.forEach(alias => {
                result.push({
                    label: `${alias} (又名: ${item.name})` + (item.notes ? ` （${item.notes}）` : ''),
                    value: item.code,
                    notes: item.notes,
                    originalName: item.name,
                    isAlias: true,
                    category: item.category_name,
                    categoryCode: item.category_code,
                    parent: item.parent
                });
            });
        }
    });

    return result.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
};

/**
 * 根據關鍵字搜尋符合的選項
 * @param searchText 搜尋關鍵字
 * @param options 攤平的選項列表
 * @param data 原始參考數據
 * @returns 符合條件的分組選項列表
 */
export const searchReferenceOptions = (
    searchText: string,
    searchableOptions: SelectOption[],
    groupedOptions: GroupedOption[]
): GroupedOption[] => {
    if (!searchText || searchText.length < 2) {
        return groupedOptions;
    }

    const lowerSearchText = searchText.toLowerCase();

    // 搜尋符合的選項
    const matchedOptions = searchableOptions.filter(option => {
        // 檢查標籤（包含主名稱或別名）
        const labelMatch = option.label.toLowerCase().includes(lowerSearchText);

        // 檢查備註
        const notesMatch = option.notes ?
            option.notes.toLowerCase().includes(lowerSearchText) : false;

        // 檢查原始名稱
        const originalNameMatch = option.originalName ?
            option.originalName.toLowerCase().includes(lowerSearchText) : false;

        return labelMatch || notesMatch || originalNameMatch;
    });

    // 從匹配的選項中重建分組結構
    const matchedCodes = new Set(matchedOptions.map(o => o.value));

    // 重建保持分組結構的選項列表
    return groupedOptions.map(group => {
        const filteredOptions = group.options.filter(option =>
            matchedCodes.has(option.value));

        if (filteredOptions.length > 0) {
            return {
                label: group.label,
                options: filteredOptions
            };
        }
        return null;
    }).filter(Boolean) as GroupedOption[];
};

/**
 * 組合建立並處理參考數據的所有步驟
 * @param data 參考數據陣列
 * @returns 預處理完成的數據包，包含分組選項和搜索列表
 */
export const prepareReferenceData = (data: ReferenceItem[]) => {
    // 建立分組選項
    const groupedOptions = buildCategoryOptionsFromReferenceData(data);

    // 建立搜尋列表
    const searchableList = flattenReferenceDataToSearchableList(data);

    return {
        groupedOptions,
        searchableList
    };
}; 