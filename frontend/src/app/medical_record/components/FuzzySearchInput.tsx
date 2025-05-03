import React, { useState, useEffect, useRef } from 'react';

interface SearchOption {
  key: string;
  value: string;
  originalObject?: any;
}

interface FuzzySearchInputProps {
  placeholder: string;
  onSelect?: (selected: string, option?: SearchOption) => void;
  onSearch?: (searchTerm: string) => SearchOption[];
  value?: string;
  defaultValue?: string;
  className?: string;
  multiple?: boolean;
  selectedItems?: string[];
  onRemove?: (item: string) => void;
  options?: string[];
  isLoading?: boolean;
}

const FuzzySearchInput: React.FC<FuzzySearchInputProps> = ({
  options = [],
  placeholder,
  onSelect,
  onSearch,
  value,
  defaultValue = '',
  className = '',
  multiple = false,
  selectedItems = [],
  onRemove,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState(value || defaultValue || '');
  const [filteredOptions, setFilteredOptions] = useState<SearchOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 當 value 從外部變化時更新
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // 過濾選項
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredOptions([]);
      return;
    }
    
    if (onSearch) {
      // 使用自訂搜尋功能
      const results = onSearch(inputValue);
      setFilteredOptions(results);
    } else if (options.length > 0) {
      // 使用本地過濾
      const filtered = options
        .filter(option => option.toLowerCase().includes(inputValue.toLowerCase()))
        .map(option => ({ key: option, value: option }));
      setFilteredOptions(filtered);
    }
  }, [inputValue, options, onSearch]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (option: SearchOption) => {
    if (multiple) {
      if (!selectedItems.includes(option.value)) {
        onSelect && onSelect(option.value, option);
      }
      setInputValue('');
    } else {
      if (!value) {
        // 如果是非受控組件
        setInputValue(option.value);
      }
      onSelect && onSelect(option.value, option);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* 輸入框 */}
      <div className={`flex flex-wrap items-center border rounded-md ${className}`}>
        {multiple && selectedItems.map((item, index) => (
          <div 
            key={`${item}-${index}`} 
            className="flex items-center m-1 px-2 py-1 bg-blue-100 rounded-md"
          >
            <span className="mr-1">{item}</span>
            <button 
              type="button" 
              onClick={() => onRemove && onRemove(item)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={multiple && selectedItems.length > 0 ? '' : placeholder}
          className={`flex-grow p-2 outline-none ${multiple ? 'min-w-[100px]' : 'w-full'}`}
          onFocus={() => inputValue && setIsOpen(true)}
        />
        {isLoading && (
          <div className="mr-2 h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        )}
      </div>

      {/* 下拉選單 */}
      {isOpen && filteredOptions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md max-h-60 overflow-y-auto"
        >
          {filteredOptions.map((option, index) => (
            <div
              key={`${option.key}-${index}`}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(option)}
            >
              {option.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FuzzySearchInput; 