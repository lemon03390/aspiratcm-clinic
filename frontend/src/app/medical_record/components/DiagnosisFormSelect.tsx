import React, { useState } from 'react';
import Select, { StylesConfig, components } from 'react-select';
import AsyncSelect from 'react-select/async';
import CreatableSelect from 'react-select/creatable';

export interface SelectOption {
    label: string;
    value: string;
    notes?: string;
    originalName?: string;
    isAlias?: boolean;
    category?: string;
    categoryCode?: string;
    parent?: string | null;
}

export interface GroupedOption {
    label: string;
    options: SelectOption[];
}

// 允許 options 和 loadOptions 回傳混合數組
export type MixedSelectOption = SelectOption | GroupedOption;
export type MixedSelectOptions = MixedSelectOption[];

interface DiagnosisFormSelectProps {
    placeholder: string;
    options?: MixedSelectOptions;
    loadOptions?: (inputValue: string) => Promise<MixedSelectOptions>;
    value?: SelectOption[];
    onChange: (selectedOptions: SelectOption[]) => void;
    isMulti?: boolean;
    allowCreation?: boolean;
    isAsync?: boolean;
    isDisabled?: boolean;
    isLoading?: boolean;
    noOptionsMessage?: string;
    className?: string;
}

// 自定義篩選邏輯，支援中文和拼音搜尋
const customFilterOption = (option: any, rawInput: string) => {
    const input = rawInput.toLowerCase().trim();
    if (!input) {
        return true;
    }

    const optionLabel = option.label.toLowerCase();
    const optionNotes = option.data?.notes?.toLowerCase() || '';
    const optionOriginalName = option.data?.originalName?.toLowerCase() || '';

    // 支援標籤、別名、備註和原始名稱的模糊匹配
    return optionLabel.includes(input) ||
        optionNotes.includes(input) ||
        optionOriginalName.includes(input);
};

// 自定義選項渲染組件，用於顯示備註
const CustomOption = (props: any) => {
    const { data } = props;
    return (
        <components.Option {...props}>
            <div className="flex flex-col">
                <div>{data.label}</div>
                {data.notes && (
                    <div className="text-xs text-gray-500 mt-0.5">{data.notes}</div>
                )}
            </div>
        </components.Option>
    );
};

// 自定義多選值組件，可以顯示備註
const CustomMultiValue = (props: any) => {
    const { data } = props;
    return (
        <components.MultiValue {...props}>
            <div className="flex items-center">
                <span>{data.label}</span>
                {data.notes && (
                    <span className="ml-1 text-xs text-gray-500">
                        （{data.notes}）
                    </span>
                )}
            </div>
        </components.MultiValue>
    );
};

const DiagnosisFormSelect: React.FC<DiagnosisFormSelectProps> = ({
    placeholder,
    options = [],
    loadOptions,
    value = [],
    onChange,
    isMulti = true,
    allowCreation = false,
    isAsync = false,
    isDisabled = false,
    isLoading = false,
    noOptionsMessage = '無符合選項',
    className = ''
}) => {
    const [inputValue, setInputValue] = useState('');

    // 處理輸入變化
    const handleInputChange = (newValue: string) => {
        setInputValue(newValue);
        return newValue;
    };

    // 處理選擇變化
    const handleChange = (selected: any) => {
        if (!selected) {
            onChange([]);
            return;
        }

        if (Array.isArray(selected)) {
            onChange(selected);
        } else {
            onChange([selected]);
        }
    };

    // 自定義創建選項
    const handleCreate = (inputValue: string) => {
        const newOption: SelectOption = {
            label: inputValue,
            value: `custom-${Math.random().toString(36).substring(2, 9)}`,
            originalName: inputValue
        };

        onChange([...value, newOption]);
        setInputValue('');
    };

    // 延遲加載選項
    const debouncedLoadOptions = async (inputValue: string) => {
        if (!inputValue || inputValue.length < 2) {
            return [];
        }

        try {
            if (loadOptions) {
                return await loadOptions(inputValue);
            }
            return [];
        } catch (error) {
            console.error('加載選項失敗', error);
            return [];
        }
    };

    // 自定義樣式
    const customStyles: StylesConfig = {
        control: (baseStyles) => ({
            ...baseStyles,
            padding: '2px',
            borderColor: '#d1d5db',
            borderRadius: '0.375rem',
            minHeight: '38px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#9ca3af'
            }
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
            fontSize: '0.9rem',
            color: '#374151',
            backgroundColor: '#f9fafb',
            padding: '6px 12px',
            margin: '0'
        }),
        option: (baseStyles, state) => ({
            ...baseStyles,
            backgroundColor: state.isSelected ? '#e6f4ff' :
                state.isFocused ? '#f0f9ff' : undefined,
            color: '#000',
            fontWeight: state.isSelected ? 500 : 400,
            padding: '8px 12px'
        }),
        multiValue: (baseStyles) => ({
            ...baseStyles,
            backgroundColor: '#e6f4ff',
            borderRadius: '4px'
        }),
        multiValueLabel: (baseStyles) => ({
            ...baseStyles,
            color: '#1f2937',
            fontWeight: 500
        }),
        multiValueRemove: (baseStyles) => ({
            ...baseStyles,
            color: '#6b7280',
            ':hover': {
                backgroundColor: '#dbeafe',
                color: '#1f2937'
            }
        }),
        input: (baseStyles) => ({
            ...baseStyles,
            color: '#1f2937'
        }),
        placeholder: (baseStyles) => ({
            ...baseStyles,
            color: '#9ca3af'
        })
    };

    // 根據屬性決定使用哪種 Select 元件
    const renderSelect = () => {
        const commonProps = {
            placeholder,
            value: isMulti ? value : value[0] || null,
            onChange: handleChange,
            isMulti,
            isDisabled: isDisabled || isLoading,
            isLoading,
            className: `w-full ${className}`,
            classNamePrefix: "react-select",
            noOptionsMessage: () => noOptionsMessage,
            onInputChange: handleInputChange,
            styles: customStyles,
            filterOption: customFilterOption,
            components: {
                Option: CustomOption,
                MultiValue: CustomMultiValue
            },
            // 增加搜尋匹配效能
            ignoreAccents: true,
            ignoreCase: true
        };

        if (isAsync) {
            return (
                <AsyncSelect
                    {...commonProps}
                    loadOptions={debouncedLoadOptions}
                    defaultOptions={options as any}
                    cacheOptions
                />
            );
        }

        if (allowCreation) {
            return (
                <CreatableSelect
                    {...commonProps}
                    options={options as any}
                    onCreateOption={handleCreate}
                    formatCreateLabel={(input) => `新增: "${input}"`}
                />
            );
        }

        return (
            <Select
                {...commonProps}
                options={options as any}
            />
        );
    };

    return (
        <div className="w-full">
            {renderSelect()}
        </div>
    );
};

export default DiagnosisFormSelect; 