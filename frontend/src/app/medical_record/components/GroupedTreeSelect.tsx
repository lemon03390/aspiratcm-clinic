import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import Select, { components } from 'react-select';
import '../../../styles/GroupedTreeSelectStyles.css';

export interface TreeNode {
    label: string;
    value: string;
    children?: TreeNode[];
    isLeaf?: boolean;
}

// react-select 選項類型
export interface GroupedOption {
    label: string;
    value: string;
    isGroup?: boolean;
    options?: GroupedOption[];
}

interface GroupedTreeSelectProps {
    placeholder: string;
    onChange: (value: string[]) => void;
    onSelect?: (value: string, node: GroupedOption) => void;
    loadData: (searchTerm: string) => Promise<TreeNode[]>;
    value?: string[];
    defaultValue?: string[];
    className?: string;
    multiple?: boolean;
    allowClear?: boolean;
    disabled?: boolean;
    loading?: boolean;
    treeData?: TreeNode[];
    minSearchCharacters?: number;
}

// 將樹形數據轉換為分組選項格式
const convertTreeToGroupedOptions = (treeData: TreeNode[]): GroupedOption[] => {
    return treeData.map(node => {
        if (node.children && node.children.length > 0) {
            return {
                label: node.label,
                value: node.value,
                isGroup: true,
                options: convertTreeToGroupedOptions(node.children)
            };
        }
        return {
            label: node.label,
            value: node.value
        };
    });
};

// 從值數組中查找對應的選項對象
const findSelectedOptions = (values: string[], options: GroupedOption[]): GroupedOption[] => {
    const result: GroupedOption[] = [];

    const findInOptions = (opts: GroupedOption[]) => {
        for (const opt of opts) {
            if (values.includes(opt.value)) {
                result.push(opt);
            }
            if (opt.options) {
                findInOptions(opt.options);
            }
        }
    };

    findInOptions(options);
    return result;
};

const GroupedTreeSelect: React.FC<GroupedTreeSelectProps> = ({
    placeholder,
    onChange,
    onSelect,
    loadData,
    value = [],
    defaultValue,
    className = '',
    multiple = true,
    allowClear = true,
    disabled = false,
    loading = false,
    treeData: providedTreeData,
    minSearchCharacters = 2
}) => {
    const [treeData, setTreeData] = useState<TreeNode[]>(providedTreeData || []);
    const [groupedOptions, setGroupedOptions] = useState<GroupedOption[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<GroupedOption[]>([]);

    // 加載樹形數據並轉換為分組選項
    const debouncedLoadData = useCallback(
        debounce(async (searchTerm: string) => {
            if (!searchTerm || searchTerm.length < minSearchCharacters) {
                if (providedTreeData && providedTreeData.length > 0) {
                    const options = convertTreeToGroupedOptions(providedTreeData);
                    setTreeData(providedTreeData);
                    setGroupedOptions(options);
                }
                return;
            }

            setIsLoading(true);
            try {
                const data = await loadData(searchTerm);
                if (data && data.length > 0) {
                    console.log('搜尋到資料:', data.length, '筆');
                    const options = convertTreeToGroupedOptions(data);
                    setTreeData(data);
                    setGroupedOptions(options);
                } else {
                    console.log('搜尋無結果');
                    if (providedTreeData && providedTreeData.length > 0) {
                        const options = convertTreeToGroupedOptions(providedTreeData);
                        setTreeData(providedTreeData);
                        setGroupedOptions(options);
                    }
                }
            } catch (error) {
                console.error('搜尋資料失敗:', error);
                if (providedTreeData && providedTreeData.length > 0) {
                    const options = convertTreeToGroupedOptions(providedTreeData);
                    setTreeData(providedTreeData);
                    setGroupedOptions(options);
                } else {
                    setTreeData([]);
                    setGroupedOptions([]);
                }
            } finally {
                setIsLoading(false);
            }
        }, 300),
        [loadData, providedTreeData, minSearchCharacters]
    );

    // 處理輸入變化
    const handleInputChange = (newValue: string) => {
        console.log('輸入變化:', newValue);
        setSearchValue(newValue);

        if (!newValue && providedTreeData) {
            const options = convertTreeToGroupedOptions(providedTreeData);
            setTreeData(providedTreeData);
            setGroupedOptions(options);
            return;
        }

        debouncedLoadData(newValue);
        return newValue;
    };

    // 處理選擇變化
    const handleChange = (selected: any) => {
        if (selected === null) {
            console.log('清空選擇');
            setSelectedOptions([]);
            onChange([]);
            return;
        }

        if (Array.isArray(selected)) {
            console.log('多選變化:', selected);
            setSelectedOptions([...selected]);
            onChange(selected.map((option: GroupedOption) => option.value));
        } else {
            console.log('單選變化:', selected);
            setSelectedOptions([selected]);
            onChange([selected.value]);
        }
    };

    // 當樹形數據變化時，更新分組選項
    useEffect(() => {
        if (providedTreeData) {
            console.log('更新樹狀資料:', providedTreeData.length, '筆');
            const options = convertTreeToGroupedOptions(providedTreeData);
            setTreeData(providedTreeData);
            setGroupedOptions(options);
        }
    }, [providedTreeData]);

    // 當值變化時，更新選中的選項
    useEffect(() => {
        if (value && value.length > 0 && groupedOptions.length > 0) {
            const selected = findSelectedOptions(value, groupedOptions);
            setSelectedOptions(selected);
        } else {
            setSelectedOptions([]);
        }
    }, [value, groupedOptions]);

    // 清除防止記憶體洩漏
    useEffect(() => {
        return () => {
            debouncedLoadData.cancel();
        };
    }, [debouncedLoadData]);

    // 自定義無結果提示
    const NoOptionsMessage = (props: any) => {
        if (isLoading) {
            return <components.NoOptionsMessage {...props}>搜尋中...</components.NoOptionsMessage>;
        }

        if (searchValue && searchValue.length < minSearchCharacters) {
            return <components.NoOptionsMessage {...props}>請輸入至少 {minSearchCharacters} 個字符</components.NoOptionsMessage>;
        }

        return <components.NoOptionsMessage {...props}>無符合結果</components.NoOptionsMessage>;
    };

    return (
        <div className={`w-full ${className}`}>
            <Select
                isMulti={multiple}
                options={groupedOptions}
                placeholder={placeholder}
                value={multiple ? selectedOptions : (selectedOptions.length > 0 ? selectedOptions[0] : null)}
                onChange={handleChange}
                onInputChange={handleInputChange}
                isDisabled={disabled || isLoading || loading}
                isLoading={isLoading || loading}
                isClearable={allowClear}
                className="w-full"
                classNamePrefix="react-select"
                noOptionsMessage={() => {
                    if (isLoading) return "搜尋中...";
                    if (searchValue && searchValue.length < minSearchCharacters)
                        return `請輸入至少 ${minSearchCharacters} 個字符`;
                    return "無符合結果";
                }}
                components={{
                    NoOptionsMessage
                }}
                styles={{
                    control: (baseStyles) => ({
                        ...baseStyles,
                        padding: '2px',
                        borderColor: '#d1d5db',
                        borderRadius: '0.375rem'
                    }),
                    menu: (baseStyles) => ({
                        ...baseStyles,
                        zIndex: 9999,
                        maxHeight: '400px'
                    }),
                    menuList: (baseStyles) => ({
                        ...baseStyles,
                        maxHeight: '350px'
                    }),
                    group: (baseStyles) => ({
                        ...baseStyles,
                        paddingTop: '8px',
                        paddingBottom: '8px'
                    }),
                    groupHeading: (baseStyles) => ({
                        ...baseStyles,
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }),
                    option: (baseStyles, state) => ({
                        ...baseStyles,
                        backgroundColor: state.isSelected ? '#e6f4ff' :
                            state.isFocused ? '#f0f9ff' : undefined,
                        color: '#000',
                        fontWeight: state.isSelected ? 500 : 400,
                        padding: '8px 12px'
                    })
                }}
            />
        </div>
    );
};

export default GroupedTreeSelect; 