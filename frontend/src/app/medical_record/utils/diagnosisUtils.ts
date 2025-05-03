import { GroupedOption, SelectOption } from '../components/DiagnosisFormSelect';

// 將診斷項目轉換為 Select 選項格式
export const convertToSelectOptions = (items: any[] = []): SelectOption[] => {
    return items.map(item => {
        if (typeof item === 'string') {
            return {
                label: item,
                value: item
            };
        } else if (item && typeof item === 'object') {
            return {
                label: item.name || item.label || item.title || String(item),
                value: item.code || item.value || item.id || String(item)
            };
        }
        return {
            label: String(item),
            value: String(item)
        };
    });
};

// 將樹狀數據轉換為分組選項格式
export const convertTreeDataToGroupedOptions = (data: any[]): (SelectOption | GroupedOption)[] => {
    if (!data || !Array.isArray(data)) {
        return [];
    }

    return data.map(node => {
        // 如果有子節點，創建分組選項
        if (node.children && node.children.length > 0) {
            return {
                label: node.label || node.name || String(node),
                options: convertTreeDataToGroupedOptions(node.children) as SelectOption[]
            };
        }

        // 否則創建普通選項
        return {
            label: node.label || node.name || String(node),
            value: node.value || node.code || String(node)
        };
    });
};

// 將平面數據按首字母或類別分組
export const groupOptionsByFirstLetter = (items: any[] = []): GroupedOption[] => {
    const groupMap: Record<string, SelectOption[]> = {};

    // 先轉換為選項格式並分組
    const options = convertToSelectOptions(items);

    options.forEach(option => {
        const firstChar = option.label.charAt(0).toUpperCase();
        if (!groupMap[firstChar]) {
            groupMap[firstChar] = [];
        }
        groupMap[firstChar].push(option);
    });

    // 轉換為分組選項格式
    return Object.keys(groupMap)
        .sort()
        .map(key => ({
            label: key,
            options: groupMap[key]
        }));
};

// 將平面數據按指定類別分組
export const groupOptionsByCategory = (
    items: any[] = [],
    categoryField: string = 'category',
    defaultCategory: string = '其他'
): GroupedOption[] => {
    const groupMap: Record<string, SelectOption[]> = {};

    // 處理每個項目
    items.forEach(item => {
        const category = item[categoryField] || defaultCategory;

        if (!groupMap[category]) {
            groupMap[category] = [];
        }

        groupMap[category].push({
            label: item.name || item.label || String(item),
            value: item.code || item.value || item.id || String(item)
        });
    });

    // 轉換為分組選項格式
    return Object.keys(groupMap)
        .sort()
        .map(key => ({
            label: key,
            options: groupMap[key]
        }));
};

// 根據診斷項目代碼查找對應的名稱
export const findDiagnosisNameByCode = (
    code: string,
    options: (SelectOption | GroupedOption)[]
): string | null => {
    // 平面選項搜尋
    for (const option of options) {
        if ('value' in option && option.value === code) {
            return option.label;
        }

        // 分組選項搜尋
        if ('options' in option) {
            for (const subOption of option.options) {
                if (subOption.value === code) {
                    return subOption.label;
                }
            }
        }
    }

    return null;
};

// 移除重複選項
export const removeDuplicateOptions = (options: SelectOption[]): SelectOption[] => {
    const uniqueValues = new Set<string>();
    const uniqueOptions: SelectOption[] = [];

    options.forEach(option => {
        if (!uniqueValues.has(option.value)) {
            uniqueValues.add(option.value);
            uniqueOptions.push(option);
        }
    });

    return uniqueOptions;
};

// 將樹狀數據轉換為平坦的選項數組
export const flattenTreeData = (
    treeData: any[],
    labelField: string = 'name',
    valueField: string = 'code',
    childrenField: string = 'children'
): SelectOption[] => {
    const result: SelectOption[] = [];

    const traverse = (nodes: any[]) => {
        if (!nodes || !Array.isArray(nodes)) {
            return;
        }

        for (const node of nodes) {
            if (!node) {
                continue;
            }

            // 添加當前節點
            result.push({
                label: node[labelField] || node.label || String(node),
                value: node[valueField] || node.value || String(node)
            });

            // 處理子節點
            if (node[childrenField] && Array.isArray(node[childrenField])) {
                traverse(node[childrenField]);
            }
        }
    };

    traverse(treeData);
    return result;
};

// 將平面數據按脈位分組
export const groupPulseOptionsByPosition = (
    pulseQualities: string[] = [],
    pulsePositions: string[] = []
): GroupedOption[] => {
    // 定義脈位順序：整體 > 寸 > 關 > 尺
    const positionOrder: Record<string, number> = {
        '整體': 1,
        '寸': 2,
        '關': 3,
        '尺': 4
    };

    const groupMap: Record<string, SelectOption[]> = {};

    // 初始化分組
    pulsePositions.forEach(position => {
        groupMap[position] = [];
    });

    // 為每個脈位添加脈象選項
    pulsePositions.forEach(position => {
        pulseQualities.forEach(quality => {
            groupMap[position].push({
                label: `${position}${quality}`,
                value: `${position}${quality}`
            });
        });
    });

    // 轉換為分組選項格式，並按照指定順序排序
    return Object.keys(groupMap)
        .sort((a, b) => (positionOrder[a] || 99) - (positionOrder[b] || 99))
        .map(key => ({
            label: key,
            options: groupMap[key]
        }));
};

// 根據類別分組舌診數據
export const groupTongueOptionsByCategory = (
    options: string[] = [],
    categoryMap: Record<string, string[]>
): GroupedOption[] => {
    const groupedOptions: GroupedOption[] = [];
    const usedOptions = new Set<string>();

    // 按照類別分組
    Object.entries(categoryMap).forEach(([category, items]) => {
        const categoryOptions: SelectOption[] = [];

        items.forEach(item => {
            if (options.includes(item)) {
                categoryOptions.push({
                    label: item,
                    value: item
                });
                usedOptions.add(item);
            }
        });

        if (categoryOptions.length > 0) {
            groupedOptions.push({
                label: category,
                options: categoryOptions
            });
        }
    });

    // 處理未分類的選項
    const uncategorizedOptions: SelectOption[] = options
        .filter(item => !usedOptions.has(item))
        .map(item => ({
            label: item,
            value: item
        }));

    if (uncategorizedOptions.length > 0) {
        groupedOptions.push({
            label: '其他',
            options: uncategorizedOptions
        });
    }

    return groupedOptions;
}; 