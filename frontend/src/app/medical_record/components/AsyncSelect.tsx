import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';

export interface SelectOption {
  label: string;
  value: string;
  data?: any;
}

interface AsyncSelectProps {
  placeholder: string;
  onChange: (selectedItems: SelectOption[]) => void;
  loadOptions: (searchTerm: string) => Promise<SelectOption[]>;
  value?: SelectOption[];
  defaultValue?: SelectOption[];
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
  labelExtractor?: (item: any) => string;
  valueExtractor?: (item: any) => string;
}

const AsyncSelect: React.FC<AsyncSelectProps> = ({
  placeholder,
  onChange,
  loadOptions,
  value,
  defaultValue = [],
  className = '',
  multiple = true,
  disabled = false,
  labelExtractor = (item) => item.name || '',
  valueExtractor = (item) => item.code || '',
}) => {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectOption[]>(defaultValue);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 使用 debounce 來延遲搜尋請求
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term || term.length < 1) {
        setOptions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await loadOptions(term);
        setOptions(results);
      } catch (error) {
        console.error('搜尋選項失敗:', error);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [loadOptions]
  );

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSearchTerm(value);
    debouncedSearch(value);
    if (value.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  // 處理選擇項目
  const handleSelectOption = (option: SelectOption) => {
    if (multiple) {
      // 檢查是否已選擇
      const isSelected = selectedItems.some(item => item.value === option.value);
      if (!isSelected) {
        const newSelectedItems = [...selectedItems, option];
        setSelectedItems(newSelectedItems);
        onChange(newSelectedItems);
      }
    } else {
      setSelectedItems([option]);
      onChange([option]);
    }

    // 清空輸入框並關閉下拉選單
    setSearchTerm('');
    setOptions([]);  // 清空選項避免重新出現
    setIsDropdownOpen(false);
  };

  // 移除已選項目
  const handleRemoveItem = (optionToRemove: SelectOption) => {
    const filteredItems = selectedItems.filter(
      item => item.value !== optionToRemove.value
    );
    setSelectedItems(filteredItems);
    onChange(filteredItems);
  };

  // 當 value 從外部變化時更新
  useEffect(() => {
    if (value) {
      setSelectedItems(value);
    }
  }, [value]);

  // 清除搜尋防止記憶體洩漏
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.async-select-container')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 提取品牌名稱和藥材名稱
  const renderDropdownItem = (option: SelectOption) => {
    // 判斷標籤是否已包含品牌信息
    const hasBrandSeparator = option.label.includes(' - ');

    if (hasBrandSeparator) {
      const parts = option.label.split(' - ');
      const name = parts[0].trim();
      const brand = parts[1].trim();

      return (
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="text-gray-500 text-xs mt-1">{brand}</span>
        </div>
      );
    }

    // 嘗試從data中獲取品牌信息
    if (option.data && option.data.brand) {
      const brandName = option.data.brand;
      let brandStyle = {};
      let brandBadge = null;

      // 為不同品牌設置不同顏色標記
      if (brandName.toLowerCase().includes('漢方')) {
        brandStyle = { color: '#2563eb' };
        brandBadge = <span className="ml-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">漢方</span>;
      } else if (brandName.toLowerCase().includes('海天')) {
        brandStyle = { color: '#16a34a' };
        brandBadge = <span className="ml-1 px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">海天</span>;
      }

      return (
        <div className="flex flex-col">
          <span className="font-medium">{option.label}</span>
          <div className="flex items-center mt-1">
            <span className="text-gray-500 text-xs" style={brandStyle}>{brandName}</span>
            {brandBadge}
          </div>
        </div>
      );
    }

    // 無品牌信息時只顯示標籤
    return <span>{option.label}</span>;
  };

  return (
    <div className={`async-select-container relative w-full ${className}`}>
      <div className="flex flex-wrap items-center w-full p-2 border border-gray-300 rounded-md focus-within:border-blue-500">
        {/* 已選擇的項目 */}
        {selectedItems.map(item => (
          <div
            key={item.value}
            className="flex items-center m-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md"
          >
            <span className="mr-1">{item.label}</span>
            <button
              type="button"
              onClick={() => handleRemoveItem(item)}
              className="text-blue-500 hover:text-blue-700"
            >
              ×
            </button>
          </div>
        ))}

        {/* 搜尋輸入框 */}
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={selectedItems.length > 0 ? '' : placeholder}
          className="flex-grow min-w-[100px] outline-none"
          disabled={disabled}
          onFocus={() => setIsDropdownOpen(true)}
          readOnly={!multiple && selectedItems.length > 0}
        />

        {/* 載入指示器 */}
        {isLoading && (
          <div className="ml-2 h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        )}
      </div>

      {/* 下拉選單 */}
      {isDropdownOpen && options.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map(option => (
            <div
              key={option.value}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelectOption(option)}
            >
              {renderDropdownItem(option)}
            </div>
          ))}
        </div>
      )}

      {/* 無結果提示 */}
      {isDropdownOpen && searchTerm && !isLoading && options.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 text-center text-gray-500">
          無符合結果
        </div>
      )}
    </div>
  );
};

export default AsyncSelect; 